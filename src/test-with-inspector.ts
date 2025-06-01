#!/usr/bin/env node

import dotenv from 'dotenv';
import { Neo4jMCPServerWithDescope } from './server-descope.js';

// Load environment variables
dotenv.config();

const MCP_PORT = 8083; // Different port to avoid conflicts
const OAUTH_PORT = 8084;

async function testWithInspector() {
  console.log('🔍 Starting Neo4j MCP Server for Inspector Testing...');
  
  try {
    // Initialize the server
    const mcpServer = new Neo4jMCPServerWithDescope();
    await mcpServer.initialize();
    
    // Start servers
    const server = mcpServer.getServer();
    server.listen(MCP_PORT, () => {
      console.log(`✅ Inspector Test MCP Server running on http://localhost:${MCP_PORT}/stream`);
    });
    
    const oauthServer = mcpServer.getOAuthServer();
    const oauthApp = oauthServer.getApp();
    oauthApp.listen(OAUTH_PORT, () => {
      console.log(`✅ Inspector Test OAuth Server running on http://localhost:${OAUTH_PORT}`);
    });
    
    console.log();
    console.log('🎯 MCP Inspector Configuration:');
    console.log('   1. Run: npx @modelcontextprotocol/inspector');
    console.log('   2. Enter URL: http://localhost:' + MCP_PORT + '/stream');
    console.log('   3. Select Transport: Streamable HTTP');
    console.log('   4. Authentication:');
    console.log('      - For OAuth: Complete flow at http://localhost:' + OAUTH_PORT + '/oauth/authorize');
    console.log('      - For API Key: Use X-API-Key header (create via admin endpoint)');
    console.log();
    console.log('🔗 OAuth Flow for Inspector:');
    console.log('   1. GET http://localhost:' + OAUTH_PORT + '/oauth/authorize?');
    console.log('      response_type=code&client_id=inspector&redirect_uri=http://localhost:3000/callback');
    console.log('   2. Complete OAuth provider login');
    console.log('   3. Exchange code for token at /oauth/token');
    console.log('   4. Use Bearer token in Inspector');
    console.log();
    console.log('📊 Test Scenarios:');
    console.log('   1. List tools - should show all 10 MCP tools');
    console.log('   2. Health check - requires admin permissions');
    console.log('   3. Create entities - requires write permissions');
    console.log('   4. Search nodes - requires read permissions');
    console.log();
    console.log('🛡️ Permission Testing:');
    console.log('   - Read operations: search_nodes, find_nodes, read_graph');
    console.log('   - Write operations: create_entities, create_relations, add_observations');
    console.log('   - Admin operations: health_check');
    console.log();
    console.log('🔧 Debug Endpoints:');
    console.log(`   - Discovery: http://localhost:${OAUTH_PORT}/.well-known/oauth-authorization-server`);
    console.log(`   - Health: http://localhost:${OAUTH_PORT}/health`);
    console.log();
    console.log('📝 Press Ctrl+C to stop the inspector test servers');
    
    // Keep the process running
    const shutdown = async (signal: string) => {
      console.log(`\n🛑 Received ${signal}, shutting down inspector test servers...`);
      try {
        await mcpServer.close();
        console.log('✅ Inspector test servers stopped');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error);
        process.exit(1);
      }
    };
    
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
    
  } catch (error) {
    console.error('❌ Inspector test failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  testWithInspector().catch(console.error);
}