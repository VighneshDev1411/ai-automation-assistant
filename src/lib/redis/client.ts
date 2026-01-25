// src/lib/redis/client.ts
/**
 * Redis Client Configuration
 * Used for BullMQ job queues, caching, and session management
 */

import Redis from 'ioredis'

let redis: Redis | null = null

/**
 * Get Redis client singleton
 */
export function getRedisClient(): Redis {
  if (redis && redis.status === 'ready') {
    return redis
  }

  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

  if (!redisUrl) {
    console.warn('⚠️ No REDIS_URL found. Using in-memory fallback (not recommended for production)')
    
    // For development/testing, create a mock Redis client
    // In production, you MUST set REDIS_URL
    redis = new Redis({
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        const delay = Math.min(times * 50, 2000)
        return delay
      },
      lazyConnect: true, // Don't throw if Redis is not available
    })

    // Handle connection errors gracefully in development
    redis.on('error', (err) => {
      console.error('❌ Redis connection error:', err.message)
    })

    return redis
  }

  // Production Redis configuration
  redis = new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    enableReadyCheck: true,
    retryStrategy(times) {
      const delay = Math.min(times * 50, 2000)
      return delay
    },
  })

  redis.on('connect', () => {
    console.log('✅ Redis connected successfully')
  })

  redis.on('error', (err) => {
    console.error('❌ Redis error:', err)
  })

  redis.on('close', () => {
    console.log('🔌 Redis connection closed')
  })

  return redis
}

/**
 * Close Redis connection
 */
export async function closeRedisClient(): Promise<void> {
  if (redis) {
    await redis.quit()
    redis = null
    console.log('🔒 Redis client closed')
  }
}

/**
 * Check if Redis is available
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const client = getRedisClient()
    await client.ping()
    return true
  } catch (error) {
    console.error('Redis not available:', error)
    return false
  }
}

/**
 * Get Redis connection options for BullMQ
 */
export function getRedisConnectionOptions() {
  const redisUrl = process.env.REDIS_URL || process.env.UPSTASH_REDIS_REST_URL

  if (!redisUrl) {
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null, // BullMQ requirement
    }
  }

  // Parse Redis URL for connection options
  try {
    const url = new URL(redisUrl)
    return {
      host: url.hostname,
      port: parseInt(url.port || '6379'),
      password: url.password || undefined,
      username: url.username || undefined,
      maxRetriesPerRequest: null, // BullMQ requirement
      tls: url.protocol === 'rediss:' ? {} : undefined,
    }
  } catch (error) {
    console.error('Failed to parse Redis URL:', error)
    return {
      host: 'localhost',
      port: 6379,
      maxRetriesPerRequest: null,
    }
  }
}
