use crate::{
    middleware::require_auth,
    routes::{protected_router, public_router},
    ws::{chat_list_ws, chat_ws},
};
use axum::{
    Router,
    http::{Method, header},
    middleware::from_fn_with_state,
    routing::get,
    serve,
};
use dotenv::dotenv;
use migration::{Migrator, MigratorTrait};
use sea_orm_migration::prelude::*;
use tracing_subscriber;

use redis::{Client as RedisClient, aio::ConnectionManager};
use sea_orm::{Database, DatabaseConnection};
use std::io::Write;
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
    pub redis_client: RedisClient,
    pub redis: ConnectionManager,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    eprintln!("=== BACKEND STARTING ===");
    println!("=== BACKEND STARTING ===");

    std::io::stdout().flush().unwrap();
    std::io::stderr().flush().unwrap();

    dotenv().ok();
    eprintln!("=== DOTENV LOADED ===");

    tracing_subscriber::fmt::init();
    eprintln!("=== TRACING INITIALIZED ===");

    eprintln!("=== CONNECTING TO DATABASE ===");
    let database_url = std::env::var("DATABASE_URL").expect("no DATABASE_URL found in environment");
    eprintln!("=== DATABASE_URL: {} ===", database_url);

    let db = Database::connect(database_url).await?;
    eprintln!("=== DATABASE CONNECTED ===");

    eprintln!("=== RUNNING MIGRATIONS ===");
    Migrator::up(&db, None).await?;
    eprintln!("=== MIGRATIONS COMPLETED ===");

    eprintln!("=== LOADING SETTINGS ===");
    let settings = config::Settings::new();
    eprintln!("=== SETTINGS LOADED ===");

    let redis_client = RedisClient::open(std::env::var("REDIS_URL")?)?;
    let redis_mgr = ConnectionManager::new(redis_client.clone()).await?;

    let state = AppState {
        db,
        settings,
        redis_client,
        redis: redis_mgr,
    };

    let public = public_router();
    let protected = protected_router().layer(from_fn_with_state(state.clone(), require_auth));

    let api_v1 = Router::new()
        .nest("/api/v1", public)
        .nest("/api/v1", protected);

    let ws_route = Router::new()
        .route("/ws/chat", get(chat_ws))
        .route("/ws/chat-list", get(chat_list_ws))
        .layer(from_fn_with_state(state.clone(), require_auth));

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::exact(
            std::env::var("DOMAIN")
                .expect("no DOMAIN found in environment")
                .parse()
                .unwrap(),
        ))
        .allow_methods(vec![Method::OPTIONS, Method::GET, Method::POST])
        .allow_headers(vec![header::CONTENT_TYPE, header::COOKIE])
        .allow_credentials(true)
        .max_age(Duration::from_secs(3600));

    let app = Router::new()
        .merge(api_v1)
        .merge(ws_route)
        .layer(CookieManagerLayer::new())
        .layer(cors)
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], state.settings.http_port));
    let listener = TcpListener::bind(addr).await?;
    println!("Listening on {}", addr);
    serve(listener, app).await?;

    Ok(())
}
