import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs/promises';
import type { AssistantConfig } from '../types/index.js';

dotenv.config();

export class ConfigManager {
    private static instance: ConfigManager;
    private config: AssistantConfig;

    private constructor() {
        this.config = this.loadConfig();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    private loadConfig(): AssistantConfig {
        return {
            openai: {
                apiKey: process.env.OPENAI_API_KEY || '',
                model: process.env.OPENAI_MODEL || 'gpt-4-turbo-preview',
                maxTokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096', 10),
                temperature: parseFloat(process.env.OPENAI_TEMPERATURE || '0.7'),
            },
            server: {
                port: parseInt(process.env.PORT || '3000', 10),
                host: process.env.HOST || 'localhost',
            },
            plugins: {
                directory: process.env.PLUGINS_DIR || './src/plugins',
                enabled: (process.env.ENABLED_PLUGINS || '').split(',').filter(Boolean),
            },
            logging: {
                level: process.env.LOG_LEVEL || 'info',
                file: process.env.LOG_FILE || './logs/assistant.log',
            },
            security: {
                apiKey: process.env.API_SECRET_KEY || '',
                enableAuth: process.env.ENABLE_AUTH === 'true',
            },
        };
    }

    public getConfig(): AssistantConfig {
        return this.config;
    }

    public getOpenAIConfig() {
        return this.config.openai;
    }

    public getServerConfig() {
        return this.config.server;
    }

    public getPluginsConfig() {
        return this.config.plugins;
    }

    public getLoggingConfig() {
        return this.config.logging;
    }

    public getSecurityConfig() {
        return this.config.security;
    }

    public async updateConfig(updates: Partial<AssistantConfig>): Promise<void> {
        this.config = { ...this.config, ...updates };
    }

    public async saveConfig(filePath: string): Promise<void> {
        const configPath = path.resolve(filePath);
        await fs.mkdir(path.dirname(configPath), { recursive: true });
        await fs.writeFile(configPath, JSON.stringify(this.config, null, 2));
    }

    public async loadConfigFromFile(filePath: string): Promise<AssistantConfig> {
        const configPath = path.resolve(filePath);
        const content = await fs.readFile(configPath, 'utf-8');
        const loadedConfig = JSON.parse(content) as AssistantConfig;
        this.config = { ...this.config, ...loadedConfig };
        return this.config;
    }

    public validateConfig(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (!this.config.openai.apiKey) {
            errors.push('OpenAI API key is required');
        }

        if (this.config.server.port < 1 || this.config.server.port > 65535) {
            errors.push('Server port must be between 1 and 65535');
        }

        if (this.config.openai.temperature < 0 || this.config.openai.temperature > 2) {
            errors.push('Temperature must be between 0 and 2');
        }

        return {
            valid: errors.length === 0,
            errors,
        };
    }
}
