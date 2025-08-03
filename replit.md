# Overview

AABot v0.4.0 (Apache Answer Bot) is a production-ready full-stack web application integrating Apache Answer knowledge bases with Slack. It enables users to search Apache Answer content directly from Slack via slash commands, featuring result voting and analytics. The application includes a React dashboard for real-time configuration, search demonstrations, and analytics visualization with fully functional encrypted configuration storage. Its core purpose is to streamline access to knowledge base content within team communication workflows, enhancing information retrieval and leveraging Apache Answer's capabilities.

## Recent Changes (v0.4.0 - August 2025)
- Added bot online/offline control functionality with "Bring Bot Online" and "Take Bot Offline" buttons
- Implemented start/stop API endpoints (/api/bot/start and /api/bot/stop) for WebSocket connection management
- Enhanced SocketModeService with proper cleanup and connection state management
- Fixed button width overflow issues in bot control panel with standardised sizing
- Cleaned up unused migration scripts and test files for better project organisation
- Removed platform-specific references and ensured British English throughout the codebase
- Consolidated documentation structure with proper organisation in /docs folder
- Fixed critical Slack Questions Log bug where commands with 0 results weren't being saved to database
- Resolved Docker deployment issues with proper Alpine Linux shell script compatibility and schema file copying
- Changed Docker deployment port from 5000 to 5004 to avoid development server conflicts
- Enhanced database integration with comprehensive health checks and proper container dependencies
- Fixed Docker configuration save issues with improved error logging and file system compatibility
- Added comprehensive Docker environment diagnostics and debugging capabilities
- Resolved TypeScript import issues in Docker production builds
- Enhanced database connection handling for Docker deployments with proper error handling and timeout configuration
- Added database connectivity pre-checks for configuration update operations
- Implemented Docker-specific WebSocket connection handling to resolve 'wss://postgres/v2' connection errors
- Created comprehensive Docker troubleshooting documentation for database connectivity issues

# User Preferences

Preferred communication style: Simple, everyday language in British English.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Components**: Radix UI primitives and shadcn/ui.
- **Styling**: Tailwind CSS with custom design tokens and Slack brand colours.
- **State Management**: TanStack Query for server state management.
- **Routing**: Wouter for client-side routing.
- **Form Handling**: React Hook Form with Zod validation.

## Backend Architecture
- **Runtime**: Node.js with Express.js framework.
- **Language**: TypeScript with ES modules.
- **API Design**: RESTful API with structured error handling.
- **Request Logging**: Custom middleware for API request/response logging.

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM.
- **Connection**: Neon Database for serverless PostgreSQL.
- **Schema Management**: Drizzle Kit for migrations.
- **Configuration Storage**: Encrypted database storage (AES-256-GCM) for sensitive configuration values, eliminating reliance on environment variables for these.
- **Fallback Storage**: In-memory storage for development/testing.

## Database Schema Design
- **Bot Configuration**: Workspace settings and feature toggles.
- **Search Results**: Cached Apache Answer search results.
- **Analytics**: Usage tracking, search counts, and performance metrics.
- **Slack Commands**: Command history and audit trail.

## External Service Integrations

### Apache Answer Integration
- **Service Class**: ApacheAnswerService for API communication.
- **Search API**: Question search with filtering and pagination.
- **Vote API**: Interactive voting on search results.
- **Content Parsing**: Question metadata extraction and formatting.
- **Authentication**: Supports Authorization header with API key.

### Slack Integration
- **Socket Mode**: Uses `@slack/socket-mode` for WebSocket-based communication, making it firewall-friendly (no incoming webhooks).
- **Web API**: Official Slack Web API client (`@slack/web-api`) for sending messages.
- **Message Formatting**: Rich message blocks with interactive buttons.
- **Slash Commands**: Custom command handling via Socket Mode events.
- **Token Management**: Secure app-level and bot token storage.

## Development and Build Pipeline
- **Docker Support**: Self-contained multi-stage Docker builds with automatic credential generation and health checks.
- **Zero-Config Deployment**: Automated deployment script with Docker Compose requiring no environment variables.
- **Random Security**: Automatic generation of secure 32-character database passwords using OpenSSL.
- **Database Integration**: PostgreSQL container with persistent volumes and automatic schema initialization.
- **Type Safety**: Shared TypeScript types between client and server.

## Performance and Scalability
- **Caching Strategy**: React Query for client-side caching and Drizzle for query optimization.
- **Bundle Optimization**: Tree-shaking and code splitting via Vite.
- **Database Indexing**: PostgreSQL indexes on frequently queried fields.

# External Dependencies

## Core Framework Dependencies
- `@neondatabase/serverless`: Serverless PostgreSQL driver.
- `drizzle-orm`: Type-safe SQL ORM.
- `drizzle-zod`: Drizzle and Zod integration.
- `express`: Node.js web application framework.
- `react`: Frontend UI library.
- `@tanstack/react-query`: Server state management.

## UI and Styling
- `@radix-ui/*`: UI primitives.
- `tailwindcss`: Utility-first CSS framework.
- `class-variance-authority`: Component styling.
- `lucide-react`: Icon library.

## Development Tools
- `vite`: Fast build tool and development server.
- `typescript`: Static type checking.
- `tsx`: TypeScript execution environment.
- `esbuild`: JavaScript bundler.

## Third-Party Services
- `@slack/web-api`: Official Slack Web API client.
- `connect-pg-simple`: PostgreSQL session store.
- `wouter`: Lightweight routing library.
- `react-hook-form`: Forms library.

## Utilities and Helpers
- `date-fns`: Date utility library.
- `clsx`: Utility for className strings.
- `nanoid`: Unique string ID generator.
- `zod`: Schema validation library.