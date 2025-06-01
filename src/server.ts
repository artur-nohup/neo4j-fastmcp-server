import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import neo4j, { Driver } from 'neo4j-driver';
import { DescopeAuthProvider } from './auth/descope-provider.js';
import { OAuthServer } from './auth/oauth-server.js';
import { DescopeSession, MCPScopes, DescopeConfig } from './types/descope.js';
import { IncomingMessage } from 'http';

export class Neo4jMCPServer {
  private server!: FastMCP;
  private driver!: Driver;
  private descopeProvider: DescopeAuthProvider;
  private oauthServer: OAuthServer;

  constructor() {
    // Initialize Descope provider
    const descopeConfig: DescopeConfig = {
      projectId: process.env.DESCOPE_PROJECT_ID!,
      managementKey: process.env.DESCOPE_MANAGEMENT_KEY!,
      baseUrl: process.env.DESCOPE_BASE_URL
    };

    this.descopeProvider = new DescopeAuthProvider(descopeConfig);
    this.oauthServer = new OAuthServer(this.descopeProvider);
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

    // Initialize FastMCP server with authentication
    this.server = new FastMCP('Neo4j Knowledge Graph Server', {
      version: '1.0.0',
      auth: async (request: IncomingMessage) => {
        try {
          const session = await this.descopeProvider.authenticateRequest(request);
          
          // Return session that extends AuthSession with Record<string, unknown>
          return {
            ...session,
            // Ensure it satisfies Record<string, unknown>
          } as DescopeSession & Record<string, unknown>;
        } catch (error) {
          console.error('Authentication failed:', error);
          throw error;
        }
      }
    });

    this.setupTools();
    console.log('✅ Neo4j MCP Server with Descope authentication initialized');
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
    // 1. Create entities tool
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
        this.requirePermission(session as DescopeSession, MCPScopes.WRITE);
        
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

    // 2. Create relations tool
    this.server.tool('create_relations', {
      description: 'Create relationships between entities',
      parameters: z.object({
        relations: z.array(z.object({
          from: z.string().describe('Source entity name'),
          to: z.string().describe('Target entity name'),
          relation: z.string().describe('Relationship type'),
          properties: z.record(z.any()).optional().describe('Relationship properties')
        }))
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.WRITE);
        
        const neo4jSession = this.driver.session();
        try {
          const results = [];
          
          for (const rel of params.relations) {
            const query = `
              MATCH (from:Entity {name: $from})
              MATCH (to:Entity {name: $to})
              CREATE (from)-[r:${rel.relation.toUpperCase().replace(/\s+/g, '_')} $properties]->(to)
              SET r.created_at = datetime()
              RETURN from.name as from_name, to.name as to_name, type(r) as relation_type
            `;
            
            const result = await neo4jSession.run(query, {
              from: rel.from,
              to: rel.to,
              properties: rel.properties || {}
            });
            
            if (result.records.length > 0) {
              const record = result.records[0];
              results.push({
                from: record.get('from_name'),
                to: record.get('to_name'),
                relation: record.get('relation_type'),
                created: true
              });
            }
          }
          
          return { success: true, relations_created: results };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 3. Add observations tool
    this.server.tool('add_observations', {
      description: 'Add observations to entities',
      parameters: z.object({
        entity_name: z.string().describe('Entity to add observations to'),
        observations: z.array(z.string()).describe('List of observations')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.WRITE);
        
        const neo4jSession = this.driver.session();
        try {
          const observations = [];
          
          for (const obs of params.observations) {
            const result = await neo4jSession.run(
              `
              MATCH (e:Entity {name: $entityName})
              CREATE (o:Observation {content: $content, created_at: datetime()})
              CREATE (e)-[:HAS_OBSERVATION]->(o)
              RETURN o.content as content
              `,
              { entityName: params.entity_name, content: obs }
            );
            
            if (result.records.length > 0) {
              observations.push(result.records[0].get('content'));
            }
          }
          
          return { 
            success: true, 
            entity: params.entity_name,
            observations_added: observations 
          };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 4. Delete entities tool
    this.server.tool('delete_entities', {
      description: 'Delete entities and their relationships',
      parameters: z.object({
        entity_names: z.array(z.string()).describe('Names of entities to delete')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.WRITE);
        
        const neo4jSession = this.driver.session();
        try {
          const results = [];
          
          for (const name of params.entity_names) {
            const result = await neo4jSession.run(
              `
              MATCH (e:Entity {name: $name})
              OPTIONAL MATCH (e)-[:HAS_OBSERVATION]->(o:Observation)
              DETACH DELETE e, o
              RETURN count(e) as deleted_count
              `,
              { name }
            );
            
            const deletedCount = result.records[0]?.get('deleted_count')?.toNumber() || 0;
            results.push({ name, deleted: deletedCount > 0 });
          }
          
          return { success: true, entities_deleted: results };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 5. Delete observations tool
    this.server.tool('delete_observations', {
      description: 'Delete specific observations from entities',
      parameters: z.object({
        entity_name: z.string().describe('Entity name'),
        observation_content: z.string().describe('Content of observation to delete')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.WRITE);
        
        const neo4jSession = this.driver.session();
        try {
          const result = await neo4jSession.run(
            `
            MATCH (e:Entity {name: $entityName})-[:HAS_OBSERVATION]->(o:Observation {content: $content})
            DELETE o
            RETURN count(o) as deleted_count
            `,
            { entityName: params.entity_name, content: params.observation_content }
          );
          
          const deletedCount = result.records[0]?.get('deleted_count')?.toNumber() || 0;
          
          return { 
            success: true, 
            entity: params.entity_name,
            observations_deleted: deletedCount 
          };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 6. Delete relations tool
    this.server.tool('delete_relations', {
      description: 'Delete relationships between entities',
      parameters: z.object({
        from: z.string().describe('Source entity name'),
        to: z.string().describe('Target entity name'),
        relation_type: z.string().optional().describe('Specific relation type to delete (optional)')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.WRITE);
        
        const neo4jSession = this.driver.session();
        try {
          let query: string;
          let queryParams: any;
          
          if (params.relation_type) {
            const relType = params.relation_type.toUpperCase().replace(/\s+/g, '_');
            query = `
              MATCH (from:Entity {name: $from})-[r:${relType}]->(to:Entity {name: $to})
              DELETE r
              RETURN count(r) as deleted_count
            `;
            queryParams = { from: params.from, to: params.to };
          } else {
            query = `
              MATCH (from:Entity {name: $from})-[r]->(to:Entity {name: $to})
              DELETE r
              RETURN count(r) as deleted_count
            `;
            queryParams = { from: params.from, to: params.to };
          }
          
          const result = await neo4jSession.run(query, queryParams);
          const deletedCount = result.records[0]?.get('deleted_count')?.toNumber() || 0;
          
          return { 
            success: true,
            from: params.from,
            to: params.to,
            relation_type: params.relation_type,
            relations_deleted: deletedCount
          };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 7. Read graph tool
    this.server.tool('read_graph', {
      description: 'Read the knowledge graph structure',
      parameters: z.object({
        limit: z.number().default(100).describe('Maximum number of entities to return'),
        entity_type: z.string().optional().describe('Filter by entity type')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.READ);
        
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

    // 8. Search nodes tool
    this.server.tool('search_nodes', {
      description: 'Full-text search across entities and observations',
      parameters: z.object({
        query: z.string().describe('Search query'),
        limit: z.number().default(10).describe('Maximum results to return')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.READ);
        
        const neo4jSession = this.driver.session();
        try {
          const result = await neo4jSession.run(
            `
            CALL db.index.fulltext.queryNodes('entity_search', $searchQuery)
            YIELD node, score
            WITH node, score
            LIMIT $limit
            OPTIONAL MATCH (node)-[:HAS_OBSERVATION]->(obs:Observation)
            RETURN 
              node.name as name,
              node.type as type,
              labels(node) as labels,
              collect(obs.content) as observations,
              score
            ORDER BY score DESC
            `,
            { 
              searchQuery: params.query + '*',
              limit: params.limit 
            }
          );
          
          const results = result.records.map(record => ({
            name: record.get('name'),
            type: record.get('type'),
            labels: record.get('labels'),
            observations: record.get('observations'),
            score: record.get('score')
          }));
          
          return { success: true, results, query: params.query };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 9. Find nodes tool
    this.server.tool('find_nodes', {
      description: 'Find entities by exact name match',
      parameters: z.object({
        name: z.string().describe('Entity name to find'),
        include_relations: z.boolean().default(true).describe('Include relationship information')
      }),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.READ);
        
        const neo4jSession = this.driver.session();
        try {
          let query: string;
          if (params.include_relations) {
            query = `
              MATCH (e:Entity {name: $name})
              OPTIONAL MATCH (e)-[:HAS_OBSERVATION]->(o:Observation)
              OPTIONAL MATCH (e)-[r]-(connected:Entity)
              WITH e, collect(DISTINCT o.content) as observations,
                   collect(DISTINCT {type: type(r), entity: connected.name, direction:
                     CASE WHEN startNode(r) = e THEN 'outgoing' ELSE 'incoming' END}) as relations
              RETURN e.name as name, e.type as type, observations, relations
            `;
          } else {
            query = `
              MATCH (e:Entity {name: $name})
              OPTIONAL MATCH (e)-[:HAS_OBSERVATION]->(o:Observation)
              RETURN e.name as name, e.type as type, collect(o.content) as observations
            `;
          }
          
          const result = await neo4jSession.run(query, { name: params.name });
          
          if (result.records.length === 0) {
            return { success: false, message: `Entity '${params.name}' not found` };
          }
          
          const record = result.records[0];
          const entity = {
            name: record.get('name'),
            type: record.get('type'),
            observations: record.get('observations')
          };
          
          if (params.include_relations) {
            (entity as any).relations = record.get('relations');
          }
          
          return { success: true, entity };
        } finally {
          await neo4jSession.close();
        }
      }
    });

    // 10. Health check tool
    this.server.tool('health_check', {
      description: 'Check server and database health',
      parameters: z.object({}),
      handler: async (params, session) => {
        this.requirePermission(session as DescopeSession, MCPScopes.ADMIN);
        
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
            authentication: 'descope',
            session_info: {
              user_id: session.userId,
              auth_method: session.authMethod,
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

  private requirePermission(session: DescopeSession, permission: string): void {
    if (!this.descopeProvider.hasPermission(session, permission)) {
      throw new Error(`Insufficient permissions. Required: ${permission}`);
    }
  }

  getServer(): FastMCP {
    return this.server;
  }

  getOAuthServer(): OAuthServer {
    return this.oauthServer;
  }

  async close(): Promise<void> {
    if (this.driver) {
      await this.driver.close();
    }
  }
}