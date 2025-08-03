# syntax=docker/dockerfile:1
FROM rustlang/rust:nightly-slim as builder

WORKDIR /workspace

# Install build dependencies for SeaORM (OpenSSL, etc.)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better caching
COPY Cargo.toml Cargo.lock ./
COPY api/Cargo.toml ./api/
COPY load-balancer/Cargo.toml ./load-balancer/
COPY api/migration/Cargo.toml ./api/migration/

# Create dummy main files to build dependencies
RUN mkdir -p api/src load-balancer/src api/migration/src
RUN echo "fn main() {}" > api/src/main.rs
RUN echo "fn main() {}" > load-balancer/src/main.rs  
RUN echo "fn main() {}" > api/migration/src/main.rs
RUN echo "pub fn add(left: u64, right: u64) -> u64 { left + right }" > api/src/lib.rs
RUN echo "pub fn add(left: u64, right: u64) -> u64 { left + right }" > api/migration/src/lib.rs

# Build dependencies (cached layer)
RUN cargo build -p api --release
RUN cargo build -p migration --release

# Remove dummy files and copy real source
RUN rm -rf api/src load-balancer/src api/migration/src
COPY . .

# Build actual application (only rebuilds when source changes)
RUN cargo build -p api --release
RUN cargo build -p migration --release

# --- RUNTIME STAGE ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 wget && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /workspace/target/release/api /app/api
COPY --from=builder /workspace/target/release/migration /app/migration

EXPOSE 8001

CMD ["./migration"]