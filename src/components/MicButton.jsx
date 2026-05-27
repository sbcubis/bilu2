import React from 'react'
import { Mic, Square, Loader2 } from 'lucide-react'

export default function MicButton({ state, onTap }) {
  const cfg = {
    idle:      { color: '#7c3aed', glow: 'rgba(124,58,237,0.3)', icon: 'mic',     label: 'Tap to talk',  ring: false },
    recording: { color: '#dc2626', glow: 'rgba(220,38,38,0.35)', icon: 'stop',    label: 'Tap to send',  ring: 'fast' },
    thinking:  { color: '#5b21b6', glow: 'rgba(91,33,182,0.25)', icon: 'loading', label: 'Thinking…',    ring: 'slow' },
    speaking:  { color: '#065f46', glow: 'rgba(6,95,70,0.28)',   icon: 'mic',     label: 'Speaking…',    ring: 'slow' },
  }[state] || {}

  const disabled = state === 'thinking' || state === 'speaking'

  return (
    <div className="flex flex-col items-center gap-7 select-none">
      <div className="relative flex items-center justify-center" style={{ width: 160, height: 160 }}>
        {cfg.ring && (
          <>
            <div className={`absolute rounded-full ${cfg.ring === 'fast' ? 'anim-ring-pulse' : 'anim-ring-slow'}`}
              style={{ width: 148, height: 148, background: cfg.glow }} />
            <div className={`absolute rounded-full ${cfg.ring === 'fast' ? 'anim-ring-pulse' : 'anim-ring-slow'}`}
              style={{ width: 124, height: 124, background: cfg.glow, animationDelay: '0.28s' }} />
          </>
        )}
        <button
          onPointerDown={e => { e.preventDefault(); if (!disabled) onTap() }}
          disabled={disabled}
          className="relative rounded-full flex items-center justify-center transition-transform active:scale-[0.92]"
          style={{
            width: 104, height: 104,
            background: `radial-gradient(circle at 38% 35%, ${cfg.color}cc, ${cfg.color})`,
            boxShadow: `0 0 50px ${cfg.glow}, 0 10px 40px rgba(0,0,0,0.6)`,
            cursor: disabled ? 'default' : 'pointer',
          }}>
          {cfg.icon === 'loading' && <Loader2 className="w-11 h-11 text-white animate-spin" />}
          {cfg.icon === 'mic'     && <Mic     className="w-11 h-11 text-white" />}
          {cfg.icon === 'stop'    && <Square  className="w-10 h-10 text-white fill-white" />}
        </button>
      </div>
      <p className="text-white/35 text-sm font-medium tracking-wide">{cfg.label}</p>
    </div>
  )
}
