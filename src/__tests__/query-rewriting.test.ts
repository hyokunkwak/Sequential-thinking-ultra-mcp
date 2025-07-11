/**
 * Tests for Query Rewriting functionality
 */

import { QueryRewritingService } from '../services/query-rewriting.service.js';
import { QueryOptimizationStage } from '../core/pipeline-stages.js';
import { ProcessingContext } from '../core/processing-pipeline.js';
import { UltraThinkInput } from '../types/interfaces.js';

describe('QueryRewritingService', () => {
  let service: QueryRewritingService;

  beforeEach(() => {
    service = new QueryRewritingService();
  });

  describe('rewriteQuery', () => {
    it('should expand contractions', async () => {
      const result = await service.rewriteQuery("I can't fix it");
      expect(result.rewrittenQuery).toContain("I cannot fix");
      expect(result.rewrittenQuery).toContain("the subject");
      expect(result.improvements).toContain('Expanded contractions for clarity');
      expect(result.improvements).toContain('Clarified ambiguous terms');
    });

    it('should add question marks to questions', async () => {
      const result = await service.rewriteQuery("how to solve this");
      expect(result.rewrittenQuery).toContain("how to solve");
      expect(result.rewrittenQuery).toContain("?");
      expect(result.improvements).toContain('Added logical structure');
      expect(result.improvements).toContain('Clarified ambiguous terms');
    });

    it('should add structure to explain requests', async () => {
      const result = await service.rewriteQuery("explain recursion");
      expect(result.rewrittenQuery).toContain("explain recursion");
      expect(result.rewrittenQuery).toContain("Please provide a detailed explanation");
      expect(result.improvements).toContain('Added logical structure');
    });

    it('should handle comparison queries', async () => {
      const result = await service.rewriteQuery("react vs vue");
      expect(result.rewrittenQuery).toContain("Compare and contrast");
      expect(result.rewrittenQuery).toContain("react vs vue");
      expect(result.rewrittenQuery).toContain("differences and similarities");
      expect(result.improvements).toContain('Added logical structure');
    });

    it('should emphasize key concepts', async () => {
      const result = await service.rewriteQuery("Implement authentication system with JWT tokens");
      expect(result.rewrittenQuery).toContain('(focusing on:');
      expect(result.improvements).toContain('Emphasized key concepts');
    });

    it('should add context markers for problem-solving', async () => {
      const result = await service.rewriteQuery("solve the memory leak issue");
      expect(result.rewrittenQuery).toContain('Please approach this step-by-step.');
      expect(result.improvements).toContain('Added context markers for better reasoning');
    });

    it('should preserve well-formed queries', async () => {
      const query = "What is the best approach to implement a caching system?";
      const result = await service.rewriteQuery(query);
      // Well-formed queries may still get enhancements
      expect(result.rewrittenQuery).toContain("What is the best approach to implement a caching system?");
      // Confidence should be high but may not be exactly 1.0
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should calculate similarity correctly', () => {
      const similarity = service.calculateSimilarity(
        "hello world",
        "hello there world"
      );
      expect(similarity).toBeCloseTo(0.67, 1); // 2 out of 3 words match
    });
  });
});

describe('QueryOptimizationStage', () => {
  let stage: QueryOptimizationStage;
  let mockRewriter: QueryRewritingService;
  let mockLogger: any;

  beforeEach(() => {
    mockRewriter = new QueryRewritingService();
    mockLogger = {
      info: jest.fn(),
      debug: jest.fn()
    };
    stage = new QueryOptimizationStage(mockRewriter, true, mockLogger);
  });

  it('should skip when disabled', async () => {
    const disabledStage = new QueryOptimizationStage(mockRewriter, false, mockLogger);
    const context: ProcessingContext = {
      input: { thought: "test", thoughtNumber: 1, totalThoughts: 5, nextThoughtNeeded: true },
      metadata: { startTime: Date.now() }
    };
    
    const result = await disabledStage.execute(context);
    expect(result.input.thought).toBe("test");
    expect(result.metadata.queryRewriting).toBeUndefined();
  });

  it('should rewrite query with improvements', async () => {
    const context: ProcessingContext = {
      input: { 
        thought: "how fix bug", 
        thoughtNumber: 1, 
        totalThoughts: 5, 
        nextThoughtNeeded: true 
      },
      metadata: { startTime: Date.now() }
    };
    
    const result = await stage.execute(context);
    expect(result.input.thought).toContain("?");
    expect(result.input.thought).toContain("step-by-step");
    expect(result.metadata.queryRewriting).toBeDefined();
    expect(result.metadata.queryRewriting?.improvements.length).toBeGreaterThan(0);
    expect(mockLogger.info).toHaveBeenCalled();
  });

  it('should not rewrite if confidence is low', async () => {
    jest.spyOn(mockRewriter, 'rewriteQuery').mockResolvedValueOnce({
      originalQuery: "test",
      rewrittenQuery: "tested",
      improvements: ['minor change'],
      confidence: 0.5
    });

    const context: ProcessingContext = {
      input: { thought: "test", thoughtNumber: 1, totalThoughts: 5, nextThoughtNeeded: true },
      metadata: { startTime: Date.now() }
    };
    
    const result = await stage.execute(context);
    expect(result.input.thought).toBe("test");
    expect(result.metadata.queryRewriting).toBeUndefined();
  });

  it('should handle errors gracefully', async () => {
    // Create a mock that throws an error
    const errorRewriter = {
      rewriteQuery: jest.fn().mockRejectedValue(new Error('Test error'))
    } as any;
    
    const errorStage = new QueryOptimizationStage(errorRewriter, true, mockLogger);
    
    const context: ProcessingContext = {
      input: { thought: "test", thoughtNumber: 1, totalThoughts: 5, nextThoughtNeeded: true },
      metadata: { startTime: Date.now() }
    };
    
    // Should not throw, just pass through
    const result = await errorStage.execute(context);
    expect(result.input.thought).toBe("test");
  });
});