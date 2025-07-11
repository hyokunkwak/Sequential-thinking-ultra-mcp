/**
 * Module: Core
 * Description: Core functionality and infrastructure for the Sequential Thinking Ultra system
 * 
 * This module provides fundamental services including dependency injection, event handling,
 * error management, validation, formatting, and plugin system capabilities.
 */

export const MODULE_INFO = {
  name: 'core',
  description: 'Core functionality and infrastructure',
  
  // Public exports - what can be accessed from outside this module
  publicExports: [
    'event-bus',
    'errors',
    'validator',
    'formatter',
    'plugin-system',
    'processor',
    'processor-factory',
    'cache-manager',
    'processing-pipeline',
    'pipeline-stages'
  ],
  
  // Internal modules - what should not be accessed directly from outside
  internalModules: [
    'interfaces'
  ],
  
  // Dependencies - what this module depends on
  dependencies: {
    // Internal dependencies (within the project)
    internal: [
      'types',
      'config',
      'utils/logger',
      'utils/type-coercion',
      'services/bias-detector.service',
      'services/quality-metrics.service',
      'services/similarity.service'
    ],
    
    // External dependencies (npm packages)
    external: [
      '@modelcontextprotocol/sdk',
      'chalk',
      'zod',
      'winston',
      'eventemitter3'
    ]
  },
  
  // Module rules and constraints
  rules: {
    // Core module should not depend on application-specific modules
    noDependOn: [
      'examples',
      'plugins' // except through the plugin system interface
    ],
    
    // Core module should be stateless where possible
    statelessPreferred: true,
    
    // All public exports must have corresponding interfaces
    interfaceRequired: true
  }
};