#[derive(Clone)]
pub struct Settings {
    pub http_port: u16,
    pub jwt_secret: String,
}

impl Settings {
    pub fn new() -> Self {
        let http_port = std::env::var("HTTP_PORT")
            .ok()
            .and_then(|s| s.parse().ok())
            .unwrap_or(8002);
        let jwt_secret = std::env::var("JWT_SECRET").expect("no JWT_SECRET found in environment");
        Settings {
            http_port,
            jwt_secret,
        }
    }
}
