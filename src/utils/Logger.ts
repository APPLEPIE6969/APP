import fs from 'fs/promises';
import path from 'path';

export enum LogLevel {
    DEBUG = 0,
    INFO = 1,
    WARN = 2,
    ERROR = 3,
}

export class Logger {
    private static instance: Logger;
    private logLevel: LogLevel;
    private logFile?: string;

    private constructor() {
        this.logLevel = LogLevel.INFO;
    }

    public static getInstance(): Logger {
        if (!Logger.instance) {
            Logger.instance = new Logger();
        }
        return Logger.instance;
    }

    public setLevel(level: LogLevel | string): void {
        if (typeof level === 'string') {
            this.logLevel = LogLevel[level.toUpperCase() as keyof typeof LogLevel] || LogLevel.INFO;
        } else {
            this.logLevel = level;
        }
    }

    public async setLogFile(filePath: string): Promise<void> {
        this.logFile = filePath;
        const dir = path.dirname(filePath);
        await fs.mkdir(dir, { recursive: true });
    }

    private formatMessage(level: string, message: string, meta?: any): string {
        const timestamp = new Date().toISOString();
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] ${message}${metaStr}`;
    }

    private async writeToFile(formattedMessage: string): Promise<void> {
        if (this.logFile) {
            try {
                await fs.appendFile(this.logFile, formattedMessage + '\n');
            } catch (error) {
                console.error('Failed to write to log file:', error);
            }
        }
    }

    public debug(message: string, meta?: any): void {
        if (this.logLevel <= LogLevel.DEBUG) {
            const formatted = this.formatMessage('DEBUG', message, meta);
            console.debug(formatted);
            this.writeToFile(formatted);
        }
    }

    public info(message: string, meta?: any): void {
        if (this.logLevel <= LogLevel.INFO) {
            const formatted = this.formatMessage('INFO', message, meta);
            console.info(formatted);
            this.writeToFile(formatted);
        }
    }

    public warn(message: string, meta?: any): void {
        if (this.logLevel <= LogLevel.WARN) {
            const formatted = this.formatMessage('WARN', message, meta);
            console.warn(formatted);
            this.writeToFile(formatted);
        }
    }

    public error(message: string, error?: Error | any): void {
        if (this.logLevel <= LogLevel.ERROR) {
            const meta = error instanceof Error ? {
                message: error.message,
                stack: error.stack,
            } : error;
            const formatted = this.formatMessage('ERROR', message, meta);
            console.error(formatted);
            this.writeToFile(formatted);
        }
    }

    public async clearLogFile(): Promise<void> {
        if (this.logFile) {
            try {
                await fs.writeFile(this.logFile, '');
            } catch (error) {
                this.error('Failed to clear log file', error);
            }
        }
    }
}

export const logger = Logger.getInstance();
