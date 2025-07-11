/**
 * Core interfaces for the Ultra Think system
 */

export interface BaseThoughtInput {
  thought: string;
  nextThoughtNeeded: boolean;
  thoughtNumber: number;
  totalThoughts: number;
  isRevision?: boolean;
  revisesThought?: number;
  branchFromThought?: number;
  branchId?: string;
  needsMoreThoughts?: boolean;
}

export interface UltraThinkEnhancements {
  ultraThinkMode?: 'serial' | 'parallel' | 'hybrid';
  depthLevel?: number;
  maxDepth?: number;
  budgetMode?: 'fast' | 'balanced' | 'thorough' | 'exhaustive';
  budgetUsed?: number;
  confidence?: number;
  qualityMetrics?: QualityMetrics;
  metaCheckpoint?: boolean;
  biasDetected?: string;
  parallelPaths?: string[];
  pathConfidence?: Record<string, number>;
  priority?: number;
  enableQueryRewriting?: boolean;
  metadata?: Record<string, any>;
}

export interface QualityMetrics {
  logicalConsistency?: number;
  completeness?: number;
  objectivity?: number;
  practicality?: number;
}

export interface UltraThinkInput extends BaseThoughtInput, UltraThinkEnhancements {}

export interface UltraThinkResponse {
  thought: string;
  thoughtNumber: number;
  totalThoughts: number;
  nextThoughtNeeded: boolean;
  enhancedThought?: string;
  metadata?: ResponseMetadata;
}

export interface ResponseMetadata {
  ultraThinkMode?: string;
  depthLevel?: number;
  confidence?: number;
  qualityScore?: QualityScore;
  autoLabel?: string;
  budgetStatus?: BudgetStatus;
  suggestedNextStep?: string;
  biasDetected?: string | null;
  processingTime?: number;
  workerId?: string;
  error?: boolean;
  errorMessage?: string;
  biasWarning?: string;
  mode?: string;
  batchProcessed?: boolean;
  [key: string]: unknown;
}

export interface QualityScore {
  overall: number;
  metrics: {
    consistency: number;
    completeness: number;
    objectivity: number;
    practicality: number;
  };
}

export interface BudgetStatus {
  used: number;
  total: number;
  efficiency: string;
}

export interface ComplexityPreset {
  name: string;
  totalThoughts: number;
  maxThoughts: number;
  budgetMode: 'fast' | 'balanced' | 'thorough' | 'exhaustive';
  description: string;
}

export interface UltraThinkConfig {
  readonly enableAutoLabeling: boolean;
  readonly enableQualityValidation: boolean;
  readonly enableMetaReasoning: boolean;
  readonly enableBudgetManagement: boolean;
  readonly enableQueryRewriting: boolean;
  readonly defaultBudgetMode: 'fast' | 'balanced' | 'thorough' | 'exhaustive';
  readonly metaCheckpointFrequency: number;
  readonly maxParallelPaths: number;
  readonly qualityThreshold: number;
  readonly debugMode?: boolean;
}