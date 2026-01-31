import 'dotenv/config';
import express from 'express';
import { ConfigManager } from './config/ConfigManager.js';
import { logger } from './utils/Logger.js';
import { aiProviderManager } from './core/AIProviderManager.js';
import { openAIProvider } from './providers/openai.provider.js';
import { mockProvider } from './providers/mock.provider.js';
import { geminiProvider } from './providers/gemini.provider.js';
import { groqProvider } from './providers/groq.provider.js';
import { mistralProvider } from './providers/mistral.provider.js';
import { huggingFaceProvider } from './providers/huggingface.provider.js';
import { pollinationsProvider } from './providers/pollinations.provider.js';
import type { AIMessage } from './types/ai.js';

// Register AI providers
aiProviderManager.registerProvider(openAIProvider);
aiProviderManager.registerProvider(mockProvider);
aiProviderManager.registerProvider(geminiProvider);
aiProviderManager.registerProvider(groqProvider);
aiProviderManager.registerProvider(mistralProvider);
aiProviderManager.registerProvider(huggingFaceProvider);
aiProviderManager.registerProvider(pollinationsProvider);

// Create Express app
const app = express();

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// API key mapping for environment variables
const PROVIDER_API_KEYS: Record<string, string> = {
    openai: 'OPENAI_API_KEY',
    gemini: 'GEMINI_API_KEY',
    groq: 'GROQ_API_KEY',
    mistral: 'MISTRAL_API_KEY',
    huggingface: 'HUGGINGFACE_API_KEY',
    pollinations: 'POLLINATIONS_API_KEY',
    anthropic: 'ANTHROPIC_API_KEY',
};

// Get API key for provider from environment variables
function getApiKeyForProvider(provider: string): string | undefined {
    const envVarName = PROVIDER_API_KEYS[provider.toLowerCase()];
    if (envVarName) {
        return process.env[envVarName];
    }
    return undefined;
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get available models endpoint
app.get('/api/models', (_req, res) => {
    try {
        const providers = aiProviderManager.getProviders();
        const models: any[] = [];
        
        for (const provider of providers) {
            for (const model of provider.models) {
                models.push({
                    id: model,
                    name: model,
                    provider: provider.name,
                    displayName: provider.displayName,
                });
            }
        }
        
        res.json({ models });
    } catch (error) {
        logger.error('Error getting models:', error);
        res.status(500).json({ error: 'Failed to get models' });
    }
});

// Get available providers endpoint
app.get('/api/providers', (_req, res) => {
    try {
        const providers = aiProviderManager.getProviders();
        const providerList = providers.map(p => ({
            name: p.name,
            displayName: p.displayName,
            models: p.models,
        }));
        
        res.json({ providers: providerList });
    } catch (error) {
        logger.error('Error getting providers:', error);
        res.status(500).json({ error: 'Failed to get providers' });
    }
});

// Chat endpoint
app.post('/api/chat', async (req, res): Promise<void> => {
    try {
        const { messages, provider, model, apiKey, maxTokens, temperature } = req.body;

        if (!messages || !Array.isArray(messages)) {
            res.status(400).json({ error: 'Messages array is required' });
            return;
        }

        const config = ConfigManager.getInstance();
        const openaiConfig = config.getOpenAIConfig();

        // Get API key from request body or environment variables
        const effectiveApiKey = apiKey || getApiKeyForProvider(provider) || openaiConfig.apiKey;

        // Set the provider with the API key
        await aiProviderManager.setProvider({
            provider: provider || 'openai',
            model: model || openaiConfig.model,
            apiKey: effectiveApiKey,
            maxTokens: maxTokens || openaiConfig.maxTokens,
            temperature: temperature || openaiConfig.temperature,
        });

        // Send the message
        const response = await aiProviderManager.chat(messages as AIMessage[]);

        res.json({
            content: response.content,
            toolCalls: response.toolCalls,
            usage: response.usage,
            provider: aiProviderManager.getCurrentProviderName(),
            model: aiProviderManager.getCurrentConfig()?.model,
        });
    } catch (error) {
        logger.error('Chat error:', error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        res.status(500).json({ error: errorMessage });
    }
});

// Export the Express app for Vercel
export default app;
