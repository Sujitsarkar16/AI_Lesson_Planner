/**
 * Rate Limiting Utility
 * Prevents abuse of AI API calls with per-user request throttling
 */

interface RateLimitConfig {
  maxRequests: number;
  windowMs: number; // Time window in milliseconds
  storageKey: string;
}

interface RequestRecord {
  timestamp: number;
  count: number;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  storageKey: 'ai_rate_limit'
};

export class RateLimiter {
  private config: RateLimitConfig;

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Check if request is allowed under rate limit
   */
  isAllowed(): boolean {
    if (typeof window === 'undefined') return true;

    const now = Date.now();
    const stored = localStorage.getItem(this.config.storageKey);
    let record: RequestRecord = { timestamp: now, count: 0 };

    if (stored) {
      try {
        record = JSON.parse(stored);
      } catch {
        // Corrupted data, reset
        record = { timestamp: now, count: 0 };
      }
    }

    // Check if window has expired
    if (now - record.timestamp > this.config.windowMs) {
      record = { timestamp: now, count: 1 };
      localStorage.setItem(this.config.storageKey, JSON.stringify(record));
      return true;
    }

    // Check if limit exceeded
    if (record.count >= this.config.maxRequests) {
      return false;
    }

    // Increment count
    record.count++;
    localStorage.setItem(this.config.storageKey, JSON.stringify(record));
    return true;
  }

  /**
   * Get remaining requests in current window
   */
  getRemaining(): number {
    if (typeof window === 'undefined') return this.config.maxRequests;

    const stored = localStorage.getItem(this.config.storageKey);
    if (!stored) return this.config.maxRequests;

    try {
      const record: RequestRecord = JSON.parse(stored);
      const now = Date.now();

      if (now - record.timestamp > this.config.windowMs) {
        return this.config.maxRequests;
      }

      return Math.max(0, this.config.maxRequests - record.count);
    } catch {
      return this.config.maxRequests;
    }
  }

  /**
   * Get time until next window reset (in seconds)
   */
  getResetTime(): number {
    if (typeof window === 'undefined') return 0;

    const stored = localStorage.getItem(this.config.storageKey);
    if (!stored) return 0;

    try {
      const record: RequestRecord = JSON.parse(stored);
      const now = Date.now();
      const elapsed = now - record.timestamp;
      const remaining = Math.max(0, this.config.windowMs - elapsed);

      return Math.ceil(remaining / 1000); // Convert to seconds
    } catch {
      return 0;
    }
  }

  /**
   * Reset rate limit (for testing or manual reset)
   */
  reset(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.config.storageKey);
  }
}

// Export singleton instance with default config
export const contentGenerationLimiter = new RateLimiter({
  maxRequests: 10,
  windowMs: 60 * 60 * 1000, // 1 hour
  storageKey: 'ai_content_gen_limit'
});

export const imageLimiter = new RateLimiter({
  maxRequests: 5,
  windowMs: 60 * 60 * 1000, // 1 hour
  storageKey: 'ai_image_gen_limit'
});
