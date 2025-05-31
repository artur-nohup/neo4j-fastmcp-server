import { FastMCP } from 'fastmcp';
import { z } from 'zod';
import { Neo4jClient } from './neo4j/client.js';
import { OAuthProvider } from './auth/oauth.js';
import { AuthSession, Entity, Relation, ObservationAddition, ObservationDeletion } from './types.js';

export class Neo4jMCPServer {
  private server: FastMCP<AuthSession>;
  private neo4jClient: Neo4jClient;
  private oauthProvider: OAuthProvider;

  constructor() {
    this.oauthProvider = new OAuthProvider();
    this.neo4jClient = new Neo4jClient(
      process.env.NEO4J_URI!,
      process.env.NEO4J_USERNAME!,
      process.env.NEO4J_PASSWORD!,
      process.env.NEO4J_DATABASE || 'neo4j'
    );

    this.server = new FastMCP<AuthSession>({
      name: process.env.MCP_SERVER_NAME || 'neo4j-memory-mcp',
      version: (process.env.MCP_SERVER_VERSION || '1.0.0') as `${number}.${number}.${number}`,
      instructions: `
        This is a Neo4j Knowledge Graph Memory server with OAuth authentication.
        
        Features:
        - Store and retrieve entities and relationships in a Neo4j knowledge graph
        - Full-text search across entity names, types, and observations
        - OAuth 2.1 authentication for secure access
        - Session-based access control with scope validation
        
        Use this to maintain persistent memory across conversations and sessions.
        All operations require valid authentication and appropriate scopes.
      `,
      authenticate: async (request) => {
        return await this.oauthProvider.authenticateRequest(request);
      },
    });

    this.setupTools();
  }

  private setupTools(): void {
    // Create entities tool
    this.server.addTool({
      name: 'create_entities',
      description: 'Create multiple new entities in the knowledge graph',
      parameters: z.object({
        entities: z.array(z.object({
          name: z.string().describe('The name of the entity'),
          type: z.string().describe('The type of the entity'),
          observations: z.array(z.string()).describe('An array of observation contents associated with the entity')
        }))
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'write')) {
          throw new Error('Insufficient permissions: write scope required');
        }

        log.info('Creating entities', { count: args.entities.length, userId: session.userId });

        const entities: Entity[] = args.entities;
        const result = await this.neo4jClient.createEntities(entities);

        log.info('Entities created successfully', { count: result.length });
        return JSON.stringify(result, null, 2);
      }
    });

    // Create relations tool
    this.server.addTool({
      name: 'create_relations',
      description: 'Create multiple new relations between entities in the knowledge graph. Relations should be in active voice',
      parameters: z.object({
        relations: z.array(z.object({
          source: z.string().describe('The name of the entity where the relation starts'),
          target: z.string().describe('The name of the entity where the relation ends'),
          relationType: z.string().describe('The type of the relation')
        }))
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'write')) {
          throw new Error('Insufficient permissions: write scope required');
        }

        log.info('Creating relations', { count: args.relations.length, userId: session.userId });

        const relations: Relation[] = args.relations;
        const result = await this.neo4jClient.createRelations(relations);

        log.info('Relations created successfully', { count: result.length });
        return JSON.stringify(result, null, 2);
      }
    });

    // Add observations tool
    this.server.addTool({
      name: 'add_observations',
      description: 'Add new observations to existing entities in the knowledge graph',
      parameters: z.object({
        observations: z.array(z.object({
          entityName: z.string().describe('The name of the entity to add the observations to'),
          contents: z.array(z.string()).describe('An array of observation contents to add')
        }))
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'write')) {
          throw new Error('Insufficient permissions: write scope required');
        }

        log.info('Adding observations', { userId: session.userId });

        const observations: ObservationAddition[] = args.observations;
        const result = await this.neo4jClient.addObservations(observations);

        log.info('Observations added successfully');
        return JSON.stringify(result, null, 2);
      }
    });

    // Delete entities tool
    this.server.addTool({
      name: 'delete_entities',
      description: 'Delete multiple entities and their associated relations from the knowledge graph',
      parameters: z.object({
        entityNames: z.array(z.string()).describe('An array of entity names to delete')
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'write')) {
          throw new Error('Insufficient permissions: write scope required');
        }

        log.info('Deleting entities', { count: args.entityNames.length, userId: session.userId });

        await this.neo4jClient.deleteEntities(args.entityNames);

        log.info('Entities deleted successfully');
        return 'Entities deleted successfully';
      }
    });

    // Delete observations tool
    this.server.addTool({
      name: 'delete_observations',
      description: 'Delete specific observations from entities in the knowledge graph',
      parameters: z.object({
        deletions: z.array(z.object({
          entityName: z.string().describe('The name of the entity containing the observations'),
          observations: z.array(z.string()).describe('An array of observations to delete')
        }))
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'write')) {
          throw new Error('Insufficient permissions: write scope required');
        }

        log.info('Deleting observations', { userId: session.userId });

        const deletions: ObservationDeletion[] = args.deletions;
        await this.neo4jClient.deleteObservations(deletions);

        log.info('Observations deleted successfully');
        return 'Observations deleted successfully';
      }
    });

    // Delete relations tool
    this.server.addTool({
      name: 'delete_relations',
      description: 'Delete multiple relations from the knowledge graph',
      parameters: z.object({
        relations: z.array(z.object({
          source: z.string().describe('The name of the entity where the relation starts'),
          target: z.string().describe('The name of the entity where the relation ends'),
          relationType: z.string().describe('The type of the relation')
        }))
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'write')) {
          throw new Error('Insufficient permissions: write scope required');
        }

        log.info('Deleting relations', { count: args.relations.length, userId: session.userId });

        const relations: Relation[] = args.relations;
        await this.neo4jClient.deleteRelations(relations);

        log.info('Relations deleted successfully');
        return 'Relations deleted successfully';
      }
    });

    // Read graph tool
    this.server.addTool({
      name: 'read_graph',
      description: 'Read the entire knowledge graph',
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'read')) {
          throw new Error('Insufficient permissions: read scope required');
        }

        log.info('Reading entire graph', { userId: session.userId });

        const result = await this.neo4jClient.loadGraph();

        log.info('Graph read successfully', { 
          entityCount: result.entities.length,
          relationCount: result.relations.length 
        });
        return JSON.stringify(result, null, 2);
      }
    });

    // Search nodes tool
    this.server.addTool({
      name: 'search_nodes',
      description: 'Search for nodes in the knowledge graph based on a query',
      parameters: z.object({
        query: z.string().describe('The search query to match against entity names, types, and observation content')
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'read')) {
          throw new Error('Insufficient permissions: read scope required');
        }

        log.info('Searching nodes', { query: args.query, userId: session.userId });

        const result = await this.neo4jClient.searchNodes(args.query);

        log.info('Search completed', { 
          entityCount: result.entities.length,
          relationCount: result.relations.length 
        });
        return JSON.stringify(result, null, 2);
      }
    });

    // Find nodes tool
    this.server.addTool({
      name: 'find_nodes',
      description: 'Find specific nodes in the knowledge graph by their names',
      parameters: z.object({
        names: z.array(z.string()).describe('An array of entity names to retrieve')
      }),
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'read')) {
          throw new Error('Insufficient permissions: read scope required');
        }

        log.info('Finding nodes', { names: args.names, userId: session.userId });

        const result = await this.neo4jClient.findNodes(args.names);

        log.info('Nodes found', { 
          entityCount: result.entities.length,
          relationCount: result.relations.length 
        });
        return JSON.stringify(result, null, 2);
      }
    });

    // Health check tool (admin only)
    this.server.addTool({
      name: 'health_check',
      description: 'Check the health of the Neo4j connection and server status',
      execute: async (args, { session, log }) => {
        if (!session) {
          throw new Error('Authentication required');
        }

        if (!this.oauthProvider.hasScope(session, 'admin')) {
          throw new Error('Insufficient permissions: admin scope required');
        }

        log.info('Performing health check', { userId: session.userId });

        const neo4jConnected = await this.neo4jClient.verifyConnection();
        
        const status = {
          timestamp: new Date().toISOString(),
          neo4j: {
            connected: neo4jConnected,
            uri: process.env.NEO4J_URI,
            database: process.env.NEO4J_DATABASE || 'neo4j'
          },
          server: {
            name: process.env.MCP_SERVER_NAME || 'neo4j-memory-mcp',
            version: process.env.MCP_SERVER_VERSION || '1.0.0',
            uptime: process.uptime()
          },
          session: {
            userId: session.userId,
            scopes: session.scopes
          }
        };

        log.info('Health check completed', { status: neo4jConnected ? 'healthy' : 'unhealthy' });
        return JSON.stringify(status, null, 2);
      }
    });
  }

  async initialize(): Promise<void> {
    await this.neo4jClient.initialize();
  }

  async start(port: number = 8080): Promise<void> {
    await this.initialize();
    
    console.log(`Starting Neo4j MCP Server on port ${port}...`);
    
    await this.server.start({
      transportType: 'httpStream',
      httpStream: {
        port,
      },
    });

    console.log(`🚀 Neo4j MCP Server running on http://localhost:${port}`);
    console.log(`📊 Neo4j connected to: ${process.env.NEO4J_URI}`);
    console.log(`🔐 OAuth authentication enabled`);
  }

  async stop(): Promise<void> {
    await this.neo4jClient.close();
  }

  getOAuthProvider(): OAuthProvider {
    return this.oauthProvider;
  }
}