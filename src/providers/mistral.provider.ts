import axios from 'axios';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIStreamChunk
} from '../types/ai.js';

export const mistralProvider: AIProvider = {
    name: 'mistral',
    displayName: 'Mistral AI',
    models: [
        'mistral-small-latest',
        'mistral-medium-latest',
        'mistral-large-latest',
        'codestral-latest',
        'open-mistral-7b',
        'open-mixtral-8x7b',
        'ministral-14b-2512',
    ],
    createClient: (config: AIModelConfig): AIProviderClient => {
        const baseUrl = config.baseUrl || 'https://api.mistral.ai/v1';
        const apiKey = config.apiKey || process.env.MISTRAL_API_KEY;

        if (!apiKey) {
            throw new Error('Mistral API key is required. Set MISTRAL_API_KEY in .env or provide it in config.');
        }

        return {
            chat: async (messages: AIMessage[], _tools?: any[]): Promise<AIResponse> => {
                try {
                    const response = await axios.post(
                        `${baseUrl}/chat/completions`,
                        {
                            model: config.model,
                            messages: messages.map(m => ({
                                role: m.role,
                                content: m.content,
                            })),
                            max_tokens: config.maxTokens || 4096,
                            temperature: config.temperature || 0.7,
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    const choice = response.data.choices?.[0];
                    const usage = response.data.usage;

                    return {
                        content: choice?.message?.content || '',
                        toolCalls: undefined,
                        usage: usage ? {
                            promptTokens: usage.prompt_tokens || 0,
                            completionTokens: usage.completion_tokens || 0,
                            totalTokens: usage.total_tokens || 0,
                        } : undefined,
                    };
                } catch (error: any) {
                    throw new Error(`Mistral API error: ${error.response?.data?.message || error.message}`);
                }
            },

            streamChat: async function* (messages: AIMessage[], _tools?: any[]): AsyncGenerator<AIStreamChunk> {
                try {
                    const response = await axios.post(
                        `${baseUrl}/chat/completions`,
                        {
                            model: config.model,
                            messages: messages.map(m => ({
                                role: m.role,
                                content: m.content,
                            })),
                            max_tokens: config.maxTokens || 4096,
                            temperature: config.temperature || 0.7,
                            stream: true,
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                            responseType: 'stream',
                        }
                    );

                    let buffer = '';
                    for await (const chunk of response.data) {
                        buffer += chunk.toString();
                        const lines = buffer.split('\n');
                        buffer = lines.pop() || '';

                        for (const line of lines) {
                            if (line.startsWith('data: ')) {
                                const data = line.slice(6);
                                if (data === '[DONE]') {
                                    yield { content: '', done: true };
                                    return;
                                }
                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.choices?.[0]?.delta?.content || '';
                                    if (content) {
                                        yield { content, done: false };
                                    }
                                } catch (e) {
                                    // Skip invalid JSON
                                }
                            }
                        }
                    }
                    yield { content: '', done: true };
                } catch (error: any) {
                    throw new Error(`Mistral streaming error: ${error.response?.data?.message || error.message}`);
                }
            },
        };
    },
};
