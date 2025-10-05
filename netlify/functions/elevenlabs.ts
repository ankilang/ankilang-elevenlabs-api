/**
 * Fonction ElevenLabs sécurisée pour Ankilang
 * Text-to-Speech avec authentification JWT et rate limiting
 */

import { withAuth, AuthenticatedEvent } from '../../lib/auth';
import { handleCORS, corsHeaders } from '../../lib/cors';
import { rateLimit } from '../../lib/rate-limit';
import { problem } from '../../lib/problem';
import { logInfo, logError, logUsage, logWarn } from '../../lib/logging';
import { z } from 'zod';
import { Client, Storage } from 'node-appwrite';

// Configuration ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

// Configuration Appwrite pour le stockage
const APPWRITE_ENDPOINT = process.env.APPWRITE_ENDPOINT || 'https://cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID;
const APPWRITE_API_KEY = process.env.APPWRITE_API_KEY;
const APPWRITE_BUCKET_ID = process.env.APPWRITE_BUCKET_ID;
const APPWRITE_SELF_SIGNED = process.env.APPWRITE_SELF_SIGNED === 'true';

// Client Appwrite pour le stockage
const storageClient = new Client()
  .setEndpoint(APPWRITE_ENDPOINT)
  .setProject(APPWRITE_PROJECT_ID || '')
  .setKey(APPWRITE_API_KEY || '')
  .setSelfSigned(APPWRITE_SELF_SIGNED);

const storage = new Storage(storageClient);


// Schéma de validation Zod pour les paramètres ElevenLabs
const ElevenLabsSchema = z.object({
  text: z.string().min(1, 'Text is required').max(5000, 'Text too long (max 5000 characters)'),
  voice_id: z.string().min(1, 'Voice ID is required'),
  model_id: z.string().optional().default("eleven_turbo_v2_5"),
  language_code: z.string().optional(), // Code langue pour Turbo v2.5 (expérimental)
  voice_settings: z.object({
    stability: z.number().min(0).max(1).optional().default(0.5),
    similarity_boost: z.number().min(0).max(1).optional().default(0.5)
  }).optional(),
  output_format: z.string().optional().default("mp3_44100_128"),
  save_to_storage: z.boolean().optional().default(false) // Option pour sauvegarder dans Appwrite
});

/**
 * Fonction principale ElevenLabs
 */
export const handler = withAuth(async (event: AuthenticatedEvent) => {
  const { traceId, userId } = event;
  
  // Gestion CORS
  const corsResult = handleCORS(event);
  if (corsResult) {
    return corsResult;
  }

  // Vérification de la méthode HTTP
  if (event.httpMethod !== 'POST') {
    logError(traceId, 'elevenlabs', 'invalid_method', `Invalid HTTP method: ${event.httpMethod}`, { method: event.httpMethod }, userId);
    return problem(405, 'Use POST', traceId);
  }

  return await handleElevenLabsRequest(event);
});

async function handleElevenLabsRequest(event: AuthenticatedEvent) {
  const { traceId, userId } = event;

  try {
    // Rate limiting
    const rateLimitResult = await rateLimit(userId, 'elevenlabs');
    if (!rateLimitResult.allowed) {
      logWarn(traceId, 'elevenlabs', 'rate_limit', 'Rate limit exceeded', { 
        limit: rateLimitResult.limit,
        remaining: rateLimitResult.remaining,
        resetTime: rateLimitResult.resetTime
      }, userId);
      return problem(429, 'Rate limit exceeded', traceId);
    }

    // Vérification de la clé API
    if (!ELEVENLABS_API_KEY) {
      logError(traceId, 'elevenlabs', 'config_error', 'Missing ELEVENLABS_API_KEY');
      return problem(500, 'Service configuration error', traceId);
    }

    // Parsing et validation des paramètres
    const body = JSON.parse(event.body || '{}');
    const validatedData = ElevenLabsSchema.parse(body);

    logInfo(traceId, 'elevenlabs', 'request', 'TTS request received', { 
      textLength: validatedData.text.length, 
      voiceId: validatedData.voice_id,
      modelId: validatedData.model_id,
      languageCode: validatedData.language_code
    }, userId);

    // Préparation de la requête ElevenLabs
    const requestBody: any = {
      text: validatedData.text,
      model_id: validatedData.model_id,
      voice_settings: validatedData.voice_settings || {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };

    // Ajouter le code langue si fourni (pour Turbo v2.5)
    if (validatedData.language_code) {
      requestBody.language_code = validatedData.language_code;
    }

    // Appel à l'API ElevenLabs avec timeout
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const resp = await fetch(`${ENDPOINT}/${validatedData.voice_id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (!resp.ok) {
        const errTxt = await resp.text();
        logError(traceId, 'elevenlabs', 'api_error', `ElevenLabs API error: ${resp.status}`, { 
          status: resp.status, 
          error: errTxt.slice(0, 200) 
        }, userId);
        return problem(500, `ElevenLabs API error: ${resp.status}`, traceId);
      }

      // Log de l'usage
      logUsage(traceId, userId, 'elevenlabs', 'tts_generated', 0.01, duration);

      // Retour de l'audio
      const contentType = resp.headers.get('content-type') || 'audio/mpeg';
      const ab = await resp.arrayBuffer();
      const base64 = Buffer.from(ab).toString('base64');
      
      // Sauvegarder dans Appwrite Storage si demandé
      let fileUrl = null;
      if (validatedData.save_to_storage && APPWRITE_BUCKET_ID) {
        try {
          const fileName = `elevenlabs-${Date.now()}-${userId}.mp3`;
          const file = await storage.createFile(
            APPWRITE_BUCKET_ID || '',
            fileName,
            new File([new Uint8Array(ab)], fileName, { type: contentType }),
            ['*'] // Permissions pour tous les utilisateurs
          );
          
          fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${file.$id}/view?project=${APPWRITE_PROJECT_ID}`;
          
          logInfo(traceId, 'elevenlabs', 'storage_saved', 'Audio saved to Appwrite Storage', { 
            fileId: file.$id,
            fileName,
            fileUrl
          }, userId);
        } catch (storageError) {
          logError(traceId, 'elevenlabs', 'storage_error', 'Failed to save audio to storage', { 
            error: String(storageError) 
          }, userId);
          // Continue sans échouer si le stockage échoue
        }
      }
      
      logInfo(traceId, 'elevenlabs', 'success', 'Audio generated successfully', { 
        contentType, 
        size: ab.byteLength,
        duration,
        savedToStorage: !!fileUrl
      }, userId);

      // Headers CORS
      const origin = event.headers.Origin || event.headers.origin;
      const headers = corsHeaders(origin, {
        'Content-Type': 'application/json',
        'X-Trace-Id': traceId,
        'X-Rate-Limit-Remaining': rateLimitResult.remaining.toString(),
        'X-Rate-Limit-Reset': rateLimitResult.resetTime.toString()
      });

      // Réponse avec option de stockage
      const responseBody = {
        audio: base64,
        contentType,
        size: ab.byteLength,
        duration,
        ...(fileUrl && { fileUrl, fileId: fileUrl.split('/').pop()?.split('?')[0] })
      };

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(responseBody)
      };

    } catch (fetchError) {
      clearTimeout(timeout);
      
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        logError(traceId, 'elevenlabs', 'timeout', 'Request timeout after 30s', {}, userId);
        return problem(504, 'Request timeout', traceId);
      }
      
      throw fetchError;
    }

  } catch (err: any) {
    if (err instanceof z.ZodError) {
      logError(traceId, 'elevenlabs', 'validation_error', 'Invalid request parameters', { 
        errors: err.errors 
      }, userId);
      return problem(400, 'Invalid parameters', traceId);
    }
    
    logError(traceId, 'elevenlabs', 'internal_error', 'Internal server error', { 
      error: String(err) 
    }, userId);
    return problem(500, 'TTS error', traceId);
  }
}
