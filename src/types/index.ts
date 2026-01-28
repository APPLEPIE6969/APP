/**
 * Core types and interfaces for the AI Assistant
 */

export interface Message {
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    timestamp?: Date;
    metadata?: Record<string, any>;
}

export interface ToolCall {
    id: string;
    type: string;
    function: {
        name: string;
        arguments: string;
    };
}

export interface ToolResponse {
    toolCallId: string;
    content: string;
    error?: string;
}

export interface ConversationContext {
    messages: Message[];
    tools: Tool[];
    metadata: Record<string, any>;
}

export interface Tool {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
    execute: (params: any) => Promise<ToolResult>;
}

export interface ToolResult {
    success: boolean;
    data?: any;
    error?: string;
    metadata?: Record<string, any>;
}

export interface Plugin {
    name: string;
    version: string;
    description: string;
    author?: string;
    enabled: boolean;
    tools: Tool[];
    initialize?: () => Promise<void>;
    cleanup?: () => Promise<void>;
}

export interface Integration {
    name: string;
    type: string;
    config: Record<string, any>;
    connected: boolean;
    lastUsed?: Date;
}

export interface AssistantConfig {
    openai: {
        apiKey: string;
        model: string;
        maxTokens: number;
        temperature: number;
    };
    server: {
        port: number;
        host: string;
    };
    plugins: {
        directory: string;
        enabled: string[];
    };
    logging: {
        level: string;
        file: string;
    };
    security: {
        apiKey: string;
        enableAuth: boolean;
    };
}

export interface Task {
    id: string;
    type: string;
    description: string;
    status: 'pending' | 'running' | 'completed' | 'failed';
    progress: number;
    result?: any;
    error?: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
    error?: string;
    executionTime?: number;
}

export interface Capability {
    name: string;
    description: string;
    category: string;
    enabled: boolean;
    requiresAuth?: boolean;
}

export interface AppConnection {
    appId: string;
    appName: string;
    type: 'api' | 'browser' | 'cli' | 'custom';
    status: 'connected' | 'disconnected' | 'error';
    capabilities: string[];
    config: Record<string, any>;
    lastUsed?: Date;
}
