#!/usr/bin/env node

import dotenv from 'dotenv';
import { Neo4jMCPServer } from './server.js';

// Load environment variables
dotenv.config();

const MCP_PORT = 8081;
const OAUTH_PORT = 8082;

async function testServer() {
  console.log('🧪 Testing Neo4j MCP Server with Descope Authentication...');
  
  try {
    // Initialize the server
    const mcpServer = new Neo4jMCPServer();
    await mcpServer.initialize();
    
    // Start servers
    const server = mcpServer.getServer();
    server.listen(MCP_PORT, () => {
      console.log(`✅ Test MCP Server running on http://localhost:${MCP_PORT}/stream`);
    });
    
    const oauthServer = mcpServer.getOAuthServer();
    const oauthApp = oauthServer.getApp();
    oauthApp.listen(OAUTH_PORT, () => {
      console.log(`✅ Test OAuth Server running on http://localhost:${OAUTH_PORT}`);
    });
    
    console.log();
    console.log('🔗 Test Endpoints:');
    console.log(`   MCP Stream: http://localhost:${MCP_PORT}/stream`);
    console.log(`   OAuth Flow: http://localhost:${OAUTH_PORT}/oauth/authorize`);
    console.log(`   Discovery: http://localhost:${OAUTH_PORT}/.well-known/oauth-authorization-server`);
    console.log(`   Health: http://localhost:${MCP_PORT}/health`);
    console.log();
    console.log('🧪 Testing Tools:');
    
    // Test basic connectivity
    console.log('📋 Available tools: create_entities, create_relations, add_observations,');
    console.log('   delete_entities, delete_observations, delete_relations,');
    console.log('   read_graph, search_nodes, find_nodes, health_check');
    console.log();
    console.log('🎯 Ready for testing with:');
    console.log('   - MCP Inspector: npx @modelcontextprotocol/inspector');
    console.log('   - Claude.ai integration');
    console.log('   - Custom MCP clients');
    console.log();
    console.log('🔐 Authentication methods supported:');
    console.log('   - OAuth 2.1 with PKCE (for Claude.ai)');
    console.log('   - API Key authentication (for automation)');
    console.log();
    console.log('📖 Press Ctrl+C to stop the test servers');
    
    // Keep the process running
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down test servers...`);
      try {
        await mcpServer.close();
        console.log('✅ Test servers stopped');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testServer().catch(console.error);
}