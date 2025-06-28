use axum::{
    body::Body,
    extract::State,
    http::{Request, StatusCode, header},
    middleware::Next,
    response::IntoResponse,
};
use jsonwebtoken::{DecodingKey, Validation, decode};

use crate::{AppState, models::claims::Claims};

pub async fn require_auth(
    State(state): State<AppState>,
    mut req: Request<Body>,
    next: Next,
) -> impl IntoResponse {
    // 1) pull the raw Cookie header
    let token_opt = req
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

    // 2) if missing, bail with a Response<Body>
    let token = match token_opt {
        Some(t) => t,
        None => return StatusCode::UNAUTHORIZED.into_response(),
    };

    // 3) validate the JWT; if it fails, bail the same way
    let token_data = match decode::<Claims>(
        &token,
        &DecodingKey::from_secret(state.settings.jwt_secret.as_bytes()),
        &Validation::default(),
    ) {
        Ok(data) => data,
        Err(_) => return StatusCode::UNAUTHORIZED.into_response(),
    };

    req.extensions_mut().insert(token_data.claims.clone());

    // 4) on success, forward the original request and return its Response<Body>
    next.run(req).await
}
