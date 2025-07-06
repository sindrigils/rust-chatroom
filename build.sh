#!/bin/bash

# Build script for Chat App Docker setup

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Chat App Docker Build & Deploy Script${NC}"
echo "==========================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    print_error "docker-compose is not installed. Please install it and try again."
    exit 1
fi

# Function to build and run the application
build_and_run() {
    print_status "Building Docker images..."
    docker-compose build --no-cache

    print_status "Starting services..."
    docker-compose up -d

    print_status "Waiting for services to be ready..."
    sleep 10

    print_status "Checking service health..."
    docker-compose ps

    echo ""
    print_status "🎉 Chat app is running!"
    echo "📱 Application: http://localhost:3000"
    echo "📊 HAProxy Stats: http://localhost:8404/stats"
    echo "🗄️  PostgreSQL: localhost:5432"
    echo "🔴 Redis: localhost:6379"
    echo ""
    print_status "To view logs: docker-compose logs -f"
    print_status "To stop: docker-compose down"
}

# Function to scale the application
scale_app() {
    local instances=${1:-3}
    print_status "Scaling chat app to $instances instances..."
    
    # Update docker-compose.yml to uncomment additional instances
    print_warning "Please uncomment chat-app-2 and chat-app-3 services in docker-compose.yml"
    print_warning "and the corresponding servers in haproxy.cfg for full scaling"
    
    docker-compose up -d --scale chat-app=$instances
    
    print_status "Application scaled to $instances instances"
    print_status "Check HAProxy stats at http://localhost:8404/stats"
}

# Function to show logs
show_logs() {
    docker-compose logs -f --tail=100
}

# Function to stop services
stop_services() {
    print_status "Stopping services..."
    docker-compose down
    print_status "Services stopped"
}

# Function to clean up everything
cleanup() {
    print_status "Cleaning up Docker resources..."
    docker-compose down -v --remove-orphans
    docker system prune -f
    print_status "Cleanup complete"
}

# Function to run database migrations (if you have them)
run_migrations() {
    print_status "Running database migrations..."
    docker-compose exec chat-app ./chat-app migrate
    print_status "Migrations complete"
}

# Main menu
case "${1:-help}" in
    "build"|"start")
        build_and_run
        ;;
    "scale")
        scale_app $2
        ;;
    "logs")
        show_logs
        ;;
    "stop")
        stop_services
        ;;
    "clean")
        cleanup
        ;;
    "migrate")
        run_migrations
        ;;
    "restart")
        stop_services
        build_and_run
        ;;
    "help"|*)
        echo "Usage: $0 {build|start|scale|logs|stop|clean|migrate|restart|help}"
        echo ""
        echo "Commands:"
        echo "  build/start  - Build and start all services"
        echo "  scale [n]    - Scale chat app to n instances (default: 3)"
        echo "  logs         - Show application logs"
        echo "  stop         - Stop all services"
        echo "  clean        - Stop services and clean up volumes"
        echo "  migrate      - Run database migrations"
        echo "  restart      - Stop and restart all services"
        echo "  help         - Show this help message"
        ;;
esac