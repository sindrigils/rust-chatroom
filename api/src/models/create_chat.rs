use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChatRequest {
    pub name: String,
    pub owner_id: i64,
}
