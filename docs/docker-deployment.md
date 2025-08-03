# Docker Deployment Guide

This guide covers deploying AABot using Docker with automatically generated secure credentials.

## Overview

The Docker deployment creates a complete, self-contained AABot environment with:
- PostgreSQL database with randomly generated secure credentials
- AABot application with encrypted configuration storage
- All configuration managed through the web interface
- No dependency on external environment variables

## Quick Start

1. **Clone the repository**:
   ```bash
   git clone <your-repo-url>
   cd aabot
   ```

2. **Run the deployment script**:
   ```bash
   chmod +x docker-deploy.sh
   ./docker-deploy.sh
   ```

That's it! The script will:
- Generate secure random database credentials
- Build and start PostgreSQL and AABot containers
- Initialize the database with proper schema
- Set up encrypted configuration storage

## Deployment Commands

The `docker-deploy.sh` script supports several commands:

```bash
# Full deployment (build + start)
./docker-deploy.sh

# Build services only
./docker-deploy.sh build

# Start existing services
./docker-deploy.sh up

# Stop services
./docker-deploy.sh down

# View logs
./docker-deploy.sh logs

# Clean up everything
./docker-deploy.sh clean
```

## Configuration

### Initial Setup

1. **Access the dashboard**: Navigate to `http://localhost:5000`

2. **Configure Apache Answer**:
   - API URL: Your Apache Answer instance URL
   - API Key: Your Apache Answer API key

3. **Configure Slack Integration**:
   - Bot Token: Your Slack bot token (xoxb-...)
   - App Token: Your Slack app token (xapp-...)
   - Channel ID: Target Slack channel ID
   - Signing Secret: Your Slack app signing secret

All configuration is automatically encrypted and stored in the PostgreSQL database.

### Security Features

- **Random database credentials**: Generated fresh for each deployment
- **AES-256-GCM encryption**: All sensitive configuration encrypted with unique salts
- **Database-only storage**: No environment variables required for application secrets
- **User isolation**: Runs with dedicated non-root user account
- **Health checks**: Built-in container health monitoring

## Database Management

### Database Access

Connect to the PostgreSQL database:
```bash
docker exec -it aabot-postgres psql -U aabot -d aabot
```

### Backup Database

```bash
docker exec aabot-postgres pg_dump -U aabot aabot > aabot-backup.sql
```

### Restore Database

```bash
docker exec -i aabot-postgres psql -U aabot -d aabot < aabot-backup.sql
```

## Monitoring and Logs

### View Application Logs
```bash
docker-compose logs -f aabot
```

### View Database Logs
```bash
docker-compose logs -f postgres
```

### Health Check
```bash
curl http://localhost:5000/api/bot/status
```

## Troubleshooting

### Application Won't Start

1. Check container logs:
   ```bash
   docker logs aabot-app
   ```

2. Verify database connection:
   ```bash
   docker logs aabot-postgres
   ```

3. Ensure port 5000 is available:
   ```bash
   lsof -i :5000
   ```

### Database Connection Issues

1. Verify PostgreSQL is running:
   ```bash
   docker exec aabot-postgres pg_isready -U aabot -d aabot
   ```

2. Check database logs for errors:
   ```bash
   docker logs aabot-postgres
   ```

### Configuration Issues

1. Access the configuration panel at `http://localhost:5000`
2. Verify all required fields are filled
3. Test connections using the status page

## Advanced Configuration

### Custom PostgreSQL Database

To use an external PostgreSQL database instead of the containerized one:

1. Comment out the `postgres` service in `docker-compose.yml`
2. Set the `DATABASE_URL` environment variable to your external database
3. Ensure the database is accessible from the container

### Port Configuration

To change the default port (5000):

1. Edit `docker-compose.yml`:
   ```yaml
   ports:
     - "8080:5000"  # Change 8080 to your desired port
   ```

2. Update the health check URL in deployment scripts

### Resource Limits

Add resource limits to `docker-compose.yml`:

```yaml
services:
  aabot:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: '0.5'
```

## Production Considerations

### Security

- Change default database credentials in production
- Use secrets management for sensitive configuration
- Enable SSL/TLS for database connections
- Run behind a reverse proxy (nginx, traefik)

### Scaling

- Use external PostgreSQL for multi-instance deployments
- Implement proper load balancing
- Configure session affinity if needed

### Monitoring

- Set up log aggregation (ELK stack, Grafana)
- Configure application monitoring (Prometheus)
- Implement alerting for service health

## Migration from Environment Variables

If you're migrating from an environment variable-based deployment:

1. **Run the migration script**:
   ```bash
   npm run migrate-config
   ```

2. **Remove old environment variables**: The configuration is now stored encrypted in the database

3. **Use the web interface**: All future configuration changes should be made through the dashboard

## Support

For issues or questions:

1. Check the application logs for error messages
2. Verify all configuration values in the web interface
3. Test individual service connections using the status page
4. Consult the main README.md for additional troubleshooting