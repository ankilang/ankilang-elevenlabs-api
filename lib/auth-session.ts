import { Client, Account } from 'node-appwrite';
import { z } from 'zod';
import { corsHeaders } from './cors';

// Schéma de validation pour l'authentification par session
const SessionAuthSchema = z.object({
  sessionId: z.string().min(1, 'Session ID is required'),
  userId: z.string().min(1, 'User ID is required')
});

// Interface pour les événements authentifiés par session
export interface SessionAuthenticatedEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters: Record<string, string> | null;
  pathParameters: Record<string, string> | null;
  traceId: string;
  userId: string;
  sessionId: string;
}

// Configuration Appwrite
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_SELF_SIGNED = process.env.APPWRITE_SELF_SIGNED === 'true';

if (!APPWRITE_PROJECT_ID) {
  throw new Error('APPWRITE_PROJECT_ID environment variable is required');
}

// Client Appwrite
const client = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID)
  .setSelfSigned(APPWRITE_SELF_SIGNED);

/**
 * Middleware d'authentification par session Appwrite
 * Utilise les sessions au lieu des JWT
 */
export function withSessionAuth(handler: (event: SessionAuthenticatedEvent) => Promise<any>) {
  return async (event: any) => {
    const traceId = generateTraceId();
    
    try {
      // Extraction des données de session depuis les headers
      const sessionId = event.headers['X-Session-Id'] || event.headers['x-session-id'];
      const userId = event.headers['X-User-Id'] || event.headers['x-user-id'];
      
      if (!sessionId || !userId) {
        const origin = event.headers.Origin || event.headers.origin;
        const headers = corsHeaders(origin, { 'Content-Type': 'application/json' });
        
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            type: 'https://ankilang.com/errors/unauthorized',
            title: 'Unauthorized',
            detail: 'Missing session information',
            traceId
          })
        };
      }

      // Validation du schéma
      const { sessionId: validSessionId, userId: validUserId } = SessionAuthSchema.parse({ 
        sessionId, 
        userId 
      });

      // Vérification de la session avec Appwrite
      const account = new Account(client);
      const session = await account.getSession(validSessionId);
      
      if (!session || session.userId !== validUserId) {
        const origin = event.headers.Origin || event.headers.origin;
        const headers = corsHeaders(origin, { 'Content-Type': 'application/json' });
        
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            type: 'https://ankilang.com/errors/unauthorized',
            title: 'Unauthorized',
            detail: 'Invalid session',
            traceId
          })
        };
      }

      // Création de l'événement authentifié
      const sessionAuthenticatedEvent: SessionAuthenticatedEvent = {
        ...event,
        traceId,
        userId: validUserId,
        sessionId: validSessionId
      };

      return await handler(sessionAuthenticatedEvent);

    } catch (error: any) {
      const origin = event.headers.Origin || event.headers.origin;
      const headers = corsHeaders(origin, { 'Content-Type': 'application/json' });
      
      if (error instanceof z.ZodError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({
            type: 'https://ankilang.com/errors/bad-request',
            title: 'Bad Request',
            detail: 'Invalid request format',
            traceId,
            errors: error.errors
          })
        };
      }

      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({
          type: 'https://ankilang.com/errors/unauthorized',
          title: 'Unauthorized',
          detail: 'Session authentication failed',
          traceId
        })
      };
    }
  };
}

/**
 * Génère un ID de trace unique
 */
function generateTraceId(): string {
  return `trace_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
