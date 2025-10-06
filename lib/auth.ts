import { Client, Account } from 'node-appwrite';
import { z } from 'zod';
import { corsHeaders } from './cors';

// Schéma de validation pour l'authentification
const AuthSchema = z.object({
  jwt: z.string().min(1, 'JWT token is required')
});

// Interface pour les événements authentifiés
export interface AuthenticatedEvent {
  httpMethod: string;
  headers: Record<string, string>;
  body: string | null;
  queryStringParameters: Record<string, string> | null;
  pathParameters: Record<string, string> | null;
  traceId: string;
  userId: string;
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
 * Middleware d'authentification JWT
 * Vérifie le token JWT et extrait l'utilisateur
 */
export function withAuth(handler: (event: AuthenticatedEvent) => Promise<any>) {
  return async (event: any) => {
    const traceId = generateTraceId();
    
    try {
      // Extraction du JWT depuis les headers
      const authHeader = event.headers.Authorization || event.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        const origin = event.headers.Origin || event.headers.origin;
        const headers = corsHeaders(origin, { 'Content-Type': 'application/json' });
        
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            type: 'https://ankilang.com/errors/unauthorized',
            title: 'Unauthorized',
            detail: 'Missing or invalid Authorization header',
            traceId
          })
        };
      }

      const token = authHeader.substring(7);
      
      // Validation du schéma
      const { jwt } = AuthSchema.parse({ jwt: token });

      // Vérification du JWT avec Appwrite
      const account = new Account(client);
      const session = await account.getSession(jwt);
      
      if (!session || !session.userId) {
        const origin = event.headers.Origin || event.headers.origin;
        const headers = corsHeaders(origin, { 'Content-Type': 'application/json' });
        
        return {
          statusCode: 401,
          headers,
          body: JSON.stringify({
            type: 'https://ankilang.com/errors/unauthorized',
            title: 'Unauthorized',
            detail: 'Invalid JWT token',
            traceId
          })
        };
      }

      // Création de l'événement authentifié
      const authenticatedEvent: AuthenticatedEvent = {
        ...event,
        traceId,
        userId: session.userId
      };

      return await handler(authenticatedEvent);

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
          detail: 'Authentication failed',
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
