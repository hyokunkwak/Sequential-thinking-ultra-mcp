/**
 * Module: Utils
 * Description: Utility functions and helpers
 * 
 * This module provides pure utility functions that should be dependency-free
 * and reusable across the entire application.
 */

export const MODULE_INFO = {
  name: 'utils',
  description: 'Utility functions and helpers',
  
  // Public exports - what can be accessed from outside this module
  publicExports: [
    'logger',
    'type-coercion'
  ],
  
  // Internal modules - what should not be accessed directly from outside
  internalModules: [],
  
  // Dependencies - what this module depends on
  dependencies: {
    // Internal dependencies (within the project)
    internal: [
      'types' // Only for type definitions
    ],
    
    // External dependencies (npm packages)
    external: [
      'winston', // for logger
      'chalk'    // for colored output
    ]
  },
  
  // Module rules and constraints
  rules: {
    // Utils should be dependency-free (except for types)
    noDependOn: [
      'core',
      'services',
      'architecture',
      'dashboard',
      'monitoring',
      'security',
      'workers',
      'i18n',
      'plugins',
      'config' // Utils should not depend on config
    ],
    
    // All utils must be pure functions where possible
    pureFunctionsPreferred: true,
    
    // No side effects in utils
    noSideEffects: true,
    
    // Utils should be testable in isolation
    isolatedTesting: true
  }
};