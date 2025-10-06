/**
 * Fonction Appwrite ElevenLabs pour Ankilang
 * Text-to-Speech avec authentification Appwrite native
 */

const fetch = require('node-fetch');

// Configuration ElevenLabs
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

/**
 * Fonction principale Appwrite
 * @param {Object} req - Requête Appwrite
 * @param {Object} res - Réponse Appwrite
 */
module.exports = async (req, res) => {
  try {
    // 1. Vérifier la méthode de la requête
    if (req.method !== 'POST') {
      return res.json({ error: 'Veuillez utiliser une requête POST.' }, 405);
    }

    // 2. Récupérer les données du corps de la requête
    const { text, voice_id, model_id, language_code, voice_settings } = req.body;

    // 3. Validation des paramètres requis
    if (!text || !voice_id) {
      return res.json({ 
        error: 'Le texte et l\'ID de la voix sont requis.',
        required: ['text', 'voice_id']
      }, 400);
    }

    // 4. Vérifier la clé API
    if (!ELEVENLABS_API_KEY) {
      return res.json({ 
        error: 'La clé API ElevenLabs n\'est pas configurée côté serveur.' 
      }, 500);
    }

    // 5. Validation de la longueur du texte
    if (text.length > 5000) {
      return res.json({ 
        error: 'Le texte est trop long (maximum 5000 caractères).' 
      }, 400);
    }

    // 6. Préparation de la requête ElevenLabs
    const requestBody = {
      text: text,
      model_id: model_id || 'eleven_turbo_v2_5',
      voice_settings: voice_settings || {
        stability: 0.5,
        similarity_boost: 0.5
      }
    };

    // Ajouter le code langue si fourni (pour Turbo v2.5)
    if (language_code) {
      requestBody.language_code = language_code;
    }

    // 7. Appel à l'API ElevenLabs avec timeout
    const startTime = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout

    try {
      const response = await fetch(`${ENDPOINT}/${voice_id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'xi-api-key': ELEVENLABS_API_KEY
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });

      clearTimeout(timeout);
      const duration = Date.now() - startTime;

      if (!response.ok) {
        const errorBody = await response.text();
        console.error(`Erreur de l'API ElevenLabs: ${response.status} ${errorBody}`);
        return res.json({ 
          error: `Erreur de l'API ElevenLabs: ${response.status}`,
          details: errorBody.slice(0, 200)
        }, 502);
      }

      // 8. Récupération de l'audio
      const audioBuffer = await response.arrayBuffer();
      const contentType = response.headers.get('content-type') || 'audio/mpeg';

      // 9. Conversion en base64 pour la réponse
      const base64Audio = Buffer.from(audioBuffer).toString('base64');

      // 10. Logs de succès
      console.log(`✅ Audio généré avec succès: ${audioBuffer.byteLength} bytes en ${duration}ms`);

      // 11. Retour de la réponse avec l'audio
      return res.json({
        success: true,
        audio: base64Audio,
        contentType: contentType,
        size: audioBuffer.byteLength,
        duration: duration,
        voiceId: voice_id,
        modelId: model_id || 'eleven_turbo_v2_5',
        languageCode: language_code || null
      }, 200);

    } catch (fetchError) {
      clearTimeout(timeout);
      
      if (fetchError.name === 'AbortError') {
        console.error('❌ Timeout: Requête ElevenLabs expirée après 30s');
        return res.json({ 
          error: 'Timeout: La requête a expiré après 30 secondes.' 
        }, 504);
      }
      
      throw fetchError;
    }

  } catch (error) {
    console.error('❌ Erreur interne:', error);
    return res.json({ 
      error: 'Erreur interne du serveur.',
      details: error.message 
    }, 500);
  }
};
