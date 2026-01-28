import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/Logger.js';
import type { Plugin, Tool } from '../types/index.js';

export class PluginManager {
    private static instance: PluginManager;
    private plugins: Map<string, Plugin> = new Map();
    private tools: Map<string, Tool> = new Map();
    private pluginsDirectory: string;

    private constructor() {
        this.pluginsDirectory = './src/plugins';
    }

    public static getInstance(): PluginManager {
        if (!PluginManager.instance) {
            PluginManager.instance = new PluginManager();
        }
        return PluginManager.instance;
    }

    public async setPluginsDirectory(directory: string): Promise<void> {
        this.pluginsDirectory = directory;
        await fs.mkdir(directory, { recursive: true });
    }

    public async loadPlugins(): Promise<void> {
        try {
            const files = await fs.readdir(this.pluginsDirectory);
            const pluginFiles = files.filter(file =>
                file.endsWith('.js') || file.endsWith('.ts')
            );

            logger.info(`Found ${pluginFiles.length} plugin files`);

            for (const file of pluginFiles) {
                await this.loadPlugin(path.join(this.pluginsDirectory, file));
            }

            logger.info(`Loaded ${this.plugins.size} plugins with ${this.tools.size} tools`);
        } catch (error) {
            logger.error('Failed to load plugins', error);
        }
    }

    private async loadPlugin(filePath: string): Promise<void> {
        try {
            const module = await import(filePath);
            const plugin: Plugin = module.default || module.plugin;

            if (!plugin || !plugin.name || !plugin.tools) {
                logger.warn(`Invalid plugin format: ${filePath}`);
                return;
            }

            if (plugin.enabled === false) {
                logger.info(`Plugin disabled: ${plugin.name}`);
                return;
            }

            this.plugins.set(plugin.name, plugin);

            for (const tool of plugin.tools) {
                this.tools.set(tool.name, tool);
            }

            if (plugin.initialize) {
                await plugin.initialize();
            }

            logger.info(`Loaded plugin: ${plugin.name} v${plugin.version}`);
        } catch (error) {
            logger.error(`Failed to load plugin: ${filePath}`, error);
        }
    }

    public registerPlugin(plugin: Plugin): void {
        this.plugins.set(plugin.name, plugin);

        for (const tool of plugin.tools) {
            this.tools.set(tool.name, tool);
        }

        logger.info(`Registered plugin: ${plugin.name}`);
    }

    public unregisterPlugin(pluginName: string): void {
        const plugin = this.plugins.get(pluginName);
        if (plugin) {
            if (plugin.cleanup) {
                plugin.cleanup().catch(error => {
                    logger.error(`Error cleaning up plugin: ${pluginName}`, error);
                });
            }

            for (const tool of plugin.tools) {
                this.tools.delete(tool.name);
            }

            this.plugins.delete(pluginName);
            logger.info(`Unregistered plugin: ${pluginName}`);
        }
    }

    public getPlugin(name: string): Plugin | undefined {
        return this.plugins.get(name);
    }

    public getAllPlugins(): Plugin[] {
        return Array.from(this.plugins.values());
    }

    public getTool(name: string): Tool | undefined {
        return this.tools.get(name);
    }

    public getAllTools(): Tool[] {
        return Array.from(this.tools.values());
    }

    public getToolsByPlugin(pluginName: string): Tool[] {
        const plugin = this.plugins.get(pluginName);
        return plugin ? plugin.tools : [];
    }

    public async executeTool(toolName: string, params: any): Promise<any> {
        const tool = this.tools.get(toolName);
        if (!tool) {
            throw new Error(`Tool not found: ${toolName}`);
        }

        logger.debug(`Executing tool: ${toolName}`, params);
        const startTime = Date.now();

        try {
            const result = await tool.execute(params);
            const executionTime = Date.now() - startTime;
            logger.debug(`Tool executed: ${toolName} in ${executionTime}ms`);
            return { ...result, executionTime };
        } catch (error) {
            logger.error(`Tool execution failed: ${toolName}`, error);
            throw error;
        }
    }

    public async reloadPlugin(pluginName: string): Promise<void> {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) {
            throw new Error(`Plugin not found: ${pluginName}`);
        }

        this.unregisterPlugin(pluginName);
        await this.loadPlugins();
    }

    public async reloadAllPlugins(): Promise<void> {
        const pluginNames = Array.from(this.plugins.keys());
        for (const name of pluginNames) {
            this.unregisterPlugin(name);
        }
        await this.loadPlugins();
    }

    public getPluginStats(): {
        totalPlugins: number;
        enabledPlugins: number;
        totalTools: number;
        plugins: Array<{ name: string; version: string; toolCount: number }>;
    } {
        return {
            totalPlugins: this.plugins.size,
            enabledPlugins: Array.from(this.plugins.values()).filter(p => p.enabled).length,
            totalTools: this.tools.size,
            plugins: Array.from(this.plugins.values()).map(p => ({
                name: p.name,
                version: p.version,
                toolCount: p.tools.length,
            })),
        };
    }
}

export const pluginManager = PluginManager.getInstance();
