import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import neo4j, { Driver } from 'neo4j-driver';
import crypto from 'crypto';
import { IncomingMessage } from 'http';

export interface ApiKeyAuthSession {
  authenticated: boolean;
  apiKey: string;
  permissions: string[];
  timestamp: number;
}

export class Neo4jMCPServerWithApiKey {
  private server!: FastMCP;
  private driver!: Driver;
  private validApiKeys = new Map<string, { permissions: string[] }>();

  constructor() {
    // Initialize with a default API key for testing
    const defaultApiKey = process.env.DEFAULT_API_KEY || this.generateApiKey();
    this.validApiKeys.set(defaultApiKey, {
      permissions: ['mcp:read', 'mcp:write', 'mcp:admin']
    });
    
    console.log('🔑 Default API Key:', defaultApiKey);
    console.log('💡 Use this key for testing: X-API-Key:', defaultApiKey);
  }

  async initialize(): Promise<void> {
    // Initialize Neo4j driver
    this.driver = neo4j.driver(
      process.env.NEO4J_URI!,
      neo4j.auth.basic(process.env.NEO4J_USERNAME!, process.env.NEO4J_PASSWORD!)
    );

    // Verify Neo4j connection
    await this.driver.verifyConnectivity();
    console.log('✅ Connected to Neo4j');

    // Setup knowledge graph schema
    await this.setupSchema();

    // Initialize FastMCP server with API key authentication
    this.server = new FastMCP('Neo4j Knowledge Graph Server', {
      version: '1.0.0',
      auth: async (request: IncomingMessage) => {
        const apiKey = request.headers['x-api-key'] as string;
        
        if (!apiKey) {
          throw new Response('API key required. Provide X-API-Key header', {
            status: 401,
            statusText: 'Unauthorized'
          });
        }
        
        const keyInfo = this.validApiKeys.get(apiKey);
        if (!keyInfo) {
          throw new Response('Invalid API key', {
            status: 401,
            statusText: 'Unauthorized'
          });
        }
        
        return {
          authenticated: true,
          apiKey,
          permissions: keyInfo.permissions,
          timestamp: Date.now()
        } as ApiKeyAuthSession & Record<string, unknown>;
      }
    });

    this.setupTools();
    console.log('✅ Neo4j MCP Server with API Key authentication initialized');
  }

  private generateApiKey(): string {
    return 'mcp_' + crypto.randomBytes(32).toString('hex');
  }

  addApiKey(permissions: string[] = ['mcp:read']): string {
    const apiKey = this.generateApiKey();
    this.validApiKeys.set(apiKey, { permissions });
    return apiKey;
  }

  removeApiKey(apiKey: string): boolean {
    return this.validApiKeys.delete(apiKey);
  }

  private hasPermission(session: ApiKeyAuthSession, permission: string): boolean {
    return session.permissions.includes(permission) || session.permissions.includes('mcp:admin');
  }

  private requirePermission(session: ApiKeyAuthSession, permission: string): void {
    if (!this.hasPermission(session, permission)) {
      throw new Error(`Insufficient permissions. Required: ${permission}`);
    }
  }

  private async setupSchema(): Promise<void> {
    const session = this.driver.session();
    try {
      // Create indexes for better performance
      await session.run('CREATE INDEX entity_name_idx IF NOT EXISTS FOR (n:Entity) ON (n.name)');
      await session.run('CREATE INDEX entity_type_idx IF NOT EXISTS FOR (n:Entity) ON (n.type)');
      
      // Create full-text search index
      await session.run(`
        CALL db.index.fulltext.createNodeIndex(
          'entity_search', 
          ['Entity', 'Observation'], 
          ['name', 'type', 'content', 'summary']
        ) IF NOT EXISTS
      `);
      
      console.log('✅ Neo4j schema setup complete');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Schema setup error:', error);
      }
    } finally {
      await session.close();
    }
  }

  private setupTools(): void {
    // Similar tools as in the Descope version, but using ApiKeyAuthSession
    // For brevity, including just a few key tools here
    
    this.server.tool('create_entities', {
      description: 'Create entities in the knowledge graph',
      parameters: z.object({
        entities: z.array(z.object({
          name: z.string().describe('Entity name'),
          type: z.string().describe('Entity type/category'),
          observations: z.array(z.string()).optional().describe('Initial observations')
        }))
      }),
      handler: async (params, session) => {
        this.requirePermission(session as ApiKeyAuthSession, 'mcp:write');
        
        const neo4jSession = this.driver.session();
        try {
          const results = [];
          
          for (const entity of params.entities) {
            const result = await neo4jSession.run(
              `
              MERGE (e:Entity {name: $name})
              SET e.type = $type, e.created_at = datetime(), e.updated_at = datetime()
              RETURN e
              `,
              { name: entity.name, type: entity.type }
            );
            
            // Add initial observations if provided
            if (entity.observations && entity.observations.length > 0) {
              for (const obs of entity.observations) {
                await neo4jSession.run(
                  `
                  MATCH (e:Entity {name: $entityName})
                  CREATE (o:Observation {content: $content, created_at: datetime()})
                  CREATE (e)-[:HAS_OBSERVATION]->(o)
                  `,
                  { entityName: entity.name, content: obs }
                );
              }
            }
            
            results.push({ name: entity.name, type: entity.type, created: true });
          }
          
          return { success: true, entities_created: results };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    this.server.tool('read_graph', {
      description: 'Read the knowledge graph structure',
      parameters: z.object({
        limit: z.number().default(100).describe('Maximum number of entities to return'),
        entity_type: z.string().optional().describe('Filter by entity type')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as ApiKeyAuthSession, 'mcp:read');
        
        const neo4jSession = this.driver.session();
        try {
          let query = `
            MATCH (e:Entity)
            ${params.entity_type ? 'WHERE e.type = $entityType' : ''}
            OPTIONAL MATCH (e)-[:HAS_OBSERVATION]->(o:Observation)
            OPTIONAL MATCH (e)-[r]-(connected:Entity)
            WITH e, collect(DISTINCT o.content) as observations, 
                 collect(DISTINCT {type: type(r), entity: connected.name, direction: 
                   CASE WHEN startNode(r) = e THEN 'outgoing' ELSE 'incoming' END}) as relations
            RETURN e.name as name, e.type as type, observations, relations
            LIMIT $limit
          `;
          
          const result = await neo4jSession.run(query, {
            limit: params.limit,
            entityType: params.entity_type
          });
          
          const entities = result.records.map(record => ({
            name: record.get('name'),
            type: record.get('type'),
            observations: record.get('observations'),
            relations: record.get('relations')
          }));
          
          return { success: true, entities, count: entities.length };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    this.server.tool('health_check', {
      description: 'Check server and database health',
      parameters: z.object({}),
      handler: async (params, session) => {
        this.requirePermission(session as ApiKeyAuthSession, 'mcp:admin');
        
        const neo4jSession = this.driver.session();
        try {
          // Test Neo4j connectivity
          await neo4jSession.run('RETURN 1');
          
          // Get database stats
          const statsResult = await neo4jSession.run(`
            MATCH (n:Entity) 
            OPTIONAL MATCH (n)-[:HAS_OBSERVATION]->(o:Observation)
            RETURN count(DISTINCT n) as entities, count(DISTINCT o) as observations
          `);
          
          const stats = statsResult.records[0];
          
          return {
            success: true,
            status: 'healthy',
            database: 'connected',
            stats: {
              entities: stats.get('entities').toNumber(),
              observations: stats.get('observations').toNumber()
            },
            timestamp: new Date().toISOString(),
            authentication: 'api_key',
            session_info: {
              api_key: session.apiKey.substring(0, 10) + '...',
              permissions: session.permissions
            }
          };
        } catch (error: any) {
          return {
            success: false,
            status: 'unhealthy',
            database: 'disconnected',
            error: error.message,
            timestamp: new Date().toISOString()
          };
        } finally {
          await neo4jSession.close();
        }
      }
    });
  }

  getServer(): FastMCP {
    return this.server;
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }
}