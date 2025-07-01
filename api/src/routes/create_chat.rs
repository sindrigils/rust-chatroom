use crate::AppState;
use crate::errors::Error;
use crate::{entity::chat, models::create_chat::*};
use axum::extract::State;
use axum::{extract::Json, http::StatusCode};
use redis::AsyncCommands;
use sea_orm::{ActiveModelTrait, ActiveValue::Set};

pub async fn create_chat(
    State(state): State<AppState>,
    Json(payload): Json<CreateChatRequest>,
) -> Result<(StatusCode, Json<chat::Model>), Error> {
    let new_chat = chat::ActiveModel {
        name: Set(payload.name),
        owner_id: Set(payload.owner_id),
        ..Default::default()
    };

    let inserted: chat::Model = new_chat.insert(&state.db).await?;

    let payload = serde_json::json!({
        "type": "new_chat",
        "content": {"id": inserted.id, "name": inserted.name, "active_users": 0},
    })
    .to_string();

    let mut redis = state.redis;
    redis.publish("chat_list", payload).await.unwrap_or(());

    Ok((StatusCode::CREATED, Json(inserted)))
}
