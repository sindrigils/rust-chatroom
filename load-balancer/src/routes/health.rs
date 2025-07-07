use std::time::{SystemTime, UNIX_EPOCH};

use axum::Json;
use serde_json::json;

use crate::errors::Error;

pub async fn health() -> Result<Json<serde_json::Value>, Error> {
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
