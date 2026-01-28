import OpenAI from 'openai';
import { logger } from '../utils/Logger.js';
import { pluginManager } from './PluginManager.js';
import type {
    Message,
    ToolCall,
    ToolResponse,
    ConversationContext,
    AssistantConfig
} from '../types/index.js';

export class AIAssistant {
    private openai: OpenAI;
    private config: AssistantConfig['openai'];
    private conversations: Map<string, ConversationContext> = new Map();

    constructor(config: AssistantConfig['openai']) {
        this.config = config;
        this.openai = new OpenAI({
            apiKey: config.apiKey,
        });
    }

    public async createConversation(conversationId?: string): Promise<string> {
        const id = conversationId || this.generateConversationId();
        const tools = pluginManager.getAllTools();

        const context: ConversationContext = {
            messages: [
                {
                    role: 'system',
                    content: this.getSystemPrompt(),
                    timestamp: new Date(),
                },
            ],
            tools,
            metadata: {
                createdAt: new Date(),
            },
        };

        this.conversations.set(id, context);
        logger.info(`Created conversation: ${id}`);
        return id;
    }

    public async sendMessage(
        conversationId: string,
        content: string,
        metadata?: Record<string, any>
    ): Promise<{ response: string; toolCalls?: ToolCall[] }> {
        const context = this.conversations.get(conversationId);
        if (!context) {
            throw new Error(`Conversation not found: ${conversationId}`);
        }

        const userMessage: Message = {
            role: 'user',
            content,
            timestamp: new Date(),
            metadata,
        };

        context.messages.push(userMessage);

        try {
            const messages = context.messages.map(m => {
                if (m.role === 'tool') {
                    return {
                        role: m.role,
                        content: m.content,
                        tool_call_id: m.metadata?.toolCallId || '',
                    };
                }
                return {
                    role: m.role,
                    content: m.content,
                };
            });

            const response = await this.openai.chat.completions.create({
                model: this.config.model,
                messages: messages as any,
                tools: this.formatToolsForOpenAI(context.tools),
                tool_choice: 'auto',
                max_tokens: this.config.maxTokens,
                temperature: this.config.temperature,
            });

            const assistantMessage = response.choices[0].message;

            const assistantMsg: Message = {
                role: 'assistant',
                content: assistantMessage.content || '',
                timestamp: new Date(),
            };

            context.messages.push(assistantMsg);

            const toolCalls = assistantMessage.tool_calls?.map(tc => ({
                id: tc.id,
                type: tc.type,
                function: {
                    name: tc.function.name,
                    arguments: tc.function.arguments,
                },
            }));

            if (toolCalls && toolCalls.length > 0) {
                const toolResponses = await this.executeToolCalls(toolCalls);

                for (const toolResponse of toolResponses) {
                    const toolMsg: Message = {
                        role: 'tool',
                        content: toolResponse.content,
                        timestamp: new Date(),
                        metadata: {
                            toolCallId: toolResponse.toolCallId,
                            error: toolResponse.error,
                        },
                    };
                    context.messages.push(toolMsg);
                }

                const followUpResponse = await this.openai.chat.completions.create({
                    model: this.config.model,
                    messages: context.messages.map(m => {
                        if (m.role === 'tool') {
                            return {
                                role: m.role,
                                content: m.content,
                                tool_call_id: m.metadata?.toolCallId || '',
                            };
                        }
                        return {
                            role: m.role,
                            content: m.content,
                        };
                    }) as any,
                    max_tokens: this.config.maxTokens,
                    temperature: this.config.temperature,
                });

                const followUpMessage = followUpResponse.choices[0].message;
                const followUpMsg: Message = {
                    role: 'assistant',
                    content: followUpMessage.content || '',
                    timestamp: new Date(),
                };
                context.messages.push(followUpMsg);

                return { response: followUpMessage.content || '' };
            }

            return { response: assistantMessage.content || '', toolCalls };
        } catch (error) {
            logger.error('Error sending message', error);
            throw error;
        }
    }

    private async executeToolCalls(toolCalls: ToolCall[]): Promise<ToolResponse[]> {
        const responses: ToolResponse[] = [];

        for (const toolCall of toolCalls) {
            try {
                const params = JSON.parse(toolCall.function.arguments);
                const result = await pluginManager.executeTool(toolCall.function.name, params);

                responses.push({
                    toolCallId: toolCall.id,
                    content: JSON.stringify(result),
                });

                logger.debug(`Tool executed: ${toolCall.function.name}`, result);
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : String(error);
                responses.push({
                    toolCallId: toolCall.id,
                    content: JSON.stringify({ error: errorMessage }),
                    error: errorMessage,
                });

                logger.error(`Tool execution failed: ${toolCall.function.name}`, error);
            }
        }

        return responses;
    }

    private formatToolsForOpenAI(tools: any[]): any[] {
        return tools.map(tool => ({
            type: 'function',
            function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
            },
        }));
    }

    private getSystemPrompt(): string {
        return `You are a highly intelligent AI assistant with the ability to connect to and interact with various applications and services. 

Your capabilities include:
- File system operations (read, write, search files)
- Web browsing and scraping
- System command execution
- API integrations with various services
- Data processing and analysis
- Task automation and scheduling

When a user asks you to perform an action:
1. Understand the request thoroughly
2. Choose the appropriate tool(s) for the task
3. Execute the tool(s) with the correct parameters
4. Provide clear feedback on the results
5. If something goes wrong, explain what happened and suggest alternatives

Always be helpful, accurate, and efficient. If you're unsure about something, ask for clarification rather than making assumptions.

Current date and time: ${new Date().toISOString()}`;
    }

    public getConversation(conversationId: string): ConversationContext | undefined {
        return this.conversations.get(conversationId);
    }

    public getAllConversations(): ConversationContext[] {
        return Array.from(this.conversations.values());
    }

    public deleteConversation(conversationId: string): boolean {
        return this.conversations.delete(conversationId);
    }

    public clearAllConversations(): void {
        this.conversations.clear();
        logger.info('Cleared all conversations');
    }

    private generateConversationId(): string {
        return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    public async updateConfig(config: Partial<AssistantConfig['openai']>): Promise<void> {
        this.config = { ...this.config, ...config };
        this.openai = new OpenAI({
            apiKey: this.config.apiKey,
        });
        logger.info('Updated AI assistant configuration');
    }

    public getStats(): {
        activeConversations: number;
        totalMessages: number;
        availableTools: number;
    } {
        let totalMessages = 0;
        for (const context of this.conversations.values()) {
            totalMessages += context.messages.length;
        }

        return {
            activeConversations: this.conversations.size,
            totalMessages,
            availableTools: pluginManager.getAllTools().length,
        };
    }
}
