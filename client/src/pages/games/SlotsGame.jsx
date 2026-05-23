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

const SYMBOL_SVG = {
  cherry: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <circle cx="14" cy="26" r="8" fill="#dc2626"/>
      <circle cx="26" cy="26" r="8" fill="#dc2626"/>
      <path d="M14 18 Q20 8 26 18" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
      <line x1="20" y1="8" x2="20" y2="4" stroke="#16a34a" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  lemon: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <ellipse cx="20" cy="20" rx="14" ry="10" fill="#fbbf24" transform="rotate(-15 20 20)"/>
      <ellipse cx="20" cy="20" rx="10" ry="7" fill="#fcd34d" transform="rotate(-15 20 20)"/>
    </svg>
  ),
  bell: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <path d="M10 28 Q10 14 20 12 Q30 14 30 28Z" fill="#fbbf24"/>
      <rect x="16" y="28" width="8" height="4" rx="1" fill="#f59e0b"/>
      <circle cx="20" cy="33" r="2.5" fill="#d97706"/>
      <rect x="17" y="10" width="6" height="4" rx="2" fill="#fbbf24"/>
    </svg>
  ),
  star: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <path d="M20 5 L23.5 14.5 L34 14.5 L26 20.5 L29.5 30 L20 24 L10.5 30 L14 20.5 L6 14.5 L16.5 14.5Z" fill="#8b5cf6" stroke="#a78bfa" strokeWidth="1"/>
    </svg>
  ),
  diamond: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <path d="M20 6 L34 20 L20 34 L6 20Z" fill="#06b6d4" stroke="#22d3ee" strokeWidth="1.5"/>
      <path d="M20 12 L28 20 L20 28 L12 20Z" fill="#0e7490" opacity="0.5"/>
    </svg>
  ),
  seven: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <rect x="4" y="4" width="32" height="32" rx="6" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="2"/>
      <text x="20" y="28" textAnchor="middle" fontSize="22" fontWeight="900" fill="#ef4444" fontFamily="Inter">7</text>
    </svg>
  ),
  joker: (
    <svg viewBox="0 0 40 40" fill="none" className="w-10 h-10">
      <circle cx="20" cy="20" r="16" fill="url(#jg)"/>
      <defs><linearGradient id="jg" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#8b5cf6"/></linearGradient></defs>
      <text x="20" y="27" textAnchor="middle" fontSize="18" fontWeight="900" fill="#fff" fontFamily="Inter">J</text>
      <path d="M14 8 L16 4 L18 8 L20 4 L22 8 L24 4 L26 8Z" fill="#fbbf24"/>
    </svg>
  ),
}

function SlotReel({ symbols, spinning, delay = 0 }) {
  return (
    <div className="flex flex-col gap-2 items-center">
      {symbols.map((sym, i) => (
        <motion.div
          key={i}
          initial={spinning ? { y: -20, opacity: 0.8 } : false}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: delay + i * 0.05, duration: 0.25 }}
          className={`w-16 h-16 rounded-xl flex items-center justify-center ${
            i === 1 ? 'bg-white/10 border-2 border-yellow-500/30' : 'bg-white/5'
          }`}
        >
          {SYMBOL_SVG[sym] || <span className="text-2xl">{sym}</span>}
        </motion.div>
      ))}
    </div>
  )
}

export default function SlotsGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [balance, setBalance] = useState(user?.balance || 0)
  const [betAmount, setBetAmount] = useState(50)
  const [spinning, setGirarning] = useState(false)
  const [grid, setGrid] = useState([
    ['cherry','lemon','bell'], ['star','diamond','seven'],
    ['joker','cherry','lemon'], ['bell','star','diamond'], ['seven','joker','cherry']
  ])
  const [lastResult, setLastResult] = useState(null)
  const [jackpotAlert, setJackpotAlert] = useState(false)
  const [showReward, setShowReward] = useState(false)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  // Reel high-speed spinning animation blur
  useEffect(() => {
    if (!spinning) return
    const interval = setInterval(() => {
      setGrid(prev => prev.map(() => {
        const syms = ['cherry', 'lemon', 'bell', 'star', 'diamond', 'seven', 'joker']
        return [
          syms[Math.floor(Math.random() * syms.length)],
          syms[Math.floor(Math.random() * syms.length)],
          syms[Math.floor(Math.random() * syms.length)]
        ]
      }))
    }, 70)
    return () => clearInterval(interval)
  }, [spinning])

  useEffect(() => {
    if (!socket) return

    const onResult = (result) => {
      setTimeout(() => {
        setGrid(result.grid)
        setLastResult(result)
        setGirarning(false)
        if (result.isJackpot) {
          playWinSound()
          setJackpotAlert(true)
          setTimeout(() => setJackpotAlert(false), 5000)
          toast.success(`¡JACKPOT!! +${result.payout.toLocaleString()} CALDICOINS!`)
        } else if (result.isWin) {
          playWinSound()
          setShowReward(true)
          toast.success(`¡Ganaste! +${result.payout.toLocaleString()} CALDICOINS`)
        } else {
          playLoseSound()
          toast.error('No ganaste esta vez. ¡Volvé a girar!')
        }
      }, 1200)
    }
    const onError = ({ message }) => { toast.error(message); setGirarning(false) }
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }
    const onJackpot = ({ nickname, payout }) => {
      playWinSound()
      toast.success(`${nickname} hit the ¡JACKPOT! for ${payout.toLocaleString()} CALDICOINS!`, { duration: 6000 })
    }

    socket.on('slots:result', onResult)
    socket.on('slots:error', onError)
    socket.on('balance:update', onSaldoUpdate)
    socket.on('slots:jackpot', onJackpot)

    return () => {
      socket.off('slots:result', onResult)
      socket.off('slots:error', onError)
      socket.off('balance:update', onSaldoUpdate)
      socket.off('slots:jackpot', onJackpot)
    }
  }, [socket])

  const spin = () => {
    if (betAmount < 10) { toast.error('Apuesta mínima 10 CALDICOINS'); return }
    if (betAmount > balance) { toast.error('CALDICOINS insuficientes'); return }
    if (!socket) return
    setGirarning(true)
    setLastResult(null)
    socket.emit('slots:spin', { roomCode, betAmount })
  }

  const BETS = [10, 25, 50, 100, 250, 500]

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Slots</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        {/* Jackpot alert */}
        <AnimatePresence>
          {jackpotAlert && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8, y: -30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed top-24 left-1/2 -translate-x-1/2 z-50 text-center"
            >
              <div className="glass-heavy rounded-3xl px-12 py-6 border border-yellow-500/50 shadow-gold-glow">
                <p className="font-display font-black text-5xl neon-gold mb-2">¡JACKPOT!!</p>
                <p className="text-yellow-400 text-xl">¡Acabás de reventar el tragamonedas!</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Slot machine */}
            <div className="glass rounded-3xl p-8 text-center relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, rgba(245,158,11,0.08) 0%, transparent 70%)' }}>
              {/* Payline indicator */}
              <div className="absolute left-0 right-0 top-1/2 -translate-y-1/2 flex items-center">
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-gold-glow ml-2" />
                <div className="flex-1 border-t-2 border-yellow-400/30 border-dashed" />
                <div className="w-3 h-3 rounded-full bg-yellow-400 shadow-gold-glow mr-2" />
              </div>

              {/* Reels */}
              <div className="flex justify-center gap-3 mb-6 relative z-10">
                {grid.map((reel, i) => (
                  <SlotReel key={i} symbols={reel} spinning={spinning} delay={i * 0.08} />
                ))}
              </div>

              {/* Ganaste display */}
              <AnimatePresence>
                {lastResult?.isWin && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-2"
                  >
                    {lastResult.wins.map((w, i) => (
                      <span key={i} className="badge-gold mx-1">
                        {w.symbol} ×{w.count} = {w.multiplier}× bet
                      </span>
                    ))}
                    <p className="font-display font-bold text-2xl text-green-400 mt-2">
                      +{lastResult.payout.toLocaleString()} CALDICOINS
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <p className="text-xs font-semibold text-tiki-muted uppercase tracking-wide mb-3">Cantidad apostada</p>
                <div className="grid grid-cols-6 gap-2 mb-3">
                  {BETS.map(b => (
                    <button
                      key={b}
                      onClick={() => setBetAmount(b)}
                      className={`py-2 rounded-xl text-sm font-bold transition-all ${betAmount === b ? 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-400' : 'bg-white/5 border border-white/10 text-tiki-muted hover:text-tiki-text'}`}
                    >
                      {b}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    className="input flex-1 font-mono"
                    value={betAmount}
                    onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                    min={10}
                    max={1000}
                  />
                  <button
                    onClick={spin}
                    disabled={spinning || betAmount < 10 || betAmount > balance}
                    className="btn-gold py-3 px-8 text-base font-black flex items-center justify-center min-w-[120px]"
                  >
                    {spinning ? (
                      <motion.span animate={{ rotate: 360 }} transition={{ duration: 0.5, repeat: Infinity }}>◈</motion.span>
                    ) : 'GIRAR 🎰'}
                  </button>
                </div>
              </div>
            </div>

            {/* Paytable */}
            <div className="glass rounded-2xl p-5">
              <h3 className="font-semibold text-tiki-text mb-4">Paytable (top wins)</h3>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  ['Joker ×5', '1000×'], ['Seven ×5', '500×'], ['Diamond ×5', '200×'],
                  ['Joker ×4', '100×'], ['Star ×5', '100×'], ['Seven ×4', '75×'],
                ].map(([sym, pay]) => (
                  <div key={sym} className="flex justify-between px-3 py-2 rounded-lg bg-white/5">
                    <span className="text-tiki-muted">{sym}</span>
                    <span className="font-mono font-bold text-yellow-400">{pay}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar - Sliding chat & active bets panel */}
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

              <span className="text-6xl block mb-4">🎉</span>
              <h2 className="font-display font-black text-4xl text-yellow-400 mb-2">
                ¡GANASTE!
              </h2>
              <p className="text-tiki-muted text-xs mb-6">Felicidades, lograste una gran combinación.</p>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6">
                <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">
                  Premio Total
                </span>
                <span className="text-3xl font-mono font-black text-yellow-400 block">
                  +{lastResult?.payout?.toLocaleString()} CALDICOINS
                </span>
              </div>

              <button
                onClick={() => setShowReward(false)}
                className="btn-primary w-full py-3.5 justify-center font-black text-base shadow-[0_0_30px_rgba(251,191,36,0.3)]"
              >
                ¡SEGUIR JUGANDO! 🎰
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
