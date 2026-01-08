import { NextRequest, NextResponse } from 'next/server';

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// In-memory storage for rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Rate limit configuration
 */
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  keyGenerator?: (req: NextRequest) => string;
}

/**
 * Default key generator using IP address
 */
function getDefaultKey(req: NextRequest): string {
  const ip = req.headers.get('x-forwarded-for') ||
             req.headers.get('x-real-ip') ||
             'unknown';
  return `rate-limit:${ip}`;
}

/**
 * Rate limiter middleware
 * @param config - Rate limit configuration
 * @returns Middleware function
 */
export function rateLimit(config: RateLimitConfig) {
  const { maxRequests, windowMs, keyGenerator = getDefaultKey } = config;

  return async (req: NextRequest): Promise<NextResponse | null> => {
    const key = keyGenerator(req);
    const now = Date.now();

    const entry = rateLimitStore.get(key);

    if (!entry || entry.resetTime < now) {
      // New window
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
      });
      return null; // Allow request
    }

    if (entry.count >= maxRequests) {
      // Rate limit exceeded
      const retryAfter = Math.ceil((entry.resetTime - now) / 1000);

      return NextResponse.json(
        {
          error: 'Too many requests. Please try again later.',
          retryAfter,
        },
        {
          status: 429,
          headers: {
            'Retry-After': retryAfter.toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(entry.resetTime).toISOString(),
          },
        }
      );
    }

    // Increment counter
    entry.count++;
    return null; // Allow request
  };
}

/**
 * Rate limiter for password reset requests by email
 * Limits: 3 requests per email per hour
 */
export const passwordResetByEmailLimiter = rateLimit({
  maxRequests: 3,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: async (req: NextRequest) => {
    try {
      const body = await req.json();
      const email = body.email?.toLowerCase() || 'unknown';
      return `password-reset:email:${email}`;
    } catch {
      return 'password-reset:email:unknown';
    }
  },
});

/**
 * Rate limiter for password reset requests by IP
 * Limits: 10 requests per IP per hour
 */
export const passwordResetByIPLimiter = rateLimit({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  keyGenerator: (req: NextRequest) => {
    const ip = req.headers.get('x-forwarded-for') ||
               req.headers.get('x-real-ip') ||
               'unknown';
    return `password-reset:ip:${ip}`;
  },
});

/**
 * Apply multiple rate limiters
 * @param limiters - Array of rate limiter functions
 * @returns Combined middleware function
 */
export function combineRateLimiters(...limiters: Array<(req: NextRequest) => Promise<NextResponse | null>>) {
  return async (req: NextRequest): Promise<NextResponse | null> => {
    for (const limiter of limiters) {
      const response = await limiter(req);
      if (response) {
        return response; // Rate limit hit
      }
    }
    return null; // All limits passed
  };
}