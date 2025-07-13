use crate::core::{BackendServer, ConnectionHandle, ServerPool, WebSocketManager};
use crate::errors::Error;
use crate::routing::{
    extract_server_from_cookie, extract_user_id_from_jwt
};
use crate::{config::LoadBalancerConfig};

use axum::extract::WebSocketUpgrade;
use axum::extract::ws::WebSocket;
use axum::http::StatusCode;
use axum::{
    body::Body,
    extract::Request,  
    response::Response,
};

use futures::{SinkExt, StreamExt};
use hyper::Uri;
use reqwest::Client;
use tokio_tungstenite::{
    connect_async,
    tungstenite::{client::IntoClientRequest, Message},
};


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
    ) -> Option<BackendServer> {
        if let Some(server_id) = extract_server_from_cookie(cookies, config) {
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
        if let Some(user_id) = extract_user_id_from_jwt(cookies) {
            if let Some(server) = self.get_server_for_user(&user_id, server_pool).await {
                debug!("Using user-based routing: {} -> {}", user_id, server.id);
                return Some(server);
            }
        }

        // 3. Fallback to least loaded server for unauthenticated users
        debug!("Using fallback routing (least loaded server)");
        server_pool.get_least_loaded_server().await
    }

    pub async fn forward_request(
        &self,
        axum_request: Request<Body>,
        target_server: &BackendServer,
        config: &LoadBalancerConfig,
    ) -> Result<Response<Body>, Error> {
        let method = axum_request.method().clone();
        let uri = axum_request.uri().clone();
        let headers = axum_request.headers().clone();
        let body = axum_request.into_body(); 

        let target_url = format!(
            "{}{}",
            target_server.address,
            uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/")
        );

        info!(
            "Proxying {} {} to {}",
            method,
            uri.path(),
            target_server.address
        );

        let body_bytes = match axum::body::to_bytes(body, usize::MAX).await {
            Ok(bytes) => bytes,
            Err(e) => {
                warn!("Failed to read request body: {}", e);
                return Err(Error::BadRequest);
            }
        };

        let reqwest_method = match reqwest::Method::from_bytes(method.as_str().as_bytes()) {
            Ok(m) => m,
            Err(_) => {
                warn!("Unsupported HTTP method: {}", method);
                return Err(Error::MethodNotAllowed);
            }
        };

        let mut request_builder = self.client.request(reqwest_method, &target_url);

        for (key, value) in headers.iter() {
            let key_str = key.as_str();
            if !Self::is_hop_by_hop_header(key_str) {
                if let Ok(value_str) = value.to_str() {
                    request_builder = request_builder.header(key_str, value_str);
                }
            }
        }


        if !body_bytes.is_empty() {
            request_builder = request_builder.body(body_bytes);
        }

        request_builder = request_builder
            .header("host", target_server.address.clone())
            .header("x-forwarded-by", "rust-load-balancer")
            .header("x-forwarded-server", &target_server.id)
            .header("x-lb-secret", &config.lb_secret);


        let reqwest_response = match request_builder.send().await {
            Ok(resp) => resp,
            Err(e) => {
                error!(
                    "Failed to forward request to {}: {}",
                    target_server.address, e
                );
                return Err(Error::BadGateway);
            }
        };

        debug!(
            "Received response from {} with status: {}",
            target_server.address,
            reqwest_response.status()
        );

        self.convert_response_to_axum(reqwest_response).await
    }

    async fn convert_response_to_axum(
        &self,
        reqwest_response: reqwest::Response,
    ) -> Result<Response<Body>, Error> {
        let status = reqwest_response.status();
        let headers = reqwest_response.headers().clone();

        // Step 2: Get the response body as bytes
        let body_bytes = match reqwest_response.bytes().await {
            Ok(bytes) => bytes,
            Err(e) => {
                error!("Failed to read response body: {}", e);
                return Err(Error::InternalServerError);
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
            Error::InternalServerError
        })
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

    pub async fn is_websocket_upgrade(request: &Request<Body>) -> bool {
        request
            .headers()
            .get("upgrade")
            .and_then(|h| h.to_str().ok())
            .map(|s| s.to_lowercase() == "websocket")
            .unwrap_or(false)
    }

    pub async fn handle_websocket_upgrade(
        &self,
        ws: WebSocketUpgrade,
        target_server: &BackendServer,
        uri: Uri,
        cookies: &Cookies,
        config: &LoadBalancerConfig,
        ws_manager: &WebSocketManager,

    ) -> Result<Response<Body>, Error> {
        let target_server_clone = target_server.clone();
        let uri_clone = uri.clone();
        let lb_secret = config.lb_secret.clone();
        let ws_manager_clone = ws_manager.clone();

        let user_id = extract_user_id_from_jwt(cookies).map(|id| id.to_string());

        let session_cookie = cookies
            .get("session")
            .map(|c| format!("session={}", c.value()))
            .unwrap_or_default();

        info!(
            "Upgrading to websocket: {} -> {}",
            uri_clone, target_server_clone.address
        );

        let ws_response = ws.on_upgrade(move |client_socket| async move {
            // Create connection handle
            let (connection_handle, mut close_receiver) = ConnectionHandle::new(
                target_server_clone.id.clone(),
                user_id.clone(),
            );

            // Add connection to manager
            ws_manager_clone.add_connection(connection_handle.clone()).await;

            let connection_id = connection_handle.id.clone();
            let ws_manager_for_cleanup = ws_manager_clone.clone();
            
            // Monitor for close signals
            let close_monitor = tokio::spawn(async move {
                if let Some(_) = close_receiver.recv().await {
                    info!("Received close signal for connection: {}", connection_id);
                }
                ws_manager_for_cleanup.remove_connection(&connection_id).await;
            });

            // Handle the WebSocket proxy connection (your existing logic)
            let proxy_result = Self::proxy_websocket_connection(
                client_socket,
                target_server_clone.clone(),
                uri_clone,
                session_cookie,
                lb_secret,
            ).await;

            // Clean up
            close_monitor.abort();
            ws_manager_clone.remove_connection(&connection_handle.id).await;

            if let Err(e) = proxy_result {
                error!("WebSocket proxy error: {}", e);
            }
        });


        Ok(ws_response)
    }

    async fn proxy_websocket_connection(
        client_socket: WebSocket,
        target_server: BackendServer,
        uri: Uri,
        session_cookie: String,
        lb_secret: String,

    ) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
        let backend_ws_url = format!(
            "ws://{}{}",
            target_server.address.strip_prefix("http://").unwrap(),
            uri.path_and_query().map(|pq| pq.as_str()).unwrap_or("/")
        );
    
        info!("Connecting to backend websocket: {}", backend_ws_url);
    
        let mut request = backend_ws_url.clone().into_client_request()?;
        
        if !session_cookie.is_empty() {
            debug!("Adding session cookie to WebSocket request");
            request.headers_mut().insert(
                "Cookie", 
                session_cookie.parse().map_err(|_| "Invalid cookie format")?
            );
        }
        
        request.headers_mut().insert(
            "x-lb-secret", 
            lb_secret.parse().map_err(|_| "Invalid LB secret format")?
        );
        request.headers_mut().insert(
            "x-forwarded-by", 
            "rust-load-balancer".parse().map_err(|_| "Invalid forwarded-by format")?
        );

        
        let (backend_socket, _) = connect_async(request).await.map_err(|e| {
            error!(
                "Failed to connect to backend WebSocket {}: {}",
                backend_ws_url, e
            );
            e
        })?;
    

        info!(
            "WebSocket connection established to {}",
            target_server.address
        );

        let (mut client_tx, mut client_rx) = client_socket.split();
        let (mut backend_tx, mut backend_rx) = backend_socket.split();

        let client_to_backend = tokio::spawn(async move {
            while let Some(msg) = client_rx.next().await {
                match msg {
                    Ok(axum_msg) => {
                        let tungstenite_msg = match axum_msg {
                            axum::extract::ws::Message::Text(text) => {
                                Message::Text(text.to_string())
                            }
                            axum::extract::ws::Message::Binary(data) => {
                                Message::Binary(data.to_vec())
                            }
                            axum::extract::ws::Message::Ping(data) => {
                                Message::Ping(data.to_vec())
                            }
                            axum::extract::ws::Message::Pong(data) => {
                                Message::Pong(data.to_vec())
                            }
                            axum::extract::ws::Message::Close(close_frame) => {
                                debug!("Client sent close frame, shutting down connection");
                                if let Some(frame) = close_frame {
                                    Message::Close(Some(tokio_tungstenite::tungstenite::protocol::CloseFrame {
                                        code: tokio_tungstenite::tungstenite::protocol::frame::coding::CloseCode::from(frame.code),
                                        reason: frame.reason.to_string().into(), 
                                    }))
                                } else {
                                    Message::Close(None)
                                }
                            }
                        };
    
                        if let Err(e) = backend_tx.send(tungstenite_msg).await {
                            error!("Error sending message to backend: {}", e);
                            break;
                        }
                    }
                    Err(e) => {
                        error!("Error sending message to backend: {}", e);
                        break;
                    }
                }
            }
            debug!("Client to backend message forwarding ended");
        });

        let backend_to_client = tokio::spawn(async move {
            while let Some(msg) = backend_rx.next().await {
                match msg {
                    Ok(tungstenite_msg) => {
                        let axum_msg = match tungstenite_msg {
                            Message::Text(text) => {
                                axum::extract::ws::Message::Text(text.into())
                            }
                            Message::Binary(data) => {
                                axum::extract::ws::Message::Binary(data.into())
                            }
                            Message::Ping(data) => {
                                axum::extract::ws::Message::Ping(data.into())
                            }
                            Message::Pong(data) => {
                                axum::extract::ws::Message::Pong(data.into())
                            }
                            Message::Close(close_frame) => {
                                debug!("Backend sent close frame, shutting down connection");
                                if let Some(frame) = close_frame {
                                    axum::extract::ws::Message::Close(Some(axum::extract::ws::CloseFrame {
                                        code: frame.code.into(),
                                        reason: frame.reason.to_string().into(), 
                                    }))
                                } else {
                                    axum::extract::ws::Message::Close(None)
                                }
                            }
                            _ => continue, 
                        };
    
                        match client_tx.send(axum_msg).await {
                            Ok(_) => {
                            }
                            Err(e) => {
                                if e.to_string().contains("closed connection") {
                                    debug!("Client connection closed, stopping message forwarding");
                                } else {
                                    debug!("Error sending message to client: {}", e);
                                }
                                break;
                            }
                        }
                    }
                    Err(e) => {
                        error!("Error receiving message from backend: {}", e);
                        break;
                    }
                }
            }
            debug!("Backend to client message forwarding ended");
        });

        tokio::select! {
            _ = client_to_backend => {
                debug!("Client to backend task completed");
            }
            _ = backend_to_client => {
                debug!("Backend to client task completed");
            }
        }

        info!("Websocket proxy connection closed for {}", target_server.address);

        Ok(())
    }
}



