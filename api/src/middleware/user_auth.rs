use axum::{
    body::Body,
    extract::State,
    http::{Request, header},
    middleware::Next,
    response::Response,
};
use jsonwebtoken::{DecodingKey, Validation, decode};
use sea_orm::EntityTrait;

use crate::{AppState, entity::user, errors::Error, models::claims::Claims};

pub async fn require_user_auth(
    State(state): State<AppState>,
    mut request: Request<Body>,
    next: Next,
) -> Result<Response<Body>, Error> {
    let token_opt = request
        .headers()
        .get(header::COOKIE)
        .and_then(|hdr| hdr.to_str().ok())
        .and_then(|s| {
            s.split(';')
                .filter_map(|kv| {
                    let mut parts = kv.trim().splitn(2, '=');
                    match (parts.next(), parts.next()) {
                        (Some("session"), Some(val)) => Some(val.to_string()),
                        _ => None,
                    }
                })
                .next()
        });

    let token = match token_opt {
        Some(t) => t,
        None => return Err(Error::Unauthorized),
    };

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
