# 🌍 Guide de gestion des langues - ElevenLabs API

## 📋 **Options disponibles**

### **1. Détection automatique (recommandée)**
ElevenLabs détecte automatiquement la langue du texte fourni. **Aucune configuration supplémentaire nécessaire.**

```json
{
  "text": "Bonjour, comment allez-vous ?",
  "voice_id": "21m00Tcm4TlvDq8ikWAM"
}
```
→ **Résultat** : Audio en français avec accent français

### **2. Paramètre `language_code` (expérimental)**
Pour le modèle **Turbo v2.5**, vous pouvez spécifier explicitement la langue :

```json
{
  "text": "Hello, how are you?",
  "voice_id": "21m00Tcm4TlvDq8ikWAM",
  "model_id": "eleven_turbo_v2_5",
  "language_code": "en"
}
```

### **3. Voix natives par langue**
Utilisez des voix natives pour chaque langue pour une meilleure qualité.

## 🔧 **Intégration avec Ankilang**

### **Option A : Détection automatique (simple)**
Quand l'utilisateur sélectionne un thème avec une langue :

```javascript
// Dans votre app principale
const themeLanguage = getThemeLanguage(selectedTheme); // "fr", "en", "es", etc.
const text = translateToLanguage(content, themeLanguage);

// Appel API ElevenLabs
const response = await fetch('/.netlify/functions/elevenlabs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: text, // Texte déjà dans la bonne langue
    voice_id: getVoiceForLanguage(themeLanguage)
  })
});
```

### **Option B : Avec code langue explicite**
Pour plus de contrôle avec Turbo v2.5 :

```javascript
const response = await fetch('/.netlify/functions/elevenlabs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: text,
    voice_id: getVoiceForLanguage(themeLanguage),
    model_id: "eleven_turbo_v2_5",
    language_code: themeLanguage // "fr", "en", "es", etc.
  })
});
```

## 📊 **Codes de langue supportés**

| Code | Langue | Exemple |
|------|--------|---------|
| `en` | Anglais | "Hello, how are you?" |
| `fr` | Français | "Bonjour, comment allez-vous ?" |
| `es` | Espagnol | "Hola, ¿cómo estás?" |
| `de` | Allemand | "Hallo, wie geht es dir?" |
| `it` | Italien | "Ciao, come stai?" |
| `pt` | Portugais | "Olá, como você está?" |
| `nl` | Néerlandais | "Hallo, hoe gaat het?" |
| `pl` | Polonais | "Cześć, jak się masz?" |
| `ru` | Russe | "Привет, как дела?" |
| `ja` | Japonais | "こんにちは、元気ですか？" |
| `ko` | Coréen | "안녕하세요, 어떻게 지내세요?" |
| `zh` | Chinois | "你好，你好吗？" |

## 🎯 **Recommandations par cas d'usage**

### **Pour Ankilang (recommandé)**
```javascript
// 1. Détection automatique - Simple et efficace
const getVoiceForLanguage = (lang) => {
  const voiceMap = {
    'fr': '21m00Tcm4TlvDq8ikWAM', // Voix française
    'en': 'AZnzlk1XvdvUeBnXmlld', // Voix anglaise
    'es': 'EXAVITQu4vr4xnSDxMaL', // Voix espagnole
    // ... autres langues
  };
  return voiceMap[lang] || voiceMap['en']; // Fallback anglais
};

// 2. Appel API simple
const response = await fetch('/.netlify/functions/elevenlabs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: translatedText, // Texte dans la langue du thème
    voice_id: getVoiceForLanguage(themeLanguage)
  })
});
```

### **Pour un contrôle maximal**
```javascript
// Utiliser Turbo v2.5 avec code langue explicite
const response = await fetch('/.netlify/functions/elevenlabs', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    text: text,
    voice_id: getVoiceForLanguage(themeLanguage),
    model_id: "eleven_turbo_v2_5",
    language_code: themeLanguage,
    voice_settings: {
      stability: 0.5,
      similarity_boost: 0.8 // Plus élevé pour une meilleure fidélité
    }
  })
});
```

## 🔍 **Détection de langue côté client (optionnel)**

Si vous voulez détecter automatiquement la langue du texte :

```javascript
// Utiliser une librairie de détection de langue
import { detect } from 'langdetect';

const detectLanguage = (text) => {
  const detected = detect(text);
  return detected[0].lang; // "fr", "en", "es", etc.
};

// Dans votre logique
const userText = "Bonjour, comment allez-vous ?";
const detectedLang = detectLanguage(userText); // "fr"
const voiceId = getVoiceForLanguage(detectedLang);
```

## ⚡ **Performance et qualité**

| Méthode | Performance | Qualité | Complexité |
|---------|-------------|---------|------------|
| **Détection auto** | ⚡⚡⚡ | ⭐⭐⭐ | ⭐ |
| **Code langue** | ⚡⚡ | ⭐⭐⭐⭐ | ⭐⭐ |
| **Voix natives** | ⚡⚡ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ |

## 🚀 **Exemple complet pour Ankilang**

```javascript
// Fonction utilitaire pour Ankilang
const generateTTS = async (text, themeLanguage, jwt) => {
  const voiceMap = {
    'fr': '21m00Tcm4TlvDq8ikWAM',
    'en': 'AZnzlk1XvdvUeBnXmlld',
    'es': 'EXAVITQu4vr4xnSDxMaL',
    'de': 'ErXwobaYiN019PkySvjV',
    'it': 'MF3mGyEYCl7XYWbV9V6O',
    'pt': 'TxGEqnHWrfWFTfGW9XjX',
    'nl': 'VR6AewLTigWG4xSOukaG',
    'pl': 'pNInz6obpgDQGcFmaJgB',
    'ru': 'AZnzlk1XvdvUeBnXmlld',
    'ja': 'AZnzlk1XvdvUeBnXmlld',
    'ko': 'AZnzlk1XvdvUeBnXmlld',
    'zh': 'AZnzlk1XvdvUeBnXmlld'
  };

  const response = await fetch('/.netlify/functions/elevenlabs', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      text: text,
      voice_id: voiceMap[themeLanguage] || voiceMap['en'],
      model_id: "eleven_monolingual_v1", // Ou "eleven_turbo_v2_5" pour plus de langues
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75
      }
    })
  });

  if (!response.ok) {
    throw new Error(`TTS Error: ${response.status}`);
  }

  return response; // Retourne l'audio en base64
};

// Utilisation
const audioResponse = await generateTTS(
  "Bonjour, voici votre leçon d'anglais",
  "fr", // Langue du thème sélectionné
  userJWT
);
```

Cette approche est **simple, efficace et recommandée** pour Ankilang ! 🎉
