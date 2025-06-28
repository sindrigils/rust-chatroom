use crate::AppState;
use crate::{entity::chat, models::create_chat::*};
use axum::extract::State;
use axum::{extract::Json, http::StatusCode};
use sea_orm::{ActiveModelTrait, ActiveValue::Set};
use tokio::sync::broadcast;
use tower_cookies::Cookies;

pub async fn create_chat(
    _: Cookies,
    State(state): State<AppState>,
    Json(payload): Json<CreateChatRequest>,
) -> Result<(StatusCode, Json<chat::Model>), StatusCode> {
    let new_chat = chat::ActiveModel {
        name: Set(payload.name),
        owner_id: Set(payload.owner_id),
        ..Default::default()
    };

    let inserted: chat::Model = new_chat.insert(&state.db).await.map_err(|err| {
        eprintln!("DB insert error: {}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let payload = serde_json::json!({
        "type": "new_chat",
        "content": {"id": inserted.id, "name": inserted.name, "active_users": 0},
    })
    .to_string();

    let mut map = state.hub.lock().await;
    let global_tx = map.entry(0).or_insert_with(|| broadcast::channel(100).0);

    let _ = global_tx.send(payload);

    Ok((StatusCode::CREATED, Json(inserted)))
}
