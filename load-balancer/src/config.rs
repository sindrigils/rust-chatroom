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
}

#[derive(Clone, Debug)]
pub struct LoadBalancerConfig {
    pub host: String,
    pub port: u16,
    pub backend_servers: Vec<ServerConfig>,
    pub health_check_interval: Duration,
    pub health_check_timeout: Duration,
    pub sticky_cookie_name: String,
    pub sticky_cookie_max_age: u64,
    pub lb_secret: String,
    pub rate_limit_per_second: u64,
    pub rate_limit_burst_size: u32,
}

impl LoadBalancerConfig {
    pub fn from_env() -> Result<Self, Box<dyn std::error::Error>> {
        let host = std::env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());

        let port = std::env::var("PORT")
            .unwrap_or_else(|_| "8080".to_string())
            .parse::<u16>()
            .map_err(|e| format!("Invalid PORT: {e}"))?;

        let server_str = std::env::var("BACKEND_SERVERS").unwrap_or_else(|_| {
            "http://127.0.0.1:8001,http://127.0.0.1:8002,http://127.0.0.1:8003".to_string()
        });

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

        let rate_limit_per_second = std::env::var("RATE_LIMIT_PER_SECOND")
            .unwrap_or_else(|_| "1".to_string())
            .parse::<u64>()?;

        let rate_limit_burst_size = std::env::var("RATE_LIMIT_BURST_SIZE")
            .unwrap_or_else(|_| "100".to_string())
            .parse::<u32>()?;

        Ok(Self {
            host,
            port,
            backend_servers,
            health_check_interval,
            health_check_timeout,
            sticky_cookie_name,
            sticky_cookie_max_age,
            lb_secret,
            rate_limit_per_second,
            rate_limit_burst_size,
        })
    }

    fn parse_backend_servers(
        server_str: &str,
    ) -> Result<Vec<ServerConfig>, Box<dyn std::error::Error>> {
        let mut servers = Vec::new();
        for (index, server) in server_str.split(',').enumerate() {
            let server = server.trim();
            let (host, port) = Self::parse_server_url(server)?;

            servers.push(ServerConfig {
                id: format!("server-{}", index + 1),
                host,
                port,
            });
        }
        Ok(servers)
    }

    fn parse_server_url(server: &str) -> Result<(String, u16), Box<dyn std::error::Error>> {
        if server.contains("://") {
            let url = url::Url::parse(server).map_err(|e| format!("Invalid URL format: {e}"))?;

            let host = url.host_str().ok_or("URL must have a host")?;

            let port = url.port().ok_or("URL must have a port")?;

            Ok((format!("http://{host}"), port))
        } else {
            let parts: Vec<&str> = server.split(':').collect();
            if parts.len() != 2 {
                return Err(format!("Invalid server format: {server}").into());
            }

            let host = parts[0].to_string();
            let port = parts[1]
                .parse::<u16>()
                .map_err(|e| format!("Invalid port: {e}"))?;

            Ok((format!("http://{host}"), port))
        }
    }
}
