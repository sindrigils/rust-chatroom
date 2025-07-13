use axum::{Json, extract::State};
use serde_json::json;
use std::time::{SystemTime, UNIX_EPOCH};

use crate::{AppState, errors::Error};

pub async fn status(State(state): State<AppState>) -> Result<Json<serde_json::Value>, Error> {
    let servers = state.server_pool.get_servers().await;

    let server_status: Vec<serde_json::Value> = servers
        .into_iter()
        .map(|server| {
            // Convert Instant to seconds since epoch for serialization
            let last_check_secs = server.last_health_check.elapsed().as_secs();
            let last_check_timestamp = SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .unwrap()
                .as_secs()
                - last_check_secs;

            json!({
                "id": server.id,
                "address": server.address,
                "healthy": server.is_healthy,
                "active_connections": server.active_connections,
                "last_health_check_seconds_ago": last_check_secs,
                "last_health_check_timestamp": last_check_timestamp
            })
        })
        .collect();

    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Ok(Json(json!({
        "load_balancer": {
            "status": "running",
            "port": state.config.port,
        },
        "backend_servers": server_status,
        "config": {
            "health_check_interval": state.config.health_check_interval.as_secs(),
            "health_check_timeout": state.config.health_check_timeout.as_secs(),
            "sticky_cookie_name": state.config.sticky_cookie_name
        },
        "timestamp": current_timestamp
    })))
}
