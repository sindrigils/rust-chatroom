use axum::{
    extract::{
        State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use tokio::sync::broadcast;

use crate::{AppState, ws::ChatHub};

pub async fn chat_list_ws(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    let hub = state.hub.clone();

    ws.on_upgrade(move |socket| async move {
        handle_chat_list_socket(socket, hub).await;
    })
}

async fn handle_chat_list_socket(socket: WebSocket, hub: ChatHub) {
    // 1) Split into sink (tx) and stream (rx_ws), both mutable
    let (mut tx, mut rx_ws) = socket.split();

    // 2) Subscribe to the “global” broadcast channel
    let mut rx = {
        let mut map = hub.lock().await;
        map.entry(0)
            .or_insert_with(|| broadcast::channel(100).0)
            .subscribe()
    };

    // 3) Spawn a task that forwards broadcasts to the WS sink
    tokio::spawn(async move {
        while let Ok(raw) = rx.recv().await {
            // raw is String, so convert into Utf8Bytes via `.into()`
            if tx.send(Message::Text(raw.into())).await.is_err() {
                break; // client disconnected
            }
        }
    });

    while let Some(Ok(_frame)) = rx_ws.next().await {
        // you can ignore incoming frames here (ping/pong, etc.)
    }
}
