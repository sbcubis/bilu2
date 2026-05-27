import React, { useState, useEffect } from 'react'
import { X, Edit2, Send } from 'lucide-react'

export default function ReviewModal({ text, onSend, onCancel }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(text)

  useEffect(() => setDraft(text), [text])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(10px)' }}>
      <div className="anim-slide-up w-full max-w-lg rounded-3xl overflow-hidden"
        style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.09)' }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <span className="text-white font-semibold text-sm">Review message</span>
          <button onClick={onCancel}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/50" />
          </button>
        </div>

        {/* Content — scrollable */}
        <div className="px-5 py-4 overflow-y-auto" style={{ maxHeight: '50vh' }}>
          {editing ? (
            <textarea
              autoFocus
              value={draft}
              onChange={e => setDraft(e.target.value)}
              rows={5}
              className="w-full bg-white/5 rounded-2xl p-4 text-white text-sm leading-relaxed resize-none focus:outline-none focus:ring-1 focus:ring-purple-500"
              style={{ border: '1px solid rgba(124,58,237,0.4)', minHeight: 100 }}
            />
          ) : (
            <p className="text-white/75 text-sm leading-relaxed whitespace-pre-wrap">{draft}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button onClick={() => setEditing(v => !v)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white/90 transition-colors"
            style={{ background: 'rgba(255,255,255,0.06)' }}>
            <Edit2 className="w-3.5 h-3.5" />
            {editing ? 'Preview' : 'Edit'}
          </button>
          <button onClick={() => onSend(draft)} disabled={!draft.trim()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-40"
            style={{ background: '#7c3aed' }}>
            <Send className="w-3.5 h-3.5" />
            Send
          </button>
        </div>
      </div>
    </div>
  )
}
