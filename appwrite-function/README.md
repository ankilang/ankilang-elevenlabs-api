# Fonction Appwrite ElevenLabs pour Ankilang

## 📋 Description

Cette fonction Appwrite remplace la fonction Netlify pour l'API ElevenLabs. Elle permet de générer de l'audio à partir de texte en utilisant l'API ElevenLabs, avec une authentification native Appwrite.

## 🚀 Avantages de la migration

- ✅ **Pas de CORS** : Même domaine que votre backend Appwrite
- ✅ **Authentification native** : Utilise les sessions Appwrite existantes
- ✅ **Plus simple** : Moins de complexité que Netlify Functions
- ✅ **Intégration native** : Fonctionne directement avec l'écosystème Appwrite

## 📁 Structure

```
appwrite-function/
├── index.js              # Fonction principale
├── package.json          # Dépendances (aucune)
└── README.md            # Documentation
```

## 🔧 Configuration

### Variables d'environnement requises

Dans la console Appwrite, ajoutez ces variables à votre fonction :

- `ELEVENLABS_API_KEY` : Votre clé API ElevenLabs

### Dépendances

- **Aucune** : Utilise fetch natif Node 18+ (pas de dépendances externes)

## 📡 Utilisation

### Endpoint

```
POST https://fra.cloud.appwrite.io/v1/functions/{functionId}/executions
```

### Requête REST (cURL)
> IMPORTANT : le payload doit être passé dans le champ **`body`** (string JSON).
```bash
export PROJECT_ID="ankilang"
export FUNCTION_ID="<your-function-id>"
export API_KEY="<server-key-with-functions.execute>"
export APPWRITE_HOST="https://fra.cloud.appwrite.io"

BODY='{"text":"Bonjour Appwrite via curl","voice_id":"21m00Tcm4TlvDq8ikWAM"}'

curl -s -X POST "$APPWRITE_HOST/v1/functions/$FUNCTION_ID/executions" \
  -H "X-Appwrite-Project: $PROJECT_ID" \
  -H "X-Appwrite-Key: $API_KEY" \
  -H "Content-Type: application/json" \
  -d "$(jq -nc --arg body "$BODY" '{body:$body}')"
```

### Body de la requête

```json
{
  "text": "Hello, this is a test of ElevenLabs text-to-speech.",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model_id": "eleven_turbo_v2_5",
  "language_code": "en",
  "voice_settings": {
    "stability": 0.5,
    "similarity_boost": 0.75
  }
}
```

### Réponse

```json
{
  "success": true,
  "audio": "base64_encoded_audio_data",
  "contentType": "audio/mpeg",
  "size": 12345,
  "duration": 1500,
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_turbo_v2_5",
  "languageCode": "en"
}
```

## 🔄 Migration depuis Netlify

### Changements dans le frontend

1. **URL** : Remplacer l'URL Netlify par l'URL Appwrite Functions
2. **Authentification** : Utiliser les sessions Appwrite natives
3. **Headers** : Plus besoin de headers CORS personnalisés

### Exemple de migration

```javascript
// AVANT (Netlify)
const response = await fetch('https://ankilangelevenlabs.netlify.app/.netlify/functions/elevenlabs', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Session-Id': sessionId,
    'X-User-Id': userId
  },
  body: JSON.stringify({ text, voice_id })
});

// APRÈS (Appwrite)
const response = await functions.createExecution(
  '68e3951700118da88425', // ID de votre fonction (remplacer par l'ID réel)
  JSON.stringify({ text, voice_id })
);
```

## 🛠️ Déploiement

1. **Créer la fonction** dans la console Appwrite
2. **Uploader le code** (ZIP avec `index.js` + `package.json` à la racine)
3. **Configurer les variables** d'environnement
4. **Configurer les permissions** (autoriser l'exécution pour les utilisateurs authentifiés)
5. **Activer la fonction**
6. **Tester** avec l'endpoint fourni

## 🔒 Sécurité

- ✅ Authentification Appwrite native
- ✅ Validation des paramètres
- ✅ Timeout de 30 secondes
- ✅ Limitation de la taille du texte (5000 caractères)
- ✅ Gestion d'erreurs robuste

## 📊 Monitoring

La fonction inclut des logs pour :
- ✅ Succès des requêtes
- ❌ Erreurs API ElevenLabs
- ⏱️ Durée d'exécution
- 📊 Taille des fichiers audio

## 🎯 Prochaines étapes

1. Déployer cette fonction sur Appwrite
2. Modifier le frontend pour utiliser l'API Appwrite
3. Tester la migration complète
4. Supprimer l'ancienne fonction Netlify
