import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';
import type { Plugin, ToolResult } from '../types/index.js';

const execAsync = promisify(exec);

const systemPlugin: Plugin = {
    name: 'system',
    version: '1.0.0',
    description: 'System operations plugin for executing commands and getting system information',
    author: 'AI Assistant',
    enabled: true,
    tools: [
        {
            name: 'execute_command',
            description: 'Execute a shell command',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Command to execute',
                    },
                    cwd: {
                        type: 'string',
                        description: 'Working directory for the command',
                    },
                },
                required: ['command'],
            },
            execute: async (params: { command: string; cwd?: string }): Promise<ToolResult> => {
                try {
                    const options: any = {};
                    if (params.cwd) {
                        options.cwd = params.cwd;
                    }

                    const { stdout, stderr } = await execAsync(params.command, options);

                    return {
                        success: true,
                        data: {
                            stdout: String(stdout).trim(),
                            stderr: String(stderr).trim(),
                            command: params.command,
                        },
                    };
                } catch (error) {
                    const err = error as any;
                    return {
                        success: false,
                        error: err.message,
                        data: {
                            stdout: err.stdout?.trim() || '',
                            stderr: err.stderr?.trim() || '',
                            command: params.command,
                        },
                    };
                }
            },
        },
        {
            name: 'get_system_info',
            description: 'Get system information',
            parameters: {
                type: 'object',
                properties: {},
            },
            execute: async (): Promise<ToolResult> => {
                try {
                    const info = {
                        platform: os.platform(),
                        arch: os.arch(),
                        hostname: os.hostname(),
                        release: os.release(),
                        totalMemory: os.totalmem(),
                        freeMemory: os.freemem(),
                        cpus: os.cpus(),
                        uptime: os.uptime(),
                        loadAverage: os.loadavg(),
                        networkInterfaces: os.networkInterfaces(),
                        homedir: os.homedir(),
                        tmpdir: os.tmpdir(),
                    };

                    return {
                        success: true,
                        data: info,
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
            name: 'get_process_info',
            description: 'Get information about running processes',
            parameters: {
                type: 'object',
                properties: {
                    pid: {
                        type: 'number',
                        description: 'Process ID to get info for (optional, returns all if not provided)',
                    },
                },
            },
            execute: async (params: { pid?: number }): Promise<ToolResult> => {
                try {
                    const platform = os.platform();
                    let command: string;

                    if (platform === 'win32') {
                        if (params.pid) {
                            command = `tasklist /FI "PID eq ${params.pid}" /FO CSV`;
                        } else {
                            command = 'tasklist /FO CSV';
                        }
                    } else {
                        if (params.pid) {
                            command = `ps -p ${params.pid} -o pid,ppid,cmd,%mem,%cpu,etime`;
                        } else {
                            command = 'ps aux';
                        }
                    }

                    const { stdout } = await execAsync(command);

                    return {
                        success: true,
                        data: {
                            processes: stdout.trim(),
                            platform,
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
        {
            name: 'kill_process',
            description: 'Kill a process by PID',
            parameters: {
                type: 'object',
                properties: {
                    pid: {
                        type: 'number',
                        description: 'Process ID to kill',
                    },
                    signal: {
                        type: 'string',
                        description: 'Signal to send (default: SIGTERM)',
                        default: 'SIGTERM',
                    },
                },
                required: ['pid'],
            },
            execute: async (params: { pid: number; signal?: string }): Promise<ToolResult> => {
                try {
                    const platform = os.platform();
                    let command: string;

                    if (platform === 'win32') {
                        command = `taskkill /F /PID ${params.pid}`;
                    } else {
                        command = `kill -${params.signal || 'TERM'} ${params.pid}`;
                    }

                    const { stdout, stderr } = await execAsync(command);

                    return {
                        success: true,
                        data: {
                            stdout: stdout.trim(),
                            stderr: stderr.trim(),
                            pid: params.pid,
                        },
                    };
                } catch (error) {
                    const err = error as any;
                    return {
                        success: false,
                        error: err.message,
                        data: {
                            stdout: err.stdout?.trim() || '',
                            stderr: err.stderr?.trim() || '',
                        },
                    };
                }
            },
        },
        {
            name: 'list_environment_variables',
            description: 'List all environment variables',
            parameters: {
                type: 'object',
                properties: {
                    filter: {
                        type: 'string',
                        description: 'Filter variables by prefix (e.g., "PATH" for PATH-like variables)',
                    },
                },
            },
            execute: async (params: { filter?: string }): Promise<ToolResult> => {
                try {
                    let envVars: Record<string, string> = {};
                    for (const [key, value] of Object.entries(process.env)) {
                        if (value !== undefined) {
                            envVars[key] = value;
                        }
                    }

                    if (params.filter) {
                        envVars = Object.fromEntries(
                            Object.entries(envVars).filter(([key]) =>
                                key.toUpperCase().includes(params.filter!.toUpperCase())
                            )
                        ) as Record<string, string>;
                    }

                    return {
                        success: true,
                        data: {
                            variables: envVars,
                            count: Object.keys(envVars).length,
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
        {
            name: 'get_disk_usage',
            description: 'Get disk usage information',
            parameters: {
                type: 'object',
                properties: {
                    path: {
                        type: 'string',
                        description: 'Path to check disk usage for (default: current directory)',
                    },
                },
            },
            execute: async (params: { path?: string }): Promise<ToolResult> => {
                try {
                    const targetPath = params.path || process.cwd();
                    const platform = os.platform();
                    let command: string;

                    if (platform === 'win32') {
                        command = `wmic logicaldisk get name,size,freespace`;
                    } else {
                        command = `df -h ${targetPath}`;
                    }

                    const { stdout } = await execAsync(command);

                    return {
                        success: true,
                        data: {
                            path: targetPath,
                            usage: stdout.trim(),
                            platform,
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
        {
            name: 'schedule_task',
            description: 'Schedule a task to run at a specific time or interval',
            parameters: {
                type: 'object',
                properties: {
                    command: {
                        type: 'string',
                        description: 'Command to execute',
                    },
                    schedule: {
                        type: 'string',
                        description: 'Cron expression or time specification',
                    },
                    name: {
                        type: 'string',
                        description: 'Name for the scheduled task',
                    },
                },
                required: ['command', 'schedule'],
            },
            execute: async (params: { command: string; schedule: string; name?: string }): Promise<ToolResult> => {
                try {
                    const platform = os.platform();
                    const taskName = params.name || `task_${Date.now()}`;
                    let command: string;

                    if (platform === 'win32') {
                        command = `schtasks /create /tn "${taskName}" /tr "${params.command}" /sc ${params.schedule}`;
                    } else {
                        command = `(crontab -l 2>/dev/null; echo "${params.schedule} ${params.command}") | crontab -`;
                    }

                    const { stdout, stderr } = await execAsync(command);

                    return {
                        success: true,
                        data: {
                            taskName,
                            schedule: params.schedule,
                            command: params.command,
                            stdout: stdout.trim(),
                            stderr: stderr.trim(),
                        },
                    };
                } catch (error) {
                    const err = error as any;
                    return {
                        success: false,
                        error: err.message,
                        data: {
                            stdout: err.stdout?.trim() || '',
                            stderr: err.stderr?.trim() || '',
                        },
                    };
                }
            },
        },
    ],
};

export default systemPlugin;
