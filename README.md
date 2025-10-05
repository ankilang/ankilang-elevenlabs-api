# Ankilang ElevenLabs API

API sécurisée pour la synthèse vocale ElevenLabs, intégrée dans l'écosystème Ankilang.

## 🚀 Fonctionnalités

- **Text-to-Speech** avec ElevenLabs Turbo v2.5 (ultra-rapide, économique)
- **32 langues** supportées avec détection automatique
- **Authentification JWT** via Appwrite
- **Rate limiting** par utilisateur (30 req/heure)
- **Stockage Appwrite** optionnel pour les fichiers audio
- **CORS sécurisé** avec origines autorisées
- **Logs structurés** avec traceId
- **Gestion d'erreurs RFC 7807**
- **Timeout** configuré (30s)

## 📁 Structure du projet

```
ankilang-elevenlabs-api/
├── lib/                          # Bibliothèques communes
│   ├── auth.ts                   # Middleware JWT + validation Appwrite
│   ├── cors.ts                   # CORS sécurisé
│   ├── logging.ts                # Logs structurés avec traceId
│   ├── problem.ts               # Helper RFC 7807
│   └── rate-limit.ts            # Rate limiting par utilisateur
├── netlify/
│   └── functions/
│       └── elevenlabs.ts         # Fonction principale ElevenLabs
├── dist/                         # Build TypeScript (généré)
├── .gitignore
├── env.example
├── netlify.toml
├── package.json
├── tsconfig.json
└── README.md
```

## 🛠️ Installation

```bash
# Cloner le repository
git clone https://github.com/ankilang/ankilang-elevenlabs-api.git
cd ankilang-elevenlabs-api

# Installer les dépendances
npm install

# Copier les variables d'environnement
cp env.example .env
```

## ⚙️ Configuration

### Variables d'environnement

```bash
# ElevenLabs API
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here

# Appwrite (authentification JWT)
APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_project_id
APPWRITE_SELF_SIGNED=false

# Appwrite Storage (pour sauvegarder les fichiers audio)
APPWRITE_API_KEY=your_appwrite_api_key_here
APPWRITE_BUCKET_ID=your_bucket_id_here

# CORS (optionnel)
ALLOWED_ORIGIN=https://ankilang.netlify.app,https://ankilang.com
```

### Configuration Netlify

```bash
# Créer un nouveau site
netlify sites:create --name ankilang-elevenlabs

# Configurer les variables d'environnement
netlify env:set ELEVENLABS_API_KEY your_api_key
netlify env:set APPWRITE_ENDPOINT https://cloud.appwrite.io/v1
netlify env:set APPWRITE_PROJECT_ID your_project_id
```

## 🚀 Déploiement

```bash
# Build du projet
npm run build

# Déploiement en production
netlify deploy --prod
```

## 📖 Utilisation

### Endpoint

```
POST /.netlify/functions/elevenlabs
```

### Headers requis

```
Authorization: Bearer <jwt_token>
Content-Type: application/json
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
  },
  "output_format": "mp3_44100_128",
  "save_to_storage": false
}
```

### 🌍 Gestion des langues

L'API supporte plusieurs méthodes pour gérer les langues :

1. **Détection automatique** (recommandée) : ElevenLabs détecte automatiquement la langue du texte
2. **Code langue explicite** : Utilisez `language_code` avec le modèle Turbo v2.5
3. **Voix natives** : Utilisez des voix natives pour chaque langue

Voir le [Guide des langues](LANGUAGE_GUIDE.md) pour plus de détails.

### Réponse

- **200 OK** : Audio MP3 en base64
- **400 Bad Request** : Paramètres invalides
- **401 Unauthorized** : Token JWT invalide
- **429 Too Many Requests** : Rate limit dépassé
- **500 Internal Server Error** : Erreur serveur

### Headers de réponse

```
Content-Type: audio/mpeg
Content-Disposition: inline; filename="elevenlabs-tts.mp3"
X-Trace-Id: trace_1234567890_abc123
X-Rate-Limit-Remaining: 29
X-Rate-Limit-Reset: 1640995200000
```

## 🔒 Sécurité

- **Authentification JWT** obligatoire via Appwrite
- **Rate limiting** : 30 requêtes/heure par utilisateur
- **CORS** configuré avec origines autorisées
- **Validation Zod** des paramètres d'entrée
- **Timeout** de 30 secondes pour éviter les blocages
- **Logs structurés** pour le monitoring

## 📊 Rate Limiting

| Service | Limite | Fenêtre |
|---------|--------|---------|
| elevenlabs | 30 req | 1 heure |
| votz | 50 req | 1 heure |
| revirada | 100 req | 1 heure |
| tts | 200 req | 1 heure |
| translate | 1000 req | 1 heure |
| pexels | 100 req | 1 heure |

## 🐛 Gestion d'erreurs

Toutes les erreurs suivent le standard RFC 7807 :

```json
{
  "type": "https://ankilang.com/errors/validation-error",
  "title": "Bad Request",
  "detail": "Invalid parameters",
  "traceId": "trace_1234567890_abc123",
  "status": 400,
  "errors": [
    {
      "field": "text",
      "message": "Text is required"
    }
  ]
}
```

## 📝 Logs

Les logs sont structurés au format JSON :

```json
{
  "timestamp": "2024-01-01T12:00:00.000Z",
  "traceId": "trace_1234567890_abc123",
  "service": "elevenlabs",
  "level": "info",
  "message": "request: TTS request received",
  "userId": "user_123",
  "metadata": {
    "textLength": 42,
    "voiceId": "21m00Tcm4TlvDq8ikWAM"
  }
}
```

## 🔧 Développement

```bash
# Mode développement
npm run dev

# Vérification TypeScript
npm run type-check

# Build
npm run build
```

## 📚 Documentation ElevenLabs

- [Documentation officielle](https://elevenlabs.io/docs/overview)
- [API Reference](https://elevenlabs.io/docs/api-reference)
- [Modèles disponibles](https://elevenlabs.io/docs/models)

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature (`git checkout -b feature/amazing-feature`)
3. Commit les changements (`git commit -m 'Add amazing feature'`)
4. Push vers la branche (`git push origin feature/amazing-feature`)
5. Ouvrir une Pull Request

## 📄 Licence

Ce projet est sous licence ISC. Voir le fichier `LICENSE` pour plus de détails.

## 🆘 Support

Pour toute question ou problème :

- 📧 Email : support@ankilang.com
- 🐛 Issues : [GitHub Issues](https://github.com/ankilang/ankilang-elevenlabs-api/issues)
- 📖 Documentation : [Ankilang Docs](https://docs.ankilang.com)
