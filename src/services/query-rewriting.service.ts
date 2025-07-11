/**
 * Query Rewriting Service
 * Improves and clarifies user queries for better sequential thinking
 */

import type { Logger } from '../utils/logger.js';

export interface QueryRewritingResult {
  originalQuery: string;
  rewrittenQuery: string;
  improvements: string[];
  confidence: number;
}

export class QueryRewritingService {
  private readonly logger?: Logger;
  
  constructor(logger?: Logger) {
    this.logger = logger;
  }

  /**
   * Analyze and rewrite a query for better clarity and structure
   */
  public async rewriteQuery(query: string): Promise<QueryRewritingResult> {
    const originalQuery = query.trim();
    const improvements: string[] = [];
    let rewrittenQuery = originalQuery;
    let confidence = 1.0;

    // 1. Expand contractions
    const expandedQuery = this.expandContractions(rewrittenQuery);
    if (expandedQuery !== rewrittenQuery) {
      improvements.push('Expanded contractions for clarity');
      rewrittenQuery = expandedQuery;
    }

    // 2. Add structure if missing
    const structuredQuery = this.addStructure(rewrittenQuery);
    if (structuredQuery !== rewrittenQuery) {
      improvements.push('Added logical structure');
      rewrittenQuery = structuredQuery;
      confidence *= 0.9;
    }

    // 3. Clarify ambiguous terms
    const clarifiedQuery = this.clarifyAmbiguousTerms(rewrittenQuery);
    if (clarifiedQuery !== rewrittenQuery) {
      improvements.push('Clarified ambiguous terms');
      rewrittenQuery = clarifiedQuery;
      confidence *= 0.85;
    }

    // 4. Extract and emphasize key concepts
    const emphasizedQuery = this.emphasizeKeyConcepts(rewrittenQuery);
    if (emphasizedQuery !== rewrittenQuery) {
      improvements.push('Emphasized key concepts');
      rewrittenQuery = emphasizedQuery;
    }

    // 5. Add context markers for sequential thinking
    const contextualQuery = this.addContextMarkers(rewrittenQuery);
    if (contextualQuery !== rewrittenQuery) {
      improvements.push('Added context markers for better reasoning');
      rewrittenQuery = contextualQuery;
    }

    // Log the rewriting process
    if (this.logger && improvements.length > 0) {
      this.logger.debug('Query rewritten', {
        original: originalQuery,
        rewritten: rewrittenQuery,
        improvements
      });
    }

    return {
      originalQuery,
      rewrittenQuery,
      improvements,
      confidence
    };
  }

  /**
   * Expand common contractions
   */
  private expandContractions(query: string): string {
    const contractions: Record<string, string> = {
      "can't": "cannot",
      "won't": "will not",
      "shouldn't": "should not",
      "wouldn't": "would not",
      "couldn't": "could not",
      "isn't": "is not",
      "aren't": "are not",
      "wasn't": "was not",
      "weren't": "were not",
      "hasn't": "has not",
      "haven't": "have not",
      "doesn't": "does not",
      "don't": "do not",
      "didn't": "did not",
      "let's": "let us",
      "it's": "it is",
      "what's": "what is",
      "that's": "that is",
      "there's": "there is",
      "here's": "here is",
      "who's": "who is",
      "where's": "where is",
      "when's": "when is",
      "why's": "why is",
      "how's": "how is",
      "i'm": "I am",
      "you're": "you are",
      "we're": "we are",
      "they're": "they are",
      "i've": "I have",
      "you've": "you have",
      "we've": "we have",
      "they've": "they have",
      "i'd": "I would",
      "you'd": "you would",
      "we'd": "we would",
      "they'd": "they would",
      "i'll": "I will",
      "you'll": "you will",
      "we'll": "we will",
      "they'll": "they will"
    };

    let result = query;
    for (const [contraction, expansion] of Object.entries(contractions)) {
      const regex = new RegExp(`\\b${contraction}\\b`, 'gi');
      result = result.replace(regex, expansion);
    }
    return result;
  }

  /**
   * Add logical structure to unstructured queries
   */
  private addStructure(query: string): string {
    // Check if query lacks structure (no question mark, short, etc.)
    const hasQuestionMark = query.includes('?');
    const wordCount = query.split(/\s+/).length;
    
    if (!hasQuestionMark && wordCount < 10) {
      // Try to infer the intent and add structure
      const lowerQuery = query.toLowerCase();
      
      if (lowerQuery.includes('how') || lowerQuery.includes('what') || 
          lowerQuery.includes('why') || lowerQuery.includes('when') ||
          lowerQuery.includes('where') || lowerQuery.includes('who')) {
        return query + '?';
      }
      
      if (lowerQuery.startsWith('explain') || lowerQuery.startsWith('describe')) {
        return query + '. Please provide a detailed explanation.';
      }
      
      if (lowerQuery.includes(' vs ') || lowerQuery.includes(' versus ') || 
          lowerQuery.includes(' compare ')) {
        return `Compare and contrast: ${query}. What are the key differences and similarities?`;
      }
      
      // Default: frame as a question
      return `Please explain: ${query}`;
    }
    
    return query;
  }

  /**
   * Clarify ambiguous terms
   */
  private clarifyAmbiguousTerms(query: string): string {
    const ambiguousTerms: Record<string, string> = {
      '\\bit\\b': 'the subject',
      '\\bthing\\b': 'the concept',
      '\\bstuff\\b': 'the materials',
      '\\bthis\\b(?! \\w+)': 'this matter',
      '\\bthat\\b(?! \\w+)': 'that point',
      '\\bdo\\b(?! \\w+)': 'accomplish',
      '\\bget\\b(?! \\w+)': 'understand',
      '\\bmake\\b(?! \\w+)': 'create'
    };

    let result = query;
    for (const [ambiguous, clear] of Object.entries(ambiguousTerms)) {
      const regex = new RegExp(ambiguous, 'gi');
      const matches = result.match(regex);
      if (matches && matches.length === 1) {
        // Only replace if there's a single occurrence to avoid over-clarification
        result = result.replace(regex, clear);
      }
    }
    
    return result;
  }

  /**
   * Emphasize key concepts
   */
  private emphasizeKeyConcepts(query: string): string {
    // Extract potential key concepts (nouns, technical terms)
    const words = query.split(/\s+/);
    const keywordPatterns = [
      /^[A-Z][a-z]+/, // Capitalized words
      /\w+tion$/, // Words ending in -tion
      /\w+ment$/, // Words ending in -ment
      /\w+ity$/, // Words ending in -ity
      /\w+ness$/, // Words ending in -ness
      /\w+ing$/, // Gerunds
      /\w+ed$/, // Past participles
    ];
    
    const keywords = words.filter(word => {
      return keywordPatterns.some(pattern => pattern.test(word)) ||
             word.length > 7; // Longer words are often key concepts
    });
    
    if (keywords.length > 0 && keywords.length < 5) {
      // Add emphasis to key concepts
      return query + ` (focusing on: ${keywords.join(', ')})`;
    }
    
    return query;
  }

  /**
   * Add context markers for sequential thinking
   */
  private addContextMarkers(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    // Check for problem-solving indicators
    if (lowerQuery.includes('solve') || lowerQuery.includes('fix') || 
        lowerQuery.includes('debug') || lowerQuery.includes('troubleshoot')) {
      if (!lowerQuery.includes('step')) {
        return query + ' Please approach this step-by-step.';
      }
    }
    
    // Check for analysis indicators
    if (lowerQuery.includes('analyze') || lowerQuery.includes('examine') ||
        lowerQuery.includes('investigate') || lowerQuery.includes('explore')) {
      if (!lowerQuery.includes('systematic')) {
        return query + ' Use a systematic approach.';
      }
    }
    
    // Check for comparison indicators
    if (lowerQuery.includes('compare') || lowerQuery.includes('difference') ||
        lowerQuery.includes('similar') || lowerQuery.includes('versus')) {
      if (!lowerQuery.includes('aspect')) {
        return query + ' Consider multiple aspects.';
      }
    }
    
    // Check for implementation indicators
    if (lowerQuery.includes('implement') || lowerQuery.includes('create') ||
        lowerQuery.includes('build') || lowerQuery.includes('develop')) {
      if (!lowerQuery.includes('requirement') && !lowerQuery.includes('constraint')) {
        return query + ' Consider requirements and constraints.';
      }
    }
    
    return query;
  }

  /**
   * Calculate similarity between original and rewritten query
   */
  public calculateSimilarity(original: string, rewritten: string): number {
    const originalWords = new Set(original.toLowerCase().split(/\s+/));
    const rewrittenWords = new Set(rewritten.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...originalWords].filter(x => rewrittenWords.has(x)));
    const union = new Set([...originalWords, ...rewrittenWords]);
    
    return intersection.size / union.size;
  }
}