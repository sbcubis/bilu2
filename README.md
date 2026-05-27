# bilu2

Voice-first personal AI assistant. Tap to talk, get spoken responses, full conversation history.

## Quick start

```
npm install
npm run dev
```

## Config

Edit `src/config.js` and fill in:

- BASE44_API_KEY — Base44 dashboard → Settings
- OPENAI_API_KEY — https://platform.openai.com/api-keys (for Whisper)
- ELEVENLABS_API_KEY — https://elevenlabs.io
- FIREBASE config — https://console.firebase.google.com (enable Google Auth)

## Features

- Tap mic once → listens forever, live transcript on screen
- Tap again → Whisper transcribes → sends to Charlotte May → speaks back
- Review before send toggle → edit modal before submitting
- Conversation history panel (top left)
- Settings menu: memory limit + voice toggle (top right)
- Google login
- Text input fallback
