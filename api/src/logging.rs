use std::sync::Arc;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub fn init_logging() -> Arc<tracing_appender::non_blocking::WorkerGuard> {
    // Create logs directory if it doesn't exist
    std::fs::create_dir_all("logs").unwrap_or_else(|e| {
        eprintln!("Failed to create logs directory: {}", e);
    });

    // Create a simple file appender with .log extension
    let log_file = std::fs::OpenOptions::new()
        .create(true)
        .append(true)
        .open("logs/api.log")
        .expect("Failed to create log file");

    let (non_blocking_file, guard) = tracing_appender::non_blocking(log_file);
    let guard = Arc::new(guard);

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "api=debug,tower_http=debug,info".into()),
        )
        // File logging layer
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(non_blocking_file)
                .with_ansi(false), // Disable colors in file logs
        )
        // Console logging layer
        .with(
            tracing_subscriber::fmt::layer()
                .with_writer(std::io::stdout)
                .with_ansi(true), // Keep colors in console
        )
        .init();

    guard
}
