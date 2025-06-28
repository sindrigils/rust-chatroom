use crate::AppState;
use crate::{entity::chat, models::create_chat::*};
use axum::extract::State;
use axum::{extract::Json, http::StatusCode};
use sea_orm::{ActiveModelTrait, ActiveValue::Set};
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

    Ok((StatusCode::CREATED, Json(inserted)))
}
