# Complete Testing Guide for Neo4j FastMCP Server

## 🐳 Your Docker Image is Published and Working!

**Docker Hub**: `docker.io/arturrenzenbrink/neo4j-fastmcp-server:latest`

## 🧪 Testing Options

### Option 1: Test with MCP Inspector (Recommended)

#### A. Using Local Source (No Auth - Easiest)

```bash
# 1. Clone the repository
git clone https://github.com/artur-nohup/neo4j-fastmcp-server.git
cd neo4j-fastmcp-server

# 2. Install dependencies
npm install

# 3. Run without authentication
npx tsx src/test-direct.ts

# 4. In another terminal, run MCP Inspector
npx @modelcontextprotocol/inspector http://localhost:8081/stream

# 5. Open browser: http://127.0.0.1:6274
```

#### B. Using Docker with Authentication

```bash
# 1. Generate a JWT token
node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign({
  userId: 'test-user',
  email: 'test@example.com', 
  scopes: ['read', 'write', 'admin'],
  tokenType: 'Bearer'
}, 'your-jwt-secret', {
  expiresIn: '24h',
  issuer: 'neo4j-mcp-server',
  audience: 'mcp-clients'
});
console.log('Bearer ' + token);
"

# 2. Run your Docker image
docker run -d \
  --name neo4j-mcp \
  -p 8080:8080 \
  -e NEO4J_URI="bolt://macmini.arturs-server.com:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="nohuprsz" \
  -e JWT_SECRET="your-jwt-secret" \
  -e OAUTH_CLIENT_ID="dummy-client" \
  -e OAUTH_CLIENT_SECRET="dummy-secret" \
  -e OAUTH_REDIRECT_URI="http://localhost:8080/auth/callback" \
  arturrenzenbrink/neo4j-fastmcp-server:latest

# 3. Test with cURL first
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN_HERE" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# 4. For MCP Inspector with auth, you'll need a custom client
```

### Option 2: Test with cURL Commands

```bash
# 1. List available tools
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# 2. Create an entity
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_entities",
      "arguments": {
        "entities": [{
          "name": "Docker Test Entity",
          "type": "Test",
          "observations": ["Created via Docker", "Testing successful"]
        }]
      }
    }
  }'

# 3. Search for the entity
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_nodes",
      "arguments": {
        "query": "Docker"
      }
    }
  }'

# 4. Health check
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "tools/call",
    "params": {
      "name": "health_check",
      "arguments": {}
    }
  }'
```

### Option 3: Test with Custom MCP Client

Create a Node.js test client:

```javascript
// save as test-client.js
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");
const jwt = require('jsonwebtoken');

async function testDockerMCP() {
  // Generate token
  const token = jwt.sign({
    userId: 'test-user',
    email: 'test@example.com',
    scopes: ['read', 'write', 'admin'],
    tokenType: 'Bearer'
  }, 'your-jwt-secret', {
    expiresIn: '24h',
    issuer: 'neo4j-mcp-server',
    audience: 'mcp-clients'
  });

  const client = new Client({
    name: "docker-test-client",
    version: "1.0.0",
  }, {
    capabilities: { tools: {} },
  });

  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8080/stream"),
    {
      fetch: async (url, init) => {
        const headers = {
          ...init?.headers,
          'Authorization': `Bearer ${token}`
        };
        return fetch(url, { ...init, headers });
      }
    }
  );

  try {
    await client.connect(transport);
    console.log("✅ Connected to Docker MCP server!");
    
    const tools = await client.listTools();
    console.log(`📋 Found ${tools.tools.length} tools:`, tools.tools.map(t => t.name));
    
    // Test creating an entity
    const result = await client.callTool({
      name: "create_entities",
      arguments: {
        entities: [{
          name: "Docker Success",
          type: "Achievement", 
          observations: ["Docker image works!", "Testing complete"]
        }]
      }
    });
    console.log("✅ Created entity:", result.content[0].text);
    
    // Test search
    const searchResult = await client.callTool({
      name: "search_nodes",
      arguments: { query: "Docker" }
    });
    console.log("🔍 Search results:", searchResult.content[0].text);
    
  } catch (error) {
    console.error("❌ Error:", error);
  } finally {
    await client.close();
  }
}

testDockerMCP();
```

Run with: `node test-client.js`

### Option 4: Docker Compose for Easy Testing

Create `docker-compose.test.yml`:

```yaml
version: '3.8'
services:
  neo4j-mcp:
    image: arturrenzenbrink/neo4j-fastmcp-server:latest
    ports:
      - "8080:8080"
    environment:
      - NEO4J_URI=bolt://macmini.arturs-server.com:7687
      - NEO4J_USERNAME=neo4j
      - NEO4J_PASSWORD=nohuprsz
      - JWT_SECRET=test-secret-for-docker
      - OAUTH_CLIENT_ID=test-client
      - OAUTH_CLIENT_SECRET=test-secret  
      - OAUTH_REDIRECT_URI=http://localhost:8080/auth/callback
    healthcheck:
      test: ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
```

Run with: `docker-compose -f docker-compose.test.yml up`

## 🎯 What You Can Test

### Available Tools (10 total):
1. `create_entities` - Create knowledge graph entities
2. `create_relations` - Create relationships between entities  
3. `add_observations` - Add observations to existing entities
4. `delete_entities` - Remove entities and relations
5. `delete_observations` - Remove specific observations
6. `delete_relations` - Remove relationships
7. `read_graph` - Read entire knowledge graph
8. `search_nodes` - Full-text search across the graph
9. `find_nodes` - Find specific entities by name
10. `health_check` - Server and Neo4j health status

### Test Workflow:
1. **Health Check** - Verify server and Neo4j connectivity
2. **Create Entity** - Add a test entity to the graph
3. **Create Relation** - Link entities together
4. **Search** - Find entities using full-text search
5. **Read Graph** - View the entire knowledge graph
6. **Cleanup** - Delete test data

## 🚀 Production Usage

Once tested, users can deploy your image:

```bash
docker pull arturrenzenbrink/neo4j-fastmcp-server:latest

docker run -d \
  --name neo4j-mcp-production \
  -p 8080:8080 \
  --restart unless-stopped \
  -e NEO4J_URI="bolt://your-neo4j:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="your-password" \
  -e JWT_SECRET="your-production-secret" \
  -e OAUTH_CLIENT_ID="your-oauth-client" \
  -e OAUTH_CLIENT_SECRET="your-oauth-secret" \
  arturrenzenbrink/neo4j-fastmcp-server:latest
```

Your Neo4j FastMCP Server is ready for production use! 🎉