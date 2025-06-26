use crate::models::create_chat::*;
use axum::{extract::Json, http::StatusCode, response::IntoResponse};

pub async fn create_chat(Json(payload): Json<CreateChatRequest>) -> impl IntoResponse {
    // TODO: spawn or track room using ws::broadcaster
    let url = format!(
        "ws://localhost:{}/ws/{}/{}",
        payload.port, payload.room, payload.user
    );
    let resp = CreateChatResponse { url };
    (StatusCode::CREATED, Json(resp))
}
