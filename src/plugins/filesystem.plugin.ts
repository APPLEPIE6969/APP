import fs from 'fs/promises';
import path from 'path';
import type { Plugin, ToolResult } from '../types/index.js';

const filesystemPlugin: Plugin = {
    name: 'filesystem',
    version: '1.0.0',
    description: 'File system operations plugin for reading, writing, and managing files',
    author: 'AI Assistant',
    enabled: true,
    tools: [
        {
            name: 'read_file',
            description: 'Read the contents of a file',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'Path to the file to read',
                    },
                },
                required: ['filePath'],
            },
            execute: async (params: { filePath: string }): Promise<ToolResult> => {
                try {
                    const content = await fs.readFile(params.filePath, 'utf-8');
                    return {
                        success: true,
                        data: { content, path: params.filePath },
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'write_file',
            description: 'Write content to a file',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'Path to the file to write',
                    },
                    content: {
                        type: 'string',
                        description: 'Content to write to the file',
                    },
                },
                required: ['filePath', 'content'],
            },
            execute: async (params: { filePath: string; content: string }): Promise<ToolResult> => {
                try {
                    const dir = path.dirname(params.filePath);
                    await fs.mkdir(dir, { recursive: true });
                    await fs.writeFile(params.filePath, params.content, 'utf-8');
                    return {
                        success: true,
                        data: { path: params.filePath, bytesWritten: params.content.length },
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'list_directory',
            description: 'List files and directories in a path',
            parameters: {
                type: 'object',
                properties: {
                    dirPath: {
                        type: 'string',
                        description: 'Path to the directory to list',
                    },
                    recursive: {
                        type: 'boolean',
                        description: 'Whether to list recursively',
                        default: false,
                    },
                },
                required: ['dirPath'],
            },
            execute: async (params: { dirPath: string; recursive?: boolean }): Promise<ToolResult> => {
                try {
                    const items: string[] = [];
                    const listDir = async (dir: string) => {
                        const entries = await fs.readdir(dir, { withFileTypes: true });
                        for (const entry of entries) {
                            const fullPath = path.join(dir, entry.name);
                            items.push(fullPath);
                            if (entry.isDirectory() && params.recursive) {
                                await listDir(fullPath);
                            }
                        }
                    };
                    await listDir(params.dirPath);
                    return {
                        success: true,
                        data: { items, count: items.length },
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'delete_file',
            description: 'Delete a file or directory',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'Path to the file or directory to delete',
                    },
                },
                required: ['filePath'],
            },
            execute: async (params: { filePath: string }): Promise<ToolResult> => {
                try {
                    await fs.rm(params.filePath, { recursive: true, force: true });
                    return {
                        success: true,
                        data: { path: params.filePath },
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'get_file_info',
            description: 'Get information about a file or directory',
            parameters: {
                type: 'object',
                properties: {
                    filePath: {
                        type: 'string',
                        description: 'Path to the file or directory',
                    },
                },
                required: ['filePath'],
            },
            execute: async (params: { filePath: string }): Promise<ToolResult> => {
                try {
                    const stats = await fs.stat(params.filePath);
                    return {
                        success: true,
                        data: {
                            path: params.filePath,
                            size: stats.size,
                            isFile: stats.isFile(),
                            isDirectory: stats.isDirectory(),
                            created: stats.birthtime,
                            modified: stats.mtime,
                            accessed: stats.atime,
                        },
                    };
                } catch (error) {
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
    ],
};

export default filesystemPlugin;
