import React, { useState, useEffect, useRef, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase.js'
import { CONFIG } from './config.js'
import { useVoice } from './useVoice.js'
import { transcribeAudio, createConversation, sendMessage, speakText } from './api.js'
import { cn } from './lib/utils.js'

import LoginScreen  from './components/LoginScreen.jsx'
import ChatMessage  from './components/ChatMessage.jsx'
import { MessageSquare, X, ArrowUp, Mic } from 'lucide-react'

const LS_CONV  = 'bilu2_conv_id'
const LS_MSGS  = 'bilu2_messages'
const LS_MEM   = 'bilu2_memory'
const LS_VOICE = 'bilu2_voice'

// Inject slowPulse keyframe once
if (!document.getElementById('bilu2-styles')) {
  const s = document.createElement('style')
  s.id = 'bilu2-styles'
  s.textContent = `@keyframes slowPulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.75; transform: scale(0.97); } }`
  document.head.appendChild(s)
}

export default function App() {
  const [user, setUser]           = useState(null)
  const [authReady, setAuthReady] = useState(false)

  const [isRecording, setIsRecording]   = useState(false)
  const [isThinking, setIsThinking]     = useState(false)
  const [isPlayingAudio, setIsPlayingAudio] = useState(false)
  const [transcript, setTranscript]     = useState('')
  const [audioLevel, setAudioLevel]     = useState(0)
  const [isOpen, setIsOpen]             = useState(false)   // chat panel

  const [reviewMode, setReviewMode]     = useState(false)
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [pendingTranscript, setPendingTranscript] = useState('')
  const [isEditingReview, setIsEditingReview] = useState(false)
  const [textInput, setTextInput]       = useState('')

  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_MSGS) || '[]') } catch { return [] }
  })
  const [memoryLimit, setMemoryLimit] = useState(() => parseInt(localStorage.getItem(LS_MEM) || CONFIG.DEFAULT_MEMORY_LIMIT))
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem(LS_VOICE) !== 'false')
  const [showSettings, setShowSettings] = useState(false)

  const convIdRef        = useRef(localStorage.getItem(LS_CONV))
  const audioElementRef  = useRef(null)
  const cancelRef        = useRef(false)
  const isHoldingRef     = useRef(false)
  const transcriptBoxRef = useRef(null)
  const scrollRef        = useRef(null)
  const analyserRef      = useRef(null)
  const animFrameRef     = useRef(null)

  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true) }), [])
  useEffect(() => { localStorage.setItem(LS_MSGS,  JSON.stringify(messages)) }, [messages])
  useEffect(() => { localStorage.setItem(LS_MEM,   String(memoryLimit))      }, [memoryLimit])
  useEffect(() => { localStorage.setItem(LS_VOICE, String(voiceEnabled))     }, [voiceEnabled])
  useEffect(() => { scrollRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])
  useEffect(() => { if (transcriptBoxRef.current) transcriptBoxRef.current.scrollTop = transcriptBoxRef.current.scrollHeight }, [transcript])

  // Audio level animation while recording
  useEffect(() => {
    if (isRecording && analyserRef.current) {
      const tick = () => {
        const data = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(data)
        const avg = data.reduce((a, b) => a + b, 0) / data.length
        setAudioLevel(Math.min(avg / 128, 1))
        animFrameRef.current = requestAnimationFrame(tick)
      }
      animFrameRef.current = requestAnimationFrame(tick)
      return () => cancelAnimationFrame(animFrameRef.current)
    } else {
      setAudioLevel(0)
    }
  }, [isRecording])

  const addMessage = (role, content) => {
    const msg = { role, content, ts: Date.now() }
    setMessages(prev => [...prev, msg].slice(-(memoryLimit * 2)))
    return msg
  }

  const getConvId = async () => {
    if (!convIdRef.current) {
      const id = await createConversation()
      convIdRef.current = id
      localStorage.setItem(LS_CONV, id)
    }
    return convIdRef.current
  }

  const cancelProcessing = () => {
    cancelRef.current = true
    if (audioElementRef.current) {
      try { audioElementRef.current.pause(); audioElementRef.current.currentTime = 0 } catch {}
      audioElementRef.current = null
    }
    setIsPlayingAudio(false)
    setIsThinking(false)
    isHoldingRef.current = false
  }

  const handleSend = useCallback(async (text) => {
    if (!text?.trim()) return
    cancelRef.current = false
    setIsThinking(true)
    setTranscript('')

    const optimistic = { role: 'user', content: text, ts: Date.now() }
    setMessages(prev => [...prev, optimistic].slice(-(memoryLimit * 2)))

    try {
      const convId = await getConvId()
      const reply  = await sendMessage(convId, text)

      const botMsg = { role: 'assistant', content: reply, ts: Date.now() }
      setMessages(prev => [...prev, botMsg].slice(-(memoryLimit * 2)))

      if (voiceEnabled && reply && !cancelRef.current) {
        setIsPlayingAudio(true)
        setIsThinking(false)
        await speakText(reply, audioElementRef)
        setIsPlayingAudio(false)
      } else {
        setIsThinking(false)
      }
    } catch (e) {
      console.error(e)
      setMessages(prev => [...prev, { role: 'assistant', content: 'Something went wrong — try again.', ts: Date.now() }].slice(-(memoryLimit * 2)))
      setIsThinking(false)
    }
    isHoldingRef.current = false
  }, [voiceEnabled, memoryLimit])

  // Voice integration
  const handleFinalTranscript = useCallback(async (blob, liveText) => {
    let finalText = liveText
    if (blob && !CONFIG.OPENAI_API_KEY.startsWith('REPLACE')) {
      try { finalText = (await transcribeAudio(blob)) || liveText } catch {}
    }
    finalText = finalText?.trim()
    if (!finalText) { setIsThinking(false); isHoldingRef.current = false; return }
    if (reviewMode) {
      setIsThinking(false)
      isHoldingRef.current = false
      setPendingTranscript(finalText)
      setShowReviewModal(true)
    } else {
      await handleSend(finalText)
    }
  }, [reviewMode, handleSend])

  const { startRecording: _start, stopRecording: _stop } = useVoice({
    onLiveTranscript: setTranscript,
    onFinalTranscript: handleFinalTranscript,
  })

  const handleMicTap = () => {
    if (isThinking || isPlayingAudio) return

    if (!isRecording) {
      // Stop any playing audio
      if (audioElementRef.current) {
        try { audioElementRef.current.pause() } catch {}
        audioElementRef.current = null
      }
      setIsPlayingAudio(false)
      setIsThinking(false)
      cancelRef.current = false
      isHoldingRef.current = true
      setTranscript('')
      setIsRecording(true)
      _start()
    } else {
      isHoldingRef.current = false
      setIsRecording(false)
      setIsThinking(true)
      _stop()
    }
  }

  // ── Settings overlay (minimal, inline) ───────────────────────
  const LIMITS = [5, 10, 20, 50, 100]

  if (!authReady) return (
    <div className="h-full bg-background flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
  if (!user) return <LoginScreen />

  const assistantName = 'BILU'

  return (
    <div className="h-full relative bg-gradient-to-b from-background to-background/80 select-none"
      style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}>

      {/* ── Chat Panel (slide in from left) ──────────────────── */}
      <div className={cn(
        'absolute top-0 left-0 h-full w-full max-w-md bg-card/30 backdrop-blur-xl border-r border-border/50 transition-transform duration-500 ease-out z-40',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      )}>
        <div className="flex flex-col h-full">
          {/* Panel header */}
          <div className="border-b border-border bg-card/30 backdrop-blur-sm px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                <span className="text-sm font-display font-bold text-primary">B</span>
              </div>
              <div>
                <h1 className="text-base font-display font-bold text-foreground">{assistantName}</h1>
                <p className="text-[10px] text-muted-foreground/70">Online · Ready to assist</p>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="w-8 h-8 rounded-full bg-white/5 border border-border/50 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-all">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-6 py-8 space-y-4">
            {messages.length === 0 && (
              <p className="text-center text-xs text-muted-foreground/30 mt-12">No messages yet — tap the circle to start speaking</p>
            )}
            {messages.map((m, idx) => {
              const lastUserIdx = messages.map(x => x.role).lastIndexOf('user')
              return (
                <ChatMessage
                  key={idx}
                  message={m}
                  assistantName={assistantName}
                  isLatestUserMessage={m.role === 'user' && idx === lastUserIdx}
                  onResend={(text) => { setIsThinking(true); handleSend(text) }}
                />
              )
            })}
            <div ref={scrollRef} />
          </div>
        </div>
      </div>

      {/* ── Settings overlay ─────────────────────────────────── */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-sm bg-card/95 backdrop-blur-xl border border-border/60 rounded-3xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-display font-bold text-foreground">Settings</h2>
              <button onClick={() => setShowSettings(false)} className="w-8 h-8 rounded-full bg-white/5 border border-border/50 flex items-center justify-center text-muted-foreground/50 hover:text-foreground transition-all">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Memory */}
              <div>
                <p className="text-xs text-muted-foreground/50 font-semibold uppercase tracking-wider mb-3">Conversation Memory</p>
                <div className="flex flex-wrap gap-2">
                  {LIMITS.map(l => (
                    <button key={l} onClick={() => setMemoryLimit(l)}
                      className={cn('px-3 py-1.5 rounded-xl text-xs font-semibold transition-all',
                        memoryLimit === l ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground hover:bg-secondary/80'
                      )}>
                      {l}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground/30 mt-2">Last {memoryLimit} messages kept in context</p>
              </div>

              {/* Voice */}
              <div className="flex items-center justify-between py-1">
                <span className="text-sm text-foreground/70">Voice responses</span>
                <button onClick={() => setVoiceEnabled(v => !v)}
                  className={cn('relative w-10 h-6 rounded-full transition-all', voiceEnabled ? 'bg-primary' : 'bg-secondary')}>
                  <div className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all', voiceEnabled ? 'left-5' : 'left-1')} />
                </button>
              </div>

              {/* Clear */}
              <button onClick={() => { setMessages([]); convIdRef.current = null; localStorage.removeItem(LS_CONV); setShowSettings(false) }}
                className="w-full py-2.5 rounded-xl bg-destructive/15 text-destructive text-sm font-medium transition-all hover:bg-destructive/25">
                Clear conversation
              </button>

              {/* Sign out */}
              <button onClick={() => { auth.signOut(); setShowSettings(false) }}
                className="w-full py-2.5 rounded-xl bg-secondary text-muted-foreground text-sm font-medium transition-all hover:bg-secondary/80">
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Central PTT button ───────────────────────────────── */}
      <div className="h-full flex items-center justify-center">
        <div className="relative">
          {/* Abort while recording */}
          {isRecording && (
            <button onClick={cancelProcessing}
              className="absolute -top-20 left-1/2 -translate-x-1/2 w-10 h-10 rounded-full bg-red-500/20 border border-red-500/40 hover:bg-red-500/30 flex items-center justify-center transition-all active:scale-90">
              <X className="w-5 h-5 text-red-400" />
            </button>
          )}

          {/* Outer glow ring — audio reactive */}
          <div
            className={cn('absolute inset-0 rounded-full border-2 transition-all duration-300',
              isRecording && !isThinking ? 'border-primary/30' : 'border-primary/10',
              isThinking && 'animate-ping opacity-20'
            )}
            style={isRecording && !isThinking ? {
              scale: 1.25 + (audioLevel * 0.5),
              borderWidth: 2 + (audioLevel * 3),
              opacity: 0.1 + (audioLevel * 0.3),
            } : {}}
          />
          <div
            className={cn('absolute inset-0 rounded-full border transition-all duration-300',
              isRecording && !isThinking ? 'border-primary/20 scale-125' : 'border-primary/5 scale-110'
            )}
            style={isRecording && !isThinking ? {
              scale: 1.1 + (audioLevel * 0.4),
              borderWidth: 1 + (audioLevel * 2),
              opacity: 0.05 + (audioLevel * 0.25),
            } : {}}
          />

          {/* Main button */}
          <button
            onClick={handleMicTap}
            className={cn(
              'w-48 h-48 rounded-full flex items-center justify-center transition-all duration-500 shadow-2xl',
              'bg-gradient-to-br from-primary/40 via-primary/30 to-accent/40',
              'border-4 border-primary/30 backdrop-blur-xl select-none',
              'hover:scale-105 active:scale-95',
              isRecording && !isThinking && 'from-destructive/40 via-destructive/30 to-red-500/40 border-destructive/40 scale-110',
              isThinking && 'border-primary/60 scale-100'
            )}
            style={
              isThinking ? {
                animation: 'slowPulse 2s ease-in-out infinite',
                boxShadow: '0 0 35px 8px rgba(147, 51, 234, 0.35)',
              } : isRecording ? {
                scale: 1 + (audioLevel * 0.15),
                boxShadow: `0 0 ${20 + audioLevel * 40}px ${5 + audioLevel * 10}px rgba(147, 51, 234, ${0.2 + audioLevel * 0.4})`,
              } : {}
            }
          >
            <div className="text-center select-none pointer-events-none">
              <Mic className={cn('w-16 h-16 mx-auto mb-3 transition-all duration-300',
                isThinking ? 'text-primary/70' : isRecording ? 'text-white' : 'text-primary-foreground/80'
              )} />
              <p className={cn('text-sm font-display font-bold transition-all duration-300 select-none',
                isRecording ? 'text-white' : 'text-primary-foreground/60'
              )}>
                {isThinking ? 'Thinking...' : isPlayingAudio ? 'Speaking...' : isRecording ? 'Tap to stop' : 'Tap to Talk'}
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Live transcript ──────────────────────────────────── */}
      <div className="absolute left-0 right-0 flex flex-col items-center px-6 pointer-events-none"
        style={{ top: '80px', bottom: 'calc(50% + 112px)' }}>
        <div ref={transcriptBoxRef} className="w-full max-w-sm overflow-y-auto" style={{ maxHeight: '100%', scrollBehavior: 'smooth' }}>
          {transcript ? (
            <p className="text-center text-sm leading-7 text-white/40 transition-all duration-300 whitespace-pre-wrap">{transcript}</p>
          ) : !isRecording && !isThinking ? (
            <p className="text-center text-xs text-muted-foreground/30">Tap the circle to start speaking</p>
          ) : null}
        </div>
      </div>

      {/* ── Text input bar ───────────────────────────────────── */}
      <div className="absolute bottom-6 left-0 right-0 px-5 pointer-events-auto">
        <div className="flex items-end gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-3 focus-within:border-primary/30 focus-within:ring-1 focus-within:ring-primary/20 transition-all">
          <textarea
            value={textInput}
            onChange={e => { setTextInput(e.target.value); e.target.style.height='auto'; e.target.style.height = Math.min(e.target.scrollHeight,100)+'px' }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                const t = textInput.trim()
                if (t && !isThinking) { setTextInput(''); setIsThinking(true); handleSend(t) }
              }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/30 resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: 100, overflowY: 'auto' }}
          />
          <button
            onClick={() => { const t=textInput.trim(); if(t&&!isThinking){setTextInput('');setIsThinking(true);handleSend(t)} }}
            disabled={!textInput.trim() || isThinking}
            className={cn('w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90',
              textInput.trim() && !isThinking ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30' : 'bg-white/5 text-muted-foreground/30'
            )}>
            <ArrowUp className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ── Review toggle pill ───────────────────────────────── */}
      <div className="absolute flex justify-center pointer-events-auto" style={{ top: 'calc(50% + 116px)', left: 0, right: 0 }}>
        <button onClick={() => setReviewMode(r => !r)}
          className={cn('flex items-center gap-2 px-5 py-2 rounded-full text-[11px] font-semibold transition-all duration-200 border',
            reviewMode ? 'bg-primary/20 text-primary border-primary/40 shadow-lg shadow-primary/20' : 'bg-white/5 text-white/25 border-white/10'
          )}>
          <span className={cn('w-2 h-2 rounded-full transition-all duration-200', reviewMode ? 'bg-primary shadow-sm shadow-primary/50' : 'bg-white/20')} />
          Review before send
        </button>
      </div>

      {/* ── Top bar icons ────────────────────────────────────── */}
      <div className="absolute top-4 left-0 right-0 flex items-center justify-between px-5 pointer-events-auto z-30">
        <button onClick={() => setIsOpen(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-border/50 hover:bg-white/8 transition-colors">
          <MessageSquare className="w-4 h-4 text-muted-foreground/50" />
          {messages.length > 0 && <span className="text-xs text-muted-foreground/40">{messages.length}</span>}
        </button>

        <button onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl bg-white/5 border border-border/50 hover:bg-white/8 flex items-center justify-center transition-colors">
          <svg className="w-4 h-4 text-muted-foreground/50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
          </svg>
        </button>
      </div>

      {/* ── Review Modal ─────────────────────────────────────── */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6"
          style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(10px)' }}>
          <div className="w-full max-w-md flex flex-col bg-card/95 backdrop-blur-xl border border-border/60 rounded-3xl shadow-2xl shadow-black/60 overflow-hidden" style={{ maxHeight: '80vh' }}>
            <div className="px-6 pt-5 pb-4 border-b border-border/40 flex items-center justify-between flex-shrink-0">
              <div>
                <h2 className="text-base font-display font-bold text-foreground">Review Message</h2>
                <p className="text-[11px] text-muted-foreground/50 mt-0.5">Check before sending</p>
              </div>
              <button onClick={() => { setShowReviewModal(false); setPendingTranscript(''); setIsEditingReview(false) }}
                className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-muted-foreground/50 hover:text-foreground hover:bg-white/10 transition-all active:scale-90">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5 min-h-0">
              {isEditingReview ? (
                <textarea value={pendingTranscript} onChange={e => setPendingTranscript(e.target.value)}
                  className="w-full min-h-[120px] bg-white/5 border border-primary/30 text-foreground text-sm rounded-2xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 leading-relaxed"
                  autoFocus />
              ) : (
                <p className="text-foreground/85 text-sm leading-relaxed whitespace-pre-wrap">{pendingTranscript}</p>
              )}
            </div>

            <div className="px-6 pb-6 pt-4 border-t border-border/40 flex gap-3 flex-shrink-0">
              <button onClick={() => { setShowReviewModal(false); setPendingTranscript(''); setIsEditingReview(false) }}
                className="flex-1 h-11 rounded-2xl bg-white/5 border border-white/10 text-sm text-muted-foreground font-medium transition-all hover:bg-white/10 active:scale-95">
                Discard
              </button>
              {isEditingReview ? (
                <button onClick={() => { const t=pendingTranscript.trim(); if(t){setIsThinking(true);handleSend(t)} setShowReviewModal(false);setPendingTranscript('');setIsEditingReview(false) }}
                  className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95">
                  Submit ↑
                </button>
              ) : (
                <>
                  <button onClick={() => setIsEditingReview(true)}
                    className="flex-1 h-11 rounded-2xl bg-white/10 border border-white/20 text-sm text-foreground/70 font-medium transition-all hover:bg-white/15 active:scale-95">
                    Edit
                  </button>
                  <button onClick={() => { const t=pendingTranscript.trim(); if(t){setIsThinking(true);handleSend(t)} setShowReviewModal(false);setPendingTranscript('');setIsEditingReview(false) }}
                    className="flex-[2] h-11 rounded-2xl bg-gradient-to-r from-primary to-accent text-primary-foreground text-sm font-bold shadow-lg shadow-primary/20 transition-all hover:opacity-90 active:scale-95">
                    Send ↑
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
