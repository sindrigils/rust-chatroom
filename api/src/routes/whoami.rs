use crate::models::{claims::Claims, user::UserResponse};
use axum::{Json, extract::Extension};
use hyper::StatusCode;

pub async fn whoami(
    Extension(claims): Extension<Claims>,
) -> Result<Json<UserResponse>, StatusCode> {
    Ok(Json(UserResponse {
        id: claims.sub,
        username: claims.username,
    }))
}
