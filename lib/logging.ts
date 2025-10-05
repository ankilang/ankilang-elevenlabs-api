/**
 * Système de logs structurés avec traceId
 * Compatible avec les standards de logging d'Ankilang
 */

interface LogEntry {
  timestamp: string;
  traceId: string;
  service: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  userId?: string;
  metadata?: Record<string, any>;
}

/**
 * Formate un log entry
 */
function formatLog(entry: LogEntry): string {
  return JSON.stringify({
    ...entry,
    timestamp: new Date().toISOString()
  });
}

/**
 * Log d'information
 */
export function logInfo(
  traceId: string,
  service: string,
  action: string,
  message: string,
  metadata?: Record<string, any>,
  userId?: string
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    service,
    level: 'info',
    message: `${action}: ${message}`,
    userId,
    metadata
  };
  
  console.log(formatLog(entry));
}

/**
 * Log d'avertissement
 */
export function logWarn(
  traceId: string,
  service: string,
  action: string,
  message: string,
  metadata?: Record<string, any>,
  userId?: string
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    service,
    level: 'warn',
    message: `${action}: ${message}`,
    userId,
    metadata
  };
  
  console.warn(formatLog(entry));
}

/**
 * Log d'erreur
 */
export function logError(
  traceId: string,
  service: string,
  action: string,
  message: string,
  metadata?: Record<string, any>,
  userId?: string
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    service,
    level: 'error',
    message: `${action}: ${message}`,
    userId,
    metadata
  };
  
  console.error(formatLog(entry));
}

/**
 * Log d'usage (pour le tracking des coûts)
 */
export function logUsage(
  traceId: string,
  userId: string,
  service: string,
  action: string,
  cost: number,
  duration: number,
  metadata?: Record<string, any>
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    traceId,
    service,
    level: 'info',
    message: `usage: ${action}`,
    userId,
    metadata: {
      ...metadata,
      cost,
      duration,
      type: 'usage'
    }
  };
  
  console.log(formatLog(entry));
}
