import { randomBytes } from 'crypto';

export function runDockerDiagnostics(): void {
  console.log('=== Docker Environment Diagnostics ===');
  
  // Check environment variables
  console.log('Environment Check:');
  console.log('- NODE_ENV:', process.env.NODE_ENV || 'undefined');
  console.log('- DATABASE_URL present:', !!process.env.DATABASE_URL);
  console.log('- Database URL suffix:', process.env.DATABASE_URL?.slice(-10) || 'undefined');
  
  // Check crypto availability
  console.log('Crypto Check:');
  try {
    const testBytes = randomBytes(16);
    console.log('- randomBytes working:', testBytes.length === 16);
  } catch (error) {
    console.error('- randomBytes failed:', error);
  }
  
  // Check file system permissions
  console.log('File System Check:');
  try {
    const fs = require('fs');
    const testPath = '/tmp/aabot-test';
    fs.writeFileSync(testPath, 'test');
    fs.unlinkSync(testPath);
    console.log('- File system write/read: OK');
  } catch (error) {
    console.error('- File system error:', error);
  }
  
  // Check memory availability
  console.log('Memory Check:');
  const memUsage = process.memoryUsage();
  console.log('- Memory usage (MB):', {
    rss: Math.round(memUsage.rss / 1024 / 1024),
    heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024),
    heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024),
    external: Math.round(memUsage.external / 1024 / 1024)
  });
  
  console.log('=== End Diagnostics ===');
}