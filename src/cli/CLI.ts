import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { AIAssistant } from '../core/AIAssistant.js';
import { pluginManager } from '../core/PluginManager.js';
import { integrationManager } from '../core/IntegrationManager.js';
import { ConfigManager } from '../config/ConfigManager.js';
import { logger } from '../utils/Logger.js';

export class CLI {
    private assistant: AIAssistant;
    private currentConversationId: string | null = null;
    private config: ConfigManager;

    constructor() {
        this.config = ConfigManager.getInstance();
        const openaiConfig = this.config.getOpenAIConfig();
        this.assistant = new AIAssistant(openaiConfig);
    }

    public async start(): Promise<void> {
        console.log(chalk.cyan.bold('\n🤖 Smart AI Assistant'));
        console.log(chalk.gray('A powerful AI assistant that can connect to multiple applications\n'));

        await this.initialize();

        while (true) {
            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'What would you like to do?',
                    choices: [
                        { name: '💬 Chat with AI', value: 'chat' },
                        { name: '🔌 Manage Plugins', value: 'plugins' },
                        { name: '🔗 Manage Integrations', value: 'integrations' },
                        { name: '⚙️  Settings', value: 'settings' },
                        { name: '📊 View Stats', value: 'stats' },
                        { name: '❌ Exit', value: 'exit' },
                    ],
                },
            ]);

            switch (action) {
                case 'chat':
                    await this.chat();
                    break;
                case 'plugins':
                    await this.managePlugins();
                    break;
                case 'integrations':
                    await this.manageIntegrations();
                    break;
                case 'settings':
                    await this.manageSettings();
                    break;
                case 'stats':
                    await this.viewStats();
                    break;
                case 'exit':
                    console.log(chalk.yellow('\nGoodbye! 👋\n'));
                    process.exit(0);
            }
        }
    }

    private async initialize(): Promise<void> {
        const spinner = ora('Initializing AI Assistant...').start();

        try {
            const validation = this.config.validateConfig();
            if (!validation.valid) {
                spinner.fail('Configuration validation failed');
                console.error(chalk.red('Errors:'));
                validation.errors.forEach(error => console.error(chalk.red(`  - ${error}`)));
                process.exit(1);
            }

            await pluginManager.loadPlugins();
            this.currentConversationId = await this.assistant.createConversation();

            spinner.succeed('AI Assistant initialized successfully');
        } catch (error) {
            spinner.fail('Initialization failed');
            logger.error('Initialization error', error);
            process.exit(1);
        }
    }

    private async chat(): Promise<void> {
        console.log(chalk.cyan('\n--- Chat Mode ---'));
        console.log(chalk.gray('Type "exit" to return to main menu\n'));

        while (true) {
            const { message } = await inquirer.prompt([
                {
                    type: 'input',
                    name: 'message',
                    message: chalk.blue('You:'),
                },
            ]);

            if (message.toLowerCase() === 'exit') {
                break;
            }

            if (!message.trim()) {
                continue;
            }

            const spinner = ora('Thinking...').start();

            try {
                const response = await this.assistant.sendMessage(this.currentConversationId!, message);
                spinner.stop();

                console.log(chalk.green('\nAI:'), response.response);
                console.log();
            } catch (error) {
                spinner.fail('Error');
                console.error(chalk.red('Error:'), error instanceof Error ? error.message : String(error));
            }
        }
    }

    private async managePlugins(): Promise<void> {
        while (true) {
            const plugins = pluginManager.getAllPlugins();
            const stats = pluginManager.getPluginStats();

            const choices = [
                { name: '📋 List all plugins', value: 'list' },
                { name: '🔄 Reload plugins', value: 'reload' },
                { name: '⬅️  Back', value: 'back' },
            ];

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Plugin Management',
                    choices,
                },
            ]);

            if (action === 'back') {
                break;
            }

            switch (action) {
                case 'list':
                    console.log(chalk.cyan('\n--- Plugins ---'));
                    console.log(chalk.gray(`Total: ${stats.totalPlugins} | Tools: ${stats.totalTools}\n`));
                    for (const plugin of plugins) {
                        const status = plugin.enabled ? chalk.green('✓') : chalk.red('✗');
                        console.log(`${status} ${chalk.bold(plugin.name)} v${plugin.version}`);
                        console.log(chalk.gray(`  ${plugin.description}`));
                        console.log(chalk.gray(`  Tools: ${plugin.tools.length}\n`));
                    }
                    break;
                case 'reload':
                    const spinner = ora('Reloading plugins...').start();
                    await pluginManager.reloadAllPlugins();
                    spinner.succeed('Plugins reloaded');
                    break;
            }
        }
    }

    private async manageIntegrations(): Promise<void> {
        while (true) {
            const connections = integrationManager.getAllConnections();
            const stats = integrationManager.getStats();

            const choices = [
                { name: '📋 List connections', value: 'list' },
                { name: '➕ Add connection', value: 'add' },
                { name: '➖ Remove connection', value: 'remove' },
                { name: '🧪 Test connection', value: 'test' },
                { name: '⬅️  Back', value: 'back' },
            ];

            const { action } = await inquirer.prompt([
                {
                    type: 'list',
                    name: 'action',
                    message: 'Integration Management',
                    choices,
                },
            ]);

            if (action === 'back') {
                break;
            }

            switch (action) {
                case 'list':
                    console.log(chalk.cyan('\n--- Connections ---'));
                    console.log(chalk.gray(`Total: ${stats.totalConnections} | Connected: ${stats.connectedApps}\n`));
                    for (const conn of connections) {
                        const status = conn.status === 'connected' ? chalk.green('●') : chalk.red('●');
                        console.log(`${status} ${chalk.bold(conn.appName)} (${conn.type})`);
                        console.log(chalk.gray(`  Capabilities: ${conn.capabilities.join(', ')}\n`));
                    }
                    break;
                case 'add':
                    await this.addConnection();
                    break;
                case 'remove':
                    if (connections.length === 0) {
                        console.log(chalk.yellow('No connections to remove\n'));
                        break;
                    }
                    const { removeId } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'removeId',
                            message: 'Select connection to remove:',
                            choices: connections.map(c => ({ name: c.appName, value: c.appId })),
                        },
                    ]);
                    await integrationManager.disconnectApp(removeId);
                    console.log(chalk.green('Connection removed\n'));
                    break;
                case 'test':
                    if (connections.length === 0) {
                        console.log(chalk.yellow('No connections to test\n'));
                        break;
                    }
                    const { testId } = await inquirer.prompt([
                        {
                            type: 'list',
                            name: 'testId',
                            message: 'Select connection to test:',
                            choices: connections.map(c => ({ name: c.appName, value: c.appId })),
                        },
                    ]);
                    const spinner = ora('Testing connection...').start();
                    const result = await integrationManager.testConnection(testId);
                    spinner.stop();
                    if (result.success) {
                        console.log(chalk.green('Connection test successful\n'));
                    } else {
                        console.log(chalk.red('Connection test failed:'), result.error, '\n');
                    }
                    break;
            }
        }
    }

    private async addConnection(): Promise<void> {
        const answers = await inquirer.prompt([
            {
                type: 'input',
                name: 'appName',
                message: 'App name:',
                validate: (input: string) => input.trim().length > 0 || 'App name is required',
            },
            {
                type: 'list',
                name: 'type',
                message: 'Connection type:',
                choices: [
                    { name: 'API', value: 'api' },
                    { name: 'Browser', value: 'browser' },
                    { name: 'CLI', value: 'cli' },
                    { name: 'Custom', value: 'custom' },
                ],
            },
        ]);

        const connection = {
            appId: `app_${Date.now()}`,
            appName: answers.appName,
            type: answers.type,
            status: 'connected' as const,
            capabilities: ['ping'],
            config: {},
        };

        const result = await integrationManager.connectApp(connection);
        if (result.success) {
            console.log(chalk.green('Connection added successfully\n'));
        } else {
            console.log(chalk.red('Failed to add connection:'), result.error, '\n');
        }
    }

    private async manageSettings(): Promise<void> {
        const config = this.config.getConfig();

        console.log(chalk.cyan('\n--- Settings ---\n'));
        console.log(chalk.bold('OpenAI Configuration:'));
        console.log(`  Model: ${config.openai.model}`);
        console.log(`  Max Tokens: ${config.openai.maxTokens}`);
        console.log(`  Temperature: ${config.openai.temperature}`);
        console.log(chalk.bold('\nServer Configuration:'));
        console.log(`  Port: ${config.server.port}`);
        console.log(`  Host: ${config.server.host}`);
        console.log(chalk.bold('\nLogging:'));
        console.log(`  Level: ${config.logging.level}`);
        console.log(`  File: ${config.logging.file}\n`);

        await inquirer.prompt([
            {
                type: 'list',
                name: 'action',
                message: 'Settings',
                choices: [
                    { name: '⬅️  Back', value: 'back' },
                ],
            },
        ]);
    }

    private async viewStats(): Promise<void> {
        const aiStats = this.assistant.getStats();
        const pluginStats = pluginManager.getPluginStats();
        const integrationStats = integrationManager.getStats();

        console.log(chalk.cyan('\n--- Statistics ---\n'));
        console.log(chalk.bold('AI Assistant:'));
        console.log(`  Active Conversations: ${aiStats.activeConversations}`);
        console.log(`  Total Messages: ${aiStats.totalMessages}`);
        console.log(`  Available Tools: ${aiStats.availableTools}\n`);

        console.log(chalk.bold('Plugins:'));
        console.log(`  Total Plugins: ${pluginStats.totalPlugins}`);
        console.log(`  Enabled Plugins: ${pluginStats.enabledPlugins}`);
        console.log(`  Total Tools: ${pluginStats.totalTools}\n`);

        console.log(chalk.bold('Integrations:'));
        console.log(`  Total Connections: ${integrationStats.totalConnections}`);
        console.log(`  Connected Apps: ${integrationStats.connectedApps}`);
        console.log(`  Disconnected Apps: ${integrationStats.disconnectedApps}\n`);
    }
}
