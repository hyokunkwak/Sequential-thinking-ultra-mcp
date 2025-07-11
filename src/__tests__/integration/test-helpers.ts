/**
 * Test helpers and utilities for integration tests
 */

import { EventBus } from '../../core/event-bus.js';
import { Logger } from '../../utils/logger.js';
import { UltraThinkConfig, UltraThinkInput, UltraThinkResponse } from '../../types/interfaces.js';

/**
 * Create a test configuration
 */
export function createTestConfig(overrides?: Partial<UltraThinkConfig>): UltraThinkConfig {
  return {
    maxThoughts: 10,
    maxDepth: 5,
    timeout: 5000,
    qualityThreshold: 0.7,
    biasCheckEnabled: true,
    cacheEnabled: false, // Disable cache for tests
    parallelEnabled: true,
    adaptiveEnabled: true,
    pluginsEnabled: false,
    metricsEnabled: true,
    loggingEnabled: false, // Reduce noise in tests
    environment: 'test',
    ...overrides
  };
}

/**
 * Create test input
 */
export function createTestInput(overrides?: Partial<UltraThinkInput>): UltraThinkInput {
  return {
    thought: 'Test thought',
    nextThoughtNeeded: false,
    thoughtNumber: 1,
    totalThoughts: 1,
    ...overrides
  };
}

/**
 * Create test dependencies
 */
export interface TestDependencies {
  eventBus: EventBus;
  logger: Logger;
}

export function createTestDependencies(): TestDependencies {
  const eventBus = new EventBus();
  const logger = new Logger(true, false); // Production mode, no debug

  return { eventBus, logger };
}

/**
 * Wait for event with timeout
 */
export async function waitForEvent(
  eventBus: EventBus,
  eventName: string,
  timeout = 5000
): Promise<any> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout waiting for event: ${eventName}`));
    }, timeout);

    const unsubscribe = eventBus.on(eventName, (data) => {
      clearTimeout(timer);
      unsubscribe();
      resolve(data);
    });
  });
}

/**
 * Collect events during test execution
 */
export class EventCollector {
  private events: Array<{ name: string; data: any; timestamp: Date }> = [];
  private subscriptions: Array<() => void> = [];

  constructor(private eventBus: EventBus) {}

  /**
   * Start collecting events
   */
  start(eventNames: string[]): void {
    eventNames.forEach(eventName => {
      const unsubscribe = this.eventBus.on(eventName, (data) => {
        this.events.push({
          name: eventName,
          data,
          timestamp: new Date()
        });
      });
      this.subscriptions.push(unsubscribe);
    });
  }

  /**
   * Stop collecting events
   */
  stop(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    this.subscriptions = [];
  }

  /**
   * Get collected events
   */
  getEvents(eventName?: string): Array<{ name: string; data: any; timestamp: Date }> {
    if (eventName) {
      return this.events.filter(e => e.name === eventName);
    }
    return this.events;
  }

  /**
   * Clear collected events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Wait for specific number of events
   */
  async waitForEventCount(eventName: string, count: number, timeout = 5000): Promise<void> {
    const startTime = Date.now();
    
    while (this.getEvents(eventName).length < count) {
      if (Date.now() - startTime > timeout) {
        throw new Error(`Timeout waiting for ${count} ${eventName} events`);
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
}

/**
 * Mock worker for testing
 */
export class MockWorker {
  private handlers = new Map<string, Function>();
  public isTerminated = false;

  postMessage(message: any): void {
    // Simulate async message handling
    setTimeout(() => {
      const handler = this.handlers.get('message');
      if (handler && !this.isTerminated) {
        handler({ data: this.processMessage(message) });
      }
    }, 10);
  }

  on(event: string, handler: Function): void {
    this.handlers.set(event, handler);
  }

  terminate(): void {
    this.isTerminated = true;
    this.handlers.clear();
  }

  private processMessage(message: any): any {
    // Simulate worker processing
    if (message.type === 'PROCESS') {
      return {
        type: 'RESULT',
        id: message.id,
        result: {
          thought: `Processed: ${message.input.thought}`,
          nextThoughtNeeded: message.input.nextThoughtNeeded,
          thoughtNumber: message.input.thoughtNumber,
          totalThoughts: message.input.totalThoughts
        }
      };
    }
    return { type: 'ERROR', error: 'Unknown message type' };
  }
}

/**
 * Performance measurement helper
 */
export class PerformanceMeasurer {
  private marks = new Map<string, number>();
  private measures = new Map<string, number[]>();

  mark(name: string): void {
    this.marks.set(name, Date.now());
  }

  measure(name: string, startMark: string, endMark?: string): number {
    const start = this.marks.get(startMark);
    const end = endMark ? this.marks.get(endMark) : Date.now();
    
    if (!start) {
      throw new Error(`Start mark not found: ${startMark}`);
    }
    if (endMark && !end) {
      throw new Error(`End mark not found: ${endMark}`);
    }

    const duration = (end || Date.now()) - start;
    
    if (!this.measures.has(name)) {
      this.measures.set(name, []);
    }
    this.measures.get(name)!.push(duration);
    
    return duration;
  }

  getAverageTime(name: string): number {
    const measures = this.measures.get(name) || [];
    if (measures.length === 0) return 0;
    return measures.reduce((a, b) => a + b, 0) / measures.length;
  }

  getPercentile(name: string, percentile: number): number {
    const measures = this.measures.get(name) || [];
    if (measures.length === 0) return 0;
    
    const sorted = [...measures].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  clear(): void {
    this.marks.clear();
    this.measures.clear();
  }
}

/**
 * Create a test response
 */
export function createTestResponse(overrides?: Partial<UltraThinkResponse>): UltraThinkResponse {
  return {
    thought: 'Test response thought',
    nextThoughtNeeded: false,
    thoughtNumber: 1,
    totalThoughts: 1,
    ...overrides
  };
}

/**
 * Assert response quality
 */
export function assertResponseQuality(
  response: UltraThinkResponse,
  minQuality = 0.7
): void {
  expect(response).toBeDefined();
  expect(response.thought).toBeDefined();
  expect(response.thought.length).toBeGreaterThan(0);
  
  if (response.metadata?.qualityScore) {
    expect(response.metadata.qualityScore.overall).toBeGreaterThanOrEqual(minQuality);
  }
}

/**
 * Create test data generator
 */
export class TestDataGenerator {
  private seed = 1;

  /**
   * Generate random thought
   */
  generateThought(): string {
    const thoughts = [
      'Analyze the impact of technology on society',
      'Explore solutions for climate change',
      'Discuss the future of artificial intelligence',
      'Evaluate renewable energy options',
      'Consider ethical implications of automation'
    ];
    return thoughts[this.seed++ % thoughts.length];
  }

  /**
   * Generate batch of inputs
   */
  generateBatch(size: number): UltraThinkInput[] {
    return Array.from({ length: size }, (_, i) => ({
      thought: this.generateThought(),
      nextThoughtNeeded: i < size - 1,
      thoughtNumber: i + 1,
      totalThoughts: size
    }));
  }
}

/**
 * Memory leak detector
 */
export class MemoryLeakDetector {
  private initialMemory: number;
  private samples: number[] = [];

  start(): void {
    if (global.gc) {
      global.gc();
    }
    this.initialMemory = process.memoryUsage().heapUsed;
    this.samples = [this.initialMemory];
  }

  sample(): void {
    if (global.gc) {
      global.gc();
    }
    this.samples.push(process.memoryUsage().heapUsed);
  }

  async detectLeak(threshold = 0.1): Promise<boolean> {
    if (this.samples.length < 2) {
      throw new Error('Not enough samples to detect leak');
    }

    // Calculate memory growth rate
    const firstHalf = this.samples.slice(0, Math.floor(this.samples.length / 2));
    const secondHalf = this.samples.slice(Math.floor(this.samples.length / 2));
    
    const avgFirst = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    const growthRate = (avgSecond - avgFirst) / avgFirst;
    
    return growthRate > threshold;
  }

  getReport(): {
    initialMemory: number;
    finalMemory: number;
    peakMemory: number;
    samples: number[];
  } {
    return {
      initialMemory: this.initialMemory,
      finalMemory: this.samples[this.samples.length - 1] || this.initialMemory,
      peakMemory: Math.max(...this.samples),
      samples: this.samples
    };
  }
}