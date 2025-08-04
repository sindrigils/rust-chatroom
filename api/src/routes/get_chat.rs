use crate::AppState;
use crate::entity::chat;
use crate::errors::Error;
use axum::extract::{Path, State};
use axum::{Json, http::StatusCode};
use sea_orm::EntityTrait;

pub async fn get_chat(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<(StatusCode, Json<chat::Model>), Error> {
    let chat = chat::Entity::find_by_id(id).one(&state.db).await?;
    Ok((StatusCode::OK, Json(chat.unwrap())))
}
