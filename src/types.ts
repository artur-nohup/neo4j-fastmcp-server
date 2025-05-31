export interface Entity {
  name: string;
  type: string;
  observations: string[];
}

export interface Relation {
  source: string;
  target: string;
  relationType: string;
}

export interface KnowledgeGraph {
  entities: Entity[];
  relations: Relation[];
}

export interface ObservationAddition {
  entityName: string;
  contents: string[];
}

export interface ObservationDeletion {
  entityName: string;
  observations: string[];
}

export interface AuthSession extends Record<string, unknown> {
  userId: string;
  email?: string;
  scopes: string[];
  tokenType: string;
  iat: number;
  exp: number;
}

export interface OAuthTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  scope?: string;
  refresh_token?: string;
}

export interface OAuthUserInfo {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}