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
                const userMessage = lastMessage?.content.toLowerCase() || '';
                let response = '';

                // Smart responses based on message content
                if (userMessage.includes('hello') || userMessage.includes('hi') || userMessage.includes('hey')) {
                    response = `👋 **Hello there!**

I'm your AI assistant, currently running in **mock mode** for testing.

I can help you with:
- 💬 **Chat conversations**
- 📁 **File operations**
- 🌐 **Web requests**
- 💻 **Code assistance**
- 📝 **Text summarization**

To get real AI responses, select a provider like **Pollinations AI** (free) or add your API key for providers like OpenAI, Groq, or Gemini.

What would you like to do?`;
                } else if (userMessage.includes('help') || userMessage.includes('what can you do')) {
                    response = `🛠️ **I can help you with many tasks!**

**Available features:**
- 💬 General chat and Q&A
- 💻 Write, review, and debug code
- 📝 Summarize long texts
- 🌐 Search the web (with plugins)
- 📁 Read and write files
- 🔧 Execute system commands
- 🎨 Generate images (with Pollinations)

**To unlock full capabilities:**
1. Use **Pollinations AI** - Free, no API key needed!
2. Add API keys for **OpenAI**, **Groq**, **Gemini**, etc.

What would you like to try?`;
                } else if (userMessage.includes('code') || userMessage.includes('programming') || userMessage.includes('write')) {
                    response = `💻 **Programming Assistant**

I can help you with:
- Writing code in any language
- Debugging issues
- Explaining algorithms
- Code review and optimization

Example topics:
- JavaScript, Python, TypeScript
- React, Node.js, and more
- APIs and databases

*Note: For real code execution, add an API key for a proper AI provider.*

What would you like help with?`;
                } else if (userMessage.includes('file') || userMessage.includes('read') || userMessage.includes('write')) {
                    response = `📁 **File Operations**

I have access to file system tools for:
- Reading files
- Writing files
- Searching directories
- Managing files

*These features work locally when running the server.*

Would you like me to read or write a file?`;
                } else if (userMessage.includes('image') || userMessage.includes('generate') || userMessage.includes('picture')) {
                    response = `🎨 **Image Generation**

I can generate images using **Pollinations AI**!

Just switch to the **Image** tab and describe what you want to create. No API key needed - it's completely free!

What would you like to draw?`;
                } else {
                    // Default conversational response
                    const responses = [
                        `🤔 **Interesting question!**

I'm running in mock mode, so I'll give you a simulated response.

To get real AI answers, try:
1. **Pollinations AI** - Free, instant responses
2. Add API keys for other providers

Meanwhile, I'm happy to chat! What else is on your mind?`,

                        `💭 **Got it!**

I'm currently in test mode (mock AI), but I understand you said: "${lastMessage?.content}"

For real AI responses:
- 🌟 Select **Pollinations AI** (no key needed)
- 🔑 Add your API key for premium models

How can I help you further?`,

                        `👀 **I see what you're saying**

"${lastMessage?.content}"

That's a great topic! In mock mode I can simulate responses, but for full AI capabilities:

✅ **Try Pollinations AI** - Best free option!
✅ **Add Groq API key** - Super fast responses
✅ **Add OpenAI key** - GPT-4 powered

What would you like to explore?`
                    ];
                    response = responses[Math.floor(Math.random() * responses.length)];
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
                const userMessage = lastMessage?.content.toLowerCase() || '';
                let response = '';

                if (userMessage.includes('hello') || userMessage.includes('hi')) {
                    response = '👋 Hello! How can I help you today?';
                } else if (userMessage.includes('help')) {
                    response = '🛠️ I can help with chat, code, files, and more!';
                } else {
                    response = `I understand: "${lastMessage?.content}". In mock mode, try Pollinations AI for real responses!`;
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
