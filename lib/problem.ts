/**
 * Helper RFC 7807 pour les réponses d'erreur standardisées
 * Compatible avec les standards Ankilang
 */

interface ProblemResponse {
  type: string;
  title: string;
  detail: string;
  traceId: string;
  status?: number;
  instance?: string;
  errors?: any[];
}

/**
 * Génère une réponse d'erreur RFC 7807
 */
export function problem(
  statusCode: number,
  detail: string,
  traceId: string,
  title?: string,
  type?: string,
  errors?: any[]
): any {
  const response: ProblemResponse = {
    type: type || `https://ankilang.com/errors/${getErrorType(statusCode)}`,
    title: title || getDefaultTitle(statusCode),
    detail,
    traceId,
    status: statusCode
  };

  if (errors) {
    response.errors = errors;
  }

  return {
    statusCode,
    headers: {
      'Content-Type': 'application/problem+json',
      'X-Trace-Id': traceId
    },
    body: JSON.stringify(response)
  };
}

/**
 * Détermine le type d'erreur basé sur le code de statut
 */
function getErrorType(statusCode: number): string {
  if (statusCode >= 400 && statusCode < 500) {
    return 'client-error';
  } else if (statusCode >= 500) {
    return 'server-error';
  }
  return 'unknown-error';
}

/**
 * Détermine le titre par défaut basé sur le code de statut
 */
function getDefaultTitle(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'Bad Request';
    case 401:
      return 'Unauthorized';
    case 403:
      return 'Forbidden';
    case 404:
      return 'Not Found';
    case 405:
      return 'Method Not Allowed';
    case 409:
      return 'Conflict';
    case 422:
      return 'Unprocessable Entity';
    case 429:
      return 'Too Many Requests';
    case 500:
      return 'Internal Server Error';
    case 502:
      return 'Bad Gateway';
    case 503:
      return 'Service Unavailable';
    case 504:
      return 'Gateway Timeout';
    default:
      return 'Error';
  }
}
