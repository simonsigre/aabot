import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

// Configure WebSocket constructor for Neon
// In Docker environments, WebSocket connections might fail due to network restrictions
if (process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV) {
  console.log('[DATABASE] Docker environment detected - disabling WebSocket for compatibility');
  // Don't use WebSocket in Docker to avoid connection issues
  neonConfig.webSocketConstructor = undefined;
} else {
  console.log('[DATABASE] Using WebSocket constructor for Neon');
  neonConfig.webSocketConstructor = ws;
}

// Add connection retry logic for Docker environments
if (process.env.NODE_ENV === 'production') {
  console.log('[DATABASE] Configuring for production environment');
  neonConfig.fetchConnectionCache = true;
}

console.log('[DATABASE] Neon configuration completed');
console.log('[DATABASE] WebSocket constructor available:', !!neonConfig.webSocketConstructor);

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

export const pool = new Pool({ connectionString: process.env.DATABASE_URL });
export const db = drizzle({ client: pool, schema });