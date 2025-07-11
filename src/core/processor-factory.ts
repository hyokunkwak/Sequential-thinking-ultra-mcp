/**
 * Factory for creating UltraThinkProcessor instances
 * Simple factory pattern without complex DI
 */

import { UltraThinkProcessor, ProcessorDependencies } from './processor.js';
import { UltraThinkConfig } from '../types/interfaces.js';
import { EventBus } from './event-bus.js';
import { SimilarityService } from '../services/similarity.service.js';
import { BiasDetectorService } from '../services/bias-detector.service.js';
import { QualityMetricsService } from '../services/quality-metrics.service.js';
import { QueryRewritingService } from '../services/query-rewriting.service.js';
import { Logger } from '../utils/logger.js';
import { PERFORMANCE } from '../config/constants.js';
import type { IPluginManager, IMetricsCollector } from './interfaces/index.js';

export interface ProcessorFactoryConfig extends Partial<UltraThinkConfig> {
  logger?: Logger;
  eventBus?: EventBus;
  pluginManager?: IPluginManager;
  metricsCollector?: IMetricsCollector;
  similarityService?: SimilarityService;
  biasDetectorService?: BiasDetectorService;
  qualityMetricsService?: QualityMetricsService;
  queryRewritingService?: QueryRewritingService;
}

export class ProcessorFactory {
  private config: ProcessorFactoryConfig;
  
  constructor(config: ProcessorFactoryConfig = {}) {
    this.config = config;
  }
  
  /**
   * Create a processor instance
   */
  createProcessor(): UltraThinkProcessor {
    const isProduction = process.env.NODE_ENV === 'production';
    const debugMode = this.config.debugMode ?? false;
    
    // Use provided services or create defaults
    const logger = this.config.logger || new Logger(isProduction, debugMode);
    const eventBus = this.config.eventBus || new EventBus();
    const similarityService = this.config.similarityService || 
      new SimilarityService(PERFORMANCE.CACHE_SIZE, eventBus);
    const biasDetector = this.config.biasDetectorService || 
      new BiasDetectorService(similarityService);
    const qualityMetrics = this.config.qualityMetricsService || 
      new QualityMetricsService();
    const queryRewriter = this.config.queryRewritingService || 
      new QueryRewritingService(logger);
    
    const dependencies: ProcessorDependencies = {
      similarityService,
      biasDetector: {
        detectBias: (thought: string, history: string[]) => 
          biasDetector.detectBiasFromStrings(thought, history)
      },
      qualityMetrics: {
        calculateQuality: (thought: string, metadata?: any) => {
          const result = qualityMetrics.calculateQuality(thought, metadata);
          // Adapt the response to match expected interface
          return {
            overall: result.overall,
            consistency: result.clarity, // Map clarity to consistency
            completeness: result.relevance, // Map relevance to completeness
            objectivity: result.depth, // Map depth to objectivity
            practicality: result.overall // Use overall as practicality
          };
        }
      },
      queryRewriter,
      logger
    };
    
    const processorConfig: UltraThinkConfig = {
      enableAutoLabeling: this.config.enableAutoLabeling ?? true,
      enableQualityValidation: this.config.enableQualityValidation ?? true,
      enableMetaReasoning: this.config.enableMetaReasoning ?? true,
      enableBudgetManagement: this.config.enableBudgetManagement ?? true,
      enableQueryRewriting: this.config.enableQueryRewriting ?? true,
      defaultBudgetMode: this.config.defaultBudgetMode ?? 'balanced',
      metaCheckpointFrequency: this.config.metaCheckpointFrequency ?? 25,
      qualityThreshold: this.config.qualityThreshold ?? 0.6,
      debugMode: this.config.debugMode
    };
    
    return new UltraThinkProcessor(
      processorConfig,
      eventBus,
      this.config.pluginManager,
      this.config.metricsCollector,
      dependencies
    );
  }
  
  /**
   * Create a processor with default services
   */
  static createDefault(
    config?: Partial<UltraThinkConfig>,
    eventBus?: EventBus,
    pluginManager?: IPluginManager,
    metricsCollector?: IMetricsCollector
  ): UltraThinkProcessor {
    const factory = new ProcessorFactory({
      ...config,
      eventBus,
      pluginManager,
      metricsCollector
    });
    
    return factory.createProcessor();
  }
}