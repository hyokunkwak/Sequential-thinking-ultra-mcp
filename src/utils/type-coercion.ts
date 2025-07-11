/**
 * Type coercion utilities for handling string-to-type conversions
 * Centralizes all type conversion logic for better maintainability
 */

import type { CoercionInput } from '../types/common.js';
import type { QualityMetrics } from '../types/interfaces.js';

/**
 * Convert string values to their appropriate types
 * Used to handle Claude Desktop's string-only parameter passing
 */
export function coerceArguments(args: CoercionInput): Record<string, unknown> {
  if (!args || typeof args !== 'object' || Array.isArray(args)) {
    return {};
  }
  
  const coerced = { ...(args as Record<string, unknown>) };

  // Boolean conversions
  const booleanFields = [
    'nextThoughtNeeded',
    'isRevision',
    'needsMoreThoughts',
    'metaCheckpoint'
  ];
  
  booleanFields.forEach(field => {
    if (field in coerced) {
      coerced[field] = convertToBoolean(coerced[field]);
    }
  });

  // Number conversions
  const numberFields = [
    'thoughtNumber',
    'totalThoughts',
    'revisesThought',
    'branchFromThought',
    'depthLevel',
    'maxDepth'
  ];

  numberFields.forEach(field => {
    if (field in coerced && typeof coerced[field] === 'string') {
      coerced[field] = parseInt(coerced[field], 10);
    }
  });

  // Float conversions
  const floatFields = ['budgetUsed', 'confidence'];
  
  floatFields.forEach(field => {
    if (field in coerced && typeof coerced[field] === 'string') {
      coerced[field] = parseFloat(coerced[field]);
    }
  });

  // Quality metrics conversion
  if (coerced.qualityMetrics) {
    coerced.qualityMetrics = coerceQualityMetrics(coerced.qualityMetrics);
  }

  // Path confidence conversion
  if (coerced.pathConfidence && typeof coerced.pathConfidence === 'object') {
    coerced.pathConfidence = coercePathConfidence(coerced.pathConfidence as Record<string, unknown>);
  }

  return coerced;
}

/**
 * Convert various representations to boolean
 */
function convertToBoolean(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowercased = value.toLowerCase();
    if (lowercased === 'true') return true;
    if (lowercased === 'false') return false;
  }
  return undefined;
}

/**
 * Convert quality metrics to proper number types
 */
function coerceQualityMetrics(metrics: unknown): Partial<QualityMetrics> | undefined {
  // Handle JSON string
  if (typeof metrics === 'string') {
    try {
      metrics = JSON.parse(metrics);
    } catch (e) {
      console.error('Failed to parse qualityMetrics as JSON:', e);
      return undefined;
    }
  }

  if (!metrics || typeof metrics !== 'object') {
    return undefined;
  }

  const metricFields = [
    'logicalConsistency',
    'completeness',
    'objectivity',
    'practicality'
  ];

  const coerced: Partial<QualityMetrics> = {};
  
  const metricsObj = metrics as Record<string, unknown>;
  
  metricFields.forEach(field => {
    if (field in metricsObj) {
      const value = metricsObj[field];
      const key = field as keyof QualityMetrics;
      coerced[key] = typeof value === 'string' ? parseFloat(value) : value as number;
    }
  });

  return coerced;
}

/**
 * Convert path confidence values to numbers
 */
function coercePathConfidence(pathConfidence: Record<string, unknown>): Record<string, number> {
  const coerced: Record<string, number> = {};
  
  for (const [key, value] of Object.entries(pathConfidence)) {
    coerced[key] = typeof value === 'string' ? parseFloat(value) : (value as number);
  }
  
  return coerced;
}

/**
 * Validate that required fields are present and of correct type
 */
export function validateRequiredFields(input: unknown): string[] {
  const errors: string[] = [];
  const required = ['thought', 'nextThoughtNeeded', 'thoughtNumber', 'totalThoughts'];
  
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return required.map(field => `Missing required field: ${field}`);
  }
  
  const obj = input as Record<string, unknown>;
  
  for (const field of required) {
    if (!(field in obj)) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Type checks after coercion
  if (typeof obj.thought !== 'string') {
    errors.push('Field "thought" must be a string');
  }
  
  if (typeof obj.nextThoughtNeeded !== 'boolean') {
    errors.push('Field "nextThoughtNeeded" must be a boolean');
  }
  
  if (typeof obj.thoughtNumber !== 'number' || isNaN(obj.thoughtNumber)) {
    errors.push('Field "thoughtNumber" must be a number');
  }
  
  if (typeof obj.totalThoughts !== 'number' || isNaN(obj.totalThoughts)) {
    errors.push('Field "totalThoughts" must be a number');
  }
  
  return errors;
}