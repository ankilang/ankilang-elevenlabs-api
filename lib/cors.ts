/**
 * Gestion CORS sécurisée
 * Vérifie les origines autorisées et gère les requêtes preflight
 */

// Origines autorisées (configurables via variable d'environnement)
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGIN 
  ? process.env.ALLOWED_ORIGIN.split(',').map(origin => origin.trim())
  : [
      'https://ankilang.netlify.app', 
      'https://ankilang.com',
      'http://localhost:5173',  // Développement local
      'http://localhost:3000',  // Autre port de développement
      'http://localhost:8080'   // Port alternatif
    ];

// Headers CORS par défaut
const CORS_HEADERS = {
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400' // 24 heures
};

/**
 * Vérifie si une origine est autorisée
 */
function isOriginAllowed(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin);
}

/**
 * Gère les requêtes CORS
 * @param event - L'événement de la requête
 * @returns Réponse CORS si nécessaire, null sinon
 */
export function handleCORS(event: any): any | null {
  const origin = event.headers.Origin || event.headers.origin;
  
  // Si pas d'origine, on autorise (requêtes server-to-server)
  if (!origin) {
    return null;
  }

  // Vérification de l'origine
  if (!isOriginAllowed(origin)) {
    return {
      statusCode: 403,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': 'null'
      },
      body: JSON.stringify({
        type: 'https://ankilang.com/errors/forbidden',
        title: 'Forbidden',
        detail: 'Origin not allowed',
        traceId: event.traceId || 'unknown'
      })
    };
  }

  // Gestion des requêtes preflight OPTIONS
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
        ...CORS_HEADERS
      },
      body: ''
    };
  }

  // Pour les autres requêtes, on ajoute les headers CORS
  return null;
}

/**
 * Ajoute les headers CORS à une réponse
 */
export function addCORSHeaders(headers: Record<string, string>, origin?: string): Record<string, string> {
  if (origin && isOriginAllowed(origin)) {
    return {
      ...headers,
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
      ...CORS_HEADERS
    };
  }
  
  return headers;
}
