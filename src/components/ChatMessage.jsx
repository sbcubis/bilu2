import { cn } from '../lib/utils.js'
import { MessageSquare, Pencil, Volume2, Square } from 'lucide-react'
import { useState, useRef } from 'react'

const URL_REGEX = /(https?:\/\/[^\s]+)/g
const IMAGE_REGEX = /\.(jpg|jpeg|png|gif|webp|svg)(\?[^\s]*)?$/i

function RenderContent({ text }) {
  if (!text) return null
  const parts = text.split(URL_REGEX)
  return (
    <span>
      {parts.map((part, i) => {
        if (URL_REGEX.test(part)) {
          URL_REGEX.lastIndex = 0
          if (IMAGE_REGEX.test(part.split('?')[0])) {
            return <img key={i} src={part} alt="shared" className="mt-2 rounded-xl max-w-full max-h-60 object-cover border border-border/30 block" onError={e => e.target.style.display='none'} />
          }
          return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="underline text-primary/80 hover:text-primary break-all">{part}</a>
        }
        return <span key={i}>{part}</span>
      })}
    </span>
  )
}

export default function ChatMessage({ message, assistantName, isLatestUserMessage, onResend }) {
  const isUser = message.role === 'user'
  const [editing, setEditing]   = useState(false)
  const [editText, setEditText] = useState(message.content)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const audioRef = useRef(null)

  const formatTime = (d) => {
    const dt = new Date(d)
    return dt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const speakMessage = async () => {
    if (isSpeaking) { audioRef.current?.pause(); audioRef.current = null; setIsSpeaking(false); return }
    const KEY = 'sk_006abc3b49adcd14a470a51b164cb5c978392b8ee2f8bc5f'
    const VID = 'HE0XlnHeqQoWUBWhwUa3'
    setIsSpeaking(true)
    try {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VID}?output_format=mp3_22050_32`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'xi-api-key': KEY },
        body: JSON.stringify({ text: message.content, model_id: 'eleven_turbo_v2_5', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
      })
      if (!res.ok) throw new Error('TTS failed')
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audioRef.current = audio
      audio.onended = () => { URL.revokeObjectURL(url); audioRef.current = null; setIsSpeaking(false) }
      audio.onerror = () => { audioRef.current = null; setIsSpeaking(false) }
      audio.play()
    } catch { setIsSpeaking(false) }
  }

  const handleResend = () => { if (editText.trim()) { onResend?.(editText.trim()); setEditing(false) } }

  return (
    <div className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'} transition-all duration-200`}>
      {!isUser && (
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10 flex-shrink-0">
          <span className="text-xs font-display font-bold text-primary">{assistantName?.[0] || 'B'}</span>
        </div>
      )}
      <div className={`max-w-[75%] flex flex-col gap-1.5 ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={cn(
          'px-5 py-3.5 rounded-2xl',
          isUser
            ? 'bg-gradient-to-br from-primary/90 to-primary border border-primary/30 text-primary-foreground shadow-xl shadow-primary/20 rounded-br-md'
            : 'bg-card/60 backdrop-blur-sm border border-border text-foreground shadow-xl rounded-tl-md'
        )}>
          {editing ? (
            <div className="flex flex-col gap-2 min-w-[160px]">
              <textarea
                value={editText}
                onChange={e => setEditText(e.target.value)}
                className="bg-white/10 text-primary-foreground placeholder:text-primary-foreground/50 text-sm rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-white/30 w-full"
                rows={3} autoFocus
                onKeyDown={e => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); handleResend() } if (e.key==='Escape') setEditing(false) }}
              />
              <div className="flex gap-2 justify-end">
                <button onClick={() => setEditing(false)} className="text-xs text-primary-foreground/50 hover:text-primary-foreground/80 px-2 py-1 transition-colors">Discard</button>
                <button onClick={handleResend} className="text-xs font-semibold bg-white/20 hover:bg-white/30 text-primary-foreground px-3 py-1 rounded-lg transition-colors">Submit ↑</button>
              </div>
            </div>
          ) : (
            <p className="text-sm leading-relaxed whitespace-pre-wrap"><RenderContent text={message.content} /></p>
          )}
        </div>

        <div className={`flex items-center gap-2 text-[10px] ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-muted-foreground/50">{formatTime(message.ts || message.created_date)}</span>
          <div className="w-3.5 h-3.5 rounded-md bg-secondary/50 border border-border/50 flex items-center justify-center">
            <MessageSquare className="w-2.5 h-2.5 text-muted-foreground/70" />
          </div>
          {!isUser && <span className="text-[9px] text-muted-foreground/40 tracking-wide">DELIVERED</span>}
          {!isUser && (
            <button onClick={speakMessage}
              className={cn('flex items-center justify-center w-5 h-5 rounded-full border transition-all active:scale-90 ml-0.5',
                isSpeaking ? 'border-primary/50 bg-primary/20 text-primary' : 'border-border/50 bg-secondary/30 text-muted-foreground/50 hover:text-primary hover:border-primary/30'
              )}>
              {isSpeaking ? <Square className="w-2.5 h-2.5" /> : <Volume2 className="w-2.5 h-2.5" />}
            </button>
          )}
          {isUser && !editing && isLatestUserMessage && (
            <button onClick={() => { setEditing(true); setEditText(message.content) }}
              className="flex items-center gap-1 px-2.5 py-0.5 rounded-full border border-primary/20 bg-primary/10 text-[10px] text-primary/60 hover:text-primary hover:bg-primary/20 hover:border-primary/40 transition-all ml-1 active:scale-95">
              <Pencil className="w-2.5 h-2.5" /><span>Review</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
