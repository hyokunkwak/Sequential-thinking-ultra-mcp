/**
 * Text similarity calculation service with LRU caching
 * 
 * @module similarity.service
 * @description Provides optimized text similarity calculations with:
 * - LRU (Least Recently Used) caching for performance
 * - Jaccard similarity algorithm
 * - TTL-based cache expiration
 * - Event emission for cache monitoring
 */

import { TEXT_PROCESSING, PERFORMANCE } from '../config/constants.js';
import { EventBus, EventNames } from '../core/event-bus.js';

interface SimilarityCache {
  key: string;
  value: number;
  timestamp: number;
}

/**
 * Service for calculating text similarity with caching
 * @class SimilarityService
 * @public
 */
export class SimilarityService {
  /** LRU cache for similarity results */
  private cache: Map<string, SimilarityCache>;
  /** Maximum number of cached entries */
  private readonly cacheSize: number;
  /** Cache time-to-live in milliseconds */
  private readonly cacheTTL: number = 3600000; // 1 hour in milliseconds
  /** Optional event bus for cache events */
  private eventBus?: EventBus;

  /**
   * Creates a new SimilarityService instance
   * @param {number} [cacheSize=100] - Maximum cache size
   * @param {EventBus} [eventBus] - Optional event bus for cache events
   */
  constructor(cacheSize: number = PERFORMANCE.CACHE_SIZE, eventBus?: EventBus) {
    this.cache = new Map();
    this.cacheSize = cacheSize;
    this.eventBus = eventBus;
  }

  /**
   * Calculate similarity between two texts with caching
   * @param {string} text1 - First text to compare
   * @param {string} text2 - Second text to compare
   * @returns {number} Similarity score between 0 and 1
   * @public
   */
  calculateSimilarity(text1: string, text2: string): number {
    // Check cache first
    const cacheKey = this.getCacheKey(text1, text2);
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTTL) {
      // Emit cache hit event
      this.eventBus?.emit(EventNames.CACHE_HIT, { key: cacheKey, hit: true });
      return cached.value;
    }

    // Emit cache miss event
    this.eventBus?.emit(EventNames.CACHE_MISS, { key: cacheKey, hit: false });

    // Calculate similarity
    const similarity = this.computeSimilarity(text1, text2);
    
    // Cache the result
    this.setCacheValue(cacheKey, similarity);
    
    return similarity;
  }

  /**
   * Core similarity computation using optimized algorithm
   */
  private computeSimilarity(text1: string, text2: string): number {
    // Early exit for identical strings
    if (text1 === text2) return 1.0;
    
    // Early exit for very different lengths
    const lengthRatio = Math.min(text1.length, text2.length) / Math.max(text1.length, text2.length);
    if (lengthRatio < TEXT_PROCESSING.LENGTH_RATIO_THRESHOLD) {
      return lengthRatio;
    }
    
    // Tokenize and normalize
    const tokens1 = this.tokenize(text1);
    const tokens2 = this.tokenize(text2);
    
    // Calculate cosine similarity
    return this.cosineSimilarity(tokens1, tokens2);
  }

  /**
   * Tokenize and normalize text
   */
  private tokenize(text: string): string[] {
    const normalized = text.toLowerCase().replace(/[^\w\s가-힣]/g, '');
    return normalized.split(/\s+/).filter(t => t.length > TEXT_PROCESSING.MIN_TOKEN_LENGTH);
  }

  /**
   * Calculate cosine similarity between token arrays
   */
  private cosineSimilarity(tokens1: string[], tokens2: string[]): number {
    const freq1 = this.getFrequencyMap(tokens1);
    const freq2 = this.getFrequencyMap(tokens2);
    
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    // Calculate dot product and first norm
    freq1.forEach((count, token) => {
      norm1 += count * count;
      if (freq2.has(token)) {
        dotProduct += count * freq2.get(token)!;
      }
    });
    
    // Calculate second norm
    freq2.forEach((count) => {
      norm2 += count * count;
    });
    
    if (norm1 === 0 || norm2 === 0) return 0;
    
    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Create frequency map from tokens
   */
  private getFrequencyMap(tokens: string[]): Map<string, number> {
    const freq = new Map<string, number>();
    tokens.forEach(token => {
      freq.set(token, (freq.get(token) || 0) + 1);
    });
    return freq;
  }

  /**
   * Generate cache key for text pair
   */
  private getCacheKey(text1: string, text2: string): string {
    // Order-independent key generation
    const [first, second] = text1 < text2 ? [text1, text2] : [text2, text1];
    return `${first.substring(0, 50)}|${second.substring(0, 50)}`;
  }

  /**
   * Set cache value with size management
   */
  private setCacheValue(key: string, value: number): void {
    // Remove oldest entries if cache is full
    if (this.cache.size >= this.cacheSize) {
      const oldestKey = this.findOldestCacheKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
    
    this.cache.set(key, {
      key,
      value,
      timestamp: Date.now()
    });
  }

  /**
   * Find the oldest cache entry
   */
  private findOldestCacheKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;
    
    this.cache.forEach((entry, key) => {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    });
    
    return oldestKey;
  }

  /**
   * Clear the cache
   */
  clearCache(): void {
    this.cache.clear();
    // Emit cache cleared event
    this.eventBus?.emit(EventNames.CACHE_CLEARED, { key: '*', hit: false });
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.cache.size,
      maxSize: this.cacheSize
    };
  }

  /**
   * Detect patterns in text based on history
   * @param {string} text - Text to analyze
   * @param {string[]} history - History of previous texts
   * @returns {string | null} Detected pattern or null
   */
  detectPatterns(text: string, history: string[]): string | null {
    if (!history || history.length === 0) {
      return null;
    }

    // Check for repetitive patterns
    const similarities = history.map(prev => this.calculateSimilarity(text, prev));
    const avgSimilarity = similarities.reduce((a, b) => a + b, 0) / similarities.length;

    if (avgSimilarity > 0.8) {
      return 'repetitive_pattern';
    }

    // Check for escalating complexity
    if (text.length > history[history.length - 1]?.length * 1.5) {
      return 'complexity_escalation';
    }

    return null;
  }
}