import axios from 'axios';
import type { Plugin, ToolResult } from '../types/index.js';

const webPlugin: Plugin = {
    name: 'web',
    version: '1.0.0',
    description: 'Web operations plugin for HTTP requests, scraping, and API interactions',
    author: 'AI Assistant',
    enabled: true,
    tools: [
        {
            name: 'http_get',
            description: 'Make an HTTP GET request',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL to request',
                    },
                    headers: {
                        type: 'object',
                        description: 'HTTP headers to include',
                    },
                    params: {
                        type: 'object',
                        description: 'Query parameters',
                    },
                },
                required: ['url'],
            },
            execute: async (params: { url: string; headers?: Record<string, string>; params?: Record<string, any> }): Promise<ToolResult> => {
                try {
                    const response = await axios.get(params.url, {
                        headers: params.headers,
                        params: params.params,
                    });
                    return {
                        success: true,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            data: response.data,
                        },
                    };
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        return {
                            success: false,
                            error: error.message,
                            data: {
                                status: error.response?.status,
                                statusText: error.response?.statusText,
                                data: error.response?.data,
                            },
                        };
                    }
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'http_post',
            description: 'Make an HTTP POST request',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL to request',
                    },
                    data: {
                        type: 'object',
                        description: 'Request body data',
                    },
                    headers: {
                        type: 'object',
                        description: 'HTTP headers to include',
                    },
                },
                required: ['url', 'data'],
            },
            execute: async (params: { url: string; data: any; headers?: Record<string, string> }): Promise<ToolResult> => {
                try {
                    const response = await axios.post(params.url, params.data, {
                        headers: params.headers,
                    });
                    return {
                        success: true,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            data: response.data,
                        },
                    };
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        return {
                            success: false,
                            error: error.message,
                            data: {
                                status: error.response?.status,
                                statusText: error.response?.statusText,
                                data: error.response?.data,
                            },
                        };
                    }
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'http_put',
            description: 'Make an HTTP PUT request',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL to request',
                    },
                    data: {
                        type: 'object',
                        description: 'Request body data',
                    },
                    headers: {
                        type: 'object',
                        description: 'HTTP headers to include',
                    },
                },
                required: ['url', 'data'],
            },
            execute: async (params: { url: string; data: any; headers?: Record<string, string> }): Promise<ToolResult> => {
                try {
                    const response = await axios.put(params.url, params.data, {
                        headers: params.headers,
                    });
                    return {
                        success: true,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            data: response.data,
                        },
                    };
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        return {
                            success: false,
                            error: error.message,
                            data: {
                                status: error.response?.status,
                                statusText: error.response?.statusText,
                                data: error.response?.data,
                            },
                        };
                    }
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'http_delete',
            description: 'Make an HTTP DELETE request',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL to request',
                    },
                    headers: {
                        type: 'object',
                        description: 'HTTP headers to include',
                    },
                },
                required: ['url'],
            },
            execute: async (params: { url: string; headers?: Record<string, string> }): Promise<ToolResult> => {
                try {
                    const response = await axios.delete(params.url, {
                        headers: params.headers,
                    });
                    return {
                        success: true,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            data: response.data,
                        },
                    };
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        return {
                            success: false,
                            error: error.message,
                            data: {
                                status: error.response?.status,
                                statusText: error.response?.statusText,
                                data: error.response?.data,
                            },
                        };
                    }
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
        {
            name: 'scrape_webpage',
            description: 'Scrape content from a webpage',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'URL to scrape',
                    },
                    selector: {
                        type: 'string',
                        description: 'CSS selector to extract content',
                    },
                },
                required: ['url'],
            },
            execute: async (params: { url: string; selector?: string }): Promise<ToolResult> => {
                try {
                    const puppeteer = await import('puppeteer');
                    const browser = await puppeteer.launch({ headless: true });
                    const page = await browser.newPage();

                    await page.goto(params.url, { waitUntil: 'networkidle2' });

                    let data: any;

                    if (params.selector) {
                        data = await page.evaluate((sel) => {
                            // @ts-ignore - document is available in browser context
                            const elements = document.querySelectorAll(sel);
                            return Array.from(elements).map((el: any) => ({
                                text: el.textContent?.trim(),
                                html: el.innerHTML,
                            }));
                        }, params.selector);
                    } else {
                        data = await page.evaluate(() => {
                            // @ts-ignore - document is available in browser context
                            const doc = document as any;
                            return {
                                title: doc.title,
                                meta: {
                                    description: doc.querySelector('meta[name="description"]')?.getAttribute('content'),
                                    keywords: doc.querySelector('meta[name="keywords"]')?.getAttribute('content'),
                                },
                                text: doc.body.textContent?.trim(),
                            };
                        });
                    }

                    await browser.close();

                    return {
                        success: true,
                        data: { url: params.url, content: data },
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
            name: 'api_request',
            description: 'Make a custom API request with full control',
            parameters: {
                type: 'object',
                properties: {
                    url: {
                        type: 'string',
                        description: 'API endpoint URL',
                    },
                    method: {
                        type: 'string',
                        description: 'HTTP method (GET, POST, PUT, DELETE, PATCH)',
                        enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
                    },
                    headers: {
                        type: 'object',
                        description: 'HTTP headers',
                    },
                    data: {
                        type: 'object',
                        description: 'Request body',
                    },
                    params: {
                        type: 'object',
                        description: 'Query parameters',
                    },
                },
                required: ['url', 'method'],
            },
            execute: async (params: {
                url: string;
                method: string;
                headers?: Record<string, string>;
                data?: any;
                params?: Record<string, any>
            }): Promise<ToolResult> => {
                try {
                    const response = await axios({
                        url: params.url,
                        method: params.method,
                        headers: params.headers,
                        data: params.data,
                        params: params.params,
                    });
                    return {
                        success: true,
                        data: {
                            status: response.status,
                            statusText: response.statusText,
                            headers: response.headers,
                            data: response.data,
                        },
                    };
                } catch (error) {
                    if (axios.isAxiosError(error)) {
                        return {
                            success: false,
                            error: error.message,
                            data: {
                                status: error.response?.status,
                                statusText: error.response?.statusText,
                                data: error.response?.data,
                            },
                        };
                    }
                    return {
                        success: false,
                        error: error instanceof Error ? error.message : String(error),
                    };
                }
            },
        },
    ],
};

export default webPlugin;
