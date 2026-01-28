import axios from 'axios';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIStreamChunk
} from '../types/ai.js';

export const groqProvider: AIProvider = {
    name: 'groq',
    displayName: 'Groq (Fastest)',
    models: [
        // Chat Completions Models
        'allam-2-7b',
        'groq/compound',
        'groq/compound-mini',
        'llama-3.1-8b-instant',
        'llama-3.3-70b-versatile',
        'meta-llama/llama-4-maverick-17b-128e-instruct',
        'meta-llama/llama-4-scout-17b-16e-instruct',
        'meta-llama/llama-guard-4-12b',
        'meta-llama/llama-prompt-guard-2-22m',
        'meta-llama/llama-prompt-guard-2-86m',
        'moonshotai/kimi-k2-instruct',
        'moonshotai/kimi-k2-instruct-0905',
        'openai/gpt-oss-120b',
        'openai/gpt-oss-20b',
        'openai/gpt-oss-safeguard-20b',
        'qwen/qwen3-32b',
        // Speech to Text Models
        'whisper-large-v3',
        'whisper-large-v3-turbo',
        // Text to Speech Models
        'canopylabs/orpheus-arabic-saudi',
        'canopylabs/orpheus-v1-english',
    ],
    createClient: (config: AIModelConfig): AIProviderClient => {
        const baseUrl = config.baseUrl || 'https://api.groq.com/openai/v1';
        const apiKey = config.apiKey || process.env.GROQ_API_KEY;

        if (!apiKey) {
            throw new Error('Groq API key is required. Set GROQ_API_KEY in .env or provide it in config.');
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
                    throw new Error(`Groq API error: ${error.response?.data?.error?.message || error.message}`);
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
                    throw new Error(`Groq streaming error: ${error.response?.data?.error?.message || error.message}`);
                }
            },
        };
    },
};
