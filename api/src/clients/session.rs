use hyper::StatusCode;
use tower_cookies::{
    Cookie, Cookies,
    cookie::{CookieBuilder, SameSite},
};

use crate::errors::Error;
use axum::http::HeaderMap;

use chrono::{Duration, Utc};

use jsonwebtoken::{EncodingKey, Header, encode};

use crate::models::claims::Claims;

pub struct SessionClient {
    jwt_secret: String,
}

impl SessionClient {
    pub fn new(jwt_secret: String) -> Self {
        Self { jwt_secret }
    }

    pub fn create_jwt_token(&self, user_id: i32, username: &str) -> Result<String, Error> {
        let expiration = Utc::now()
            .checked_add_signed(Duration::hours(24))
            .ok_or(Error::InternalServer)?
            .timestamp() as usize;

        let claims = Claims {
            sub: user_id,
            username: username.to_string(),
            exp: expiration,
        };

        let token = encode(
            &Header::default(),
            &claims,
            &EncodingKey::from_secret(self.jwt_secret.as_bytes()),
        )?;
        Ok(token)
    }

    pub fn get_is_secure(&self, headers: &HeaderMap) -> bool {
        headers
            .get("x-forwarded-proto")
            .and_then(|h| h.to_str().ok())
            .map(|proto| proto == "https")
            .unwrap_or(false)
    }

    pub async fn create_session(
        &self,
        user_id: i32,
        username: &str,
        headers: HeaderMap,
        jar: Cookies,
    ) -> Result<StatusCode, Error> {
        let token = self.create_jwt_token(user_id, username)?;
        let is_secure = self.get_is_secure(&headers);

        jar.add(
            CookieBuilder::new("session", token)
                .http_only(true)
                .secure(is_secure)
                .same_site(SameSite::Lax)
                .path("/")
                .build(),
        );

        Ok(StatusCode::OK)
    }

    pub async fn destroy_session(
        &self,
        jar: &Cookies,
        headers: &HeaderMap,
    ) -> Result<StatusCode, Error> {
        let is_secure = self.get_is_secure(headers);

        let cookie = Cookie::build(("session", ""))
            .http_only(true)
            .secure(is_secure)
            .same_site(SameSite::Lax)
            .path("/")
            .build();

        jar.remove(cookie);
        Ok(StatusCode::OK)
    }
}
