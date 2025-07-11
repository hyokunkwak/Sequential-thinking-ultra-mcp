/**
 * Common type definitions
 * 
 * @module common-types
 * @description Shared type definitions to replace any types
 */

/**
 * Metadata for quality calculation
 */
export interface QualityCalculationMetadata {
  thoughtNumber: number;
  totalThoughts: number;
  confidence?: number;
  mode?: string;
  depthLevel?: number;
  [key: string]: unknown; // Allow additional properties
}

/**
 * Coercion input type
 */
export type CoercionInput = 
  | string 
  | number 
  | boolean 
  | null 
  | undefined
  | Record<string, unknown>
  | unknown[];

/**
 * Translation value type
 */
export type TranslationValue = string | TranslationDict;
export interface TranslationDict {
  [key: string]: TranslationValue;
}

/**
 * Translations object
 */
export interface Translations {
  [key: string]: TranslationValue;
}

/**
 * Logger data type
 */
export type LoggerData = 
  | string 
  | number 
  | boolean 
  | Error 
  | Record<string, unknown>
  | unknown[];

/**
 * Span attributes type
 */
export type SpanAttributes = Record<string, string | number | boolean | string[] | number[] | boolean[]>;

/**
 * CPU info type
 */
export interface CpuInfo {
  user: number;
  nice: number;
  sys: number;
  idle: number;
  irq: number;
}

/**
 * Resource snapshot type
 */
export interface ResourceSnapshot {
  timestamp: number;
  memory: {
    used: number;
    total: number;
    heapUsed: number;
    heapTotal: number;
  };
  cpu: {
    user: number;
    system: number;
    idle: number;
    loadAverage: number[];
  };
  disk?: {
    used: number;
    total: number;
  };
  network?: {
    rx: number;
    tx: number;
  };
}


/**
 * Plugin hook functions
 */
export interface PluginHooks {
  beforeProcess?: (input: unknown) => unknown | Promise<unknown>;
  afterProcess?: (response: unknown) => unknown | Promise<unknown>;
  onBiasDetected?: (biasType: string) => void | Promise<void>;
  onQualityCheck?: (score: unknown) => void | Promise<void>;
}


/**
 * Task queue item
 */
export interface QueueTask<T = unknown> {
  id: string;
  data: T;
  priority?: 'high' | 'normal' | 'low';
  timeout?: number;
  retries?: number;
  createdAt: number;
}

/**
 * Deep merge target types
 */
export type DeepMergeTarget = Record<string, unknown> | unknown[] | string | number | boolean | null | undefined;