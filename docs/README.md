# AABot - Apache Answer Slack Integration

A modern Slack bot that provides seamless integration with Apache Answer knowledge bases using Socket Mode architecture.

## Quick Start

1. Set up environment variables:
   - `SLACK_APP_TOKEN` - App-level token starting with `xapp-`
   - `SLACK_BOT_TOKEN` - Bot token starting with `xoxb-`
   - `APACHE_ANSWER_API_URL` - Your Apache Answer instance URL
   - `APACHE_ANSWER_API_KEY` - API key for authentication

2. Run the application:
   ```bash
   npm run dev
   ```

3. Use `/aabot-search <query>` in Slack to search your knowledge base.

## Architecture

- **Frontend**: React + TypeScript with Vite
- **Backend**: Express.js + TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Slack Integration**: Socket Mode using official `@slack/socket-mode` SDK
- **Security**: Production-ready with rate limiting, audit logging, and input sanitisation

## Features

- Real-time knowledge base searching through Slack
- Database logging of all queries and responses
- Web dashboard for analytics and configuration
- Firewall-friendly Socket Mode architecture
- Production-ready security measures

For detailed setup instructions, see `SLACK_SETUP.md`.