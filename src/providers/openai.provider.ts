import OpenAI from 'openai';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIToolCall
} from '../types/ai.js';

export const openAIProvider: AIProvider = {
    name: 'openai',
    displayName: 'OpenAI',
    models: [
        // Free/Low-cost Models
        'gpt-4o-mini',
        'gpt-4o-mini-2024-07-18',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-0125',
        'gpt-3.5-turbo-1106',
        'gpt-3.5-turbo-16k',
        'gpt-3.5-turbo-instruct',
        'gpt-3.5-turbo-instruct-0914',
        'gpt-4.1-mini',
        'gpt-4.1-mini-2025-04-14',
        'gpt-4.1-nano',
        'gpt-4.1-nano-2025-04-14',
        'gpt-5-mini',
        'gpt-5-mini-2025-08-07',
        'gpt-5-nano',
        'gpt-5-nano-2025-08-07',
        // Premium Models
        'gpt-4-turbo-preview',
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4-turbo-16k',
        'gpt-4-32k',
        'gpt-4o',
        'gpt-4o-2024-05-13',
        'gpt-4o-2024-08-06',
        'gpt-4o-2024-11-20',
        'gpt-4o-audio-preview',
        'gpt-4o-audio-preview-2024-12-17',
        'gpt-4o-audio-preview-2025-06-03',
        'gpt-4o-mini-audio-preview',
        'gpt-4o-mini-audio-preview-2024-12-17',
        'gpt-4o-mini-tts',
        'gpt-4o-mini-tts-2025-03-20',
        'gpt-4o-mini-tts-2025-12-15',
        'gpt-4o-mini-transcribe',
        'gpt-4o-mini-transcribe-2025-03-20',
        'gpt-4o-mini-transcribe-2025-12-15',
        'gpt-4o-transcribe',
        'gpt-4o-transcribe-diarize',
        'gpt-4o-mini-search-preview',
        'gpt-4o-mini-search-preview-2025-03-11',
        'gpt-4o-search-preview',
        'gpt-4o-search-preview-2025-03-11',
        'gpt-4.1',
        'gpt-4.1-2025-04-14',
        'gpt-5',
        'gpt-5-2025-08-07',
        'gpt-5.1',
        'gpt-5.1-2025-11-13',
        'gpt-5.1-chat-latest',
        'gpt-5.1-codex',
        'gpt-5.1-codex-mini',
        'gpt-5.1-codex-max',
        'gpt-5.2',
        'gpt-5.2-2025-12-11',
        'gpt-5.2-chat-latest',
        'gpt-5.2-codex',
        'gpt-5.2-pro',
        'gpt-5.2-pro-2025-12-11',
        'gpt-5-pro',
        'gpt-5-pro-2025-10-06',
        'gpt-5-chat-latest',
        'gpt-5-search-api',
        'gpt-5-search-api-2025-10-14',
        'gpt-5-codex',
        'gpt-audio',
        'gpt-audio-2025-08-28',
        'gpt-audio-mini',
        'gpt-audio-mini-2025-10-06',
        'gpt-audio-mini-2025-12-15',
        'gpt-image-1',
        'gpt-image-1-mini',
        'gpt-image-1.5',
        'chatgpt-image-latest',
        'dall-e-2',
        'dall-e-3',
        'o1',
        'o1-2024-12-17',
        'o1-mini',
        'o1-mini-2025-01-31',
        'o3',
        'o3-2025-04-16',
        'o3-mini',
        'o3-mini-2025-01-31',
        'o4-mini',
        'o4-mini-2025-04-16',
        'omni-moderation-latest',
        'omni-moderation-2024-09-26',
        'sora-2',
        'sora-2-pro',
        'tts-1',
        'tts-1-1106',
        'tts-1-hd',
        'tts-1-hd-1106',
        'whisper-1',
        'text-embedding-3-small',
        'text-embedding-3-large',
        'text-embedding-ada-002',
        'gpt-realtime',
        'gpt-realtime-2025-08-28',
        'gpt-realtime-mini',
        'gpt-realtime-mini-2025-10-06',
        'gpt-realtime-mini-2025-12-15',
        'babbage-002',
        'davinci-002',
    ],
    createClient: (config: AIModelConfig): AIProviderClient => {
        const client = new OpenAI({
            apiKey: config.apiKey,
            baseURL: config.baseUrl,
        });

        return {
            chat: async (messages: AIMessage[], tools?: any[]): Promise<AIResponse> => {
                const formattedMessages = messages.map(m => {
                    if (m.role === 'tool') {
                        return {
                            role: m.role,
                            content: m.content,
                            tool_call_id: m.toolCallId,
                        };
                    }
                    return {
                        role: m.role,
                        content: m.content,
                    };
                });

                const response = await client.chat.completions.create({
                    model: config.model,
                    messages: formattedMessages as any,
                    tools,
                    tool_choice: 'auto',
                    max_tokens: config.maxTokens,
                    temperature: config.temperature,
                });

                const assistantMessage = response.choices[0].message;

                const toolCalls: AIToolCall[] | undefined = assistantMessage.tool_calls?.map(tc => ({
                    id: tc.id,
                    type: tc.type,
                    function: {
                        name: tc.function.name,
                        arguments: tc.function.arguments,
                    },
                }));

                return {
                    content: assistantMessage.content || '',
                    toolCalls,
                    usage: response.usage ? {
                        promptTokens: response.usage.prompt_tokens,
                        completionTokens: response.usage.completion_tokens,
                        totalTokens: response.usage.total_tokens,
                    } : undefined,
                };
            },
            streamChat: async function* (messages: AIMessage[], tools?: any[]): AsyncGenerator<any> {
                const formattedMessages = messages.map(m => {
                    if (m.role === 'tool') {
                        return {
                            role: m.role,
                            content: m.content,
                            tool_call_id: m.toolCallId,
                        };
                    }
                    return {
                        role: m.role,
                        content: m.content,
                    };
                });

                const stream = await client.chat.completions.create({
                    model: config.model,
                    messages: formattedMessages as any,
                    tools,
                    tool_choice: 'auto',
                    max_tokens: config.maxTokens,
                    temperature: config.temperature,
                    stream: true,
                });

                for await (const chunk of stream) {
                    const delta = chunk.choices[0]?.delta;
                    if (delta?.content) {
                        yield { content: delta.content, done: false };
                    }
                    if (delta?.tool_calls) {
                        for (const toolCall of delta.tool_calls) {
                            yield {
                                content: JSON.stringify({
                                    type: 'tool_call',
                                    tool: toolCall,
                                }),
                                done: false
                            };
                        }
                    }
                    if (chunk.choices[0]?.finish_reason) {
                        yield { content: '', done: true };
                    }
                }
            },
        };
    },
};
