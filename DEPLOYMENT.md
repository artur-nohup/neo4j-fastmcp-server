# Deployment Guide

## Quick Start

1. **Clone and Build**
   ```bash
   git clone <repository>
   cd neo4j-fastmcp-server
   npm install
   npm run build
   ```

2. **Environment Setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Test Neo4j Connection**
   ```bash
   npm run test:connection
   ```

4. **Docker Deployment**
   ```bash
   # Build and run with Docker Compose
   docker-compose up -d
   
   # Check logs
   docker-compose logs -f neo4j-mcp-server
   
   # Stop services
   docker-compose down
   ```

## Verification Steps

### 1. Health Check
```bash
curl http://localhost:8080/health
```

### 2. MCP Tools List (with valid JWT token)
```bash
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

### 3. Knowledge Graph Operations

**Create Entity:**
```bash
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "tools/call",
    "params": {
      "name": "create_entities",
      "arguments": {
        "entities": [{
          "name": "TestEntity",
          "type": "TestType",
          "observations": ["Test observation"]
        }]
      }
    }
  }'
```

**Search Nodes:**
```bash
curl -X POST http://localhost:8080/stream \
  -H "Authorization: Bearer <your-jwt-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "tools/call",
    "params": {
      "name": "search_nodes",
      "arguments": {
        "query": "TestEntity"
      }
    }
  }'
```

## Production Deployment

### 1. SSL Configuration
- Update `nginx.conf` with your SSL certificates
- Configure proper domain names
- Enable HTTPS redirects

### 2. OAuth Provider Setup
- Configure your OAuth 2.1 provider
- Update `.env` with proper OAuth endpoints
- Generate secure JWT secrets

### 3. Monitoring
- Set up log aggregation
- Configure health check monitoring
- Set up alerts for Neo4j connectivity

### 4. Scaling
- Use Docker Swarm or Kubernetes for orchestration
- Configure load balancing for multiple instances
- Set up Neo4j clustering if needed

## Authentication Flow

1. **Get Authorization URL**
   ```javascript
   const authUrl = oauthProvider.generateAuthUrl('your-state');
   // Redirect user to authUrl
   ```

2. **Exchange Code for Token**
   ```javascript
   const tokenResponse = await oauthProvider.exchangeCodeForToken(code);
   const userInfo = await oauthProvider.getUserInfo(tokenResponse.access_token);
   const jwt = oauthProvider.generateJWT(userInfo, ['read', 'write']);
   ```

3. **Use JWT for MCP Calls**
   ```javascript
   const transport = new StreamableHTTPClientTransport(
     new URL('http://localhost:8080/stream'),
     {
       headers: { 'Authorization': `Bearer ${jwt}` }
     }
   );
   ```

## Troubleshooting

### Common Issues

1. **Neo4j Connection Failed**
   - Check `NEO4J_URI`, `NEO4J_USERNAME`, `NEO4J_PASSWORD`
   - Verify Neo4j is running and accessible
   - Check firewall rules

2. **Authentication Errors**
   - Verify JWT secret is consistent
   - Check OAuth provider configuration
   - Validate token expiration

3. **Docker Issues**
   - Check Docker Compose logs: `docker-compose logs`
   - Verify environment variables in docker-compose.yml
   - Ensure ports are not conflicting

### Debug Mode

Enable debug logging:
```bash
NODE_ENV=development npm run dev
```

View detailed logs:
```bash
docker-compose logs -f neo4j-mcp-server | grep -E "(ERROR|WARN|INFO)"
```