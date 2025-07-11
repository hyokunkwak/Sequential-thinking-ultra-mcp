/**
 * Core interfaces for dependency inversion and loose coupling
 * These interfaces help break circular dependencies and improve testability
 */

import type { EventBus } from '../event-bus.js';
import type { Logger } from '../../utils/logger.js';

// Service registration interfaces
export interface IServiceContainer {
  register<T>(token: string | symbol, factory: () => T | Promise<T>, options?: { singleton?: boolean }): void;
  singleton<T>(token: string | symbol, instance: T): void;
  transient<T>(token: string | symbol, factory: () => T | Promise<T>): void;
  resolve<T>(token: string | symbol): T;
  resolveAsync<T>(token: string | symbol): Promise<T>;
  has(token: string | symbol): boolean;
  clear(): void;
}

// Plugin system interfaces
export interface IPlugin {
  name: string;
  version: string;
  dependencies?: string[];
  initialize(context: IPluginContext): Promise<void>;
  processThought?(input: any): Promise<any>;
  enhanceThought?(thought: string, metadata?: any): Promise<string>;
  calculateQuality?(thought: string, metadata?: any): Promise<number>;
  detectBias?(thought: string, history?: string[]): Promise<string | null>;
  validateThought?(input: any): Promise<boolean>;
  beforeProcess?(input: any): Promise<any>;
  afterProcess?(response: any): Promise<any>;
  shutdown?(): Promise<void>;
}

export interface IPluginContext {
  eventBus: EventBus;
  logger: Logger;
  container: IServiceContainer;
  config: Record<string, any>;
}

export interface IPluginManager {
  register(plugin: IPlugin): Promise<void>;
  unregister(pluginName: string): Promise<void>;
  get(pluginName: string): IPlugin | undefined;
  getAll(): IPlugin[];
  has(pluginName: string): boolean;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  executeHook<T>(hookName: string, input: T): Promise<T>;
}

// Metrics interfaces
export interface IMetricsCollector {
  increment(metric: string, tags?: Record<string, string>): void;
  gauge(metric: string, value: number, tags?: Record<string, string>): void;
  histogram(metric: string, value: number, tags?: Record<string, string>): void;
  timing(metric: string, duration: number, tags?: Record<string, string>): void;
  flush(): any;
  stop(): void;
}

// Service interfaces for dependency injection
export interface ISimilarityService {
  calculateSimilarity(text1: string, text2: string): number;
  detectPatterns(text: string, history: string[]): string | null;
}

export interface IBiasDetectorService {
  detectBias(thought: string, history: string[]): string | null;
}

export interface IQualityMetricsService {
  calculateQuality(thought: string, metadata?: any): {
    overall: number;
    consistency: number;
    completeness: number;
    objectivity: number;
    practicality: number;
  };
}