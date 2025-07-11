/**
 * Quality metrics calculation service
 * Evaluates reasoning quality across multiple dimensions
 */

import { UltraThinkInput, QualityScore } from '../types/interfaces.js';
import { QUALITY_THRESHOLDS } from '../config/constants.js';
import type { QualityCalculationMetadata } from '../types/common.js';

export class QualityMetricsService {
  /**
   * Calculate comprehensive quality metrics
   */
  calculateQualityMetrics(
    input: UltraThinkInput,
    thoughtHistory: Map<number, UltraThinkInput>
  ): QualityScore {
    let consistency: number = QUALITY_THRESHOLDS.CONSISTENCY_BASE;
    let completeness: number = QUALITY_THRESHOLDS.COMPLETENESS_BASE;
    let objectivity: number = QUALITY_THRESHOLDS.OBJECTIVITY_BASE;
    let practicality: number = QUALITY_THRESHOLDS.PRACTICALITY_BASE;

    // Apply various quality factors
    consistency = this.evaluateConsistency(input, thoughtHistory, consistency);
    completeness = this.evaluateCompleteness(input, completeness);
    objectivity = this.evaluateObjectivity(input, objectivity);
    practicality = this.evaluatePracticality(input, practicality);

    // Apply manual quality metrics if provided
    if (input.qualityMetrics) {
      consistency = this.applyManualMetric(input.qualityMetrics.logicalConsistency, consistency);
      completeness = this.applyManualMetric(input.qualityMetrics.completeness, completeness);
      objectivity = this.applyManualMetric(input.qualityMetrics.objectivity, objectivity);
      practicality = this.applyManualMetric(input.qualityMetrics.practicality, practicality);
    }

    // Calculate overall score
    const overall = (consistency + completeness + objectivity + practicality) / 4;

    return {
      overall: Math.round(overall * 100) / 100,
      metrics: {
        consistency: Math.round(consistency * 100) / 100,
        completeness: Math.round(completeness * 100) / 100,
        objectivity: Math.round(objectivity * 100) / 100,
        practicality: Math.round(practicality * 100) / 100
      }
    };
  }

  /**
   * Evaluate consistency with previous thoughts
   */
  private evaluateConsistency(
    input: UltraThinkInput,
    thoughtHistory: Map<number, UltraThinkInput>,
    baseScore: number
  ): number {
    let score = baseScore;

    // Revisions typically improve consistency
    if (input.isRevision) {
      score = Math.min(0.9, score + 0.1);
    }

    // Bonus for maintaining context
    if (input.thoughtNumber > 1 && thoughtHistory.has(input.thoughtNumber - 1)) {
      score = Math.min(1.0, score + 0.1);
    }

    // Check for logical flow
    if (input.branchId && input.branchFromThought) {
      const parentThought = thoughtHistory.get(input.branchFromThought);
      if (parentThought) {
        score = Math.min(0.95, score + 0.05);
      }
    }

    return score;
  }

  /**
   * Evaluate completeness of analysis
   */
  private evaluateCompleteness(input: UltraThinkInput, baseScore: number): number {
    let score = baseScore;
    const progressRatio = input.thoughtNumber / input.totalThoughts;

    // Progress bonus
    if (progressRatio > 0.5) {
      score = Math.min(0.9, score + progressRatio * 0.2);
    }

    // Mode bonus (visual label only)
    if (input.ultraThinkMode === 'parallel') {
      score = Math.min(1.0, score + 0.1);
    }

    // Depth bonus for serial mode
    if (input.ultraThinkMode === 'serial' && input.depthLevel && input.maxDepth) {
      const depthRatio = input.depthLevel / input.maxDepth;
      score = Math.min(0.95, score + depthRatio * 0.15);
    }

    return score;
  }

  /**
   * Evaluate objectivity and bias
   */
  private evaluateObjectivity(input: UltraThinkInput, baseScore: number): number {
    let score = baseScore;

    // Penalty for detected bias
    if (input.biasDetected) {
      score = Math.max(0.5, score - 0.25);
    }

    // Bonus for branch tracking
    if (input.branchId) {
      score = Math.min(0.95, score + 0.1);
    }

    // Meta-reasoning improves objectivity
    if (input.metaCheckpoint) {
      score = Math.min(1.0, score + 0.05);
    }

    return score;
  }

  /**
   * Evaluate practical applicability
   */
  private evaluatePracticality(input: UltraThinkInput, baseScore: number): number {
    let score = baseScore;

    // Use confidence as practicality indicator
    if (input.confidence !== undefined) {
      score = input.confidence;
    }

    // Fast mode focuses on practical solutions
    if (input.budgetMode === 'fast') {
      score = Math.max(0.7, score);
    }

    // Exhaustive mode may sacrifice some practicality for completeness
    if (input.budgetMode === 'exhaustive') {
      score = Math.max(0.6, score - 0.1);
    }

    return score;
  }

  /**
   * Apply manual metric if provided
   */
  private applyManualMetric(manualValue: number | undefined, calculatedValue: number): number {
    if (manualValue !== undefined && manualValue >= 0 && manualValue <= 5) {
      return manualValue / 5;
    }
    return calculatedValue;
  }

  /**
   * Find the weakest quality dimension
   */
  findWeakestMetric(metrics: QualityScore['metrics']): keyof QualityScore['metrics'] {
    const entries = Object.entries(metrics) as Array<[keyof QualityScore['metrics'], number]>;
    return entries.reduce((weakest, [key, value]) => 
      value < metrics[weakest] ? key : weakest
    , 'consistency' as keyof QualityScore['metrics']);
  }

  /**
   * Check if quality meets threshold
   */
  meetsQualityThreshold(qualityScore: QualityScore, threshold: number): boolean {
    return qualityScore.overall >= threshold;
  }

  /**
   * Get improvement suggestion based on metrics
   */
  getImprovementSuggestion(metrics: QualityScore['metrics']): string {
    const weakestMetric = this.findWeakestMetric(metrics);
    
    const suggestions = {
      consistency: '일관성 개선 필요: 이전 사고들과의 논리적 연결 강화',
      completeness: '완전성 개선 필요: 누락된 측면이나 고려사항 추가 분석',
      objectivity: '객관성 개선 필요: 다른 관점 고려 또는 편향 제거',
      practicality: '실용성 개선 필요: 구체적이고 실행 가능한 해결책 제시'
    };

    return suggestions[weakestMetric];
  }

  /**
   * Calculate quality score (interface method)
   * @param {string} thought - The thought to analyze
   * @param {QualityCalculationMetadata} metadata - Optional metadata
   * @returns Quality score object
   */
  calculateQuality(thought: string, metadata?: QualityCalculationMetadata): {
    overall: number;
    clarity: number;
    relevance: number;
    depth: number;
  } {
    // Create a minimal UltraThinkInput for compatibility
    const input: UltraThinkInput = {
      thought,
      thoughtNumber: 1,
      totalThoughts: 1,
      nextThoughtNeeded: false,
      ...metadata
    };
    
    const score = this.calculateQualityMetrics(input, new Map());
    
    return {
      overall: score.overall,
      clarity: score.metrics.consistency,
      relevance: score.metrics.practicality,
      depth: score.metrics.completeness
    };
  }
}