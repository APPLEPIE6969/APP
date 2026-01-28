import axios from 'axios';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIStreamChunk
} from '../types/ai.js';

export const huggingFaceProvider: AIProvider = {
    name: 'huggingface',
    displayName: 'Hugging Face',
    models: [
        'meta-llama/Llama-3-8b',
        'meta-llama/Llama-3-70b',
        'mistralai/Mistral-7B-Instruct-v0.3',
        'google/gemma-7b',
        'Qwen/Qwen2-72B-Instruct',
        'HuggingFaceH4/zephyr-7b-beta',
        'uncensored-com/unrestricted-gpt-oss-120b-lora',
    ],
    createClient: (config: AIModelConfig): AIProviderClient => {
        const baseUrl = config.baseUrl || 'https://api-inference.huggingface.co/models';
        const apiKey = config.apiKey || process.env.HUGGINGFACE_API_KEY;

        if (!apiKey) {
            throw new Error('Hugging Face API key is required. Set HUGGINGFACE_API_KEY in .env or provide it in config.');
        }

        return {
            chat: async (messages: AIMessage[], _tools?: any[]): Promise<AIResponse> => {
                try {
                    // Convert messages to a single prompt for text-generation models
                    const prompt = messages.map(m => {
                        if (m.role === 'system') return `System: ${m.content}`;
                        if (m.role === 'user') return `User: ${m.content}`;
                        if (m.role === 'assistant') return `Assistant: ${m.content}`;
                        return m.content;
                    }).join('\n') + '\nAssistant:';

                    const response = await axios.post(
                        `${baseUrl}/${config.model}`,
                        {
                            inputs: prompt,
                            parameters: {
                                max_new_tokens: config.maxTokens || 2048,
                                temperature: config.temperature || 0.7,
                                return_full_text: false,
                            },
                        },
                        {
                            headers: {
                                'Authorization': `Bearer ${apiKey}`,
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    const content = Array.isArray(response.data)
                        ? response.data[0]?.generated_text || ''
                        : response.data?.generated_text || '';

                    return {
                        content,
                        toolCalls: undefined,
                        usage: undefined, // Hugging Face doesn't provide token usage
                    };
                } catch (error: any) {
                    throw new Error(`Hugging Face API error: ${error.response?.data?.error || error.message}`);
                }
            },

            streamChat: async function* (messages: AIMessage[], _tools?: any[]): AsyncGenerator<AIStreamChunk> {
                try {
                    const prompt = messages.map(m => {
                        if (m.role === 'system') return `System: ${m.content}`;
                        if (m.role === 'user') return `User: ${m.content}`;
                        if (m.role === 'assistant') return `Assistant: ${m.content}`;
                        return m.content;
                    }).join('\n') + '\nAssistant:';

                    const response = await axios.post(
                        `${baseUrl}/${config.model}`,
                        {
                            inputs: prompt,
                            parameters: {
                                max_new_tokens: config.maxTokens || 2048,
                                temperature: config.temperature || 0.7,
                                return_full_text: false,
                            },
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
                                try {
                                    const parsed = JSON.parse(data);
                                    const content = parsed.token?.text || '';
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
                    throw new Error(`Hugging Face streaming error: ${error.response?.data?.error || error.message}`);
                }
            },
        };
    },
};
