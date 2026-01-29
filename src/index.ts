#!/usr/bin/env node

import 'dotenv/config';
import { Command } from 'commander';
import { CLI } from './cli/CLI.js';
import { Server } from './server/Server.js';
import { ConfigManager } from './config/ConfigManager.js';
import { logger } from './utils/Logger.js';
import { aiProviderManager } from './core/AIProviderManager.js';
import { openAIProvider } from './providers/openai.provider.js';
import { mockProvider } from './providers/mock.provider.js';
import { geminiProvider } from './providers/gemini.provider.js';
import { groqProvider } from './providers/groq.provider.js';
import { mistralProvider } from './providers/mistral.provider.js';
import { huggingFaceProvider } from './providers/huggingface.provider.js';
import { pollinationsProvider } from './providers/pollinations.provider.js';

// Register AI providers
aiProviderManager.registerProvider(openAIProvider);
aiProviderManager.registerProvider(mockProvider);
aiProviderManager.registerProvider(geminiProvider);
aiProviderManager.registerProvider(groqProvider);
aiProviderManager.registerProvider(mistralProvider);
aiProviderManager.registerProvider(huggingFaceProvider);
aiProviderManager.registerProvider(pollinationsProvider);

const program = new Command();

program
    .name('smart-ai-assistant')
    .description('A smart AI assistant that can connect to multiple applications')
    .version('1.0.0');

program
    .command('cli')
    .description('Start the interactive CLI')
    .action(async () => {
        try {
            const cli = new CLI();
            await cli.start();
        } catch (error) {
            logger.error('CLI error', error);
            process.exit(1);
        }
    });

program
    .command('server')
    .description('Start the web server')
    .option('-p, --port <port>', 'Port to run the server on')
    .option('-h, --host <host>', 'Host to bind the server to')
    .action(async (options) => {
        try {
            const config = ConfigManager.getInstance();

            if (options.port) {
                await config.updateConfig({
                    server: {
                        ...config.getServerConfig(),
                        port: parseInt(options.port, 10),
                    },
                });
            }

            if (options.host) {
                await config.updateConfig({
                    server: {
                        ...config.getServerConfig(),
                        host: options.host,
                    },
                });
            }

            const server = new Server();
            await server.start();

            process.on('SIGINT', async () => {
                logger.info('Shutting down server...');
                await server.stop();
                process.exit(0);
            });

            process.on('SIGTERM', async () => {
                logger.info('Shutting down server...');
                await server.stop();
                process.exit(0);
            });
        } catch (error) {
            logger.error('Server error', error);
            process.exit(1);
        }
    });

program
    .command('chat')
    .description('Quick chat mode (single message)')
    .argument('<message>', 'Message to send to the AI')
    .option('-c, --conversation <id>', 'Conversation ID to use')
    .action(async (message, options) => {
        try {
            const { AIAssistant } = await import('./core/AIAssistant.js');
            const config = ConfigManager.getInstance();
            const assistant = new AIAssistant(config.getOpenAIConfig());

            const conversationId = options.conversation || await assistant.createConversation();
            const response = await assistant.sendMessage(conversationId, message);

            console.log(response.response);
            console.log(`\nConversation ID: ${conversationId}`);
        } catch (error) {
            logger.error('Chat error', error);
            process.exit(1);
        }
    });

program
    .command('plugins')
    .description('List all available plugins')
    .action(async () => {
        try {
            const { pluginManager } = await import('./core/PluginManager.js');
            await pluginManager.loadPlugins();

            const plugins = pluginManager.getAllPlugins();
            const stats = pluginManager.getPluginStats();

            console.log(`\nPlugins (${stats.totalPlugins} total, ${stats.enabledPlugins} enabled):\n`);

            for (const plugin of plugins) {
                const status = plugin.enabled ? '✓' : '✗';
                console.log(`${status} ${plugin.name} v${plugin.version}`);
                console.log(`  ${plugin.description}`);
                console.log(`  Tools: ${plugin.tools.length}\n`);
            }
        } catch (error) {
            logger.error('Plugins error', error);
            process.exit(1);
        }
    });

program
    .command('tools')
    .description('List all available tools')
    .action(async () => {
        try {
            const { pluginManager } = await import('./core/PluginManager.js');
            await pluginManager.loadPlugins();

            const tools = pluginManager.getAllTools();

            console.log(`\nTools (${tools.length} total):\n`);

            for (const tool of tools) {
                console.log(`• ${tool.name}`);
                console.log(`  ${tool.description}\n`);
            }
        } catch (error) {
            logger.error('Tools error', error);
            process.exit(1);
        }
    });

program
    .command('config')
    .description('Show current configuration')
    .action(() => {
        const config = ConfigManager.getInstance().getConfig();

        console.log('\nCurrent Configuration:\n');
        console.log('OpenAI:');
        console.log(`  Model: ${config.openai.model}`);
        console.log(`  Max Tokens: ${config.openai.maxTokens}`);
        console.log(`  Temperature: ${config.openai.temperature}`);
        console.log(`  API Key: ${config.openai.apiKey ? '***set***' : 'not set'}\n`);

        console.log('Server:');
        console.log(`  Port: ${config.server.port}`);
        console.log(`  Host: ${config.server.host}\n`);

        console.log('Plugins:');
        console.log(`  Directory: ${config.plugins.directory}`);
        console.log(`  Enabled: ${config.plugins.enabled.join(', ') || 'none'}\n`);

        console.log('Logging:');
        console.log(`  Level: ${config.logging.level}`);
        console.log(`  File: ${config.logging.file}\n`);
    });

program
    .command('validate')
    .description('Validate configuration')
    .action(() => {
        const config = ConfigManager.getInstance();
        const validation = config.validateConfig();

        if (validation.valid) {
            console.log('\n✓ Configuration is valid\n');
            process.exit(0);
        } else {
            console.log('\n✗ Configuration validation failed:\n');
            validation.errors.forEach(error => console.log(`  - ${error}`));
            console.log();
            process.exit(1);
        }
    });

program
    .command('ai-providers')
    .description('List all available AI providers')
    .action(() => {
        const providers = aiProviderManager.getProviders();
        const currentProvider = aiProviderManager.getCurrentProviderName();

        console.log('\nAvailable AI Providers:\n');
        for (const provider of providers) {
            const isCurrent = provider.name === currentProvider ? ' (current)' : '';
            console.log(`• ${provider.displayName}${isCurrent}`);
            console.log(`  Models: ${provider.models.join(', ')}\n`);
        }
    });

program
    .command('set-ai-provider')
    .description('Set the AI provider')
    .option('-p, --provider <name>', 'Provider name (openai, mock, etc.)')
    .option('-m, --model <model>', 'Model name')
    .option('-k, --api-key <key>', 'API key (if required)')
    .option('-u, --base-url <url>', 'Base URL for custom endpoints')
    .action(async (options) => {
        try {
            const config = ConfigManager.getInstance();
            const openaiConfig = config.getOpenAIConfig();

            await aiProviderManager.setProvider({
                provider: options.provider || 'openai',
                model: options.model || openaiConfig.model,
                apiKey: options.apiKey || openaiConfig.apiKey,
                baseUrl: options.baseUrl,
                maxTokens: openaiConfig.maxTokens,
                temperature: openaiConfig.temperature,
            });

            console.log(`\n✓ AI provider set to: ${options.provider || 'openai'}`);
            console.log(`  Model: ${options.model || openaiConfig.model}\n`);
        } catch (error) {
            logger.error('Failed to set AI provider', error);
            console.error(`\n✗ Failed to set AI provider: ${error instanceof Error ? error.message : String(error)}\n`);
            process.exit(1);
        }
    });

program
    .command('current-ai-provider')
    .description('Show current AI provider')
    .action(() => {
        const config = aiProviderManager.getCurrentConfig();
        const providerName = aiProviderManager.getCurrentProviderName();

        if (!config || !providerName) {
            console.log('\nNo AI provider configured.\n');
            console.log('Use "set-ai-provider" to configure one.\n');
            return;
        }

        const provider = aiProviderManager.getProvider(providerName);
        console.log('\nCurrent AI Provider:\n');
        console.log(`  Provider: ${provider?.displayName || providerName}`);
        console.log(`  Model: ${config.model}`);
        console.log(`  Max Tokens: ${config.maxTokens}`);
        console.log(`  Temperature: ${config.temperature}\n`);
    });

program.parse();
