use crate::{
    clients::SessionClient,
    middleware::{require_lb_auth, require_user_auth},
    routes::{health_router, protected_router, public_router},
    ws::{chat_list_ws, chat_ws},
};
use axum::{
    Router,
    http::{Method, header},
    middleware::from_fn_with_state,
    routing::get,
    serve,
};
use dotenvy::dotenv;

use redis::{Client as RedisClient, aio::ConnectionManager};
use sea_orm::{Database, DatabaseConnection};

use std::{net::SocketAddr, sync::Arc, time::Duration};
use tokio::net::TcpListener;
use tower_cookies::CookieManagerLayer;
use tower_http::cors::{AllowOrigin, CorsLayer};

mod clients;
mod config;
mod entity;
mod errors;
mod logging;
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
    pub session_client: Arc<SessionClient>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let _log_guard = logging::init_logging();

    let database_url = std::env::var("DATABASE_URL")?;
    let db = Database::connect(database_url).await?;
    let settings = config::Settings::new();

    let redis_client = RedisClient::open(std::env::var("REDIS_URL")?)?;
    let redis_mgr = ConnectionManager::new(redis_client.clone()).await?;
    let jwt_secret = settings.jwt_secret.clone();

    let state = AppState {
        db,
        settings,
        redis_client,
        redis: redis_mgr,
        session_client: Arc::new(SessionClient::new(jwt_secret)),
    };

    let public = public_router().layer(from_fn_with_state(state.clone(), require_lb_auth));
    let health = health_router();

    let protected = protected_router()
        .layer(from_fn_with_state(state.clone(), require_user_auth))
        .layer(from_fn_with_state(state.clone(), require_lb_auth));

    let api_v1 = Router::new()
        .nest("/api/v1", public)
        .nest("/api/v1", protected);

    let ws_route = Router::new()
        .route("/ws/chat", get(chat_ws))
        .route("/ws/chat-list", get(chat_list_ws))
        .layer(from_fn_with_state(state.clone(), require_user_auth))
        .layer(from_fn_with_state(state.clone(), require_lb_auth));

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
        .merge(health)
        .merge(api_v1)
        .merge(ws_route)
        .layer(CookieManagerLayer::new())
        .layer(cors)
        .with_state(state.clone());

    let addr = SocketAddr::from(([0, 0, 0, 0], state.settings.http_port));
    let listener = TcpListener::bind(addr).await?;
    println!("Listening on {addr}");
    serve(listener, app).await?;

    Ok(())
}
