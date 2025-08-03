import { db } from '../db';

export async function performDatabaseHealthCheck(): Promise<boolean> {
  try {
    console.log('[DB_HEALTH] Starting database health check');
    
    // Simple query to test database connectivity
    await db.execute('SELECT 1 as health_check');
    
    console.log('[DB_HEALTH] Database health check passed');
    return true;
  } catch (error) {
    console.error('[DB_HEALTH] Database health check failed:', error);
    console.error('[DB_HEALTH] Error details:', {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    return false;
  }
}

export async function waitForDatabaseReady(maxRetries: number = 10, retryDelay: number = 2000): Promise<boolean> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    console.log(`[DB_HEALTH] Database connection attempt ${attempt}/${maxRetries}`);
    
    const isHealthy = await performDatabaseHealthCheck();
    if (isHealthy) {
      console.log('[DB_HEALTH] Database is ready');
      return true;
    }
    
    if (attempt < maxRetries) {
      console.log(`[DB_HEALTH] Waiting ${retryDelay}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, retryDelay));
    }
  }
  
  console.error('[DB_HEALTH] Database failed to become ready after all attempts');
  return false;
}