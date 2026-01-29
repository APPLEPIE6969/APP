import axios from 'axios';
import type {
    AIProvider,
    AIModelConfig,
    AIMessage,
    AIResponse,
    AIProviderClient,
    AIStreamChunk
} from '../types/ai.js';

// Generate image URL - tries anonymous first, falls back to API key on rate limit
export async function generateImageWithFallback(prompt: string, apiKey?: string): Promise<string> {
    const safePrompt = encodeURIComponent(prompt);

    // First try anonymous access
    let imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}`;

    try {
        // Try to make a HEAD request to check if anonymous is working
        await axios.head(imageUrl, { timeout: 5000 });
        return imageUrl;
    } catch (error: any) {
        // If anonymous is rate limited (429) or failed, use API key
        if (error.response?.status === 429 || !apiKey) {
            if (apiKey) {
                imageUrl = `https://image.pollinations.ai/prompt/${safePrompt}?key=${apiKey}`;
            }
        }
        return imageUrl;
    }
}

export const pollinationsProvider: AIProvider = {
    name: 'pollinations',
    displayName: 'Pollinations AI (Free & Unlimited)',
    models: [
        // Image Generation Models (Very Cheap: < 0.001/image)
        'flux',
        'zimage',
        'turbo',
        // Text Generation Models (Very Cheap: < 0.5/M input)
        'nova-fast',
        'qwen-coder',
        'gemini-fast',
        'mistral',
        'grok',
        'openai-fast',
        // Video Generation Models (Very Cheap: < 0.03/sec)
        'wan',
    ],
    createClient: (config: AIModelConfig): AIProviderClient => {
        const apiKey = config.apiKey || process.env.POLLINATIONS_API_KEY;

        return {
            chat: async (messages: AIMessage[], _tools?: any[]): Promise<AIResponse> => {
                try {
                    // Extract the prompt from the last user message
                    const lastMessage = messages[messages.length - 1];
                    const prompt = lastMessage?.content || 'a beautiful landscape';

                    // Generate image URL with fallback to API key
                    const imageUrl = await generateImageWithFallback(prompt, apiKey);

                    // Return the image URL as content
                    return {
                        content: `Image generated: ${imageUrl}`,
                        toolCalls: undefined,
                        usage: undefined,
                    };
                } catch (error: any) {
                    throw new Error(`Pollinations error: ${error.message}`);
                }
            },

            streamChat: async function* (messages: AIMessage[], _tools?: any[]): AsyncGenerator<AIStreamChunk> {
                try {
                    const lastMessage = messages[messages.length - 1];
                    const prompt = lastMessage?.content || 'a beautiful landscape';

                    // Generate image URL with fallback to API key
                    const imageUrl = await generateImageWithFallback(prompt, apiKey);

                    // Simulate streaming by yielding the URL in chunks
                    const message = `Image generated: ${imageUrl}`;
                    const words = message.split(' ');
                    for (const word of words) {
                        yield { content: word + ' ', done: false };
                    }
                    yield { content: '', done: true };
                } catch (error: any) {
                    throw new Error(`Pollinations streaming error: ${error.message}`);
                }
            },
        };
    },
};

// Helper function to generate an image directly (with API key fallback)
export async function generateImage(prompt: string, apiKey?: string, _model: string = 'flux'): Promise<string> {
    return generateImageWithFallback(prompt, apiKey);
}

// Helper function to download an image from Pollinations
export async function downloadImage(prompt: string, outputPath: string, apiKey?: string, _model: string = 'flux'): Promise<void> {
    const imageUrl = await generateImageWithFallback(prompt, apiKey);
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });

    const fs = await import('fs');
    const path = await import('path');

    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, response.data);
}
