/**
 * Module: Services
 * Description: Business logic services for quality metrics, bias detection, and similarity analysis
 * 
 * This module contains domain-specific services that implement the core business logic
 * for the Sequential Thinking Ultra system.
 */

export const MODULE_INFO = {
  name: 'services',
  description: 'Business logic services',
  
  // Public exports - what can be accessed from outside this module
  publicExports: [
    'bias-detector.service',
    'quality-metrics.service',
    'similarity.service'
  ],
  
  // Internal modules - what should not be accessed directly from outside
  internalModules: [],
  
  // Dependencies - what this module depends on
  dependencies: {
    // Internal dependencies (within the project)
    internal: [
      'types',
      'core/event-bus',
      'utils/logger'
    ],
    
    // External dependencies (npm packages)
    external: [
      'natural' // for NLP functionality
    ]
  },
  
  // Module rules and constraints
  rules: {
    // Services should depend on interfaces, not implementations
    dependOnInterfaces: true,
    
    // Services should not depend on infrastructure modules
    noDependOn: [
      'dashboard',
      'architecture',
      'monitoring',
      'security',
      'workers',
      'i18n',
      'plugins'
    ],
    
    // Services should be stateless
    statelessRequired: true,
    
    // All services must implement corresponding interfaces
    interfaceRequired: true
  }
};