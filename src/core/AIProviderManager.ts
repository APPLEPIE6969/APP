import { logger } from '../utils/Logger.js';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIStreamChunk
} from '../types/ai.js';

export class AIProviderManager {
    private static instance: AIProviderManager;
    private providers: Map<string, AIProvider> = new Map();
    private currentProvider: AIProviderClient | null = null;
    private currentConfig: AIModelConfig | null = null;

    private constructor() { }

    public static getInstance(): AIProviderManager {
        if (!AIProviderManager.instance) {
            AIProviderManager.instance = new AIProviderManager();
        }
        return AIProviderManager.instance;
    }

    public registerProvider(provider: AIProvider): void {
        this.providers.set(provider.name, provider);
        logger.info(`Registered AI provider: ${provider.displayName}`);
    }

    public unregisterProvider(providerName: string): void {
        this.providers.delete(providerName);
        logger.info(`Unregistered AI provider: ${providerName}`);
    }

    public getProviders(): AIProvider[] {
        return Array.from(this.providers.values());
    }

    public getProvider(name: string): AIProvider | undefined {
        return this.providers.get(name);
    }

    public async setProvider(config: AIModelConfig): Promise<void> {
        const provider = this.providers.get(config.provider);
        if (!provider) {
            throw new Error(`AI provider not found: ${config.provider}`);
        }

        this.currentConfig = config;
        this.currentProvider = provider.createClient(config);
        logger.info(`Set AI provider: ${config.provider} with model: ${config.model}`);
    }

    public async chat(messages: AIMessage[], tools?: any[]): Promise<AIResponse> {
        if (!this.currentProvider) {
            throw new Error('No AI provider configured. Call setProvider() first.');
        }

        return await this.currentProvider.chat(messages, tools);
    }

    public async *streamChat(messages: AIMessage[], tools?: any[]): AsyncGenerator<AIStreamChunk> {
        if (!this.currentProvider) {
            throw new Error('No AI provider configured. Call setProvider() first.');
        }

        if (this.currentProvider.streamChat) {
            yield* this.currentProvider.streamChat(messages, tools);
        } else {
            // Fallback to non-streaming
            const response = await this.currentProvider.chat(messages, tools);
            yield { content: response.content, done: true };
        }
    }

    public getCurrentConfig(): AIModelConfig | null {
        return this.currentConfig;
    }

    public getCurrentProviderName(): string | null {
        return this.currentConfig?.provider || null;
    }
}

export const aiProviderManager = AIProviderManager.getInstance();
