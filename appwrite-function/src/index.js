/**
 * Appwrite Function: ElevenLabs TTS (Node 18+)
 * Handler basé sur `context` + parsing body robuste
 */
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

async function readJsonBody(req) {
  // 1) body string JSON
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch {}
  }
  // 2) bodyRaw (Buffer / Uint8Array)
  if (req.bodyRaw) {
    try {
      const text = Buffer.isBuffer(req.bodyRaw) ? req.bodyRaw.toString('utf8') : String(req.bodyRaw);
      if (text.trim()) return JSON.parse(text);
    } catch {}
  }
  // 3) payload (ancien champ)
  if (typeof req.payload === 'string' && req.payload.trim()) {
    try { return JSON.parse(req.payload); } catch {}
  }
  // 4) objet déjà parsé
  if (req.body && typeof req.body === 'object') return req.body;
  return {};
}

module.exports = async (context) => {
  const { req, res, log, error } = context;
  try {
    log('🚀 ElevenLabs function start');
    log(`📥 Method: ${req.method}`);

    if (req.method !== 'POST') {
      return res.text('Use POST', 405);
    }

    const requestData = await readJsonBody(req);
    if (!requestData || typeof requestData !== 'object') {
      return res.text('Invalid JSON body', 400);
    }

    log('📋 Parsed:', JSON.stringify(requestData));

    const { text, voice_id, model_id, language_code, voice_settings } = requestData;

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
      text: text,
      model_id: model_id || 'eleven_multilingual_v2',
      voice_settings: voice_settings || { stability: 0.5, similarity_boost: 0.8 }
    };

    if (language_code) {
      payload.language_code = language_code;
    }

    log(`🌐 ElevenLabs URL: ${url}`);
    log(`📤 Payload: ${JSON.stringify(payload)}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    log(`📡 ElevenLabs: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorBody = await response.text();
      error(`❌ Upstream ${response.status}: ${errorBody}`);
      return res.text(`Upstream error ${response.status}`, 502);
    }

    const audioBuffer = await response.arrayBuffer();
    const audioBase64 = Buffer.from(audioBuffer).toString('base64');

    const result = {
      success: true,
      audio: audioBase64,
      contentType: 'audio/mpeg',
      size: audioBuffer.byteLength,
      voiceId: voice_id,
      modelId: model_id || 'eleven_multilingual_v2',
      text: text.substring(0, 100) + (text.length > 100 ? '...' : '')
    };

    return res.json(result, 200);

  } catch (error) {
    context.error?.(`💥 Internal: ${error.stack || error.message}`);
    return res.json({ success: false, error: 'Internal server error', details: error.message }, 500);
  }
};