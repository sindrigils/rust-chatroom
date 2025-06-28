use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct JoinChatRequest {
    pub user_id: i64,
    pub chat_id: i64,
}
