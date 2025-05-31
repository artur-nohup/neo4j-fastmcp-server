import jwt from 'jsonwebtoken';
import { IncomingMessage } from 'http';
import { AuthSession, OAuthTokenResponse, OAuthUserInfo } from '../types.js';

export class OAuthProvider {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private readonly jwtSecret: string;

  constructor() {
    this.clientId = process.env.OAUTH_CLIENT_ID!;
    this.clientSecret = process.env.OAUTH_CLIENT_SECRET!;
    this.redirectUri = process.env.OAUTH_REDIRECT_URI!;
    this.jwtSecret = process.env.JWT_SECRET!;

    if (!this.clientId || !this.clientSecret || !this.redirectUri || !this.jwtSecret) {
      throw new Error('Missing required OAuth configuration');
    }
  }

  /**
   * Generate OAuth 2.1 authorization URL
   */
  generateAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      scope: 'openid email profile',
      ...(state && { state }),
    });

    // This would be your OAuth provider's authorization endpoint
    return `https://oauth-provider.example.com/auth?${params.toString()}`;
  }

  /**
   * Exchange authorization code for access token (OAuth 2.1 Authorization Code Flow)
   */
  async exchangeCodeForToken(code: string, state?: string): Promise<OAuthTokenResponse> {
    const response = await fetch('https://oauth-provider.example.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.redirectUri,
        ...(state && { state }),
      }),
    });

    if (!response.ok) {
      throw new Error(`OAuth token exchange failed: ${response.statusText}`);
    }

    return response.json() as Promise<OAuthTokenResponse>;
  }

  /**
   * Get user information from OAuth provider
   */
  async getUserInfo(accessToken: string): Promise<OAuthUserInfo> {
    const response = await fetch('https://oauth-provider.example.com/userinfo', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to get user info: ${response.statusText}`);
    }

    return response.json() as Promise<OAuthUserInfo>;
  }

  /**
   * Generate JWT token for internal use
   */
  generateJWT(userInfo: OAuthUserInfo, scopes: string[] = ['read', 'write']): string {
    const payload: Omit<AuthSession, 'iat' | 'exp'> = {
      userId: userInfo.sub,
      email: userInfo.email,
      scopes,
      tokenType: 'Bearer',
    };

    return jwt.sign(payload, this.jwtSecret, {
      expiresIn: '24h',
      issuer: 'neo4j-mcp-server',
      audience: 'mcp-clients',
    });
  }

  /**
   * Verify and decode JWT token
   */
  verifyJWT(token: string): AuthSession {
    try {
      return jwt.verify(token, this.jwtSecret) as AuthSession;
    } catch (error) {
      throw new Error(`Invalid JWT token: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Extract token from HTTP request
   */
  extractTokenFromRequest(request: IncomingMessage): string | null {
    const authHeader = request.headers.authorization;
    
    if (!authHeader) {
      return null;
    }

    // Support both "Bearer <token>" and "token" formats
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1];
    }

    // Fallback to treating the whole header as token
    return authHeader;
  }

  /**
   * Authenticate request and return session data
   */
  async authenticateRequest(request: IncomingMessage): Promise<AuthSession> {
    const token = this.extractTokenFromRequest(request);
    
    if (!token) {
      throw new Response(null, {
        status: 401,
        statusText: 'Missing authorization token',
      });
    }

    try {
      const session = this.verifyJWT(token);
      
      // Check if token is expired
      if (Date.now() >= session.exp * 1000) {
        throw new Response(null, {
          status: 401,
          statusText: 'Token expired',
        });
      }

      return session;
    } catch (error) {
      throw new Response(null, {
        status: 401,
        statusText: 'Invalid or expired token',
      });
    }
  }

  /**
   * Check if session has required scope
   */
  hasScope(session: AuthSession, requiredScope: string): boolean {
    return session.scopes.includes(requiredScope) || session.scopes.includes('admin');
  }
}