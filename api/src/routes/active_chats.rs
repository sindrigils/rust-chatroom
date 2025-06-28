use crate::AppState;
use crate::entity::chat;
use axum::{Json, extract::State, http::StatusCode};
use sea_orm::EntityTrait;
use tower_cookies::Cookies;

pub async fn active_chats(
    _: Cookies,
    State(state): State<AppState>,
) -> Result<Json<Vec<chat::Model>>, StatusCode> {
    let chats = chat::Entity::find().all(&state.db).await.map_err(|err| {
        eprintln!("DB error loading chats: {}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(Json(chats))
}
