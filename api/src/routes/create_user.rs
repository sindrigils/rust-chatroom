use crate::AppState;
use crate::entity::user;
use crate::models::create_user::CreateUserRequest;

use axum::{
    extract::{Extension, Json},
    http::StatusCode,
};
use sea_orm::{ActiveModelTrait, Set};

pub async fn create_user(
    Extension(state): Extension<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<(StatusCode, Json<user::Model>), StatusCode> {
    let new_user = user::ActiveModel {
        username: Set(payload.username),
        ..Default::default()
    };

    let inserted: user::Model = new_user.insert(&state.db).await.map_err(|err| {
        eprintln!("DB insert error: {}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok((StatusCode::CREATED, Json(inserted)))
}
