use crate::{
    AppState,
    config::LoadBalancerConfig,
    server_pool::{BackendServer, ServerPool},
};
use axum::http::StatusCode;
use axum::{
    body::Body,
    extract::{Request, State},
    response::Response,
};
use base64::Engine;

use hyper::Uri;
use reqwest::Client;

use serde_json::Value;
use std::time::Duration;
use tower_cookies::Cookies;
use tracing::{debug, error, info, warn};

#[derive(Clone)]
pub struct ProxyService {
    client: Client,
}

impl ProxyService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(Duration::from_secs(30))
            .pool_idle_timeout(Duration::from_secs(30))
            .pool_max_idle_per_host(10)
            .user_agent("rust-load-balancer/1.0")
            .build()
            .expect("Failed to create HTTP client");

        Self { client }
    }

    pub async fn select_target_server(
        &self,
        server_pool: &ServerPool,
        config: &LoadBalancerConfig,
        cookies: &Cookies,
        uri: Uri,
    ) -> Option<BackendServer> {
        if let Some(server_id) = self.extract_server_from_cookie(cookies, config) {
            if let Some(server) = server_pool.get_server_by_id(&server_id).await {
                debug!("Using sticky session for server: {}", server_id);
                return Some(server);
            }
            warn!(
                "Sticky session server {} not available, falling back",
                server_id
            );
        }

        // 2. Try to extract user ID from JWT token for consistent hashing
        if let Some(user_id) = self.extract_user_id_from_jwt(cookies) {
            if let Some(server) = self.get_server_for_user(&user_id, server_pool).await {
                debug!("Using user-based routing: {} -> {}", user_id, server.id);
                return Some(server);
            }
        }

        // 3. Check if the request is a public endpoint
        if self.is_public_endpoint(&uri) {
            debug!("Public endpoint, using least loaded server");
            return server_pool.get_least_loaded_server().await;
        }

        // 4. Fallback to least loaded server for unauthenticated users
        debug!("Using fallback routing (least loaded server)");
        server_pool.get_least_loaded_server().await
    }

    pub async fn forward_request(
        &self,
        axum_request: Request<Body>,
        target_server: &BackendServer,
    ) -> Result<Response<Body>, StatusCode> {
        let method = axum_request.method().clone();
        let uri = axum_request.uri().clone();
        let headers = axum_request.headers().clone();
        let body = axum_request.into_body(); // FIXED: Use into_body() not clone()

        // Step 2: Build target URL
        let target_url = format!(
            "http://{}{}",
            target_server.address,
            uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/")
        );

        info!(
            "Proxying {} {} to {}",
            method,
            uri.path(),
            target_server.address
        );

        // Step 3: Convert body to bytes
        let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
            Ok(bytes) => bytes,
            Err(e) => {
                warn!("Failed to read request body: {}", e);
                return Err(StatusCode::BAD_REQUEST);
            }
        };

        // Step 4: Create reqwest request (convert method properly)
        let reqwest_method = match reqwest::Method::from_bytes(method.as_str().as_bytes()) {
            Ok(m) => m,
            Err(_) => {
                warn!("Unsupported HTTP method: {}", method);
                return Err(StatusCode::METHOD_NOT_ALLOWED);
            }
        };

        let mut request_builder = self.client.request(reqwest_method, &target_url);

        // Step 5: Copy headers (convert properly)
        for (key, value) in headers.iter() {
            let key_str = key.as_str();
            if !Self::is_hop_by_hop_header(key_str) {
                // Convert axum header value to string then to reqwest header value
                if let Ok(value_str) = value.to_str() {
                    request_builder = request_builder.header(key_str, value_str);
                }
            }
        }

        // Step 6: Add body if present
        if !body_bytes.is_empty() {
            request_builder = request_builder.body(body_bytes);
        }

        // Step 7: Add forwarding headers
        request_builder = request_builder
            .header("host", target_server.address.clone())
            .header("x-forwarded-by", "rust-load-balancer")
            .header("x-forwarded-server", &target_server.id);

        // Step 8: Send request
        let reqwest_response = match request_builder.send().await {
            Ok(resp) => resp,
            Err(e) => {
                error!(
                    "Failed to forward request to {}: {}",
                    target_server.address, e
                );
                return Err(StatusCode::BAD_GATEWAY);
            }
        };

        debug!(
            "Received response from {} with status: {}",
            target_server.address,
            reqwest_response.status()
        );

        // Step 9: Convert response back to axum
        self.convert_response_to_axum(reqwest_response).await
    }

    async fn convert_response_to_axum(
        &self,
        reqwest_response: reqwest::Response,
    ) -> Result<Response<Body>, StatusCode> {
        let status = reqwest_response.status();
        let headers = reqwest_response.headers().clone();

        // Step 2: Get the response body as bytes
        let body_bytes = match reqwest_response.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => {
                error!("Failed to read response body: {}", e);
                return Err(StatusCode::INTERNAL_SERVER_ERROR);
            }
        };

        // Step 3: Build the Axum response
        // Convert reqwest::StatusCode to http::StatusCode (which hyper::StatusCode is a re-export of)
        let http_status =
            StatusCode::from_u16(status.as_u16()).unwrap_or(StatusCode::INTERNAL_SERVER_ERROR);

        let mut response_builder = Response::builder().status(http_status);

        // Step 4: Copy headers from backend response (filter out bad ones)
        for (key, value) in headers.iter() {
            let key_str = key.as_str();
            if !Self::is_hop_by_hop_header(key_str) {
                // Convert reqwest header value to string for compatibility
                if let Ok(header_value) = value.to_str() {
                    response_builder = response_builder.header(key_str, header_value);
                } else {
                    warn!("Skipping header with invalid UTF-8: {}", key_str);
                }
            }
        }

        // Step 5: Add load balancer identification header
        response_builder = response_builder.header("x-served-by", "rust-load-balancer");

        // Step 6: Create the final response with body
        let body = Body::from(body_bytes);

        response_builder.body(body).map_err(|e| {
            error!("Failed to build response: {}", e);
            StatusCode::INTERNAL_SERVER_ERROR
        })
    }

    fn extract_server_from_cookie(
        &self,
        cookies: &Cookies,
        config: &LoadBalancerConfig,
    ) -> Option<String> {
        cookies.get(&config.sticky_cookie_name).map(|cookie| {
            let server_id = cookie.value().to_string();
            debug!("Found sticky cookie for server: {}", server_id);
            server_id
        })
    }

    fn extract_user_id_from_jwt(&self, cookies: &Cookies) -> Option<String> {
        let token_cookie_name = "session";
        if let Some(cookie) = cookies.get(token_cookie_name) {
            if let Some(user_id) = self.parse_jwt_user_id(cookie.value()) {
                debug!("Extracted user ID from JWT: {}", user_id);
                return Some(user_id);
            }
        }
        debug!("No JWT token found in cookies");
        None
    }

    fn parse_jwt_user_id(&self, token: &str) -> Option<String> {
        let parts: Vec<&str> = token.split('.').collect();
        if parts.len() != 3 {
            return None;
        }

        let mut payload_b64 = parts[1].to_string();
        while payload_b64.len() % 4 != 0 {
            payload_b64.push('=');
        }
        let payload_b64 = payload_b64.replace('-', "+").replace('_', "/");

        let payload_bytes =
            Engine::decode(&base64::engine::general_purpose::STANDARD, &payload_b64).ok()?;
        let payload_str = String::from_utf8(payload_bytes).ok()?;
        let payload: Value = serde_json::from_str(&payload_str).ok()?;

        payload.get("sub")?.as_u64().map(|id| id.to_string())
    }

    fn is_public_endpoint(&self, uri: &Uri) -> bool {
        let path = uri.path();

        // Define public endpoints that don't require authentication
        let public_paths = [
            "/api/v1/auth/login",
            "/api/v1/auth/register",
            "/api/v1/auth/refresh",
            "/health",
            "/status",
            "/favicon.ico",
            "/robots.txt",
            // Add more public endpoints as needed
        ];

        let is_public = public_paths
            .iter()
            .any(|&public_path| path.starts_with(public_path));

        if is_public {
            debug!("Identified public endpoint: {}", path);
        }

        is_public
    }

    async fn get_server_for_user(
        &self,
        user_id: &str,
        server_pool: &ServerPool,
    ) -> Option<BackendServer> {
        server_pool.get_server_for_user(user_id).await
    }

    fn is_hop_by_hop_header(header_name: &str) -> bool {
        matches!(
            header_name.to_lowercase().as_str(),
            "connection"
                | "upgrade"
                | "proxy-authenticate"
                | "proxy-authorization"
                | "te"
                | "trailers"
                | "transfer-encoding"
        )
    }
}

pub async fn proxy_handler(
    State(state): State<AppState>,
    cookies: Cookies,
    request: Request<Body>,
) -> Result<Response<Body>, StatusCode> {
    let request_path = request.uri().path().to_string();
    let request_method = request.method().clone();

    debug!("Handling request: {} {}", request_method, request_path);

    // Step 1: Select which backend server to send this request to
    let target_server = {
        let server_result = state
            .proxy_service
            .select_target_server(
                &state.server_pool,
                &state.config,
                &cookies,
                request.uri().clone(),
            )
            .await;

        match server_result {
            Some(server) => server,
            None => {
                error!("No healthy servers available to handle request");
                return Err(StatusCode::SERVICE_UNAVAILABLE);
            }
        }
    };

    // Step 2: Set sticky session cookie for future requests
    set_sticky_session_cookie(&cookies, &state.config, &target_server);

    // Step 3: Track this connection
    let server_id = target_server.id.clone();
    state.server_pool.increment_connections(&server_id).await;

    // Step 4: Forward the actual request to the backend server
    let result = state
        .proxy_service
        .forward_request(request, &target_server)
        .await;

    // Step 5: Stop tracking this connection
    state.server_pool.decrement_connections(&server_id).await;

    // Step 6: Log the result
    match &result {
        Ok(response) => {
            info!(
                "Successfully proxied {} {} to {} (status: {})",
                request_method,
                request_path,
                server_id,
                response.status()
            );
        }
        Err(status) => {
            error!(
                "Failed to proxy {} {} to {} (error: {})",
                request_method, request_path, server_id, status
            );
        }
    }

    result
}

/// Set sticky session cookie so future requests go to same server
fn set_sticky_session_cookie(
    cookies: &Cookies,
    config: &LoadBalancerConfig,
    target_server: &BackendServer,
) {
    use tower_cookies::Cookie;

    // Don't set cookie if it already matches
    if let Some(existing_cookie) = cookies.get(&config.sticky_cookie_name) {
        if existing_cookie.value() == target_server.id {
            debug!("Sticky session cookie already correct");
            return;
        }
    }

    // Create and set the sticky session cookie
    // Convert references to owned strings to satisfy 'static lifetime
    let cookie = Cookie::build((config.sticky_cookie_name.clone(), target_server.id.clone()))
        .path("/")
        .http_only(true)
        .secure(false) // Set to true in production with HTTPS
        .same_site(tower_cookies::cookie::SameSite::Lax)
        .max_age(tower_cookies::cookie::time::Duration::seconds(
            config.sticky_cookie_max_age as i64,
        ))
        .build();

    cookies.add(cookie);
    debug!(
        "Set sticky session cookie: {} = {}",
        config.sticky_cookie_name, target_server.id
    );
}
