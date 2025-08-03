
FROM rustlang/rust:nightly-slim as builder

WORKDIR /workspace

# Install build dependencies for SeaORM (OpenSSL, etc.)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy the full workspace (api + load-balancer), but NOT /ui
COPY . .

RUN cargo build -p api --release

# --- RUNTIME STAGE ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /workspace/target/release/api /app/api

EXPOSE 8001

CMD ["./api"]
