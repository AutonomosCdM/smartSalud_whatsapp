/**
 * CacheService Interface
 *
 * Minimal cache abstraction for MVP
 * Can be implemented with in-memory Map or Redis later
 * For now: used only in tests (mocked)
 */

export class CacheService {
  /**
   * Get cached value by key
   * Returns null if key not found or expired
   */
  async get(_key: string): Promise<any | null> {
    // MVP: No-op implementation
    // In production: Redis GET
    return null;
  }

  /**
   * Set cache value with TTL
   * @param key - Cache key
   * @param value - Value to cache (will be JSON serialized)
   * @param ttl - Time to live in seconds
   */
  async set(_key: string, _value: any, _ttl: number): Promise<void> {
    // MVP: No-op implementation
    // In production: Redis SETEX
  }

  /**
   * Delete cached value
   */
  async delete(_key: string): Promise<void> {
    // MVP: No-op implementation
    // In production: Redis DEL
  }

  /**
   * Clear all cache
   */
  async clear(): Promise<void> {
    // MVP: No-op implementation
    // In production: Redis FLUSHDB
  }
}
