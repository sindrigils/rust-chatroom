use crate::models::join_chat::JoinChatResponse;
use axum::{Json, extract::Path, http::StatusCode, response::IntoResponse};

/// GET /api/join/:room  returns JSON
pub async fn join_chat(Path(room): Path<String>) -> impl IntoResponse {
    let resp = JoinChatResponse {
        room: room.clone(),
        message: "Joined".into(),
    };
    (StatusCode::OK, Json(resp))
}
