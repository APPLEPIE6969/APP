/**
 * AI Provider types and interfaces
 */

export interface AIMessage {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    toolCallId?: string;
}

export interface AIModelConfig {
    provider: string;
    model: string;
    apiKey?: string;
    baseUrl?: string;
    maxTokens?: number;
    temperature?: number;
}

export interface AIProvider {
    name: string;
    displayName: string;
    models: string[];
    createClient: (config: AIModelConfig) => AIProviderClient;
}

export interface AIProviderClient {
    chat(messages: AIMessage[], tools?: any[]): Promise<AIResponse>;
    streamChat?(messages: AIMessage[], tools?: any[]): AsyncGenerator<AIStreamChunk>;
}

export interface AIResponse {
    content: string;
    toolCalls?: AIToolCall[];
    usage?: {
        promptTokens: number;
        completionTokens: number;
        totalTokens: number;
    };
}

export interface AIToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

export interface AIStreamChunk {
    content: string;
    done: boolean;
}
