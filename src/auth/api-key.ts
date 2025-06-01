import { IncomingMessage } from 'http';

export interface ApiKeySession {
  apiKey: string;
  authenticated: boolean;
  timestamp: number;
}

export class ApiKeyProvider {
  private validApiKey: string;

  constructor() {
    this.validApiKey = process.env.MCP_SERVER_API_KEY || process.env.API_KEY || '';
    
    if (!this.validApiKey) {
      throw new Error('MCP_SERVER_API_KEY environment variable is required');
    }
  }

  /**
   * Authenticate request using API key from headers
   * Supports both X-API-Key header and Authorization: Bearer <key>
   */
  async authenticateRequest(request: IncomingMessage): Promise<ApiKeySession> {
    let providedKey: string | undefined;

    // Check X-API-Key header first
    providedKey = request.headers['x-api-key'] as string;

    // Fall back to Authorization header if X-API-Key not present
    if (!providedKey) {
      const authHeader = request.headers['authorization'] as string;
      if (authHeader?.startsWith('Bearer ')) {
        providedKey = authHeader.slice(7); // Remove "Bearer " prefix
      }
    }

    if (!providedKey) {
      throw new Response('Missing API key. Provide either X-API-Key header or Authorization: Bearer <key>', {
        status: 401,
        statusText: 'Unauthorized'
      });
    }

    if (providedKey !== this.validApiKey) {
      throw new Response('Invalid API key', {
        status: 401,
        statusText: 'Unauthorized'
      });
    }

    return {
      apiKey: providedKey,
      authenticated: true,
      timestamp: Date.now()
    };
  }

  /**
   * Validate that the session is authenticated
   */
  isAuthenticated(session?: ApiKeySession): boolean {
    return Boolean(session?.authenticated);
  }

  /**
   * Get the configured API key (for testing purposes)
   */
  getApiKey(): string {
    return this.validApiKey;
  }
}