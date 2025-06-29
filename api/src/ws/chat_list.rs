use axum::{
    extract::{
        State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use tokio::sync::broadcast::Sender;

use crate::AppState;

pub async fn chat_list_ws(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    let channel = state.chat_list_tx;

    ws.on_upgrade(move |socket| async move {
        handle_chat_list_socket(socket, channel).await;
    })
}

async fn handle_chat_list_socket(socket: WebSocket, channel: Sender<String>) {
    let (mut tx, mut rx_ws) = socket.split();
    let mut rx = channel.subscribe();

    tokio::spawn(async move {
        while let Ok(raw) = rx.recv().await {
            if tx.send(Message::Text(raw.into())).await.is_err() {
                break;
            }
        }
    });

    while let Some(Ok(_frame)) = rx_ws.next().await {}
}
