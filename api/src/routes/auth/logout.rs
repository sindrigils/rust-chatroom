use crate::{AppState, errors::Error};
use axum::http::HeaderMap;
use axum::{extract::State, http::StatusCode};
use tower_cookies::Cookies;

pub async fn logout(
    jar: Cookies,
    headers: HeaderMap,
    State(state): State<AppState>,
) -> Result<StatusCode, Error> {
    state.session_client.destroy_session(&jar, &headers).await?;
    Ok(StatusCode::OK)
}
