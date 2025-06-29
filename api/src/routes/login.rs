use axum::{Json, extract::State};
use bcrypt::verify;
use chrono::{Duration, Utc};
use hyper::StatusCode;

use jsonwebtoken::{EncodingKey, Header, encode};
use sea_orm::{ColumnTrait, EntityTrait, QueryFilter};
use tower_cookies::Cookies;
use tower_cookies::cookie::{CookieBuilder, SameSite};

use crate::errors::Error;
use crate::{
    AppState,
    entity::user,
    models::{claims::Claims, login::LoginPayload},
};

pub async fn login(
    jar: Cookies,
    State(state): State<AppState>,
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

    let secret = state.settings.jwt_secret;
    let token = create_jwt_token(user.id, &user.username, &secret)?;

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

fn create_jwt_token(user_id: i32, username: &str, secret: &str) -> Result<String, Error> {
    let expiration = Utc::now()
        .checked_add_signed(Duration::hours(24))
        .ok_or(Error::TimestampOverflow)?
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
