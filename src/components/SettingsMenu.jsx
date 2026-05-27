import React, { useRef, useEffect } from 'react'
import { X, Volume2, VolumeX, MessageSquare, LogOut } from 'lucide-react'
import { signOutUser } from '../firebase.js'

const LIMITS = [5, 10, 20, 50, 100]

export default function SettingsMenu({ open, onClose, memoryLimit, onMemoryChange, voiceEnabled, onVoiceToggle, user }) {
  const ref = useRef()

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    if (open) document.addEventListener('pointerdown', h)
    return () => document.removeEventListener('pointerdown', h)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-end" style={{ paddingTop: '60px', paddingRight: '16px' }}>
      <div ref={ref} className="anim-slide-up w-68 rounded-3xl overflow-hidden shadow-2xl"
        style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.08)', width: 272 }}>
        {/* User row */}
        <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {user?.photoURL
            ? <img src={user.photoURL} className="w-9 h-9 rounded-full" alt="" />
            : <div className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm"
                style={{ background: '#7c3aed' }}>{user?.displayName?.[0] || '?'}</div>
          }
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate">{user?.displayName || 'User'}</p>
            <p className="text-white/30 text-xs truncate">{user?.email}</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-full flex items-center justify-center hover:bg-white/10">
            <X className="w-3.5 h-3.5 text-white/40" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {/* Memory limit */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-white/50 text-xs font-medium uppercase tracking-wider">Memory</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {LIMITS.map(l => (
                <button key={l} onClick={() => onMemoryChange(l)}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                  style={{
                    background: memoryLimit === l ? '#7c3aed' : 'rgba(255,255,255,0.06)',
                    color: memoryLimit === l ? 'white' : 'rgba(255,255,255,0.45)',
                  }}>
                  {l}
                </button>
              ))}
            </div>
            <p className="text-white/20 text-xs mt-2">Last {memoryLimit} messages kept in context</p>
          </div>

          {/* Voice toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {voiceEnabled
                ? <Volume2  className="w-3.5 h-3.5 text-purple-400" />
                : <VolumeX  className="w-3.5 h-3.5 text-white/25" />}
              <span className="text-white/60 text-sm">Voice responses</span>
            </div>
            <button onClick={onVoiceToggle}
              className="rounded-full transition-all flex-shrink-0"
              style={{ width: 40, height: 22, background: voiceEnabled ? '#7c3aed' : 'rgba(255,255,255,0.12)', position: 'relative' }}>
              <div className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all"
                style={{ left: voiceEnabled ? '21px' : '3px' }} />
            </button>
          </div>

          {/* Sign out */}
          <button onClick={() => { signOutUser(); onClose() }}
            className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all hover:bg-red-500/12"
            style={{ color: 'rgba(255,255,255,0.4)' }}>
            <LogOut className="w-3.5 h-3.5" />
            Sign out
          </button>
        </div>
      </div>
    </div>
  )
}
