# Descope Integration Guide

Complete guide for implementing OAuth 2.1 and API key authentication using Descope in the Neo4j MCP Server.

## 🎯 Overview

This implementation provides enterprise-grade authentication for remote MCP servers that work seamlessly with Claude.ai and other MCP clients. It uses Descope for:

- **OAuth 2.1 with PKCE** for Claude.ai integration
- **API Key Authentication** for programmatic access
- **Session Management** with automatic token refresh
- **Fine-grained Permissions** using MCP-specific scopes
- **User Management** through Descope's admin interface

## 🚀 Quick Start

### 1. Descope Setup

1. **Create Descope Account**: Visit [Descope Console](https://app.descope.com)
2. **Create Project**: Set up a new project for your MCP server
3. **Configure OAuth Providers**: Add Google, GitHub, or other OAuth providers
4. **Get Credentials**: Copy your Project ID and Management Key

### 2. Environment Configuration

```bash
# Copy the example environment file
cp .env.example .env

# Edit with your configuration
nano .env
```

Required variables:
```env
# Descope Configuration
DESCOPE_PROJECT_ID=your-descope-project-id
DESCOPE_MANAGEMENT_KEY=your-management-key-for-api-operations

# Neo4j Configuration  
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# OAuth Configuration
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REDIRECT_URI=http://localhost:8081/oauth/callback

# Session Security
SESSION_SECRET=your-secure-session-secret
```

### 3. Installation & Testing

```bash
# Install dependencies
npm install

# Start test server
npm run test:descope

# In another terminal, test with MCP Inspector
npx @modelcontextprotocol/inspector
```

## 🔐 Authentication Methods

### OAuth 2.1 Flow (for Claude.ai)

**Step 1: Authorization Request**
```
GET http://localhost:8082/oauth/authorize?
  response_type=code&
  client_id=your-client-id&
  redirect_uri=http://localhost:8081/oauth/callback&
  scope=mcp:read mcp:write&
  code_challenge=<pkce-challenge>&
  code_challenge_method=S256&
  state=<random-state>
```

**Step 2: Token Exchange**
```bash
curl -X POST http://localhost:8082/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=authorization_code&
      code=<auth-code>&
      client_id=your-client-id&
      code_verifier=<pkce-verifier>"
```

**Step 3: Use Access Token**
```bash
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### API Key Authentication

**Create API Key** (Admin required):
```bash
curl -X POST http://localhost:8082/admin/api-keys \
  -H "Authorization: Bearer <admin-oauth-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "my-mcp-client",
    "permissions": ["mcp:read", "mcp:write"],
    "description": "API key for automated MCP access",
    "expireTime": 0
  }'
```

**Use API Key**:
```bash
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: <your-api-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🎛️ MCP Scopes & Permissions

### Available Scopes
- `mcp:read` - Read operations (search, find, read graph)
- `mcp:write` - Write operations (create, update, delete)
- `mcp:admin` - Administrative operations (health check, user management)
- `mcp:tools:list` - List available tools
- `mcp:tools:call` - Call MCP tools
- `mcp:health` - Access health endpoints
- `mcp:resources:read` - Read MCP resources
- `mcp:resources:write` - Write MCP resources

### Permission Mapping
```typescript
// Role-based permission mapping
switch (role.toLowerCase()) {
  case 'admin':
    permissions.push('mcp:admin');
    break;
  case 'writer':
    permissions.push('mcp:write', 'mcp:read');
    break;
  case 'reader':
    permissions.push('mcp:read');
    break;
}
```

## 🔧 Integration Examples

### Claude.ai Integration

1. **Add Custom Integration in Claude**:
   - Go to Settings > Integrations
   - Click "Add Integration"
   - Enter MCP Server URL: `http://localhost:8081/stream`

2. **Complete OAuth Flow**:
   - Claude will redirect to: `http://localhost:8082/oauth/authorize`
   - Choose your OAuth provider (Google, GitHub, etc.)
   - Grant permissions to Claude
   - You'll be redirected back to Claude with access

3. **Test the Integration**:
   - Claude can now access your Neo4j knowledge graph
   - All 10 MCP tools are available
   - Permissions are enforced based on your OAuth scopes

### MCP Inspector Integration

```bash
# Start the test server
npm run test:descope

# Configure MCP Inspector
npx @modelcontextprotocol/inspector
```

**Inspector Configuration**:
- **URL**: `http://localhost:8081/stream`
- **Transport**: Streamable HTTP
- **Authentication**: 
  - For OAuth: Use Bearer token from OAuth flow
  - For API Key: Add header `X-API-Key: <your-key>`

### Custom Client Integration

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

// OAuth integration
const oauthClient = new Client({
  name: "my-mcp-client",
  version: "1.0.0",
}, {
  capabilities: { tools: {} },
});

const oauthTransport = new StreamableHTTPClientTransport(
  new URL("http://localhost:8081/stream"),
  {
    fetch: async (url, init) => {
      const headers = {
        ...init?.headers,
        'Authorization': `Bearer ${oauthToken}`
      };
      return fetch(url, { ...init, headers });
    }
  }
);

// API Key integration
const apiKeyTransport = new StreamableHTTPClientTransport(
  new URL("http://localhost:8081/stream"),
  {
    fetch: async (url, init) => {
      const headers = {
        ...init?.headers,
        'X-API-Key': apiKey
      };
      return fetch(url, { ...init, headers });
    }
  }
);

await oauthClient.connect(oauthTransport);
const tools = await oauthClient.listTools();
```

## 🏗️ Architecture Overview

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude.ai     │───▶│  OAuth Server   │───▶│    Descope      │
│                 │    │  (Port 8082)    │    │   Platform      │
│ - OAuth Flow    │    │                 │    │                 │
│ - Token Mgmt    │    │ - Authorization │    │ - User Store    │
│ - MCP Client    │    │ - Token Exchange│    │ - OAuth Providers│
└─────────────────┘    │ - User Info     │    │ - Session Mgmt  │
           │            └─────────────────┘    └─────────────────┘
           ▼                        │
┌─────────────────┐                 ▼
│   MCP Server    │    ┌─────────────────┐    ┌─────────────────┐
│  (Port 8081)    │───▶│  FastMCP Auth   │───▶│   Neo4j DB     │
│                 │    │                 │    │                 │
│ - Stream API    │    │ - Session Val   │    │ - Knowledge     │
│ - Tool Exec     │    │ - Scope Check   │    │   Graph         │
│ - Health Check  │    │ - Permissions   │    │ - Full-text     │
└─────────────────┘    └─────────────────┘    │   Search        │
                                              └─────────────────┘
```

## 📊 Monitoring & Management

### Health Monitoring

```bash
# Server health
curl http://localhost:8081/health

# OAuth server health  
curl http://localhost:8082/health

# Detailed health check (admin scope required)
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer <admin-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health_check","arguments":{}}}'
```

### User Management

**Via Descope Console**:
- Access [Descope Console](https://app.descope.com)
- Manage users, roles, and permissions
- Configure OAuth providers
- Monitor authentication events

**Via API** (Management Key required):
```bash
# Create API key
curl -X POST http://localhost:8082/admin/api-keys \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"name":"new-client","permissions":["mcp:read"]}'

# Deactivate API key
curl -X DELETE http://localhost:8082/admin/api-keys/<key-id> \
  -H "Authorization: Bearer <admin-token>"
```

### Session Management

```bash
# Get user info
curl http://localhost:8082/oauth/userinfo \
  -H "Authorization: Bearer <access-token>"

# Refresh token
curl -X POST http://localhost:8082/oauth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "grant_type=refresh_token&refresh_token=<refresh-token>"
```

## 🔒 Security Best Practices

### Environment Security
```bash
# Use strong session secrets
SESSION_SECRET=$(openssl rand -hex 32)

# Rotate Descope management keys regularly
# Monitor key usage in Descope Console

# Use HTTPS in production
NODE_ENV=production
```

### OAuth Security
- **PKCE Required**: All OAuth flows use Proof Key for Code Exchange
- **State Validation**: Prevents CSRF attacks
- **Scope Limitation**: Request minimal necessary scopes
- **Token Expiration**: Automatic token refresh handling

### API Key Security
- **Secure Generation**: Cryptographically secure random keys
- **IP Restrictions**: Optional IP allowlisting
- **Regular Rotation**: Configurable expiration times
- **Audit Logging**: All API key usage is logged

### Network Security
```yaml
# nginx configuration for production
server {
    listen 443 ssl http2;
    server_name your-mcp-server.com;
    
    # SSL configuration
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";
    
    # Rate limiting
    limit_req zone=api burst=10 nodelay;
    
    location / {
        proxy_pass http://localhost:8081;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    location /oauth/ {
        proxy_pass http://localhost:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## 🚨 Troubleshooting

### Common Issues

**1. Descope Project Not Found**
```
Error: Invalid project ID
```
- Verify `DESCOPE_PROJECT_ID` in your .env file
- Check project exists in Descope Console
- Ensure project is active

**2. OAuth Flow Fails**
```
Error: Invalid redirect URI
```
- Verify `OAUTH_REDIRECT_URI` matches Descope configuration
- Check OAuth provider settings in Descope Console
- Ensure ports are accessible

**3. API Key Creation Fails**
```
Error: Management key required
```
- Add `DESCOPE_MANAGEMENT_KEY` to your .env file
- Verify key has proper permissions in Descope Console
- Check key is not expired

**4. Session Validation Errors**
```
Error: Session validation failed
```
- Check token expiration
- Verify token format (Bearer <token>)
- Ensure Descope project configuration is correct

### Debug Mode

```bash
# Enable debug logging
NODE_ENV=development npm run dev:descope

# Check OAuth flow
curl -v http://localhost:8082/.well-known/oauth-authorization-server

# Validate JWT token manually
node -e "
const jwt = require('jsonwebtoken');
const token = 'your-jwt-token';
console.log(jwt.decode(token, { complete: true }));
"
```

### Support Resources

- **Descope Documentation**: https://docs.descope.com/
- **FastMCP Documentation**: https://github.com/punkpeye/fastmcp
- **MCP Specification**: https://spec.modelcontextprotocol.io/
- **Claude.ai Integration Guide**: https://docs.anthropic.com/claude/docs/mcp

## 🎯 Production Deployment

### Docker Configuration

```dockerfile
# Use the base image with Descope support
FROM node:20-alpine

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY dist/ ./dist/
COPY .env.production ./.env

EXPOSE 8081 8082

CMD ["node", "dist/index-descope.js"]
```

### Environment Variables for Production

```env
NODE_ENV=production
DESCOPE_PROJECT_ID=prod-project-id
DESCOPE_MANAGEMENT_KEY=prod-management-key
NEO4J_URI=bolt://prod-neo4j:7687
SESSION_SECRET=super-secure-session-secret
OAUTH_REDIRECT_URI=https://your-domain.com/oauth/callback
```

### Health Check Configuration

```yaml
# docker-compose.yml
services:
  neo4j-mcp:
    image: your-mcp-server:latest
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

The Descope integration provides enterprise-grade authentication that works seamlessly with Claude.ai while maintaining the flexibility to support various MCP clients and authentication methods. 🎉