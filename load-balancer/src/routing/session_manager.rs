use crate::{config::LoadBalancerConfig, core::BackendServer};

use base64::Engine;
use serde_json::Value;
use tower_cookies::Cookies;
use tracing::debug;

pub fn extract_server_from_cookie(
    cookies: &Cookies,
    config: &LoadBalancerConfig,
) -> Option<String> {
    cookies.get(&config.sticky_cookie_name).map(|cookie| {
        let server_id = cookie.value().to_string();
        debug!("Found sticky cookie for server: {}", server_id);
        server_id
    })
}

pub fn extract_user_id_from_jwt(cookies: &Cookies) -> Option<String> {
    let token_cookie_name = "session";
    if let Some(cookie) = cookies.get(token_cookie_name)
        && let Some(user_id) = parse_jwt_user_id(cookie.value())
    {
        debug!("Extracted user ID from JWT: {}", user_id);
        return Some(user_id);
    }
    debug!("No JWT token found in cookies");
    None
}

pub fn parse_jwt_user_id(token: &str) -> Option<String> {
    let parts: Vec<&str> = token.split('.').collect();
    if parts.len() != 3 {
        return None;
    }

    let mut payload_b64 = parts[1].to_string();
    while !payload_b64.len().is_multiple_of(4) {
        payload_b64.push('=');
    }
    let payload_b64 = payload_b64.replace('-', "+").replace('_', "/");

    let payload_bytes =
        Engine::decode(&base64::engine::general_purpose::STANDARD, &payload_b64).ok()?;
    let payload_str = String::from_utf8(payload_bytes).ok()?;
    let payload: Value = serde_json::from_str(&payload_str).ok()?;

    payload.get("sub")?.as_u64().map(|id| id.to_string())
}

/// Set sticky session cookie so future requests go to same server
pub fn set_sticky_session_cookie(
    cookies: &Cookies,
    config: &LoadBalancerConfig,
    target_server: &BackendServer,
) {
    use tower_cookies::Cookie;

    // Don't set cookie if it already matches
    if let Some(existing_cookie) = cookies.get(&config.sticky_cookie_name)
        && existing_cookie.value() == target_server.id
    {
        debug!("Sticky session cookie already correct");
        return;
    }

    // Create and set the sticky session cookie
    let cookie = Cookie::build((config.sticky_cookie_name.clone(), target_server.id.clone()))
        .path("/")
        .http_only(true)
        .secure(!cfg!(debug_assertions))
        .same_site(if cfg!(debug_assertions) {
            tower_cookies::cookie::SameSite::Lax
        } else {
            tower_cookies::cookie::SameSite::Strict
        })
        .max_age(tower_cookies::cookie::time::Duration::seconds(
            config.sticky_cookie_max_age as i64,
        ))
        .build();

    cookies.add(cookie);
    debug!(
        "Set sticky session cookie: {} = {}",
        config.sticky_cookie_name, target_server.id
    );
}
