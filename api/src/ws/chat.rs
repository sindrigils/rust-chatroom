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
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, ColumnTrait, DatabaseConnection, EntityTrait,
    PaginatorTrait, QueryFilter,
};
use tokio::sync::broadcast;

use crate::{
    AppState,
    entity::{online_user, user},
    models::claims::Claims,
    ws::ChatHub,
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
    let user_id: i32 = claims.sub as i32;

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

        update_user_count(&db, hub.clone(), chat_id).await;
        handle_socket(socket, &db, hub.clone(), chat_id, claims.username.clone()).await;

        let _ = online_user::Entity::delete_many()
            .filter(online_user::Column::UserId.eq(user_id))
            .filter(online_user::Column::ChatId.eq(chat_id))
            .exec(&db)
            .await;

        update_user_count(&db, hub.clone(), chat_id).await;
        broadcast_user_list(&db, &hub, chat_id).await;
    })
}

async fn handle_socket(
    socket: WebSocket,
    db: &DatabaseConnection,
    hub: ChatHub,
    chat_id: i32,
    username: String,
) {
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
                break;
            }
        }
    });

    broadcast_user_list(&db, &hub, chat_id).await;

    while let Some(Ok(frame)) = rx_ws.next().await {
        if let Message::Text(text) = frame {
            let payload = serde_json::json!({
                "type": "message",
                "content": format!("{}: {}", username, text),
            })
            .to_string();

            if let Some(sender) = hub.lock().await.get(&chat_id) {
                let _ = sender.send(payload);
            }
        }
    }
}

async fn broadcast_user_list(db: &DatabaseConnection, hub: &ChatHub, chat_id: i32) {
    let rows = online_user::Entity::find()
        .filter(online_user::Column::ChatId.eq(chat_id))
        .find_also_related(user::Entity)
        .all(db)
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

    if let Some(broadcaster) = hub.lock().await.get(&chat_id) {
        let _ = broadcaster.send(payload);
    }
}

async fn update_user_count(db: &DatabaseConnection, hub: ChatHub, chat_id: i32) {
    let count = online_user::Entity::find()
        .filter(online_user::Column::ChatId.eq(chat_id))
        .count(db)
        .await
        .unwrap_or(0);

    let payload = serde_json::json!({
        "type": "user_count",
        "chatId": chat_id,
        "content": count,
    })
    .to_string();

    let mut map = hub.lock().await;
    let global_tx = map.entry(0).or_insert_with(|| broadcast::channel(100).0);

    let _ = global_tx.send(payload);
}
