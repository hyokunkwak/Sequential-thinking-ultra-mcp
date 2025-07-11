/**
 * Core Ultra Think processor that implements the Sequential Thinking methodology
 * with Ultra Think enhancements for advanced reasoning capabilities.
 * 
 * @module processor
 * @description Handles the main processing logic for sequential thinking with features like:
 * - Serial/Parallel/Hybrid processing modes
 * - Automatic bias detection and correction
 * - Quality metrics tracking and validation
 * - Budget management and resource efficiency
 * - Plugin system integration
 * - Event-driven architecture support
 */

import { 
  UltraThinkInput, 
  UltraThinkResponse, 
  UltraThinkConfig,
  BudgetStatus
} from '../types/interfaces.js';
import type { ISimilarityService, IBiasDetectorService, IQualityMetricsService, IPluginManager, IMetricsCollector } from './interfaces/index.js';
import { Formatter } from './formatter.js';
import { Logger } from '../utils/logger.js';
import { HISTORY_LIMITS, META_REASONING } from '../config/constants.js';
import { EventBus, EventNames } from './event-bus.js';
import { ProcessingError, ResourceError, ErrorHandler } from './errors.js';
import { ProcessingPipeline } from './processing-pipeline.js';
import {
  InitializeStage,
  QueryOptimizationStage,
  HistoryTrackingStage,
  BiasDetectionStage,
  AutoLabelingStage,
  QualityAnalysisStage,
  BudgetCalculationStage,
  SuggestionStage,
  ThoughtEnhancementStage,
  ResponseBuildingStage,
  FinalizeStage
} from './pipeline-stages.js';

export interface ProcessorDependencies {
  similarityService?: ISimilarityService;
  biasDetector?: IBiasDetectorService;
  qualityMetrics?: IQualityMetricsService;
  queryRewriter?: any; // QueryRewritingService
  logger?: Logger;
}

export class UltraThinkProcessor {
  public readonly config: UltraThinkConfig;
  
  private thoughtHistory: Map<number, UltraThinkInput>;
  private branchHistory: Map<string, UltraThinkInput[]>;
  
  private similarityService: ISimilarityService;
  private biasDetector: IBiasDetectorService;
  private qualityMetrics: IQualityMetricsService;
  private queryRewriter?: any; // QueryRewritingService
  private logger: Logger;
  private eventBus?: EventBus;
  private pluginManager?: IPluginManager;
  private metricsCollector?: IMetricsCollector;

  constructor(
    config: Partial<UltraThinkConfig> = {},
    eventBus?: EventBus,
    pluginManager?: IPluginManager,
    metricsCollector?: IMetricsCollector,
    dependencies?: ProcessorDependencies
  ) {
    // Initialize configuration
    this.config = {
      enableAutoLabeling: true,
      enableQualityValidation: true,
      enableMetaReasoning: true,
      enableBudgetManagement: true,
      enableQueryRewriting: true,
      defaultBudgetMode: 'balanced',
      metaCheckpointFrequency: META_REASONING.DEFAULT_CHECKPOINT_FREQUENCY,
      maxParallelPaths: 4,
      qualityThreshold: 0.6,
      debugMode: false,
      ...config
    };

    // Initialize history
    this.thoughtHistory = new Map();
    this.branchHistory = new Map();

    // Initialize services from dependencies or throw error
    if (!dependencies?.similarityService || !dependencies?.biasDetector || 
        !dependencies?.qualityMetrics || !dependencies?.logger) {
      throw new Error('Required dependencies not provided. Use ProcessorFactory.createDefault() or provide all dependencies.');
    }
    
    this.similarityService = dependencies.similarityService;
    this.biasDetector = dependencies.biasDetector;
    this.qualityMetrics = dependencies.qualityMetrics;
    this.queryRewriter = dependencies.queryRewriter;
    this.logger = dependencies.logger;
    
    // Store optional services
    this.eventBus = eventBus;
    this.pluginManager = pluginManager;
    this.metricsCollector = metricsCollector;
    
  }

  /**
   * Process a thought with Ultra Think enhancements
   * @param {UltraThinkInput} input - The thought input to process
   * @returns {Promise<UltraThinkResponse>} The processed thought response
   * @throws {ProcessingError} If processing fails
   * @throws {ValidationError} If input validation fails
   * @async
   */
  async process(input: UltraThinkInput): Promise<UltraThinkResponse> {
      // Create and configure the processing pipeline
      const pipeline = new ProcessingPipeline();
      
      // Add stages in order
      pipeline
        .add(new InitializeStage(this.eventBus, this.pluginManager))
        .add(new QueryOptimizationStage(
          this.queryRewriter,
          this.config.enableQueryRewriting,
          this.logger
        ))
        .add(new HistoryTrackingStage(
          this.addToHistory.bind(this),
          this.addToBranchHistory.bind(this)
        ))
        .add(new BiasDetectionStage(
          this.biasDetector,
          this.thoughtHistory,
          this.eventBus,
          this.pluginManager
        ))
        .add(new AutoLabelingStage(this.config.enableAutoLabeling))
        .add(new QualityAnalysisStage(
          this.qualityMetrics,
          this.config.enableQualityValidation,
          this.config.qualityThreshold,
          this.eventBus,
          this.pluginManager
        ))
        .add(new BudgetCalculationStage(
          this.config.enableBudgetManagement,
          this.config.defaultBudgetMode
        ))
        .add(new SuggestionStage(
          this.qualityMetrics,
          this.config.qualityThreshold,
          this.config.maxParallelPaths
        ))
        .add(new ThoughtEnhancementStage(
          this.config.qualityThreshold,
          this.logger,
          this.config.debugMode || false
        ))
        .add(new ResponseBuildingStage())
        .add(new FinalizeStage(
          this.eventBus,
          this.pluginManager,
          this.metricsCollector
        ));
      
      // Execute the pipeline
      return await pipeline.execute(input);
  }


  // Note: Budget calculation and suggestion logic have been moved to pipeline stages
  // These methods are no longer needed here

  /**
   * Check if meta-reasoning checkpoint is needed
   */
  shouldTriggerMetaCheckpoint(input: UltraThinkInput): boolean {
    if (!this.config.enableMetaReasoning) return false;
    
    const progress = (input.thoughtNumber / input.totalThoughts) * 100;
    const checkpointInterval = this.config.metaCheckpointFrequency;
    
    return progress % checkpointInterval === 0 || 
           input.metaCheckpoint === true ||
           (input.qualityMetrics !== undefined && Object.keys(input.qualityMetrics).length > 0);
  }

  /**
   * Add thought to history with size limit
   */
  private addToHistory(thoughtNumber: number, input: UltraThinkInput): void {
    try {
      if (this.thoughtHistory.size >= HISTORY_LIMITS.MAX_HISTORY_SIZE) {
        const oldestKey = Math.min(...Array.from(this.thoughtHistory.keys()));
        this.thoughtHistory.delete(oldestKey);
        
        this.logger.debug('Removed oldest thought from history', { 
          oldestKey, 
          currentSize: this.thoughtHistory.size 
        });
      }
      this.thoughtHistory.set(thoughtNumber, input);
    } catch (error) {
      throw new ResourceError(
        'Failed to add thought to history',
        'memory',
        { thoughtNumber, historySize: this.thoughtHistory.size, error }
      );
    }
  }

  /**
   * Add to branch history with size limit
   */
  private addToBranchHistory(branchId: string, input: UltraThinkInput): void {
    try {
      const branch = this.branchHistory.get(branchId) || [];
      branch.push(input);
      
      if (branch.length > HISTORY_LIMITS.MAX_BRANCH_SIZE) {
        branch.shift();
        this.logger.debug('Trimmed branch history', { branchId, size: branch.length });
      }
      
      if (this.branchHistory.size >= HISTORY_LIMITS.MAX_BRANCHES && !this.branchHistory.has(branchId)) {
        const oldestBranch = this.branchHistory.keys().next().value;
        if (oldestBranch) {
          this.branchHistory.delete(oldestBranch);
        }
      }
      
      this.branchHistory.set(branchId, branch);
    } catch (error) {
      throw new ResourceError(
        'Failed to add branch to history',
        'memory',
        { branchId, branchSize: this.branchHistory.size, error }
      );
    }
  }

  // Note: Logging has been moved to ThoughtEnhancementStage in the pipeline

  /**
   * Clear history (useful for new sessions)
   */
  clearHistory(): void {
    this.thoughtHistory.clear();
    this.branchHistory.clear();
    if ('clearCache' in this.similarityService) {
      (this.similarityService as any).clearCache();
    }
  }

  /**
   * Get history statistics
   */
  getHistoryStats() {
    return {
      thoughtCount: this.thoughtHistory.size,
      branchCount: this.branchHistory.size,
      cacheStats: 'getCacheStats' in this.similarityService ? 
        (this.similarityService as any).getCacheStats() : 
        { size: 0, maxSize: 0 }
    };
  }
  
  
  /**
   * Shutdown the processor and cleanup resources
   * @public
   */
  async shutdown() {
    this.logger.info('Shutting down Ultra Think processor');
    
    
    // Clear all histories
    this.clearHistory();
    
    // Emit shutdown event
    this.eventBus?.emit(EventNames.PROCESSOR_SHUTDOWN, {});
  }
}

// Export alias for backward compatibility
export { UltraThinkProcessor as Processor };