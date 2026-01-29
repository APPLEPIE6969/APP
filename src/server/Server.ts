import express from 'express';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { pluginManager } from '../core/PluginManager.js';
import { integrationManager } from '../core/IntegrationManager.js';
import { aiProviderManager } from '../core/AIProviderManager.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { logger } from '../utils/Logger.js';
import { generateImageWithFallback } from '../providers/pollinations.provider.js';
import type { AIModelConfig, AIMessage } from '../types/ai.js';

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

export class Server {
    public app: express.Application;
    private server: any;
    private wss: WebSocketServer;
    private config: ConfigManager;

    constructor() {
        this.config = ConfigManager.getInstance();
        this.app = express();
        this.server = createServer(this.app);
        this.wss = new WebSocketServer({ server: this.server });

        this.setupMiddleware();
        this.setupRoutes();
        this.setupWebSocket();
    }

    private setupMiddleware(): void {
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use(express.static('public'));
        this.app.use((_req, _res, next) => {
            logger.info(`${_req.method} ${_req.path}`);
            next();
        });
    }

    // Get API key for a provider from environment variables
    private getApiKeyForProvider(provider: string): string | undefined {
        const envKey = PROVIDER_API_KEYS[provider];
        if (envKey) {
            return process.env[envKey];
        }
        return undefined;
    }

    private setupRoutes(): void {
        // Health check
        this.app.get('/health', (_req, res) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Chat endpoint - supports all providers (OpenAI, Gemini, Groq, Mistral, etc.)
        this.app.post('/api/chat', async (req, res): Promise<void> => {
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
                const apiKey = this.getApiKeyForProvider(provider);

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
        this.app.post('/api/image', async (req, res): Promise<void> => {
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
        this.app.post('/api/conversations', async (_req, res): Promise<void> => {
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

        this.app.get('/api/conversations/:id', (_req, res) => {
            res.json({ messages: [] });
        });

        this.app.delete('/api/conversations/:id', (_req, res) => {
            res.json({ success: true });
        });

        // Plugin management
        this.app.get('/api/plugins', (_req, res) => {
            const plugins = pluginManager.getAllPlugins();
            const stats = pluginManager.getPluginStats();
            res.json({ plugins, stats });
        });

        this.app.get('/api/plugins/:name', (req, res) => {
            const plugin = pluginManager.getPlugin(req.params.name);
            if (!plugin) {
                res.status(404).json({ error: 'Plugin not found' });
                return;
            }
            res.json(plugin);
        });

        this.app.post('/api/plugins/:name/reload', async (req, res) => {
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
        this.app.post('/api/tools/:name', async (req, res) => {
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

        this.app.get('/api/tools', (_req, res) => {
            const tools = pluginManager.getAllTools();
            res.json({ tools, count: tools.length });
        });

        // Integration management
        this.app.get('/api/integrations', (_req, res) => {
            const connections = integrationManager.getAllConnections();
            const stats = integrationManager.getStats();
            res.json({ connections, stats });
        });

        this.app.post('/api/integrations', async (req, res) => {
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

        this.app.delete('/api/integrations/:id', async (req, res) => {
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

        this.app.post('/api/integrations/:id/execute', async (req, res) => {
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

        this.app.post('/api/integrations/:id/test', async (req, res) => {
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

        // Stats endpoint
        this.app.get('/api/stats', (_req, res) => {
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
        this.app.get('/api/keys', async (_req, res) => {
            try {
                const { apiKeyManager } = await import('../core/ApiKeyManager.js');
                await apiKeyManager.initialize();
                const keys = apiKeyManager.getAllKeys();
                res.json({ keys });
            } catch (error) {
                logger.error('Get API keys error', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.post('/api/keys', async (req, res) => {
            try {
                const { apiKeyManager } = await import('../core/ApiKeyManager.js');
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

        this.app.get('/api/keys/:id', async (req, res) => {
            try {
                const { apiKeyManager } = await import('../core/ApiKeyManager.js');
                await apiKeyManager.initialize();
                const apiKey = await apiKeyManager.getKey(req.params.id);

                if (!apiKey) {
                    res.status(404).json({ error: 'API key not found' });
                    return;
                }

                res.json({ apiKey: '***' });
            } catch (error) {
                logger.error('Get API key error', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.put('/api/keys/:id', async (req, res) => {
            try {
                const { apiKeyManager } = await import('../core/ApiKeyManager.js');
                await apiKeyManager.initialize();
                const { apiKey } = req.body;

                if (!apiKey) {
                    res.status(400).json({ error: 'API key is required' });
                    return;
                }

                await apiKeyManager.updateKey(req.params.id, apiKey);
                res.json({ success: true });
            } catch (error) {
                logger.error('Update API key error', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        this.app.delete('/api/keys/:id', async (req, res) => {
            try {
                const { apiKeyManager } = await import('../core/ApiKeyManager.js');
                await apiKeyManager.initialize();
                await apiKeyManager.deleteKey(req.params.id);
                res.json({ success: true });
            } catch (error) {
                logger.error('Delete API key error', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // 404 handler
        this.app.use((_req, res) => {
            res.status(404).json({ error: 'Not found' });
        });

        // Error handler
        this.app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
            logger.error('Unhandled error', err);
            res.status(500).json({ error: 'Internal server error' });
        });
    }

    private setupWebSocket(): void {
        this.wss.on('connection', (ws: WebSocket) => {
            logger.info('New WebSocket connection');

            ws.on('message', async (message: string) => {
                try {
                    const data = JSON.parse(message);

                    switch (data.type) {
                        case 'chat': {
                            const { message: msg, provider, model } = data;

                            if (!msg || !provider) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: { message: 'Message and provider are required' },
                                }));
                                return;
                            }

                            // Get API key from environment variables
                            const apiKey = this.getApiKeyForProvider(provider);

                            // Configure provider
                            const providerInfo = aiProviderManager.getProvider(provider);
                            if (!providerInfo) {
                                ws.send(JSON.stringify({
                                    type: 'error',
                                    data: { message: `Unknown provider: ${provider}` },
                                }));
                                return;
                            }

                            const config: AIModelConfig = {
                                provider,
                                model: model || providerInfo.models[0],
                                apiKey,
                                maxTokens: 4096,
                                temperature: 0.7,
                            };

                            await aiProviderManager.setProvider(config);

                            const messages: AIMessage[] = [
                                { role: 'system', content: SYSTEM_PROMPT },
                                { role: 'user', content: msg },
                            ];

                            const response = await aiProviderManager.chat(messages);

                            ws.send(JSON.stringify({
                                type: 'chat_response',
                                data: response,
                            }));
                            break;
                        }

                        case 'create_conversation': {
                            const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                            ws.send(JSON.stringify({
                                type: 'conversation_created',
                                data: { conversationId },
                            }));
                            break;
                        }

                        case 'execute_tool': {
                            const toolResult = await pluginManager.executeTool(
                                data.toolName,
                                data.params
                            );
                            ws.send(JSON.stringify({
                                type: 'tool_result',
                                data: toolResult,
                            }));
                            break;
                        }

                        default:
                            ws.send(JSON.stringify({
                                type: 'error',
                                data: { message: 'Unknown message type' },
                            }));
                    }
                } catch (error) {
                    logger.error('WebSocket error', error);
                    ws.send(JSON.stringify({
                        type: 'error',
                        data: { message: error instanceof Error ? error.message : 'Unknown error' },
                    }));
                }
            });

            ws.on('close', () => {
                logger.info('WebSocket connection closed');
            });

            ws.on('error', (error) => {
                logger.error('WebSocket error', error);
            });
        });
    }

    public async start(): Promise<void> {
        const serverConfig = this.config.getServerConfig();

        await pluginManager.loadPlugins();

        return new Promise((resolve) => {
            this.server.listen(serverConfig.port, serverConfig.host, () => {
                logger.info(`Server running on http://${serverConfig.host}:${serverConfig.port}`);
                resolve();
            });
        });
    }

    public async stop(): Promise<void> {
        return new Promise((resolve) => {
            this.server.close(() => {
                logger.info('Server stopped');
                resolve();
            });
        });
    }
}
