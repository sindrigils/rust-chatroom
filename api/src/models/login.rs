use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
pub struct LoginPayload {
    pub username: String,
    pub password: String,
}
