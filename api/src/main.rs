use crate::{
    errors::handle_error,
    middleware::require_auth,
    routes::{protected_router, public_router},
    ws::{ChatHub, chat_ws, init_hub},
};
use axum::{
    Router,
    error_handling::HandleErrorLayer,
    http::{Method, header},
    middleware::from_fn_with_state,
    routing::get,
    serve,
};

use sea_orm::{Database, DatabaseConnection};
use std::{net::SocketAddr, time::Duration};
use tokio::net::TcpListener;
use tower_cookies::CookieManagerLayer;
use tower_http::cors::{AllowOrigin, CorsLayer};

mod config;
mod entity;
mod errors;
mod middleware;
mod models;
mod routes;
mod ws;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub settings: config::Settings,
    pub hub: ChatHub,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db = Database::connect("postgres://rust_chat:rust_chat@localhost:5434/rust_chat").await?;
    let settings = config::Settings::new();
    let hub = init_hub();
    let state = AppState { db, settings, hub };

    let public = public_router();
    let protected = protected_router().layer(from_fn_with_state(state.clone(), require_auth));

    let api_v1 = Router::new()
        .nest("/api/v1", public.clone())
        .nest("/api/v1", protected);

    let ws_route = Router::new().route(
        "/ws/chat",
        get(chat_ws).layer(from_fn_with_state(state.clone(), require_auth)),
    );

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact("http://localhost:3000".parse().unwrap()))
        .allow_methods(vec![Method::OPTIONS, Method::GET, Method::POST])
        .allow_headers(vec![header::CONTENT_TYPE, header::COOKIE])
        .allow_credentials(true)
        .max_age(Duration::from_secs(3600));

    let app = Router::new()
        .merge(api_v1)
        .merge(ws_route)
        .layer(CookieManagerLayer::new())
        .layer(cors)
        .layer(HandleErrorLayer::new(handle_error))
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], state.settings.http_port));
    let listener = TcpListener::bind(addr).await?;
    println!("Listening on {}", addr);
    serve(listener, app).await?;

    Ok(())
}
