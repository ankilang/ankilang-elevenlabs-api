// index.js (fonction Appwrite)
const { ElevenLabsClient } = require("@elevenlabs/elevenlabs-js");

const client = new ElevenLabsClient({
  apiKey: process.env.ELEVENLABS_API_KEY
});

module.exports = async (context) => {
  const { req, res, log, error } = context;

  log('🚀 ElevenLabs function start');
  if (req.method === 'OPTIONS') {
    return res.text('', 204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type,Authorization'
    });
  }

  if (req.method !== 'POST') {
    return res.json({ success: false, error: 'Method Not Allowed' }, 405);
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (e) {
    return res.json({ success: false, error: 'Invalid JSON body' }, 400);
  }

  const { text, voice_id, model_id: reqModel, language_code: reqLang, voice_settings } = body || {};

  if (!text || !voice_id) {
    return res.json({ success: false, error: "Missing 'text' or 'voice_id'" }, 400);
  }

  // Normalisation du code langue
  let lang2 = null;
  if (reqLang) {
    lang2 = String(reqLang).split('-')[0].toLowerCase();
  }

  // Déterminer le modèle à utiliser
  let modelToUse = reqModel;
  if (!modelToUse) {
    if (lang2 && lang2 !== 'en') {
      modelToUse = 'eleven_multilingual_v2';
    } else {
      modelToUse = 'eleven_turbo_v2_5';
    }
  }

  log(`📋 Request: text_length=${text.length}, voice_id=${voice_id}, language_code=${reqLang}, model=${modelToUse}`);

  try {
    // Construire la requête SDK — avec outputFormat
    const request = {
      text,
      modelId: modelToUse,                 // 'eleven_turbo_v2_5' OU 'eleven_multilingual_v2'
      languageCode: lang2 || undefined,    // 'fr', 'de', ...
      voiceSettings: voice_settings || undefined,
      // ⚠️ IMPORTANT: camelCase
      outputFormat: 'mp3_44100_128'
    };

    // Appeler le SDK + logs de structure
    const sdkResp = await client.textToSpeech.convert(voice_id, request);

    // 🔎 Log structure pour comprendre ce que renvoie ta version du SDK
    log('🔎 ElevenLabs SDK resp type:', typeof sdkResp);
    try { log('🔎 ElevenLabs SDK keys:', Object.keys(sdkResp || {})); } catch {}
    try {
      log('🔎 audio typeof:', typeof sdkResp?.audio, 'isBuffer:', Buffer.isBuffer?.(sdkResp?.audio));
      if (sdkResp?.audio && typeof sdkResp?.audio?.byteLength === 'number') {
        log('🔎 audio.byteLength:', sdkResp.audio.byteLength);
      }
      if (sdkResp?.contentType) log('🔎 contentType:', sdkResp.contentType);
    } catch {}

    // Normaliser la réponse audio (tous formats)
    let audioBase64 = null;
    let contentType = sdkResp?.contentType || 'audio/mpeg';

    // cas A: base64 string direct
    if (typeof sdkResp?.audio === 'string') {
      audioBase64 = sdkResp.audio;

    // cas B: Buffer Node.js
    } else if (sdkResp?.audio && Buffer.isBuffer(sdkResp.audio)) {
      audioBase64 = sdkResp.audio.toString('base64');

    // cas C: Uint8Array/ArrayBuffer-like
    } else if (sdkResp?.audio && typeof sdkResp.audio === 'object' && typeof sdkResp.audio.byteLength === 'number') {
      // sdkResp.audio est typé binaire (Uint8Array / ArrayBuffer)
      const buf = Buffer.from(sdkResp.audio);
      audioBase64 = buf.toString('base64');

    // cas D: Response-like (arrayBuffer())
    } else if (sdkResp && typeof sdkResp.arrayBuffer === 'function') {
      const ab = await sdkResp.arrayBuffer();
      audioBase64 = Buffer.from(ab).toString('base64');

    // cas E: parfois l'audio est encapsulé dans data/audio
    } else if (sdkResp?.data?.audio) {
      if (typeof sdkResp.data.audio === 'string') {
        audioBase64 = sdkResp.data.audio;
      } else {
        const buf = Buffer.from(sdkResp.data.audio);
        audioBase64 = buf.toString('base64');
      }
    }

    // si toujours rien → fallback REST
    if (!audioBase64) {
      log('🔄 Fallback to REST API...');
      
      const url = `https://api.elevenlabs.io/v1/text-to-speech/${voice_id}`;
      const payloadRest = {
        text,
        model_id: modelToUse,
        language_code: lang2 || undefined,
        voice_settings: voice_settings || undefined,
        output_format: 'mp3_44100_128'
      };
      
      const r = await fetch(url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'xi-api-key': process.env.ELEVENLABS_API_KEY
        },
        body: JSON.stringify(payloadRest)
      });
      
      if (!r.ok) {
        const t = await r.text();
        error(`❌ Upstream ${r.status}: ${t}`);
        return res.json({ success: false, error: 'Upstream error', status: r.status }, 502);
      }
      
      const ab = await r.arrayBuffer();
      audioBase64 = Buffer.from(ab).toString('base64');
      contentType = 'audio/mpeg';
    }

    return res.json({
      success: true,
      audio: audioBase64,
      contentType,
      voiceId: voice_id,
      modelId: modelToUse
    }, 200);

  } catch (err) {
    error(`❌ ElevenLabs SDK error: ${err.message}`);
    let errMsg = err.message;
    // Si l'erreur provient de la réponse ElevenLabs, essaie de décoder
    try {
      const j = JSON.parse(err.message);
      if (j.detail && j.detail.message) {
        errMsg = j.detail.message;
      }
    } catch (_) {}
    return res.json({ success: false, error: errMsg }, 502);
  }
};