use std::collections::HashMap;
use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::{RwLock, mpsc};
use tracing::{debug, info, warn};

static CONNECTION_ID_COUNTER: AtomicUsize = AtomicUsize::new(0);

#[derive(Clone)]
pub struct ConnectionHandle {
    pub id: String,
    pub server_id: String,
    pub user_id: Option<String>,
    pub close_tx: mpsc::UnboundedSender<()>,
}

impl ConnectionHandle {
    pub fn new(server_id: String, user_id: Option<String>) -> (Self, mpsc::UnboundedReceiver<()>) {
        let (close_tx, close_rx) = mpsc::unbounded_channel();
        let connection_id = CONNECTION_ID_COUNTER.fetch_add(1, Ordering::SeqCst);
        let handle = Self {
            id: format!("conn_{}", connection_id),
            server_id,
            user_id,
            close_tx,
        };
        (handle, close_rx)
    }

    pub fn send_close_signal(&self) -> Result<(), mpsc::error::SendError<()>> {
        self.close_tx.send(())
    }
}

#[derive(Clone)]
pub struct WebSocketManager {
    connections: Arc<RwLock<HashMap<String, ConnectionHandle>>>,
    server_connections: Arc<RwLock<HashMap<String, Vec<String>>>>,
}

impl WebSocketManager {
    pub fn new() -> Self {
        Self {
            connections: Arc::new(RwLock::new(HashMap::new())),
            server_connections: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub async fn add_connection(&self, handle: ConnectionHandle) {
        let connection_id = handle.id.clone();
        let server_id = handle.server_id.clone();

        {
            let mut connections = self.connections.write().await;
            connections.insert(connection_id.clone(), handle);
        }

        {
            let mut server_connections = self.server_connections.write().await;
            server_connections
                .entry(server_id)
                .or_insert_with(Vec::new)
                .push(connection_id.clone());
        }

        debug!("Added WebSocket connection: {}", connection_id);
    }

    pub async fn remove_connection(&self, connection_id: &str) {
        let server_id = {
            let mut connections = self.connections.write().await;
            connections
                .remove(connection_id)
                .map(|handle| handle.server_id)
        };

        if let Some(server_id) = server_id {
            let mut server_connections = self.server_connections.write().await;
            if let Some(connection_ids) = server_connections.get_mut(&server_id) {
                connection_ids.retain(|id| id != connection_id);
                if connection_ids.is_empty() {
                    server_connections.remove(&server_id);
                }
            }
        }

        debug!("Removed WebSocket connection: {}", connection_id);
    }

    pub async fn get_server_connections(&self, server_id: &str) -> Vec<ConnectionHandle> {
        let connections = self.connections.read().await;
        let server_connections = self.server_connections.read().await;

        if let Some(connection_ids) = server_connections.get(server_id) {
            connection_ids
                .iter()
                .filter_map(|id| connections.get(id).cloned())
                .collect()
        } else {
            Vec::new()
        }
    }

    pub async fn close_server_connections(&self, server_id: &str) -> usize {
        let connections_to_close = self.get_server_connections(server_id).await;
        let connection_count = connections_to_close.len();

        if connection_count == 0 {
            debug!(
                "No WebSocket connections to close for server: {}",
                server_id
            );
            return 0;
        }

        info!(
            "Closing {} WebSocket connections for failed server: {}",
            connection_count, server_id
        );

        let mut successful_closes = 0;
        for connection in connections_to_close {
            match connection.send_close_signal() {
                Ok(_) => {
                    successful_closes += 1;
                    debug!("Sent close signal to connection: {}", connection.id);
                }
                Err(e) => {
                    warn!(
                        "Failed to send close signal to connection {}: {}",
                        connection.id, e
                    );
                }
            }
        }

        info!(
            "Successfully sent close signals to {}/{} WebSocket connections for server: {}",
            successful_closes, connection_count, server_id
        );

        successful_closes
    }

    pub async fn get_connection_stats(&self) -> (usize, HashMap<String, usize>) {
        let connections = self.connections.read().await;
        let server_connections = self.server_connections.read().await;

        let total_connections = connections.len();
        let connections_per_server = server_connections
            .iter()
            .map(|(server_id, connection_ids)| (server_id.clone(), connection_ids.len()))
            .collect();

        (total_connections, connections_per_server)
    }
}
