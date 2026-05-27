import React, { useState } from 'react'
import { signInWithGoogle } from '../firebase.js'

export default function LoginScreen() {
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleLogin = async () => {
    setLoading(true); setError('')
    try { await signInWithGoogle() }
    catch (e) { setError('Sign-in failed — check Firebase config in src/config.js'); setLoading(false) }
  }

  return (
    <div className="h-full bg-background flex flex-col items-center justify-center p-8">
      <div className="mb-10 flex flex-col items-center">
        <div className="w-20 h-20 rounded-[22px] flex items-center justify-center mb-5"
          style={{ background: 'linear-gradient(135deg, hsl(270 80% 65%), hsl(280 90% 70%))', boxShadow: '0 0 60px hsla(270,80%,65%,0.4)' }}>
          <svg width="38" height="38" viewBox="0 0 38 38" fill="none">
            <circle cx="19" cy="15" r="7" fill="white" opacity="0.95"/>
            <rect x="15" y="22" width="8" height="10" rx="4" fill="white" opacity="0.95"/>
            <rect x="10" y="33" width="18" height="3" rx="1.5" fill="white" opacity="0.5"/>
          </svg>
        </div>
        <h1 className="text-4xl font-display font-bold tracking-tight text-foreground">BILU</h1>
        <p className="text-muted-foreground/50 mt-2 text-sm text-center">Your personal AI assistant</p>
      </div>

      <div className="w-full max-w-xs bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-7">
        <p className="text-muted-foreground/50 text-sm text-center mb-6">Sign in to get started</p>
        <button onClick={handleLogin} disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white text-gray-800 font-semibold rounded-xl px-5 py-3.5 hover:bg-gray-50 active:scale-[0.97] transition-all disabled:opacity-60">
          {loading
            ? <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            : <svg width="20" height="20" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
          }
          Continue with Google
        </button>
        {error && <p className="text-destructive text-xs text-center mt-4">{error}</p>}
      </div>
    </div>
  )
}
