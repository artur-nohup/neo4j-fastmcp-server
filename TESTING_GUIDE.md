# Testing Guide

Comprehensive testing guide for the Neo4j FastMCP Server with Descope authentication.

## 🎯 Overview

This guide covers testing the MCP server with various clients and authentication methods:

- **MCP Inspector** - Visual MCP client for testing
- **cURL Commands** - Direct HTTP testing
- **Custom Clients** - JavaScript SDK integration
- **Claude.ai Integration** - Production usage

## 🚀 Quick Start Testing

### 1. Start Test Server

```bash
# Clone and setup
git clone https://github.com/artur-nohup/neo4j-fastmcp-server.git
cd neo4j-fastmcp-server
npm install
cp .env.example .env

# Edit .env with your configuration
# Start test server
npm run test:descope
```

### 2. Verify Server Status

```bash
# Check MCP server health
curl http://localhost:8081/health

# Check OAuth server health
curl http://localhost:8082/health

# Check OAuth discovery
curl http://localhost:8082/.well-known/oauth-authorization-server
```

## 🔍 MCP Inspector Testing

### Setup Inspector

```bash
# Install MCP Inspector
npm install -g @modelcontextprotocol/inspector

# Start inspector
npx @modelcontextprotocol/inspector
```

### Configure Connection

1. **Server URL**: `http://localhost:8081/stream`
2. **Transport**: Streamable HTTP
3. **Authentication**: See options below

### Authentication Options

#### Option A: OAuth Flow

1. **Start OAuth Flow**:
   ```bash
   # Visit this URL in browser
   http://localhost:8082/oauth/authorize?response_type=code&client_id=inspector&redirect_uri=http://localhost:3000/callback&scope=mcp:read%20mcp:write&code_challenge=CHALLENGE&code_challenge_method=S256&state=STATE
   ```

2. **Complete Provider Login** (Google, GitHub, etc.)

3. **Exchange Code for Token**:
   ```bash
   curl -X POST http://localhost:8082/oauth/token \
     -H "Content-Type: application/x-www-form-urlencoded" \
     -d "grant_type=authorization_code&code=AUTH_CODE&client_id=inspector&code_verifier=VERIFIER"
   ```

4. **Use Bearer Token** in Inspector headers:
   ```
   Authorization: Bearer eyJ...
   ```

#### Option B: API Key

1. **Create API Key** (requires admin OAuth token):
   ```bash
   curl -X POST http://localhost:8082/admin/api-keys \
     -H "Authorization: Bearer ADMIN_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"inspector","permissions":["mcp:read","mcp:write","mcp:admin"]}'
   ```

2. **Use API Key** in Inspector headers:
   ```
   X-API-Key: mcp_abc123...
   ```

### Test Scenarios

#### 1. List Tools
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/list"
}
```

**Expected Response**: List of 10 tools

#### 2. Health Check
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "health_check",
    "arguments": {}
  }
}
```

**Expected Response**: Server health status

#### 3. Create Test Entities
```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "create_entities",
    "arguments": {
      "entities": [
        {
          "name": "Test Entity",
          "type": "Test",
          "observations": ["Created via MCP Inspector"]
        }
      ]
    }
  }
}
```

#### 4. Search Entities
```json
{
  "jsonrpc": "2.0",
  "id": 4,
  "method": "tools/call",
  "params": {
    "name": "search_nodes",
    "arguments": {
      "query": "Test",
      "limit": 5
    }
  }
}
```

#### 5. Read Graph
```json
{
  "jsonrpc": "2.0",
  "id": 5,
  "method": "tools/call",
  "params": {
    "name": "read_graph",
    "arguments": {
      "limit": 10
    }
  }
}
```

## 💻 cURL Testing

### Authentication Setup

```bash
# Set OAuth token
export OAUTH_TOKEN="eyJ..."

# Set API key
export API_KEY="mcp_abc123..."
```

### Tool Testing

#### List Tools
```bash
# OAuth
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# API Key
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

#### Create Entities
```bash
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"create_entities",
      "arguments":{
        "entities":[
          {
            "name":"Claude AI",
            "type":"AI Assistant",
            "observations":["Developed by Anthropic","Constitutional AI"]
          },
          {
            "name":"Anthropic",
            "type":"Company",
            "observations":["AI Safety focused"]
          }
        ]
      }
    }
  }'
```

#### Create Relations
```bash
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"create_relations",
      "arguments":{
        "relations":[
          {
            "from":"Claude AI",
            "to":"Anthropic",
            "relation":"DEVELOPED_BY",
            "properties":{"year":2023}
          }
        ]
      }
    }
  }'
```

#### Search and Query
```bash
# Full-text search
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"search_nodes",
      "arguments":{
        "query":"AI",
        "limit":5
      }
    }
  }'

# Find specific entity
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":4,
    "method":"tools/call",
    "params":{
      "name":"find_nodes",
      "arguments":{
        "name":"Claude AI",
        "include_relations":true
      }
    }
  }'

# Read entire graph
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer $OAUTH_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":5,
    "method":"tools/call",
    "params":{
      "name":"read_graph",
      "arguments":{
        "limit":20
      }
    }
  }'
```

## 🧑‍💻 JavaScript SDK Testing

### Setup Test Client

```javascript
// test-client.js
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const OAUTH_TOKEN = "eyJ...";
const API_KEY = "mcp_abc123...";

// OAuth client
const oauthClient = new Client(
  { name: "test-client", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const oauthTransport = new StreamableHTTPClientTransport(
  new URL("http://localhost:8081/stream"),
  {
    fetch: async (url, init) => {
      const headers = {
        ...init?.headers,
        'Authorization': `Bearer ${OAUTH_TOKEN}`
      };
      return fetch(url, { ...init, headers });
    }
  }
);

// API Key client
const apiKeyClient = new Client(
  { name: "test-client-api", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

const apiKeyTransport = new StreamableHTTPClientTransport(
  new URL("http://localhost:8081/stream"),
  {
    fetch: async (url, init) => {
      const headers = {
        ...init?.headers,
        'X-API-Key': API_KEY
      };
      return fetch(url, { ...init, headers });
    }
  }
);

async function testClient() {
  try {
    console.log('Testing OAuth client...');
    await oauthClient.connect(oauthTransport);
    
    // List tools
    const tools = await oauthClient.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));
    
    // Health check
    const health = await oauthClient.callTool("health_check", {});
    console.log('Health check:', health.content[0].text);
    
    // Create test entity
    const createResult = await oauthClient.callTool("create_entities", {
      entities: [{
        name: "SDK Test Entity",
        type: "Test",
        observations: ["Created via JavaScript SDK"]
      }]
    });
    console.log('Create result:', createResult.content[0].text);
    
    // Search for it
    const searchResult = await oauthClient.callTool("search_nodes", {
      query: "SDK Test",
      limit: 5
    });
    console.log('Search result:', searchResult.content[0].text);
    
    await oauthClient.close();
    console.log('OAuth client test completed successfully');
    
  } catch (error) {
    console.error('OAuth client test failed:', error);
  }
  
  try {
    console.log('\nTesting API Key client...');
    await apiKeyClient.connect(apiKeyTransport);
    
    const tools = await apiKeyClient.listTools();
    console.log('Available tools:', tools.tools.map(t => t.name));
    
    await apiKeyClient.close();
    console.log('API Key client test completed successfully');
    
  } catch (error) {
    console.error('API Key client test failed:', error);
  }
}

testClient();
```

### Run SDK Test

```bash
node test-client.js
```

## 🎯 Claude.ai Integration Testing

### Setup Claude Integration

1. **In Claude.ai**:
   - Go to Settings > Integrations
   - Click "Add Integration"
   - Enter MCP Server URL: `http://localhost:8081/stream`
   - Complete OAuth flow when prompted

2. **Test Integration**:
   ```
   User: "Can you check the health of the knowledge graph?"
   Claude: Uses health_check tool
   
   User: "Create an entity for yourself in the knowledge graph"
   Claude: Uses create_entities tool
   
   User: "Search for information about AI"
   Claude: Uses search_nodes tool
   ```

### Expected Behavior

- Claude should automatically authenticate via OAuth
- All 10 MCP tools should be available
- Claude should respect permission scopes
- Knowledge graph operations should persist

## 🔍 Permission Testing

### Test Permission Scopes

#### Read-Only User
```bash
# Create read-only API key
curl -X POST http://localhost:8082/admin/api-keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"readonly","permissions":["mcp:read"]}'

# Test read operations (should succeed)
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: $READONLY_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"read_graph","arguments":{}}}'

# Test write operations (should fail)
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: $READONLY_KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"create_entities","arguments":{"entities":[{"name":"Test","type":"Test"}]}}}'
```

#### Write User
```bash
# Create write API key
curl -X POST http://localhost:8082/admin/api-keys \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"name":"writer","permissions":["mcp:read","mcp:write"]}'

# Test write operations (should succeed)
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: $WRITE_KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"create_entities","arguments":{"entities":[{"name":"Writer Test","type":"Test"}]}}}'

# Test admin operations (should fail)
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: $WRITE_KEY" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"health_check","arguments":{}}}'
```

## 🛠️ Automated Testing

### Test Script

```bash
#!/bin/bash
# test-suite.sh

set -e

echo "🧪 Running Neo4j MCP Server Test Suite"

# Setup
export API_KEY="your-test-api-key"
export BASE_URL="http://localhost:8081"

# Test 1: Health check
echo "✅ Testing health endpoint..."
curl -f "$BASE_URL/health" > /dev/null

# Test 2: List tools
echo "✅ Testing tools list..."
RESPONSE=$(curl -s -X POST "$BASE_URL/stream" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}')

echo $RESPONSE | jq -e '.result.tools | length == 10'

# Test 3: Create entity
echo "✅ Testing entity creation..."
RESPONSE=$(curl -s -X POST "$BASE_URL/stream" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":2,
    "method":"tools/call",
    "params":{
      "name":"create_entities",
      "arguments":{
        "entities":[{"name":"Test Suite Entity","type":"Test"}]
      }
    }
  }')

echo $RESPONSE | jq -e '.result.content[0].text | contains("success")']

# Test 4: Search entity
echo "✅ Testing entity search..."
RESPONSE=$(curl -s -X POST "$BASE_URL/stream" \
  -H "X-API-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":3,
    "method":"tools/call",
    "params":{
      "name":"search_nodes",
      "arguments":{"query":"Test Suite","limit":5}
    }
  }')

echo $RESPONSE | jq -e '.result.content[0].text | contains("Test Suite Entity")']

echo "🎉 All tests passed!"
```

### Run Test Suite

```bash
chmod +x test-suite.sh
./test-suite.sh
```

## 🚨 Troubleshooting

### Common Issues

#### Authentication Failures
```bash
# Check token validity
curl -X GET http://localhost:8082/oauth/userinfo \
  -H "Authorization: Bearer $TOKEN"

# Refresh expired token
curl -X POST http://localhost:8082/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=$REFRESH_TOKEN"
```

#### Connection Issues
```bash
# Check server status
curl -f http://localhost:8081/health
curl -f http://localhost:8082/health

# Check Neo4j connectivity
docker exec neo4j cypher-shell -u neo4j -p password "RETURN 1"
```

#### Permission Errors
```bash
# Check user permissions
curl -X GET http://localhost:8082/oauth/userinfo \
  -H "Authorization: Bearer $TOKEN" | jq .permissions

# Verify API key permissions
# (Check Descope console for API key details)
```

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development DEBUG=* npm run test:descope

# Check detailed logs
tail -f logs/mcp-server.log
```

### Performance Testing

```bash
# Load test with Apache Bench
ab -n 100 -c 10 -H "X-API-Key: $API_KEY" \
  -T "application/json" \
  -p create-entity.json \
  http://localhost:8081/stream

# Monitor Neo4j performance
echo "CALL dbms.queryJmx('org.neo4j:instance=kernel#0,name=Transactions') YIELD attributes RETURN attributes.NumberOfOpenTransactions;" | \
  docker exec -i neo4j cypher-shell -u neo4j -p password
```

This comprehensive testing guide ensures your Neo4j MCP Server with Descope authentication works correctly across all supported clients and authentication methods. 🎯