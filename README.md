# AABot - Apache Answer Slack Integration

A sophisticated Slack bot that provides seamless integration with Apache Answer knowledge bases, enabling teams to search and interact with content directly from Slack channels.

## 🚀 Quick Start with Docker

The easiest way to deploy AABot is using Docker with automatic setup:

```bash
# Clone and enter the repository
git clone <your-repo-url>
cd aabot

# Deploy with Docker (no configuration needed!)
./docker-deploy.sh
```

This will:
- Generate secure random database credentials
- Start PostgreSQL and AABot containers
- Create encrypted configuration storage
- Set up the web interface at http://localhost:5004

## 📋 Configuration

AABot uses **encrypted database storage** for all configuration. No environment variables are required for Docker deployment!

### Web Interface Configuration
After deployment, configure AABot through the web dashboard:

1. **Navigate to** http://localhost:5004
2. **Configure Apache Answer**:
   - API URL: Your Apache Answer instance URL
   - API Key: Your Apache Answer API key
3. **Configure Slack Integration**:
   - Bot Token: Your Slack bot token (xoxb-...)
   - App Token: Your Slack app token (xapp-...)
   - Channel ID: Target Slack channel ID
   - Signing Secret: Your Slack app signing secret

All values are automatically encrypted with AES-256-GCM and stored securely in PostgreSQL.

## 🛠️ Development Setup

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Push database schema
npm run db:push

# Start development server
npm run dev
```

## 🐳 Docker Deployment

AABot includes **zero-configuration Docker deployment** with randomly generated secure credentials:

### Deployment Commands

```bash
# Full deployment (build + run)
./docker-deploy.sh

# Build services only
./docker-deploy.sh build

# Start existing services
./docker-deploy.sh up

# Stop services
./docker-deploy.sh down

# View logs
./docker-deploy.sh logs

# Stop container
./docker-deploy.sh stop

# Clean up resources
./docker-deploy.sh clean
```

### Using Docker Compose

```bash
# Start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

## 🔧 Features

- **Socket Mode Integration**: Firewall-friendly WebSocket connection to Slack
- **Real-time Search**: Instant Apache Answer search results in Slack
- **Interactive Voting**: Users can vote on search results for improved relevance
- **Web Dashboard**: Configuration management and analytics interface
- **Comprehensive Logging**: Full audit trail of user interactions
- **Security Hardened**: Rate limiting, input validation, and security headers

## 📊 Dashboard

Access the web dashboard at `http://localhost:5000` to:
- Monitor bot status and connectivity
- View search analytics and usage statistics
- Configure bot settings
- Review question logs from Slack interactions

## 🔐 Security Features

- Rate limiting on API endpoints
- Input validation and sanitisation
- Security headers (CSP, HSTS, etc.)
- Audit logging for all operations
- Environment variable configuration

## 📝 Slack Commands

- `/aabot-search <query>` - Search Apache Answer content
- Interactive vote buttons on search results
- Real-time status updates

## 🏗️ Architecture

- **Frontend**: React with TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js Express with TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Integration**: Slack Socket Mode API
- **Build**: Vite for frontend, esbuild for backend

## 📖 Documentation

- [Slack Setup Guide](docs/SLACK_SETUP.md)
- [Security Review](docs/SECURITY_REVIEW.md)
- [Socket Mode Success](docs/SOCKET_MODE_SUCCESS.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with British English spelling in documentation
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details

## 🆘 Support

For issues and support:
1. Check the documentation in the `docs/` folder
2. Review container logs: `docker logs aabot-container`
3. Verify environment variables are correctly set
4. Ensure Slack app permissions are properly configured