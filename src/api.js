import { CONFIG } from './config.js'

// ── Whisper transcription ──────────────────────────────────────
export async function transcribeAudio(blob) {
  const form = new FormData()
  form.append('file', blob, 'recording.webm')
  form.append('model', 'whisper-1')
  const res = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}` },
    body: form,
  })
  if (!res.ok) throw new Error(`Whisper ${res.status}`)
  const d = await res.json()
  return d.text?.trim() || ''
}

// ── Chat with Claude ───────────────────────────────────────────
// messages = [{ role: 'user'|'assistant', content: string }, ...]
export async function chat(messages) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         CONFIG.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type':      'application/json',
      // Required for browser CORS — uses the direct API
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model:      CONFIG.CLAUDE_MODEL,
      max_tokens: 1024,
      system:     CONFIG.SYSTEM_PROMPT,
      messages:   messages.map(({ role, content }) => ({ role, content })),
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Claude ${res.status}: ${err?.error?.message || 'unknown'}`)
  }
  const d = await res.json()
  return d.content?.[0]?.text?.trim() || ''
}

// ── ElevenLabs TTS — parallel sentence streaming ───────────────
export async function speakText(text, audioElementRef) {
  if (!text?.trim()) return

  const sentences = text.match(/[^.!?\n]+[.!?\n]*/g)?.filter(s => s.trim().length > 1) || [text]

  const fetchBlob = (s) =>
    fetch(`https://api.elevenlabs.io/v1/text-to-speech/${CONFIG.ELEVENLABS_VOICE_ID}?optimize_streaming_latency=4&output_format=mp3_22050_32`, {
      method: 'POST',
      headers: { 'xi-api-key': CONFIG.ELEVENLABS_API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: s.trim(),
        model_id: CONFIG.ELEVENLABS_MODEL,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }).then(r => { if (!r.ok) throw new Error(`ElevenLabs ${r.status}`); return r.blob() })

  // Kick off all sentence fetches in parallel
  const promises = sentences.map(fetchBlob)

  for (let i = 0; i < promises.length; i++) {
    const blob  = await promises[i]
    const url   = URL.createObjectURL(blob)
    const audio = new Audio(url)
    if (audioElementRef) audioElementRef.current = audio
    await new Promise(resolve => {
      audio.onended = () => { URL.revokeObjectURL(url); resolve() }
      audio.onerror = () => { URL.revokeObjectURL(url); resolve() }
      audio.play().catch(resolve)
    })
  }
  if (audioElementRef) audioElementRef.current = null
}
