use crate::AppState;
use axum::{
    Router,
    routing::{get, post},
};

mod active_chats;
mod create_chat;
mod get_all_chats_by_name;
mod get_chat;
mod health;
mod login;
mod logout;
mod register;
mod whoami;

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/register", post(register::register))
        .route("/login", post(login::login))
}

pub fn protected_router() -> Router<AppState> {
    Router::new()
        .route("/logout", post(logout::logout))
        .route("/chat", post(create_chat::create_chat))
        .route("/chat", get(active_chats::active_chats))
        .route("/chat/{id}", get(get_chat::get_chat))
        .route(
            "/chat/name/{name}",
            get(get_all_chats_by_name::get_all_chats_by_name),
        )
        .route("/whoami", get(whoami::whoami))
}

pub fn health_router() -> Router<AppState> {
    Router::new().route("/health", get(health::health))
}
