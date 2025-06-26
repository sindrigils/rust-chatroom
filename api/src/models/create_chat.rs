use serde::{Deserialize, Serialize};

#[derive(Deserialize)]
pub struct CreateChatRequest {
    pub room: String,
    pub port: u16,
    pub user: String,
}

#[derive(Serialize)]
pub struct CreateChatResponse {
    pub url: String,
}
