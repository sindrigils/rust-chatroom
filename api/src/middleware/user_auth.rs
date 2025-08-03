use axum::{body::Body, extract::State, http::Request, middleware::Next, response::Response};
use jsonwebtoken::{DecodingKey, Validation, decode};
use sea_orm::EntityTrait;
use tower_cookies::Cookies;

use crate::{AppState, entity::user, errors::Error, models::claims::Claims};

pub async fn require_user_auth(
    State(state): State<AppState>,
    jar: Cookies,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response<Body>, Error> {
    let token = jar
        .get("session")
        .and_then(|cookie| Some(cookie.value().to_string()))
        .ok_or(Error::Unauthorized)?;

    let token_data = match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.settings.jwt_secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data,
        Err(_) => return Err(Error::Unauthorized),
    };

    let user_id = token_data.claims.sub as i32;

    if user::Entity::find_by_id(user_id)
        .one(&state.db)
        .await
        .map_err(|_| Error::InternalServer)?
        .is_none()
    {
        return Err(Error::Unauthorized);
    }

    request.extensions_mut().insert(token_data.claims.clone());
    let res = next.run(request).await;
    Ok(res)
}
