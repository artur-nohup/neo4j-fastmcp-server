#!/usr/bin/env node

import dotenv from 'dotenv';
import { Neo4jMCPServer } from './server.js';

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  const required = [
    'NEO4J_URI',
    'NEO4J_USERNAME', 
    'NEO4J_PASSWORD',
    'JWT_SECRET'
  ];

  const missing = required.filter(env => !process.env[env]);
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing.join(', '));
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }

  // Create and start the server
  const server = new Neo4jMCPServer();
  
  // Graceful shutdown handling
  const gracefulShutdown = async (signal: string) => {
    console.log(`\n📡 Received ${signal}, shutting down gracefully...`);
    try {
      await server.stop();
      console.log('✅ Server stopped successfully');
      process.exit(0);
    } catch (error) {
      console.error('❌ Error during shutdown:', error);
      process.exit(1);
    }
  };

  // Register signal handlers
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });

  try {
    const port = parseInt(process.env.SERVER_PORT || '8080');
    await server.start(port);
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Run the server
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('❌ Server startup failed:', error);
    process.exit(1);
  });
}