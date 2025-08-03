# Overview

AABot (Apache Answer Bot) is a full-stack web application integrating Apache Answer knowledge bases with Slack. It enables users to search Apache Answer content directly from Slack via slash commands, featuring result voting and analytics. The application includes a React dashboard for real-time configuration, search demonstrations, and analytics visualization. Its core purpose is to streamline access to knowledge base content within team communication workflows, enhancing information retrieval and leveraging Apache Answer's capabilities.

# User Preferences

Preferred communication style: Simple, everyday language in British English.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite.
- **UI Components**: Radix UI primitives and shadcn/ui.
- **Styling**: Tailwind CSS with custom design tokens and Slack brand colors.
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
- **Docker Support**: Multi-stage Docker builds with health checks and security hardening.
- **Deployment**: Automated deployment script with Docker and Docker Compose.
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