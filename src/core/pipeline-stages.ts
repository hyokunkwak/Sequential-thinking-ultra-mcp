/**
 * Pipeline stages for Ultra Think processing
 * 
 * @module pipeline-stages
 * @description Individual processing stages that can be composed into a pipeline
 */

import { BasePipelineStage, ProcessingContext } from './processing-pipeline.js';
import { EventBus, EventNames } from './event-bus.js';
import { IPluginManager } from './interfaces/index.js';
import { IBiasDetectorService, IQualityMetricsService } from './interfaces/index.js';
import { Formatter } from './formatter.js';
import { Logger } from '../utils/logger.js';
import type { UltraThinkInput, QualityScore } from '../types/interfaces.js';
import type { IMetricsCollector } from './interfaces/index.js';
import { QueryRewritingService } from '../services/query-rewriting.service.js';

/**
 * Initialize processing stage
 */
export class InitializeStage extends BasePipelineStage {
  constructor(
    private eventBus?: EventBus,
    private pluginManager?: IPluginManager
  ) {
    super('initialize');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    // Emit processing event
    this.eventBus?.emit(EventNames.THOUGHT_PROCESSING, { 
      input: context.input, 
      timestamp: new Date() 
    });
    
    // Apply beforeProcess plugin hook
    if (this.pluginManager) {
      context.input = await this.pluginManager.executeHook('beforeProcess', context.input);
    }
    
    return context;
  }
}

/**
 * Query optimization stage - rewrites and improves query clarity
 */
export class QueryOptimizationStage extends BasePipelineStage {
  constructor(
    private queryRewriter: QueryRewritingService | undefined,
    private enableQueryRewriting: boolean,
    private logger?: Logger
  ) {
    super('query-optimization');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!this.enableQueryRewriting || !this.queryRewriter) {
      return context;
    }
    
    try {
      const result = await this.queryRewriter.rewriteQuery(context.input.thought);
      
      // Only apply rewriting if it improves the query
      if (result.improvements.length > 0 && result.confidence > 0.7) {
        context.input.thought = result.rewrittenQuery;
        
        // Store metadata about the rewriting
        context.metadata.queryRewriting = {
          originalQuery: result.originalQuery,
          rewrittenQuery: result.rewrittenQuery,
          improvements: result.improvements,
          confidence: result.confidence
        };
        
        if (this.logger) {
          this.logger.info(`Query optimized with ${result.improvements.length} improvements`);
        }
      }
    } catch (error) {
      // Log error but don't fail the pipeline
      if (this.logger) {
        this.logger.debug('Query optimization failed', { error });
      }
      // Continue with original query
    }
    
    return context;
  }
}

/**
 * History tracking stage
 */
export class HistoryTrackingStage extends BasePipelineStage {
  constructor(
    private addToHistory: (thoughtNumber: number, input: UltraThinkInput) => void,
    private addToBranchHistory: (branchId: string, input: UltraThinkInput) => void
  ) {
    super('history-tracking');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    this.addToHistory(context.input.thoughtNumber, context.input);
    
    if (context.input.branchId) {
      this.addToBranchHistory(context.input.branchId, context.input);
    }
    
    return context;
  }
}

/**
 * Bias detection stage
 */
export class BiasDetectionStage extends BasePipelineStage {
  constructor(
    private biasDetector: IBiasDetectorService,
    private thoughtHistory: Map<number, UltraThinkInput>,
    private eventBus?: EventBus,
    private pluginManager?: IPluginManager
  ) {
    super('bias-detection');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const history = Array.from(this.thoughtHistory.values()).map(t => t.thought);
    const detectedBias = await this.biasDetector.detectBias(context.input.thought, history);
    
    if (detectedBias && !context.input.biasDetected) {
      context.input.biasDetected = detectedBias;
      context.metadata.detectedBias = detectedBias;
      
      // Emit bias detected event
      this.eventBus?.emit(EventNames.BIAS_DETECTED, {
        biasType: detectedBias,
        thoughtNumber: context.input.thoughtNumber,
        confidence: context.input.confidence || 0
      });
      
      // Plugin hook
      this.pluginManager?.executeHook('onBiasDetected', detectedBias);
    }
    
    return context;
  }
}

/**
 * Auto labeling stage
 */
export class AutoLabelingStage extends BasePipelineStage {
  constructor(private enableAutoLabeling: boolean) {
    super('auto-labeling');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (this.enableAutoLabeling) {
      context.metadata.autoLabel = Formatter.generateAutoLabel(context.input);
    }
    return context;
  }
}

/**
 * Quality analysis stage
 */
export class QualityAnalysisStage extends BasePipelineStage {
  constructor(
    private qualityMetrics: IQualityMetricsService,
    private enableQualityValidation: boolean,
    private qualityThreshold: number,
    private eventBus?: EventBus,
    private pluginManager?: IPluginManager
  ) {
    super('quality-analysis');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!this.enableQualityValidation) {
      return context;
    }
    
    const score = this.qualityMetrics.calculateQuality(context.input.thought, {
      thoughtNumber: context.input.thoughtNumber,
      totalThoughts: context.input.totalThoughts,
      confidence: context.input.confidence
    });
    
    // Convert to expected format
    const qualityScore = {
      overall: score.overall,
      metrics: {
        consistency: score.consistency,
        completeness: score.completeness,
        objectivity: score.objectivity,
        practicality: score.practicality
      }
    };
    
    context.metadata.qualityScore = qualityScore;
    
    // Emit quality warning if below threshold
    if (qualityScore.overall < this.qualityThreshold) {
      this.eventBus?.emit(EventNames.QUALITY_WARNING, {
        score: qualityScore,
        threshold: this.qualityThreshold,
        thoughtNumber: context.input.thoughtNumber
      });
    }
    
    // Plugin hook
    this.pluginManager?.executeHook('onQualityCheck', qualityScore);
    
    return context;
  }
}

/**
 * Budget calculation stage
 */
export class BudgetCalculationStage extends BasePipelineStage {
  constructor(
    private enableBudgetManagement: boolean,
    private defaultBudgetMode: string
  ) {
    super('budget-calculation');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    if (!this.enableBudgetManagement) {
      return context;
    }
    
    const used = context.input.thoughtNumber;
    const total = context.input.totalThoughts;
    const usageRatio = used / total;

    let efficiency = context.input.budgetMode || this.defaultBudgetMode;
    
    // Auto-adjust efficiency based on usage
    if (usageRatio >= 0.8 && context.input.nextThoughtNeeded) {
      efficiency = 'fast';
    } else if (usageRatio < 0.3 && efficiency === 'fast') {
      efficiency = 'balanced';
    }

    context.metadata.budgetStatus = { used, total, efficiency };
    return context;
  }
}

/**
 * Suggestion generation stage
 */
export class SuggestionStage extends BasePipelineStage {
  constructor(
    private qualityMetrics: IQualityMetricsService,
    private qualityThreshold: number
  ) {
    super('suggestion-generation');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    const progress = context.input.thoughtNumber / context.input.totalThoughts;
    
    // Quality-based suggestions
    if (context.metadata.qualityScore && 
        context.metadata.qualityScore.overall < this.qualityThreshold) {
      // Check if the service has the method
      if ('getImprovementSuggestion' in this.qualityMetrics) {
        const service = this.qualityMetrics as IQualityMetricsService & {
          getImprovementSuggestion(metrics: unknown): string;
        };
        context.metadata.suggestedNextStep = service
          .getImprovementSuggestion(context.metadata.qualityScore.metrics);
      } else {
        context.metadata.suggestedNextStep = 'Consider improving the quality of your analysis';
      }
    } else {
      // Mode-specific suggestions
      context.metadata.suggestedNextStep = this.getModeSuggestion(context.input, progress);
    }
    
    return context;
  }
  
  private getModeSuggestion(input: UltraThinkInput, progress: number): string {
    if (input.ultraThinkMode === 'serial') {
      if (input.depthLevel && input.maxDepth && input.depthLevel < input.maxDepth) {
        return `다음 깊이 레벨 (${input.depthLevel + 1}/${input.maxDepth})로 진행`;
      }
    } else if (input.ultraThinkMode === 'parallel') {
      return '다양한 접근법을 탐색 중';
    } else if (input.ultraThinkMode === 'hybrid') {
      return this.getHybridModeSuggestion(progress);
    }
    
    return this.getProgressSuggestion(progress);
  }
  
  private getHybridModeSuggestion(progress: number): string {
    if (progress < 0.3) {
      return '병렬 탐색으로 다양한 접근법 시도 (Hybrid: 초기 단계)';
    } else if (progress < 0.7) {
      return '선택된 경로를 순차적으로 심화 분석 (Hybrid: 심화 단계)';
    } else {
      return '모든 경로의 인사이트 통합 (Hybrid: 통합 단계)';
    }
  }
  
  private getProgressSuggestion(progress: number): string {
    if (progress < 0.3) {
      return '탐색 단계 계속 진행';
    } else if (progress < 0.7) {
      return '심화 분석 단계';
    } else if (progress < 0.9) {
      return '솔루션 통합 및 검증';
    } else {
      return '최종 정리 및 결론 도출';
    }
  }
}

/**
 * Thought enhancement stage
 */
export class ThoughtEnhancementStage extends BasePipelineStage {
  constructor(
    private qualityThreshold: number,
    private logger: Logger,
    private debugMode: boolean
  ) {
    super('thought-enhancement');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    // Enhance thought
    let enhancedThought = Formatter.enhanceThought(
      context.input.thought, 
      context.metadata.autoLabel
    );
    
    // Add quality warning if needed
    if (context.metadata.qualityScore) {
      enhancedThought = Formatter.addQualityWarning(
        enhancedThought, 
        context.metadata.qualityScore, 
        this.qualityThreshold
      );
    }
    
    context.metadata.enhancedThought = enhancedThought;
    
    // Log if debug mode
    if (this.debugMode) {
      this.logger.logThought(
        enhancedThought,
        context.input.thoughtNumber,
        context.input.totalThoughts,
        context.input.ultraThinkMode
      );
      
      if (context.metadata.qualityScore) {
        this.logger.logQualityMetrics({
          overall: context.metadata.qualityScore.overall,
          consistency: context.metadata.qualityScore.metrics.consistency,
          completeness: context.metadata.qualityScore.metrics.completeness,
          objectivity: context.metadata.qualityScore.metrics.objectivity,
          practicality: context.metadata.qualityScore.metrics.practicality
        });
      }
      
      if (context.metadata.budgetStatus) {
        this.logger.logBudgetStatus(
          context.metadata.budgetStatus.used,
          context.metadata.budgetStatus.total,
          context.metadata.budgetStatus.efficiency
        );
      }
    }
    
    return context;
  }
}

/**
 * Response building stage
 */
export class ResponseBuildingStage extends BasePipelineStage {
  constructor() {
    super('response-building');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    context.response = {
      thought: context.metadata.enhancedThought!,
      thoughtNumber: context.input.thoughtNumber,
      totalThoughts: context.input.totalThoughts,
      nextThoughtNeeded: context.input.nextThoughtNeeded,
      metadata: {
        ultraThinkMode: context.input.ultraThinkMode,
        depthLevel: context.input.depthLevel,
        confidence: context.input.confidence,
        qualityScore: context.metadata.qualityScore,
        autoLabel: context.metadata.autoLabel,
        budgetStatus: context.metadata.budgetStatus,
        suggestedNextStep: context.metadata.suggestedNextStep,
        biasDetected: context.metadata.detectedBias
      }
    };
    
    return context;
  }
}

/**
 * Finalize processing stage
 */
export class FinalizeStage extends BasePipelineStage {
  constructor(
    private eventBus?: EventBus,
    private pluginManager?: IPluginManager,
    private metricsCollector?: IMetricsCollector
  ) {
    super('finalize');
  }
  
  async execute(context: ProcessingContext): Promise<ProcessingContext> {
    // Apply afterProcess plugin hook
    if (this.pluginManager && context.response) {
      context.response = await this.pluginManager.executeHook('afterProcess', context.response);
    }
    
    // Emit processed event
    const processingTime = Date.now() - context.metadata.startTime;
    this.eventBus?.emit(EventNames.THOUGHT_PROCESSED, {
      input: context.input,
      response: context.response,
      processingTime,
      metrics: context.metadata.qualityScore
    });
    
    // Record metric
    this.metricsCollector?.timing('thought.processing', processingTime);
    
    return context;
  }
}