use axum::{http::StatusCode, response::IntoResponse};

pub async fn handle_error(err: impl std::fmt::Display) -> impl IntoResponse {
    let body = format!("{{ \"error\": \"{}\" }}", err);
    (StatusCode::INTERNAL_SERVER_ERROR, body)
}
