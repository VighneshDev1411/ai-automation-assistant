interface RateLimit {
  requests: number
  per: 'second' | 'minute' | 'hour' | 'day'
  reset?: number
}

export class RateLimiter {
  private limits = new Map<string, { count: number; resetTime: number }>()

  // ✅ FIX: Private method to get reset time (remove duplicate)
  private getResetTimeForPeriod(per: string): number {
    const now = Date.now()
    switch (per) {
      case 'second':
        return now + 1000
      case 'minute':
        return now + 60 * 1000
      case 'hour':
        return now + 60 * 60 * 1000
      case 'day':
        return now + 24 * 60 * 60 * 1000
      default:
        return now + 60 * 1000
    }
  }

  async checkLimit(key: string, limit: RateLimit): Promise<boolean> {
    const now = Date.now()
    const current = this.limits.get(key)

    if (!current || now > current.resetTime) {
      // Reset or initialize
      this.limits.set(key, {
        count: 1,
        resetTime: this.getResetTimeForPeriod(limit.per),
      })
      return true
    }

    if (current.count >= limit.requests) {
      return false // Rate limit exceeded
    }

    // Increment count
    current.count++
    return true
  }

  getRemainingRequests(key: string, limit: RateLimit): number {
    const current = this.limits.get(key)
    if (!current || Date.now() > current.resetTime) {
      return limit.requests
    }
    return Math.max(0, limit.requests - current.count)
  }

  // ✅ FIX: Single public method to get reset time
  getResetTime(key: string): number | null {
    const current = this.limits.get(key)
    return current ? current.resetTime : null
  }

  // ✅ BONUS: Add method to clear limits for testing
  clearLimits(): void {
    this.limits.clear()
  }

  // ✅ BONUS: Add method to get current status
  getLimitStatus(key: string): { count: number; resetTime: number } | null {
    return this.limits.get(key) || null
  }
}
