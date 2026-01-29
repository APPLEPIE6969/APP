import 'dotenv/config';
import express from 'express';
import { pluginManager } from '../src/core/PluginManager.js';
import { integrationManager } from '../src/core/IntegrationManager.js';
import { aiProviderManager } from '../src/core/AIProviderManager.js';
import { logger } from '../src/utils/Logger.js';
import { generateImageWithFallback } from '../src/providers/pollinations.provider.js';
import type { AIModelConfig, AIMessage } from '../src/types/ai.js';

// Map provider names to environment variable names
const PROVIDER_API_KEYS: Record<string, string | undefined> = {
    'openai': 'OPENAI_API_KEY',
    'gemini': 'GEMINI_API_KEY',
    'groq': 'GROQ_API_KEY',
    'mistral': 'MISTRAL_API_KEY',
    'huggingface': 'HUGGINGFACE_API_KEY',
    'pollinations': 'POLLINATIONS_API_KEY',
    'mock': undefined,
};

// System prompt for AI assistant
const SYSTEM_PROMPT = `You are a highly intelligent AI assistant with the ability to connect to and interact with various applications and services. 

Your capabilities include:
- File system operations (read, write, search files)
- Web browsing and scraping
- System command execution
- API integrations with various services
- Data processing and analysis
- Task automation and scheduling

When a user asks you to perform an action:
1. Understand the request thoroughly
2. Choose the appropriate tool(s) for the task
3. Execute the tool(s) with the correct parameters
4. Provide clear feedback on the results
5. If something goes wrong, explain what happened and suggest alternatives

Always be helpful, accurate, and efficient. If you're unsure about something, ask for clarification rather than making assumptions.

Current date and time: ${new Date().toISOString()}`;

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Get API key for a provider from environment variables
function getApiKeyForProvider(provider: string): string | undefined {
    const envKey = PROVIDER_API_KEYS[provider];
    if (envKey) {
        return process.env[envKey];
    }
    return undefined;
}

// Health check
app.get('/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Chat endpoint - supports all providers (OpenAI, Gemini, Groq, Mistral, etc.)
app.post('/api/chat', async (req, res): Promise<void> => {
    try {
        const { message, conversationId, provider, model } = req.body;

        if (!message) {
            res.status(400).json({ error: 'Message is required' });
            return;
        }

        if (!provider) {
            res.status(400).json({ error: 'Provider is required' });
            return;
        }

        // Get API key from environment variables
        const apiKey = getApiKeyForProvider(provider);

        // Check if provider exists
        const providerInfo = aiProviderManager.getProvider(provider);
        if (!providerInfo) {
            res.status(400).json({ error: `Unknown provider: ${provider}` });
            return;
        }

        // Configure the provider
        const config: AIModelConfig = {
            provider,
            model: model || providerInfo.models[0],
            apiKey,
            maxTokens: 4096,
            temperature: 0.7,
        };

        await aiProviderManager.setProvider(config);

        // Prepare messages
        const messages: AIMessage[] = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: message },
        ];

        // Get tools from plugin manager
        const tools = pluginManager.getAllTools();

        // Send message using the provider
        const response = await aiProviderManager.chat(messages, tools);

        res.json({
            conversationId: conversationId || `conv_${Date.now()}`,
            response: response.content,
            toolCalls: response.toolCalls,
        });
    } catch (error) {
        logger.error('Chat error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

// Image generation endpoint (with API key fallback)
app.post('/api/image', async (req, res): Promise<void> => {
    try {
        const { prompt } = req.body;

        if (!prompt) {
            res.status(400).json({ error: 'Prompt is required' });
            return;
        }

        // Get Pollinations API key from .env
        const apiKey = process.env.POLLINATIONS_API_KEY;

        // Generate image with API key fallback
        const imageUrl = await generateImageWithFallback(prompt, apiKey);

        res.json({ url: imageUrl });
    } catch (error) {
        logger.error('Image generation error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

// Conversation management (simplified - no storage, just returns temp ID)
app.post('/api/conversations', async (_req, res): Promise<void> => {
    try {
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        res.json({ conversationId });
    } catch (error) {
        logger.error('Create conversation error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

// Stats endpoint
app.get('/api/stats', (_req, res) => {
    const providers = aiProviderManager.getProviders();
    const pluginStats = pluginManager.getPluginStats();
    const integrationStats = integrationManager.getStats();

    res.json({
        ai: {
            providers: providers.length,
            currentProvider: aiProviderManager.getCurrentProviderName(),
        },
        plugins: pluginStats,
        integrations: integrationStats,
    });
});

// API Key management endpoints
app.get('/api/keys', async (_req, res) => {
    try {
        const { apiKeyManager } = await import('../src/core/ApiKeyManager.js');
        await apiKeyManager.initialize();
        const keys = apiKeyManager.getAllKeys();
        res.json({ keys });
    } catch (error) {
        logger.error('Get API keys error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/keys', async (req, res) => {
    try {
        const { apiKeyManager } = await import('../src/core/ApiKeyManager.js');
        await apiKeyManager.initialize();
        const { name, provider, apiKey } = req.body;

        if (!name || !provider || !apiKey) {
            res.status(400).json({ error: 'Name, provider, and apiKey are required' });
            return;
        }

        const storedKey = await apiKeyManager.addKey(name, provider, apiKey);
        res.json({ key: { id: storedKey.id, name: storedKey.name, provider: storedKey.provider } });
    } catch (error) {
        logger.error('Add API key error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/keys/:id', async (req, res) => {
    try {
        const { apiKeyManager } = await import('../src/core/ApiKeyManager.js');
        await apiKeyManager.initialize();
        const keys = apiKeyManager.getAllKeys();
        const key = keys.find(k => k.id === req.params.id);

        if (!key) {
            res.status(404).json({ error: 'API key not found' });
            return;
        }

        res.json({ key: { id: key.id, name: key.name, provider: key.provider } });
    } catch (error) {
        logger.error('Get API key error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.delete('/api/keys/:id', async (req, res) => {
    try {
        const { apiKeyManager } = await import('../src/core/ApiKeyManager.js');
        await apiKeyManager.initialize();
        await apiKeyManager.deleteKey(req.params.id);
        res.json({ success: true });
    } catch (error) {
        logger.error('Delete API key error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Plugin management
app.get('/api/plugins', (_req, res) => {
    const plugins = pluginManager.getAllPlugins();
    const stats = pluginManager.getPluginStats();
    res.json({ plugins, stats });
});

app.get('/api/plugins/:name', (req, res) => {
    const plugin = pluginManager.getPlugin(req.params.name);
    if (!plugin) {
        res.status(404).json({ error: 'Plugin not found' });
        return;
    }
    res.json(plugin);
});

app.post('/api/plugins/:name/reload', async (req, res) => {
    try {
        await pluginManager.reloadPlugin(req.params.name);
        res.json({ success: true });
    } catch (error) {
        logger.error('Reload plugin error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

// Tool execution
app.post('/api/tools/:name', async (req, res) => {
    try {
        const result = await pluginManager.executeTool(req.params.name, req.body);
        res.json(result);
    } catch (error) {
        logger.error('Tool execution error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

app.get('/api/tools', (_req, res) => {
    const tools = pluginManager.getAllTools();
    res.json({ tools, count: tools.length });
});

// Integration management
app.get('/api/integrations', (_req, res) => {
    const connections = integrationManager.getAllConnections();
    const stats = integrationManager.getStats();
    res.json({ connections, stats });
});

app.post('/api/integrations', async (req, res) => {
    try {
        const result = await integrationManager.connectApp(req.body);
        res.json(result);
    } catch (error) {
        logger.error('Connect app error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

app.delete('/api/integrations/:id', async (req, res) => {
    try {
        const result = await integrationManager.disconnectApp(req.params.id);
        res.json(result);
    } catch (error) {
        logger.error('Disconnect app error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

app.post('/api/integrations/:id/execute', async (req, res) => {
    try {
        const { action, params } = req.body;
        const result = await integrationManager.executeAction(req.params.id, action, params);
        res.json(result);
    } catch (error) {
        logger.error('Execute action error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

app.post('/api/integrations/:id/test', async (req, res) => {
    try {
        const result = await integrationManager.testConnection(req.params.id);
        res.json(result);
    } catch (error) {
        logger.error('Test connection error', error);
        res.status(500).json({
            error: error instanceof Error ? error.message : 'Internal server error',
        });
    }
});

// 404 handler
app.use((_req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
    logger.error('Unhandled error', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Export for Vercel
export default app;
