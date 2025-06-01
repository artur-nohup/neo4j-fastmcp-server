import { JWTPayload } from 'jose';

// Descope Authentication Info
export interface DescopeAuthInfo {
  jwt: string;
  token: JWTPayload & {
    sub: string;
    email?: string;
    name?: string;
    picture?: string;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
    permissions?: string[];
    roles?: string[];
    tenants?: Record<string, {
      permissions?: string[];
      roles?: string[];
    }>;
    customClaims?: Record<string, any>;
  };
  refreshToken?: string;
  user?: {
    userId: string;
    email?: string;
    name?: string;
    picture?: string;
    verified: boolean;
    createdTime: number;
    lastLoginTime?: number;
  };
}

// Session interface for FastMCP
export interface DescopeSession {
  userId: string;
  email?: string;
  name?: string;
  permissions: string[];
  roles: string[];
  authMethod: 'oauth' | 'api_key';
  jwt?: string;
  apiKeyId?: string;
  authenticated: boolean;
  timestamp: number;
  expiresAt?: number;
}

// OAuth Configuration
export interface OAuthConfig {
  provider: string;
  clientId: string;
  clientSecret?: string;
  redirectUri: string;
  scopes: string[];
  additionalParams?: Record<string, string>;
}

// API Key Configuration
export interface ApiKeyConfig {
  name: string;
  permissions: string[];
  roles?: string[];
  expireTime?: number; // 0 for no expiration
  description?: string;
  permittedIPs?: string[];
  customClaims?: Record<string, any>;
}

// OAuth Flow State
export interface OAuthState {
  codeVerifier: string;
  state: string;
  nonce: string;
  provider: string;
  redirectUri: string;
  timestamp: number;
}

// Token Response
export interface TokenResponse {
  access_token: string;
  id_token?: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  scope?: string;
}

// MCP Scopes for permission control
export enum MCPScopes {
  READ = 'mcp:read',
  WRITE = 'mcp:write',
  ADMIN = 'mcp:admin',
  TOOLS_LIST = 'mcp:tools:list',
  TOOLS_CALL = 'mcp:tools:call',
  HEALTH_CHECK = 'mcp:health',
  RESOURCES_READ = 'mcp:resources:read',
  RESOURCES_WRITE = 'mcp:resources:write'
}

// Descope Management API responses
export interface AccessKeyResponse {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  createdTime: number;
  expireTime?: number;
  boundUserId?: string;
  roleNames?: string[];
  tenantIds?: string[];
  customClaims?: Record<string, any>;
  cleartext?: string; // Only present when creating new key
}

export interface DescopeConfig {
  projectId: string;
  managementKey?: string;
  baseUrl?: string;
  environment?: 'production' | 'staging' | 'development';
}

// Extended Express Request interface
declare global {
  namespace Express {
    interface Request {
      user?: DescopeSession;
      descopeAuth?: DescopeAuthInfo;
    }
  }
}