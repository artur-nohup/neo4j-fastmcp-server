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

## 🎯 Perfect for Claude.ai Integration

This server is specifically designed to work with Claude.ai's custom integrations feature:

1. **OAuth 2.1 Compliance**: Full PKCE support for secure authentication
2. **Remote MCP Protocol**: HTTP streaming transport for cloud deployment
3. **Scope-based Permissions**: Fine-grained access control
4. **Session Management**: Automatic token handling and refresh
5. **Production Security**: Enterprise-grade authentication via Descope

## 🚀 Quick Start

### 1. Clone and Setup

```bash
git clone https://github.com/artur-nohup/neo4j-fastmcp-server.git
cd neo4j-fastmcp-server
npm install
cp .env.example .env
```

### 2. Configure Environment

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

### 3. Start Development Server

```bash
# Start development server
npm run dev

# Or run tests
npm run test

# The server starts on:
# - MCP Server: http://localhost:8081/stream
# - OAuth Server: http://localhost:8082
```

### 4. Claude.ai Integration

1. In Claude.ai, go to **Settings > Integrations**
2. Click **Add Integration**
3. Enter MCP Server URL: `http://localhost:8081/stream`
4. Complete the OAuth flow when prompted
5. Start using your Neo4j knowledge graph in Claude!

## 🔐 Authentication Methods

### OAuth 2.1 Flow (for Claude.ai)

Perfect for interactive clients like Claude.ai with full PKCE support.

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

## 🎛️ Available Tools

### 10 MCP Tools with Permission-based Access

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

### Permission Scopes

- `mcp:read` - Read operations and graph queries
- `mcp:write` - Create, update, and delete operations  
- `mcp:admin` - Administrative operations and health checks

## 🧪 Testing & Development

### MCP Inspector Testing

```bash
# Start test server
npm run test

# In another terminal, start MCP Inspector
npx @modelcontextprotocol/inspector

# Configure connection:
# URL: http://localhost:8081/stream
# Auth: Use OAuth flow or API key
```

### cURL Testing

```bash
# Test with OAuth token
curl -X POST http://localhost:8081/stream \
  -H "Authorization: Bearer <oauth-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# Test with API key  
curl -X POST http://localhost:8081/stream \
  -H "X-API-Key: <api-key>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

## 🐳 Docker Deployment

### Using Pre-built Image

```bash
docker pull arturrenzenbrink/neo4j-fastmcp-server:latest

docker run -d \
  --name neo4j-mcp-server \
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

```bash
# Use the included docker-compose.yml
docker compose up -d
```

## 📚 Documentation

- **[Integration Guide](docs/INTEGRATION_GUIDE.md)** - Complete Descope setup and configuration
- **[API Reference](docs/API_REFERENCE.md)** - Full API documentation with examples
- **[Testing Guide](docs/TESTING_GUIDE.md)** - Comprehensive testing instructions

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

## 🎯 Use Cases

### Claude.ai Knowledge Graph
Add custom MCP integration → Complete OAuth flow → Claude gains persistent memory

### Enterprise Knowledge Management
Deploy with company OAuth → Teams authenticate with existing credentials → Build shared knowledge graphs

### AI Agent Memory
Agents authenticate via API keys → Store learned information → Search and retrieve context across interactions

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add tests and documentation
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🆘 Support

- **Documentation**: Comprehensive guides in the [docs/](docs/) folder
- **Issues**: Report bugs via [GitHub Issues](https://github.com/artur-nohup/neo4j-fastmcp-server/issues)
- **Descope Support**: [Descope Documentation](https://docs.descope.com/)
- **MCP Specification**: [Model Context Protocol](https://spec.modelcontextprotocol.io/)

---

**Ready to enhance Claude.ai with your own knowledge graph?** 🚀

The Neo4j FastMCP Server with Descope provides enterprise-grade authentication that works seamlessly with Claude.ai while maintaining the flexibility to support any MCP client. Perfect for building persistent AI memory, knowledge management systems, and contextual AI applications.