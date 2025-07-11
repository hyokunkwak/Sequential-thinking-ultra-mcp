/**
 * Internationalization (i18n) manager for Ultra Think
 * 
 * @module i18n-manager
 * @description Provides multi-language support with:
 * - Dynamic language switching
 * - Fallback language support
 * - Interpolation and formatting
 * - Pluralization rules
 * - Number and date formatting
 */

import { EventBus } from '../core/event-bus.js';
import type { DeepMergeTarget } from '../types/common.js';

/**
 * Supported languages
 */
export type SupportedLanguage = 'en' | 'ko' | 'ja' | 'zh' | 'es' | 'fr' | 'de';

/**
 * Translation dictionary type
 */
export interface TranslationDict {
  [key: string]: string | TranslationDict;
}

/**
 * Language configuration
 */
export interface LanguageConfig {
  code: SupportedLanguage;
  name: string;
  direction: 'ltr' | 'rtl';
  pluralRules: (n: number) => string;
  numberFormat: Intl.NumberFormatOptions;
  dateFormat: Intl.DateTimeFormatOptions;
}

/**
 * Interpolation context
 */
export interface InterpolationContext {
  [key: string]: string | number | boolean;
}

/**
 * i18n manager implementation
 * @class I18nManager
 * @public
 */
export class I18nManager {
  private currentLanguage: SupportedLanguage;
  private fallbackLanguage: SupportedLanguage = 'en';
  private translations: Map<SupportedLanguage, TranslationDict> = new Map();
  private configs: Map<SupportedLanguage, LanguageConfig> = new Map();
  private eventBus?: EventBus;

  /**
   * Creates a new i18n manager
   * @param {SupportedLanguage} [defaultLanguage='en'] - Default language
   * @param {EventBus} [eventBus] - Event bus for language change events
   */
  constructor(defaultLanguage: SupportedLanguage = 'en', eventBus?: EventBus) {
    this.currentLanguage = defaultLanguage;
    this.eventBus = eventBus;
    
    // Initialize language configurations
    this.initializeConfigs();
    
    // Load default translations
    this.loadDefaultTranslations();
  }

  /**
   * Initialize language configurations
   * @private
   */
  private initializeConfigs(): void {
    // English
    this.configs.set('en', {
      code: 'en',
      name: 'English',
      direction: 'ltr',
      pluralRules: (n: number) => n === 1 ? 'one' : 'other',
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });

    // Korean
    this.configs.set('ko', {
      code: 'ko',
      name: '한국어',
      direction: 'ltr',
      pluralRules: () => 'other', // Korean doesn't have plural forms
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });

    // Japanese
    this.configs.set('ja', {
      code: 'ja',
      name: '日本語',
      direction: 'ltr',
      pluralRules: () => 'other', // Japanese doesn't have plural forms
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });

    // Chinese (Simplified)
    this.configs.set('zh', {
      code: 'zh',
      name: '中文',
      direction: 'ltr',
      pluralRules: () => 'other', // Chinese doesn't have plural forms
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });

    // Spanish
    this.configs.set('es', {
      code: 'es',
      name: 'Español',
      direction: 'ltr',
      pluralRules: (n: number) => n === 1 ? 'one' : 'other',
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });

    // French
    this.configs.set('fr', {
      code: 'fr',
      name: 'Français',
      direction: 'ltr',
      pluralRules: (n: number) => n === 0 || n === 1 ? 'one' : 'other',
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });

    // German
    this.configs.set('de', {
      code: 'de',
      name: 'Deutsch',
      direction: 'ltr',
      pluralRules: (n: number) => n === 1 ? 'one' : 'other',
      numberFormat: { style: 'decimal', minimumFractionDigits: 0 },
      dateFormat: { dateStyle: 'medium', timeStyle: 'short' }
    });
  }

  /**
   * Load default translations
   * @private
   */
  private loadDefaultTranslations(): void {
    // English translations
    this.translations.set('en', {
      common: {
        yes: 'Yes',
        no: 'No',
        cancel: 'Cancel',
        save: 'Save',
        delete: 'Delete',
        error: 'Error',
        warning: 'Warning',
        info: 'Information',
        success: 'Success'
      },
      processor: {
        thinking: 'Thinking...',
        analyzing: 'Analyzing thought {{number}} of {{total}}',
        complete: 'Analysis complete',
        quality: {
          high: 'High quality',
          medium: 'Medium quality',
          low: 'Low quality',
          warning: 'Quality below threshold: {{score}}'
        },
        bias: {
          detected: 'Bias detected: {{type}}',
          confirmation: 'Confirmation bias',
          anchoring: 'Anchoring bias',
          availability: 'Availability bias',
          overconfidence: 'Overconfidence bias',
          sunkCost: 'Sunk cost bias'
        },
        suggestions: {
          nextStep: 'Suggested next step',
          deepen: 'Deepen analysis at level {{level}}',
          converge: 'Consider converging parallel paths',
          checkQuality: 'Review quality metrics',
          reduceBias: 'Address detected bias'
        }
      },
      errors: {
        validation: 'Validation error: {{message}}',
        processing: 'Processing error: {{message}}',
        timeout: 'Operation timed out',
        rateLimit: 'Rate limit exceeded',
        unauthorized: 'Unauthorized access'
      }
    });

    // Korean translations
    this.translations.set('ko', {
      common: {
        yes: '예',
        no: '아니요',
        cancel: '취소',
        save: '저장',
        delete: '삭제',
        error: '오류',
        warning: '경고',
        info: '정보',
        success: '성공'
      },
      processor: {
        thinking: '생각 중...',
        analyzing: '{{total}}개 중 {{number}}번째 생각 분석 중',
        complete: '분석 완료',
        quality: {
          high: '높은 품질',
          medium: '중간 품질',
          low: '낮은 품질',
          warning: '품질이 임계값 미만: {{score}}'
        },
        bias: {
          detected: '편향 감지됨: {{type}}',
          confirmation: '확증 편향',
          anchoring: '고정 편향',
          availability: '가용성 편향',
          overconfidence: '과신 편향',
          sunkCost: '매몰비용 편향'
        },
        suggestions: {
          nextStep: '다음 단계 제안',
          deepen: '레벨 {{level}}에서 분석 심화',
          converge: '병렬 경로 수렴 고려',
          checkQuality: '품질 메트릭 검토',
          reduceBias: '감지된 편향 해결'
        }
      },
      errors: {
        validation: '검증 오류: {{message}}',
        processing: '처리 오류: {{message}}',
        timeout: '작업 시간 초과',
        rateLimit: '요청 한도 초과',
        unauthorized: '권한 없음'
      }
    });

    // Japanese translations
    this.translations.set('ja', {
      common: {
        yes: 'はい',
        no: 'いいえ',
        cancel: 'キャンセル',
        save: '保存',
        delete: '削除',
        error: 'エラー',
        warning: '警告',
        info: '情報',
        success: '成功'
      },
      processor: {
        thinking: '思考中...',
        analyzing: '{{total}}個中{{number}}番目の思考を分析中',
        complete: '分析完了',
        quality: {
          high: '高品質',
          medium: '中品質',
          low: '低品質',
          warning: '品質が閾値未満: {{score}}'
        },
        bias: {
          detected: 'バイアス検出: {{type}}',
          confirmation: '確証バイアス',
          anchoring: 'アンカリングバイアス',
          availability: '利用可能性バイアス',
          overconfidence: '過信バイアス',
          sunkCost: 'サンクコストバイアス'
        },
        suggestions: {
          nextStep: '次のステップの提案',
          deepen: 'レベル{{level}}で分析を深める',
          converge: '並列パスの収束を検討',
          checkQuality: '品質メトリクスを確認',
          reduceBias: '検出されたバイアスに対処'
        }
      },
      errors: {
        validation: '検証エラー: {{message}}',
        processing: '処理エラー: {{message}}',
        timeout: 'タイムアウト',
        rateLimit: 'レート制限超過',
        unauthorized: '認証なし'
      }
    });

    // Add more language translations as needed...
  }

  /**
   * Get current language
   * @returns {SupportedLanguage} Current language code
   * @public
   */
  getCurrentLanguage(): SupportedLanguage {
    return this.currentLanguage;
  }

  /**
   * Set current language
   * @param {SupportedLanguage} language - Language code to set
   * @public
   */
  setLanguage(language: SupportedLanguage): void {
    if (!this.configs.has(language)) {
      throw new Error(`Unsupported language: ${language}`);
    }

    const previousLanguage = this.currentLanguage;
    this.currentLanguage = language;

    this.eventBus?.emit('i18n.language_changed', {
      from: previousLanguage,
      to: language
    });
  }

  /**
   * Get translation for a key
   * @param {string} key - Translation key (dot notation supported)
   * @param {InterpolationContext} [context] - Interpolation context
   * @returns {string} Translated string
   * @public
   */
  t(key: string, context?: InterpolationContext): string {
    const translation = this.getTranslation(key, this.currentLanguage);
    
    if (!translation) {
      // Try fallback language
      const fallbackTranslation = this.getTranslation(key, this.fallbackLanguage);
      if (fallbackTranslation) {
        return this.interpolate(fallbackTranslation, context);
      }
      
      // Return key if no translation found
      return key;
    }

    return this.interpolate(translation, context);
  }

  /**
   * Get plural translation
   * @param {string} key - Translation key
   * @param {number} count - Count for pluralization
   * @param {InterpolationContext} [context] - Additional context
   * @returns {string} Translated string
   * @public
   */
  tp(key: string, count: number, context?: InterpolationContext): string {
    const config = this.configs.get(this.currentLanguage);
    if (!config) return key;

    const pluralForm = config.pluralRules(count);
    const pluralKey = `${key}.${pluralForm}`;
    
    const fullContext = { ...context, count };
    
    // Try plural form first
    const translation = this.getTranslation(pluralKey, this.currentLanguage);
    if (translation) {
      return this.interpolate(translation, fullContext);
    }

    // Fall back to base key
    return this.t(key, fullContext);
  }

  /**
   * Format number according to locale
   * @param {number} value - Number to format
   * @param {Intl.NumberFormatOptions} [options] - Format options
   * @returns {string} Formatted number
   * @public
   */
  formatNumber(value: number, options?: Intl.NumberFormatOptions): string {
    const config = this.configs.get(this.currentLanguage);
    if (!config) return value.toString();

    const locale = this.getLocaleString(this.currentLanguage);
    const formatOptions = { ...config.numberFormat, ...options };
    
    return new Intl.NumberFormat(locale, formatOptions).format(value);
  }

  /**
   * Format date according to locale
   * @param {Date} date - Date to format
   * @param {Intl.DateTimeFormatOptions} [options] - Format options
   * @returns {string} Formatted date
   * @public
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    const config = this.configs.get(this.currentLanguage);
    if (!config) return date.toString();

    const locale = this.getLocaleString(this.currentLanguage);
    const formatOptions = { ...config.dateFormat, ...options };
    
    return new Intl.DateTimeFormat(locale, formatOptions).format(date);
  }

  /**
   * Get all available languages
   * @returns {Array<{code: SupportedLanguage, name: string}>} Available languages
   * @public
   */
  getAvailableLanguages(): Array<{code: SupportedLanguage, name: string}> {
    const languages: Array<{code: SupportedLanguage, name: string}> = [];
    
    this.configs.forEach((config, code) => {
      languages.push({ code, name: config.name });
    });
    
    return languages;
  }

  /**
   * Load custom translations
   * @param {SupportedLanguage} language - Language code
   * @param {TranslationDict} translations - Translation dictionary
   * @public
   */
  loadTranslations(language: SupportedLanguage, translations: TranslationDict): void {
    const existing = this.translations.get(language) || {};
    const merged = this.deepMerge(
      existing as DeepMergeTarget, 
      translations as DeepMergeTarget
    ) as TranslationDict;
    this.translations.set(language, merged);
  }

  /**
   * Get translation from dictionary
   * @private
   */
  private getTranslation(key: string, language: SupportedLanguage): string | null {
    const translations = this.translations.get(language);
    if (!translations) return null;

    const keys = key.split('.');
    let current: TranslationDict | string | null = translations;

    for (const k of keys) {
      if (typeof current !== 'object' || !(k in current)) {
        return null;
      }
      current = current[k];
    }

    return typeof current === 'string' ? current : null;
  }

  /**
   * Interpolate variables in string
   * @private
   */
  private interpolate(template: string, context?: InterpolationContext): string {
    if (!context) return template;

    return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
      if (key in context) {
        return String(context[key]);
      }
      return match;
    });
  }

  /**
   * Get locale string for language
   * @private
   */
  private getLocaleString(language: SupportedLanguage): string {
    const localeMap: Record<SupportedLanguage, string> = {
      en: 'en-US',
      ko: 'ko-KR',
      ja: 'ja-JP',
      zh: 'zh-CN',
      es: 'es-ES',
      fr: 'fr-FR',
      de: 'de-DE'
    };
    
    return localeMap[language] || 'en-US';
  }

  /**
   * Deep merge objects
   * @private
   */
  private deepMerge(target: DeepMergeTarget, source: DeepMergeTarget): DeepMergeTarget {
    if (!target || typeof target !== 'object' || Array.isArray(target)) {
      return source;
    }
    
    if (!source || typeof source !== 'object' || Array.isArray(source)) {
      return target;
    }
    
    const result = { ...target } as Record<string, unknown>;
    const sourceObj = source as Record<string, unknown>;
    
    for (const key in sourceObj) {
      if (typeof sourceObj[key] === 'object' && sourceObj[key] !== null && !Array.isArray(sourceObj[key])) {
        result[key] = this.deepMerge(
          (result[key] || {}) as DeepMergeTarget, 
          sourceObj[key] as DeepMergeTarget
        );
      } else {
        result[key] = sourceObj[key];
      }
    }
    
    return result;
  }
}

/**
 * Global i18n instance
 */
let globalI18n: I18nManager | null = null;

/**
 * Initialize global i18n
 * @param {SupportedLanguage} [language='en'] - Default language
 * @param {EventBus} [eventBus] - Event bus
 * @returns {I18nManager} i18n manager instance
 * @public
 */
export function initI18n(
  language: SupportedLanguage = 'en',
  eventBus?: EventBus
): I18nManager {
  globalI18n = new I18nManager(language, eventBus);
  return globalI18n;
}

/**
 * Get global i18n instance
 * @returns {I18nManager} i18n manager instance
 * @public
 */
export function getI18n(): I18nManager {
  if (!globalI18n) {
    globalI18n = new I18nManager();
  }
  return globalI18n;
}

/**
 * Translation helper function
 * @param {string} key - Translation key
 * @param {InterpolationContext} [context] - Context
 * @returns {string} Translated string
 * @public
 */
export function t(key: string, context?: InterpolationContext): string {
  return getI18n().t(key, context);
}