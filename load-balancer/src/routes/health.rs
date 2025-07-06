use std::time::{SystemTime, UNIX_EPOCH};

use axum::Json;
use hyper::http::StatusCode;
use serde_json::json;

pub async fn health() -> Result<Json<serde_json::Value>, StatusCode> {
    let current_timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();

    Ok(Json(json!({
        "status": "healthy",
        "service": "load-balancer",
        "timestamp": current_timestamp
    })))
}
