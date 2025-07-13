use std::time::Duration;

use crate::core::ServerPool;

const HEALTH_CHECK_INTERVAL: Duration = Duration::from_secs(10);

pub struct HealthChecker {
    server_pool: ServerPool,
}

impl HealthChecker {
    pub fn new(server_pool: ServerPool) -> Self {
        Self { server_pool }
    }

    pub async fn start(&self) -> Result<(), Box<dyn std::error::Error>> {
        let mut interval = tokio::time::interval(HEALTH_CHECK_INTERVAL);
        loop {
            interval.tick().await;
            let _ = self.check_all_servers().await;
        }
    }

    async fn check_all_servers(&self) -> Result<(), Box<dyn std::error::Error>> {
        for server in self.server_pool.get_servers().await {
            let is_healthy = self.ping_server(server.health_check()).await;

            self.server_pool.update_last_health_check(&server.id).await;

            self.server_pool
                .update_server_health(&server.id, is_healthy)
                .await;
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
