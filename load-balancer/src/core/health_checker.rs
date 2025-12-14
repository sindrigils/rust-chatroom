use std::{sync::Arc, time::Duration};

use tracing::info;

use crate::core::{ServerPool, WebSocketManager};

const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(3);

pub struct HealthChecker {
    server_pool: ServerPool,
}

impl HealthChecker {
    pub fn new(server_pool: ServerPool) -> Self {
        Self { server_pool }
    }

    pub async fn start(
        &self,
        ws_manager: Arc<WebSocketManager>,
    ) -> Result<(), Box<dyn std::error::Error>> {
        let mut interval = tokio::time::interval(HEALTH_CHECK_INTERVAL);
        loop {
            interval.tick().await;
            let _ = self.check_all_servers(&ws_manager).await;
        }
    }

    async fn check_all_servers(
        &self,
        ws_manager: &WebSocketManager,
    ) -> Result<(), Box<dyn std::error::Error>> {
        for server in self.server_pool.get_servers().await {
            let is_healthy = self.ping_server(server.health_check()).await;
            let was_healthy = server.is_healthy;

            self.server_pool.update_last_health_check(&server.id).await;

            if was_healthy != is_healthy {
                info!(
                    "Server {} health changed: {} -> {}",
                    server.id, was_healthy, is_healthy
                );

                self.server_pool
                    .update_server_health(&server.id, is_healthy)
                    .await;

                if !is_healthy {
                    let closed_connections = ws_manager.close_server_connections(&server.id).await;
                    if closed_connections > 0 {
                        info!(
                            "Closed {} WebSocket connections for failed server: {}",
                            closed_connections, server.id
                        );
                    }
                }
            }
        }
        Ok(())
    }

    async fn ping_server(&self, url: String) -> bool {
        let timeout = tokio::time::Duration::from_secs(5);

        match tokio::time::timeout(timeout, reqwest::get(url)).await {
            Ok(Ok(response)) => response.status().is_success(),
            _ => false,
        }
    }
}
