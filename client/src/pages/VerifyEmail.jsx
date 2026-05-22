import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import api from '../lib/api.js'
import toast from 'react-hot-toast'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [token, setToken] = useState(params.get('token') || '')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [done, setDone] = useState(false)

  // Auto-verify if token in URL
  useEffect(() => {
    const urlToken = params.get('token')
    if (urlToken) {
      verifyToken(urlToken)
    }
  }, [])

  const verifyToken = async (t) => {
    setLoading(true)
    try {
      const { data } = await api.post('/auth/verify-email', { token: t })
      setDone(true)
      toast.success(data.message)
      setTimeout(() => navigate('/lobby'), 1500)
    } catch (err) {
      toast.error(err.response?.data?.error || 'Invalid or expired token.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!token.trim()) { toast.error('Please enter the verification token.'); return }
    verifyToken(token.trim())
  }

  const handleResend = async () => {
    if (!email.trim()) { toast.error('Please enter your email.'); return }
    setResending(true)
    try {
      await api.post('/auth/resend-verification', { email })
      toast.success('Verification sent! Check your email or server console.')
    } catch {
      toast.error('Failed to resend verification.')
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/tiki-icon.svg" alt="TikiCasino" className="w-10 h-10" />
            <span className="font-display font-bold text-2xl gradient-text">TikiCasino</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-tiki-text">Verify your email</h1>
        </div>

        {done ? (
          <div className="glass-heavy rounded-3xl p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <h2 className="font-display font-bold text-xl text-green-400 mb-2">Email Verified!</h2>
            <p className="text-tiki-muted text-sm">Redirecting to lobby…</p>
          </div>
        ) : (
          <div className="glass-heavy rounded-3xl p-7 space-y-6">
            {/* Dev mode notice */}
            <div className="rounded-xl p-4" style={{ background: 'rgba(139,92,246,0.1)', border: '1px solid rgba(139,92,246,0.2)' }}>
              <p className="text-xs text-violet-400 font-semibold mb-1">Development Mode</p>
              <p className="text-xs text-tiki-muted">
                No email configured? The verification token is printed in the <strong className="text-violet-300">server console</strong>. Paste it below to verify.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">
                  Verification Token
                </label>
                <input
                  className="input font-mono"
                  placeholder="Paste your token here…"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={loading || !token.trim()}
                className="btn-primary w-full justify-center py-3.5"
              >
                {loading ? <span className="spinner scale-75" /> : 'Verify & Get 10,000 CALDICOINS'}
              </button>
            </form>

            <div className="divider" />

            {/* Resend */}
            <div>
              <p className="text-xs text-tiki-muted mb-3">Didn't receive anything? Resend:</p>
              <div className="flex gap-2">
                <input
                  className="input flex-1 text-sm"
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <button
                  onClick={handleResend}
                  disabled={resending}
                  className="btn-ghost flex-shrink-0 text-sm py-3 px-4"
                >
                  {resending ? '…' : 'Resend'}
                </button>
              </div>
            </div>

            <p className="text-center text-sm text-tiki-muted">
              <Link to="/login" className="text-cyan-400 hover:underline">Back to Login</Link>
            </p>
          </div>
        )}
      </motion.div>
    </div>
  )
}
