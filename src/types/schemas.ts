/**
 * Zod schemas for validation
 * Moved from types.ts for better separation of concerns
 */

import { z } from 'zod';

// Base thought schema
export const BaseThoughtSchema = z.object({
  thought: z.string().min(1).max(10000).describe('The current thinking step'),
  nextThoughtNeeded: z.boolean().describe('Whether another thought step is needed'),
  thoughtNumber: z.number().min(1).max(1000).describe('The current thought number'),
  totalThoughts: z.number().min(1).max(1000).describe('The total number of thoughts expected'),
  isRevision: z.boolean().optional().describe('Whether this thought is a revision'),
  revisesThought: z.number().min(1).optional().describe('Which thought is being revised'),
  branchFromThought: z.number().min(1).optional().describe('The thought number to branch from'),
  branchId: z.string().max(100).optional().describe('Identifier for the branch'),
  needsMoreThoughts: z.boolean().optional().describe('Whether more thoughts are needed beyond current total')
});

// Ultra Think enhancement parameters
export const UltraThinkSchema = z.object({
  ultraThinkMode: z.enum(['serial', 'parallel', 'hybrid']).optional()
    .describe('Ultra Think processing mode'),
  
  depthLevel: z.number().min(1).optional()
    .describe('Current depth level in serial analysis'),
  maxDepth: z.number().min(1).optional()
    .describe('Maximum depth for serial analysis'),
  
  budgetMode: z.enum(['fast', 'balanced', 'thorough', 'exhaustive']).optional()
    .describe('Budget efficiency mode'),
  budgetUsed: z.number().min(0).max(100).optional()
    .describe('Percentage of budget used'),
  
  confidence: z.number().min(0).max(1).optional()
    .describe('Confidence level of current thought'),
  qualityMetrics: z.object({
    logicalConsistency: z.number().min(0).max(5).optional(),
    completeness: z.number().min(0).max(5).optional(),
    objectivity: z.number().min(0).max(5).optional(),
    practicality: z.number().min(0).max(5).optional()
  }).optional().describe('Quality assessment metrics'),
  
  metaCheckpoint: z.boolean().optional()
    .describe('Whether this is a meta-reasoning checkpoint'),
  biasDetected: z.string().optional()
    .describe('Detected cognitive bias'),
  
  parallelPaths: z.array(z.string().max(100)).max(10).optional()
    .describe('List of active parallel exploration paths'),
  pathConfidence: z.record(z.string().max(100), z.number().min(0).max(1)).optional()
    .describe('Confidence levels for each parallel path')
});

// Combined schema
export const UltraThinkInputSchema = BaseThoughtSchema.merge(UltraThinkSchema);

// Response schema
export const UltraThinkResponseSchema = z.object({
  thought: z.string().min(1).max(10000),
  thoughtNumber: z.number().min(1).max(1000),
  totalThoughts: z.number().min(1).max(1000),
  nextThoughtNeeded: z.boolean(),
  metadata: z.object({
    ultraThinkMode: z.string().max(100).optional(),
    depthLevel: z.number().min(1).max(100).optional(),
    confidence: z.number().min(0).max(1).optional(),
    qualityScore: z.object({
      overall: z.number().min(0).max(1),
      metrics: z.object({
        consistency: z.number().min(0).max(1),
        completeness: z.number().min(0).max(1),
        objectivity: z.number().min(0).max(1),
        practicality: z.number().min(0).max(1)
      })
    }).optional(),
    autoLabel: z.string().max(200).optional(),
    budgetStatus: z.object({
      used: z.number().min(0).max(100),
      total: z.number().min(0),
      efficiency: z.string().max(50)
    }).optional(),
    suggestedNextStep: z.string().max(500).optional(),
    biasDetected: z.string().max(100).nullable().optional()
  }).optional()
});

// Export type inferences
export type BaseThoughtInput = z.infer<typeof BaseThoughtSchema>;
export type UltraThinkInput = z.infer<typeof UltraThinkInputSchema>;
export type UltraThinkResponse = z.infer<typeof UltraThinkResponseSchema>;