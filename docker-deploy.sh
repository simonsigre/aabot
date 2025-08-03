#!/bin/bash

# AABot Docker Deployment Script
# This script builds and deploys AABot locally using Docker

set -e

echo "🚀 AABot Docker Deployment Script"
echo "=================================="

# Configuration
IMAGE_NAME="aabot"
TAG="latest"
CONTAINER_NAME="aabot-container"
PORT="5000"

# Function to print coloured output
print_status() {
    echo -e "\033[1;34m[INFO]\033[0m $1"
}

print_success() {
    echo -e "\033[1;32m[SUCCESS]\033[0m $1"
}

print_error() {
    echo -e "\033[1;31m[ERROR]\033[0m $1"
}

print_warning() {
    echo -e "\033[1;33m[WARNING]\033[0m $1"
}

# Check if Docker is installed and running
check_docker() {
    print_status "Checking Docker installation..."
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        echo "Visit: https://docs.docker.com/get-docker/"
        exit 1
    fi

    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker."
        exit 1
    fi

    print_success "Docker is installed and running"
}

# Generate random database password
generate_database_password() {
    print_status "Generating secure database password..."
    
    # Generate a random 32-character password
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    export POSTGRES_PASSWORD
    
    print_success "Database password generated securely"
}

# Check if Docker Compose is available
check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker-compose"
    elif docker compose version &> /dev/null; then
        DOCKER_COMPOSE_CMD="docker compose"
    else
        print_error "Docker Compose is not available. Please install Docker Compose."
        echo "Visit: https://docs.docker.com/compose/install/"
        exit 1
    fi
    
    print_success "Docker Compose is available: $DOCKER_COMPOSE_CMD"
}

# Stop and remove existing containers
cleanup_existing() {
    print_status "Cleaning up existing containers..."
    
    $DOCKER_COMPOSE_CMD down --remove-orphans
    
    print_success "Cleanup completed"
}

# Build and start services
build_and_run() {
    print_status "Building and starting AABot services..."
    
    # Build and start all services
    $DOCKER_COMPOSE_CMD up -d --build
    
    print_success "AABot services started successfully"
}

# Wait for database to be ready
wait_for_database() {
    print_status "Waiting for database to be ready..."
    
    for i in {1..30}; do
        if docker exec aabot-postgres pg_isready -U aabot -d aabot > /dev/null 2>&1; then
            print_success "Database is ready"
            return 0
        fi
        
        if [[ $i -eq 30 ]]; then
            print_error "Database failed to start within 30 seconds"
            print_status "Database logs:"
            docker logs aabot-postgres
            exit 1
        fi
        
        sleep 1
    done
}

# Check application health
check_health() {
    print_status "Checking application health..."
    
    # Check if containers are running
    if ! docker ps | grep -q aabot-app; then
        print_error "AABot container is not running!"
        print_status "Container logs:"
        docker logs aabot-app
        exit 1
    fi
    
    # Check application health endpoint
    print_status "Waiting for application to start..."
    for i in {1..60}; do
        if curl -s http://localhost:$PORT/api/bot/status > /dev/null; then
            print_success "Application is healthy and responding"
            return 0
        fi
        
        if [[ $i -eq 60 ]]; then
            print_error "Application failed to start within 60 seconds"
            print_status "AABot logs:"
            docker logs aabot-app
            print_status "PostgreSQL logs:"
            docker logs aabot-postgres
            exit 1
        fi
        
        sleep 1
    done
}

# Display deployment information
show_info() {
    print_success "AABot deployment completed successfully!"
    echo ""
    echo "Services Running:"
    echo "  AABot Application: aabot-app"
    echo "  PostgreSQL Database: aabot-postgres"
    echo "  Port: $PORT"
    echo ""
    echo "Database Information:"
    echo "  Database: aabot"
    echo "  Username: aabot"
    echo "  Password: [randomly generated]"
    echo ""
    echo "Useful Commands:"
    echo "  View logs: $DOCKER_COMPOSE_CMD logs -f"
    echo "  Stop: $DOCKER_COMPOSE_CMD down"
    echo "  Start: $DOCKER_COMPOSE_CMD up -d"
    echo "  Remove: $DOCKER_COMPOSE_CMD down -v"
    echo ""
    echo "Application URLs:"
    echo "  Dashboard: http://localhost:$PORT"
    echo "  Health Check: http://localhost:$PORT/api/bot/status"
    echo ""
    echo "Configuration:"
    echo "  All configuration is stored encrypted in the database"
    echo "  Use the web interface to set up Apache Answer and Slack integration"
    echo "  Navigate to the configuration panel in the dashboard"
    echo ""
    print_success "AABot is now running in Docker with secure random database credentials!"
}

# Main deployment flow
main() {
    echo ""
    check_docker
    check_docker_compose
    generate_database_password
    cleanup_existing
    build_and_run
    wait_for_database
    check_health
    show_info
}

# Handle script arguments
case "$1" in
    "build")
        print_status "Building Docker services only..."
        check_docker
        check_docker_compose
        generate_database_password
        $DOCKER_COMPOSE_CMD build
        print_success "Docker services built successfully"
        ;;
    "up")
        print_status "Starting existing services..."
        check_docker
        check_docker_compose
        generate_database_password
        $DOCKER_COMPOSE_CMD up -d
        wait_for_database
        check_health
        show_info
        ;;
    "down")
        print_status "Stopping AABot services..."
        check_docker_compose
        $DOCKER_COMPOSE_CMD down
        print_success "Services stopped"
        ;;
    "logs")
        print_status "Showing service logs..."
        check_docker_compose
        $DOCKER_COMPOSE_CMD logs -f
        ;;
    "clean")
        print_status "Cleaning up Docker resources..."
        check_docker_compose
        $DOCKER_COMPOSE_CMD down -v --rmi all --remove-orphans 2>/dev/null || true
        print_success "Cleanup completed"
        ;;
    "")
        main
        ;;
    *)
        echo "Usage: $0 [build|up|down|logs|clean]"
        echo ""
        echo "Commands:"
        echo "  build   - Build Docker services only"
        echo "  up      - Start services with existing images"
        echo "  down    - Stop all services"
        echo "  logs    - Show service logs"
        echo "  clean   - Remove all containers, images, and volumes"
        echo "  (none)  - Full deployment (build + up)"
        exit 1
        ;;
esac