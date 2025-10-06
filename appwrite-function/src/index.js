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
    console.log('🚀 Fonction ElevenLabs démarrée');
    console.log('📥 Méthode:', req.method);
    console.log('📦 Body:', typeof req.body, req.body);

    // 1. Vérifier la méthode de la requête
    if (req.method !== 'POST') {
      console.log('❌ Méthode non autorisée:', req.method);
      return res.send('Veuillez utiliser une requête POST.', 405);
    }

    // 2. Récupérer les données du corps de la requête
    let requestData;
    try {
      if (typeof req.body === 'string') {
        requestData = JSON.parse(req.body);
      } else if (req.body && typeof req.body === 'object') {
        requestData = req.body;
      } else {
        throw new Error('Body de requête invalide');
      }
    } catch (parseError) {
      console.log('❌ Erreur de parsing JSON:', parseError.message);
      return res.send('Format JSON invalide dans le corps de la requête.', 400);
    }

    console.log('📋 Données parsées:', requestData);

    const { text, voice_id, model_id, language_code, voice_settings } = requestData;

    // 3. Validation des paramètres requis
    if (!text || !voice_id) {
      console.log('❌ Paramètres manquants:', { text: !!text, voice_id: !!voice_id });
      return res.send('Le texte et l\'ID de la voix sont requis.', 400);
    }

    // 4. Vérifier la clé API
    if (!ELEVENLABS_API_KEY) {
      console.log('❌ Clé API ElevenLabs manquante');
      return res.send('La clé API n\'est pas configurée côté serveur.', 500);
    }

    console.log('✅ Validation réussie, appel ElevenLabs...');

    // 5. Configuration de la requête ElevenLabs
    const url = `${ENDPOINT}/${voice_id}`;
    const payload = {
      text: text,
      model_id: model_id || 'eleven_multilingual_v2',
      voice_settings: voice_settings || {
        stability: 0.5,
        similarity_boost: 0.8
      }
    };

    if (language_code) {
      payload.language_code = language_code;
    }

    console.log('🌐 URL ElevenLabs:', url);
    console.log('📤 Payload:', JSON.stringify(payload, null, 2));

    // 6. Appel à l'API ElevenLabs
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    console.log('📡 Réponse ElevenLabs:', response.status, response.statusText);

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('❌ Erreur ElevenLabs:', response.status, errorBody);
      return res.send(`Erreur de l'API externe: ${response.status}`, 502);
    }

    // 7. Récupération de l'audio
    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    console.log('🎵 Audio généré:', {
      size: audioBuffer.byteLength,
      base64Length: audioBase64.length
    });

    // 8. Retour de la réponse
    const result = {
      success: true,
      audio: audioBase64,
      contentType: 'audio/mpeg',
      size: audioBuffer.byteLength,
      duration: Math.round(audioBuffer.byteLength / 16000), // Estimation
      voiceId: voice_id,
      modelId: model_id || 'eleven_multilingual_v2',
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    };

    console.log('✅ Succès:', {
      success: result.success,
      size: result.size,
      duration: result.duration
    });

    return res.send(JSON.stringify(result), 200, {
      'Content-Type': 'application/json'
    });

  } catch (error) {
    console.error('💥 Erreur interne:', error);
    return res.send(JSON.stringify({
      success: false,
      error: 'Erreur interne du serveur.',
      details: error.message
    }), 500, {
      'Content-Type': 'application/json'
    });
  }
};