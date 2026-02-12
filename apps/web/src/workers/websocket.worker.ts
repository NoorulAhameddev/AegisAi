import { createServer } from 'http';
import { initializeWebSocketServer, cleanupWebSocket } from '@/lib/websocket';
import { logger } from '@/lib/logger';
import { env } from '@/lib/env';

const PORT = env.WEBSOCKET_PORT || 3001;

/**
 * WebSocket Worker
 * Runs the Socket.IO server for real-time communication
 *
 * Start with: npm run worker:websocket
 */
async function startWebSocketWorker() {
  try {
    const httpServer = createServer();

    // Initialize WebSocket server
    const io = initializeWebSocketServer(httpServer);

    // Start listening
    httpServer.listen(PORT, () => {
      logger.worker('websocket-worker', 'started', { port: PORT });
      console.log(`\n🔗 WebSocket server running on port ${PORT}`);
      console.log(`   Using transports: websocket, polling`);
      console.log(`   CORS: ${env.FRONTEND_URL || 'http://localhost:3000'}`);
    });

    // Graceful shutdown
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);

    function shutdown() {
      logger.worker('websocket-worker', 'shutting_down', {});
      cleanupWebSocket();
      httpServer.close(() => {
        logger.worker('websocket-worker', 'stopped', {});
        process.exit(0);
      });
    }
  } catch (error) {
    logger.error('WebSocket worker failed to start', error as Error);
    process.exit(1);
  }
}

// Start worker
startWebSocketWorker();
