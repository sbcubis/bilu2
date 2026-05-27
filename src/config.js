// ─────────────────────────────────────────────
//  BILU2 CONFIG — fill in your keys here
// ─────────────────────────────────────────────

export const CONFIG = {
  // Anthropic Claude — used for chat
  ANTHROPIC_API_KEY: 'REPLACE_ANTHROPIC_API_KEY',
  CLAUDE_MODEL:      'claude-opus-4-5',

  // System prompt
  SYSTEM_PROMPT: `You are a helpful, sharp, and warm personal AI assistant.
You give concise, direct answers. You have personality — you're real, not corporate.
Keep responses conversational and to the point.`,

  // OpenAI Whisper — for voice transcription only
  OPENAI_API_KEY: 'REPLACE_OPENAI_API_KEY',

  // ElevenLabs TTS
  ELEVENLABS_API_KEY:  'REPLACE_ELEVENLABS_API_KEY',
  ELEVENLABS_VOICE_ID: 'HE0XlnHeqQoWUBWhwUa3',
  ELEVENLABS_MODEL:    'eleven_turbo_v2_5',

  // Firebase (Google Auth)
  FIREBASE: {
    apiKey:            'REPLACE_FIREBASE_API_KEY',
    authDomain:        'REPLACE.firebaseapp.com',
    projectId:         'REPLACE_PROJECT_ID',
    storageBucket:     'REPLACE.appspot.com',
    messagingSenderId: 'REPLACE_SENDER_ID',
    appId:             'REPLACE_APP_ID',
  },

  DEFAULT_MEMORY_LIMIT: 10,
}
