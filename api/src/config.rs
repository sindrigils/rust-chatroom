#[derive(Clone)]
pub struct Settings {
    pub http_port: u16,
    pub ws_port: u16,
}

impl Settings {
    pub fn new() -> Self {
        let http_port = std::env::var("HTTP_PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(8002);
        let ws_port = std::env::var("WS_PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(8003);
        Settings { http_port, ws_port }
    }
}
