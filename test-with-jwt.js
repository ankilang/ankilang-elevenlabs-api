#!/usr/bin/env node

/**
 * Test avec JWT valide d'Appwrite
 */

const API_URL = 'https://ankilangelevenlabs.netlify.app/.netlify/functions/elevenlabs';

// JWT d'exemple (remplacez par un vrai JWT d'Appwrite)
const JWT_TOKEN = 'YOUR_APPWRITE_JWT_TOKEN_HERE';

async function testWithJWT() {
  console.log('🔐 Test avec JWT valide');
  console.log('======================\n');

  if (JWT_TOKEN === 'YOUR_APPWRITE_JWT_TOKEN_HERE') {
    console.log('❌ Veuillez remplacer JWT_TOKEN par un vrai token Appwrite');
    console.log('   Vous pouvez obtenir un JWT via votre application Appwrite');
    return;
  }

  try {
    console.log('🧪 Test de génération audio...');
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${JWT_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: "Bonjour, ceci est un test de synthèse vocale ElevenLabs avec Turbo v2.5.",
        voice_id: "21m00Tcm4TlvDq8ikWAM",
        model_id: "eleven_turbo_v2_5"
      })
    });

    console.log(`Status: ${response.status}`);
    console.log(`Content-Type: ${response.headers.get('content-type')}`);
    console.log(`X-Trace-Id: ${response.headers.get('x-trace-id')}`);

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Audio généré avec succès !');
      console.log(`   Taille: ${data.size} bytes`);
      console.log(`   Type: ${data.contentType}`);
      console.log(`   Durée: ${data.duration}ms`);
      
      if (data.fileUrl) {
        console.log(`   Fichier stocké: ${data.fileUrl}`);
      }
    } else {
      const error = await response.json();
      console.log('❌ Erreur:', error);
    }
  } catch (error) {
    console.log('❌ Erreur réseau:', error.message);
  }
}

testWithJWT();
