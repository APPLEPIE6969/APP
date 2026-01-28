import axios from 'axios';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIStreamChunk
} from '../types/ai.js';

export const geminiProvider: AIProvider = {
    name: 'gemini',
    displayName: 'Google Gemini',
    models: [
        // Chat Models
        'gemini-2.5-flash',
        'gemini-2.5-flash-lite',
        'gemini-3-flash-preview',
        'gemini-robotics-er-1.5-preview',
        // Gemma Chat Models (with -it suffix)
        'gemma-3-27b-it',
        'gemma-3-12b-it',
        'gemma-3-4b-it',
        'gemma-3-2b-it',
        'gemma-3-1b-it',
        // Speech Models
        'gemini-2.5-flash-tts',
        // Audio Dialog Models
        'gemini-2.5-flash-preview-native-audio-dialog',
        // Embedding Models
        'text-embedding-004',
    ],
    createClient: (config: AIModelConfig): AIProviderClient => {
        const baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
        const apiKey = config.apiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
            throw new Error('Gemini API key is required. Set GEMINI_API_KEY in .env or provide it in config.');
        }

        return {
            chat: async (messages: AIMessage[], _tools?: any[]): Promise<AIResponse> => {
                try {
                    // Convert messages to Gemini format
                    const contents = messages
                        .filter(m => m.role !== 'tool')
                        .map(m => ({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: m.content }]
                        }));

                    const response = await axios.post(
                        `${baseUrl}/models/${config.model}:generateContent?key=${apiKey}`,
                        {
                            contents,
                            generationConfig: {
                                maxOutputTokens: config.maxTokens || 8192,
                                temperature: config.temperature || 0.7,
                            },
                        },
                        {
                            headers: {
                                'Content-Type': 'application/json',
                            },
                        }
                    );

                    const candidate = response.data.candidates?.[0];
                    const content = candidate?.content?.parts?.[0]?.text || '';
                    const usage = response.data.usageMetadata;

                    return {
                        content,
                        toolCalls: undefined,
                        usage: usage ? {
                            promptTokens: usage.promptTokenCount || 0,
                            completionTokens: usage.candidatesTokenCount || 0,
                            totalTokens: usage.totalTokenCount || 0,
                        } : undefined,
                    };
                } catch (error: any) {
                    throw new Error(`Gemini API error: ${error.response?.data?.error?.message || error.message}`);
                }
            },

            streamChat: async function* (messages: AIMessage[], _tools?: any[]): AsyncGenerator<AIStreamChunk> {
                try {
                    const contents = messages
                        .filter(m => m.role !== 'tool')
                        .map(m => ({
                            role: m.role === 'assistant' ? 'model' : 'user',
                            parts: [{ text: m.content }]
                        }));

                    const response = await axios.post(
                        `${baseUrl}/models/${config.model}:streamGenerateContent?key=${apiKey}`,
                        {
                            contents,
                            generationConfig: {
                                maxOutputTokens: config.maxTokens || 8192,
                                temperature: config.temperature || 0.7,
                            },
                        },
                        {
                            headers: {
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
                            if (line.trim()) {
                                try {
                                    const data = JSON.parse(line);
                                    const candidate = data.candidates?.[0];
                                    const content = candidate?.content?.parts?.[0]?.text || '';
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
                    throw new Error(`Gemini streaming error: ${error.response?.data?.error?.message || error.message}`);
                }
            },
        };
    },
};
