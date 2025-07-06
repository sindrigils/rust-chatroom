use crate::{
    health_checker::HealthChecker,
    proxy_service::{ProxyService, proxy_handler},
    server_pool::ServerPool,
};
use axum::Router;
use dotenv::dotenv;

use tokio::net::TcpListener;
use tower_cookies::CookieManagerLayer;
use tracing::info;

mod config;
mod hash_ring;
mod health_checker;
mod log;
mod proxy_service;
mod routes;
mod server_pool;

#[derive(Clone)]
pub struct AppState {
    pub config: config::LoadBalancerConfig,
    pub server_pool: server_pool::ServerPool,
    pub proxy_service: proxy_service::ProxyService,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    dotenv().ok();

    let _log_guard = log::init_logging();

    let config = config::LoadBalancerConfig::from_env()?;
    let server_pool = ServerPool::new(&config.backend_servers).await;
    let proxy_service = ProxyService::new();
    let app_state = AppState {
        config,
        server_pool,
        proxy_service,
    };

    let health_checker = HealthChecker::new(app_state.server_pool.clone());
    tokio::spawn(async move {
        if let Err(e) = health_checker.start().await {
            tracing::error!("Health checker error: {}", e);
        }
    });

    let public = routes::public_router();
    let app = Router::new()
        .merge(public)
        .fallback(proxy_handler)
        .with_state(app_state.clone())
        .layer(CookieManagerLayer::new());

    let bind_addr = format!("0.0.0.0:{}", app_state.config.lb_port);
    let listener = TcpListener::bind(&bind_addr).await?;

    info!("🚀 Load balancer starting on {}", bind_addr);
    info!("📊 Status endpoint: http://{}/status", bind_addr);
    info!("❤️ Health endpoint: http://{}/health", bind_addr);

    axum::serve(listener, app).await?;

    Ok(())
}
