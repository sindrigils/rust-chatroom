use std::sync::Arc;

use tokio::{sync::RwLock, time::Instant};

use crate::{config::ServerConfig, hash_ring::HashRing};

#[derive(Clone)]
pub struct ServerPool {
    servers: Arc<RwLock<Vec<BackendServer>>>,
    hash_ring: HashRing,
}

#[derive(Clone)]
pub struct BackendServer {
    pub id: String,
    pub address: String,
    pub is_healthy: bool,
    pub active_connections: usize,
    pub last_health_check: Instant,
}

impl ServerPool {
    pub async fn new(servers: &Vec<ServerConfig>) -> Self {
        let backend_servers: Vec<BackendServer> = servers
            .iter()
            .map(|s| BackendServer {
                id: s.id.clone(),
                address: s.address(),
                is_healthy: true,
                active_connections: 0,
                last_health_check: Instant::now(),
            })
            .collect();

        let hash_ring = HashRing::new(backend_servers.clone());

        Self {
            servers: Arc::new(RwLock::new(backend_servers)),
            hash_ring,
        }
    }

    pub async fn get_server_for_user(&self, user_id: &str) -> Option<BackendServer> {
        self.hash_ring.get_server_for_user(user_id).await
    }

    pub async fn get_servers(&self) -> Vec<BackendServer> {
        let servers = self.servers.read().await;
        servers.clone()
    }

    pub async fn get_healthy_servers(&self) -> Vec<BackendServer> {
        let servers = self.servers.read().await;
        servers.iter().filter(|s| s.is_healthy).cloned().collect()
    }

    pub async fn get_server_by_id(&self, id: &str) -> Option<BackendServer> {
        let servers = self.servers.read().await;
        servers.iter().find(|s| s.id == id).cloned()
    }

    pub async fn get_least_loaded_server(&self) -> Option<BackendServer> {
        let servers = self.servers.read().await;
        servers.iter().min_by_key(|s| s.active_connections).cloned()
    }

    pub async fn update_server_health(&self, server_id: &str, is_healthy: bool) {
        // Update backend servers list
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.iter_mut().find(|s| s.id == server_id) {
            server.is_healthy = is_healthy;
        }

        // Update hash ring
        self.hash_ring
            .update_server_health(server_id, is_healthy)
            .await;
    }

    pub async fn update_last_health_check(&self, id: &str) {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.iter_mut().find(|s| s.id == id) {
            server.last_health_check = Instant::now();
        }
    }

    pub async fn increment_connections(&self, server_id: &str) {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.iter_mut().find(|s| s.id == server_id) {
            server.active_connections += 1;
        }
    }

    pub async fn decrement_connections(&self, server_id: &str) {
        let mut servers = self.servers.write().await;
        if let Some(server) = servers.iter_mut().find(|s| s.id == server_id) {
            server.active_connections -= 1;
        }
    }
}
