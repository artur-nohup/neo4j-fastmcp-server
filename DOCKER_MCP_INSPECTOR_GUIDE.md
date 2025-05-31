# Testing Docker Image with MCP Inspector

## Quick Start with Docker

### Option 1: Using Docker Compose with Test Token

1. **Generate a test JWT token**:

```javascript
// Save this as generate-token.js
const jwt = require('jsonwebtoken');

const token = jwt.sign({
  userId: 'test-user',
  email: 'test@example.com',
  scopes: ['read', 'write', 'admin'],
  tokenType: 'Bearer'
}, 'test-secret-key-for-inspector', {
  expiresIn: '24h',
  issuer: 'neo4j-mcp-server',
  audience: 'mcp-clients'
});

console.log('Your test token:');
console.log('Bearer ' + token);
```

Or use this pre-generated test token:
```
Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzY29wZXMiOlsicmVhZCIsIndyaXRlIiwiYWRtaW4iXSwidG9rZW5UeXBlIjoiQmVhcmVyIiwiaWF0IjoxNzE3MTc4MDAwLCJleHAiOjE3NDg3MTQwMDAsImlzcyI6Im5lbzRqLW1jcC1zZXJ2ZXIiLCJhdWQiOiJtY3AtY2xpZW50cyJ9.4Xk2LkZlVJ-M0nN0-0SfP0_hnWyKPnR3yWGvEfszhMU
```

2. **Run the Docker container**:

```bash
docker run -d \
  --name neo4j-mcp-test \
  -p 8084:8080 \
  -e NEO4J_URI="bolt://macmini.arturs-server.com:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="nohuprsz" \
  -e JWT_SECRET="test-secret-key-for-inspector" \
  -e OAUTH_CLIENT_ID="test-client" \
  -e OAUTH_CLIENT_SECRET="test-secret" \
  -e OAUTH_REDIRECT_URI="http://localhost:8084/auth/callback" \
  arturrenzenbrink/neo4j-fastmcp-server:latest
```

3. **Test with MCP Inspector using custom headers**:

```bash
# Install and run MCP Inspector with auth header support
npm install -g @modelcontextprotocol/inspector

# Create a test client script
cat > test-mcp-docker.js << 'EOF'
const { Client } = require("@modelcontextprotocol/sdk/client/index.js");
const { StreamableHTTPClientTransport } = require("@modelcontextprotocol/sdk/client/streamableHttp.js");

async function testServer() {
  const client = new Client({
    name: "test-client",
    version: "1.0.0",
  }, {
    capabilities: { tools: {} },
  });

  const transport = new StreamableHTTPClientTransport(
    new URL("http://localhost:8084/stream"),
    {
      fetch: async (url, init) => {
        // Add authorization header
        const headers = {
          ...init?.headers,
          'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzY29wZXMiOlsicmVhZCIsIndyaXRlIiwiYWRtaW4iXSwidG9rZW5UeXBlIjoiQmVhcmVyIiwiaWF0IjoxNzE3MTc4MDAwLCJleHAiOjE3NDg3MTQwMDAsImlzcyI6Im5lbzRqLW1jcC1zZXJ2ZXIiLCJhdWQiOiJtY3AtY2xpZW50cyJ9.4Xk2LkZlVJ-M0nN0-0SfP0_hnWyKPnR3yWGvEfszhMU'
        };
        return fetch(url, { ...init, headers });
      }
    }
  );

  await client.connect(transport);
  console.log("Connected!");
  
  const tools = await client.listTools();
  console.log("Available tools:", tools.tools.map(t => t.name));
  
  // Test a tool
  const result = await client.callTool({
    name: "health_check",
    arguments: {}
  });
  console.log("Health check:", result);
  
  await client.close();
}

testServer().catch(console.error);
EOF

node test-mcp-docker.js
```

### Option 2: Using Modified Docker Image (Easier)

1. **Create a Dockerfile that bypasses auth**:

```dockerfile
# Save as Dockerfile.noauth
FROM arturrenzenbrink/neo4j-fastmcp-server:latest

# Override the startup to use the non-auth server
USER root
RUN echo '#!/bin/sh\nnode dist/server-no-auth.js || node dist/index.js' > /app/start.sh && \
    chmod +x /app/start.sh
USER nextjs

CMD ["/app/start.sh"]
```

2. **Build and run**:

```bash
docker build -f Dockerfile.noauth -t neo4j-mcp-noauth .
docker run -d -p 8085:8080 \
  -e NEO4J_URI="bolt://macmini.arturs-server.com:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="nohuprsz" \
  neo4j-mcp-noauth
```

3. **Test with MCP Inspector (no auth needed)**:

```bash
npx @modelcontextprotocol/inspector http://localhost:8085/stream
```

### Option 3: Using cURL to Test Docker Container

Test your running Docker container directly:

```bash
# 1. Check health endpoint
curl http://localhost:8084/health

# 2. Test MCP tools list (with auth)
curl -X POST http://localhost:8084/stream \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzY29wZXMiOlsicmVhZCIsIndyaXRlIiwiYWRtaW4iXSwidG9rZW5UeXBlIjoiQmVhcmVyIiwiaWF0IjoxNzE3MTc4MDAwLCJleHAiOjE3NDg3MTQwMDAsImlzcyI6Im5lbzRqLW1jcC1zZXJ2ZXIiLCJhdWQiOiJtY3AtY2xpZW50cyJ9.4Xk2LkZlVJ-M0nN0-0SfP0_hnWyKPnR3yWGvEfszhMU" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# 3. Test creating an entity
curl -X POST http://localhost:8084/stream \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ0ZXN0LXVzZXIiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJzY29wZXMiOlsicmVhZCIsIndyaXRlIiwiYWRtaW4iXSwidG9rZW5UeXBlIjoiQmVhcmVyIiwiaWF0IjoxNzE3MTc4MDAwLCJleHAiOjE3NDg3MTQwMDAsImlzcyI6Im5lbzRqLW1jcC1zZXJ2ZXIiLCJhdWQiOiJtY3AtY2xpZW50cyJ9.4Xk2LkZlVJ-M0nN0-0SfP0_hnWyKPnR3yWGvEfszhMU" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_entities",
      "arguments": {
        "entities": [{
          "name": "Docker Test",
          "type": "Test",
          "observations": ["Created from Docker container"]
        }]
      }
    }
  }'
```

## Summary

The published Docker image requires OAuth authentication. To test with MCP Inspector:

1. **Easiest**: Use the local source code with `npx tsx src/test-direct.ts`
2. **With Docker**: Use the test JWT token provided above
3. **Custom**: Build a modified image without auth requirements

The MCP Inspector doesn't natively support custom headers, so you need to either:
- Use a test JWT token with the Docker container
- Build a custom test client
- Modify the image to bypass auth