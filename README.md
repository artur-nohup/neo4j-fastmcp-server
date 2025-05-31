# Neo4j FastMCP Server

A remote Model Context Protocol (MCP) server built with FastMCP TypeScript framework, providing Neo4j knowledge graph memory capabilities with OAuth 2.1 authentication.

[![Docker Image](https://img.shields.io/docker/v/arturrenzenbrink/neo4j-fastmcp-server?label=Docker%20Hub)](https://hub.docker.com/r/arturrenzenbrink/neo4j-fastmcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- 🚀 **Remote MCP Server**: HTTP streaming support for remote access
- 🔐 **OAuth 2.1 Authentication**: Secure token-based authentication with JWT
- 🧠 **Neo4j Knowledge Graph**: Persistent memory storage in Neo4j
- 📊 **Full-text Search**: Search across entity names, types, and observations
- 🛡️ **Scope-based Authorization**: Fine-grained access control (read/write/admin)
- 🐳 **Docker Support**: Complete containerization with Docker Compose
- 🔄 **Session Management**: Per-client session handling
- 📈 **Health Monitoring**: Built-in health checks and monitoring

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose
- Access to a Neo4j instance

### 1. Environment Setup

Copy the environment template and configure:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Neo4j Configuration
NEO4J_URI=bolt://localhost:7687
NEO4J_USERNAME=neo4j
NEO4J_PASSWORD=your-password
NEO4J_DATABASE=neo4j

# OAuth Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
OAUTH_CLIENT_ID=your-oauth-client-id
OAUTH_CLIENT_SECRET=your-oauth-client-secret
OAUTH_REDIRECT_URI=http://localhost:8080/auth/callback
```

### 2. Docker Deployment

**Using the pre-built image:**

```bash
# Pull and run the image
docker pull arturrenzenbrink/neo4j-fastmcp-server:latest

docker run -d \
  --name neo4j-mcp-server \
  -p 8080:8080 \
  -e NEO4J_URI="bolt://your-neo4j:7687" \
  -e NEO4J_USERNAME="neo4j" \
  -e NEO4J_PASSWORD="your-password" \
  -e JWT_SECRET="your-jwt-secret" \
  -e OAUTH_CLIENT_ID="your-client-id" \
  -e OAUTH_CLIENT_SECRET="your-client-secret" \
  arturrenzenbrink/neo4j-fastmcp-server:latest
```

**Using Docker Compose:**

```bash
# Build and start the services
docker-compose up -d

# View logs
docker-compose logs -f neo4j-mcp-server

# Stop services
docker-compose down
```

### 3. Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Start development server
npm run dev

# Start production server
npm start
```

## Authentication

### OAuth 2.1 Flow

1. **Authorization**: Client redirects to OAuth provider with appropriate scopes
2. **Token Exchange**: Authorization code exchanged for access token
3. **JWT Generation**: Server generates internal JWT with user info and scopes
4. **API Access**: Client uses JWT Bearer token for MCP API calls

### Scopes

- `read`: Access to read operations (search, find, read graph)
- `write`: Access to write operations (create, update, delete)
- `admin`: Administrative access (health checks, server management)

### Example Client Authentication

```typescript
// Include JWT token in MCP client headers
const transport = new StreamableHTTPClientTransport(
  new URL('http://localhost:8080/stream'),
  {
    headers: {
      'Authorization': 'Bearer your-jwt-token-here'
    }
  }
);
```

## API Tools

### Knowledge Graph Operations

#### Create Entities
```json
{
  "tool": "create_entities",
  "arguments": {
    "entities": [
      {
        "name": "Claude",
        "type": "Person",
        "observations": ["AI assistant", "Helpful", "Created by Anthropic"]
      }
    ]
  }
}
```

#### Create Relations
```json
{
  "tool": "create_relations",
  "arguments": {
    "relations": [
      {
        "source": "Claude",
        "target": "Anthropic",
        "relationType": "CREATED_BY"
      }
    ]
  }
}
```

#### Search Nodes
```json
{
  "tool": "search_nodes",
  "arguments": {
    "query": "AI assistant"
  }
}
```

#### Read Entire Graph
```json
{
  "tool": "read_graph",
  "arguments": {}
}
```

### Administrative Operations

#### Health Check (Admin Only)
```json
{
  "tool": "health_check",
  "arguments": {}
}
```

## Testing

For comprehensive testing instructions, see the included guides:

- `COMPLETE_TESTING_GUIDE.md` - Complete testing options
- `DOCKER_MCP_INSPECTOR_GUIDE.md` - MCP Inspector testing

### Quick Test

```bash
# Test with no-auth server (easiest)
npx tsx src/test-direct.ts

# In another terminal
npx @modelcontextprotocol/inspector http://localhost:8081/stream
```

## Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   MCP Client    │───▶│  FastMCP Server │───▶│   Neo4j DB     │
│                 │    │                 │    │                 │
│ - Claude        │    │ - OAuth Auth    │    │ - Knowledge     │
│ - VS Code       │    │ - Session Mgmt  │    │   Graph         │
│ - Custom Apps   │    │ - API Tools     │    │ - Full-text     │
└─────────────────┘    └─────────────────┘    │   Search        │
                                              └─────────────────┘
           │                        │
           ▼                        ▼
┌─────────────────┐    ┌─────────────────┐
│ OAuth Provider  │    │ Nginx Proxy     │
│                 │    │                 │
│ - Token Issue   │    │ - Load Balance  │
│ - User Info     │    │ - Rate Limiting │
│ - Scope Mgmt    │    │ - SSL Term      │
└─────────────────┘    └─────────────────┘
```

## Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `NEO4J_URI` | Neo4j connection URI | ✅ | - |
| `NEO4J_USERNAME` | Neo4j username | ✅ | - |
| `NEO4J_PASSWORD` | Neo4j password | ✅ | - |
| `NEO4J_DATABASE` | Neo4j database name | ❌ | `neo4j` |
| `JWT_SECRET` | JWT signing secret | ✅ | - |
| `OAUTH_CLIENT_ID` | OAuth client ID | ✅ | - |
| `OAUTH_CLIENT_SECRET` | OAuth client secret | ✅ | - |
| `OAUTH_REDIRECT_URI` | OAuth redirect URI | ✅ | - |
| `SERVER_PORT` | Server port | ❌ | `8080` |
| `MCP_SERVER_NAME` | MCP server name | ❌ | `neo4j-memory-mcp` |

## Security

### Best Practices

1. **JWT Secret**: Use a strong, random JWT secret (256+ bits)
2. **OAuth Configuration**: Ensure OAuth provider is properly configured
3. **HTTPS**: Use HTTPS in production (configure nginx SSL)
4. **Rate Limiting**: Nginx includes rate limiting configuration
5. **Scope Validation**: All operations check required scopes
6. **Input Validation**: All inputs validated with Zod schemas

### Security Headers

The nginx proxy adds security headers:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`

## Monitoring

### Health Checks

- **Docker Health Check**: Built-in container health monitoring
- **API Health Endpoint**: `/health` endpoint for external monitoring
- **Admin Tool**: `health_check` tool for detailed status

### Logs

```bash
# View server logs
docker-compose logs -f neo4j-mcp-server

# View nginx logs
docker-compose logs -f nginx
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

### Linting

```bash
npm run lint
```

## Production Deployment

### 1. SSL Configuration

Uncomment and configure HTTPS section in `nginx.conf`:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.com;
    
    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;
    # ... additional SSL config
}
```

### 2. Environment Hardening

- Change all default secrets and passwords
- Configure proper OAuth provider endpoints
- Set up monitoring and alerting
- Configure backup strategies for Neo4j

### 3. Scaling

The server can be scaled horizontally using Docker Swarm or Kubernetes. Each instance maintains its own session state.

## Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**
   - Verify Neo4j URI and credentials
   - Check network connectivity
   - Ensure Neo4j is running and accessible

2. **Authentication Errors**
   - Verify JWT secret configuration
   - Check OAuth provider configuration
   - Validate token format and expiration

3. **Port Conflicts**
   - Change `SERVER_PORT` if 8080 is in use
   - Update docker-compose port mappings

### Debug Mode

Enable debug logging:

```bash
NODE_ENV=development npm run dev
```

## License

MIT License - see LICENSE file for details.

## Support

For issues and questions:
- Check the troubleshooting section
- Review logs for error details
- Ensure all prerequisites are met