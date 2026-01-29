# Smart AI Assistant

A highly intelligent AI assistant with multi-provider support (OpenAI, Gemini, Groq, Mistral, Hugging Face, Pollinations).

## Configuration

This app uses API keys from the `.env` file. Keys are loaded from environment variables:

| Provider | Environment Variable | Default Model |
|----------|---------------------|---------------|
| OpenAI | `OPENAI_API_KEY` | gpt-4o-mini |
| Google Gemini | `GEMINI_API_KEY` | gemini-2.5-flash |
| Groq | `GROQ_API_KEY` | llama-3.3-70b-versatile |
| Mistral AI | `MISTRAL_API_KEY` | mistral-small-latest |
| Hugging Face | `HUGGINGFACE_API_KEY` | meta-llama/Llama-3-8b |
| Pollinations | `POLLINATIONS_API_KEY` | flux |

## Quick Start

```bash
# Install dependencies
npm install

# Start server (web interface at http://localhost:3000)
npm run dev server

# Or start CLI
npm run dev cli
```

## AI Providers

### OpenAI
- Models: GPT-4o, GPT-4o-mini, GPT-3.5-turbo, o1, o3, and more
- Env: `OPENAI_API_KEY`

### Google Gemini (Free Tier Available)
- Models: Gemini 2.5 Flash, Gemma 3 27B/12B/4B, and more
- Free: 15 RPM, 1,500 requests/day
- Env: `GEMINI_API_KEY`

### Groq (Free Tier Available)
- Models: Llama 3.3 70B, Llama 3.1 8B, Whisper, and more
- Free: 30 RPM
- Env: `GROQ_API_KEY`

### Mistral AI
- Models: Mistral Small, Medium, Large, Codestral
- Env: `MISTRAL_API_KEY`

### Hugging Face
- Models: Llama 3 8B/70B, Mistral 7B, Gemma 7B, and more
- Env: `HUGGINGFACE_API_KEY`

### Pollinations (Free Images)
- Models: Flux, Turbo, Nova Fast (free image generation)
- No key required for basic usage
- Env: `POLLINATIONS_API_KEY` (optional)

## Features

- 💬 Chat with multiple AI providers
- 🎨 Free image generation (Pollinations)
- 🔌 Plugin system (filesystem, web, system)
- 🌐 Web interface with dark/light mode
- 🔐 Encrypted API key storage
- 📡 REST API + WebSocket

## API Keys

API keys are stored in `.env` and encrypted when saved via API. Never commit `.env` to version control!

## License

MIT
