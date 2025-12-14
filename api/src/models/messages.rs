use serde::{Deserialize, Serialize};

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum IncomingMessage {
    #[serde(rename = "chat_message")]
    ChatMessage { content: String },
    #[serde(rename = "request_suggestion")]
    RequestSuggestion { current_input: String },
}

#[derive(Debug, Serialize)]
#[serde(tag = "type")]
pub enum OutgoingMessage {
    #[serde(rename = "suggestion")]
    Suggestion { text: String },
    #[serde(rename = "suggestion_error")]
    SuggestionError { error: String },
}
