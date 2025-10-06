#!/bin/bash

# Test ElevenLabs Appwrite Function
# Script sécurisé avec variables d'environnement

# Configuration (remplacez par vos valeurs)
export PROJECT_ID="ankilang"
export FUNCTION_ID="68e3951700118da88425"
export API_KEY="standard_25d9b00d14351eb98cb78db1fbad52b99a76280760ba755d1df54b4d3d9d05019b4559e7d83e99dcfe8ffcd2dd5d612d4fdad7288b9d908564f16db53f71e59bba15a55702a771c0328de9a08e7f674b4bc94c7b574c35de21dcdeb2142ed69fc51e0e17e2a2e9957c53517a7889d23695a22c74990b9968c2a7fbef7b9a0844"

echo "🧪 Test ElevenLabs Appwrite Function"
echo "====================================="
echo ""

# Vérifier les prérequis
if ! command -v jq &> /dev/null; then
    echo "❌ jq n'est pas installé. Installez-le avec: brew install jq"
    exit 1
fi

if ! command -v base64 &> /dev/null; then
    echo "❌ base64 n'est pas disponible"
    exit 1
fi

echo "✅ Prérequis vérifiés"
echo ""

# 1) Lancer l'exécution
echo "🚀 Lancement de l'exécution..."
EXEC=$(curl -s -X POST "https://cloud.appwrite.io/v1/functions/$FUNCTION_ID/executions" \
  -H "X-Appwrite-Project: $PROJECT_ID" \
  -H "X-Appwrite-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Bonjour Appwrite depuis curl",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  }')

# Vérifier si la requête a réussi
if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la création de l'exécution"
    exit 1
fi

EXEC_ID=$(echo "$EXEC" | jq -r '."$id"')
STATUS=$(echo "$EXEC" | jq -r '.status')

echo "📋 Execution ID: $EXEC_ID"
echo "📊 Status initial: $STATUS"
echo ""

# 2) Poll jusqu'à complétion (max 30s)
echo "⏳ Attente de la complétion..."
ATTEMPTS=0
while [[ "$STATUS" == "waiting" || "$STATUS" == "processing" ]]; do
    if [[ $ATTEMPTS -ge 30 ]]; then
        echo "❌ Timeout d'exécution (30s)"
        exit 1
    fi
    
    sleep 1
    EXEC=$(curl -s "https://cloud.appwrite.io/v1/functions/$FUNCTION_ID/executions/$EXEC_ID" \
      -H "X-Appwrite-Project: $PROJECT_ID" \
      -H "X-Appwrite-Key: $API_KEY")
    
    STATUS=$(echo "$EXEC" | jq -r '.status')
    ((ATTEMPTS++))
    
    echo "🔄 Tentative $ATTEMPTS/30 - Status: $STATUS"
done

echo ""
echo "📊 Status final: $STATUS"
echo ""

# 3) Si OK, extraire l'audio base64 et enregistrer en MP3
if [[ "$STATUS" == "completed" ]]; then
    echo "✅ Exécution réussie !"
    echo ""
    
    # Extraire la réponse JSON
    RESPONSE=$(echo "$EXEC" | jq -r '.response')
    echo "📋 Réponse brute: $RESPONSE"
    echo ""
    
    # Parser la réponse JSON et extraire l'audio
    AUDIO_BASE64=$(echo "$RESPONSE" | jq -r '.audio')
    
    if [[ "$AUDIO_BASE64" != "null" && "$AUDIO_BASE64" != "" ]]; then
        echo "🎵 Extraction de l'audio..."
        echo "$AUDIO_BASE64" | base64 --decode > output.mp3
        
        # Vérifier la taille du fichier
        FILE_SIZE=$(stat -f%z output.mp3 2>/dev/null || stat -c%s output.mp3 2>/dev/null || echo "0")
        echo "✅ Audio enregistré: output.mp3 (${FILE_SIZE} bytes)"
        echo ""
        
        # Afficher les métadonnées
        echo "📊 Métadonnées:"
        echo "$RESPONSE" | jq -r '{
            success: .success,
            contentType: .contentType,
            size: .size,
            voiceId: .voiceId,
            modelId: .modelId,
            text: .text
        }'
        
    else
        echo "❌ Pas d'audio dans la réponse"
        echo "Réponse complète:"
        echo "$RESPONSE" | jq .
    fi
    
else
    echo "❌ Échec d'exécution:"
    echo "$EXEC" | jq -r '.response'
    exit 1
fi

echo ""
echo "🎉 Test terminé avec succès !"
