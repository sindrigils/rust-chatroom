#!/bin/bash

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Chat App Development Setup${NC}"
echo "==============================="

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo -e "${RED}❌ Docker is not running. Please start Docker and try again.${NC}"
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose > /dev/null 2>&1; then
    echo -e "${RED}❌ docker-compose is not installed. Please install it and try again.${NC}"
    exit 1
fi

# Check if Rust is installed
if ! command -v cargo > /dev/null 2>&1; then
    echo -e "${RED}❌ Rust is not installed. Please install Rust from https://rustup.rs/${NC}"
    exit 1
fi

# Check if Node.js is installed
if ! command -v npm > /dev/null 2>&1; then
    echo -e "${RED}❌ Node.js is not installed. Please install Node.js from https://nodejs.org/${NC}"
    exit 1
fi

echo ""
echo -e "${YELLOW}📝 Configuration${NC}"

# Ask how many backend servers
while true; do
    read -p "How many backend server instances do you want to run? (1-10): " num_servers
    if [[ "$num_servers" =~ ^[1-9]$|^10$ ]]; then
        break
    else
        echo -e "${RED}Please enter a number between 1 and 10.${NC}"
    fi
done

echo -e "${GREEN}✅ Will start $num_servers backend server(s)${NC}"

# Generate backend server URLs for LB config
backend_servers=""
for i in $(seq 1 $num_servers); do
    port=$((8000 + i))
    if [ $i -eq 1 ]; then
        backend_servers="http://127.0.0.1:$port"
    else
        backend_servers="$backend_servers,http://127.0.0.1:$port"
    fi
done

echo ""
echo -e "${YELLOW}🔧 Setting up environment files...${NC}"

# Create load balancer .env file
cat > load-balancer/.env << EOF
HOST=127.0.0.1
PORT=8080
BACKEND_SERVERS=$backend_servers
ALLOWED_ORIGIN=http://127.0.0.1:3000

# Health Check Settings
HEALTH_CHECK_INTERVAL=10
HEALTH_CHECK_TIMEOUT=5

# Sticky Session Settings
STICKY_COOKIE_NAME=lb_server_id
STICKY_COOKIE_MAX_AGE=86400

# Logging
RUST_LOG=load_balancer=debug,tower_http=debug,info

# LB Secret
LB_SECRET=dev-secret-key-12345

TLS_ENABLED=false
EOF

# Create API .env file template
cat > api/.env << EOF
DATABASE_URL=postgres://rust_chat:rust_chat@localhost:5434/rust_chat
REDIS_URL=redis://:redis_password@localhost:6379/0
JWT_SECRET=ECHWb4P4lWvw/7is2FpAD9O2W1LvDQdsCj3e5vB669xBngJ4j6795y3dOOiiInolyiJTENQ5EyRgxMNNl/ToDg==
DOMAIN=http://127.0.0.1:3000
LB_SECRET=dev-secret-key-12345
HTTP_PORT=8001
EOF

echo -e "${GREEN}✅ Environment files created${NC}"

echo ""
echo -e "${YELLOW}🐳 Starting databases (PostgreSQL + Redis)...${NC}"

# Start only databases with docker-compose
docker-compose up -d postgres redis

echo -e "${GREEN}✅ Databases started${NC}"

echo ""
echo -e "${YELLOW}⏳ Waiting for databases to be ready...${NC}"

# Wait for PostgreSQL
echo -n "Waiting for PostgreSQL"
until docker exec chat-postgres pg_isready -U rust_chat -d rust_chat > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✅${NC}"

# Wait for Redis
echo -n "Waiting for Redis"
until docker exec chat-redis redis-cli -a redis_password ping > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✅${NC}"

echo ""
echo -e "${YELLOW}🗄️ Running database migrations...${NC}"

# Run migration using docker-compose
docker-compose up db-migrate

echo -e "${GREEN}✅ Database migrations completed${NC}"

echo ""
echo -e "${YELLOW}🔨 Building Docker images...${NC}"

# Build API image
echo "Building API Docker image..."
docker build -t chat-api -f ./api/Dockerfile .

# Build Load Balancer image
echo "Building Load Balancer Docker image..."
docker build -t chat-lb -f ./load-balancer/Dockerfile .

echo -e "${GREEN}✅ Docker images built${NC}"

echo ""
echo -e "${YELLOW}📦 Installing frontend dependencies...${NC}"

# Install frontend dependencies
cd ui
npm install
cd ..

echo -e "${GREEN}✅ Frontend dependencies installed${NC}"

echo ""
echo -e "${YELLOW}🚀 Starting all services...${NC}"

# Function to cleanup processes on exit
cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down services...${NC}"
    
    # Stop Docker containers
    for i in $(seq 1 $num_servers); do
        port=$((8000 + i))
        docker stop "chat-api-$port" 2>/dev/null || true
        docker rm "chat-api-$port" 2>/dev/null || true
    done
    
    docker stop "chat-lb" 2>/dev/null || true
    docker rm "chat-lb" 2>/dev/null || true
    
    # Kill frontend process
    if [ -f frontend.pid ]; then
        kill $(cat frontend.pid) 2>/dev/null || true
        rm frontend.pid
    fi
    
    # Stop Docker compose
    docker-compose down
    
    echo -e "${GREEN}✅ All services stopped${NC}"
    exit 0
}

# Trap Ctrl+C and cleanup
trap cleanup SIGINT SIGTERM

# Start backend servers in background
echo "Starting $num_servers backend server(s)..."
for i in $(seq 1 $num_servers); do
    port=$((8000 + i))
    echo "  🔧 Starting API server on port $port..."
    
    # Start API server using Docker
    docker run -d \
        --name "chat-api-$port" \
        --network host \
        -e DATABASE_URL="postgres://rust_chat:rust_chat@localhost:5434/rust_chat" \
        -e REDIS_URL="redis://:redis_password@localhost:6379/0" \
        -e JWT_SECRET="ECHWb4P4lWvw/7is2FpAD9O2W1LvDQdsCj3e5vB669xBngJ4j6795y3dOOiiInolyiJTENQ5EyRgxMNNl/ToDg==" \
        -e DOMAIN="http://127.0.0.1:3000" \
        -e LB_SECRET="dev-secret-key-12345" \
        -e HTTP_PORT="$port" \
        chat-api
    
    sleep 1
done

# Start load balancer in background
echo "  ⚖️ Starting Load Balancer on port 8080..."
mkdir -p logs
docker run -d \
    --name "chat-lb" \
    --network host \
    --env-file load-balancer/.env \
    chat-lb

# Wait a moment for load balancer to start
sleep 2

# Start frontend in background
echo "  🎨 Starting Frontend on port 3000..."
(cd ui && npm run dev) > logs/frontend.log 2>&1 &
echo $! > frontend.pid

echo ""
echo -e "${GREEN}🎉 All services are starting up!${NC}"
echo ""
echo -e "${BLUE}📱 Your chat app will be available at:${NC}"
echo -e "   Frontend: ${GREEN}http://127.0.0.1:3000${NC}"
echo -e "   Load Balancer: ${GREEN}http://127.0.0.1:8080${NC}"
echo -e "   API Health: ${GREEN}http://127.0.0.1:8080/health${NC}"
echo ""
echo -e "${BLUE}📊 Backend servers running on:${NC}"
for i in $(seq 1 $num_servers); do
    port=$((8000 + i))
    echo -e "   API Server $i: ${GREEN}http://127.0.0.1:$port${NC}"
done
echo ""
echo -e "${BLUE}📋 Databases:${NC}"
echo -e "   PostgreSQL: ${GREEN}localhost:5434${NC}"
echo -e "   Redis: ${GREEN}localhost:6379${NC}"
echo ""
echo -e "${YELLOW}📝 Logs are being written to the logs/ directory${NC}"
echo -e "${YELLOW}🛑 Press Ctrl+C to stop all services${NC}"
echo ""

# Create logs directory
mkdir -p logs

# Wait for frontend to be ready
echo -n "Waiting for frontend to start"
until curl -s http://127.0.0.1:3000 > /dev/null 2>&1; do
    echo -n "."
    sleep 1
done
echo -e " ${GREEN}✅${NC}"

echo ""
echo -e "${GREEN}🚀 Chat app is ready! Open http://127.0.0.1:3000 in your browser${NC}"
echo ""

# Keep script running and show logs
tail -f logs/load-balancer.log &
wait