import 'dotenv/config';
import { Server } from '../src/server/Server.js';
import { logger } from '../src/utils/Logger.js';

// Initialize the server once
let serverInstance: Server | null = null;

function getServer() {
    if (!serverInstance) {
        serverInstance = new Server();
    }
    return serverInstance;
}

// Export the Express app as a Vercel serverless function
export default async function handler(req: any, res: any) {
    const server = getServer();
    return server.app(req, res);
}
