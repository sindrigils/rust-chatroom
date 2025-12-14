use crate::AppState;
use axum::{
    Router,
    routing::{get, post},
};

mod auth;
mod chat;
mod monitoring;

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/register", post(auth::register))
        .route("/login", post(auth::login))
}

pub fn protected_router() -> Router<AppState> {
    Router::new()
        .route("/logout", post(auth::logout))
        .route("/chat", post(chat::create_chat))
        .route("/chat", get(chat::active_chats))
        .route("/chat/{id}", get(chat::get_chat))
        .route("/chat/name/{name}", get(chat::get_all_chats_by_name))
        .route("/whoami", get(auth::whoami))
}

pub fn health_router() -> Router<AppState> {
    Router::new().route("/health", get(monitoring::health))
}

pub fn ws_router() -> Router<AppState> {
    Router::new()
        .route("/chat", get(chat::chat_ws))
        .route("/chat-list", get(chat::chat_list_ws))
}
