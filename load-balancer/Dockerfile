
FROM rustlang/rust:nightly-slim as builder

WORKDIR /workspace

# Install build dependencies (add others if needed)
RUN apt-get update && apt-get install -y pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*

# Copy the full workspace (api + load-balancer)
COPY . .

# Build just the load-balancer binary
RUN cargo build -p load-balancer --release

# --- RUNTIME STAGE ---
FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=builder /workspace/target/release/load-balancer /app/load-balancer

EXPOSE 8080 

CMD ["./load-balancer"]
