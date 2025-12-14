use axum::{
    extract::{
        State, WebSocketUpgrade,
        ws::{Message, WebSocket},
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use redis::Client as RedisClient;

use crate::AppState;

pub async fn chat_list_ws(
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
) -> impl IntoResponse {
    ws.on_upgrade(move |socket| async move {
        handle_chat_list_socket(socket, state.redis_client).await;
    })
}

async fn handle_chat_list_socket(socket: WebSocket, redis_client: RedisClient) {
    let (mut tx, mut rx_ws) = socket.split();
    let channel = "chat_list".to_string();

    tokio::spawn(async move {
        let conn = match redis_client.get_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("pubsub connect failed: {:?}", e);
                return;
            }
        };

        let mut pubsub = conn.into_pubsub();
        if let Err(e) = pubsub.subscribe(&channel).await {
            tracing::error!("subscribe({}) failed: {:?}", channel, e);
            return;
        }

        let mut inbound = pubsub.on_message();

        while let Some(msg) = inbound.next().await {
            match msg.get_payload::<String>() {
                Ok(text) => {
                    if tx.send(Message::Text(text.into())).await.is_err() {
                        break;
                    }
                }
                Err(e) => {
                    tracing::error!("invalid payload on {}: {:?}", channel, e);
                }
            }
        }
    });

    while let Some(Ok(_frame)) = rx_ws.next().await {}
}
