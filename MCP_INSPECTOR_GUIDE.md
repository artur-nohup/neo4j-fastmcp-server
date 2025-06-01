# Testing with MCP Inspector - API Key Authentication

## Quick Start

The Neo4j FastMCP Server now uses simple API key authentication that works seamlessly with MCP Inspector.

### Option 1: Local Testing (Recommended)

1. **Start the test server:**
```bash
git clone https://github.com/artur-nohup/neo4j-fastmcp-server.git
cd neo4j-fastmcp-server
npm install
npm run test:inspector
```

2. **Configure MCP Inspector:**
```bash
# In another terminal
npx @modelcontextprotocol/inspector
```

3. **Connect to the server:**
   - **URL**: `http://localhost:8081/stream`
   - **Transport**: Streamable HTTP
   - **Authentication**: Add custom header:
     - **Header Name**: `X-API-Key`
     - **Header Value**: `test-api-key-for-inspector`
   
   **Alternative**: Use Authorization header:
   - **Header Name**: `Authorization`  
   - **Header Value**: `Bearer test-api-key-for-inspector`

4. **Test the tools:**
   - Click "Connect" in MCP Inspector
   - You should see 10 available tools
   - Try the `health_check` tool first
   - Create some test entities and relations

### Option 2: Docker Testing

1. **Run with Docker:**
```bash
docker run -d \
  --name neo4j-mcp-test \
  -p 8080:8080 \
  -e NEO4J_URI="bolt://macmini.arturs-server.com:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="nohuprsz" \
  -e MCP_SERVER_API_KEY="my-secure-api-key" \
  arturrenzenbrink/neo4j-fastmcp-server:latest
```

2. **Configure MCP Inspector:**
   - **URL**: `http://localhost:8080/stream`
   - **Header**: `X-API-Key: my-secure-api-key`

### Option 3: Production Setup

1. **Environment Configuration:**
```bash
# Set your environment variables
export NEO4J_URI="bolt://your-neo4j:7687"
export NEO4J_USERNAME="neo4j"
export NEO4J_PASSWORD="your-password"
export MCP_SERVER_API_KEY="your-secure-random-api-key"

# Start the server
npm run build
npm start
```

2. **Generate a secure API key:**
```bash
# Generate a random API key
openssl rand -hex 32
# Or use any secure random string generator
```

## MCP Inspector Configuration Details

### Headers Setup in MCP Inspector

When configuring the connection in MCP Inspector:

1. Click "Connect to Server"
2. Select "Streamable HTTP" transport
3. Enter your server URL
4. Click "Advanced" or "Headers" 
5. Add custom header:
   - **Name**: `X-API-Key`
   - **Value**: `your-api-key`

### Alternative Authentication Methods

The server supports multiple authentication methods:

1. **X-API-Key Header** (Primary):
   ```
   X-API-Key: your-api-key-here
   ```

2. **Authorization Header** (Alternative):
   ```
   Authorization: Bearer your-api-key-here
   ```

### Testing with cURL

```bash
# Test tools list
curl -X POST http://localhost:8080/stream \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'

# Test health check
curl -X POST http://localhost:8080/stream \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0", 
    "id": 2, 
    "method": "tools/call",
    "params": {
      "name": "health_check",
      "arguments": {}
    }
  }'
```

## Available Tools

1. **create_entities** - Create knowledge graph entities
2. **create_relations** - Create relationships between entities
3. **add_observations** - Add observations to entities
4. **delete_entities** - Remove entities and relations
5. **delete_observations** - Remove specific observations
6. **delete_relations** - Remove relationships
7. **read_graph** - Read entire knowledge graph
8. **search_nodes** - Full-text search across the graph
9. **find_nodes** - Find specific entities by name
10. **health_check** - Server and Neo4j health status

## FastMCP Best Practices Implemented

### ✅ Authentication
- Simple API key authentication following FastMCP patterns
- Support for both `X-API-Key` and `Authorization: Bearer` headers
- Proper error handling with `UserError` for client errors

### ✅ Session Management
- Session data accessible in all tool executions
- Connection/disconnection event logging
- Session-based API key tracking

### ✅ Health Monitoring
- Built-in health check endpoint at `/health`
- Health check tool for detailed status
- Automatic ping/keepalive for connection monitoring

### ✅ Error Handling
- `UserError` for user-facing errors
- Detailed logging with context
- Graceful error responses

### ✅ Logging
- Structured logging with session context
- Tool execution tracking
- Connection event monitoring

### ✅ Configuration
- Environment-based configuration
- Validation of required variables
- Secure default settings

## Troubleshooting

### Connection Issues
1. **Server not starting**: Check environment variables
2. **Authentication failed**: Verify API key matches
3. **Neo4j connection**: Test Neo4j connectivity separately

### MCP Inspector Issues
1. **Can't connect**: Ensure server is running and URL is correct
2. **Authentication errors**: Check header configuration
3. **Tools not loading**: Verify API key is valid

### Common Error Messages
- `"Authentication required"` - Missing or invalid API key
- `"Failed to connect to Neo4j"` - Check Neo4j configuration
- `"Invalid API key"` - API key doesn't match server configuration

## Security Notes

1. **API Key Security**:
   - Use long, random API keys (32+ characters)
   - Store API keys securely (environment variables)
   - Rotate API keys regularly
   - Never commit API keys to code

2. **Network Security**:
   - Use HTTPS in production
   - Consider IP whitelisting
   - Implement rate limiting

3. **Neo4j Security**:
   - Use strong Neo4j passwords
   - Limit Neo4j network access
   - Regular database backups