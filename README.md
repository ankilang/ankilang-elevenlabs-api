# Ankilang ElevenLabs API - Appwrite Function

> Fonction Appwrite pour la génération de texte vers parole (TTS) avec ElevenLabs

## 🎯 Vue d'ensemble

Cette fonction Appwrite sert de proxy sécurisé pour l'API ElevenLabs, permettant la génération de texte vers parole dans l'application Ankilang.

## 📁 Structure du projet

```
ankilang-elevenlabs-api/
├── appwrite-function/           # Fonction Appwrite
│   ├── src/
│   │   └── index.js            # Fonction principale
│   ├── package.json           # Dépendances (aucune)
│   ├── README.md              # Documentation
│   ├── DEPLOYMENT.md          # Guide de déploiement
│   └── frontend-example.js    # Exemple d'intégration
├── MIGRATION_GUIDE.md          # Guide de migration
└── README.md                   # Ce fichier
```

## 🚀 Déploiement

### 1. Prérequis
- Compte Appwrite
- Clé API ElevenLabs
- Runtime Node.js 18/20/22 (testé en Node 22)

### 2. Configuration
1. **Créez** une fonction dans Appwrite
2. **Uploadez** le contenu du dossier `appwrite-function/` en ZIP (index.js + package.json à la racine)
3. **Configurez** la variable `ELEVENLABS_API_KEY`
4. **Activez** la fonction

### 3. Test
```json
{
  "text": "Bonjour Appwrite",
  "voice_id": "21m00Tcm4TlvDq8ikWAM"
}
```

## 🎯 Avantages

- ✅ **Pas de CORS** : Même domaine que votre backend
- ✅ **Authentification native** : JWT Appwrite
- ✅ **Code simplifié** : 88 lignes vs 240 lignes
- ✅ **Intégration unifiée** : Écosystème Appwrite
- ✅ **Performance** : Fetch natif Node 18+

## 📋 Utilisation

### Frontend (JavaScript)
```javascript
const execution = await functions.createExecution(
  'ankilang-elevenlabs-api',
  JSON.stringify({
    text: "Hello, this is a test.",
    voice_id: "21m00Tcm4TlvDq8ikWAM"
  })
);
```

### Paramètres
- `text` (requis) : Texte à convertir
- `voice_id` (requis) : ID de la voix ElevenLabs
- `model_id` (optionnel) : Modèle à utiliser
- `language_code` (optionnel) : Code langue
- `voice_settings` (optionnel) : Paramètres de voix

### Réponse
```json
{
  "success": true,
  "audio": "base64_encoded_audio_data...",
  "contentType": "audio/mpeg",
  "size": 12345,
  "voiceId": "21m00Tcm4TlvDq8ikWAM",
  "modelId": "eleven_multilingual_v2",
  "text": "Hello, this is a test."
}
```

## 🔧 Développement

### Structure de la fonction
- **Context Object** : Compatible Appwrite v1.x
- **Fetch natif** : Node 18+ (pas de dépendances)
- **Logs détaillés** : Debugging facile
- **Gestion d'erreurs** : Robuste et claire

### Variables d'environnement
- `ELEVENLABS_API_KEY` : Clé API ElevenLabs

## 📚 Documentation

- **`appwrite-function/README.md`** : Documentation complète
- **`appwrite-function/DEPLOYMENT.md`** : Guide de déploiement
- **`appwrite-function/frontend-example.js`** : Exemple d'intégration
- **`MIGRATION_GUIDE.md`** : Guide de migration Netlify → Appwrite

## 🎉 Migration terminée

Cette fonction remplace l'ancienne fonction Netlify avec :
- **Élimination des problèmes CORS**
- **Authentification simplifiée**
- **Code plus maintenable**
- **Intégration native Appwrite**

## 📞 Support

En cas de problème :
1. Consultez `appwrite-function/DEPLOYMENT.md`
2. Vérifiez les logs Appwrite
3. Testez avec l'exemple fourni
4. Contactez l'équipe si nécessaire

---

**Fonction prête pour la production !** 🚀