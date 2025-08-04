use std::env;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::errors::Error;

#[derive(Debug, Serialize)]
struct ChatRequest {
    model: String,
    messages: Vec<ChatMessage>,
    max_tokens: Option<u32>,
    temperature: Option<f32>,
    stream: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

#[derive(Debug, Deserialize)]
pub struct ChatResponse {
    pub choices: Vec<Choice>,
}

#[derive(Debug, Deserialize)]
pub struct Choice {
    message: ChatMessage,
}

pub struct OllamaClient {
    client: Client,
    base_url: String,
}

impl OllamaClient {
    pub fn new() -> Result<Self, Error> {
        let base_url =
            env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".to_string());

        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()?;

        Ok(Self { client, base_url })
    }

    pub async fn get_chat_suggestion(
        &self,
        conversation_context: Vec<ChatMessage>,
    ) -> Result<String, Error> {
        let mut messages = vec![ChatMessage {
    role: "system".to_string(),
    content: "Complete the last message, it is an incomplete message and you are only supposed to suggest new words that should come after these words. Previous messages are context. Keep completion under 20 characters.".to_string(),
}];

        messages.extend(conversation_context);

        let request = ChatRequest {
            model: "qwen2:1.5b".to_string(),
            messages,
            max_tokens: Some(15),
            temperature: Some(0.5),
            stream: false,
        };

        let response = self
            .client
            .post(&format!("{}/v1/chat/completions", self.base_url))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        let chat_response: ChatResponse = response.json().await?;
        chat_response
            .choices
            .first()
            .map(|choice| choice.message.content.trim().to_string())
            .filter(|s| !s.is_empty())
            .ok_or(Error::SugesstionUnavailable)
    }
}
