// lib/cors.ts - CORS sécurisé avec origines autorisées
type HeadersMap = Record<string, string>;

const DEFAULT_ALLOWED_ORIGINS = [
  'https://ankilang.appwrite.network',
  'https://ankilang.pages.dev',
  'https://ankilang.com',
  'https://ankilang.netlify.app',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:8888'
];

function normalizeOrigin(origin?: string): string {
  return origin?.trim() ?? '';
}

export function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGIN?.split(',').map((o) => o.trim()).filter(Boolean) ?? [];
  const set = new Set<string>([...envOrigins, ...DEFAULT_ALLOWED_ORIGINS]);
  return Array.from(set);
}

export function corsHeaders(origin?: string, extra: HeadersMap = {}): HeadersMap {
  const allowedOrigins = getAllowedOrigins();
  const normalizedOrigin = normalizeOrigin(origin);
  const isAllowed = normalizedOrigin && allowedOrigins.includes(normalizedOrigin);
  const value = isAllowed ? normalizedOrigin : allowedOrigins[0] ?? '*';

  return {
    'Access-Control-Allow-Origin': value,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Trace-Id',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    'X-Frame-Options': 'DENY',
    'X-Content-Type-Options': 'nosniff',
    'X-XSS-Protection': '1; mode=block',
    'Vary': 'Origin',
    ...extra
  };
}

export function handleCORS(event: { httpMethod: string; headers: Record<string, string | undefined> }) {
  const origin = event.headers?.origin || event.headers?.Origin;
  const allowedOrigins = getAllowedOrigins();
  const headers = corsHeaders(origin);

  if (event.httpMethod === 'OPTIONS') {
    if (origin && !allowedOrigins.includes(origin)) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Origin not allowed' })
      };
    }

    return {
      statusCode: 204,
      headers,
      body: ''
    };
  }

  if (origin && !allowedOrigins.includes(origin)) {
    return {
      statusCode: 403,
      headers,
      body: JSON.stringify({ error: 'Origin not allowed' })
    };
  }

  return null; // Pas de problème CORS
}