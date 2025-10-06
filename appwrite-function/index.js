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
    const resp = await client.textToSpeech.convert({
      voice_id,
      model_id: modelToUse,
      text,
      language_code: lang2 ? lang2 : undefined,
      voice_settings: voice_settings || undefined
    });

    if (!resp || !resp.audio) {
      throw new Error('Empty audio from SDK');
    }

    // `resp.audio` est base64 déjà selon le SDK (ou buffer selon version) — adapte selon ce que le SDK fournit
    // On suppose `resp.audio` est base64 string
    return res.json({
      success: true,
      audio: resp.audio,
      contentType: resp.getContentType ? resp.getContentType() : 'audio/mpeg',
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