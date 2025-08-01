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
use redis::AsyncCommands;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, EntityTrait, PaginatorTrait, QueryFilter,
};

use crate::{
    AppState,
    entity::{message, online_user, user},
    models::claims::Claims,
};

pub async fn chat_ws(
    Extension(claims): Extension<Claims>,
    State(state): State<AppState>,
    ws: WebSocketUpgrade,
    Query(params): Query<HashMap<String, String>>,
) -> impl IntoResponse {
    let chat_id: i32 = params
        .get("chat_id")
        .and_then(|s| s.parse().ok())
        .unwrap_or(0);
    let user_id: i32 = claims.sub;
    let username = claims.username.clone();
    let db = state.db.clone();

    ws.on_upgrade(move |socket| async move {
        let _ = online_user::ActiveModel {
            user_id: Set(user_id),
            chat_id: Set(chat_id),
            ..Default::default()
        }
        .insert(&db)
        .await;

        handle_socket(socket, state.clone(), chat_id, username.clone(), user_id).await;

        let _ = online_user::Entity::delete_many()
            .filter(online_user::Column::UserId.eq(user_id))
            .filter(online_user::Column::ChatId.eq(chat_id))
            .exec(&db)
            .await;

        send_leave_notification(&state, chat_id, &username).await;
        update_user_count(&state, chat_id).await;
        broadcast_user_list(&state, chat_id).await;
    })
}

async fn handle_socket(
    socket: WebSocket,
    state: AppState,
    chat_id: i32,
    username: String,
    user_id: i32,
) {
    let (mut tx, mut rx_ws) = socket.split();
    let redis_client = state.redis_client.clone();
    let channel = format!("chat:{chat_id}");

    tokio::spawn(async move {
        let conn = match redis_client.get_async_connection().await {
            Ok(c) => c,
            Err(e) => {
                tracing::error!("pubsub connect failed: {e:?}");
                return;
            }
        };
        let mut pubsub = conn.into_pubsub();
        if let Err(e) = pubsub.subscribe(&channel).await {
            tracing::error!("subscribe({channel}) failed: {e:?}");
            return;
        }

        let mut inbound = pubsub.on_message();

        while let Some(msg) = inbound.next().await {
            if let Ok(text) = msg.get_payload::<String>() {
                if tx.send(Message::Text(text.into())).await.is_err() {
                    break;
                }
            } else {
                tracing::error!("invalid payload on {channel}");
            }
        }
    });

    send_join_notification(&state, chat_id, &username).await;
    update_user_count(&state, chat_id).await;
    broadcast_user_list(&state, chat_id).await;

    let mut publisher = state.redis.clone();
    let key = format!("chat:{chat_id}");
    while let Some(Ok(frame)) = rx_ws.next().await {
        if let Message::Text(text) = frame {
            let message = message::ActiveModel {
                chat_id: Set(chat_id),
                sender_id: Set(user_id),
                content: Set(text.to_string()),
                ..Default::default()
            };
            let _ = message.insert(&state.db).await;

            let payload = serde_json::json!({
                "type": "message",
                "content": format!("{username}: {text}"),
            })
            .to_string();
            let _: u64 = publisher.publish(&key, payload).await.unwrap_or(0);
        }
    }
}

async fn send_join_notification(state: &AppState, chat_id: i32, username: &str) {
    let payload = serde_json::json!({
        "type": "system_message",
        "subtype": "join",
        "content": format!("{username} joined the chat"),
        "username": username
    })
    .to_string();

    let mut redis = state.redis.clone();
    let key = format!("chat:{chat_id}");
    let _: u64 = redis.publish(&key, payload).await.unwrap_or(0);
}

async fn send_leave_notification(state: &AppState, chat_id: i32, username: &str) {
    let payload = serde_json::json!({
        "type": "system_message",
        "subtype": "leave",
        "content": format!("{username} left the chat"),
        "username": username
    })
    .to_string();

    let mut redis = state.redis.clone();
    let key = format!("chat:{chat_id}");
    let _: u64 = redis.publish(&key, payload).await.unwrap_or(0);
}

async fn update_user_count(state: &AppState, chat_id: i32) {
    let count = online_user::Entity::find()
        .filter(online_user::Column::ChatId.eq(chat_id))
        .count(&state.db)
        .await
        .unwrap_or(0);

    let payload = serde_json::json!({
        "type": "user_count",
        "chatId": chat_id,
        "content": count,
    })
    .to_string();

    let mut redis = state.redis.clone();
    redis.publish("chat_list", payload).await.unwrap_or(());
}

async fn broadcast_user_list(state: &AppState, chat_id: i32) {
    let rows = online_user::Entity::find()
        .filter(online_user::Column::ChatId.eq(chat_id))
        .find_also_related(user::Entity)
        .all(&state.db)
        .await
        .unwrap_or_default();

    let names: Vec<String> = rows
        .into_iter()
        .filter_map(|(_online, maybe_user)| maybe_user)
        .map(|u| u.username)
        .collect();

    let payload = serde_json::json!({
        "type": "user_list",
        "content": names
    })
    .to_string();

    let mut redis = state.redis.clone();
    redis
        .publish(format!("chat:{chat_id}"), payload)
        .await
        .unwrap_or(());
}
