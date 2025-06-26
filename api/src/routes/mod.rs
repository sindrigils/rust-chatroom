mod create_chat;
mod create_user;
mod join_chat;

use axum::{Router, routing};

pub fn router() -> Router {
    Router::new()
        .route("/api/v1/create", routing::post(create_chat::create_chat))
        .route("/api/v1/join/{room}", routing::get(join_chat::join_chat))
        .route("/api/v1/user", routing::post(create_user::create_user))
}
