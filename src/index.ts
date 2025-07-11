#!/usr/bin/env node

/**
 * Sequential Thinking Ultra MCP Server
 * MCP server with Ultra Think methodology
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';

import { ProcessorFactory } from './core/processor-factory.js';
import { Validator } from './core/validator.js';
import { Formatter } from './core/formatter.js';
import { coerceArguments } from './utils/type-coercion.js';
import type { UltraThinkInput } from './types/interfaces.js';
import { getLogger } from './utils/logger.js';
import { ErrorHandler } from './core/errors.js';
import { EventBus } from './core/event-bus.js';
import { PluginManager } from './core/plugin-system.js';
import { SimilarityService } from './services/similarity.service.js';
import { BiasDetectorService } from './services/bias-detector.service.js';
import { QualityMetricsService } from './services/quality-metrics.service.js';
import { loadEnvironmentConfig, validateConfig } from './config/environment.js';
import { LOGGING } from './config/constants.js';

// Server metadata
const SERVER_NAME = 'sequential-thinking-ultra';
const SERVER_VERSION = '2.1.0';

// Load and validate configuration
const envConfig = loadEnvironmentConfig();
const configErrors = validateConfig(envConfig);
if (configErrors.length > 0) {
  console.error('Configuration errors:', configErrors);
  process.exit(1);
}

// Initialize core services
const logger = getLogger({ 
  separator: LOGGING.SEPARATOR, 
  separatorLength: LOGGING.SEPARATOR_LENGTH 
});

const eventBus = new EventBus();
const pluginManager = new PluginManager(eventBus, logger);

// Initialize services with simple dependency injection
const similarityService = new SimilarityService();
const services = {
  similarityService,
  biasDetectorService: new BiasDetectorService(similarityService),
  qualityMetricsService: new QualityMetricsService()
};

// Initialize processor factory
const processorFactory = new ProcessorFactory({
  logger,
  eventBus,
  pluginManager: pluginManager as any,
  ...services,
  ...envConfig
});

// Initialize MCP server
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the Ultra Think tool
const ultraThinkTool: Tool = {
  name: 'sequential-thinking-ultra',
  description: 'Ultra-enhanced sequential thinking with advanced cognitive modes, query rewriting, and quality validation',
  inputSchema: {
    type: 'object',
    properties: {
      thought: { 
        type: 'string',
        description: 'Your current thinking step (automatically improved for clarity if needed)'
      },
      thoughtNumber: { 
        type: 'number',
        description: 'Current thought number in the sequence'
      },
      totalThoughts: { 
        type: 'number',
        description: 'Estimated total thoughts needed (dynamically adjustable)'
      },
      nextThoughtNeeded: { 
        type: 'boolean',
        description: 'Whether another thought step is needed to continue'
      },
      ultraThinkMode: { 
        type: 'string', 
        enum: ['serial', 'parallel', 'hybrid'],
        description: 'Processing mode: serial (depth), parallel (breadth), hybrid (both)'
      },
      depthLevel: { 
        type: 'number',
        description: 'Current analysis depth (1=surface, 2+=deeper) for serial mode'
      },
      branchId: { 
        type: 'string',
        description: 'Identifier for parallel reasoning paths'
      },
      qualityMetrics: { 
        type: 'object',
        description: 'Quality ratings 0-5: consistency, completeness, objectivity, practicality',
        properties: {
          logicalConsistency: { 
            type: 'number',
            description: 'How well thoughts connect logically (0-5)'
          },
          completeness: { 
            type: 'number',
            description: 'Coverage of important aspects (0-5)'
          },
          objectivity: { 
            type: 'number',
            description: 'Freedom from bias (0-5)'
          },
          practicality: { 
            type: 'number',
            description: 'Real-world applicability (0-5)'
          }
        }
      },
      budgetMode: { 
        type: 'string',
        enum: ['fast', 'balanced', 'thorough', 'exhaustive'],
        description: 'Efficiency mode affecting thinking depth and resource usage'
      },
      enableQueryRewriting: { 
        type: 'boolean',
        description: 'Enable automatic query improvement for clarity (default: true)'
      },
      isRevision: {
        type: 'boolean',
        description: 'Whether this revises a previous thought'
      },
      revisesThought: {
        type: 'number',
        description: 'Which thought number is being revised'
      },
      branchFromThought: {
        type: 'number',
        description: 'Branching point for parallel exploration'
      },
      needsMoreThoughts: {
        type: 'boolean',
        description: 'Indicates if analysis needs to continue beyond initial estimate'
      },
      maxDepth: {
        type: 'number',
        description: 'Maximum depth for serial mode exploration'
      },
      budgetUsed: {
        type: 'number',
        description: 'Percentage of thinking budget consumed (0-100)'
      },
      confidence: {
        type: 'number',
        description: 'Confidence level in current reasoning (0.0-1.0)'
      },
      metaCheckpoint: {
        type: 'boolean',
        description: 'Flag for meta-reasoning evaluation at 25%, 50%, 75% progress'
      },
      biasDetected: {
        type: 'string',
        description: 'Detected cognitive bias: confirmation, anchoring, availability, overconfidence, sunk_cost'
      }
    },
    required: ['thought', 'thoughtNumber', 'totalThoughts', 'nextThoughtNeeded']
  }
};

// Handle tool listing
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [ultraThinkTool],
  };
});

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== 'sequential-thinking-ultra') {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }

  logger.info('[MCP Server] Tool called: sequential-thinking-ultra');
  
  try {
    // Coerce input arguments
    const coercedArgs = coerceArguments(request.params.arguments || {});
    logger.debug('Coerced arguments:', coercedArgs);
    
    // Validate input - this will ensure all required fields are present
    const validatedInput = Validator.validateInput(coercedArgs);
    
    // Create processor
    const processor = processorFactory.createProcessor();
    
    // Process the thought
    const result = await processor.process(validatedInput as UltraThinkInput);
    
    // Format the response
    const formattedResponse = Formatter.formatResponse(result);
    
    logger.info('[MCP Server] Processing completed successfully');
    
    return {
      content: [
        {
          type: 'text',
          text: formattedResponse,
        },
      ],
    };
  } catch (error) {
    const errorDetails = ErrorHandler.handle(error);
    logger.error('[MCP Server] Processing failed: ' + errorDetails.message);
    
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${errorDetails.message || 'Processing failed'}`,
        },
      ],
    };
  }
});

// Start the server
async function startServer() {
  logger.info(`Starting ${SERVER_NAME} v${SERVER_VERSION}...`);
  
  try {
    // Initialize plugin manager
    await pluginManager.initialize();
    
    const transport = new StdioServerTransport();
    await server.connect(transport);
    
    logger.info('MCP server started successfully');
    logger.info(`Mode: ${envConfig.defaultBudgetMode || 'balanced'}`);
    logger.info(`Quality validation: ${envConfig.enableQualityValidation ? 'enabled' : 'disabled'}`);
    logger.info(`Meta reasoning: ${envConfig.enableMetaReasoning ? 'enabled' : 'disabled'}`);
  } catch (error) {
    logger.error('Failed to start server:', error as Error);
    process.exit(1);
  }
}

// Error handlers
process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled Rejection: ${reason}`);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception', error);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Received SIGINT, shutting down gracefully...');
  
  // Shutdown plugin manager
  await pluginManager.shutdown();
  
  logger.info('Server shutdown complete');
  process.exit(0);
});

// Start the server
startServer().catch((error) => {
  logger.error('Fatal error during startup', error as Error);
  process.exit(1);
});