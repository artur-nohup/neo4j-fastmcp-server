# API Reference

Complete API documentation for the Neo4j FastMCP Server with Descope authentication.

## 🎯 Overview

This server implements the Model Context Protocol (MCP) with enterprise-grade authentication via Descope. It provides both OAuth 2.1 and API key authentication methods.

## 🔗 Base URLs

- **MCP Server**: `http://localhost:8081/stream`
- **OAuth Server**: `http://localhost:8082`

## 🔐 Authentication

### OAuth 2.1 Flow

#### 1. Authorization Request
```http
GET /oauth/authorize HTTP/1.1
Host: localhost:8082

Parameters:
- response_type: "code" (required)
- client_id: string (required)
- redirect_uri: string (required)
- scope: "mcp:read mcp:write" (optional)
- code_challenge: string (required for PKCE)
- code_challenge_method: "S256" (required)
- state: string (required)
```

#### 2. Token Exchange
```http
POST /oauth/token HTTP/1.1
Host: localhost:8082
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code={authorization_code}&
client_id={client_id}&
code_verifier={pkce_verifier}
```

**Response:**
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "eyJ...",
  "scope": "mcp:read mcp:write"
}
```

### API Key Authentication

#### Create API Key
```http
POST /admin/api-keys HTTP/1.1
Host: localhost:8082
Authorization: Bearer {oauth_token}
Content-Type: application/json

{
  "name": "my-mcp-client",
  "permissions": ["mcp:read", "mcp:write"],
  "description": "API key for automated access",
  "expireTime": 0
}
```

**Response:**
```json
{
  "id": "key_123",
  "name": "my-mcp-client",
  "cleartext": "mcp_abc123...",
  "status": "active",
  "createdTime": "2024-01-01T00:00:00Z",
  "expireTime": 0
}
```

## 🛠️ MCP Tools

All tools are available via the MCP protocol at `/stream` endpoint.

### Authentication Headers

**OAuth:**
```http
Authorization: Bearer {access_token}
```

**API Key:**
```http
X-API-Key: {api_key}
```

### Tool Reference

#### 1. create_entities

**Description:** Create entities in the knowledge graph

**Permissions Required:** `mcp:write`

**Parameters:**
```json
{
  "entities": [
    {
      "name": "string",
      "type": "string",
      "observations": ["string"] // optional
    }
  ]
}
```

**Example Request:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "create_entities",
    "arguments": {
      "entities": [
        {
          "name": "Claude AI",
          "type": "AI Assistant",
          "observations": ["Developed by Anthropic", "Constitutional AI"]
        }
      ]
    }
  }
}
```

**Response:**
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"success\": true, \"entities_created\": [{\"name\": \"Claude AI\", \"type\": \"AI Assistant\", \"created\": true}]}"
      }
    ]
  }
}
```

#### 2. create_relations

**Description:** Create relationships between entities

**Permissions Required:** `mcp:write`

**Parameters:**
```json
{
  "relations": [
    {
      "from": "string",
      "to": "string",
      "relation": "string",
      "properties": {} // optional
    }
  ]
}
```

#### 3. add_observations

**Description:** Add observations to entities

**Permissions Required:** `mcp:write`

**Parameters:**
```json
{
  "entity_name": "string",
  "observations": ["string"]
}
```

#### 4. delete_entities

**Description:** Delete entities and their relationships

**Permissions Required:** `mcp:write`

**Parameters:**
```json
{
  "entity_names": ["string"]
}
```

#### 5. delete_observations

**Description:** Delete specific observations from entities

**Permissions Required:** `mcp:write`

**Parameters:**
```json
{
  "entity_name": "string",
  "observation_content": "string"
}
```

#### 6. delete_relations

**Description:** Delete relationships between entities

**Permissions Required:** `mcp:write`

**Parameters:**
```json
{
  "from": "string",
  "to": "string",
  "relation_type": "string" // optional
}
```

#### 7. read_graph

**Description:** Read the knowledge graph structure

**Permissions Required:** `mcp:read`

**Parameters:**
```json
{
  "limit": 100, // optional, default: 100
  "entity_type": "string" // optional
}
```

**Example Response:**
```json
{
  "success": true,
  "entities": [
    {
      "name": "Claude AI",
      "type": "AI Assistant",
      "observations": ["Developed by Anthropic"],
      "relations": [
        {
          "type": "DEVELOPED_BY",
          "entity": "Anthropic",
          "direction": "outgoing"
        }
      ]
    }
  ],
  "count": 1
}
```

#### 8. search_nodes

**Description:** Full-text search across entities and observations

**Permissions Required:** `mcp:read`

**Parameters:**
```json
{
  "query": "string",
  "limit": 10 // optional, default: 10
}
```

#### 9. find_nodes

**Description:** Find entities by exact name match

**Permissions Required:** `mcp:read`

**Parameters:**
```json
{
  "name": "string",
  "include_relations": true // optional, default: true
}
```

#### 10. health_check

**Description:** Check server and database health

**Permissions Required:** `mcp:admin`

**Parameters:**
```json
{}
```

**Example Response:**
```json
{
  "success": true,
  "status": "healthy",
  "database": "connected",
  "stats": {
    "entities": 42,
    "observations": 128
  },
  "timestamp": "2024-01-01T12:00:00Z",
  "authentication": "descope",
  "session_info": {
    "user_id": "user_123",
    "auth_method": "oauth",
    "permissions": ["mcp:read", "mcp:write", "mcp:admin"]
  }
}
```

## 🔍 Discovery Endpoints

### OAuth Discovery
```http
GET /.well-known/oauth-authorization-server HTTP/1.1
Host: localhost:8082
```

**Response:**
```json
{
  "issuer": "http://localhost:8082",
  "authorization_endpoint": "http://localhost:8082/oauth/authorize",
  "token_endpoint": "http://localhost:8082/oauth/token",
  "userinfo_endpoint": "http://localhost:8082/oauth/userinfo",
  "scopes_supported": [
    "mcp:read",
    "mcp:write",
    "mcp:admin",
    "mcp:tools:list",
    "mcp:tools:call",
    "mcp:health"
  ],
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"]
}
```

## 🏥 Health Endpoints

### OAuth Server Health
```http
GET /health HTTP/1.1
Host: localhost:8082
```

### MCP Server Health
```http
GET /health HTTP/1.1
Host: localhost:8081
```

## 📋 Permission Scopes

| Scope | Description | Tools |
|-------|-------------|-------|
| `mcp:read` | Read operations | `read_graph`, `search_nodes`, `find_nodes` |
| `mcp:write` | Write operations | `create_entities`, `create_relations`, `add_observations`, `delete_entities`, `delete_observations`, `delete_relations` |
| `mcp:admin` | Administrative operations | `health_check`, API key management |
| `mcp:tools:list` | List available tools | MCP tools/list |
| `mcp:tools:call` | Execute MCP tools | MCP tools/call |
| `mcp:health` | Access health endpoints | Health checks |

## ❌ Error Responses

### Authentication Errors
```json
{
  "error": {
    "code": -32001,
    "message": "Authentication required. Provide either Authorization: Bearer <token> or X-API-Key: <key>"
  }
}
```

### Permission Errors
```json
{
  "error": {
    "code": -32002,
    "message": "Insufficient permissions. Required: mcp:write"
  }
}
```

### Tool Errors
```json
{
  "error": {
    "code": -32003,
    "message": "Entity 'NonExistent' not found"
  }
}
```

## 🧪 Testing Examples

### cURL Examples

**List Tools (OAuth):**
```bash
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer eyJ..." \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

**Create Entity (API Key):**
```bash
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: mcp_abc123..." \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "id":1,
    "method":"tools/call",
    "params":{
      "name":"create_entities",
      "arguments":{
        "entities":[{"name":"Test Entity","type":"Test"}]
      }
    }
  }'
```

### JavaScript SDK Example

```javascript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// OAuth client
const client = new Client({ name: "my-app", version: "1.0.0" });
const transport = new StreamableHTTPClientTransport(
  new URL("http://localhost:8081/stream"),
  {
    fetch: async (url, init) => ({
      ...init,
      headers: { 
        ...init?.headers, 
        'Authorization': `Bearer ${oauthToken}` 
      }
    })
  }
);

await client.connect(transport);
const tools = await client.listTools();
const result = await client.callTool("read_graph", { limit: 10 });
```

## 🔧 Rate Limiting

- **OAuth endpoints**: 100 requests per minute per IP
- **MCP endpoints**: 1000 requests per minute per authenticated user
- **Health endpoints**: 60 requests per minute per IP

## 📝 Notes

1. **Token Expiration**: OAuth tokens expire after 1 hour by default
2. **Refresh Tokens**: Automatically handle token refresh in your client
3. **API Key Security**: Store API keys securely and rotate regularly
4. **CORS**: OAuth server configured for Claude.ai and common development origins
5. **HTTPS**: Use HTTPS in production for security

For more examples and detailed integration guides, see the [DESCOPE_INTEGRATION_GUIDE.md](DESCOPE_INTEGRATION_GUIDE.md).