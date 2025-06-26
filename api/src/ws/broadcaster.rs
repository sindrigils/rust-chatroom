use axum::extract::ws::{Message, WebSocket};
use futures::{SinkExt, StreamExt};
use lazy_static::lazy_static;
use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};
use tokio::sync::mpsc::{UnboundedSender, unbounded_channel};

// Map room -> list of message senders for each client
lazy_static! {
    static ref ROOMS: Arc<Mutex<HashMap<String, Vec<UnboundedSender<Message>>>>> =
        Arc::new(Mutex::new(HashMap::new()));
}

/// Register socket, then broadcast incoming texts to all peers
pub async fn broadcaster(room: String, user: String, socket: WebSocket) {
    // Split the socket into a sender half and a receiver half
    let (mut sender_ws, mut receiver_ws) = socket.split();

    // Create a channel for broadcasting: we will receive broadcast messages here
    let (tx, mut rx) = unbounded_channel();

    // Register this client's channel sender in the room
    {
        let mut map = ROOMS.lock().unwrap();
        map.entry(room.clone()).or_default().push(tx);
    }

    // Spawn a task to forward broadcast messages to this WebSocket
    tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            // If send fails, the socket might be closed — ignore
            let _ = sender_ws.send(msg).await;
        }
    });

    // Listen for incoming messages from this client
    while let Some(Ok(msg)) = receiver_ws.next().await {
        if let Message::Text(txt) = msg {
            let full_msg = Message::Text(format!("[{}] {}", user, txt).into());
            // Broadcast to all peers in the room
            let peers = ROOMS.lock().unwrap();
            if let Some(senders) = peers.get(&room) {
                for peer_tx in senders.iter() {
                    let _ = peer_tx.send(full_msg.clone());
                }
            }
        }
    }
}
