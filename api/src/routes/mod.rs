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
mod whoami;

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register::register))
        .route("/login", post(login::login))
}

pub fn protected_router() -> Router<AppState> {
    Router::new()
        .route("/chat", post(create_chat::create_chat))
        .route("/chat", get(active_chats::active_chats))
        .route("/whoami", get(whoami::whoami))
}

pub fn health_router() -> Router<AppState> {
    Router::new().route("/health", get(health::health))
}
