mod broadcaster;

use axum::{
    extract::{Path, ws::WebSocketUpgrade},
    response::IntoResponse,
};

/// Upgrade HTTP to WebSocket and hand off to broadcaster
pub async fn handle_ws(
    Path((room, user)): Path<(String, String)>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| broadcaster::broadcaster(room, user, socket))
}
