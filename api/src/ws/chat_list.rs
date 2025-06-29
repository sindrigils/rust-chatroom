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
    let (mut tx, mut rx_ws) = socket.split();

    let mut rx = {
        let mut map = hub.lock().await;
        map.entry(0)
            .or_insert_with(|| broadcast::channel(100).0)
            .subscribe()
    };

    tokio::spawn(async move {
        while let Ok(raw) = rx.recv().await {
            if tx.send(Message::Text(raw.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(Ok(_frame)) = rx_ws.next().await {}
}
