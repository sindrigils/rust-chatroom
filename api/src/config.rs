use std::env;

#[derive(Clone)]
pub struct Settings {
    pub http_port: u16,
    pub jwt_secret: String,
    pub lb_secret: String,
    pub db_url: String,
    pub redis_url: String,
    pub ollama_url: String,
}

impl Default for Settings {
    fn default() -> Self {
        Self::new()
    }
}

impl Settings {
    pub fn new() -> Self {
        let http_port = env::var("HTTP_PORT")
            .unwrap_or_else(|_| "8002".to_string())
            .parse()
            .unwrap_or(8002);

        let jwt_secret =
            env::var("JWT_SECRET").unwrap_or_else(|_| "your-super-secret-jwt-key".to_string());

        let lb_secret = env::var("LB_SECRET").unwrap_or_else(|_| "secret".to_string());
        let db_url = env::var("DATABASE_URL").unwrap_or_else(|_| {
            "postgres://rust_chat:rust_chat@localhost:5434/rust_chat".to_string()
        });
        let redis_url = env::var("REDIS_URL")
            .unwrap_or_else(|_| "redis://:redis_password@localhost:6379/0".to_string());
        let ollama_url =
            env::var("OLLAMA_URL").unwrap_or_else(|_| "http://localhost:11434".to_string());

        Settings {
            http_port,
            jwt_secret,
            lb_secret,
            db_url,
            redis_url,
            ollama_url,
        }
    }
}
