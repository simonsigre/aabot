# Docker Deployment Troubleshooting Guide

## Database Connection Issues

### Problem: `ECONNREFUSED 172.25.0.2:443` on `wss://postgres/v2`

This error occurs when the Neon database connection fails in Docker environment. The application is trying to connect to PostgreSQL through WebSocket but cannot reach the database server.

### Root Causes:
1. **Network Configuration**: Docker container cannot reach external database
2. **Database URL Format**: Incorrect connection string format for Docker environment
3. **WebSocket Connection**: Neon WebSocket connection blocked by firewall/network

### Solutions:

#### 1. Verify Database Connection String
```bash
# In Docker container, check environment variables
echo $DATABASE_URL
# Should be: postgresql://[user]:[password]@[host]:[port]/[database]
```

#### 2. Test Database Connectivity
```bash
# From within Docker container
nslookup [database-host]
telnet [database-host] 5432
```

#### 3. Network Configuration
- Ensure Docker container has outbound network access
- Check if firewall is blocking WebSocket connections on port 443
- Verify Neon database allows connections from Docker IP ranges

#### 4. Alternative Connection Methods
The application now automatically detects Docker environment and disables WebSocket:
- When `DOCKER_ENV=true` is set, WebSocket connections are disabled
- This prevents the `wss://postgres/v2` connection errors
- Standard TCP connections are used instead for better Docker compatibility

### Error Logs to Check:
- `[DB_HEALTH] Database health check failed`
- `connect ECONNREFUSED 172.25.0.2:443`
- `[STARTUP] Database connection failed`

### Configuration Save Errors (500 Response)
When database connection fails, configuration save operations return 500 errors because:
1. Database health check fails during API calls
2. Encryption/decryption operations cannot access database
3. Storage operations timeout due to connection issues

### Resolution Steps:
1. **Automatic Fix**: The application now detects Docker environment (`DOCKER_ENV=true`) and disables WebSocket automatically
2. **Manual Override**: If issues persist, check that `DOCKER_ENV=true` is set in Docker environment
3. **Connection Testing**: Use the enhanced database health checks to verify connectivity
4. **Monitor Logs**: Check for `[DATABASE] Docker environment detected - disabling WebSocket for compatibility`

### Expected Behavior in Docker:
- Application should show: `[DATABASE] Docker environment detected - disabling WebSocket for compatibility`
- Database connections should use TCP instead of WebSocket
- Configuration save operations should return 200 responses instead of 500 errors
- No more `connect ECONNREFUSED 172.25.0.2:443` errors on WebSocket connections