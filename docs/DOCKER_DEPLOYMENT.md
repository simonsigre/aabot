# Docker Deployment Guide

AABot includes comprehensive Docker support for production deployment with security hardening and health monitoring.

## Quick Start

```bash
# Set required environment variables
export SLACK_BOT_TOKEN="your-bot-token"
export SLACK_APP_TOKEN="your-app-token"
export DATABASE_URL="your-database-url"
# ... other required variables

# Deploy with one command
./docker-deploy.sh
```

## Deployment Options

### Option 1: Deployment Script (Recommended)

The interactive deployment script provides the easiest deployment experience:

```bash
# Full deployment (build + run)
./docker-deploy.sh

# Build image only
./docker-deploy.sh build

# Run with existing image
./docker-deploy.sh run

# View logs
./docker-deploy.sh logs

# Stop container
./docker-deploy.sh stop

# Clean up resources
./docker-deploy.sh clean
```

### Option 2: Docker Compose

For more complex deployments with multiple services:

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f aabot

# Stop services
docker-compose down
```

### Option 3: Manual Docker Commands

```bash
# Build image
docker build -t aabot:latest .

# Run container
docker run -d \
  --name aabot-container \
  --restart unless-stopped \
  -p 5000:5000 \
  -e DATABASE_URL="your-database-url" \
  -e SLACK_BOT_TOKEN="your-bot-token" \
  -e SLACK_APP_TOKEN="your-app-token" \
  # ... other environment variables
  aabot:latest
```

## Required Environment Variables

See `.env.example` for complete configuration template:

- `DATABASE_URL` - PostgreSQL connection string
- `APACHE_ANSWER_API_URL` - Your Apache Answer instance
- `APACHE_ANSWER_API_KEY` - API key for Apache Answer
- `SLACK_BOT_TOKEN` - Bot User OAuth Token (starts with `xoxb-`)
- `SLACK_APP_TOKEN` - App-Level Token (starts with `xapp-`)
- `SLACK_CHANNEL_ID` - Default channel for notifications
- `SLACK_SIGNING_SECRET` - Slack app signing secret

## Security Features

The Docker deployment includes:

- **Multi-stage builds** for optimised image size
- **Non-root user** for security isolation
- **Health checks** for container monitoring
- **Resource limits** to prevent resource exhaustion
- **Security headers** and hardening

## Monitoring

### Health Checks

The container includes built-in health monitoring:

```bash
# Check container health
docker inspect aabot-container | grep Health -A 10

# View health check logs
docker logs aabot-container | grep HEALTH
```

### Application Logs

```bash
# Follow live logs
docker logs -f aabot-container

# View specific log entries
docker logs aabot-container | grep ERROR
docker logs aabot-container | grep SOCKET
```

## Troubleshooting

### Container Won't Start

1. Check environment variables:
   ```bash
   docker run --rm aabot:latest env | grep SLACK
   ```

2. Review container logs:
   ```bash
   docker logs aabot-container
   ```

### Application Errors

1. Verify Slack connectivity:
   ```bash
   curl http://localhost:5000/api/bot/status
   ```

2. Check database connection:
   ```bash
   docker exec aabot-container node -e "console.log(process.env.DATABASE_URL ? 'DB URL set' : 'Missing DB URL')"
   ```

### Performance Issues

Monitor resource usage:
```bash
# Container resource usage
docker stats aabot-container

# Application metrics
curl http://localhost:5000/api/bot/analytics
```

## Production Considerations

### Database

For production use, consider using a managed PostgreSQL service:
- Neon Database (recommended for Serverless)
- AWS RDS
- Google Cloud SQL
- Azure Database for PostgreSQL

### Scaling

For high-traffic deployments:
- Use container orchestration (Kubernetes, Docker Swarm)
- Implement load balancing
- Consider horizontal scaling with multiple instances

### Security

- Use secrets management for environment variables
- Enable TLS/SSL for all connections
- Regularly update base images
- Implement proper backup strategies