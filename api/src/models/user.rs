use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
pub struct UserResponse {
    pub id: i32,
    pub username: String,
}
