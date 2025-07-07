use std::time::Duration;

use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ServerConfig {
    pub id: String,
    pub host: String,
    pub port: u16,
}

impl ServerConfig {
    pub fn address(&self) -> String {
        format!("{}:{}", self.host, self.port)
    }

    pub fn health_check(&self) -> String {
        format!("http://{}/health", self.address())
    }
}

#[derive(Clone, Debug)]
pub struct LoadBalancerConfig {
    pub lb_port: u16,
    pub backend_servers: Vec<ServerConfig>,
    pub health_check_interval: Duration,
    pub health_check_timeout: Duration,
    pub sticky_cookie_name: String,
    pub sticky_cookie_max_age: u64,
    pub lb_secret: String,
}

impl LoadBalancerConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let lb_port = std::env::var("LB_PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .map_err(|e| format!("Invalid LB_PORT: {}", e))?;

        let server_str = std::env::var("BACKEND_SERVERS")
            .unwrap_or_else(|_| "127.0.0.1:8001,127.0.0.1:8002,127.0.0.1:8003".to_string());

        let backend_servers = Self::parse_backend_servers(&server_str)?;

        let health_check_interval = Duration::from_secs(
            std::env::var("HEALTH_CHECK_INTERVAL")
                .unwrap_or_else(|_| "10".to_string())
                .parse::<u64>()?,
        );

        let health_check_timeout = Duration::from_secs(
            std::env::var("HEALTH_CHECK_TIMEOUT")
                .unwrap_or_else(|_| "5".to_string())
                .parse::<u64>()?,
        );

        let sticky_cookie_name =
            std::env::var("STICKY_COOKIE_NAME").unwrap_or_else(|_| "lb_server_id".to_string());

        let sticky_cookie_max_age = std::env::var("STICKY_COOKIE_MAX_AGE")
            .unwrap_or_else(|_| "86400".to_string())
            .parse::<u64>()?;

        let lb_secret = std::env::var("LB_SECRET").unwrap_or_else(|_| "secret".to_string());

        Ok(Self {
            lb_port,
            backend_servers,
            health_check_interval,
            health_check_timeout,
            sticky_cookie_name,
            sticky_cookie_max_age,
            lb_secret,
        })
    }

    fn parse_backend_servers(
        server_str: &str,
    ) -> Result<Vec<ServerConfig>, Box<dyn std::error::Error>> {
        let mut servers = Vec::new();
        for (index, server) in server_str.split(',').enumerate() {
            let parts: Vec<&str> = server.split(':').collect();
            if parts.len() != 2 {
                return Err(format!("Invalid server format: {}", server).into());
            }
            servers.push(ServerConfig {
                id: format!("server-{}", index + 1),
                host: parts[0].to_string(),
                port: parts[1]
                    .parse::<u16>()
                    .map_err(|e| format!("Invalid port: {}", e))?,
            });
        }
        Ok(servers)
    }
}
