/**
 * Appwrite Function: ElevenLabs TTS (Node 18+)
 * Compatible avec le "context object" Appwrite
 */
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

module.exports = async (context) => {
  const { req, res, log, error } = context;

  try {
    log('🚀 ElevenLabs function start');
    log(`📥 Method: ${req.method}`);

    if (req.method !== 'POST') {
      return res.text('Use POST', 405);
    }

    // Appwrite conseille d'utiliser bodyJson()/bodyText(), pas req.body
    // https://appwrite.io/docs/products/functions/develop
    let data;
    try {
      data = await req.bodyJson(); // parse JSON automatiquement
    } catch (e) {
      log(`❌ JSON parse error: ${e.message}`);
      return res.text('Invalid JSON body', 400);
    }

    const { text, voice_id, model_id, language_code, voice_settings } = data || {};

    if (!text || !voice_id) {
      return res.text("Missing 'text' or 'voice_id'", 400);
    }
    if (!ELEVENLABS_API_KEY) {
      error('Missing ELEVENLABS_API_KEY');
      return res.text('Server not configured', 500);
    }
    if (text.length > 5000) {
      return res.text('Text too long (max 5000 chars)', 400);
    }

    const url = `${ENDPOINT}/${voice_id}`;
    const payload = {
      text,
      model_id: model_id || 'eleven_multilingual_v2',
      voice_settings: voice_settings || { stability: 0.5, similarity_boost: 0.8 },
      ...(language_code ? { language_code } : {})
    };

    log(`🌐 ElevenLabs URL: ${url}`);
    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = await r.text();
      error(`❌ ElevenLabs ${r.status}: ${errText}`);
      return res.text(`Upstream error ${r.status}`, 502);
    }

    const audioArrayBuffer = await r.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

    // Durée estimée: optionnel → on peut l'omettre pour éviter l'ambiguïté
    const result = {
      success: true,
      audio: audioBase64,
      contentType: 'audio/mpeg',
      size: audioArrayBuffer.byteLength,
      voiceId: voice_id,
      modelId: payload.model_id,
      text: text.length > 100 ? `${text.slice(0, 100)}...` : text
    };

    return res.json(result, 200);
  } catch (e) {
    error(`💥 Internal error: ${e.stack || e.message}`);
    return res.json(
      { success: false, error: 'Internal server error', details: e.message },
      500
    );
  }
};