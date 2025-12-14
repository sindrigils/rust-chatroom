use crate::AppState;
use crate::entity::user;
use crate::models::create_user::CreateUserRequest;
use bcrypt::{DEFAULT_COST, hash};

use crate::errors::Error;
use axum::{
    extract::{Json, State},
    http::StatusCode,
};
use sea_orm::{ActiveModelTrait, Set};

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<CreateUserRequest>,
) -> Result<StatusCode, Error> {
    let hashed_pw = hash(&payload.password, DEFAULT_COST)?;

    let new_user = user::ActiveModel {
        username: Set(payload.username),
        password: Set(hashed_pw),
        ..Default::default()
    };

    new_user.insert(&state.db).await?;

    Ok(StatusCode::CREATED)
}
