#[derive(Clone)]
pub struct Settings {
    pub http_port: u16,
    pub jwt_secret: String,
    pub lb_secret: String,
}

impl Settings {
    pub fn new() -> Self {
        let http_port = std::env::var("HTTP_PORT")
            .unwrap_or_else(|_| "8002".to_string())
            .parse()
            .unwrap_or(8002);

        let jwt_secret =
            std::env::var("JWT_SECRET").unwrap_or_else(|_| "your-super-secret-jwt-key".to_string());

        let lb_secret = std::env::var("LB_SECRET").unwrap_or_else(|_| "secret".to_string());

        Settings {
            http_port,
            jwt_secret,
            lb_secret,
        }
    }
}
