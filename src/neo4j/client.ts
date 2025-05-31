import neo4j, { Driver, Session } from 'neo4j-driver';
import { Entity, Relation, KnowledgeGraph, ObservationAddition, ObservationDeletion } from '../types.js';

export class Neo4jClient {
  private driver: Driver;
  private database: string;

  constructor(uri: string, username: string, password: string, database: string = 'neo4j') {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(username, password));
    this.database = database;
  }

  async initialize(): Promise<void> {
    try {
      await this.driver.verifyConnectivity();
      console.log('Connected to Neo4j successfully');
      await this.createIndexes();
    } catch (error) {
      console.error('Failed to connect to Neo4j:', error);
      throw error;
    }
  }

  private async createIndexes(): Promise<void> {
    const session = this.driver.session({ database: this.database });
    try {
      // Create fulltext index for search functionality
      await session.run(`
        CREATE FULLTEXT INDEX search IF NOT EXISTS 
        FOR (m:Memory) ON EACH [m.name, m.type, m.observations]
      `);
      console.log('Created/verified fulltext search index');
    } catch (error: any) {
      if (!error.message.includes('already exists')) {
        console.error('Error creating indexes:', error);
        throw error;
      }
    } finally {
      await session.close();
    }
  }

  async loadGraph(filterQuery: string = '*'): Promise<KnowledgeGraph> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.run(`
        CALL db.index.fulltext.queryNodes('search', $filter) 
        YIELD node as entity, score
        OPTIONAL MATCH (entity)-[r]-(other)
        RETURN collect(distinct {
          name: entity.name, 
          type: entity.type, 
          observations: entity.observations
        }) as nodes,
        collect(distinct {
          source: startNode(r).name, 
          target: endNode(r).name, 
          relationType: type(r)
        }) as relations
      `, { filter: filterQuery });

      if (!result.records.length) {
        return { entities: [], relations: [] };
      }

      const record = result.records[0];
      const nodes = record.get('nodes') || [];
      const rels = record.get('relations') || [];

      const entities: Entity[] = nodes
        .filter((node: any) => node.name)
        .map((node: any) => ({
          name: node.name,
          type: node.type,
          observations: node.observations || []
        }));

      const relations: Relation[] = rels
        .filter((rel: any) => rel.source && rel.target && rel.relationType)
        .map((rel: any) => ({
          source: rel.source,
          target: rel.target,
          relationType: rel.relationType
        }));

      return { entities, relations };
    } finally {
      await session.close();
    }
  }

  async createEntities(entities: Entity[]): Promise<Entity[]> {
    const session = this.driver.session({ database: this.database });
    try {
      await session.run(`
        UNWIND $entities as entity
        MERGE (e:Memory { name: entity.name })
        SET e += entity, e.type = entity.type
        SET e:\`\${entity.type}\`
      `, { entities });

      return entities;
    } finally {
      await session.close();
    }
  }

  async createRelations(relations: Relation[]): Promise<Relation[]> {
    const session = this.driver.session({ database: this.database });
    try {
      for (const relation of relations) {
        await session.run(`
          MATCH (from:Memory {name: $source}), (to:Memory {name: $target})
          MERGE (from)-[r:\`\${relation.relationType}\`]->(to)
        `, {
          source: relation.source,
          target: relation.target,
          relationType: relation.relationType
        });
      }
      return relations;
    } finally {
      await session.close();
    }
  }

  async addObservations(observations: ObservationAddition[]): Promise<Array<{entityName: string, addedObservations: string[]}>> {
    const session = this.driver.session({ database: this.database });
    try {
      const result = await session.run(`
        UNWIND $observations as obs  
        MATCH (e:Memory { name: obs.entityName })
        WITH e, [o in obs.contents WHERE NOT o IN coalesce(e.observations, [])] as new
        SET e.observations = coalesce(e.observations, []) + new
        RETURN e.name as name, new
      `, { observations });

      return result.records.map(record => ({
        entityName: record.get('name'),
        addedObservations: record.get('new')
      }));
    } finally {
      await session.close();
    }
  }

  async deleteEntities(entityNames: string[]): Promise<void> {
    const session = this.driver.session({ database: this.database });
    try {
      await session.run(`
        UNWIND $entities as name
        MATCH (e:Memory { name: name })
        DETACH DELETE e
      `, { entities: entityNames });
    } finally {
      await session.close();
    }
  }

  async deleteObservations(deletions: ObservationDeletion[]): Promise<void> {
    const session = this.driver.session({ database: this.database });
    try {
      await session.run(`
        UNWIND $deletions as d  
        MATCH (e:Memory { name: d.entityName })
        SET e.observations = [o in coalesce(e.observations, []) WHERE NOT o IN d.observations]
      `, { deletions });
    } finally {
      await session.close();
    }
  }

  async deleteRelations(relations: Relation[]): Promise<void> {
    const session = this.driver.session({ database: this.database });
    try {
      for (const relation of relations) {
        await session.run(`
          MATCH (source:Memory {name: $source})-[r:\`\${relation.relationType}\`]->(target:Memory {name: $target})
          DELETE r
        `, {
          source: relation.source,
          target: relation.target,
          relationType: relation.relationType
        });
      }
    } finally {
      await session.close();
    }
  }

  async searchNodes(query: string): Promise<KnowledgeGraph> {
    return this.loadGraph(query);
  }

  async findNodes(names: string[]): Promise<KnowledgeGraph> {
    const query = `name:(${names.join(' ')})`;
    return this.loadGraph(query);
  }

  async close(): Promise<void> {
    await this.driver.close();
  }

  async verifyConnection(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch (error) {
      console.error('Neo4j connection verification failed:', error);
      return false;
    }
  }
}