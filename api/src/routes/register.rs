use crate::AppState;
use crate::entity::user;
use crate::models::create_user::CreateUserRequest;
use bcrypt::{DEFAULT_COST, hash};

use axum::{
    extract::{Json, State},
    http::StatusCode,
};
use sea_orm::{ActiveModelTrait, Set};
use tower_cookies::Cookies;

pub async fn register(
    _: Cookies,
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<StatusCode, StatusCode> {
    let hashed_pw = hash(&payload.password, DEFAULT_COST).map_err(|err| {
        eprintln!("Password hash error: {}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    let new_user = user::ActiveModel {
        username: Set(payload.username),
        password: Set(hashed_pw),
        ..Default::default()
    };

    new_user.insert(&state.db).await.map_err(|err| {
        eprintln!("DB insert error: {}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    Ok(StatusCode::CREATED)
}
