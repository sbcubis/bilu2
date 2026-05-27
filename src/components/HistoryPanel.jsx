import React, { useEffect, useRef } from 'react'
import { X, Trash2 } from 'lucide-react'

function Bubble({ msg }) {
  const isUser = msg.role === 'user'
  const linkify = (t) => {
    const parts = t.split(/(https?:\/\/[^\s]+)/g)
    return parts.map((p, i) =>
      /^https?:\/\//.test(p)
        ? <a key={i} href={p} target="_blank" rel="noopener noreferrer" className="underline text-purple-300 break-all">{p}</a>
        : p
    )
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-3 anim-fade-up`}>
      {!isUser && (
        <div className="w-6 h-6 rounded-full flex-shrink-0 mr-2 mt-1 flex items-center justify-center"
          style={{ background: 'rgba(124,58,237,0.25)', border: '1px solid rgba(124,58,237,0.35)' }}>
          <div className="w-2 h-2 rounded-full bg-purple-400" />
        </div>
      )}
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
        isUser
          ? 'text-white rounded-br-sm'
          : 'text-white/85 rounded-bl-sm'
      }`} style={{
        background: isUser ? '#7c3aed' : 'rgba(255,255,255,0.06)',
        border: isUser ? 'none' : '1px solid rgba(255,255,255,0.07)',
      }}>
        <span>{linkify(msg.content)}</span>
        <div className="text-xs mt-1.5 opacity-40">
          {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>
    </div>
  )
}

export default function HistoryPanel({ messages, open, onClose, onClear }) {
  const bottomRef = useRef()

  useEffect(() => {
    if (open) setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
  }, [messages, open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-30 flex flex-col" style={{ background: 'rgba(8,8,16,0.97)', backdropFilter: 'blur(12px)' }}>
      <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div>
          <h2 className="text-white font-semibold">Conversation</h2>
          <p className="text-white/25 text-xs mt-0.5">{messages.length} messages</p>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 0 && (
            <button onClick={onClear}
              className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-red-500/15 transition-colors">
              <Trash2 className="w-4 h-4 text-white/30 hover:text-red-400" />
            </button>
          )}
          <button onClick={onClose}
            className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-5">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <div className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{ background: 'rgba(255,255,255,0.04)' }}>
              <div className="w-4 h-4 rounded-full border-2 border-white/15" />
            </div>
            <p className="text-white/20 text-sm">No messages yet</p>
          </div>
        ) : (
          messages.map((m, i) => <Bubble key={i} msg={m} />)
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
