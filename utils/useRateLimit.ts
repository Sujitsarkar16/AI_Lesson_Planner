/**
 * Custom Hook: useRateLimit
 * Manages rate limiting state and provides feedback for UI
 */

import { useState, useCallback } from 'react';
import { RateLimiter } from './rateLimiter';

interface RateLimitState {
  isAllowed: boolean;
  remaining: number;
  resetTime: number;
  error: string | null;
}

export const useRateLimit = (limiter: RateLimiter) => {
  const [state, setState] = useState<RateLimitState>({
    isAllowed: true,
    remaining: limiter.getRemaining(),
    resetTime: 0,
    error: null
  });

  const checkLimit = useCallback(() => {
    const isAllowed = limiter.isAllowed();
    const remaining = limiter.getRemaining();
    const resetTime = limiter.getResetTime();

    if (!isAllowed) {
      const hours = Math.floor(resetTime / 3600);
      const minutes = Math.floor((resetTime % 3600) / 60);
      const seconds = resetTime % 60;

      let timeStr = '';
      if (hours > 0) timeStr += `${hours}h `;
      if (minutes > 0) timeStr += `${minutes}m `;
      if (seconds > 0) timeStr += `${seconds}s`;

      setState({
        isAllowed: false,
        remaining,
        resetTime,
        error: `Rate limit exceeded. Please try again in ${timeStr.trim()}.`
      });
      return false;
    }

    // Show warning if close to limit (75%)
    const maxRequests = (limiter as any).config?.maxRequests || 10;
    if (remaining <= maxRequests * 0.25) {
      setState({
        isAllowed: true,
        remaining,
        resetTime,
        error: `⚠️ Only ${remaining} requests remaining.`
      });
    } else {
      setState({
        isAllowed: true,
        remaining,
        resetTime,
        error: null
      });
    }

    return true;
  }, [limiter]);

  const reset = useCallback(() => {
    limiter.reset();
    setState({
      isAllowed: true,
      remaining: (limiter as any).config?.maxRequests || 10,
      resetTime: 0,
      error: null
    });
  }, [limiter]);

  return {
    ...state,
    checkLimit,
    reset
  };
};
