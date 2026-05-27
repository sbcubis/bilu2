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

// ── Chat with GPT-4o ───────────────────────────────────────────
export async function chat(messages) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${CONFIG.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: CONFIG.OPENAI_MODEL,
      max_tokens: 1024,
      messages: [
        { role: 'system', content: CONFIG.SYSTEM_PROMPT },
        ...messages.map(({ role, content }) => ({ role, content })),
      ],
    }),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`OpenAI ${res.status}: ${err?.error?.message || 'unknown'}`)
  }
  const d = await res.json()
  return d.choices?.[0]?.message?.content?.trim() || ''
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
