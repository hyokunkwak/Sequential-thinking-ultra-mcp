/**
 * Input validation module for Ultra Think processor
 * 
 * @module validator
 * @description Handles all validation logic including:
 * - Schema validation using Zod
 * - Business rule validation
 * - Type checking and coercion
 * - Detailed error formatting
 */

import { z } from 'zod';
import { UltraThinkInputSchema, UltraThinkInput } from '../types/schemas.js';
import { validateRequiredFields } from '../utils/type-coercion.js';
import { ValidationError, ErrorCodes } from './errors.js';

/**
 * Validator class for Ultra Think input validation
 * @class Validator
 * @public
 */
export class Validator {
  /**
   * Validate input against schema and business rules
   * @param {unknown} input - Raw input to validate
   * @returns {UltraThinkInput} Validated and typed input
   * @throws {ValidationError} If validation fails
   * @static
   */
  static validateInput(input: unknown): UltraThinkInput {
    // Check required fields first
    const fieldErrors = validateRequiredFields(input);
    if (fieldErrors.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${fieldErrors.join(', ')}`,
        { fields: fieldErrors, code: ErrorCodes.MISSING_REQUIRED_FIELD }
      );
    }

    try {
      // Validate against Zod schema
      const validated = UltraThinkInputSchema.parse(input);
      
      // Additional business rule validations
      const businessErrors = this.validateBusinessRules(validated);
      if (businessErrors.length > 0) {
        throw new ValidationError(
          `Business rule validation failed: ${businessErrors[0]}`,
          { errors: businessErrors, code: ErrorCodes.INVALID_INPUT }
        );
      }

      return validated;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      
      if (error instanceof z.ZodError) {
        const zodErrors = this.formatZodErrors(error);
        throw new ValidationError(
          zodErrors[0],
          { errors: zodErrors, code: ErrorCodes.TYPE_MISMATCH }
        );
      }
      
      throw new ValidationError(
        'Unexpected validation error',
        { originalError: error }
      );
    }
  }

  /**
   * Validate business rules not covered by schema
   * @param {UltraThinkInput} input - Input to validate
   * @returns {string[]} Array of validation error messages
   * @private
   * @static
   */
  private static validateBusinessRules(input: UltraThinkInput): string[] {
    const errors: string[] = [];

    // Check depth level consistency
    if (input.ultraThinkMode === 'serial') {
      if (input.depthLevel && input.maxDepth) {
        if (input.depthLevel > input.maxDepth) {
          errors.push('Depth level cannot exceed maximum depth');
        }
      }
    }

    // Check budget constraints
    if (input.budgetUsed !== undefined) {
      if (input.budgetUsed > 100) {
        errors.push('Budget used cannot exceed 100%');
      }
      if (input.budgetUsed < 0) {
        errors.push('Budget used cannot be negative');
      }
    }

    // Check thought number consistency
    if (input.thoughtNumber > input.totalThoughts && !input.needsMoreThoughts) {
      errors.push('Thought number exceeds total thoughts without needsMoreThoughts flag');
    }

    // Check revision consistency
    if (input.isRevision && !input.revisesThought) {
      errors.push('Revision must specify which thought is being revised');
    }

    // Check branch consistency
    if (input.branchId && !input.branchFromThought) {
      errors.push('Branch must specify branching point');
    }


    return errors;
  }

  /**
   * Format Zod errors for user-friendly display
   * @param {z.ZodError} error - Zod validation error
   * @returns {string[]} Formatted error messages
   * @private
   * @static
   */
  private static formatZodErrors(error: z.ZodError): string[] {
    return error.errors.map(e => {
      const path = e.path.join('.');
      const field = path || 'input';
      
      switch (e.code) {
        case 'invalid_type':
          return `Parameter '${field}' has wrong type. Expected ${e.expected} but received ${e.received}`;
          
        case 'too_small': {
          const issue = e as z.ZodIssueOptionalMessage & { minimum?: number | string };
          return `Parameter '${field}' value is too small. Minimum is ${issue.minimum ?? 'unknown'}`;
        }
          
        case 'too_big': {
          const issue = e as z.ZodIssueOptionalMessage & { maximum?: number | string };
          return `Parameter '${field}' value is too large. Maximum is ${issue.maximum ?? 'unknown'}`;
        }
          
        case 'invalid_enum_value': {
          const issue = e as z.ZodIssueOptionalMessage & { options?: readonly string[] };
          return `Parameter '${field}' has invalid value. Valid options: ${issue.options?.join(', ') ?? 'unknown'}`;
        }
          
        default:
          return `Parameter '${field}': ${e.message}`;
      }
    });
  }

  /**
   * Validate depth level progression
   * @throws {ValidationError} If depth progression is invalid
   */
  static validateDepthProgression(
    currentDepth: number, 
    previousDepth: number | undefined
  ): void {
    if (previousDepth === undefined) return;
    
    // Depth can only increase by 1 or reset to 1
    const isValid = currentDepth === previousDepth + 1 || currentDepth === 1;
    if (!isValid) {
      throw new ValidationError(
        `Invalid depth progression: ${previousDepth} -> ${currentDepth}`,
        { currentDepth, previousDepth, code: ErrorCodes.OUT_OF_RANGE }
      );
    }
  }

  /**
   * Validate quality metrics values
   * @throws {ValidationError} If quality metrics are invalid
   */
  static validateQualityMetrics(metrics: unknown): void {
    if (!metrics || typeof metrics !== 'object') {
      throw new ValidationError(
        'Quality metrics must be an object',
        { received: typeof metrics, code: ErrorCodes.TYPE_MISMATCH }
      );
    }
    
    const validMetrics = [
      'logicalConsistency',
      'completeness',
      'objectivity',
      'practicality'
    ];
    
    const metricsObj = metrics as Record<string, unknown>;
    
    for (const metric of validMetrics) {
      if (metric in metricsObj) {
        const value = metricsObj[metric];
        if (typeof value !== 'number' || value < 0 || value > 5) {
          throw new ValidationError(
            `Quality metric '${metric}' must be a number between 0 and 5`,
            { metric, value, code: ErrorCodes.OUT_OF_RANGE }
          );
        }
      }
    }
  }
}