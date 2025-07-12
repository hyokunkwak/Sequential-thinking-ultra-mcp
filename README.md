# Sequential Thinking Ultra - MCP Server

Enhanced Sequential Thinking MCP server with Ultra Think methodology for advanced reasoning

> 🚀 **v2.1**: Simplified architecture focused on core MCP server functionality  
> 📌 **v2.0**: Clean architecture implementation with modular design  
> 🎉 **v1.0**: Initial release with Ultra Think methodology integration

## 🌟 Overview

Sequential Thinking Ultra is a Model Context Protocol (MCP) server that enhances sequential thinking with the Ultra Think methodology. It provides a structured approach to complex problem-solving through sequential reasoning steps with quality validation, bias detection, and efficient resource management.

### Key Features

#### Core Sequential Thinking
- **Step-by-Step Processing**: Break down complex problems into manageable sequential thoughts
- **Dynamic Flow Control**: Adjust thinking paths based on progress and findings
- **Branching Support**: Explore alternative reasoning paths when needed
- **Revision Capability**: Refine previous thoughts for improved accuracy
- **✨ Query Rewriting**: Automatically improve query clarity and structure for better reasoning

#### Ultra Think Enhancements
- **🏷️ Automatic Labeling**: Clear categorization of each thinking step
- **📊 Quality Metrics**: Real-time assessment (consistency, completeness, objectivity, practicality)
- **💰 Budget Management**: Resource-efficient processing with configurable limits
- **🎯 Meta-Reasoning**: Automatic checkpoint evaluations at 25%, 50%, 75% progress
- **🛡️ Bias Detection**: Identifies 5 cognitive biases (confirmation, anchoring, availability, overconfidence, sunk cost)
- **📈 Confidence Tracking**: Monitor certainty levels throughout the reasoning process
- **🔧 Processing Mode Labels**: Visual indicators for different reasoning styles (serial, parallel, hybrid)

## 📦 Installation

### Quick Start with NPM

```bash
npm install -g @modelcontextprotocol/server-sequential-thinking-ultra
```

### Docker Installation

```bash
# Build Docker image
docker build -t sequential-thinking-ultra:latest .

# Run the container
docker run --rm -i sequential-thinking-ultra:latest
```

### Development Setup

```bash
# Clone the repository
git clone https://github.com/hyokunkwak/Sequential-thinking-ultra-mcp.git
cd Sequential-thinking-ultra-mcp

# Install dependencies
npm install

# Build the project
npm run build

# Start the server
npm start
```

## 🔧 Configuration

### Claude Desktop Integration

Add to your `claude_desktop_config.json`:

#### NPM Installation
```json
{
  "mcpServers": {
    "sequential-thinking-ultra": {
      "command": "npx",
      "args": [
        "@modelcontextprotocol/server-sequential-thinking-ultra"
      ],
      "env": {
        "ULTRA_THINK_AUTO_LABEL": "true",
        "ULTRA_THINK_QUALITY": "true",
        "ULTRA_THINK_META": "true",
        "ULTRA_THINK_BUDGET": "true",
        "ENABLE_QUERY_REWRITING": "true",
        "DEFAULT_BUDGET_MODE": "balanced"
      }
    }
  }
}
```

#### Docker Installation
```json
{
  "mcpServers": {
    "sequential-thinking-ultra": {
      "command": "docker",
      "args": [
        "run",
        "-i",
        "--rm",
        "sequential-thinking-ultra:latest"
      ],
      "env": {
        "ULTRA_THINK_AUTO_LABEL": "true",
        "ULTRA_THINK_QUALITY": "true",
        "ULTRA_THINK_META": "true",
        "ULTRA_THINK_BUDGET": "true",
        "ENABLE_QUERY_REWRITING": "true",
        "DEFAULT_BUDGET_MODE": "balanced",
        "META_CHECKPOINT_FREQ": "25",
        "QUALITY_THRESHOLD": "0.6"
      }
    }
  }
}
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `ULTRA_THINK_AUTO_LABEL` | Enable automatic thought labeling | `true` |
| `ULTRA_THINK_QUALITY` | Enable quality validation | `true` |
| `ULTRA_THINK_META` | Enable meta-reasoning checkpoints | `true` |
| `ULTRA_THINK_BUDGET` | Enable budget management | `true` |
| `ENABLE_QUERY_REWRITING` | Enable automatic query rewriting | `true` |
| `DEFAULT_BUDGET_MODE` | Default efficiency mode (fast/balanced/thorough/exhaustive) | `balanced` |
| `META_CHECKPOINT_FREQ` | Meta checkpoint frequency (%) | `25` |
| `QUALITY_THRESHOLD` | Minimum quality threshold (0-1) | `0.6` |
| `NODE_ENV` | Environment (development/production) | `production` |
| `DEBUG_MODE` | Enable debug output | `false` |
| `LOG_LEVEL` | Logging level (error/warn/info/debug) | `info` |

## 🛠️ Usage

### Basic Example

```typescript
// Simple sequential thinking
{
  "thought": "Let's analyze this step by step",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true
}
```

### Advanced Example with Ultra Think

```typescript
{
  "thought": "Exploring multiple approaches to the problem",
  "thoughtNumber": 3,
  "totalThoughts": 10,
  "nextThoughtNeeded": true,
  "ultraThinkMode": "parallel",  // Adds [Parallel: Path] label
  "qualityMetrics": {
    "logicalConsistency": 4,
    "completeness": 3,
    "objectivity": 5,
    "practicality": 4
  },
  "budgetMode": "thorough",
  "confidence": 0.85,
  "branchId": "approach-1",  // For tracking different reasoning branches
  "isRevision": false
}
```

### Query Rewriting Example

```typescript
// Original query
{
  "thought": "how fix bug",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true
}

// Automatically rewritten to
{
  "thought": "How to fix the bug? Please approach this step-by-step.",
  "thoughtNumber": 1,
  "totalThoughts": 5,
  "nextThoughtNeeded": true
}
```

## 🏗️ Architecture

### Clean & Simple Design

```
src/
├── core/              # Core business logic
│   ├── processor.ts         # Main thought processor
│   ├── processor-factory.ts # Factory for processor creation
│   ├── processing-pipeline.ts # Pipeline pattern implementation
│   ├── pipeline-stages.ts    # Individual processing stages
│   ├── validator.ts         # Input validation
│   ├── formatter.ts         # Output formatting
│   ├── event-bus.ts         # Event-driven communication
│   ├── plugin-system.ts     # Plugin management
│   └── cache-manager.ts     # Performance caching
├── services/          # Business services
│   ├── similarity.service.ts      # Text similarity analysis
│   ├── bias-detector.service.ts   # Cognitive bias detection
│   └── quality-metrics.service.ts # Quality assessment
├── plugins/           # Plugin examples
├── config/           # Configuration
├── utils/            # Utilities
└── types/            # TypeScript definitions
```

### Key Design Patterns
- **Factory Pattern**: Clean processor instantiation
- **Pipeline Pattern**: Modular processing stages
- **Event-Driven**: Loosely coupled components
- **Plugin System**: Extensible functionality
- **Multi-Level Caching**: Performance optimization

## 📊 Processing Mode Labels

The system supports three processing mode labels that provide visual indicators for the type of reasoning approach:

### Serial Mode Label
- Shows `[Serial: Depth N]` prefix in thoughts
- Indicates focused, step-by-step analysis
- Best for deep, thorough exploration

### Hybrid Mode Label
- Shows progressive labels: `[Hybrid: Exploring]`, `[Hybrid: Deepening]`, `[Hybrid: Synthesizing]`
- Indicates combined approach based on progress
- Adapts label based on completion percentage

**Note**: These are visual labels that help track reasoning style. The actual processing is sequential.

## 🎯 Quality Metrics

Each thought is evaluated on four dimensions:

1. **Logical Consistency** (0-5): Internal coherence and reasoning soundness
2. **Completeness** (0-5): Thoroughness of analysis
3. **Objectivity** (0-5): Freedom from bias and assumptions
4. **Practicality** (0-5): Real-world applicability

Quality thresholds trigger automatic warnings and improvement suggestions when scores fall below 60%.

## 🛡️ Bias Detection

Automatically identifies and alerts on common cognitive biases:

- **Confirmation Bias**: Favoring information that confirms existing beliefs
- **Anchoring Bias**: Over-relying on first information encountered
- **Availability Bias**: Overweighting easily recalled information
- **Overconfidence Bias**: Excessive certainty in conclusions
- **Sunk Cost Fallacy**: Continuing due to past investment

## 🧪 Development

### Commands

```bash
# Build the project
npm run build

# Run tests
npm test              # All tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report

# Code quality
npm run typecheck     # TypeScript checking
npm run check:all     # Run all checks (typecheck + tests)

# Development
npm run dev           # Development mode with tsx
```

### Testing Strategy

- **Unit Tests**: Core logic validation
- **Integration Tests**: Service interaction verification
- **E2E Tests**: Complete server functionality
- **Benchmarks**: Performance monitoring

## 🐳 Docker Support

### Docker Usage

```bash
# Build Docker image
docker build -t sequential-thinking-ultra:latest .

# Run with custom environment
docker run --rm -i \
  -e DEFAULT_BUDGET_MODE=thorough \
  -e LOG_LEVEL=debug \
  sequential-thinking-ultra:latest
```


## 🔌 Plugin System

Create custom plugins to extend functionality:

```typescript
export const MyPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  
  beforeProcess(input: UltraThinkInput): UltraThinkInput {
    // Modify input before processing
    return input;
  },
  
  afterProcess(response: UltraThinkResponse): UltraThinkResponse {
    // Enhance response after processing
    return response;
  }
};
```

### Built-in Plugins

- **Query Rewriting Plugin**: Automatically improves query clarity
- **Korean Enhancement Plugin**: Adds Korean language support
- **Performance Tracking Plugin**: Monitors processing times
- **Quality Enhancement Plugin**: Provides quality improvement suggestions
- **Bias Alert Plugin**: Enhanced bias detection alerts
- **Budget Optimizer Plugin**: Optimizes thinking budget usage
- **Meta Reasoning Plugin**: Enhanced meta-reasoning capabilities

## 📈 Performance

- **Caching System**: Multi-level cache for similarity calculations
- **Efficient Processing**: Optimized pipeline with minimal overhead
- **Resource Management**: Configurable limits and budget controls
- **Scalable Design**: Ready for high-throughput scenarios

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built on the Model Context Protocol (MCP) by Anthropic
- Inspired by sequential thinking methodologies
- Enhanced with Ultra Think reasoning framework

---

## 📋 MCP Server Details

### Tool Description
**sequential-thinking-ultra** - A powerful tool for dynamic problem-solving through Ultra Think enhanced sequential thinking. This tool combines traditional sequential thinking with advanced features like quality metrics, branching support, meta-reasoning, and budget management for superior problem-solving.

### When to use this tool:
- Breaking down complex problems with quality assurance at each step
- Planning and design with built-in meta-reasoning checkpoints
- Analysis requiring exploration of multiple solution approaches
- Problems needing bias detection and confidence tracking
- Tasks requiring budget-aware efficient thinking
- Situations where solution quality must be measured and validated
- **✨ Queries that need automatic clarity improvement and restructuring**

### Key features:

#### Core Capabilities:
- **Sequential Processing**: Step-by-step approach with quality tracking
- **Quality Metrics**: Real-time assessment (consistency, completeness, objectivity, practicality)
- **Automatic Improvements**: Suggestions for low-quality reasoning
- **Branch Tracking**: Support for tracking multiple reasoning branches
- **Meta-Reasoning**: Automatic checkpoints at 25%, 50%, 75% progress
- **Budget Management**: Efficiency modes (fast/balanced/thorough/exhaustive)
- **Bias Detection**: Identifies 5 cognitive biases
- **Confidence Tracking**: Certainty levels throughout reasoning

#### Query Enhancement Features:
- **✨ Automatic Query Rewriting**: Improves clarity before processing
  - Expands contractions (can't → cannot)
  - Clarifies ambiguous terms (it → the subject)
  - Adds structure to incomplete queries
  - Emphasizes key concepts
  - Adds context markers for better reasoning
- **Smart Context Addition**: Suggests step-by-step approach for problem-solving queries
- **Comparison Enhancement**: Structures comparison queries properly

### Parameters explained:

#### Core parameters (always required):
- `thought`: Your current thinking step with quality tracking
- `nextThoughtNeeded`: Whether another thought step is needed
- `thoughtNumber`: Current thought number
- `totalThoughts`: Estimated total thoughts (dynamically adjustable)

#### Revision & branching:
- `isRevision`: Whether this revises previous thinking
- `revisesThought`: Which thought is being reconsidered
- `branchFromThought`: Starting point for reasoning branches
- `branchId`: Identifier for different reasoning paths
- `needsMoreThoughts`: If more analysis needed

#### Ultra Think parameters:
- `ultraThinkMode`: Visual label mode (serial/parallel/hybrid)
- `depthLevel`: Current analysis depth (1=surface, 2+=deeper)
- `maxDepth`: Maximum planned depth
- `budgetMode`: Efficiency mode (fast/balanced/thorough/exhaustive)
- `budgetUsed`: Percentage of thinking budget consumed
- `confidence`: Your confidence level (0.0-1.0)
- `qualityMetrics`: Rate each dimension 0-5 (consistency, completeness, objectivity, practicality)
- `metaCheckpoint`: Flag for meta-reasoning evaluation
- `biasDetected`: Any cognitive biases identified
- `branchHistory`: Track history of different reasoning branches
- `enableQueryRewriting`: Toggle automatic query improvement (default: true)

### You should:
1. Start with complexity presets: simple (5-10), medium (15-20), complex (25-35), extreme (40-50)
2. Use meta-reasoning checkpoints every 25% to evaluate your progress
3. Track quality metrics to ensure high-standard reasoning
4. Detect and correct any cognitive biases in your thinking
5. Manage your thinking budget efficiently with appropriate mode
6. Use branching to explore different reasoning paths
7. Adjust confidence levels based on evidence and analysis
8. Choose mode labels based on reasoning style needed
9. Set qualityMetrics scores honestly (0-5) for each dimension
10. Mark metaCheckpoint=true periodically for self-evaluation
11. Only set nextThoughtNeeded to false when quality threshold is met
12. **Use clear and specific queries (queries will be automatically improved if needed)**

### Quality Metrics Explained (0-5 scale):
- **Consistency**: How well thoughts connect logically (0=contradictory, 5=perfectly coherent)
- **Completeness**: Coverage of important aspects (0=major gaps, 5=comprehensive)
- **Objectivity**: Freedom from bias (0=highly biased, 5=completely neutral)
- **Practicality**: Real-world applicability (0=theoretical only, 5=immediately actionable)

---

**Sequential Thinking Ultra** - Empowering AI with structured, high-quality reasoning capabilities