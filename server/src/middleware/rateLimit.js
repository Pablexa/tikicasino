// TikiCasino - Rate Limiting Middleware
import rateLimit from 'express-rate-limit';

// General IP rate limiting - Relaxed to 10,000 max requests per minute
export const rateLimitByIp = rateLimit({
  windowMs: 60 * 1000, 
  max: 10000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  keyGenerator: (req) => req.ip,
});

// Strict rate limiting for auth endpoints - Relaxed to 1,000 max requests per minute
export const authRateLimit = rateLimit({
  windowMs: 60 * 1000, 
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again later.' },
  keyGenerator: (req) => req.ip,
});

// Registration rate limiting - Relaxed to 1,000 max registrations per minute
export const registerRateLimit = rateLimit({
  windowMs: 60 * 1000, 
  max: 1000, 
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many accounts created from this IP. Please try again tomorrow.' },
  keyGenerator: (req) => req.ip,
});

// In-memory store for per-account rate limiting
const accountActions = new Map();

export function rateLimitByAccount(userId, action, windowMs = 60000, max = 10) {
  const key = `${userId}:${action}`;
  const now = Date.now();
  
  if (!accountActions.has(key)) {
    accountActions.set(key, []);
  }
  
  const actions = accountActions.get(key).filter(t => now - t < windowMs);
  
  if (actions.length >= max) {
    return false; // Rate limited
  }
  
  actions.push(now);
  accountActions.set(key, actions);
  return true; // Allowed
}

// Clean up old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, times] of accountActions.entries()) {
    const recent = times.filter(t => now - t < 3600000); // Keep last hour
    if (recent.length === 0) {
      accountActions.delete(key);
    } else {
      accountActions.set(key, recent);
    }
  }
}, 5 * 60 * 1000); // Every 5 minutes
