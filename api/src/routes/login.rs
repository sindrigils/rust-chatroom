use axum::{Json, extract::State, response::IntoResponse};
use bcrypt::verify;
use chrono::{Duration, Utc};
use hyper::StatusCode;
use jsonwebtoken::errors::Error as JwtError;
use jsonwebtoken::{EncodingKey, Header, encode};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tower_cookies::Cookies;
use tower_cookies::cookie::{CookieBuilder, SameSite};

use crate::{
    AppState,
    entity::user,
    models::{claims::Claims, login::LoginPayload},
};

pub async fn login(
    jar: Cookies,
    State(state): State<AppState>,
    Json(payload): Json<LoginPayload>,
) -> Result<impl IntoResponse, StatusCode> {
    let maybe_user = user::Entity::find()
        .filter(user::Column::Username.eq(payload.username))
        .one(&state.db)
        .await
        .map_err(|err| {
            eprintln!("DB error: {}", err);
            StatusCode::INTERNAL_SERVER_ERROR
        })?;

    let user = match maybe_user {
        Some(user) => user,
        None => return Err(StatusCode::NOT_FOUND),
    };

    let is_valid = verify(&payload.password, &user.password).map_err(|err| {
        eprintln!("Bcrypt verify error: {}", err);
        StatusCode::INTERNAL_SERVER_ERROR
    })?;

    if !is_valid {
        return Err(StatusCode::NOT_FOUND);
    }

    let secret = state.settings.jwt_secret;
    let token = create_jwt_token(user.id, &user.username, &secret)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    jar.add(
        CookieBuilder::new("session", token)
            .http_only(true)
            .secure(true)
            .same_site(SameSite::Strict)
            .path("/")
            .build(),
    );

    Ok(StatusCode::OK)
}

fn create_jwt_token(user_id: i32, username: &str, secret: &str) -> Result<String, JwtError> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .expect("valid timestamp")
        .timestamp() as usize;

    let claims = Claims {
        sub: user_id,
        username: username.to_string(),
        exp: expiration,
    };

    let token = encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(secret.as_bytes()),
    )?;
    Ok(token)
}
