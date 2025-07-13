use crate::AppState;
use crate::errors::Error;
use crate::routing::set_sticky_session_cookie;

use axum::extract::WebSocketUpgrade;
use axum::{
    body::Body,
    extract::{Request, State},
    response::Response,
};

use tower_cookies::Cookies;
use tracing::{debug, error, info};

pub async fn websocket_handler(
    State(state): State<AppState>,
    cookies: Cookies,
    ws: WebSocketUpgrade,
    request: Request<Body>,
) -> Result<Response<Body>, Error> {
    let request_uri = request.uri().clone();

    // Step 1: Select which backend server to send this request to
    let target_server = {
        let server_result = state
            .proxy_service
            .select_target_server(&state.server_pool, &state.config, &cookies)
            .await;

        match server_result {
            Some(server) => server,
            None => {
                error!("No healthy servers available to handle WebSocket request");
                return Err(Error::ServiceUnavailable);
            }
        }
    };

    // Step 2: Set sticky session cookie for future requests
    set_sticky_session_cookie(&cookies, &state.config, &target_server);

    // Step 3: Handle WebSocket upgrade
    info!("Handling WebSocket upgrade to {}", target_server.address);

    state
        .proxy_service
        .handle_websocket_upgrade(
            ws,
            &target_server,
            request_uri,
            &cookies,
            &state.config,
            &state.ws_manager,
        )
        .await
}

// Handler for regular HTTP requests
pub async fn http_handler(
    State(state): State<AppState>,
    cookies: Cookies,
    request: Request<Body>,
) -> Result<Response<Body>, Error> {
    let request_path = request.uri().path().to_string();
    let request_method = request.method().clone();

    debug!("Handling HTTP request: {} {}", request_method, request_path);

    // Step 1: Select which backend server to send this request to
    let target_server = {
        let server_result = state
            .proxy_service
            .select_target_server(&state.server_pool, &state.config, &cookies)
            .await;

        match server_result {
            Some(server) => server,
            None => {
                error!("No healthy servers available to handle request");
                return Err(Error::ServiceUnavailable);
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
        .forward_request(request, &target_server, &state.config)
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
