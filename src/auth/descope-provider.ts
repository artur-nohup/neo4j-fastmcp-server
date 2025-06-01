import DescopeClient from '@descope/node-sdk';
import { IncomingMessage } from 'http';
import crypto from 'crypto';
import { 
  DescopeAuthInfo, 
  DescopeSession, 
  OAuthConfig, 
  ApiKeyConfig, 
  OAuthState, 
  TokenResponse,
  MCPScopes,
  AccessKeyResponse,
  DescopeConfig
} from '../types/descope.js';

export class DescopeAuthProvider {
  private client: any;
  private config: DescopeConfig;
  private oauthStates = new Map<string, OAuthState>();

  constructor(config: DescopeConfig) {
    this.config = config;
    this.client = DescopeClient({
      projectId: config.projectId,
      managementKey: config.managementKey,
      baseUrl: config.baseUrl
    });
  }

  // OAuth 2.1 with PKCE Implementation
  async initiateOAuthFlow(
    provider: string, 
    redirectUri: string, 
    scopes: string[] = [MCPScopes.READ, MCPScopes.WRITE]
  ): Promise<{ authUrl: string; state: string }> {
    try {
      // Generate PKCE parameters
      const codeVerifier = this.generateCodeVerifier();
      const state = crypto.randomBytes(16).toString('hex');
      const nonce = crypto.randomBytes(16).toString('hex');

      // Store OAuth state for later validation
      const oauthState: OAuthState = {
        codeVerifier,
        state,
        nonce,
        provider,
        redirectUri,
        timestamp: Date.now()
      };
      this.oauthStates.set(state, oauthState);

      // Start OAuth flow with Descope
      const response = await this.client.oauth.start(provider, redirectUri, {
        implicitFlow: false,
        responseType: 'code',
        scope: scopes.join(' '),
        state,
        nonce,
        codeChallenge: this.generateCodeChallenge(codeVerifier),
        codeChallengeMethod: 'S256'
      });

      return {
        authUrl: response.data.url,
        state
      };
    } catch (error: any) {
      throw new Error(`Failed to initiate OAuth flow: ${error.message}`);
    }
  }

  async completeOAuthFlow(
    code: string, 
    state: string
  ): Promise<DescopeAuthInfo> {
    try {
      // Validate state and retrieve OAuth parameters
      const oauthState = this.oauthStates.get(state);
      if (!oauthState) {
        throw new Error('Invalid or expired OAuth state');
      }

      // Check state expiration (15 minutes)
      if (Date.now() - oauthState.timestamp > 15 * 60 * 1000) {
        this.oauthStates.delete(state);
        throw new Error('OAuth state expired');
      }

      // Exchange code for tokens using Descope
      const tokenResponse = await this.client.oauth.exchange(code, {
        codeVerifier: oauthState.codeVerifier
      });

      // Clean up state
      this.oauthStates.delete(state);

      // Validate the JWT and extract user info
      const authInfo = await this.client.validateSession(tokenResponse.data.sessionJwt);
      
      return {
        jwt: tokenResponse.data.sessionJwt,
        token: authInfo.token,
        refreshToken: tokenResponse.data.refreshJwt,
        user: authInfo.user
      };
    } catch (error: any) {
      throw new Error(`Failed to complete OAuth flow: ${error.message}`);
    }
  }

  // API Key Management
  async createApiKey(config: ApiKeyConfig): Promise<AccessKeyResponse> {
    try {
      if (!this.client.management) {
        throw new Error('Management key required for API key operations');
      }

      const response = await this.client.management.accessKey.create(
        config.name,
        config.expireTime || 0,
        config.roles || [],
        undefined, // tenants
        undefined, // userId
        config.customClaims || {},
        config.description || `MCP Server API Key: ${config.name}`,
        config.permittedIPs
      );

      return response.data;
    } catch (error: any) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }
  }

  async validateApiKey(apiKey: string): Promise<DescopeAuthInfo> {
    try {
      const authInfo = await this.client.exchangeAccessKey(apiKey);
      return authInfo;
    } catch (error: any) {
      throw new Error(`Invalid API key: ${error.message}`);
    }
  }

  async deactivateApiKey(keyId: string): Promise<void> {
    try {
      if (!this.client.management) {
        throw new Error('Management key required for API key operations');
      }

      await this.client.management.accessKey.deactivate(keyId);
    } catch (error: any) {
      throw new Error(`Failed to deactivate API key: ${error.message}`);
    }
  }

  // Session Management
  async validateSession(sessionToken: string): Promise<DescopeAuthInfo> {
    try {
      const authInfo = await this.client.validateSession(sessionToken);
      return authInfo;
    } catch (error: any) {
      throw new Error(`Session validation failed: ${error.message}`);
    }
  }

  async refreshSession(refreshToken: string): Promise<DescopeAuthInfo> {
    try {
      const authInfo = await this.client.refreshSession(refreshToken);
      return authInfo;
    } catch (error: any) {
      throw new Error(`Session refresh failed: ${error.message}`);
    }
  }

  async validateAndRefreshSession(
    sessionToken: string, 
    refreshToken: string
  ): Promise<DescopeAuthInfo> {
    try {
      const authInfo = await this.client.validateAndRefreshSession(
        sessionToken, 
        refreshToken
      );
      return authInfo;
    } catch (error: any) {
      throw new Error(`Session validation and refresh failed: ${error.message}`);
    }
  }

  // Authentication Request Handler for FastMCP
  async authenticateRequest(request: IncomingMessage): Promise<DescopeSession> {
    try {
      let authInfo: DescopeAuthInfo;
      let authMethod: 'oauth' | 'api_key';

      // Try Bearer token (OAuth) first
      const authHeader = request.headers.authorization;
      if (authHeader?.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        authInfo = await this.validateSession(token);
        authMethod = 'oauth';
      }
      // Try API key
      else {
        const apiKey = request.headers['x-api-key'] as string;
        if (!apiKey) {
          throw new Response('Authentication required. Provide either Authorization: Bearer <token> or X-API-Key: <key>', {
            status: 401,
            statusText: 'Unauthorized'
          });
        }
        authInfo = await this.validateApiKey(apiKey);
        authMethod = 'api_key';
      }

      // Convert to FastMCP session format
      const session: DescopeSession = {
        userId: authInfo.token.sub,
        email: authInfo.token.email,
        name: authInfo.token.name,
        permissions: this.extractPermissions(authInfo),
        roles: this.extractRoles(authInfo),
        authMethod,
        jwt: authMethod === 'oauth' ? authInfo.jwt : undefined,
        apiKeyId: authMethod === 'api_key' ? authInfo.token.sub : undefined,
        authenticated: true,
        timestamp: Date.now(),
        expiresAt: authInfo.token.exp ? authInfo.token.exp * 1000 : undefined
      };

      return session;
    } catch (error: any) {
      if (error instanceof Response) {
        throw error;
      }
      throw new Response(`Authentication failed: ${error.message}`, {
        status: 401,
        statusText: 'Unauthorized'
      });
    }
  }

  // Permission and Role Management
  hasPermission(session: DescopeSession, permission: string): boolean {
    return session.permissions.includes(permission) || 
           session.permissions.includes(MCPScopes.ADMIN);
  }

  hasRole(session: DescopeSession, role: string): boolean {
    return session.roles.includes(role) || 
           session.roles.includes('admin');
  }

  hasAnyPermission(session: DescopeSession, permissions: string[]): boolean {
    return permissions.some(permission => this.hasPermission(session, permission));
  }

  validateMCPScopes(session: DescopeSession, requiredScopes: string[]): boolean {
    return requiredScopes.every(scope => this.hasPermission(session, scope));
  }

  // Helper Methods
  private generateCodeVerifier(): string {
    return crypto.randomBytes(32).toString('base64url');
  }

  private generateCodeChallenge(verifier: string): string {
    return crypto
      .createHash('sha256')
      .update(verifier)
      .digest('base64url');
  }

  private extractPermissions(authInfo: DescopeAuthInfo): string[] {
    const permissions: string[] = [];
    
    // Direct permissions
    if (authInfo.token.permissions) {
      permissions.push(...authInfo.token.permissions);
    }

    // Role-based permissions (if roles map to MCP scopes)
    if (authInfo.token.roles) {
      authInfo.token.roles.forEach(role => {
        switch (role.toLowerCase()) {
          case 'admin':
            permissions.push(MCPScopes.ADMIN);
            break;
          case 'writer':
            permissions.push(MCPScopes.WRITE, MCPScopes.READ);
            break;
          case 'reader':
            permissions.push(MCPScopes.READ);
            break;
        }
      });
    }

    // Tenant-based permissions
    if (authInfo.token.tenants) {
      Object.values(authInfo.token.tenants).forEach(tenant => {
        if (tenant.permissions) {
          permissions.push(...tenant.permissions);
        }
      });
    }

    // Default permissions if none specified
    if (permissions.length === 0) {
      permissions.push(MCPScopes.READ);
    }

    return [...new Set(permissions)]; // Remove duplicates
  }

  private extractRoles(authInfo: DescopeAuthInfo): string[] {
    const roles: string[] = [];
    
    if (authInfo.token.roles) {
      roles.push(...authInfo.token.roles);
    }

    if (authInfo.token.tenants) {
      Object.values(authInfo.token.tenants).forEach(tenant => {
        if (tenant.roles) {
          roles.push(...tenant.roles);
        }
      });
    }

    return [...new Set(roles)]; // Remove duplicates
  }

  // Cleanup expired OAuth states (call periodically)
  cleanupExpiredStates(): void {
    const now = Date.now();
    const expiredStates: string[] = [];

    this.oauthStates.forEach((state, key) => {
      if (now - state.timestamp > 15 * 60 * 1000) { // 15 minutes
        expiredStates.push(key);
      }
    });

    expiredStates.forEach(key => {
      this.oauthStates.delete(key);
    });
  }
}