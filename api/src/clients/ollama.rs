use serde_json::json;

use tracing::debug;

use reqwest::Client;
use serde::{Deserialize, Serialize};

use crate::errors::Error;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub role: String,
    pub content: String,
}

pub struct OllamaClient {
    client: Client,
    url: String,
}

impl OllamaClient {
    pub fn new(url: String) -> Result<Self, Error> {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()?;

        Ok(Self { client, url })
    }

    pub async fn get_chat_suggestion(
        &self,
        conversation_context: Vec<ChatMessage>,
    ) -> Result<String, Error> {
        if conversation_context.is_empty() {
            return Err(Error::SugesstionUnavailable);
        }

        let (prior, last) = conversation_context.split_at(conversation_context.len() - 1);
        let incomplete = &last[0].content;

        let system_prompt = "\
You are an autocomplete for a chat input. Continue ONLY the user's last line in the same tone.
Rules:
- If the last line ends MID-WORD, finish that word with NO leading space.
- If the last line ends at a COMPLETE word, begin with ONE leading space.
- After that, add up to 5 more likely words.
- Use normal spaces between words. No punctuation, quotes, or newlines.
- Return ONLY the continuation fragment (no echo, no labels).

Examples:
Last line: Hello,
Completion: how are you?

Last line: I'm good,
Completion: thank you!

Last line: What did yo
Completion: u do today?";
        let mut messages = vec![json!({"role": "system", "content": system_prompt})];

        for m in prior.iter().rev().take(5).rev() {
            messages.push(json!({"role": "user", "content": m.content}));
        }

        messages.push(json!({"role": "user", "content": incomplete}));
        let request = json!({
            "model": "llama3.1:8b",
            "messages": messages,
            "stream": false,
            "options": {
                "temperature": 0.1,
                "num_predict": 18,
                "stop": ["\n", ".", "!", "?", ","],
            }
        });

        debug!("OLLAMA CHAT REQUEST: {:?}", request);

        let response = self
            .client
            .post(format!("{}/api/chat", self.url))
            .header("Content-Type", "application/json")
            .json(&request)
            .send()
            .await?;

        let response_json: serde_json::Value = response.json().await?;
        debug!("OLLAMA CHAT RESPONSE: {:?}", response_json);

        let completion = response_json
            .get("message")
            .and_then(|m| m.get("content"))
            .and_then(|c| c.as_str())
            .unwrap_or("")
            .trim_end_matches('\n')
            .to_string();

        if completion.is_empty() {
            Err(Error::SugesstionUnavailable)
        } else {
            Ok(completion)
        }
    }
}
