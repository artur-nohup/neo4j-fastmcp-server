#!/usr/bin/env node

import dotenv from 'dotenv';
import { Neo4jMCPServerWithDescope } from './server-descope.js';

// Load environment variables
dotenv.config();

const MCP_PORT = parseInt(process.env.MCP_PORT || '8081');
const OAUTH_PORT = parseInt(process.env.OAUTH_PORT || '8082');

async function main() {
  try {
    console.log('🚀 Starting Neo4j MCP Server with Descope Authentication...');
    
    // Validate required environment variables
    const requiredEnvVars = [
      'DESCOPE_PROJECT_ID',
      'DESCOPE_MANAGEMENT_KEY',
      'NEO4J_URI',
      'NEO4J_USERNAME',
      'NEO4J_PASSWORD'
    ];
    
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    if (missingVars.length > 0) {
      console.error('❌ Missing required environment variables:', missingVars.join(', '));
      console.error('Please check your .env file and ensure all required variables are set.');
      process.exit(1);
    }
    
    // Initialize the server
    const mcpServer = new Neo4jMCPServerWithDescope();
    await mcpServer.initialize();
    
    // Start MCP server
    const server = mcpServer.getServer();
    server.listen(MCP_PORT, () => {
      console.log(`✅ MCP Server listening on http://localhost:${MCP_PORT}/stream`);
      console.log(`📋 Tools available: create_entities, create_relations, add_observations,`);
      console.log(`   delete_entities, delete_observations, delete_relations,`);
      console.log(`   read_graph, search_nodes, find_nodes, health_check`);
    });
    
    // Start OAuth server
    const oauthServer = mcpServer.getOAuthServer();
    const oauthApp = oauthServer.getApp();
    oauthApp.listen(OAUTH_PORT, () => {
      console.log(`🔐 OAuth Server listening on http://localhost:${OAUTH_PORT}`);
      console.log(`🔗 OAuth endpoints:`);
      console.log(`   - Authorization: http://localhost:${OAUTH_PORT}/oauth/authorize`);
      console.log(`   - Token Exchange: http://localhost:${OAUTH_PORT}/oauth/token`);
      console.log(`   - User Info: http://localhost:${OAUTH_PORT}/oauth/userinfo`);
      console.log(`   - Discovery: http://localhost:${OAUTH_PORT}/.well-known/oauth-authorization-server`);
      console.log(`   - Health: http://localhost:${OAUTH_PORT}/health`);
      console.log();
      console.log('🎯 Ready for Claude.ai integration!');
      console.log('📖 See README_DESCOPE.md for setup instructions');
    });
    
    // Graceful shutdown handling
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
      try {
        await mcpServer.close();
        console.log('✅ Server closed successfully');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { main };