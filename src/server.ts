#!/usr/bin/env node

import 'dotenv/config';
import { Server } from './server/Server.js';
import { logger } from './utils/Logger.js';

// Start the server for Vercel deployment
const server = new Server();

// Listen on the port provided by Vercel (or default to 3000)
const port = parseInt(process.env.PORT || '3000', 10);

// Override the server config to use Vercel's port
server.start().then(() => {
    logger.info(`Server started on port ${port}`);
}).catch((error) => {
    logger.error('Failed to start server', error);
    process.exit(1);
});

// Export the Express app for Vercel
export default server.app;
