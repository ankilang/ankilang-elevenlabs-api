#!/bin/bash

# Test simple pour déboguer le parsing
export PROJECT_ID="ankilang"
export FUNCTION_ID="68e3951700118da88425"
export API_KEY="standard_25d9b00d14351eb98cb78db1fbad52b99a76280760ba755d1df54b4d3d9d05019b4559e7d83e99dcfe8ffcd2dd5d612d4fdad7288b9d908564f16db53f71e59bba15a55702a771c0328de9a08e7f674b4bc94c7b574c35de21dcdeb2142ed69fc51e0e17e2a2e9957c53517a7889d23695a22c74990b9968c2a7fbef7b9a0844"

echo "🧪 Test simple de parsing"
echo "========================="
echo ""

# Test avec un JSON simple
echo "📤 Envoi de la requête..."
RESPONSE=$(curl -s -X POST "https://cloud.appwrite.io/v1/functions/$FUNCTION_ID/executions" \
  -H "X-Appwrite-Project: $PROJECT_ID" \
  -H "X-Appwrite-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"Hello","voice_id":"21m00Tcm4TlvDq8ikWAM"}')

echo "📋 Réponse complète:"
echo "$RESPONSE" | jq .

echo ""
echo "📊 Status:"
echo "$RESPONSE" | jq -r '.status'

echo ""
echo "📝 Logs:"
echo "$RESPONSE" | jq -r '.logs'

echo ""
echo "🔍 Response Body:"
echo "$RESPONSE" | jq -r '.responseBody'

echo ""
echo "📈 Status Code:"
echo "$RESPONSE" | jq -r '.responseStatusCode'
