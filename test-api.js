#!/usr/bin/env node

/**
 * Script de test pour l'API ElevenLabs
 */

const API_URL = 'https://ankilangelevenlabs.netlify.app/.netlify/functions/elevenlabs';

async function testAPI() {
  console.log('🧪 Test de l\'API ElevenLabs');
  console.log('============================\n');

  // Test 1: Sans authentification (doit retourner 401)
  console.log('1️⃣ Test sans authentification...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: "Bonjour, ceci est un test.",
        voice_id: "21m00Tcm4TlvDq8ikWAM"
      })
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Erreur: ${error.message}\n`);
  }

  // Test 2: Avec JWT factice (doit retourner 401)
  console.log('2️⃣ Test avec JWT factice...');
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer fake-jwt-token',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: "Bonjour, ceci est un test.",
        voice_id: "21m00Tcm4TlvDq8ikWAM"
      })
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Erreur: ${error.message}\n`);
  }

  // Test 3: Vérification des headers CORS
  console.log('3️⃣ Test des headers CORS...');
  try {
    const response = await fetch(API_URL, {
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://ankilang.netlify.app'
      }
    });
    
    console.log(`   Status: ${response.status}`);
    console.log(`   CORS Headers:`);
    console.log(`   - Access-Control-Allow-Origin: ${response.headers.get('Access-Control-Allow-Origin')}`);
    console.log(`   - Access-Control-Allow-Methods: ${response.headers.get('Access-Control-Allow-Methods')}`);
    console.log(`   - Access-Control-Allow-Headers: ${response.headers.get('Access-Control-Allow-Headers')}\n`);
  } catch (error) {
    console.log(`   Erreur: ${error.message}\n`);
  }

  // Test 4: Test avec méthode GET (doit retourner 405)
  console.log('4️⃣ Test avec méthode GET...');
  try {
    const response = await fetch(API_URL, {
      method: 'GET'
    });
    
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Response: ${JSON.stringify(data, null, 2)}\n`);
  } catch (error) {
    console.log(`   Erreur: ${error.message}\n`);
  }

  console.log('✅ Tests terminés !');
  console.log('\n📝 Pour activer le mode test sans JWT:');
  console.log('   Ajoutez TEST_MODE=true dans les variables d\'environnement Netlify');
}

testAPI().catch(console.error);
