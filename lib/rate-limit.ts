/**
 * Rate limiting par utilisateur
 * Configuration différenciée par service
 */

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

// Store en mémoire pour le rate limiting
const rateLimitStore = new Map<string, RateLimitEntry>();

// Configuration par service
const RATE_LIMITS: Record<string, { limit: number; window: number }> = {
  votz: { limit: 50, window: 3600000 }, // 50 req/heure
  revirada: { limit: 100, window: 3600000 }, // 100 req/heure
  tts: { limit: 200, window: 3600000 }, // 200 req/heure
  translate: { limit: 1000, window: 3600000 }, // 1000 req/heure
  pexels: { limit: 100, window: 3600000 }, // 100 req/heure
  elevenlabs: { limit: 30, window: 3600000 } // 30 req/heure (plus restrictif)
};

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  limit: number;
}

/**
 * Vérifie et applique le rate limiting pour un utilisateur et un service
 */
export async function rateLimit(
  userId: string,
  service: string
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[service];
  if (!config) {
    // Si le service n'est pas configuré, on autorise
    return {
      allowed: true,
      remaining: Infinity,
      resetTime: 0,
      limit: Infinity
    };
  }

  const key = `${userId}:${service}`;
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Si pas d'entrée ou si la fenêtre est expirée
  if (!entry || now > entry.resetTime) {
    const newEntry: RateLimitEntry = {
      count: 1,
      resetTime: now + config.window
    };
    rateLimitStore.set(key, newEntry);
    
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetTime: newEntry.resetTime,
      limit: config.limit
    };
  }

  // Si on a atteint la limite
  if (entry.count >= config.limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
      limit: config.limit
    };
  }

  // Incrémenter le compteur
  entry.count++;
  rateLimitStore.set(key, entry);

  return {
    allowed: true,
    remaining: config.limit - entry.count,
    resetTime: entry.resetTime,
    limit: config.limit
  };
}

/**
 * Nettoie les entrées expirées du store
 * À appeler périodiquement pour éviter les fuites mémoire
 */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}

// Nettoyage automatique toutes les 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);
