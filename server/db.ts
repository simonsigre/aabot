import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure database connection based on environment
if (process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV) {
  console.log('[DATABASE] Docker environment detected - using HTTP connection mode');
  // In Docker, disable WebSocket entirely and use HTTP mode
  neonConfig.webSocketConstructor = undefined;
  // Additional Docker-specific configurations
  (neonConfig as any).pipelineConnect = false;
  (neonConfig as any).useSecureWebSocket = false;
  (neonConfig as any).forceDisablePgBouncer = true;
} else {
  console.log('[DATABASE] Development environment - using WebSocket connection');
  neonConfig.webSocketConstructor = ws;
}

// Add connection configuration
if (process.env.NODE_ENV === 'production') {
  console.log('[DATABASE] Configuring for production environment');
  neonConfig.fetchConnectionCache = true;
}

console.log('[DATABASE] Neon configuration completed');
console.log('[DATABASE] WebSocket constructor:', !!neonConfig.webSocketConstructor ? 'enabled' : 'disabled');

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });