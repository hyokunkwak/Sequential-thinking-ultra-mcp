/**
 * Output formatting module
 * Handles all response formatting and presentation logic
 */

import { UltraThinkResponse, QualityScore } from '../types/interfaces.js';
import { QUALITY_THRESHOLDS } from '../config/constants.js';

export class Formatter {
  /**
   * Format the complete response for output
   */
  static formatResponse(response: UltraThinkResponse): string {
    let output = response.thought;
    
    // Add metadata if available
    if (response.metadata) {
      const metadataText = this.formatMetadata(response.metadata);
      if (metadataText) {
        output += '\n\n' + metadataText;
      }
    }
    
    return output;
  }

  /**
   * Format metadata section
   */
  private static formatMetadata(metadata: NonNullable<UltraThinkResponse['metadata']>): string {
    const sections: string[] = [];
    
    // Quality score
    if (metadata.qualityScore) {
      sections.push(this.formatQualityScore(metadata.qualityScore));
    }
    
    // Budget status
    if (metadata.budgetStatus) {
      sections.push(this.formatBudgetStatus(metadata.budgetStatus));
    }
    
    // Suggested next step
    if (metadata.suggestedNextStep) {
      sections.push(`🎯 Suggested Next: ${metadata.suggestedNextStep}`);
    }
    
    // Confidence
    if (metadata.confidence !== undefined) {
      sections.push(`🔍 Confidence: ${(metadata.confidence * 100).toFixed(0)}%`);
    }
    
    // Bias warning
    if (metadata.biasDetected) {
      sections.push(`⚠️ Bias Detected: ${metadata.biasDetected}`);
    }
    
    return sections.join('\n');
  }

  /**
   * Format quality score section
   */
  private static formatQualityScore(qualityScore: QualityScore): string {
    const percentage = (qualityScore.overall * 100).toFixed(0);
    let output = `📊 Quality Score: ${percentage}%`;
    
    // Add warning if below threshold
    if (qualityScore.overall < QUALITY_THRESHOLDS.MIN_QUALITY_SCORE) {
      const threshold = (QUALITY_THRESHOLDS.MIN_QUALITY_SCORE * 100).toFixed(0);
      output += ` (⚠️ Below ${threshold}% threshold)`;
    }
    
    return output;
  }

  /**
   * Format budget status
   */
  private static formatBudgetStatus(budgetStatus: { used: number; total: number; efficiency: string }): string {
    const percentage = ((budgetStatus.used / budgetStatus.total) * 100).toFixed(0);
    return `💰 Budget: ${budgetStatus.used}/${budgetStatus.total} (${percentage}% - ${budgetStatus.efficiency} mode)`;
  }

  /**
   * Generate auto label for thought
   */
  static generateAutoLabel(input: any): string {
    const labels: string[] = [];

    // Mode-specific labels
    if (input.ultraThinkMode === 'serial' && input.depthLevel && input.maxDepth) {
      labels.push(`[깊이 ${input.depthLevel}/${input.maxDepth}]`);
    } else if (input.ultraThinkMode === 'parallel' && input.branchId) {
      labels.push(`[경로 ${input.branchId}]`);
    } else if (input.ultraThinkMode === 'hybrid') {
      labels.push(this.getHybridModeLabel(input));
    }

    // Meta-reasoning label
    if (input.metaCheckpoint) {
      const percent = Math.round((input.thoughtNumber / input.totalThoughts) * 100);
      labels.push(`[메타 ${percent}%]`);
    }

    // Budget status label
    if (input.budgetMode && input.budgetUsed !== undefined) {
      labels.push(`[예산 ${input.budgetUsed}%]`);
    }

    // Revision label
    if (input.isRevision && input.revisesThought) {
      labels.push(`[수정 → ${input.revisesThought}]`);
    }

    // Bias detection label
    if (input.biasDetected) {
      labels.push(`[편향 감지]`);
    }

    return labels.join(' ');
  }

  /**
   * Get appropriate label for hybrid mode based on progress
   */
  private static getHybridModeLabel(input: any): string {
    const progress = input.thoughtNumber / input.totalThoughts;
    
    if (progress < 0.3) {
      return '[Hybrid: 탐색]';
    } else if (progress < 0.7) {
      return '[Hybrid: 심화]';
    } else {
      return '[Hybrid: 통합]';
    }
  }

  /**
   * Format error message with bilingual support
   */
  static formatError(error: string, koreanError?: string): string {
    if (koreanError) {
      return `${error} (${koreanError})`;
    }
    return error;
  }

  /**
   * Format validation errors for display
   */
  static formatValidationErrors(errors: string[]): string {
    return 'Input validation failed:\n' + errors.map(e => `  • ${e}`).join('\n');
  }

  /**
   * Enhance thought with auto label
   */
  static enhanceThought(thought: string, autoLabel?: string): string {
    if (autoLabel) {
      return `${autoLabel} ${thought}`;
    }
    return thought;
  }

  /**
   * Add quality warning to thought if needed
   */
  static addQualityWarning(
    thought: string, 
    qualityScore: QualityScore, 
    threshold: number
  ): string {
    if (qualityScore.overall < threshold) {
      const qualityPercent = (qualityScore.overall * 100).toFixed(0);
      const thresholdPercent = (threshold * 100).toFixed(0);
      const warning = `\n⚠️ 품질 경고: ${qualityPercent}% (임계값: ${thresholdPercent}%)`;
      return thought + warning;
    }
    return thought;
  }
}