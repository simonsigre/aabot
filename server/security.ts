import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';

/**
 * Sanitise error messages to prevent information disclosure
 */
export function sanitiseError(error: unknown): string {
  if (error instanceof Error) {
    // Only return safe error messages in production
    if (process.env.NODE_ENV === 'production') {
      // Map known error types to safe messages
      if (error.message.includes('ECONNREFUSED')) {
        return 'Service temporarily unavailable';
      }
      if (error.message.includes('timeout')) {
        return 'Request timeout';
      }
      if (error.message.includes('Unauthorized') || error.message.includes('401')) {
        return 'Authentication required';
      }
      if (error.message.includes('Forbidden') || error.message.includes('403')) {
        return 'Access denied';
      }
      if (error.message.includes('Not Found') || error.message.includes('404')) {
        return 'Resource not found';
      }
      return 'An internal error occurred';
    }
    // In development, return the actual error for debugging
    return error.message;
  }
  return 'Unknown error occurred';
}

/**
 * Sanitise log data to prevent sensitive information exposure
 */
export function sanitiseLogData(data: any): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  const sensitiveFields = [
    'password', 'token', 'key', 'secret', 'credential', 
    'authorization', 'auth', 'slack_bot_token', 'api_key'
  ];

  const sanitised = { ...data };

  for (const field of sensitiveFields) {
    if (field in sanitised) {
      sanitised[field] = '[REDACTED]';
    }
  }

  // Recursively sanitise nested objects
  for (const key in sanitised) {
    if (typeof sanitised[key] === 'object' && sanitised[key] !== null) {
      sanitised[key] = sanitiseLogData(sanitised[key]);
    }
  }

  return sanitised;
}

/**
 * Rate limiting configuration for different endpoints
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1',
});



export const searchRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 20, // Allow more search requests
  message: {
    error: 'Too many search requests. Please wait a moment before searching again.'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => process.env.NODE_ENV === 'development' && req.ip === '127.0.0.1',
});

/**
 * Input validation middleware for query parameters
 */
export function validateSearchQuery(req: Request, res: Response, next: NextFunction) {
  const { q: query, limit } = req.query;

  // Validate query parameter
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Query parameter is required and must be a string' });
  }

  if (query.length > 200) {
    return res.status(400).json({ error: 'Query too long. Maximum 200 characters allowed.' });
  }

  // Validate limit parameter
  if (limit && typeof limit === 'string') {
    const parsedLimit = parseInt(limit, 10);
    if (isNaN(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
      return res.status(400).json({ error: 'Limit must be a number between 1 and 50' });
    }
  }

  next();
}

/**
 * Input validation for voting
 */
export function validateVoteInput(req: Request, res: Response, next: NextFunction) {
  const { questionId, direction } = req.body;

  if (!questionId || typeof questionId !== 'string') {
    return res.status(400).json({ error: 'Question ID is required and must be a string' });
  }

  if (questionId.length > 100) {
    return res.status(400).json({ error: 'Question ID too long' });
  }

  if (!direction || !['up', 'down'].includes(direction)) {
    return res.status(400).json({ error: 'Direction must be either "up" or "down"' });
  }

  next();
}



/**
 * Security headers middleware
 */
export function securityHeaders(req: Request, res: Response, next: NextFunction) {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Enable XSS protection
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Content Security Policy for API endpoints
  if (req.path.startsWith('/api')) {
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none';");
  }

  next();
}

/**
 * Error response helper that ensures consistent, secure error responses
 */
export function createErrorResponse(error: unknown, fallbackMessage: string = 'An error occurred') {
  const sanitisedMessage = sanitiseError(error);
  
  return {
    error: sanitisedMessage,
    timestamp: new Date().toISOString(),
    // In development, include more details
    ...(process.env.NODE_ENV === 'development' && error instanceof Error && {
      details: error.stack
    })
  };
}

/**
 * Audit logging for security events
 */
export function auditLog(event: string, details: any, req?: Request) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    ip: req?.ip || 'unknown',
    userAgent: req?.get('User-Agent') || 'unknown',
    details: sanitiseLogData(details)
  };

  // In production, this should go to a proper logging service
  console.log('[AUDIT]', JSON.stringify(logEntry));
}