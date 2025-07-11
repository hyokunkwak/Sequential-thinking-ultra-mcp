/**
 * Processing Pipeline for Ultra Think
 * 
 * @module processing-pipeline
 * @description Implements a pipeline pattern to break down complex processing into manageable stages
 */

import { UltraThinkInput, UltraThinkResponse, BudgetStatus, QualityScore } from '../types/interfaces.js';
import { ProcessingError } from './errors.js';

/**
 * Processing context that flows through the pipeline
 */
export interface ProcessingContext {
  input: UltraThinkInput;
  response?: Partial<UltraThinkResponse>;
  metadata: {
    startTime: number;
    detectedBias?: string;
    qualityScore?: QualityScore;
    budgetStatus?: BudgetStatus;
    autoLabel?: string;
    enhancedThought?: string;
    suggestedNextStep?: string;
    queryRewriting?: {
      originalQuery: string;
      rewrittenQuery: string;
      improvements: string[];
      confidence: number;
    };
  };
  error?: Error;
}

/**
 * Pipeline stage interface
 */
export interface PipelineStage {
  name: string;
  execute(context: ProcessingContext): Promise<ProcessingContext>;
}

/**
 * Processing pipeline executor
 */
export class ProcessingPipeline {
  private stages: PipelineStage[] = [];
  
  /**
   * Add a stage to the pipeline
   */
  add(stage: PipelineStage): ProcessingPipeline {
    this.stages.push(stage);
    return this;
  }
  
  /**
   * Execute all stages in sequence
   */
  async execute(input: UltraThinkInput): Promise<UltraThinkResponse> {
    let context: ProcessingContext = {
      input,
      metadata: {
        startTime: Date.now()
      }
    };
    
    // Execute each stage
    for (const stage of this.stages) {
      try {
        context = await stage.execute(context);
        
        // Check for early termination
        if (context.error) {
          throw context.error;
        }
      } catch (error) {
        throw new ProcessingError(
          `Pipeline stage '${stage.name}' failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          { 
            stage: stage.name, 
            thoughtNumber: input.thoughtNumber,
            originalError: error 
          }
        );
      }
    }
    
    // Ensure we have a complete response
    if (!context.response || !this.isCompleteResponse(context.response)) {
      throw new ProcessingError(
        'Pipeline did not produce a complete response',
        { thoughtNumber: input.thoughtNumber }
      );
    }
    
    return context.response as UltraThinkResponse;
  }
  
  /**
   * Check if response is complete
   */
  private isCompleteResponse(response: Partial<UltraThinkResponse>): boolean {
    return !!(
      response.thought &&
      response.thoughtNumber !== undefined &&
      response.totalThoughts !== undefined &&
      response.nextThoughtNeeded !== undefined
    );
  }
}

/**
 * Base class for pipeline stages
 */
export abstract class BasePipelineStage implements PipelineStage {
  constructor(public readonly name: string) {}
  
  abstract execute(context: ProcessingContext): Promise<ProcessingContext>;
}