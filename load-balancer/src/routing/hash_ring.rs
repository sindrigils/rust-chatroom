use std::collections::BTreeMap;

use std::sync::Arc;

use std::hash::{DefaultHasher, Hash, Hasher};
use tokio::sync::RwLock;
use tracing::{debug, info};

use crate::core::BackendServer;

#[derive(Clone)]
pub struct HashRing {
    ring: BTreeMap<u64, String>,
    server_health: Arc<RwLock<BTreeMap<String, bool>>>,
    servers: BTreeMap<String, BackendServer>,
}

impl HashRing {
    pub fn new(servers: Vec<BackendServer>) -> Self {
        let virtual_nodes_per_server = 150;
        let mut ring = BTreeMap::new();
        let mut server_map = BTreeMap::new();
        let mut health_map = BTreeMap::new();

        for server in servers {
            server_map.insert(server.id.clone(), server.clone());
            health_map.insert(server.id.clone(), server.is_healthy);

            for i in 0..virtual_nodes_per_server {
                let virtual_key = format!("{}-{}", server.id, i);
                let hash = Self::hash_key(&virtual_key);
                ring.insert(hash, server.id.clone());
            }
            info!(
                "Added server {} to hash ring with {} virtual nodes",
                server.id, virtual_nodes_per_server
            );
        }

        info!("Hash ring built with {} total virtual nodes", ring.len());

        Self {
            ring,
            server_health: Arc::new(RwLock::new(health_map)),
            servers: server_map,
        }
    }

    pub async fn update_server_health(&self, server_id: &str, is_healthy: bool) {
        let mut health_map = self.server_health.write().await;
        if let Some(server) = health_map.get_mut(server_id) {
            *server = is_healthy;
            debug!("Updated server {} health: {}", server_id, is_healthy);
        }
    }

    pub async fn get_server_for_user(&self, user_id: &str) -> Option<BackendServer> {
        let health_map = self.server_health.read().await;
        let user_hash = Self::hash_key(user_id);

        let mut candidate_servers: Vec<_> = self
            .ring
            .range(user_hash..)
            .chain(self.ring.iter())
            .map(|(_, server_id)| server_id)
            .collect();

        candidate_servers.dedup();

        for server_id in candidate_servers {
            if health_map.get(server_id).copied().unwrap_or(false) {
                debug!(
                    "User {} (hash: {}) routed to healthy server {}",
                    user_id, user_hash, server_id
                );
                return self.servers.get(server_id).cloned();
            }
        }

        debug!("No healthy server found for user {}", user_id);
        None
    }

    fn hash_key(key: &str) -> u64 {
        let mut hasher = DefaultHasher::new();
        key.hash(&mut hasher);
        hasher.finish()
    }
}
