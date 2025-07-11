/**
 * Logging utility with environment-aware configuration
 * Prevents sensitive information leakage in production
 */

import chalk from 'chalk';
import type { LoggerData } from '../types/common.js';

export interface LoggerConfig {
  separator?: string;
  separatorLength?: number;
}

export class Logger {
  private isProduction: boolean;
  private debugMode: boolean;
  private config: LoggerConfig;
  private sensitivePatterns: RegExp[] = [
    /\bapi[_-]?key\b/gi,
    /\bpassword\b/gi,
    /\bsecret\b/gi,
    /\btoken\b/gi,
    /\bcredential\b/gi,
    /bearer\s+[a-zA-Z0-9._-]+/gi,
    /\b[A-Za-z0-9+/]{40,}={0,2}\b/g, // Base64 secrets
    /\bsecret\d+\b/gi, // secret123 등의 패턴
  ];

  constructor(isProduction: boolean = false, debugMode: boolean = false, config: LoggerConfig = {}) {
    this.isProduction = isProduction;
    this.debugMode = debugMode;
    this.config = {
      separator: config.separator || '═',
      separatorLength: config.separatorLength || 80
    };
  }

  /**
   * Sanitize sensitive information from text
   */
  private sanitize(text: string): string {
    let sanitized = text;
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, (match) => {
        // Keep first 2 and last 2 characters for context
        if (match.length > 4) {
          return match.slice(0, 2) + '*'.repeat(match.length - 4) + match.slice(-2);
        }
        return '*'.repeat(match.length);
      });
    }
    return sanitized;
  }

  /**
   * Log debug information (only in non-production or debug mode)
   */
  debug(message: string, data?: LoggerData): void {
    if (!this.isProduction || this.debugMode) {
      const sanitizedMessage = this.sanitize(message);
      console.error(chalk.gray(`[DEBUG] ${sanitizedMessage}`));
      if (data !== undefined) {
        const sanitizedData = this.sanitize(JSON.stringify(data, null, 2));
        console.error(chalk.gray(sanitizedData));
      }
    }
  }

  /**
   * Log informational messages
   */
  info(message: string): void {
    const sanitizedMessage = this.sanitize(message);
    console.error(chalk.blue(`[INFO] ${sanitizedMessage}`));
  }

  /**
   * Log warning messages
   */
  warn(message: string): void {
    const sanitizedMessage = this.sanitize(message);
    console.error(chalk.yellow(`[WARN] ${sanitizedMessage}`));
  }

  /**
   * Log error messages
   */
  error(message: string, error?: Error): void {
    const sanitizedMessage = this.sanitize(message);
    console.error(chalk.red(`[ERROR] ${sanitizedMessage}`));
    if (error && !this.isProduction) {
      const sanitizedStack = this.sanitize(error.stack || error.message);
      console.error(chalk.red(sanitizedStack));
    }
  }

  /**
   * Log formatted thought output
   */
  logThought(
    thought: string,
    thoughtNumber: number,
    totalThoughts: number,
    mode?: string
  ): void {
    if (this.debugMode) {
      console.log('\n' + chalk.blue(this.config.separator!.repeat(this.config.separatorLength!)));
      
      if (mode) {
        console.log(chalk.cyan(`Ultra Think Mode: ${mode.toUpperCase()}`));
      }
      
      console.log(chalk.yellow(`Thought ${thoughtNumber}/${totalThoughts}:`));
      console.log(chalk.white(thought));
      
      console.log(chalk.blue(this.config.separator!.repeat(this.config.separatorLength!)));
    }
  }

  /**
   * Log quality metrics
   */
  logQualityMetrics(metrics: {
    overall: number;
    consistency: number;
    completeness: number;
    objectivity: number;
    practicality: number;
  }): void {
    if (this.debugMode) {
      console.log(chalk.green(`\nQuality Score: ${(metrics.overall * 100).toFixed(0)}%`));
      console.log(chalk.gray(`  Consistency: ${(metrics.consistency * 100).toFixed(0)}%`));
      console.log(chalk.gray(`  Completeness: ${(metrics.completeness * 100).toFixed(0)}%`));
      console.log(chalk.gray(`  Objectivity: ${(metrics.objectivity * 100).toFixed(0)}%`));
      console.log(chalk.gray(`  Practicality: ${(metrics.practicality * 100).toFixed(0)}%`));
    }
  }

  /**
   * Log budget status
   */
  logBudgetStatus(used: number, total: number, mode: string): void {
    if (this.debugMode) {
      const progress = (used / total * 100).toFixed(0);
      console.log(chalk.magenta(`\nBudget: ${progress}% used | Mode: ${mode}`));
    }
  }

  /**
   * Create a child logger with same configuration
   */
  child(prefix: string): Logger {
    const childLogger = new Logger(this.isProduction, this.debugMode, this.config);
    const originalDebug = childLogger.debug.bind(childLogger);
    const originalInfo = childLogger.info.bind(childLogger);
    const originalWarn = childLogger.warn.bind(childLogger);
    const originalError = childLogger.error.bind(childLogger);

    childLogger.debug = (message: string, data?: LoggerData) => originalDebug(`[${prefix}] ${message}`, data);
    childLogger.info = (message: string) => originalInfo(`[${prefix}] ${message}`);
    childLogger.warn = (message: string) => originalWarn(`[${prefix}] ${message}`);
    childLogger.error = (message: string, error?: Error) => originalError(`[${prefix}] ${message}`, error);

    return childLogger;
  }
}

// Singleton instance
let defaultLogger: Logger | null = null;

/**
 * Get or create the default logger instance
 */
export function getLogger(config?: LoggerConfig): Logger {
  if (!defaultLogger) {
    const isProduction = process.env.NODE_ENV === 'production';
    const debugMode = process.env.DEBUG_MODE === 'true';
    defaultLogger = new Logger(isProduction, debugMode, config);
  }
  return defaultLogger;
}