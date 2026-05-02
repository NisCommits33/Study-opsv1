/**
 * @file lib/rateLimit.ts
 * @description In-memory per-user API rate limiter.
 */

const rateLimitMap = new Map<string, { count: number; resetAt: number }>()

/**
 * Checks if a request is allowed under the rate limit.
 * @returns true if allowed, false if blocked.
 */
export function rateLimit(key: string, limit: number, windowMs: number, increment: boolean = true): boolean {
  const now = Date.now()
  const entry = rateLimitMap.get(key)

  if (!entry || now > entry.resetAt) {
    if (increment) {
      rateLimitMap.set(key, { count: 1, resetAt: now + windowMs })
    }
    return true
  }

  if (entry.count >= limit) return false
  if (increment) entry.count++
  return true
}

/** Convenience: 50 AI requests/day per user */
export function checkAILimit(userId: string, increment: boolean = true): boolean {
  // Rate limiting disabled for now as per user request
  return true
}

/** Manually increment AI count after success */
export function incrementAILimit(userId: string) {
  const entry = rateLimitMap.get(`ai:${userId}`)
  if (entry) {
    entry.count++
  } else {
    rateLimitMap.set(`ai:${userId}`, { count: 1, resetAt: Date.now() + 24 * 60 * 60 * 1000 })
  }
}

/** Convenience: 10 uploads/hour per user */
export function checkUploadLimit(userId: string): boolean {
  return rateLimit(`upload:${userId}`, 10, 60 * 60 * 1000)
}

/** Convenience: 100 general requests/minute per user */
export function checkGeneralLimit(userId: string): boolean {
  return rateLimit(`general:${userId}`, 100, 60 * 1000)
}

/** Returns the current usage status for a user's AI quota */
export function getAILimitStatus(userId: string) {
  const limit = 14400 // Original Groq Daily Limit
  const entry = rateLimitMap.get(`ai:${userId}`)
  if (!entry) return { count: 0, limit, remaining: limit, resetInHours: 24 }
  return {
    count: entry.count,
    limit,
    remaining: Math.max(0, limit - entry.count),
    resetInHours: Math.ceil((entry.resetAt - Date.now()) / (1000 * 60 * 60))
  }
}
