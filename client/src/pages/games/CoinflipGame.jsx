import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

export default function CoinflipGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [balance, setBalance] = useState(user?.balance || 0)
  const [betAmount, setBetAmount] = useState(100)
  const [choice, setChoice] = useState('heads')
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return
    const onResult = (r) => {
      setFlipping(false)
      setResult(r)
      setHistory(prev => [r, ...prev].slice(0, 10))
      if (r.win) toast.success(`${r.result.toUpperCase()}! Ganaste ${r.payout.toLocaleString()} CALDICOINS!`)
      else toast.error(`${r.result.toUpperCase()} — Perdiste. Try again!`)
    }
    const onError = ({ message }) => { toast.error(message); setFlipping(false) }
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }
    socket.on('coinflip:result', onResult)
    socket.on('coinflip:error', onError)
    socket.on('balance:update', onSaldoUpdate)
    return () => {
      socket.off('coinflip:result', onResult)
      socket.off('coinflip:error', onError)
      socket.off('balance:update', onSaldoUpdate)
    }
  }, [socket])

  const flip = () => {
    if (!socket) return
    if (betAmount < 10) { toast.error('Min 10 CALDICOINS'); return }
    if (betAmount > balance) { toast.error('CALDICOINS insuficientes'); return }
    setFlipping(true)
    setResult(null)
    socket.emit('coinflip:play', { roomCode, choice, betAmount })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Coinflip</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Coin display */}
            <div className="glass rounded-3xl p-10 text-center" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 70%)' }}>
              <div className="flex justify-center mb-8">
                <AnimatePresence mode="wait">
                  {flipping ? (
                    <motion.div key="flip" animate={{ rotateY: [0, 360, 720, 1080] }} transition={{ duration: 1.2, ease: 'easeOut' }}>
                      <CoinSvg side="heads" size={140} />
                    </motion.div>
                  ) : result ? (
                    <motion.div key="result" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
                      <CoinSvg side={result.result} size={140} win={result.win} />
                    </motion.div>
                  ) : (
                    <motion.div key="idle" animate={{ y: [0, -10, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <CoinSvg side="heads" size={140} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className={`font-display font-black text-4xl mb-2 ${result.win ? 'text-green-400' : 'text-red-400'}`}>
                    {result.win ? 'You Ganaste!' : 'You Lose!'}
                  </p>
                  {result.win && <p className="text-green-400 font-mono font-bold">+{result.payout.toLocaleString()} CALDICOINS</p>}
                </motion.div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="flex justify-center gap-2 mt-6 flex-wrap">
                  {history.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full text-xs font-bold flex items-center justify-center ${h.result === 'heads' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                      {h.result === 'heads' ? 'H' : 'T'}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-5">
              {/* Choice */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setChoice('heads')}
                  className={`py-4 rounded-2xl font-display font-bold text-lg transition-all border-2 ${choice === 'heads' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-cyan-glow' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Cara
                </button>
                <button
                  onClick={() => setChoice('tails')}
                  className={`py-4 rounded-2xl font-display font-bold text-lg transition-all border-2 ${choice === 'tails' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-violet-glow' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Ceca
                </button>
              </div>

              <div className="flex gap-3 items-center">
                <input type="number" className="input flex-1 font-mono font-bold" value={betAmount} onChange={e => setBetAmount(parseInt(e.target.value) || 0)} min={10} />
                <span className="text-xs text-yellow-500 font-semibold">CALDICOINS</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[100,250,500,1000,2500,5000].map(b => (
                  <button key={b} onClick={() => setBetAmount(b)} className="bet-quick-btn">{b >= 1000 ? `${b/1000}K` : b}</button>
                ))}
              </div>

              <button
                onClick={flip}
                disabled={flipping || betAmount < 10 || betAmount > balance}
                className="btn-primary w-full py-4 justify-center text-lg font-black"
              >
                {flipping ? (
                  <span className="flex items-center gap-2"><span className="spinner scale-75" /> Flipping…</span>
                ) : `Flip — ${betAmount.toLocaleString()} CALDICOINS → 2×`}
              </button>
            </div>
          </div>

          <div className="h-[600px]">
            <ChatPanel roomCode={roomCode} />
          </div>
        </div>
      </main>
    </div>
  )
}

function CoinSvg({ side, size = 100, win }) {
  const isCara = side === 'heads'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="hg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isCara ? '#22d3ee' : '#a78bfa'}/>
          <stop offset="100%" stopColor={isCara ? '#0891b2' : '#7c3aed'}/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#hg)" opacity="0.9"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
      {win !== undefined && (
        <circle cx="50" cy="50" r="46" fill={win ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}/>
      )}
      <text x="50" y="42" textAnchor="middle" fontSize="12" fontWeight="bold" fill="rgba(255,255,255,0.9)" fontFamily="Inter">
        {isCara ? 'HEADS' : 'TAILS'}
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="22" fontWeight="900" fill="white" fontFamily="Inter">
        {isCara ? 'F' : 'T'}
      </text>
    </svg>
  )
}
