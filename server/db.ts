import { Pool as PgPool } from 'pg';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Initialize database connection based on environment
let pool: any;
let db: any;

if (process.env.NODE_ENV === 'production' && process.env.DOCKER_ENV) {
  console.log('[DATABASE] Docker environment detected - using standard PostgreSQL driver');
  
  // Create PostgreSQL connection for Docker
  pool = new PgPool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: false // No SSL needed for local Docker PostgreSQL
  });
  db = drizzlePg(pool, { schema });
  
  console.log('[DATABASE] Standard PostgreSQL driver configured for Docker');
} else {
  console.log('[DATABASE] Development environment - using Neon serverless driver');
  
  // Configure WebSocket for Neon
  neonConfig.webSocketConstructor = ws;
  neonConfig.fetchConnectionCache = true;
  
  // Create Neon connection for development/cloud
  pool = new NeonPool({ connectionString: process.env.DATABASE_URL });
  db = drizzleNeon({ client: pool, schema });
  
  console.log('[DATABASE] Neon serverless driver configured');
}

export { pool, db };