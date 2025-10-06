/**
 * Service frontend pour l'authentification par session ElevenLabs
 * À copier dans le repo principal ankilang
 */

import { account } from './apps/web/src/services/appwrite';

/**
 * Récupère les informations de session Appwrite
 * Utilisé pour authentifier les requêtes vers les fonctions Netlify
 */
export async function getSessionInfo(): Promise<{ sessionId: string; userId: string } | null> {
  try {
    console.log('🔐 [Appwrite] Tentative de récupération de la session...');
    
    // Vérifier d'abord si l'utilisateur est connecté
    const currentUser = await account.get();
    console.log('👤 [Appwrite] Utilisateur connecté:', {
      id: currentUser.$id,
      email: currentUser.email,
      name: currentUser.name
    });
    
    // Récupérer la session actuelle
    const sessions = await account.listSessions();
    const currentSession = sessions.sessions[0]; // Session la plus récente
    
    if (!currentSession) {
      throw new Error('No active session found');
    }
    
    console.log('🎫 [Appwrite] Session récupérée avec succès:', {
      sessionId: currentSession.$id,
      userId: currentSession.userId,
      expiresAt: currentSession.expiresAt
    });
    
    return {
      sessionId: currentSession.$id,
      userId: currentSession.userId
    };
  } catch (error) {
    console.error('❌ [Appwrite] Échec de récupération de la session:', error);
    return null;
  }
}

/**
 * Envoie une requête TTS avec authentification par session
 */
export async function ttsToBlobSession(
  text: string,
  voiceId: string,
  languageCode?: string
): Promise<Blob> {
  const sessionInfo = await getSessionInfo();
  
  if (!sessionInfo) {
    throw new Error('No active session found');
  }

  console.log('🔐 [ElevenLabs] Récupération de la session pour authentification...');
  console.log('✅ [ElevenLabs] Session récupérée, envoi de la requête TTS...');
  console.log('🎵 Génération TTS ElevenLabs:', `"${text}" (${languageCode || 'auto'})`);

  const response = await fetch('https://ankilangelevenlabs.netlify.app/.netlify/functions/elevenlabs', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Session-Id': sessionInfo.sessionId,
      'X-User-Id': sessionInfo.userId
    },
    body: JSON.stringify({
      text,
      voice_id: voiceId,
      language_code: languageCode
    })
  });

  console.log('📡 [ElevenLabs] Envoi de la requête HTTP:', {
    url: 'https://ankilangelevenlabs.netlify.app/.netlify/functions/elevenlabs',
    method: 'POST',
    hasSession: true,
    sessionIdLength: sessionInfo.sessionId.length,
    userIdLength: sessionInfo.userId.length,
    textLength: text.length,
    voiceId,
    languageCode
  });

  console.log('📡 [ElevenLabs] Réponse reçue:', {
    status: response.status,
    statusText: response.statusText,
    ok: response.ok,
    headers: Object.fromEntries(response.headers.entries())
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Erreur TTS ElevenLabs (${response.status}): ${JSON.stringify(error)}`);
  }

  const data = await response.json();
  const audioData = atob(data.audio);
  const audioArray = new Uint8Array(audioData.length);
  
  for (let i = 0; i < audioData.length; i++) {
    audioArray[i] = audioData.charCodeAt(i);
  }
  
  return new Blob([audioArray], { type: data.contentType });
}
