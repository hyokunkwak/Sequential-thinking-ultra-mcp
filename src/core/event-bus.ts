/**
 * Event Bus implementation for loosely coupled communication
 * Supports both synchronous and asynchronous event handling
 */

export interface EventHandler<T = any> {
  (data: T): void | Promise<void>;
}

export interface EventOptions {
  once?: boolean;
  priority?: number;
}

interface HandlerWrapper<T = any> {
  handler: EventHandler<T>;
  options: EventOptions;
}

export class EventBus {
  private handlers = new Map<string, HandlerWrapper[]>();
  private wildcardHandlers: Array<{
    pattern: RegExp;
    wrapper: HandlerWrapper;
  }> = [];
  
  /**
   * Subscribe to an event
   */
  on<T = any>(event: string, handler: EventHandler<T>, options: EventOptions = {}): () => void {
    const wrapper: HandlerWrapper<T> = { handler, options };
    
    // Handle wildcard subscriptions
    if (event.includes('*')) {
      const pattern = new RegExp('^' + event.replace(/\*/g, '.*') + '$');
      this.wildcardHandlers.push({ pattern, wrapper });
      
      // Return unsubscribe function
      return () => {
        const index = this.wildcardHandlers.findIndex(w => w.wrapper === wrapper);
        if (index !== -1) {
          this.wildcardHandlers.splice(index, 1);
        }
      };
    }
    
    // Regular event subscription
    const handlers = this.handlers.get(event) || [];
    handlers.push(wrapper);
    
    // Sort by priority (higher priority first)
    handlers.sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    
    this.handlers.set(event, handlers);
    
    // Return unsubscribe function
    return () => this.off(event, handler);
  }
  
  /**
   * Subscribe to an event once
   */
  once<T = any>(event: string, handler: EventHandler<T>): () => void {
    return this.on(event, handler, { once: true });
  }
  
  /**
   * Unsubscribe from an event
   */
  off(event: string, handler?: EventHandler): void {
    if (!handler) {
      // Remove all handlers for this event
      this.handlers.delete(event);
      return;
    }
    
    const handlers = this.handlers.get(event);
    if (!handlers) return;
    
    const filtered = handlers.filter(w => w.handler !== handler);
    if (filtered.length === 0) {
      this.handlers.delete(event);
    } else {
      this.handlers.set(event, filtered);
    }
  }
  
  /**
   * Emit an event synchronously
   */
  emit<T = any>(event: string, data: T): void {
    // Get direct handlers
    const handlers = this.handlers.get(event) || [];
    
    // Get wildcard handlers that match
    const matchingWildcards = this.wildcardHandlers
      .filter(({ pattern }) => pattern.test(event))
      .map(({ wrapper }) => wrapper);
    
    // Combine and sort all handlers
    const allHandlers = [...handlers, ...matchingWildcards]
      .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    
    // Execute handlers
    const handlersToRemove: Array<{ event: string; handler: EventHandler }> = [];
    
    allHandlers.forEach(wrapper => {
      try {
        wrapper.handler(data);
        
        // Remove once handlers
        if (wrapper.options.once) {
          handlersToRemove.push({ event, handler: wrapper.handler });
        }
      } catch (error) {
        console.error(`Error in event handler for '${event}':`, error);
      }
    });
    
    // Remove once handlers
    handlersToRemove.forEach(({ event, handler }) => this.off(event, handler));
  }
  
  /**
   * Emit an event asynchronously
   */
  async emitAsync<T = any>(event: string, data: T): Promise<void> {
    // Get direct handlers
    const handlers = this.handlers.get(event) || [];
    
    // Get wildcard handlers that match
    const matchingWildcards = this.wildcardHandlers
      .filter(({ pattern }) => pattern.test(event))
      .map(({ wrapper }) => wrapper);
    
    // Combine and sort all handlers
    const allHandlers = [...handlers, ...matchingWildcards]
      .sort((a, b) => (b.options.priority || 0) - (a.options.priority || 0));
    
    // Execute handlers
    const handlersToRemove: Array<{ event: string; handler: EventHandler }> = [];
    
    await Promise.all(
      allHandlers.map(async wrapper => {
        try {
          await wrapper.handler(data);
          
          // Mark once handlers for removal
          if (wrapper.options.once) {
            handlersToRemove.push({ event, handler: wrapper.handler });
          }
        } catch (error) {
          console.error(`Error in async event handler for '${event}':`, error);
        }
      })
    );
    
    // Remove once handlers
    handlersToRemove.forEach(({ event, handler }) => this.off(event, handler));
  }
  
  /**
   * Wait for an event
   */
  waitFor<T = any>(event: string, timeout?: number): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = timeout ? setTimeout(() => {
        this.off(event, handler);
        reject(new Error(`Timeout waiting for event '${event}'`));
      }, timeout) : null;
      
      const handler = (data: T) => {
        if (timer) clearTimeout(timer);
        resolve(data);
      };
      
      this.once(event, handler);
    });
  }
  
  /**
   * Get event names
   */
  getEventNames(): string[] {
    return Array.from(this.handlers.keys());
  }
  
  /**
   * Get handler count for an event
   */
  getHandlerCount(event: string): number {
    const directHandlers = this.handlers.get(event)?.length || 0;
    const wildcardCount = this.wildcardHandlers
      .filter(({ pattern }) => pattern.test(event)).length;
    return directHandlers + wildcardCount;
  }
  
  /**
   * Clear all event handlers
   */
  clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }
}

// Event type definitions
export interface ThoughtProcessingEvent {
  input: any;
  timestamp: Date;
}

export interface ThoughtProcessedEvent {
  input: any;
  response: any;
  processingTime: number;
  metrics?: any;
}

export interface QualityWarningEvent {
  score: any;
  threshold: number;
  thoughtNumber: number;
}

export interface BiasDetectedEvent {
  biasType: string;
  thoughtNumber: number;
  confidence: number;
}

export interface CacheEvent {
  key: string;
  hit: boolean;
}

// Event name constants
export const EventNames = {
  // Thought processing events
  THOUGHT_PROCESSING: 'thought.processing',
  THOUGHT_PROCESSED: 'thought.processed',
  THOUGHT_FAILED: 'thought.failed',
  
  // Quality events
  QUALITY_WARNING: 'quality.warning',
  QUALITY_IMPROVED: 'quality.improved',
  
  // Bias events
  BIAS_DETECTED: 'bias.detected',
  BIAS_CORRECTED: 'bias.corrected',
  
  // Cache events
  CACHE_HIT: 'cache.hit',
  CACHE_MISS: 'cache.miss',
  CACHE_CLEARED: 'cache.cleared',
  
  // Meta reasoning events
  META_CHECKPOINT: 'meta.checkpoint',
  META_COMPLETED: 'meta.completed',
  
  // Budget events
  BUDGET_WARNING: 'budget.warning',
  BUDGET_EXCEEDED: 'budget.exceeded',
  
  // Plugin events
  PLUGIN_REGISTERED: 'plugin.registered',
  PLUGIN_LOADED: 'plugin.loaded',
  PLUGIN_ERROR: 'plugin.error',
  
  // Worker events
  WORKER_CREATED: 'worker.created',
  WORKER_REMOVED: 'worker.removed',
  
  // Processor events
  PROCESSOR_INITIALIZED: 'processor.initialized',
  PROCESSOR_SHUTDOWN: 'processor.shutdown',
  
  // Batch processing events
  BATCH_COMPLETED: 'batch.completed',
  
  // Performance events
  PERFORMANCE_WARNING: 'performance.warning',
  PERFORMANCE_PREDICTION: 'performance.prediction'
} as const;