import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient
} from '../types/ai.js';

export const mockProvider: AIProvider = {
    name: 'mock',
    displayName: 'Mock AI (for testing)',
    models: [
        'mock-model-1',
        'mock-model-2',
    ],
    createClient: (_config: AIModelConfig): AIProviderClient => {
        return {
            chat: async (messages: AIMessage[], _tools?: any[]): Promise<AIResponse> => {
                // Simulate AI response
                await new Promise(resolve => setTimeout(resolve, 500));

                const lastMessage = messages[messages.length - 1];
                let response = '';

                if (lastMessage?.content.toLowerCase().includes('hello')) {
                    response = 'Hello! How can I help you today?';
                } else if (lastMessage?.content.toLowerCase().includes('help')) {
                    response = 'I can help you with various tasks like file operations, web requests, and system commands. Just ask!';
                } else {
                    response = `I received your message: "${lastMessage?.content}". I'm a mock AI for testing purposes. Connect a real AI provider for actual responses.`;
                }

                return {
                    content: response,
                    toolCalls: undefined,
                    usage: {
                        promptTokens: messages.reduce((sum, m) => sum + m.content.length, 0),
                        completionTokens: response.length,
                        totalTokens: messages.reduce((sum, m) => sum + m.content.length, 0) + response.length,
                    },
                };
            },
            streamChat: async function* (messages: AIMessage[], _tools?: any[]): AsyncGenerator<any> {
                const lastMessage = messages[messages.length - 1];
                let response = '';

                if (lastMessage?.content.toLowerCase().includes('hello')) {
                    response = 'Hello! How can I help you today?';
                } else if (lastMessage?.content.toLowerCase().includes('help')) {
                    response = 'I can help you with various tasks like file operations, web requests, and system commands. Just ask!';
                } else {
                    response = `I received your message: "${lastMessage?.content}". I'm a mock AI for testing purposes. Connect a real AI provider for actual responses.`;
                }

                // Simulate streaming
                const words = response.split(' ');
                for (const word of words) {
                    yield { content: word + ' ', done: false };
                    await new Promise(resolve => setTimeout(resolve, 100));
                }
                yield { content: '', done: true };
            },
        };
    },
};
