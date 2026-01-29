import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { logger } from '../utils/Logger.js';

export interface StoredApiKey {
    id: string;
    name: string;
    provider: string;
    encryptedKey: string;
    createdAt: Date;
    lastUsed?: Date;
}

export class ApiKeyManager {
    private static instance: ApiKeyManager;
    private keysFile: string;
    private encryptionKey: string;
    private keys: Map<string, StoredApiKey> = new Map();

    private constructor() {
        this.keysFile = path.join(process.cwd(), 'data', 'api-keys.json');
        // Derive a proper 32-byte key from the environment variable using SHA-256
        const rawKey = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex');
        this.encryptionKey = crypto.createHash('sha256').update(rawKey).digest('hex').slice(0, 32);
    }

    public static getInstance(): ApiKeyManager {
        if (!ApiKeyManager.instance) {
            ApiKeyManager.instance = new ApiKeyManager();
        }
        return ApiKeyManager.instance;
    }

    private encrypt(text: string): string {
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-cbc', this.encryptionKey, iv);
        let encrypted = cipher.update(text, 'utf8', 'hex');
        encrypted = cipher.final('hex');
        return iv.toString('hex') + ':' + encrypted;
    }

    private decrypt(encryptedText: string): string {
        const parts = encryptedText.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encrypted = Buffer.from(parts[1], 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', this.encryptionKey, iv);
        let decrypted = decipher.update(encrypted);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString('utf8');
    }

    private async loadKeys(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.keysFile), { recursive: true });
            const content = await fs.readFile(this.keysFile, 'utf-8');
            const keys = JSON.parse(content) as StoredApiKey[];
            this.keys.clear();
            for (const key of keys) {
                this.keys.set(key.id, key);
            }
            logger.info(`Loaded ${keys.length} API keys`);
        } catch (error) {
            if ((error as any).code !== 'ENOENT') {
                logger.error('Failed to load API keys', error);
            }
        }
    }

    private async saveKeys(): Promise<void> {
        try {
            await fs.mkdir(path.dirname(this.keysFile), { recursive: true });
            const keys = Array.from(this.keys.values());
            await fs.writeFile(this.keysFile, JSON.stringify(keys, null, 2), 'utf-8');
            logger.info(`Saved ${keys.length} API keys`);
        } catch (error) {
            logger.error('Failed to save API keys', error);
            throw error;
        }
    }

    public async initialize(): Promise<void> {
        await this.loadKeys();
    }

    public async addKey(name: string, provider: string, apiKey: string): Promise<StoredApiKey> {
        const id = crypto.randomBytes(16).toString('hex');
        const encryptedKey = this.encrypt(apiKey);

        const storedKey: StoredApiKey = {
            id,
            name,
            provider,
            encryptedKey,
            createdAt: new Date(),
        };

        this.keys.set(id, storedKey);
        await this.saveKeys();

        logger.info(`Added API key for ${name} (${provider})`);
        return storedKey;
    }

    public async getKey(id: string): Promise<string | null> {
        const storedKey = this.keys.get(id);
        if (!storedKey) {
            return null;
        }

        const apiKey = this.decrypt(storedKey.encryptedKey);
        storedKey.lastUsed = new Date();
        await this.saveKeys();

        return apiKey;
    }

    public async updateKey(id: string, apiKey: string): Promise<void> {
        const storedKey = this.keys.get(id);
        if (!storedKey) {
            throw new Error(`API key not found: ${id}`);
        }

        storedKey.encryptedKey = this.encrypt(apiKey);
        storedKey.lastUsed = new Date();
        await this.saveKeys();

        logger.info(`Updated API key for ${storedKey.name}`);
    }

    public async deleteKey(id: string): Promise<void> {
        const storedKey = this.keys.get(id);
        if (!storedKey) {
            throw new Error(`API key not found: ${id}`);
        }

        this.keys.delete(id);
        await this.saveKeys();

        logger.info(`Deleted API key for ${storedKey.name}`);
    }

    public getAllKeys(): StoredApiKey[] {
        return Array.from(this.keys.values());
    }

    public getKeysByProvider(provider: string): StoredApiKey[] {
        return Array.from(this.keys.values()).filter(k => k.provider === provider);
    }

    public async getDecryptedKeyByProvider(provider: string): Promise<string | null> {
        const keys = this.getKeysByProvider(provider);
        if (!keys || keys.length === 0) {
            return null;
        }
        return this.decrypt(keys[0].encryptedKey);
    }

    public async validateKey(id: string): Promise<boolean> {
        const apiKey = await this.getKey(id);
        if (!apiKey) {
            return false;
        }

        // Basic validation - check if key is not empty
        if (!apiKey || apiKey.length < 10) {
            return false;
        }

        return true;
    }
}

export const apiKeyManager = ApiKeyManager.getInstance();
