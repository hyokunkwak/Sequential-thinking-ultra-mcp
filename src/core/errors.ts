/**
 * Centralized Error Handling System
 * 
 * @module errors
 * @description Provides consistent error management across the application with:
 * - Typed error classes for different error categories
 * - Error code constants for standardization
 * - Error handler utilities for wrapping functions
 * - Recovery strategies including retry and circuit breaker patterns
 */

/**
 * Base application error class that all custom errors extend from
 * @class ApplicationError
 * @extends Error
 * @public
 */
export class ApplicationError extends Error {
  /**
   * Creates an ApplicationError instance
   * @param {string} code - Unique error code for identification
   * @param {number} statusCode - HTTP status code for the error
   * @param {string} message - Human-readable error message
   * @param {any} [details] - Additional error context and details
   */
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message: string,
    public readonly details?: any
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Serialize error to JSON format for logging and API responses
   * @returns {Object} JSON representation of the error
   */
  toJSON() {
    return {
      name: this.name,
      code: this.code,
      statusCode: this.statusCode,
      message: this.message,
      details: this.details,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Error thrown when input validation fails
 * @class ValidationError
 * @extends ApplicationError
 * @public
 */
export class ValidationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('VALIDATION_ERROR', 400, message, details);
  }
}

/**
 * Error thrown when business logic processing fails
 * @class ProcessingError  
 * @extends ApplicationError
 * @public
 */
export class ProcessingError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('PROCESSING_ERROR', 500, message, details);
  }
}

/**
 * Configuration error for invalid configurations
 */
export class ConfigurationError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('CONFIGURATION_ERROR', 500, message, details);
  }
}

/**
 * Plugin error for plugin-related failures
 */
export class PluginError extends ApplicationError {
  constructor(message: string, pluginName: string, details?: any) {
    super('PLUGIN_ERROR', 500, message, { pluginName, ...details });
  }
}

/**
 * Resource error for resource limitations
 */
export class ResourceError extends ApplicationError {
  constructor(message: string, resourceType: string, details?: any) {
    super('RESOURCE_ERROR', 507, message, { resourceType, ...details });
  }
}

/**
 * Timeout error for operation timeouts
 */
export class TimeoutError extends ApplicationError {
  constructor(message: string, operation: string, timeoutMs: number) {
    super('TIMEOUT_ERROR', 408, message, { operation, timeoutMs });
  }
}

/**
 * Base error alias for backward compatibility
 */
export class BaseError extends ApplicationError {}

/**
 * Security error for security-related issues
 */
export class SecurityError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('SECURITY_ERROR', 403, message, details);
  }
}

/**
 * Performance error for performance-related issues
 */
export class PerformanceError extends ApplicationError {
  constructor(message: string, details?: any) {
    super('PERFORMANCE_ERROR', 500, message, details);
  }
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

/**
 * Error codes enumeration
 */
export const ErrorCodes = {
  // Validation errors
  INVALID_INPUT: 'INVALID_INPUT',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  TYPE_MISMATCH: 'TYPE_MISMATCH',
  OUT_OF_RANGE: 'OUT_OF_RANGE',
  
  // Processing errors
  PROCESSING_FAILED: 'PROCESSING_FAILED',
  QUALITY_THRESHOLD_NOT_MET: 'QUALITY_THRESHOLD_NOT_MET',
  BIAS_DETECTION_FAILED: 'BIAS_DETECTION_FAILED',
  
  // Resource errors
  MEMORY_LIMIT_EXCEEDED: 'MEMORY_LIMIT_EXCEEDED',
  HISTORY_LIMIT_EXCEEDED: 'HISTORY_LIMIT_EXCEEDED',
  CACHE_FULL: 'CACHE_FULL',
  
  // Plugin errors
  PLUGIN_NOT_FOUND: 'PLUGIN_NOT_FOUND',
  PLUGIN_INITIALIZATION_FAILED: 'PLUGIN_INITIALIZATION_FAILED',
  PLUGIN_EXECUTION_FAILED: 'PLUGIN_EXECUTION_FAILED',
  
  // System errors
  CONFIGURATION_INVALID: 'CONFIGURATION_INVALID',
  SERVICE_UNAVAILABLE: 'SERVICE_UNAVAILABLE',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const;

/**
 * Error handler utility
 */
export class ErrorHandler {
  private static loggers = new Map<string, (error: ApplicationError) => void>();
  
  /**
   * Register an error logger
   */
  static registerLogger(name: string, logger: (error: ApplicationError) => void): void {
    this.loggers.set(name, logger);
  }
  
  /**
   * Handle an error with logging and formatting
   */
  static handle(error: unknown): ApplicationError {
    let appError: ApplicationError;
    
    if (error instanceof ApplicationError) {
      appError = error;
    } else if (error instanceof Error) {
      appError = new ApplicationError(
        ErrorCodes.INTERNAL_ERROR,
        500,
        error.message,
        { originalError: error.name }
      );
    } else {
      appError = new ApplicationError(
        ErrorCodes.INTERNAL_ERROR,
        500,
        'An unknown error occurred',
        { error: String(error) }
      );
    }
    
    // Log to all registered loggers
    this.loggers.forEach(logger => logger(appError));
    
    return appError;
  }
  
  /**
   * Create a wrapped async function with error handling
   */
  static wrapAsync<T extends (...args: any[]) => Promise<any>>(
    fn: T,
    context?: string
  ): T {
    return (async (...args: Parameters<T>) => {
      try {
        return await fn(...args);
      } catch (error) {
        const appError = this.handle(error);
        if (context && appError instanceof ApplicationError) {
          // Create new error with context
          throw new ApplicationError(
            appError.code,
            appError.statusCode,
            appError.message,
            { ...appError.details, context }
          );
        }
        throw appError;
      }
    }) as T;
  }
  
  /**
   * Create a wrapped sync function with error handling
   */
  static wrapSync<T extends (...args: any[]) => any>(
    fn: T,
    context?: string
  ): T {
    return ((...args: Parameters<T>) => {
      try {
        return fn(...args);
      } catch (error) {
        const appError = this.handle(error);
        if (context && appError instanceof ApplicationError) {
          // Create new error with context
          throw new ApplicationError(
            appError.code,
            appError.statusCode,
            appError.message,
            { ...appError.details, context }
          );
        }
        throw appError;
      }
    }) as T;
  }
}

/**
 * Error recovery strategies
 */
export class ErrorRecovery {
  /**
   * Retry with exponential backoff
   */
  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;
    
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw new ProcessingError(
      `Operation failed after ${maxRetries} retries`,
      { lastError: lastError?.message, maxRetries }
    );
  }
  
  /**
   * Circuit breaker pattern
   */
  static createCircuitBreaker<T>(
    operation: () => Promise<T>,
    threshold: number = 5,
    resetTimeout: number = 60000
  ) {
    let failures = 0;
    let lastFailureTime = 0;
    let isOpen = false;
    
    return async (): Promise<T> => {
      // Check if circuit should be reset
      if (isOpen && Date.now() - lastFailureTime > resetTimeout) {
        failures = 0;
        isOpen = false;
      }
      
      // If circuit is open, fail fast
      if (isOpen) {
        throw new ProcessingError(
          'Circuit breaker is open',
          { failures, threshold }
        );
      }
      
      try {
        const result = await operation();
        failures = 0; // Reset on success
        return result;
      } catch (error) {
        failures++;
        lastFailureTime = Date.now();
        
        if (failures >= threshold) {
          isOpen = true;
        }
        
        throw error;
      }
    };
  }
}