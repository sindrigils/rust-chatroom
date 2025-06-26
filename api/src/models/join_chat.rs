use serde::Serialize;

#[derive(Serialize)]
pub struct JoinChatResponse {
    pub room: String,
    pub message: String,
}
