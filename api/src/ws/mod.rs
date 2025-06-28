use std::{collections::HashMap, sync::Arc};

use tokio::sync::{Mutex, broadcast};

pub type ChatHub = Arc<Mutex<HashMap<i32, broadcast::Sender<String>>>>;

pub fn init_hub() -> ChatHub {
    Arc::new(Mutex::new(HashMap::new()))
}

mod chat;
mod chat_list;

pub use chat::chat_ws;
pub use chat_list::chat_list_ws;
