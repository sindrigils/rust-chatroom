use std::collections::HashMap;

use axum::{
    Extension,
    extract::{
        Query, State,
        ws::{Message, WebSocket, WebSocketUpgrade},
    },
    response::IntoResponse,
};
use futures::{SinkExt, StreamExt};
use sea_orm::{ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, QueryFilter};
use tokio::sync::broadcast;

use crate::{AppState, entity::online_user, models::claims::Claims, ws::ChatHub};

pub async fn chat_ws(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let chat_id: i64 = params
        .get("chat_id")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let user_id: i64 = claims.sub as i64;

    let db = state.db.clone();
    let hub = state.hub.clone();

    ws.on_upgrade(move |socket| async move {
        let _ = online_user::ActiveModel {
            user_id: Set(user_id),
            chat_id: Set(chat_id),
            ..Default::default()
        }
        .insert(&db)
        .await;

        handle_socket(socket, hub.clone(), chat_id, claims.username.clone()).await;

        let _ = online_user::Entity::delete_many()
            .filter(online_user::Column::UserId.eq(user_id))
            .filter(online_user::Column::ChatId.eq(chat_id))
            .exec(&db)
            .await;
    })
}

async fn handle_socket(socket: WebSocket, hub: ChatHub, chat_id: i64, username: String) {
    let mut rx = {
        let mut map = hub.lock().await;
        map.entry(chat_id)
            .or_insert_with(|| broadcast::channel(100).0)
            .subscribe()
    };

    let (mut tx, mut rx_ws) = socket.split();

    tokio::spawn(async move {
        while let Ok(msg) = rx.recv().await {
            if tx.send(Message::Text(msg.into())).await.is_err() {
                break; // client disconnected
            }
        }
    });

    while let Some(Ok(frame)) = rx_ws.next().await {
        if let Message::Text(text) = frame {
            let payload = format!("{}: {}", username, text);
            if let Some(sender) = hub.lock().await.get(&chat_id) {
                let _ = sender.send(payload);
            }
        }
    }
}
