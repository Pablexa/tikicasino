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

export default function DiceGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [balance, setBalance] = useState(user?.balance || 0)
  const [betAmount, setBetAmount] = useState(100)
  const [target, setTarget] = useState(50)
  const [direction, setDirection] = useState('higher')
  const [rolling, setTiraring] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [showReward, setShowReward] = useState(false)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  const winChance = direction === 'higher' ? 100 - target : target - 1
  const multiplier = winChance > 0 ? Math.floor((0.98 / (winChance / 100)) * 100) / 100 : 0

  useEffect(() => {
    if (!socket) return
    const onResult = (r) => {
      setTimeout(() => {
        setTiraring(false)
        setResult(r)
        setHistory(prev => [r, ...prev].slice(0, 10))
        if (r.win) {
          playWinSound()
          setShowReward(true)
          toast.success(`¡Tiraste ${r.roll}! ¡Ganaste! +${r.payout.toLocaleString()} CALDICOINS!`)
        } else {
          playLoseSound()
          toast.error(`Tiraste ${r.roll} — Perdiste en esta ronda.`)
        }
      }, 1000)
    }
    const onError = ({ message }) => { toast.error(message); setTiraring(false) }
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }
    
    socket.on('dice:result', onResult)
    socket.on('dice:error', onError)
    socket.on('balance:update', onSaldoUpdate)
    
    return () => {
      socket.off('dice:result', onResult)
      socket.off('dice:error', onError)
      socket.off('balance:update', onSaldoUpdate)
    }
  }, [socket])

  const roll = () => {
    if (!socket) return
    if (betAmount < 10) { toast.error('Min 10 CALDICOINS'); return }
    if (betAmount > balance) { toast.error('CALDICOINS insuficientes'); return }
    setTiraring(true)
    setResult(null)
    socket.emit('dice:play', { roomCode, target, direction, betAmount })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Dice</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Dice display */}
            <div className="glass rounded-3xl p-8 text-center" style={{ background: 'radial-gradient(ellipse at center, rgba(236,72,153,0.08) 0%, transparent 70%)' }}>
              <AnimatePresence mode="wait">
                {rolling ? (
                  <motion.div key="rolling" animate={{ rotate: [0, 90, 180, 270, 360] }} transition={{ duration: 0.5, repeat: 2 }}>
                    <DiceSvg value={Math.ceil(Math.random() * 6)} size={120} />
                  </motion.div>
                ) : result ? (
                  <motion.div key="result" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>
                    <DiceSvg value={Math.min(6, Math.max(1, Math.round(result.roll / 17)))} size={120} win={result.win} />
                    <div className="mt-4">
                      <p className="font-mono font-black text-6xl" style={{ color: result.win ? '#34d399' : '#f87171' }}>
                        {result.roll}
                      </p>
                      <p className={`font-display font-bold text-2xl mt-2 ${result.win ? 'text-green-400' : 'text-red-400'}`}>
                        {result.win ? `¡GANASTE! +${result.payout.toLocaleString()} F` : 'No tuviste suerte esta vez'}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <DiceSvg value={6} size={120} />
                    <p className="mt-4 text-tiki-muted font-semibold">¡Ajustá tu objetivo y tirá los dados!</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              {history.length > 0 && (
                <div className="flex justify-center gap-2 mt-6 flex-wrap">
                  <span className="text-[10px] text-tiki-muted font-bold uppercase mr-1 flex items-center">Últimas tiradas:</span>
                  {history.map((h, i) => (
                    <span key={i} className={`px-2 py-0.5 rounded-full text-xs font-mono font-black ${h.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {h.roll}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-5">
              {/* Target & win probability display */}
              <div className="space-y-3">
                <div className="flex justify-between items-center text-sm font-bold">
                  <span className="text-tiki-muted">Tirar {direction === 'higher' ? 'mayor que' : 'menor que'}:</span>
                  <span className="text-cyan-400 font-mono text-lg">{target}</span>
                </div>
                <input
                  type="range"
                  min={direction === 'higher' ? 2 : 10}
                  max={direction === 'higher' ? 90 : 98}
                  className="w-full h-2 rounded-lg bg-white/10 appearance-none cursor-pointer accent-cyan-500"
                  value={target}
                  onChange={e => setTarget(parseInt(e.target.value))}
                  disabled={rolling}
                />
                
                <div className="grid grid-cols-2 gap-3 pt-2 text-center text-xs">
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <span className="text-tiki-muted block mb-1">PROBABILIDAD:</span>
                    <span className="font-black text-white text-sm">{winChance}%</span>
                  </div>
                  <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
                    <span className="text-tiki-muted block mb-1">MULTIPLICADOR:</span>
                    <span className="font-black text-yellow-400 text-sm">{multiplier.toFixed(2)}x</span>
                  </div>
                </div>
              </div>

              {/* Direction selector */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => { setDirection('higher'); setTarget(50) }}
                  disabled={rolling}
                  className={`py-3.5 rounded-xl font-bold text-sm transition-all border ${direction === 'higher' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Tirar Mayor ↑
                </button>
                <button
                  onClick={() => { setDirection('lower'); setTarget(50) }}
                  disabled={rolling}
                  className={`py-3.5 rounded-xl font-bold text-sm transition-all border ${direction === 'lower' ? 'bg-pink-500/20 border-pink-500/50 text-pink-300' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Tirar Menor ↓
                </button>
              </div>

              {/* Bet inputs */}
              <div className="flex gap-3 items-center">
                <input type="number" className="input flex-1 font-mono font-bold" value={betAmount} onChange={e => setBetAmount(parseInt(e.target.value) || 0)} min={10} disabled={rolling} />
                <span className="text-xs text-yellow-500 font-semibold">CALDICOINS</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[50,100,250,500,1000,5000].map(b => (
                  <button key={b} onClick={() => setBetAmount(b)} disabled={rolling} className="bet-quick-btn">{b >= 1000 ? `${b/1000}K` : b}</button>
                ))}
              </div>

              <button
                onClick={roll}
                disabled={rolling || betAmount < 10 || betAmount > balance}
                className="btn-primary w-full py-4 justify-center text-lg font-black"
              >
                {rolling ? (
                  <span className="flex items-center gap-2"><span className="spinner scale-75" /> Lanzando dados…</span>
                ) : `TIRAR DADOS — ${betAmount.toLocaleString()} F`}
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

              <span className="text-6xl block mb-4">🎲</span>
              <h2 className="font-display font-black text-4xl text-yellow-400 mb-2">
                ¡EXCELENTE TIRA!
              </h2>
              <p className="text-tiki-muted text-xs mb-6">Felicidades, ganaste en los dados.</p>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6">
                <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">
                  Premio Dados ({result?.multiplier}x)
                </span>
                <span className="text-3xl font-mono font-black text-cyan-400 block">
                  +{result?.payout?.toLocaleString()} CALDICOINS
                </span>
              </div>

              <button
                onClick={() => setShowReward(false)}
                className="btn-primary w-full py-3.5 justify-center font-black text-base shadow-[0_0_30px_rgba(251,191,36,0.3)]"
              >
                ¡OTRA TIRADA! 🔥
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function DiceSvg({ value, size = 100, win }) {
  // Return different SVG configurations based on dice face values 1-6
  const dotsMap = {
    1: [[50, 50]],
    2: [[25, 25], [75, 75]],
    3: [[25, 25], [50, 50], [75, 75]],
    4: [[25, 25], [25, 75], [75, 25], [75, 75]],
    5: [[25, 25], [25, 75], [50, 50], [75, 25], [75, 75]],
    6: [[25, 25], [25, 50], [25, 75], [75, 25], [75, 50], [75, 75]]
  }

  const dots = dotsMap[value] || dotsMap[6]

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
      <defs>
        <linearGradient id="diceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f472b6"/>
          <stop offset="100%" stopColor="#db2777"/>
        </linearGradient>
      </defs>
      <rect x="5" y="5" width="90" height="90" rx="20" fill="url(#diceGrad)" stroke="rgba(255,255,255,0.15)" strokeWidth="3"/>
      
      {win !== undefined && (
        <rect x="5" y="5" width="90" height="90" rx="20" fill={win ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'} strokeWidth="3"/>
      )}

      {/* Render dots */}
      {dots.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="7" fill="white" filter="drop-shadow(0px 2px 2px rgba(0,0,0,0.3))"/>
      ))}
    </svg>
  )
}
