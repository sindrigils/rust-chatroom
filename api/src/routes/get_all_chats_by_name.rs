use crate::AppState;
use crate::entity::chat;
use crate::errors::Error;
use axum::extract::{Path, State};
use axum::{Json, http::StatusCode};
use migration::SimpleExpr;

use sea_orm::{EntityTrait, QueryFilter};

pub async fn get_all_chats_by_name(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<(StatusCode, Json<Vec<chat::Model>>), Error> {
    let chats = chat::Entity::find()
        .filter(SimpleExpr::Custom(format!("name ILIKE '{}'", name)))
        .all(&state.db)
        .await?;

    Ok((StatusCode::OK, Json(chats)))
}
