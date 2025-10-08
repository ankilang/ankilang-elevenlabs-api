// index.js (CommonJS)
const { Client, Storage, InputFile } = require('node-appwrite');

const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY;
const APPWRITE_PROJECT_ID = process.env.APPWRITE_PROJECT_ID || 'ankilang';
const APPWRITE_ENDPOINT   = (process.env.APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1').replace(/\/+$/,'');
const APPWRITE_API_KEY    = process.env.APPWRITE_API_KEY; // clé serveur (pour Storage)
const APPWRITE_BUCKET_ID  = process.env.APPWRITE_BUCKET_ID || 'flashcard-images';

const ELEVEN_TTS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';

function toISO639_1(lang) {
  if (!lang) return undefined;
  const two = String(lang).toLowerCase().split('-')[0];
  return two && two.length === 2 ? two : undefined;
}

async function readJsonBody(req) {
  // 1) body string
  if (typeof req.body === 'string' && req.body.trim()) {
    try { return JSON.parse(req.body); } catch {}
  }
  // 2) bodyRaw
  if (req.bodyRaw) {
    try {
      const s = Buffer.isBuffer(req.bodyRaw) ? req.bodyRaw.toString('utf8') : String(req.bodyRaw);
      if (s.trim()) return JSON.parse(s);
    } catch {}
  }
  // 3) payload (ancien Open Runtimes)
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
    if (req.method !== 'POST') {
      return res.json({ success: false, error: 'Method Not Allowed' }, 405);
    }

    if (!ELEVENLABS_API_KEY) {
      error('Missing ELEVENLABS_API_KEY');
      return res.json({ success: false, error: 'Server not configured' }, 500);
    }

    const data = await readJsonBody(req);
    const {
      text,
      voice_id,
      model_id,         // facultatif (ex: 'eleven_multilingual_v2' ou 'eleven_turbo_v2_5')
      language_code,    // 'fr', 'fr-FR' → on normalise vers 'fr'
      voice_settings,   // { stability, similarity_boost }
      output_format,    // ex: 'mp3_22050_64', 'mp3_44100_128'
      save_to_storage,  // boolean
      speaking_rate     // facultatif, vitesse de parole (défaut: 0.8)
    } = data;

    if (!text || !voice_id) {
      return res.json({ success: false, error: "Missing 'text' or 'voice_id'" }, 400);
    }
    if (String(text).length > 5000) {
      return res.json({ success: false, error: 'Text too long (max 5000 chars)' }, 400);
    }

    const lang2 = toISO639_1(language_code); // 'fr-FR' -> 'fr'
    const modelToUse = model_id || 'eleven_multilingual_v2';
    const formatToUse = output_format || 'mp3_22050_64'; // léger par défaut pour preview
    
    // Force la vitesse de parole à 0.8x par défaut pour une meilleure compréhension
    const RATE = Number.isFinite(speaking_rate) ? Number(speaking_rate) : 0.8;

    log(`🚀 ElevenLabs REST start`);
    log(`📋 Request: text_len=${String(text).length}, voice=${voice_id}, lang=${lang2 || 'auto'}, model=${modelToUse}, fmt=${formatToUse}, rate=${RATE}`);

    // Appel REST ElevenLabs
    const url = `${ELEVEN_TTS_URL}/${voice_id}`;
    const payload = {
      text,
      model_id: modelToUse,
      // language_code: lang2 (mettre seulement si défini)
      ...(lang2 ? { language_code: lang2 } : {}),
      ...(formatToUse ? { output_format: formatToUse } : {}),
      
      // Configuration de la vitesse de parole pour une meilleure compréhension
      generation_config: {
        speaking_rate: RATE,  // 0.8x par défaut pour ralentir la parole
      },
      
      // Fallback pour compatibilité avec les anciennes versions d'API
      voice_settings: {
        ...(voice_settings || {}),
        speed: RATE,  // alias pour compatibilité
      }
    };

    const upstream = await fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const bodyText = await upstream.text();
      error(`❌ ElevenLabs ${upstream.status}: ${bodyText}`);
      // renvoie un JSON uniforme
      return res.json({
        success: false,
        error: 'Upstream error',
        status: upstream.status,
        details: tryParseJson(bodyText) || bodyText?.slice(0, 800)
      }, 502);
    }

    // ElevenLabs renvoie directement l'audio binaire (selon endpoint) OU un JSON base64 sur certains endpoints.
    // L'endpoint text-to-speech renvoie du binaire → on lit un ArrayBuffer.
    const arrayBuf = await upstream.arrayBuffer();
    const buf = Buffer.from(arrayBuf);
    const size = buf.byteLength;

    // Déduit un content-type raisonnable selon output_format
    const contentType = guessContentType(formatToUse); // 'audio/mpeg' par défaut

    // Mode 1: pré-écoute → renvoie base64
    if (!save_to_storage) {
      const b64 = buf.toString('base64');
      log(`✅ Pré-écoute: audio base64 length=${b64.length}, size=${size} bytes`);
      
      const response = {
        success: true,
        audio: b64,
        contentType,
        size
      };
      
      log(`📤 Response JSON: ${JSON.stringify({ success: response.success, contentType: response.contentType, size: response.size, audioLength: response.audio.length })}`);
      
      return res.json(response, 200);
    }

    // Mode 2: upload Storage
    if (!APPWRITE_API_KEY) {
      error('save_to_storage=true mais APPWRITE_API_KEY manquant');
      return res.json({ success: false, error: 'Storage not configured' }, 500);
    }

    const appwrite = new Client()
      .setEndpoint(APPWRITE_ENDPOINT)
      .setProject(APPWRITE_PROJECT_ID)
      .setKey(APPWRITE_API_KEY);

    const storage = new Storage(appwrite);
    const filename = `tts_${Date.now()}.${formatToUse.startsWith('mp3') ? 'mp3' : 'bin'}`;

    const created = await storage.createFile(
      APPWRITE_BUCKET_ID,
      'unique()',
      InputFile.fromBuffer(buf, filename)
    );

    // URL de lecture (si bucket public)
    const fileId = created.$id;
    const fileUrl = `${APPWRITE_ENDPOINT}/storage/buckets/${APPWRITE_BUCKET_ID}/files/${fileId}/view?project=${APPWRITE_PROJECT_ID}`;

    log(`✅ Storage upload: fileId=${fileId}, size=${size} bytes`);
    
    const response = {
      success: true,
      fileId,
      fileUrl,
      contentType,
      size
    };
    
    log(`📤 Response JSON: ${JSON.stringify({ success: response.success, fileId: response.fileId, contentType: response.contentType, size: response.size })}`);
    
    return res.json(response, 200);

  } catch (e) {
    context.error?.(`💥 Internal: ${e.stack || e.message}`);
    return res.json({ success: false, error: 'Internal server error', details: e.message }, 500);
  }
};

function tryParseJson(s) {
  try { return JSON.parse(s); } catch { return null; }
}

function guessContentType(format) {
  // ElevenLabs: 'mp3_22050_64', 'mp3_44100_128', 'wav_44100', etc.
  if (!format) return 'audio/mpeg';
  const f = String(format).toLowerCase();
  if (f.startsWith('mp3')) return 'audio/mpeg';
  if (f.startsWith('wav')) return 'audio/wav';
  if (f.startsWith('ogg')) return 'audio/ogg';
  return 'audio/mpeg';
}