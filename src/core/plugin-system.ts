/**
 * Plugin System for extending Sequential Thinking Ultra
 * Provides hooks and lifecycle management for plugins
 */

import { UltraThinkInput, UltraThinkResponse, QualityScore } from '../types/interfaces.js';
import { EventBus, EventNames } from './event-bus.js';
import { Logger } from '../utils/logger.js';

export interface PluginContext {
  eventBus: EventBus;
  logger: Logger;
  config: any;
}

export interface Plugin {
  name: string;
  version: string;
  description?: string;
  author?: string;
  dependencies?: string[];
  
  // Lifecycle hooks
  onInit?(context: PluginContext): void | Promise<void>;
  onDestroy?(): void | Promise<void>;
  
  // Processing hooks
  beforeProcess?(input: UltraThinkInput): UltraThinkInput | void;
  afterProcess?(response: UltraThinkResponse): UltraThinkResponse | void;
  
  // Quality and bias hooks
  onQualityCheck?(metrics: QualityScore): void;
  onBiasDetected?(biasType: string, input: UltraThinkInput): void;
  
  // Meta reasoning hooks
  onMetaCheckpoint?(progress: number, input: UltraThinkInput): void;
  
  // Budget hooks
  onBudgetWarning?(used: number, total: number): void;
}

export class PluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private eventBus: EventBus;
  private logger: Logger;
  private initialized = false;
  
  constructor(eventBus: EventBus, logger: Logger) {
    this.eventBus = eventBus;
    this.logger = logger.child('PluginManager');
  }
  
  /**
   * Register a plugin
   */
  async register(plugin: Plugin): Promise<void> {
    // Validate plugin
    this.validatePlugin(plugin);
    
    // Check dependencies
    if (plugin.dependencies) {
      for (const dep of plugin.dependencies) {
        if (!this.plugins.has(dep)) {
          throw new Error(`Plugin '${plugin.name}' depends on '${dep}' which is not loaded`);
        }
      }
    }
    
    // Check for duplicate
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }
    
    // Register plugin
    this.plugins.set(plugin.name, plugin);
    this.logger.info(`Plugin registered: ${plugin.name} v${plugin.version}`);
    
    // Initialize if manager is already initialized
    if (this.initialized && plugin.onInit) {
      await this.initializePlugin(plugin);
    }
    
    // Emit event
    this.eventBus.emit(EventNames.PLUGIN_REGISTERED, {
      name: plugin.name,
      version: plugin.version
    });
  }
  
  /**
   * Unregister a plugin
   */
  async unregister(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (!plugin) {
      throw new Error(`Plugin '${pluginName}' not found`);
    }
    
    // Check if other plugins depend on this one
    const dependents = Array.from(this.plugins.values()).filter(p => 
      p.dependencies?.includes(pluginName)
    );
    
    if (dependents.length > 0) {
      const names = dependents.map(p => p.name).join(', ');
      throw new Error(`Cannot unregister '${pluginName}': required by ${names}`);
    }
    
    // Call destroy hook
    if (plugin.onDestroy) {
      try {
        await plugin.onDestroy();
      } catch (error) {
        this.logger.error(`Error destroying plugin '${pluginName}':`, error as Error);
      }
    }
    
    // Remove plugin
    this.plugins.delete(pluginName);
    this.logger.info(`Plugin unregistered: ${pluginName}`);
  }
  
  /**
   * Initialize all plugins
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;
    
    
    // Initialize plugins in dependency order
    const sortedPlugins = this.sortPluginsByDependencies();
    
    for (const plugin of sortedPlugins) {
      if (plugin.onInit) {
        await this.initializePlugin(plugin);
      }
    }
    
    this.initialized = true;
    this.logger.info(`Initialized ${this.plugins.size} plugins`);
  }
  
  /**
   * Execute a hook on all plugins
   */
  async executeHook<T>(
    hookName: keyof Plugin,
    data: T,
    modifyData = true
  ): Promise<T> {
    let result = data;
    
    for (const plugin of this.plugins.values()) {
      const hook = plugin[hookName] as any;
      if (typeof hook !== 'function') continue;
      
      try {
        const hookResult = await hook.call(plugin, result);
        
        // Only modify data if hook returns something and modifyData is true
        if (hookResult !== undefined && modifyData) {
          result = hookResult;
        }
      } catch (error) {
        this.logger.error(`Error in plugin '${plugin.name}' hook '${String(hookName)}':`, error as Error);
        this.eventBus.emit(EventNames.PLUGIN_ERROR, {
          plugin: plugin.name,
          hook: String(hookName),
          error
        });
      }
    }
    
    return result;
  }
  
  /**
   * Execute a hook synchronously
   */
  executeHookSync<T>(
    hookName: keyof Plugin,
    data: T,
    modifyData = true
  ): T {
    let result = data;
    
    for (const plugin of this.plugins.values()) {
      const hook = plugin[hookName] as any;
      if (typeof hook !== 'function') continue;
      
      try {
        const hookResult = hook.call(plugin, result);
        
        // Only modify data if hook returns something and modifyData is true
        if (hookResult !== undefined && modifyData) {
          result = hookResult;
        }
      } catch (error) {
        this.logger.error(`Error in plugin '${plugin.name}' hook '${String(hookName)}':`, error as Error);
        this.eventBus.emit(EventNames.PLUGIN_ERROR, {
          plugin: plugin.name,
          hook: String(hookName),
          error
        });
      }
    }
    
    return result;
  }
  
  /**
   * Get a plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Get all plugins
   */
  getPlugins(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Check if a plugin is loaded
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * Validate plugin structure
   */
  private validatePlugin(plugin: Plugin): void {
    if (!plugin.name) {
      throw new Error('Plugin must have a name');
    }
    
    if (!plugin.version) {
      throw new Error('Plugin must have a version');
    }
    
    // Validate version format (simple semver check)
    if (!/^\d+\.\d+\.\d+/.test(plugin.version)) {
      throw new Error(`Invalid version format for plugin '${plugin.name}': ${plugin.version}`);
    }
  }
  
  /**
   * Initialize a single plugin
   */
  private async initializePlugin(plugin: Plugin): Promise<void> {
    const context: PluginContext = {
      eventBus: this.eventBus,
      logger: this.logger.child(plugin.name),
      config: {} // Can be extended with plugin-specific config
    };
    
    try {
      await plugin.onInit!(context);
      this.eventBus.emit(EventNames.PLUGIN_LOADED, {
        name: plugin.name,
        version: plugin.version
      });
    } catch (error) {
      this.logger.error(`Failed to initialize plugin '${plugin.name}':`, error as Error);
      throw error;
    }
  }
  
  /**
   * Sort plugins by dependencies
   */
  private sortPluginsByDependencies(): Plugin[] {
    const sorted: Plugin[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();
    
    const visit = (plugin: Plugin) => {
      if (visited.has(plugin.name)) return;
      
      if (visiting.has(plugin.name)) {
        throw new Error(`Circular dependency detected involving plugin '${plugin.name}'`);
      }
      
      visiting.add(plugin.name);
      
      // Visit dependencies first
      if (plugin.dependencies) {
        for (const dep of plugin.dependencies) {
          const depPlugin = this.plugins.get(dep);
          if (depPlugin) {
            visit(depPlugin);
          }
        }
      }
      
      visiting.delete(plugin.name);
      visited.add(plugin.name);
      sorted.push(plugin);
    };
    
    // Visit all plugins
    for (const plugin of this.plugins.values()) {
      visit(plugin);
    }
    
    return sorted;
  }
  
  /**
   * Get a specific plugin
   */
  get(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }
  
  /**
   * Get all plugins
   */
  getAll(): Plugin[] {
    return Array.from(this.plugins.values());
  }
  
  /**
   * Check if a plugin exists
   */
  has(name: string): boolean {
    return this.plugins.has(name);
  }
  
  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    // Destroy plugins in reverse dependency order
    const sortedPlugins = this.sortPluginsByDependencies().reverse();
    
    for (const plugin of sortedPlugins) {
      if (plugin.onDestroy) {
        try {
          await plugin.onDestroy();
        } catch (error) {
          this.logger.error(`Error shutting down plugin '${plugin.name}':`, error as Error);
        }
      }
    }
    
    this.plugins.clear();
    this.initialized = false;
    this.logger.info('All plugins shut down');
  }
}

// Example plugin implementations

/**
 * Korean Translation Plugin
 */
export const KoreanTranslatorPlugin: Plugin = {
  name: 'korean-translator',
  version: '1.0.0',
  description: 'Translates quality suggestions to Korean',
  author: 'Ultra Think Team',
  
  afterProcess(response: UltraThinkResponse): UltraThinkResponse {
    if (response.metadata?.suggestedNextStep) {
      // Simple translation mapping (in real implementation, use proper i18n)
      const translations: Record<string, string> = {
        'Continue analysis': '분석 계속 진행',
        'Deepen analysis': '심화 분석 필요',
        'Integrate insights': '인사이트 통합',
        'Verify solution': '솔루션 검증'
      };
      
      const translated = translations[response.metadata.suggestedNextStep];
      if (translated) {
        response.metadata.suggestedNextStep = translated;
      }
    }
    
    return response;
  }
};

/**
 * Performance Monitor Plugin
 */
// Performance monitor plugin with internal state
const performanceStartTimes = new Map<number, number>();

export const PerformanceMonitorPlugin: Plugin = {
  name: 'performance-monitor',
  version: '1.0.0',
  description: 'Monitors processing performance',
  
  beforeProcess(input: UltraThinkInput): void {
    // Store start time
    performanceStartTimes.set(input.thoughtNumber, Date.now());
  },
  
  afterProcess(response: UltraThinkResponse): void {
    const startTime = performanceStartTimes.get(response.thoughtNumber);
    if (startTime) {
      const processingTime = Date.now() - startTime;
      console.log(`Thought ${response.thoughtNumber} processed in ${processingTime}ms`);
      performanceStartTimes.delete(response.thoughtNumber);
    }
  }
};

/**
 * Auto-save Plugin
 */
export const AutoSavePlugin: Plugin = {
  name: 'auto-save',
  version: '1.0.0',
  description: 'Auto-saves thought history',
  
  onInit(context: PluginContext): void {
    // Subscribe to events
    context.eventBus.on(EventNames.THOUGHT_PROCESSED, () => {
      // Save to file or database
      context.logger.debug('Auto-saving thought history');
    });
  }
};