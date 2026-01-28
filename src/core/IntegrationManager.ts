import { logger } from '../utils/Logger.js';
import type { AppConnection, Integration, ActionResult } from '../types/index.js';

export class IntegrationManager {
    private static instance: IntegrationManager;
    private connections: Map<string, AppConnection> = new Map();
    private integrations: Map<string, Integration> = new Map();

    private constructor() { }

    public static getInstance(): IntegrationManager {
        if (!IntegrationManager.instance) {
            IntegrationManager.instance = new IntegrationManager();
        }
        return IntegrationManager.instance;
    }

    public async connectApp(connection: AppConnection): Promise<ActionResult> {
        try {
            logger.info(`Connecting to app: ${connection.appName}`);

            const integration = this.integrations.get(connection.type);
            if (!integration) {
                return {
                    success: false,
                    message: `Integration type not found: ${connection.type}`,
                    error: 'Integration type not found',
                };
            }

            connection.status = 'connected';
            connection.lastUsed = new Date();
            this.connections.set(connection.appId, connection);

            logger.info(`Successfully connected to: ${connection.appName}`);
            return {
                success: true,
                message: `Successfully connected to ${connection.appName}`,
                data: connection,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to connect to app: ${connection.appName}`, error);
            return {
                success: false,
                message: `Failed to connect to ${connection.appName}`,
                error: errorMessage,
            };
        }
    }

    public async disconnectApp(appId: string): Promise<ActionResult> {
        try {
            const connection = this.connections.get(appId);
            if (!connection) {
                return {
                    success: false,
                    message: `Connection not found: ${appId}`,
                    error: 'Connection not found',
                };
            }

            connection.status = 'disconnected';
            this.connections.delete(appId);

            logger.info(`Disconnected from: ${connection.appName}`);
            return {
                success: true,
                message: `Successfully disconnected from ${connection.appName}`,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to disconnect from app: ${appId}`, error);
            return {
                success: false,
                message: `Failed to disconnect from app`,
                error: errorMessage,
            };
        }
    }

    public async executeAction(
        appId: string,
        action: string,
        params: Record<string, any>
    ): Promise<ActionResult> {
        try {
            const connection = this.connections.get(appId);
            if (!connection) {
                return {
                    success: false,
                    message: `Connection not found: ${appId}`,
                    error: 'Connection not found',
                };
            }

            if (connection.status !== 'connected') {
                return {
                    success: false,
                    message: `App not connected: ${connection.appName}`,
                    error: 'App not connected',
                };
            }

            if (!connection.capabilities.includes(action)) {
                return {
                    success: false,
                    message: `Action not supported: ${action}`,
                    error: 'Action not supported',
                };
            }

            connection.lastUsed = new Date();

            logger.info(`Executing action ${action} on ${connection.appName}`, params);

            const result = await this.performAction(connection, action, params);

            return {
                success: true,
                message: `Action ${action} executed successfully`,
                data: result,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logger.error(`Failed to execute action on app: ${appId}`, error);
            return {
                success: false,
                message: `Failed to execute action`,
                error: errorMessage,
            };
        }
    }

    private async performAction(
        connection: AppConnection,
        action: string,
        params: Record<string, any>
    ): Promise<any> {
        switch (connection.type) {
            case 'api':
                return this.executeApiAction(connection, action, params);
            case 'browser':
                return this.executeBrowserAction(connection, action, params);
            case 'cli':
                return this.executeCliAction(connection, action, params);
            case 'custom':
                return this.executeCustomAction(connection, action, params);
            default:
                throw new Error(`Unknown connection type: ${connection.type}`);
        }
    }

    private async executeApiAction(
        connection: AppConnection,
        _action: string,
        params: Record<string, any>
    ): Promise<any> {
        const axios = (await import('axios')).default;
        const { endpoint, method = 'GET', headers = {} } = connection.config;

        const response = await axios({
            url: endpoint,
            method,
            headers,
            data: params,
        });

        return response.data;
    }

    private async executeBrowserAction(
        connection: AppConnection,
        action: string,
        params: Record<string, any>
    ): Promise<any> {
        const puppeteer = await import('puppeteer');
        const browser = await puppeteer.launch({
            headless: connection.config.headless ?? true,
        });

        try {
            const page = await browser.newPage();

            switch (action) {
                case 'navigate':
                    await page.goto(params.url);
                    return { url: page.url(), title: await page.title() };
                case 'screenshot':
                    await page.goto(params.url);
                    const screenshot = await page.screenshot({ encoding: 'base64' });
                    return { screenshot };
                case 'click':
                    await page.goto(params.url);
                    await page.click(params.selector);
                    return { clicked: params.selector };
                case 'type':
                    await page.goto(params.url);
                    await page.type(params.selector, params.text);
                    return { typed: params.text };
                case 'extract':
                    await page.goto(params.url);
                    const data = await page.evaluate((selector) => {
                        // @ts-ignore - document is available in browser context
                        const elements = document.querySelectorAll(selector);
                        return Array.from(elements).map((el: any) => el.textContent);
                    }, params.selector);
                    return { data };
                default:
                    throw new Error(`Unknown browser action: ${action}`);
            }
        } finally {
            await browser.close();
        }
    }

    private async executeCliAction(
        connection: AppConnection,
        action: string,
        params: Record<string, any>
    ): Promise<any> {
        const { exec } = await import('child_process');
        const { promisify } = await import('util');
        const execAsync = promisify(exec);

        const command = this.buildCommand(action, params, connection.config);
        const { stdout, stderr } = await execAsync(command);

        if (stderr) {
            logger.warn(`Command stderr: ${stderr}`);
        }

        return { stdout, stderr };
    }

    private buildCommand(
        action: string,
        params: Record<string, any>,
        config: Record<string, any>
    ): string {
        const commandTemplate = config.commands?.[action];
        if (!commandTemplate) {
            throw new Error(`Command template not found for action: ${action}`);
        }

        let command = commandTemplate;
        for (const [key, value] of Object.entries(params)) {
            command = command.replace(`{${key}}`, String(value));
        }

        return command;
    }

    private async executeCustomAction(
        connection: AppConnection,
        action: string,
        params: Record<string, any>
    ): Promise<any> {
        const handler = connection.config.handlers?.[action];
        if (!handler) {
            throw new Error(`Handler not found for action: ${action}`);
        }

        return await handler(params);
    }

    public getConnection(appId: string): AppConnection | undefined {
        return this.connections.get(appId);
    }

    public getAllConnections(): AppConnection[] {
        return Array.from(this.connections.values());
    }

    public getConnectionsByType(type: string): AppConnection[] {
        return Array.from(this.connections.values()).filter(c => c.type === type);
    }

    public registerIntegration(integration: Integration): void {
        this.integrations.set(integration.type, integration);
        logger.info(`Registered integration: ${integration.type}`);
    }

    public getIntegration(type: string): Integration | undefined {
        return this.integrations.get(type);
    }

    public getAllIntegrations(): Integration[] {
        return Array.from(this.integrations.values());
    }

    public async testConnection(appId: string): Promise<ActionResult> {
        const connection = this.connections.get(appId);
        if (!connection) {
            return {
                success: false,
                message: `Connection not found: ${appId}`,
                error: 'Connection not found',
            };
        }

        try {
            const result = await this.executeAction(appId, 'ping', {});
            return {
                success: true,
                message: 'Connection test successful',
                data: result,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                message: 'Connection test failed',
                error: errorMessage,
            };
        }
    }

    public getStats(): {
        totalConnections: number;
        connectedApps: number;
        disconnectedApps: number;
        errorApps: number;
        byType: Record<string, number>;
    } {
        const connections = Array.from(this.connections.values());
        const byType: Record<string, number> = {};

        for (const conn of connections) {
            byType[conn.type] = (byType[conn.type] || 0) + 1;
        }

        return {
            totalConnections: connections.length,
            connectedApps: connections.filter(c => c.status === 'connected').length,
            disconnectedApps: connections.filter(c => c.status === 'disconnected').length,
            errorApps: connections.filter(c => c.status === 'error').length,
            byType,
        };
    }
}

export const integrationManager = IntegrationManager.getInstance();
