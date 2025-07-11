/**
 * Example plugins demonstrating the plugin system capabilities
 */

import { Plugin } from '../core/plugin-system.js';
import { UltraThinkInput, UltraThinkResponse } from '../types/interfaces.js';
import { EventNames } from '../core/event-bus.js';
import { QueryRewritingService } from '../services/query-rewriting.service.js';

/**
 * Korean Enhancement Plugin
 * Adds Korean language enhancements to responses
 */
export const KoreanEnhancementPlugin: Plugin = {
  name: 'korean-enhancement',
  version: '1.0.0',
  description: 'Enhances responses with Korean language support',
  author: 'Ultra Think Team',
  
  afterProcess(response: UltraThinkResponse): UltraThinkResponse {
    // Add Korean translation for common terms
    const translations: Record<string, string> = {
      'Continue analysis': '분석 계속 진행',
      'Deepen analysis': '심화 분석 필요',
      'Integrate insights': '인사이트 통합',
      'Verify solution': '솔루션 검증',
      'Exploration phase continues': '탐색 단계 계속 진행',
      'Deep analysis phase': '심화 분석 단계',
      'Solution integration and verification': '솔루션 통합 및 검증',
      'Final cleanup and conclusion': '최종 정리 및 결론 도출'
    };
    
    if (response.metadata?.suggestedNextStep) {
      const translated = translations[response.metadata.suggestedNextStep];
      if (translated) {
        response.metadata.suggestedNextStep = translated;
      }
    }
    
    return response;
  }
};

/**
 * Performance Tracking Plugin
 * Tracks and logs processing performance
 */
// Performance tracking plugin with internal state
const performanceStartTimes = new Map<number, number>();

export const PerformanceTrackingPlugin: Plugin = {
  name: 'performance-tracking',
  version: '1.0.0',
  description: 'Tracks processing performance metrics',
  
  onInit(context) {
    context.logger.info('Performance tracking plugin initialized');
  },
  
  beforeProcess(input: UltraThinkInput): void {
    // Store start time
    performanceStartTimes.set(input.thoughtNumber, Date.now());
  },
  
  afterProcess(response: UltraThinkResponse): void {
    const startTime = performanceStartTimes.get(response.thoughtNumber);
    
    if (startTime) {
      const processingTime = Date.now() - startTime;
      console.log(`🔍 Thought ${response.thoughtNumber} processed in ${processingTime}ms`);
      performanceStartTimes.delete(response.thoughtNumber);
    }
  }
};

/**
 * Quality Enhancement Plugin
 * Automatically improves quality metrics
 */
export const QualityEnhancementPlugin: Plugin = {
  name: 'quality-enhancement',
  version: '1.0.0',
  description: 'Enhances quality metrics and provides suggestions',
  
  onQualityCheck(metrics) {
    if (metrics.overall < 0.6) {
      console.log('⚠️  Quality below threshold. Suggestions:');
      
      if (metrics.metrics.consistency < 3) {
        console.log('  - Improve consistency by aligning with previous thoughts');
      }
      if (metrics.metrics.completeness < 3) {
        console.log('  - Add more detail to make reasoning complete');
      }
      if (metrics.metrics.objectivity < 3) {
        console.log('  - Remove subjective language and focus on facts');
      }
      if (metrics.metrics.practicality < 3) {
        console.log('  - Make suggestions more actionable');
      }
    }
  }
};

/**
 * Auto-save Plugin
 * Saves thought history to a file
 */
// Auto-save plugin with internal state
const autoSaveThoughtHistory: any[] = [];

export const AutoSavePlugin: Plugin = {
  name: 'auto-save',
  version: '1.0.0',
  description: 'Auto-saves thought history for recovery',
  dependencies: ['performance-tracking'], // Example dependency
  
  async onInit(context) {
    // Subscribe to thought processed events
    context.eventBus.on(EventNames.THOUGHT_PROCESSED, async (event) => {
      autoSaveThoughtHistory.push({
        timestamp: new Date(),
        input: event.input,
        response: event.response,
        processingTime: event.processingTime
      });
      
      // In a real implementation, save to file
      context.logger.debug(`Auto-saved thought ${event.response.thoughtNumber}`);
    });
    
    context.logger.info('Auto-save plugin initialized');
  },
  
  async onDestroy() {
    // Save final state
    console.log('💾 Saving final thought history...');
  }
};

/**
 * Bias Alert Plugin
 * Provides enhanced bias detection alerts
 */
export const BiasAlertPlugin: Plugin = {
  name: 'bias-alert',
  version: '1.0.0',
  description: 'Enhanced bias detection and alerting',
  
  onBiasDetected(biasType, input) {
    const biasDescriptions: Record<string, string> = {
      confirmation: '확증 편향: 기존 믿음을 지지하는 정보만 찾고 있습니다',
      anchoring: '정박 편향: 초기 정보에 과도하게 의존하고 있습니다',
      availability: '가용성 편향: 쉽게 떠오르는 예시에만 집중하고 있습니다',
      overconfidence: '과신 편향: 불확실성을 충분히 고려하지 않고 있습니다',
      sunk_cost: '매몰 비용 편향: 이미 투자한 노력 때문에 잘못된 방향을 고수하고 있습니다'
    };
    
    const description = biasDescriptions[biasType] || biasType;
    console.log(`🚨 Bias Alert: ${description}`);
    console.log(`   Thought #${input.thoughtNumber}, Confidence: ${input.confidence || 'N/A'}`);
  }
};

/**
 * Budget Optimizer Plugin
 * Optimizes thinking budget usage
 */
export const BudgetOptimizerPlugin: Plugin = {
  name: 'budget-optimizer',
  version: '1.0.0',
  description: 'Optimizes thinking budget allocation',
  
  beforeProcess(input: UltraThinkInput): UltraThinkInput {
    // Auto-adjust budget mode based on progress
    const progress = input.thoughtNumber / input.totalThoughts;
    
    if (progress > 0.8 && input.nextThoughtNeeded && input.budgetMode !== 'fast') {
      console.log('⚡ Switching to fast mode to conserve budget');
      input.budgetMode = 'fast';
    } else if (progress < 0.3 && input.budgetMode === 'fast') {
      console.log('🔍 Early stage - switching to balanced mode');
      input.budgetMode = 'balanced';
    }
    
    return input;
  },
  
  onBudgetWarning(used, total) {
    const remaining = total - used;
    console.log(`⚠️  Budget Warning: ${remaining} thoughts remaining`);
    console.log(`   Consider switching to 'fast' mode or wrapping up analysis`);
  }
};

/**
 * Meta Reasoning Enhancement Plugin
 * Enhances meta-reasoning checkpoints
 */
export const MetaReasoningPlugin: Plugin = {
  name: 'meta-reasoning',
  version: '1.0.0',
  description: 'Enhanced meta-reasoning capabilities',
  
  onMetaCheckpoint(progress, input) {
    console.log(`\n🧠 Meta-Reasoning Checkpoint (${Math.round(progress * 100)}% complete)`);
    console.log(`   Mode: ${input.ultraThinkMode}`);
    console.log(`   Depth: ${input.depthLevel || 1}/${input.maxDepth || 'N/A'}`);
    console.log(`   Confidence: ${input.confidence || 'N/A'}`);
    
    // Provide strategic recommendations
    if (progress < 0.5) {
      console.log('   📋 Recommendation: Continue exploration, consider branching');
    } else if (progress < 0.8) {
      console.log('   📋 Recommendation: Begin converging on promising solutions');
    } else {
      console.log('   📋 Recommendation: Synthesize findings and prepare conclusions');
    }
  }
};

/**
 * Query Rewriting Plugin
 * Improves query clarity for better sequential thinking
 */
const queryRewritingService = new QueryRewritingService();

export const QueryRewritingPlugin: Plugin = {
  name: 'query-rewriting',
  version: '1.0.0',
  description: 'Rewrites queries for improved clarity and structure',
  author: 'Ultra Think Team',
  
  beforeProcess(input: UltraThinkInput): UltraThinkInput {
    // Only rewrite on the first thought
    if (input.thoughtNumber === 1) {
      // Note: Plugin hooks are synchronous, but we can still use the service
      // The actual async rewriting happens in the pipeline stage
      console.log('🔍 Query Rewriting Plugin: Checking query for improvements...');
      
      // The actual rewriting is handled by QueryOptimizationStage in the pipeline
      // This plugin just logs the activity
    }
    
    return input;
  }
};

/**
 * Export all plugins as a collection
 */
export const defaultPlugins = [
  KoreanEnhancementPlugin,
  PerformanceTrackingPlugin,
  QualityEnhancementPlugin,
  AutoSavePlugin,
  BiasAlertPlugin,
  BudgetOptimizerPlugin,
  MetaReasoningPlugin,
  QueryRewritingPlugin
];