/**
 * Advanced cache management system
 * 
 * @module cache-manager
 * @description Multi-level caching with:
 * - L1: In-memory cache (hot data)
 * - L2: Compressed memory cache (warm data)
 * - L3: Disk cache (cold data)
 * - Intelligent eviction policies
 * - Cache warming and prediction
 */

import { createHash } from 'crypto';
import * as zlib from 'zlib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { EventBus } from './event-bus.js';
import { Logger } from '../utils/logger.js';
import { promisify } from 'util';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Cache priority levels
 */
export enum CachePriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  CRITICAL = 4
}

/**
 * Cache eviction policies
 */
export enum EvictionPolicyType {
  LRU = 'lru',      // Least Recently Used
  LFU = 'lfu',      // Least Frequently Used
  FIFO = 'fifo',    // First In First Out
  FILO = 'filo',    // First In Last Out
  ADAPTIVE = 'adaptive' // Adaptive based on access patterns
}

/**
 * Cache entry metadata
 */
interface CacheEntry<T> {
  key: string;
  value: T;
  size: number;
  priority: CachePriority;
  created: number;
  accessed: number;
  hits: number;
  ttl?: number;
  compressed?: Buffer;
  level: 'l1' | 'l2' | 'l3';
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  maxL1Size: number;        // Max items in L1
  maxL2Size: number;        // Max items in L2
  maxL3Size: number;        // Max items in L3 (disk)
  l3Directory: string;      // Directory for L3 cache
  compressionThreshold: number; // Compress items larger than this
  evictionPolicy: EvictionPolicyType;
  defaultTtl: number;       // Default TTL in ms
  enableDiskCache: boolean;
  enableCompression: boolean;
  maintenanceInterval: number; // Maintenance run interval
  accessPatternWindowSize: number; // For adaptive eviction
  predictiveCaching: boolean;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  totalHits: number;
  totalMisses: number;
  l1Hits: number;
  l2Hits: number;
  l3Hits: number;
  evictions: number;
  compressions: number;
  decompressions: number;
  diskWrites: number;
  diskReads: number;
  hitRate: number;
  avgAccessTime: number;
  avgCompressionRatio: number;
}

/**
 * Eviction policy interface
 */
interface EvictionPolicy<T> {
  onAccess(entry: CacheEntry<T>): void;
  onAdd(entry: CacheEntry<T>): void;
  selectVictim(entries: Map<string, CacheEntry<T>>): string | null;
  getName(): string;
}

/**
 * LRU eviction policy
 */
class LRUPolicy<T> implements EvictionPolicy<T> {
  onAccess(entry: CacheEntry<T>): void {
    entry.accessed = Date.now();
  }

  onAdd(entry: CacheEntry<T>): void {
    entry.accessed = Date.now();
  }

  selectVictim(entries: Map<string, CacheEntry<T>>): string | null {
    let oldestTime = Infinity;
    let victimKey: string | null = null;

    for (const [key, entry] of entries) {
      if (entry.priority < CachePriority.HIGH && entry.accessed < oldestTime) {
        oldestTime = entry.accessed;
        victimKey = key;
      }
    }

    return victimKey;
  }

  getName(): string {
    return 'LRU';
  }
}

/**
 * LFU eviction policy
 */
class LFUPolicy<T> implements EvictionPolicy<T> {
  onAccess(entry: CacheEntry<T>): void {
    entry.hits++;
    entry.accessed = Date.now();
  }

  onAdd(entry: CacheEntry<T>): void {
    entry.hits = 1;
    entry.accessed = Date.now();
  }

  selectVictim(entries: Map<string, CacheEntry<T>>): string | null {
    let minHits = Infinity;
    let victimKey: string | null = null;

    for (const [key, entry] of entries) {
      if (entry.priority < CachePriority.HIGH && entry.hits < minHits) {
        minHits = entry.hits;
        victimKey = key;
      }
    }

    return victimKey;
  }

  getName(): string {
    return 'LFU';
  }
}

/**
 * Advanced cache manager implementation
 */
export class CacheManager<T = any> {
  private l1Cache: Map<string, CacheEntry<T>> = new Map();
  private l2Cache: Map<string, CacheEntry<T>> = new Map();
  private l3Index: Map<string, string> = new Map(); // key -> file path
  
  private config: CacheConfig;
  private logger?: Logger;
  private eventBus?: EventBus;
  private evictionPolicy: EvictionPolicy<T>;
  
  private stats = {
    totalHits: 0,
    totalMisses: 0,
    l1Hits: 0,
    l2Hits: 0,
    l3Hits: 0,
    evictions: 0,
    compressions: 0,
    decompressions: 0,
    diskWrites: 0,
    diskReads: 0
  };
  
  private accessTimes: number[] = [];
  private compressionRatios: number[] = [];
  private maintenanceTimer?: NodeJS.Timeout;
  private predictiveCache: Map<string, number> = new Map(); // Pattern -> score

  constructor(
    config: Partial<CacheConfig> = {},
    logger?: Logger,
    eventBus?: EventBus
  ) {
    this.config = {
      maxL1Size: config.maxL1Size || 1000,
      maxL2Size: config.maxL2Size || 5000,
      maxL3Size: config.maxL3Size || 10000,
      l3Directory: config.l3Directory || './cache',
      compressionThreshold: config.compressionThreshold || 1024, // 1KB
      evictionPolicy: config.evictionPolicy || EvictionPolicyType.LRU,
      defaultTtl: config.defaultTtl || 3600000, // 1 hour
      enableDiskCache: config.enableDiskCache !== false,
      enableCompression: config.enableCompression !== false,
      maintenanceInterval: config.maintenanceInterval || 300000, // 5 minutes
      accessPatternWindowSize: config.accessPatternWindowSize || 1000,
      predictiveCaching: config.predictiveCaching || false
    };

    this.logger = logger;
    this.eventBus = eventBus;
    
    // Initialize eviction policy
    this.evictionPolicy = this.createEvictionPolicy(this.config.evictionPolicy);

    // Start maintenance timer
    this.startMaintenance();

    // Initialize disk cache directory
    if (this.config.enableDiskCache) {
      this.initializeDiskCache().catch(error => {
        this.logger?.error('Failed to initialize disk cache', error as Error);
      });
    }
  }

  /**
   * Get value from cache
   */
  async get(key: string): Promise<T | null> {
    const startTime = Date.now();
    
    // Check L1
    let entry = this.l1Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      this.recordHit(entry, 'l1', Date.now() - startTime);
      return entry.value;
    }

    // Check L2
    entry = this.l2Cache.get(key);
    if (entry && !this.isExpired(entry)) {
      // Decompress if needed
      if (entry.compressed) {
        const value = await this.decompress(entry);
        entry.value = value;
        delete entry.compressed;
        this.stats.decompressions++;
      }

      // Promote to L1
      this.promoteToL1(entry);
      this.recordHit(entry, 'l2', Date.now() - startTime);
      return entry.value;
    }

    // Check L3
    if (this.config.enableDiskCache) {
      const diskPath = this.l3Index.get(key);
      if (diskPath) {
        try {
          const value = await this.loadFromDisk(diskPath);
          if (value) {
            // Create entry and promote to L1
            entry = this.createEntry(key, value.data, value.priority);
            this.promoteToL1(entry);
            this.recordHit(entry, 'l3', Date.now() - startTime);
            return value.data;
          }
        } catch (error) {
          this.logger?.error(`Failed to load from disk: ${key}`, error as Error);
          this.l3Index.delete(key);
        }
      }
    }

    // Cache miss
    this.recordMiss(key, Date.now() - startTime);
    return null;
  }

  /**
   * Set value in cache
   */
  async set(
    key: string, 
    value: T, 
    priority: CachePriority = CachePriority.NORMAL,
    ttl?: number
  ): Promise<void> {
    const entry = this.createEntry(key, value, priority, ttl);
    
    // Add to L1
    this.l1Cache.set(key, entry);
    this.evictionPolicy.onAdd(entry);
    
    // Trigger eviction if needed
    await this.enforceL1Size();
    
    // Update predictive cache
    if (this.config.predictiveCaching) {
      this.updatePredictiveCache(key);
    }
    
    this.logger?.debug(`Cache set: ${key} (L1)`);
  }

  /**
   * Delete value from cache
   */
  async delete(key: string): Promise<boolean> {
    let deleted = false;
    
    // Remove from all levels
    if (this.l1Cache.delete(key)) deleted = true;
    if (this.l2Cache.delete(key)) deleted = true;
    
    // Remove from disk
    const diskPath = this.l3Index.get(key);
    if (diskPath) {
      try {
        await fs.unlink(diskPath);
        this.l3Index.delete(key);
        deleted = true;
      } catch (error) {
        this.logger?.error(`Failed to delete from disk: ${key}`, error as Error);
      }
    }
    
    if (deleted) {
      this.logger?.debug(`Cache delete: ${key}`);
      this.eventBus?.emit('cache:delete', { key });
    }
    
    return deleted;
  }

  /**
   * Clear entire cache
   */
  async clear(): Promise<void> {
    this.l1Cache.clear();
    this.l2Cache.clear();
    
    // Clear disk cache
    if (this.config.enableDiskCache) {
      for (const [key, filePath] of this.l3Index) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          this.logger?.error(`Failed to delete disk cache: ${key}`, error as Error);
        }
      }
      this.l3Index.clear();
    }
    
    // Reset stats
    this.stats = {
      totalHits: 0,
      totalMisses: 0,
      l1Hits: 0,
      l2Hits: 0,
      l3Hits: 0,
      evictions: 0,
      compressions: 0,
      decompressions: 0,
      diskWrites: 0,
      diskReads: 0
    };
    
    this.logger?.info('Cache cleared');
    this.eventBus?.emit('cache:clear', {});
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalAccesses = this.stats.totalHits + this.stats.totalMisses;
    const hitRate = totalAccesses > 0 ? this.stats.totalHits / totalAccesses : 0;
    
    const avgAccessTime = this.accessTimes.length > 0
      ? this.accessTimes.reduce((a, b) => a + b, 0) / this.accessTimes.length
      : 0;
    
    const avgCompressionRatio = this.compressionRatios.length > 0
      ? this.compressionRatios.reduce((a, b) => a + b, 0) / this.compressionRatios.length
      : 0;
    
    return {
      ...this.stats,
      hitRate,
      avgAccessTime,
      avgCompressionRatio
    };
  }

  /**
   * Warm cache with predicted keys
   */
  async warmCache(keyGenerator: () => string[], loader: (key: string) => Promise<T>): Promise<void> {
    const keys = keyGenerator();
    const warmupPromises = keys.map(async key => {
      try {
        const value = await loader(key);
        await this.set(key, value, CachePriority.HIGH);
      } catch (error) {
        this.logger?.error(`Failed to warm cache for key: ${key}`, error as Error);
      }
    });
    
    await Promise.all(warmupPromises);
    this.logger?.info(`Cache warmed with ${keys.length} entries`);
  }

  /**
   * Get cache size information
   */
  getSizes(): { l1: number; l2: number; l3: number } {
    return {
      l1: this.l1Cache.size,
      l2: this.l2Cache.size,
      l3: this.l3Index.size
    };
  }

  /**
   * Create cache entry
   */
  private createEntry(
    key: string, 
    value: T, 
    priority: CachePriority, 
    ttl?: number
  ): CacheEntry<T> {
    const serialized = JSON.stringify(value);
    const size = Buffer.byteLength(serialized);
    
    return {
      key,
      value,
      size,
      priority,
      created: Date.now(),
      accessed: Date.now(),
      hits: 0,
      ttl: ttl || this.config.defaultTtl,
      level: 'l1'
    };
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry<T>): boolean {
    if (!entry.ttl) return false;
    return Date.now() - entry.created > entry.ttl;
  }

  /**
   * Record cache hit
   */
  private recordHit(entry: CacheEntry<T>, level: 'l1' | 'l2' | 'l3', accessTime: number): void {
    this.stats.totalHits++;
    this.stats[`${level}Hits`]++;
    entry.hits++;
    entry.accessed = Date.now();
    
    this.evictionPolicy.onAccess(entry);
    this.accessTimes.push(accessTime);
    
    // Keep only recent access times
    if (this.accessTimes.length > this.config.accessPatternWindowSize) {
      this.accessTimes.shift();
    }
    
    this.eventBus?.emit('cache:hit', { key: entry.key, level });
  }

  /**
   * Record cache miss
   */
  private recordMiss(key: string, accessTime: number): void {
    this.stats.totalMisses++;
    this.accessTimes.push(accessTime);
    
    if (this.accessTimes.length > this.config.accessPatternWindowSize) {
      this.accessTimes.shift();
    }
    
    this.eventBus?.emit('cache:miss', { key });
  }

  /**
   * Promote entry to L1
   */
  private async promoteToL1(entry: CacheEntry<T>): Promise<void> {
    // Remove from current level
    if (entry.level === 'l2') {
      this.l2Cache.delete(entry.key);
    } else if (entry.level === 'l3') {
      const diskPath = this.l3Index.get(entry.key);
      if (diskPath) {
        try {
          await fs.unlink(diskPath);
        } catch (error) {
          // Ignore errors
        }
        this.l3Index.delete(entry.key);
      }
    }
    
    // Add to L1
    entry.level = 'l1';
    this.l1Cache.set(entry.key, entry);
    this.evictionPolicy.onAdd(entry);
    
    // Enforce size limit
    await this.enforceL1Size();
  }

  /**
   * Enforce L1 cache size limit
   */
  private async enforceL1Size(): Promise<void> {
    while (this.l1Cache.size > this.config.maxL1Size) {
      const victimKey = this.evictionPolicy.selectVictim(this.l1Cache);
      if (!victimKey) break;
      
      const victim = this.l1Cache.get(victimKey)!;
      this.l1Cache.delete(victimKey);
      
      // Demote to L2
      await this.demoteToL2(victim);
      this.stats.evictions++;
    }
  }

  /**
   * Demote entry to L2
   */
  private async demoteToL2(entry: CacheEntry<T>): Promise<void> {
    entry.level = 'l2';
    
    // Compress if needed
    if (this.config.enableCompression && entry.size > this.config.compressionThreshold) {
      const compressed = await this.compress(entry.value);
      entry.compressed = compressed.buffer;
      const ratio = compressed.originalSize / compressed.compressedSize;
      this.compressionRatios.push(ratio);
      
      if (this.compressionRatios.length > 100) {
        this.compressionRatios.shift();
      }
      
      // @ts-ignore - intentionally deleting value
      delete entry.value; // Remove uncompressed value
      this.stats.compressions++;
    }
    
    this.l2Cache.set(entry.key, entry);
    
    // Enforce L2 size limit
    await this.enforceL2Size();
  }

  /**
   * Enforce L2 cache size limit
   */
  private async enforceL2Size(): Promise<void> {
    while (this.l2Cache.size > this.config.maxL2Size) {
      const victimKey = this.evictionPolicy.selectVictim(this.l2Cache);
      if (!victimKey) break;
      
      const victim = this.l2Cache.get(victimKey)!;
      this.l2Cache.delete(victimKey);
      
      // Demote to L3 if disk cache is enabled
      if (this.config.enableDiskCache) {
        await this.demoteToL3(victim);
      }
      
      this.stats.evictions++;
    }
  }

  /**
   * Demote entry to L3 (disk)
   */
  private async demoteToL3(entry: CacheEntry<T>): Promise<void> {
    entry.level = 'l3';
    const hash = createHash('sha256').update(entry.key).digest('hex');
    const filePath = path.join(this.config.l3Directory, `${hash}.cache`);
    
    try {
      const data = {
        key: entry.key,
        data: entry.compressed || entry.value,
        priority: entry.priority,
        created: entry.created,
        ttl: entry.ttl,
        compressed: !!entry.compressed
      };
      
      await fs.writeFile(filePath, JSON.stringify(data));
      this.l3Index.set(entry.key, filePath);
      this.stats.diskWrites++;
      
      // Enforce L3 size limit
      await this.enforceL3Size();
    } catch (error) {
      this.logger?.error(`Failed to write to disk cache: ${entry.key}`, error as Error);
    }
  }

  /**
   * Enforce L3 cache size limit
   */
  private async enforceL3Size(): Promise<void> {
    while (this.l3Index.size > this.config.maxL3Size) {
      // Remove oldest entry (simple FIFO for disk)
      const [oldestKey] = this.l3Index.keys();
      const filePath = this.l3Index.get(oldestKey)!;
      
      try {
        await fs.unlink(filePath);
      } catch (error) {
        // Ignore errors
      }
      
      this.l3Index.delete(oldestKey);
      this.stats.evictions++;
    }
  }

  /**
   * Load entry from disk
   */
  private async loadFromDisk(filePath: string): Promise<any | null> {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      const data = JSON.parse(content);
      
      // Check if expired
      if (data.ttl && Date.now() - data.created > data.ttl) {
        await fs.unlink(filePath);
        return null;
      }
      
      // Decompress if needed
      if (data.compressed && data.data) {
        const buffer = Buffer.from(data.data);
        data.data = await gunzip(buffer).then(b => JSON.parse(b.toString()));
        this.stats.decompressions++;
      }
      
      this.stats.diskReads++;
      return data;
    } catch (error) {
      this.logger?.error(`Failed to read from disk cache`, error as Error);
      return null;
    }
  }

  /**
   * Compress data
   */
  private async compress(data: T): Promise<{ buffer: Buffer; originalSize: number; compressedSize: number }> {
    const json = JSON.stringify(data);
    const originalSize = Buffer.byteLength(json);
    const buffer = await gzip(json);
    const compressedSize = buffer.length;
    
    return { buffer, originalSize, compressedSize };
  }

  /**
   * Decompress data
   */
  private async decompress(entry: CacheEntry<T>): Promise<T> {
    if (!entry.compressed) {
      throw new Error('Entry is not compressed');
    }
    
    const json = await gunzip(entry.compressed);
    return JSON.parse(json.toString());
  }

  /**
   * Initialize disk cache directory
   */
  private async initializeDiskCache(): Promise<void> {
    try {
      await fs.mkdir(this.config.l3Directory, { recursive: true });
    } catch (error) {
      this.logger?.error('Failed to create cache directory', error as Error);
    }
  }

  /**
   * Create eviction policy
   */
  private createEvictionPolicy(type: EvictionPolicyType): EvictionPolicy<T> {
    switch (type) {
      case EvictionPolicyType.LRU:
        return new LRUPolicy<T>();
      case EvictionPolicyType.LFU:
        return new LFUPolicy<T>();
      default:
        return new LRUPolicy<T>();
    }
  }

  /**
   * Start maintenance timer
   */
  private startMaintenance(): void {
    this.maintenanceTimer = setInterval(() => {
      this.runMaintenance().catch(error => {
        this.logger?.error('Maintenance error', error as Error);
      });
    }, this.config.maintenanceInterval);
  }

  /**
   * Run maintenance tasks
   */
  private async runMaintenance(): Promise<void> {
    const startTime = Date.now();
    
    // Clean expired entries
    await this.cleanExpiredEntries();
    
    // Update predictive cache
    if (this.config.predictiveCaching) {
      this.updatePredictiveScores();
    }
    
    // Log maintenance complete
    const duration = Date.now() - startTime;
    this.logger?.debug(`Cache maintenance completed in ${duration}ms`);
  }

  /**
   * Clean expired entries
   */
  private async cleanExpiredEntries(): Promise<void> {
    // Clean L1
    for (const [key, entry] of this.l1Cache) {
      if (this.isExpired(entry)) {
        this.l1Cache.delete(key);
      }
    }
    
    // Clean L2
    for (const [key, entry] of this.l2Cache) {
      if (this.isExpired(entry)) {
        this.l2Cache.delete(key);
      }
    }
    
    // Clean L3
    for (const [key, filePath] of this.l3Index) {
      try {
        const data = await this.loadFromDisk(filePath);
        if (!data) {
          this.l3Index.delete(key);
        }
      } catch (error) {
        this.l3Index.delete(key);
      }
    }
  }

  /**
   * Update predictive cache based on access patterns
   */
  private updatePredictiveCache(key: string): void {
    // Extract pattern from key (e.g., prefix)
    const pattern = key.split(':')[0];
    const score = this.predictiveCache.get(pattern) || 0;
    this.predictiveCache.set(pattern, score + 1);
  }

  /**
   * Update predictive scores
   */
  private updatePredictiveScores(): void {
    // Decay scores over time
    for (const [pattern, score] of this.predictiveCache) {
      if (score > 1) {
        this.predictiveCache.set(pattern, score * 0.9);
      } else {
        this.predictiveCache.delete(pattern);
      }
    }
  }

  /**
   * Destroy cache manager
   */
  destroy(): void {
    if (this.maintenanceTimer) {
      clearInterval(this.maintenanceTimer);
    }
    
    this.clear().catch(error => {
      this.logger?.error('Failed to clear cache on destroy', error as Error);
    });
  }
}