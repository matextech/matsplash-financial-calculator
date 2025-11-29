import { Request, Response, NextFunction } from 'express';

// Simple in-memory rate limiter (for production, consider Redis)
interface RateLimitStore {
  [key: string]: { count: number; resetTime: number };
}

const store: RateLimitStore = {};

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 5 * 60 * 1000);

export const rateLimiter = (maxRequests: number = 5, windowMs: number = 15 * 60 * 1000) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Use a more specific key so that one user doesn't block everyone.
    // Prefer identifier/email/phone from body when available, otherwise fall back to IP.
    const identifier =
      (req.body && (req.body.identifier || req.body.email || req.body.phone)) ||
      (req.query && (req.query.identifier as string)) ||
      'unknown-user';

    const ip = req.ip || 'unknown-ip';
    const key = `${ip}:${identifier}`;
    const now = Date.now();
    
    // Get or create rate limit entry
    let entry = store[key];
    
    if (!entry || entry.resetTime < now) {
      // Create new entry or reset expired one
      entry = {
        count: 1,
        resetTime: now + windowMs
      };
      store[key] = entry;
      return next();
    }
    
    // Increment count
    entry.count++;
    
    if (entry.count > maxRequests) {
      return res.status(429).json({
        success: false,
        message: 'Too many requests. Please try again later.'
      });
    }
    
    next();
  };
};

