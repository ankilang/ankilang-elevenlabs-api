/**
 * Exemple de service frontend pour la fonction Appwrite ElevenLabs
 * À intégrer dans votre application Ankilang
 */

import { Client, Functions } from 'appwrite';

// Configuration Appwrite (à adapter selon votre setup)
const FUNCTION_ID = '68e3951700118da88425'; // ID de votre fonction (remplacer par l'ID réel)
const client = new Client()
  .setEndpoint('https://fra.cloud.appwrite.io/v1')
  .setProject('your-project-id'); // ⚠️ REMPLACER par votre PROJECT_ID réel

const functions = new Functions(client);

/**
 * Génère un audio TTS avec la fonction Appwrite
 * @param {string} text - Texte à convertir en audio
 * @param {string} voiceId - ID de la voix ElevenLabs
 * @param {string} languageCode - Code langue (optionnel)
 * @param {string} modelId - Modèle ElevenLabs (optionnel)
 * @param {Object} voiceSettings - Paramètres de voix (optionnel)
 * @returns {Promise<Blob>} - Blob audio
 */
export async function ttsToBlobAppwrite(
  text, 
  voiceId, 
  languageCode = null, 
  modelId = 'eleven_turbo_v2_5',
  voiceSettings = null
) {
  try {
    console.log('🔐 [Appwrite] Tentative de génération TTS...');
    console.log('🎵 Génération TTS ElevenLabs:', `"${text}" (${languageCode || 'auto'})`);

    // Préparation des paramètres
    const params = {
      text,
      voice_id: voiceId,
      model_id: modelId
    };

    if (languageCode) {
      params.language_code = languageCode;
    }

    if (voiceSettings) {
      params.voice_settings = voiceSettings;
    }

    // Appel de la fonction Appwrite
    const execution = await functions.createExecution(
      FUNCTION_ID,
      JSON.stringify(params),
      'POST' // Méthode HTTP requise
    );

    console.log('📡 [Appwrite] Exécution de la fonction:', {
      executionId: execution.$id,
      status: execution.status,
      createdAt: execution.$createdAt
    });

    // Attendre la completion (polling)
    let result = execution;
    const maxAttempts = 30; // 30 secondes max
    let attempts = 0;

    while (result.status === 'waiting' || result.status === 'processing') {
      if (attempts >= maxAttempts) {
        throw new Error('Timeout: La fonction a pris trop de temps à s\'exécuter');
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Attendre 1 seconde
      
      result = await functions.getExecution(
        FUNCTION_ID,
        execution.$id
      );
      
      attempts++;
    }

    if (result.status === 'completed') {
      // Debug: voir un extrait de la réponse brute
      console.log('[TTS] raw response (first 200):', (result.response || '').slice(0, 200));
      
      let data;
      try { 
        data = JSON.parse(result.response || '{}'); 
      } catch { 
        throw new Error(`Réponse invalide (executionId=${exec.$id}): ${result.response?.slice?.(0,200) || '<vide>'}`); 
      }
      
      // Parfois la fonction peut renvoyer autre chose (fallback futur), on couvre:
      const audioB64 =
        data?.audio ||
        data?.data?.audio ||                   // safety
        (typeof data === 'string' && data);    // au cas improbable où on reçoit déjà du base64

      if (!audioB64) {
        throw new Error(`Audio manquant (executionId=${exec.$id})`);
      }
      
      console.log('✅ [Appwrite] Audio généré avec succès:', {
        size: data.size,
        contentType: data.contentType,
        voiceId: data.voiceId,
        modelId: data.modelId
      });

      // Conversion base64 vers Blob
      const audioData = atob(audioB64);
      const audioArray = new Uint8Array(audioData.length);
      
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      return new Blob([audioArray], { type: data.contentType });
      
    } else if (result.status === 'failed') {
      let errorData = {};
      try { errorData = JSON.parse(result.response); } catch { /* noop */ }
      const msg = errorData.error || result.response || 'Erreur inconnue';
      throw new Error(`Fonction échouée: ${msg}`);
      
    } else {
      throw new Error(`Statut inattendu: ${result.status}`);
    }

  } catch (error) {
    console.error('❌ [Appwrite] Erreur TTS:', error);
    throw new Error(`TTS failed: ${error.message}`);
  }
}

/**
 * Version simplifiée pour les cas d'usage basiques
 * @param {string} text - Texte à convertir
 * @param {string} voiceId - ID de la voix
 * @returns {Promise<Blob>} - Blob audio
 */
export async function generateTTS(text, voiceId) {
  return await ttsToBlobAppwrite(text, voiceId);
}

/**
 * Version avec paramètres avancés
 * @param {Object} options - Options de génération
 * @returns {Promise<Blob>} - Blob audio
 */
export async function generateTTSAdvanced(options) {
  const {
    text,
    voiceId,
    languageCode,
    modelId = 'eleven_turbo_v2_5',
    voiceSettings = {
      stability: 0.5,
      similarity_boost: 0.5
    }
  } = options;

  return await ttsToBlobAppwrite(
    text, 
    voiceId, 
    languageCode, 
    modelId, 
    voiceSettings
  );
}

/**
 * Exemple d'utilisation correcte du Blob audio
 * @param {string} text - Texte à convertir
 * @param {string} voiceId - ID de la voix
 */
export async function playTTSExample(text, voiceId) {
  try {
    // Générer l'audio
    const blob = await ttsToBlobAppwrite(text, voiceId);
    
    // Créer une URL pour le Blob
    const url = URL.createObjectURL(blob);
    
    // Jouer l'audio
    const audio = new Audio(url);
    audio.play();
    
    // Nettoyer l'URL après utilisation (optionnel)
    audio.onended = () => URL.revokeObjectURL(url);
    
    // Pour télécharger le fichier (optionnel)
    // const a = document.createElement('a');
    // a.href = url; 
    // a.download = `tts_${Date.now()}.mp3`; 
    // a.click();
    
  } catch (error) {
    console.error('Erreur TTS:', error);
    throw error;
  }
}

// Export par défaut
export default {
  ttsToBlobAppwrite,
  generateTTS,
  generateTTSAdvanced
};
