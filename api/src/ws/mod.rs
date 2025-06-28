use std::{collections::HashMap, sync::Arc};

use tokio::sync::{Mutex, broadcast};

pub type ChatHub = Arc<Mutex<HashMap<i64, broadcast::Sender<String>>>>;

pub fn init_hub() -> ChatHub {
    Arc::new(Mutex::new(HashMap::new()))
}

mod chat;
pub use chat::chat_ws;
