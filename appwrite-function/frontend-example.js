/**
 * Exemple de service frontend pour la fonction Appwrite ElevenLabs
 * À intégrer dans votre application Ankilang
 */

import { Functions } from 'appwrite';

// Configuration Appwrite (à adapter selon votre setup)
const client = new Client()
  .setEndpoint('https://cloud.appwrite.io/v1')
  .setProject('your-project-id');

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
      'ankilang-elevenlabs', // ID de votre fonction
      JSON.stringify(params)
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
        'ankilang-elevenlabs',
        execution.$id
      );
      
      attempts++;
    }

    if (result.status === 'completed') {
      const data = JSON.parse(result.response);
      
      console.log('✅ [Appwrite] Audio généré avec succès:', {
        size: data.size,
        contentType: data.contentType,
        duration: data.duration,
        voiceId: data.voiceId
      });

      // Conversion base64 vers Blob
      const audioData = atob(data.audio);
      const audioArray = new Uint8Array(audioData.length);
      
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      return new Blob([audioArray], { type: data.contentType });
      
    } else if (result.status === 'failed') {
      const error = JSON.parse(result.response);
      throw new Error(`Fonction échouée: ${error.error || 'Erreur inconnue'}`);
      
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

// Export par défaut
export default {
  ttsToBlobAppwrite,
  generateTTS,
  generateTTSAdvanced
};
