# Smart AI Assistant

A highly intelligent AI assistant that can connect to multiple applications and perform actions across them. Built with a plugin-based architecture for extensibility and flexibility.

## Features

- 🤖️ **AI-Powered**: Uses OpenAI's GPT models for intelligent conversation
- 🔄 **Multi-Provider Support**: Easy switching between AI providers (OpenAI, Anthropic, custom, etc.)
- 🔌 **Plugin System**: Extensible plugin architecture for adding new capabilities
- 🔗 **App Integrations**: Connect to various applications via API, browser automation, CLI, or custom handlers
- 🔐 **API Key Management**: Secure storage and management of API keys with encryption
-  **File System Operations**: Read, write, search, and manage files
- 🌐 **Web Operations**: HTTP requests, web scraping, and API interactions
- 💻 **System Commands**: Execute shell commands and get system information
- 🖥️ **CLI Interface**: Interactive command-line interface
- 🌍 **Web Server**: REST API + WebSocket support for web clients
- ⚙️ **Configurable**: Flexible configuration via environment variables

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd smart-ai-assistant
```

2. Install dependencies:
```bash
npm install
```

3. Copy the example environment file and configure it:
```bash
cp .env.example .env
```

4. Edit `.env` and add your OpenAI API key:
```
OPENAI_API_KEY=your_openai_api_key_here
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

## Usage

### CLI Mode

Start the interactive CLI:
```bash
npm run dev cli
```

Or after building:
```bash
npm start -- cli
```

### Server Mode

Start the web server:
```bash
npm run dev server
```

Or with custom port:
```bash
npm start -- server --port 8080
```

### Quick Chat

Send a single message:
```bash
npm start -- chat "Hello, how can you help me?"
```

### List Plugins/Tools

View all available plugins:
```bash
npm start -- plugins
```

View all available tools:
```bash
npm start -- tools
```

### AI Provider Management

List all available AI providers:
```bash
npm start -- ai-providers
```

Set the AI provider:
```bash
npm start -- set-ai-provider --provider openai --model gpt-4-turbo-preview
```

Show current AI provider:
```bash
npm start -- current-ai-provider
```

### Configuration

View current configuration:
```bash
npm start -- config
```

Validate configuration:
```bash
npm start -- validate
```

## API Endpoints

### Chat
- `POST /api/chat` - Send a message to the AI
- `POST /api/conversations` - Create a new conversation
- `GET /api/conversations/:id` - Get conversation details
- `DELETE /api/conversations/:id` - Delete a conversation

### Plugins
- `GET /api/plugins` - List all plugins
- `GET /api/plugins/:name` - Get plugin details
- `POST /api/plugins/:name/reload` - Reload a plugin

### Tools
- `GET /api/tools` - List all tools
- `POST /api/tools/:name` - Execute a tool

### Integrations
- `GET /api/integrations` - List all integrations
- `POST /api/integrations` - Add a new integration
- `DELETE /api/integrations/:id` - Remove an integration
- `POST /api/integrations/:id/execute` - Execute an action on an integration
- `POST /api/integrations/:id/test` - Test an integration connection

### API Keys
- `GET /api/keys` - List all stored API keys
- `POST /api/keys` - Add a new API key
- `GET /api/keys/:id` - Get an API key (returns masked value)
- `PUT /api/keys/:id` - Update an API key
- `DELETE /api/keys/:id` - Delete an API key

### Stats
- `GET /api/stats` - Get system statistics

### WebSocket

Connect to `ws://localhost:3000` for real-time communication.

Message format:
```json
{
  "type": "chat",
  "conversationId": "conv_123",
  "message": "Hello"
}
```

## Available Plugins

### Filesystem Plugin
- `read_file` - Read file contents
- `write_file` - Write content to a file
- `list_directory` - List files and directories
- `delete_file` - Delete a file or directory
- `get_file_info` - Get file information

### Web Plugin
- `http_get` - Make HTTP GET request
- `http_post` - Make HTTP POST request
- `http_put` - Make HTTP PUT request
- `http_delete` - Make HTTP DELETE request
- `scrape_webpage` - Scrape content from a webpage
- `api_request` - Make custom API requests

### System Plugin
- `execute_command` - Execute shell commands
- `get_system_info` - Get system information
- `get_process_info` - Get process information
- `kill_process` - Kill a process
- `list_environment_variables` - List environment variables
- `get_disk_usage` - Get disk usage
- `schedule_task` - Schedule a task

## AI Providers

### OpenAI Provider
- Models: gpt-4-turbo-preview, gpt-4, gpt-3.5-turbo, gpt-3.5-turbo-16k, gpt-4-turbo, gpt-4-turbo-16k, gpt-4-32k
- Supports: Chat completions, streaming, tool calling

### Mock Provider (for testing)
- Models: mock-model-1, mock-model-2
- Purpose: Testing without API calls
- Simulates responses for common queries

### Adding Custom AI Providers

Create a new provider in [`src/providers/`](src/providers/):
```typescript
import type { 
  AIProvider, 
  AIModelConfig, 
  AIMessage, 
  AIResponse,
  AIProviderClient 
} from '../types/ai.js';

export const myProvider: AIProvider = {
  name: 'my-provider',
  displayName: 'My AI Provider',
  models: ['model-1', 'model-2'],
  createClient: (config: AIModelConfig): AIProviderClient => {
    return {
      chat: async (messages: AIMessage[], tools?: any[]): Promise<AIResponse> => {
        // Implement your chat logic
        return { content: 'Response from your AI' };
      },
    };
  },
};
```

Then register it in [`src/index.ts`](src/index.ts):
```typescript
import { myProvider } from './providers/my-provider.js';
aiProviderManager.registerProvider(myProvider);
```

## Creating Custom Plugins

Create a new plugin in [`src/plugins/`](src/plugins/):
```typescript
import type { Plugin, ToolResult } from '../types/index.js';

const myPlugin: Plugin = {
  name: 'my-plugin',
  version: '1.0.0',
  description: 'My custom plugin',
  enabled: true,
  tools: [
    {
      name: 'my_tool',
      description: 'Description of my tool',
      parameters: {
        type: 'object',
        properties: {
          param1: { type: 'string', description: 'Parameter description' },
        },
        required: ['param1'],
      },
      execute: async (params): Promise<ToolResult> => {
        // Your tool logic here
        return { success: true, data: { result: 'success' } };
      },
    },
  ],
};

export default myPlugin;
```

## API Key Management

The assistant includes secure API key storage with AES-256 encryption:

### Adding an API Key
```bash
curl -X POST http://localhost:3000/api/keys \
  -H "Content-Type: application/json" \
  -d '{"name":"My OpenAI Key","provider":"openai","apiKey":"sk-..."}'
```

### Listing API Keys
```bash
curl http://localhost:3000/api/keys
```

### Updating an API Key
```bash
curl -X PUT http://localhost:3000/api/keys/{key_id} \
  -H "Content-Type: application/json" \
  -d '{"apiKey":"sk-new-..."}'
```

### Deleting an API Key
```bash
curl -X DELETE http://localhost:3000/api/keys/{key_id}
```

All API keys are encrypted using AES-256-CBC encryption before storage.

## Configuration

Configuration is done via environment variables. See [`.env.example`](.env.example) for all available options.

### OpenAI Configuration
- `OPENAI_API_KEY` - Your OpenAI API key (required)
- `OPENAI_MODEL` - Model to use (default: gpt-4-turbo-preview)
- `OPENAI_MAX_TOKENS` - Maximum tokens (default: 4096)
- `OPENAI_TEMPERATURE` - Temperature (default: 0.7)

### Server Configuration
- `PORT` - Server port (default: 3000)
- `HOST` - Server host (default: localhost)

### Plugin Configuration
- `PLUGINS_DIR` - Plugins directory (default: ./src/plugins)
- `ENABLED_PLUGINS` - Comma-separated list of enabled plugins

### Logging Configuration
- `LOG_LEVEL` - Log level (debug, info, warn, error)
- `LOG_FILE` - Log file path

### Security Configuration
- `ENCRYPTION_KEY` - 32-character key for API key encryption (required for key storage)
- `API_SECRET_KEY` - Secret key for API authentication (optional)
- `ENABLE_AUTH` - Enable API authentication (default: false)

## Development

### Build
```bash
npm run build
```

### Watch Mode
```bash
npm run dev
```

### Run Tests
```bash
npm test
```

## Architecture

```
smart-ai-assistant/
├── src/
│   ├── cli/           # CLI interface
│   ├── config/        # Configuration management
│   ├── core/          # Core functionality
│   │   ├── AIAssistant.ts      # AI assistant with OpenAI
│   │   ├── AIProviderManager.ts # AI provider management
│   │   ├── ApiKeyManager.ts    # API key storage with encryption
│   │   ├── PluginManager.ts    # Plugin management
│   │   └── IntegrationManager.ts # App integrations
│   ├── plugins/       # Plugin implementations
│   │   ├── filesystem.plugin.ts  # File system operations
│   │   ├── web.plugin.ts         # Web operations
│   │   └── system.plugin.ts      # System commands
│   ├── providers/     # AI provider implementations
│   │   ├── openai.provider.ts   # OpenAI provider
│   │   └── mock.provider.ts      # Mock provider for testing
│   ├── server/        # Web server
│   ├── types/         # TypeScript types
│   │   ├── index.ts            # Main types
│   │   └── ai.ts              # AI provider types
│   ├── utils/         # Utilities
│   └── index.ts       # Entry point
├── data/             # Encrypted API keys storage
├── package.json
├── tsconfig.json
└── README.md
```

## Security

- Keep your OpenAI API key secure
- Use environment variables for sensitive configuration
- Enable authentication in production
- Validate all user inputs
- Use rate limiting to prevent abuse
- API keys are encrypted using AES-256-CBC before storage
- Set a strong ENCRYPTION_KEY in your environment

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
