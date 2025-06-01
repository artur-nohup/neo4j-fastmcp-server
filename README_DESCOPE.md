# Neo4j FastMCP Server with Descope Authentication

A production-ready remote Model Context Protocol (MCP) server with enterprise-grade authentication powered by Descope. Fully compatible with Claude.ai and other MCP clients.

[![Docker Image](https://img.shields.io/docker/v/arturrenzenbrink/neo4j-fastmcp-server?label=Docker%20Hub)](https://hub.docker.com/r/arturrenzenbrink/neo4j-fastmcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## 🚀 Features

- **🔐 Enterprise Authentication**: OAuth 2.1 with PKCE + API key authentication via Descope
- **🎯 Claude.ai Ready**: Full OAuth flow integration for Claude's custom integrations
- **🧠 Neo4j Knowledge Graph**: Persistent memory storage with full-text search
- **🛡️ Fine-grained Permissions**: MCP-specific scopes and role-based access control
- **📊 Session Management**: Automatic token refresh and session validation
- **🐳 Production Ready**: Docker support with health checks and monitoring
- **⚡ FastMCP Framework**: Built on the latest FastMCP TypeScript framework
- **🔄 Dual Authentication**: Seamlessly supports both OAuth and API key authentication

## 🎯 Perfect for Claude.ai Integration

This server is specifically designed to work with Claude.ai's custom integrations feature:

1. **OAuth 2.1 Compliance**: Full PKCE support for secure authentication
2. **Remote MCP Protocol**: HTTP streaming transport for cloud deployment
3. **Scope-based Permissions**: Fine-grained access control
4. **Session Management**: Automatic token handling and refresh
5. **Production Security**: Enterprise-grade authentication via Descope

## 🚀 Quick Start

### 1. Descope Setup (Required)

1. Create account at [Descope Console](https://app.descope.com)
2. Create a new project for your MCP server
3. Configure OAuth providers (Google, GitHub, etc.)
4. Copy your Project ID and Management Key

### 2. Environment Configuration

```bash
git clone https://github.com/artur-nohup/neo4j-fastmcp-server.git
cd neo4j-fastmcp-server
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Descope Configuration (REQUIRED)
DESCOPE_PROJECT_ID=your-descope-project-id
DESCOPE_MANAGEMENT_KEY=your-management-key

# Neo4j Configuration (REQUIRED)
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password

# OAuth Configuration (REQUIRED for Claude.ai)
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

# Start development server with Descope
npm run test:descope

# The server starts on:
# - MCP Server: http://localhost:8081/stream
# - OAuth Server: http://localhost:8082
```

### 4. Claude.ai Integration

1. In Claude.ai, go to **Settings > Integrations**
2. Click **Add Integration**
3. Enter MCP Server URL: `http://localhost:8081/stream`
4. Complete the OAuth flow when prompted
5. Grant permissions to Claude
6. Start using your Neo4j knowledge graph in Claude!

## 🔐 Authentication Methods

### OAuth 2.1 Flow (for Claude.ai)

Perfect for interactive clients like Claude.ai:

```
1. Authorization Request → OAuth Provider Login
2. Authorization Code → Token Exchange  
3. Access Token → MCP API Access
4. Refresh Token → Automatic Token Renewal
```

**Endpoints**:
- Authorization: `http://localhost:8082/oauth/authorize`
- Token Exchange: `http://localhost:8082/oauth/token`
- User Info: `http://localhost:8082/oauth/userinfo`

### API Key Authentication

Ideal for programmatic access and automation:

```bash
# Create API key (admin access required)
curl -X POST http://localhost:8082/admin/api-keys \
  -H "Authorization: Bearer <oauth-token>" \
  -d '{"name":"my-app","permissions":["mcp:read","mcp:write"]}'

# Use API key
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: <your-api-key>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🎛️ Available Tools & Scopes

### MCP Tools (10 total)

1. **create_entities** - Create knowledge graph entities (requires `mcp:write`)
2. **create_relations** - Create relationships between entities (requires `mcp:write`)
3. **add_observations** - Add observations to entities (requires `mcp:write`)
4. **delete_entities** - Remove entities and relations (requires `mcp:write`)
5. **delete_observations** - Remove specific observations (requires `mcp:write`)
6. **delete_relations** - Remove relationships (requires `mcp:write`)
7. **read_graph** - Read entire knowledge graph (requires `mcp:read`)
8. **search_nodes** - Full-text search across the graph (requires `mcp:read`)
9. **find_nodes** - Find specific entities by name (requires `mcp:read`)
10. **health_check** - Server and Neo4j health status (requires `mcp:admin`)

### Permission Scopes

- `mcp:read` - Read operations and graph queries
- `mcp:write` - Create, update, and delete operations  
- `mcp:admin` - Administrative operations and health checks
- `mcp:tools:list` - List available tools
- `mcp:tools:call` - Execute MCP tools

## 🧪 Testing & Development

### MCP Inspector Testing

```bash
# Start test server
npm run test:descope

# In another terminal
npx @modelcontextprotocol/inspector

# Configure connection:
# URL: http://localhost:8081/stream
# Auth: Use OAuth flow or API key
```

### cURL Testing

```bash
# OAuth flow test
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer <oauth-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# API key test  
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Custom Client Integration

```typescript
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
```

## 🐳 Docker Deployment

### Using Pre-built Image

```bash
docker pull arturrenzenbrink/neo4j-fastmcp-server:latest

docker run -d \
  --name neo4j-mcp-descope \
  -p 8081:8081 \
  -p 8082:8082 \
  -e DESCOPE_PROJECT_ID="your-project-id" \
  -e DESCOPE_MANAGEMENT_KEY="your-management-key" \
  -e NEO4J_URI="bolt://your-neo4j:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="your-password" \
  -e SESSION_SECRET="your-session-secret" \
  arturrenzenbrink/neo4j-fastmcp-server:latest
```

### Docker Compose

```yaml
version: '3.8'
services:
  neo4j-mcp:
    image: arturrenzenbrink/neo4j-fastmcp-server:latest
    ports:
      - "8081:8081"  # MCP Server
      - "8082:8082"  # OAuth Server
    environment:
      - DESCOPE_PROJECT_ID=${DESCOPE_PROJECT_ID}
      - DESCOPE_MANAGEMENT_KEY=${DESCOPE_MANAGEMENT_KEY}
      - NEO4J_URI=${NEO4J_URI}
      - NEO4J_USERNAME=${NEO4J_USERNAME}
      - NEO4J_PASSWORD=${NEO4J_PASSWORD}
      - SESSION_SECRET=${SESSION_SECRET}
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8081/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Claude.ai     │───▶│  OAuth Server   │───▶│    Descope      │
│                 │    │  (Port 8082)    │    │   Platform      │
│ - Custom MCP    │    │                 │    │                 │
│ - OAuth Client  │    │ - Authorization │    │ - User Identity │
│ - Token Mgmt    │    │ - Token Exchange│    │ - OAuth Providers│
└─────────────────┘    │ - PKCE Support  │    │ - Session Mgmt  │
           │            └─────────────────┘    └─────────────────┘
           ▼
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Server    │───▶│   FastMCP Auth  │───▶│   Neo4j DB     │
│  (Port 8081)    │    │                 │    │                 │
│                 │    │ - Session Val   │    │ - Knowledge     │
│ - Stream API    │    │ - Scope Check   │    │   Graph         │
│ - Tool Execution│    │ - Permissions   │    │ - Full-text     │
│ - Health Checks │    │ - Audit Logs    │    │   Search        │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔒 Security Features

### OAuth 2.1 Security
- **PKCE (Proof Key for Code Exchange)**: Prevents authorization code interception
- **State Validation**: Protects against CSRF attacks
- **Secure Token Storage**: HTTPOnly cookies and secure headers
- **Automatic Token Refresh**: Seamless session management

### API Key Security
- **Cryptographically Secure**: Generated using secure random methods
- **Scope Limitations**: Fine-grained permission control
- **IP Restrictions**: Optional IP allowlisting
- **Expiration Management**: Configurable key lifetimes
- **Audit Logging**: Complete access logging

### Production Security
- **Environment-based Secrets**: No hardcoded credentials
- **HTTPS Enforcement**: SSL/TLS in production
- **Rate Limiting**: DDoS protection
- **Input Validation**: Zod schema validation
- **Error Handling**: Secure error responses

## 📊 Monitoring & Management

### Health Monitoring

```bash
# Quick health check
curl http://localhost:8081/health

# Detailed system status (admin required)
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer <admin-token>" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"health_check"}}'
```

### User Management

- **Descope Console**: Manage users, roles, and OAuth providers
- **API Key Management**: Create and revoke programmatic access
- **Session Monitoring**: Track active sessions and usage
- **Audit Logging**: Complete authentication and authorization logs

## 📚 Documentation

- **[Complete Integration Guide](DESCOPE_INTEGRATION_GUIDE.md)** - Detailed setup and configuration
- **[FastMCP Best Practices](FASTMCP_BEST_PRACTICES.md)** - Framework implementation details
- **[API Documentation](API_REFERENCE.md)** - Complete API reference
- **[Testing Guide](TESTING_GUIDE.md)** - Comprehensive testing instructions

## 🎯 Use Cases

### Claude.ai Knowledge Graph

```
1. Add custom MCP integration in Claude settings
2. Complete OAuth flow to authenticate
3. Claude can now:
   - Store conversation context in Neo4j
   - Search previous interactions
   - Build knowledge relationships
   - Maintain persistent memory
```

### Enterprise Knowledge Management

```
1. Deploy server with company OAuth (Google Workspace, Azure AD)
2. Teams authenticate with existing credentials  
3. Build and share knowledge graphs
4. Fine-grained access control by department/role
```

### AI Agent Memory

```
1. AI agents authenticate via API keys
2. Store learned information persistently
3. Search and retrieve relevant context
4. Build knowledge over multiple interactions
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Comprehensive guides and examples included
- **Issues**: Report bugs via GitHub Issues
- **Descope Support**: [Descope Documentation](https://docs.descope.com/)
- **MCP Specification**: [Model Context Protocol](https://spec.modelcontextprotocol.io/)

---

**Ready to enhance Claude.ai with your own knowledge graph?** 🚀

The Neo4j FastMCP Server with Descope provides enterprise-grade authentication that works seamlessly with Claude.ai while maintaining the flexibility to support any MCP client. Perfect for building persistent AI memory, knowledge management systems, and contextual AI applications.