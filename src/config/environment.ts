/**
 * Environment configuration and validation
 * Handles all environment variable parsing and defaults
 */

export interface EnvironmentConfig {
  enableAutoLabeling: boolean;
  enableQualityValidation: boolean;
  enableMetaReasoning: boolean;
  enableBudgetManagement: boolean;
  enableQueryRewriting: boolean;
  defaultBudgetMode: 'fast' | 'balanced' | 'thorough' | 'exhaustive';
  metaCheckpointFrequency: number;
  qualityThreshold: number;
  debugMode: boolean;
  isProduction: boolean;
}

/**
 * Parse environment variables with proper defaults
 */
export function loadEnvironmentConfig(): EnvironmentConfig {
  return {
    enableAutoLabeling: parseBoolean(process.env.ULTRA_THINK_AUTO_LABEL, true),
    enableQualityValidation: parseBoolean(process.env.ULTRA_THINK_QUALITY, true),
    enableMetaReasoning: parseBoolean(process.env.ULTRA_THINK_META, true),
    enableBudgetManagement: parseBoolean(process.env.ULTRA_THINK_BUDGET, true),
    enableQueryRewriting: parseBoolean(process.env.ENABLE_QUERY_REWRITING, true),
    defaultBudgetMode: parseBudgetMode(process.env.DEFAULT_BUDGET_MODE),
    metaCheckpointFrequency: parseInt(process.env.META_CHECKPOINT_FREQ || '25', 10),
    qualityThreshold: parseFloat(process.env.QUALITY_THRESHOLD || '0.6'),
    debugMode: parseBoolean(process.env.DEBUG_MODE, false),
    isProduction: process.env.NODE_ENV === 'production'
  };
}

/**
 * Parse boolean environment variables
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() !== 'false';
}

/**
 * Parse and validate budget mode
 */
function parseBudgetMode(value: string | undefined): 'fast' | 'balanced' | 'thorough' | 'exhaustive' {
  const validModes = ['fast', 'balanced', 'thorough', 'exhaustive'] as const;
  const mode = value as typeof validModes[number];
  
  if (validModes.includes(mode)) {
    return mode;
  }
  
  return 'balanced';
}

/**
 * Validate configuration values
 */
export function validateConfig(config: EnvironmentConfig): string[] {
  const errors: string[] = [];
  
  if (config.metaCheckpointFrequency < 1 || config.metaCheckpointFrequency > 100) {
    errors.push('META_CHECKPOINT_FREQ must be between 1 and 100');
  }
  
  if (config.qualityThreshold < 0 || config.qualityThreshold > 1) {
    errors.push('QUALITY_THRESHOLD must be between 0 and 1');
  }
  
  return errors;
}