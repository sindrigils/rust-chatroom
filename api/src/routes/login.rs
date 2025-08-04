use axum::{Json, extract::State, http::HeaderMap};
use bcrypt::verify;
use hyper::StatusCode;

use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tower_cookies::Cookies;

use crate::errors::Error;
use crate::{AppState, entity::user, models::login::LoginPayload};

pub async fn login(
    jar: Cookies,
    State(state): State<AppState>,
    headers: HeaderMap,
    Json(payload): Json<LoginPayload>,
) -> Result<StatusCode, Error> {
    let user = user::Entity::find()
        .filter(user::Column::Username.eq(payload.username))
        .one(&state.db)
        .await?
        .ok_or(Error::NotFound)?;

    let is_valid = tokio::task::spawn_blocking({
        let hash = user.password.clone();
        let pw = payload.password.clone();
        move || verify(&pw, &hash)
    })
    .await??;

    if !is_valid {
        return Err(Error::Unauthorized);
    }

    state
        .session_client
        .create_session(user.id, &user.username, headers, jar)
        .await?;

    Ok(StatusCode::OK)
}
