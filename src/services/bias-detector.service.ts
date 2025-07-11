/**
 * Cognitive bias detection service
 * Identifies various types of biases in reasoning
 */

import { UltraThinkInput } from '../types/interfaces.js';
import { SimilarityService } from './similarity.service.js';
import { BIAS_THRESHOLDS } from '../config/constants.js';

export type BiasType = 
  | 'confirmation bias'
  | 'anchoring bias'
  | 'availability heuristic'
  | 'overconfidence bias'
  | 'sunk cost fallacy';

export class BiasDetectorService {
  private similarityService: SimilarityService;

  constructor(similarityService: SimilarityService) {
    this.similarityService = similarityService;
  }

  /**
   * Detect cognitive biases in the current thought
   */
  detectBias(
    input: UltraThinkInput,
    thoughtHistory: Map<number, UltraThinkInput>
  ): BiasType | null {
    // Use existing bias if already detected
    if (input.biasDetected) {
      return input.biasDetected as BiasType;
    }

    const thought = input.thought.toLowerCase();
    const history = Array.from(thoughtHistory.values());

    // Check for various biases
    const confirmationBias = this.checkConfirmationBias(thought, history);
    if (confirmationBias) return confirmationBias;

    const anchoringBias = this.checkAnchoringBias(input, thought, thoughtHistory);
    if (anchoringBias) return anchoringBias;

    const availabilityHeuristic = this.checkAvailabilityHeuristic(thought, input.thoughtNumber);
    if (availabilityHeuristic) return availabilityHeuristic;

    const overconfidenceBias = this.checkOverconfidenceBias(input);
    if (overconfidenceBias) return overconfidenceBias;

    const sunkCostFallacy = this.checkSunkCostFallacy(thought, input);
    if (sunkCostFallacy) return sunkCostFallacy;

    return null;
  }

  /**
   * Check for confirmation bias - repeating same conclusions
   */
  private checkConfirmationBias(
    thought: string,
    history: UltraThinkInput[]
  ): BiasType | null {
    if (history.length < BIAS_THRESHOLDS.RECENT_THOUGHTS_COUNT) {
      return null;
    }

    const recentThoughts = history.slice(-BIAS_THRESHOLDS.RECENT_THOUGHTS_COUNT);
    const similarityCount = recentThoughts.filter(t => 
      this.similarityService.calculateSimilarity(t.thought.toLowerCase(), thought) > 
      BIAS_THRESHOLDS.SIMILARITY_THRESHOLD
    ).length;

    if (similarityCount >= 2) {
      return 'confirmation bias';
    }

    return null;
  }

  /**
   * Check for anchoring bias - over-reliance on initial information
   */
  private checkAnchoringBias(
    input: UltraThinkInput,
    thought: string,
    thoughtHistory: Map<number, UltraThinkInput>
  ): BiasType | null {
    if (input.thoughtNumber <= 5) {
      return null;
    }

    const anchoringKeywords = ['처음', '초기', 'initially', 'originally'];
    const hasAnchoringKeyword = anchoringKeywords.some(keyword => thought.includes(keyword));

    if (hasAnchoringKeyword) {
      const firstThought = thoughtHistory.get(1);
      if (firstThought) {
        const similarity = this.similarityService.calculateSimilarity(
          firstThought.thought,
          input.thought
        );
        if (similarity > 0.7) {
          return 'anchoring bias';
        }
      }
    }

    return null;
  }

  /**
   * Check for availability heuristic - over-weighting recent information
   */
  private checkAvailabilityHeuristic(
    thought: string,
    thoughtNumber: number
  ): BiasType | null {
    const recentKeywords = ['최근', '방금', '직전', '마지막', 'recent', 'just', 'last'];
    const recentCount = recentKeywords.filter(keyword => thought.includes(keyword)).length;

    if (recentCount >= 2 && thoughtNumber > 10) {
      return 'availability heuristic';
    }

    return null;
  }

  /**
   * Check for overconfidence bias
   */
  private checkOverconfidenceBias(input: UltraThinkInput): BiasType | null {
    if (!input.confidence) {
      return null;
    }

    const progress = input.thoughtNumber / input.totalThoughts;
    
    if (input.confidence > BIAS_THRESHOLDS.HIGH_CONFIDENCE_THRESHOLD && 
        progress < 0.5) {
      return 'overconfidence bias';
    }

    return null;
  }

  /**
   * Check for sunk cost fallacy
   */
  private checkSunkCostFallacy(
    thought: string,
    input: UltraThinkInput
  ): BiasType | null {
    const sunkCostKeywords = ['이미', '지금까지', '여기까지', 'already', 'so far'];
    const continuationKeywords = ['계속', 'continue', 'proceed'];
    
    const hasSunkCostKeyword = sunkCostKeywords.some(keyword => thought.includes(keyword));
    const hasContinuationKeyword = continuationKeywords.some(keyword => thought.includes(keyword));
    
    const progress = input.thoughtNumber / input.totalThoughts;
    
    if (hasSunkCostKeyword && hasContinuationKeyword && 
        progress > BIAS_THRESHOLDS.PROGRESS_THRESHOLD) {
      return 'sunk cost fallacy';
    }

    return null;
  }

  /**
   * Get bias mitigation suggestions
   */
  getMitigationSuggestion(biasType: BiasType): string {
    const suggestions: Record<BiasType, string> = {
      'confirmation bias': '다른 관점이나 반대 의견을 고려해보세요.',
      'anchoring bias': '초기 가정을 재검토하고 새로운 정보를 고려하세요.',
      'availability heuristic': '전체 맥락을 고려하고 최근 정보에만 의존하지 마세요.',
      'overconfidence bias': '가정을 재검토하고 불확실성을 인정하세요.',
      'sunk cost fallacy': '이미 투자한 것보다 앞으로의 가치에 집중하세요.'
    };

    return suggestions[biasType] || '객관적인 관점을 유지하세요.';
  }

  /**
   * Detect bias from strings (interface method)
   * @param {string} thought - The thought to analyze
   * @param {string[]} history - History of previous thoughts
   * @returns {string | null} Detected bias or null
   */
  detectBiasFromStrings(thought: string, history: string[]): string | null {
    // Create a minimal UltraThinkInput for compatibility
    const input: UltraThinkInput = {
      thought,
      thoughtNumber: history.length + 1,
      totalThoughts: history.length + 1,
      nextThoughtNeeded: false
    };
    
    // Convert history to Map
    const thoughtHistory = new Map<number, UltraThinkInput>();
    history.forEach((h, index) => {
      thoughtHistory.set(index + 1, {
        thought: h,
        thoughtNumber: index + 1,
        totalThoughts: history.length,
        nextThoughtNeeded: index < history.length - 1
      });
    });
    
    const biasType = this.detectBias(input, thoughtHistory);
    return biasType;
  }
}