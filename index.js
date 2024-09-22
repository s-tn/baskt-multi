import express from 'express';
import http from 'http';
import { createWebSocketServer } from './server/ws.js';

// Create an Express app
const app = express();
const server = http.createServer(app);

// Serve static files (HTML, JS, etc.)
app.use(express.static('public'));

// Initialize WebSocket server
createWebSocketServer(server);

// Start the server on port 80
server.listen(7500, () => {
    console.log('Server running on port 7500');
});
