use crate::{
    clients::{OllamaClient, RedisClient, SessionClient},
    middleware::{require_lb_auth, require_user_auth},
    routes::{health_router, protected_router, public_router, ws_router},
};
use axum::{
    Router,
    http::{Method, header},
    middleware::from_fn_with_state,
    serve,
};
use dotenvy::dotenv;

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

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub settings: config::Settings,
    pub session_client: Arc<SessionClient>,
    pub ollama_client: Arc<OllamaClient>,
    pub redis_client: Arc<RedisClient>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let _log_guard = logging::init_logging();

    let database_url = std::env::var("DATABASE_URL")?;
    let db = Database::connect(database_url).await?;
    let settings = config::Settings::new();

    let jwt_secret = settings.jwt_secret.clone();

    let state = AppState {
        db,
        settings: settings.clone(),
        session_client: Arc::new(SessionClient::new(jwt_secret)),
        ollama_client: Arc::new(OllamaClient::new(settings.ollama_url).unwrap()),
        redis_client: Arc::new(RedisClient::new(settings.redis_url).await.unwrap()),
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
        .nest("/ws", ws_router())
        .layer(from_fn_with_state(state.clone(), require_user_auth))
        .layer(from_fn_with_state(state.clone(), require_lb_auth));

    let allowed_origins: Vec<header::HeaderValue> = std::env::var("DOMAIN")
        .expect("no DOMAIN found in environment")
        .split(',')
        .map(|s| s.trim().parse().expect("invalid origin in DOMAIN"))
        .collect();

    let cors = CorsLayer::new()
        .allow_origin(AllowOrigin::list(allowed_origins))
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
    serve(listener, app).await?;

    Ok(())
}
