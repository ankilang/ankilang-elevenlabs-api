/**
 * Appwrite Function: ElevenLabs TTS (Node 18+)
 * Compatible avec le "context object" Appwrite
 */
const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const ENDPOINT = 'https://api.elevenlabs.io/v1/text-to-speech';

// Parseur défensif du body (gère Appwrite selon versions / runtimes)
async function readJsonBody(req, log) {
  log('🔍 Debugging req object:');
  log('req.body type:', typeof req.body);
  log('req.body value:', req.body);
  log('req.bodyRaw type:', typeof req.bodyRaw);
  log('req.bodyRaw value:', req.bodyRaw);
  log('req.payload type:', typeof req.payload);
  log('req.payload value:', req.payload);
  log('req keys:', Object.keys(req));

  // 1) Si Appwrite t'a déjà donné une string JSON
  if (typeof req.body === 'string' && req.body.trim()) {
    log('📝 Trying req.body as string');
    try { 
      const parsed = JSON.parse(req.body);
      log('✅ Parsed from req.body:', parsed);
      return parsed;
    } catch (e) {
      log('❌ Failed to parse req.body:', e.message);
    }
  }

  // 2) Certains runtimes exposent un Buffer/Uint8Array
  if (req.bodyRaw) {
    log('📝 Trying req.bodyRaw');
    try {
      const text = Buffer.isBuffer(req.bodyRaw)
        ? req.bodyRaw.toString('utf8')
        : String(req.bodyRaw);
      if (text.trim()) {
        const parsed = JSON.parse(text);
        log('✅ Parsed from req.bodyRaw:', parsed);
        return parsed;
      }
    } catch (e) {
      log('❌ Failed to parse req.bodyRaw:', e.message);
    }
  }

  // 3) Ancien champ 'payload' (string)
  if (typeof req.payload === 'string' && req.payload.trim()) {
    log('📝 Trying req.payload');
    try { 
      const parsed = JSON.parse(req.payload);
      log('✅ Parsed from req.payload:', parsed);
      return parsed;
    } catch (e) {
      log('❌ Failed to parse req.payload:', e.message);
    }
  }

  // 4) Ultime tentative : si req.body est déjà un objet
  if (req.body && typeof req.body === 'object') {
    log('✅ Using req.body as object:', req.body);
    return req.body;
  }

  // Rien de parsable → objet vide
  log('❌ No parseable data found');
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

    const data = await readJsonBody(req, log);
    log('📦 Data parsed:', JSON.stringify(data));
    
    if (!data || typeof data !== 'object') {
      log('❌ Invalid JSON body');
      return res.text('Invalid JSON body', 400);
    }

    const { text, voice_id, model_id, language_code, voice_settings } = data;

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

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!r.ok) {
      const errText = await r.text().catch(() => '');
      error(`❌ ElevenLabs ${r.status}: ${errText}`);
      return res.text(`Upstream error ${r.status}`, 502);
    }

    const audioArrayBuffer = await r.arrayBuffer();
    const audioBase64 = Buffer.from(audioArrayBuffer).toString('base64');

    return res.json({
      success: true,
      audio: audioBase64,
      contentType: 'audio/mpeg',
      size: audioArrayBuffer.byteLength,
      voiceId: voice_id,
      modelId: payload.model_id,
      text: text.length > 100 ? `${text.slice(0, 100)}...` : text
    }, 200);
  } catch (e) {
    error(`💥 Internal error: ${e.stack || e.message}`);
    return res.json(
      { success: false, error: 'Internal server error', details: e.message },
      500
    );
  }
};