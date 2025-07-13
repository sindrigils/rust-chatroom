use std::{net::SocketAddr, sync::Arc, time::Duration};

use crate::{
    core::{HealthChecker, ServerPool, WebSocketManager},
    routing::{ProxyService, http_handler, websocket_handler},
};
use axum::Router;
use dotenv::dotenv;
use tower_governor::{GovernorLayer, governor::GovernorConfigBuilder};
use tower_http::services::{ServeDir, ServeFile};

use tokio::net::TcpListener;
use tower_cookies::CookieManagerLayer;
use tracing::info;

mod config;
mod core;
mod errors;
mod logging;
mod routes;
mod routing;

#[derive(Clone)]
pub struct AppState {
    pub config: config::LoadBalancerConfig,
    pub server_pool: ServerPool,
    pub proxy_service: ProxyService,
    pub ws_manager: Arc<WebSocketManager>,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let _log_guard = logging::init_logging();

    let config = config::LoadBalancerConfig::from_env()?;
    let server_pool = ServerPool::new(&config.backend_servers).await;
    let proxy_service = ProxyService::new();
    let ws_manager = Arc::new(WebSocketManager::new());
    let ws_manager_for_health = ws_manager.clone();

    let app_state = AppState {
        config,
        server_pool,
        proxy_service,
        ws_manager,
    };

    let health_checker = HealthChecker::new(app_state.server_pool.clone());
    tokio::spawn(async move {
        if let Err(e) = health_checker.start(ws_manager_for_health).await {
            tracing::error!("Health checker error: {}", e);
        }
    });

    let public = routes::public_router();

    let governor_conf = Arc::new(
        GovernorConfigBuilder::default()
            .per_second(app_state.config.rate_limit_per_second)
            .burst_size(app_state.config.rate_limit_burst_size)
            .finish()
            .unwrap(),
    );
    let governor_limiter = governor_conf.limiter().clone();
    let interval = Duration::from_secs(60);

    std::thread::spawn(move || {
        loop {
            std::thread::sleep(interval);
            tracing::info!("rate limiting storage size: {}", governor_limiter.len());
            governor_limiter.retain_recent();
        }
    });

    let app = Router::new()
        .merge(public)
        .route("/ws/{*path}", axum::routing::get(websocket_handler))
        .route("/api/{*path}", axum::routing::any(http_handler))
        .nest_service("/assets", ServeDir::new("dist/assets"))
        .fallback_service(
            ServeDir::new("dist")
                .append_index_html_on_directories(true)
                .fallback(ServeFile::new("dist/index.html")),
        )
        .with_state(app_state.clone())
        .layer(CookieManagerLayer::new())
        .layer(GovernorLayer {
            config: governor_conf,
        });

    let bind_addr = format!("{}:{}", app_state.config.host, app_state.config.port);
    let listener = TcpListener::bind(&bind_addr).await?;

    info!("🚀 Load balancer starting on {}", bind_addr);
    info!("📊 Status endpoint: http://{}/status", bind_addr);
    info!("❤️ Health endpoint: http://{}/health", bind_addr);

    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<SocketAddr>(),
    )
    .await
    .unwrap();

    Ok(())
}
