import React, { useState, useEffect, useRef, useCallback } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from './firebase.js'
import { CONFIG } from './config.js'
import { useVoice } from './useVoice.js'
import { transcribeAudio, createConversation, sendMessage, speakText } from './api.js'

import LoginScreen   from './components/LoginScreen.jsx'
import MicButton     from './components/MicButton.jsx'
import HistoryPanel  from './components/HistoryPanel.jsx'
import ReviewModal   from './components/ReviewModal.jsx'
import SettingsMenu  from './components/SettingsMenu.jsx'

import { MessageSquare, Settings } from 'lucide-react'

// ── LocalStorage keys ──────────────────────────────────────────
const LS_CONV   = 'bilu2_conv_id'
const LS_MSGS   = 'bilu2_messages'
const LS_MEM    = 'bilu2_memory'
const LS_VOICE  = 'bilu2_voice'

export default function App() {
  // Auth
  const [user, setUser]           = useState(null)
  const [authReady, setAuthReady] = useState(false)

  // UI state
  const [micState, setMicState]       = useState('idle')   // idle|recording|thinking|speaking
  const [liveText, setLiveText]       = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [reviewText, setReviewText]   = useState(null)
  const [textInput, setTextInput]     = useState('')
  const [reviewMode, setReviewMode]   = useState(false)

  // Persistent settings
  const [messages, setMessages] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LS_MSGS) || '[]') } catch { return [] }
  })
  const [memoryLimit, setMemoryLimit] = useState(() => parseInt(localStorage.getItem(LS_MEM) || CONFIG.DEFAULT_MEMORY_LIMIT))
  const [voiceEnabled, setVoiceEnabled] = useState(() => localStorage.getItem(LS_VOICE) !== 'false')

  const convIdRef = useRef(localStorage.getItem(LS_CONV))
  const textareaRef = useRef()

  // ── Auth listener ────────────────────────────────────────────
  useEffect(() => onAuthStateChanged(auth, u => { setUser(u); setAuthReady(true) }), [])

  // ── Persist ──────────────────────────────────────────────────
  useEffect(() => { localStorage.setItem(LS_MSGS,  JSON.stringify(messages))  }, [messages])
  useEffect(() => { localStorage.setItem(LS_MEM,   String(memoryLimit))       }, [memoryLimit])
  useEffect(() => { localStorage.setItem(LS_VOICE, String(voiceEnabled))      }, [voiceEnabled])

  // ── Helpers ──────────────────────────────────────────────────
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

  // ── Core: process text → response ────────────────────────────
  const processText = useCallback(async (text) => {
    if (!text?.trim()) return
    setMicState('thinking')
    setLiveText('')
    addMessage('user', text)

    try {
      const id  = await getConvId()
      const res = await sendMessage(id, text)
      addMessage('assistant', res)

      if (voiceEnabled && res) {
        setMicState('speaking')
        await speakText(res)
      }
    } catch (e) {
      console.error(e)
      addMessage('assistant', 'Something went wrong — please try again.')
    }
    setMicState('idle')
  }, [voiceEnabled, memoryLimit])

  // ── Voice: final transcript handler ──────────────────────────
  const handleFinalTranscript = useCallback(async (blob, liveTranscript) => {
    let finalText = liveTranscript

    // Upgrade with Whisper if available
    if (blob && !CONFIG.OPENAI_API_KEY.startsWith('REPLACE')) {
      try { finalText = (await transcribeAudio(blob)) || liveTranscript }
      catch (e) { console.warn('Whisper fallback:', e.message) }
    }

    finalText = finalText?.trim()
    if (!finalText) { setMicState('idle'); setLiveText(''); return }

    if (reviewMode) {
      setMicState('idle')
      setReviewText(finalText)
    } else {
      await processText(finalText)
    }
  }, [reviewMode, processText])

  const { isRecording, startRecording, stopRecording } = useVoice({
    onLiveTranscript: setLiveText,
    onFinalTranscript: handleFinalTranscript,
  })

  // ── Mic tap handler ───────────────────────────────────────────
  const handleMicTap = useCallback(() => {
    if (micState === 'idle') {
      setLiveText('')
      startRecording()
      setMicState('recording')
    } else if (micState === 'recording') {
      stopRecording()
      setMicState('thinking')
    }
  }, [micState, startRecording, stopRecording])

  // ── Text submit ───────────────────────────────────────────────
  const handleTextSubmit = async () => {
    const t = textInput.trim()
    if (!t) return
    if (reviewMode) {
      setReviewText(t)
    } else {
      setTextInput('')
      await processText(t)
    }
  }

  // ── Render ────────────────────────────────────────────────────
  if (!authReady) return (
    <div className="h-full bg-bg flex items-center justify-center">
      <div className="w-8 h-8 rounded-full border-2 border-purple-500 border-t-transparent animate-spin" />
    </div>
  )

  if (!user) return <LoginScreen />

  return (
    <div className="h-full bg-bg flex flex-col overflow-hidden">
      {/* ── Top bar ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-5 pt-4 pb-3 flex-shrink-0">
        {/* History button */}
        <button onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-3 py-2 rounded-xl transition-colors hover:bg-white/8"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <MessageSquare className="w-4 h-4 text-white/40" />
          {messages.length > 0 && (
            <span className="text-xs text-white/30 font-medium">{messages.length}</span>
          )}
        </button>

        {/* App name */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          <span className="text-white/50 text-sm font-medium tracking-wide">bilu</span>
        </div>

        {/* Settings */}
        <button onClick={() => setShowSettings(true)}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/8"
          style={{ background: 'rgba(255,255,255,0.05)' }}>
          <Settings className="w-4 h-4 text-white/40" />
        </button>
      </div>

      {/* ── Main / mic area ─────────────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-8 min-h-0">
        {/* Live transcript */}
        <div className="w-full max-w-sm min-h-[72px] flex items-center justify-center">
          {liveText ? (
            <p className="text-white/65 text-base text-center leading-relaxed anim-fade-up">
              {liveText}
              {micState === 'recording' && (
                <span className="inline-block w-0.5 h-5 bg-purple-400 ml-1 align-middle anim-cursor" />
              )}
            </p>
          ) : (
            <p className="text-white/12 text-sm text-center">
              {messages.length === 0 ? 'Tap the mic and start talking' : ''}
            </p>
          )}
        </div>

        {/* Mic */}
        <MicButton state={micState} onTap={handleMicTap} />

        {/* Review before send toggle */}
        <div className="flex items-center gap-3">
          <button
            onPointerDown={e => { e.preventDefault(); setReviewMode(v => !v) }}
            className="rounded-full transition-all flex-shrink-0"
            style={{ width: 40, height: 22, background: reviewMode ? '#7c3aed' : 'rgba(255,255,255,0.12)', position: 'relative' }}>
            <div className="absolute top-[3px] w-4 h-4 rounded-full bg-white transition-all"
              style={{ left: reviewMode ? '21px' : '3px' }} />
          </button>
          <span className="text-white/30 text-xs select-none">Review before send</span>
        </div>
      </div>

      {/* ── Text input bar ──────────────────────────────────────── */}
      <div className="flex-shrink-0 px-4 pb-6 pt-2">
        <div className="flex items-end gap-3 rounded-2xl px-4 py-3"
          style={{ background: '#16162a', border: '1px solid rgba(255,255,255,0.07)' }}>
          <textarea
            ref={textareaRef}
            value={textInput}
            onChange={e => {
              setTextInput(e.target.value)
              // Auto-height
              e.target.style.height = 'auto'
              e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
            }}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleTextSubmit() }
            }}
            placeholder="Type a message…"
            rows={1}
            className="flex-1 bg-transparent text-white text-sm placeholder-white/20 resize-none focus:outline-none leading-relaxed"
            style={{ maxHeight: 120 }}
          />
          <button
            onPointerDown={e => { e.preventDefault(); handleTextSubmit() }}
            disabled={!textInput.trim() || micState === 'thinking'}
            className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all active:scale-90 disabled:opacity-30"
            style={{ background: '#7c3aed' }}>
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      {/* ── Overlays ─────────────────────────────────────────────── */}
      <HistoryPanel
        messages={messages}
        open={showHistory}
        onClose={() => setShowHistory(false)}
        onClear={() => { setMessages([]); convIdRef.current = null; localStorage.removeItem(LS_CONV) }}
      />
      <SettingsMenu
        open={showSettings}
        onClose={() => setShowSettings(false)}
        memoryLimit={memoryLimit}
        onMemoryChange={setMemoryLimit}
        voiceEnabled={voiceEnabled}
        onVoiceToggle={() => setVoiceEnabled(v => !v)}
        user={user}
      />
      {reviewText != null && (
        <ReviewModal
          text={reviewText}
          onSend={t => { setReviewText(null); processText(t) }}
          onCancel={() => setReviewText(null)}
        />
      )}
    </div>
  )
}
