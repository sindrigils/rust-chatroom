use axum::{Router, routing::get};

use crate::AppState;

mod health;
mod status;

pub fn public_router() -> Router<AppState> {
    Router::new()
        .route("/health", get(health::health))
        .route("/status", get(status::status))
}
