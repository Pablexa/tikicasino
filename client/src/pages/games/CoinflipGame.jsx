import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import RightSidebar from '../../components/RightSidebar.jsx'
import toast from 'react-hot-toast'
import { playWinSound, playLoseSound } from '../../utils/audio.js'

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
  const [showReward, setShowReward] = useState(false)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return
    const onResult = (r) => {
      setTimeout(() => {
        setFlipping(false)
        setResult(r)
        setHistory(prev => [r, ...prev].slice(0, 10))
        if (r.win) {
          playWinSound()
          setShowReward(true)
          toast.success(`¡Salió ${r.result === 'heads' ? 'CARA' : 'CECA'}! ¡Ganaste! +${r.payout.toLocaleString()} CALDICOINS!`)
        } else {
          playLoseSound()
          toast.error(`Salió ${r.result === 'heads' ? 'CARA' : 'CECA'} — Perdiste esta ronda.`)
        }
      }, 1200)
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
                    {result.win ? '¡GANASTE!' : '¡PERDISTE!'}
                  </p>
                  {result.win && <p className="text-green-400 font-mono font-bold">+{result.payout.toLocaleString()} CALDICOINS</p>}
                </motion.div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="flex justify-center gap-2 mt-6 flex-wrap">
                  <span className="text-[10px] text-tiki-muted font-bold uppercase mr-1 flex items-center">Últimas:</span>
                  {history.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center ${h.result === 'heads' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                      {h.result === 'heads' ? 'C' : 'X'}
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
                  disabled={flipping}
                  className={`py-4 rounded-2xl font-display font-bold text-lg transition-all border-2 ${choice === 'heads' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-cyan-glow' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Cara
                </button>
                <button
                  onClick={() => setChoice('tails')}
                  disabled={flipping}
                  className={`py-4 rounded-2xl font-display font-bold text-lg transition-all border-2 ${choice === 'tails' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-violet-glow' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Ceca
                </button>
              </div>

              <div className="flex gap-3 items-center">
                <input type="number" className="input flex-1 font-mono font-bold" value={betAmount} onChange={e => setBetAmount(parseInt(e.target.value) || 0)} min={10} disabled={flipping} />
                <span className="text-xs text-yellow-500 font-semibold">CALDICOINS</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[50,100,250,500,1000,5000].map(b => (
                  <button key={b} onClick={() => setBetAmount(b)} disabled={flipping} className="bet-quick-btn">{b >= 1000 ? `${b/1000}K` : b}</button>
                ))}
              </div>

              <button
                onClick={flip}
                disabled={flipping || betAmount < 10 || betAmount > balance}
                className="btn-primary w-full py-4 justify-center text-lg font-black"
              >
                {flipping ? (
                  <span className="flex items-center gap-2"><span className="spinner scale-75" /> Lanzando moneda…</span>
                ) : `Lanzar — ${betAmount.toLocaleString()} CALDICOINS → 2.00×`}
              </button>
            </div>
          </div>

          <div className="h-[580px] lg:col-span-1">
            <RightSidebar roomCode={roomCode} />
          </div>
        </div>
      </main>

      {/* custom reward celebration modal */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, rotate: 3 }}
              className="glass max-w-md w-full p-8 rounded-3xl border border-yellow-500/30 text-center relative overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.2)] mx-4"
            >
              {/* Confetti particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-5%`,
                      backgroundColor: ['#fbbf24', '#22d3ee', '#10b981', '#a78bfa'][i % 4]
                    }}
                    animate={{
                      y: ['0%', '1100%'],
                      x: [`0px`, `${Math.sin(i) * 60}px`],
                      rotate: [0, 360]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 1.5
                    }}
                  />
                ))}
              </div>

              <span className="text-6xl block mb-4">🪙</span>
              <h2 className="font-display font-black text-4xl text-yellow-400 mb-2">
                ¡DUPLICASTE!
              </h2>
              <p className="text-tiki-muted text-xs mb-6">Felicidades, acertaste la moneda.</p>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6">
                <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">
                  Premio Coinflip
                </span>
                <span className="text-3xl font-mono font-black text-cyan-400 block">
                  +{result?.payout?.toLocaleString()} CALDICOINS
                </span>
              </div>

              <button
                onClick={() => setShowReward(false)}
                className="btn-primary w-full py-3.5 justify-center font-black text-base shadow-[0_0_30px_rgba(251,191,36,0.3)]"
              >
                ¡OTRO LANZAMIENTO! 🔥
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CoinSvg({ side, size = 100, win }) {
  const isCara = side === 'heads'
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isCara ? '#22d3ee' : '#a78bfa'}/>
          <stop offset="100%" stopColor={isCara ? '#0891b2' : '#7c3aed'}/>
        </linearGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill="url(#coinGrad)" opacity="0.9"/>
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2"/>
      {win !== undefined && (
        <circle cx="50" cy="50" r="46" fill={win ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}/>
      )}
      <text x="50" y="42" textAnchor="middle" fontSize="12" fontWeight="bold" fill="rgba(255,255,255,0.9)" fontFamily="Inter">
        {isCara ? 'CARA' : 'CECA'}
      </text>
      <text x="50" y="62" textAnchor="middle" fontSize="22" fontWeight="900" fill="white" fontFamily="Inter">
        {isCara ? '🪙' : '💎'}
      </text>
    </svg>
  )
}
