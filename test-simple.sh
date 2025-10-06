#!/usr/bin/env bash
set -euo pipefail

: "${APPWRITE_HOST:=https://fra.cloud.appwrite.io}"
: "${PROJECT_ID:?PROJECT_ID required}"
: "${FUNCTION_ID:?FUNCTION_ID required}"
: "${API_KEY:?API_KEY required}"

BODY=${1:-'{"text":"Bonjour Appwrite via curl","voice_id":"21m00Tcm4TlvDq8ikWAM"}'}

# Lancer l'exécution
EXEC=$(curl -s -X POST "$APPWRITE_HOST/v1/functions/$FUNCTION_ID/executions" \
  -H "X-Appwrite-Project: $PROJECT_ID" \
  -H "X-Appwrite-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg body "$BODY" '{body:$body}')")

EXEC_ID=$(echo "$EXEC" | jq -r '."$id"')
STATUS=$(echo "$EXEC" | jq -r '.status')
echo "Execution: $EXEC_ID (status: $STATUS)"

# Polling
ATTEMPTS=0
while [[ "$STATUS" == "waiting" || "$STATUS" == "processing" ]]; do
  ((ATTEMPTS++)); [[ $ATTEMPTS -ge 30 ]] && { echo "Timeout"; exit 1; }
  sleep 1
  EXEC=$(curl -s "$APPWRITE_HOST/v1/functions/$FUNCTION_ID/executions/$EXEC_ID" \
    -H "X-Appwrite-Project: $PROJECT_ID" \
    -H "X-Appwrite-Key: $API_KEY")
  STATUS=$(echo "$EXEC" | jq -r '.status')
done
echo "Final status: $STATUS"

if [[ "$STATUS" == "completed" ]]; then
  echo "$EXEC" | jq -r '.response' | jq -r '.audio' | base64 --decode > output.mp3
  echo "✅ output.mp3 écrit"
else
  echo "❌ Echec:"
  echo "$EXEC" | jq -r '.response'
  exit 1
fi