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
    // Construire l'objet request avec camelCase
    const request = {
      text,                             // string
      modelId: modelToUse,              // ex: 'eleven_turbo_v2_5' ou 'eleven_multilingual_v2'
      languageCode: lang2 || undefined, // 'fr', 'de', … (2 lettres) ou undefined
      voiceSettings: voice_settings || undefined,
      // outputFormat: 'mp3_44100_128', // si tu veux forcer un format
    };

    // ✅ IMPORTANT : 2 arguments (voiceId, request)
    const sdkResp = await client.textToSpeech.convert(voice_id, request);

    // Selon la version du SDK, sdkResp.audio peut être string (base64) ou Buffer/Uint8Array :
    let audioBase64;
    let contentType = 'audio/mpeg';
    if (typeof sdkResp?.audio === 'string') {
      audioBase64 = sdkResp.audio;
      contentType = sdkResp.contentType || contentType;
    } else if (sdkResp?.audio) {
      audioBase64 = Buffer.from(sdkResp.audio).toString('base64');
      contentType = sdkResp.contentType || contentType;
    } else {
      throw new Error('Empty audio from SDK');
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