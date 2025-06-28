use sea_orm::FromQueryResult;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, FromQueryResult)]
pub struct Chat {
    pub id: i32,
    pub name: String,
    pub active_users: i64,
}
