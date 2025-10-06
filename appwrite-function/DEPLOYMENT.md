# Guide de déploiement - Fonction Appwrite ElevenLabs

## 🎯 Objectif

Ce guide vous accompagne pour déployer la fonction ElevenLabs sur Appwrite et migrer depuis Netlify.

## 📋 Prérequis

- ✅ Compte Appwrite configuré
- ✅ Projet Appwrite existant
- ✅ Clé API ElevenLabs
- ✅ Accès à la console Appwrite

## 🚀 Étapes de déploiement

### 1. Créer la fonction dans Appwrite

1. **Connectez-vous** à [cloud.appwrite.io](https://cloud.appwrite.io)
2. **Sélectionnez** votre projet Ankilang
3. **Allez** dans **Functions** dans le menu de gauche
4. **Cliquez** sur **Create Function**
5. **Configurez** la fonction :
   - **Name** : `ankilang-elevenlabs`
   - **Runtime** : `Node.js`
   - **Version** : `node-18.0` (ou plus récent)

### 2. Uploader le code

1. **Compressez** le dossier `appwrite-function/` en ZIP
2. **Uploadez** le fichier ZIP dans la fonction
3. **Attendez** que le build se termine

### 3. Configurer les variables d'environnement

1. **Allez** dans l'onglet **Settings** de votre fonction
2. **Descendez** jusqu'à la section **Variables**
3. **Ajoutez** la variable :
   - **Key** : `ELEVENLABS_API_KEY`
   - **Value** : `votre_clé_api_elevenlabs`

### 4. Activer la fonction

1. **Retournez** à l'onglet **Overview**
2. **Cliquez** sur **Activate** (la fonction est inactive par défaut)
3. **Attendez** que l'activation se termine

### 5. Tester la fonction

1. **Copiez** l'URL d'exécution depuis l'onglet **Overview**
2. **Testez** avec un outil comme Postman ou curl :

```bash
curl -X POST "https://cloud.appwrite.io/v1/functions/{functionId}/executions" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello, this is a test.",
    "voice_id": "21m00Tcm4TlvDq8ikWAM"
  }'
```

## 🔄 Migration du frontend

### 1. Modifier le service frontend

Remplacez l'ancien service par :

```javascript
// Nouveau service Appwrite
import { Functions } from 'appwrite';

const functions = new Functions(client);

export async function ttsToBlobAppwrite(text, voiceId, languageCode) {
  try {
    const execution = await functions.createExecution(
      'ankilang-elevenlabs', // ID de votre fonction
      JSON.stringify({
        text,
        voice_id: voiceId,
        language_code: languageCode
      })
    );

    if (execution.status === 'completed') {
      const data = JSON.parse(execution.response);
      const audioData = atob(data.audio);
      const audioArray = new Uint8Array(audioData.length);
      
      for (let i = 0; i < audioData.length; i++) {
        audioArray[i] = audioData.charCodeAt(i);
      }
      
      return new Blob([audioArray], { type: data.contentType });
    } else {
      throw new Error(`Function execution failed: ${execution.status}`);
    }
  } catch (error) {
    console.error('TTS Error:', error);
    throw error;
  }
}
```

### 2. Mettre à jour les composants

```javascript
// Remplacer l'ancien import
// import { ttsToBlobSession } from '../services/elevenlabs-session';

// Par le nouveau
import { ttsToBlobAppwrite } from '../services/elevenlabs-appwrite';

// Utilisation
const audioBlob = await ttsToBlobAppwrite(text, voiceId, languageCode);
```

## ✅ Vérification

### Checklist de migration

- [ ] Fonction créée sur Appwrite
- [ ] Code uploadé et build réussi
- [ ] Variables d'environnement configurées
- [ ] Fonction activée
- [ ] Test de la fonction réussi
- [ ] Frontend modifié pour utiliser Appwrite
- [ ] Tests end-to-end réussis
- [ ] Ancienne fonction Netlify supprimée

### Tests recommandés

1. **Test basique** : Génération audio simple
2. **Test avec paramètres** : Différentes voix et langues
3. **Test d'erreur** : Texte trop long, voix invalide
4. **Test de performance** : Temps de réponse
5. **Test d'authentification** : Avec et sans JWT

## 🎯 Avantages obtenus

- ✅ **Plus de CORS** : Même domaine que votre backend
- ✅ **Authentification native** : Sessions Appwrite
- ✅ **Simplicité** : Moins de complexité
- ✅ **Intégration** : Écosystème Appwrite unifié
- ✅ **Monitoring** : Logs et métriques Appwrite

## 🚨 Points d'attention

- **JWT** : Assurez-vous que les JWT sont valides
- **Rate limiting** : ElevenLabs a ses propres limites
- **Timeout** : 30 secondes maximum par requête
- **Taille** : Maximum 5000 caractères de texte

## 📞 Support

En cas de problème :
1. Vérifiez les logs dans la console Appwrite
2. Testez avec des paramètres simples
3. Vérifiez la configuration des variables
4. Consultez la documentation Appwrite Functions
