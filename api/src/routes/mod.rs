use crate::AppState;
use axum::{
    Router,
    routing::{get, post},
};

mod active_chats;
mod create_chat;
mod health;
mod login;
mod register;
mod who_am_i;

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register::register))
        .route("/login", post(login::login))
        .route("/health", get(health::health))
}

pub fn protected_router() -> Router<AppState> {
    Router::new()
        .route("/chat", post(create_chat::create_chat))
        .route("/chat", get(active_chats::active_chats))
        .route("/whoami", get(who_am_i::who_am_i))
}
