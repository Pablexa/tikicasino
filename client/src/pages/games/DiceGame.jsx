import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

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
        if (r.win) toast.success(`¡Tiraste ${r.roll}! ¡Ganaste! +${r.payout.toLocaleString()} CALDICOINS!`)
        else toast.error(`¡Tiraste ${r.roll}! Perdiste en esta ronda.`)
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
                        {result.win ? `Ganaste! +${result.payout.toLocaleString()} F` : 'No luck this roll'}
                      </p>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div key="idle" animate={{ y: [0, -8, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                    <DiceSvg value={6} size={120} />
                    <p className="mt-4 text-tiki-muted">Set your target and roll!</p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* History */}
              {history.length > 0 && (
                <div className="flex justify-center gap-2 mt-6 flex-wrap">
                  {history.map((h, i) => (
                    <span key={i} className={`px-2 py-1 rounded-lg text-xs font-mono font-bold ${h.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                      {h.roll}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-5">
              {/* Direction */}
              <div className="grid grid-cols-2 gap-3">
                {['higher', 'lower'].map(d => (
                  <button
                    key={d}
                    onClick={() => setDirection(d)}
                    className={`py-3 rounded-xl font-bold text-lg transition-all border-2 ${direction === d ? 'bg-pink-500/20 border-pink-500/50 text-pink-300' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                  >
                    Tirar {d.charAt(0).toUpperCase() + d.slice(1)}
                  </button>
                ))}
              </div>

              {/* Target slider */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span className="text-tiki-muted">Target: <span className="text-tiki-text font-bold">{target}</span></span>
                  <span className="text-tiki-muted">Ganaste if roll is <span className="text-pink-400 font-bold">{direction}</span> than {target}</span>
                </div>
                <input
                  type="range"
                  min={2} max={99}
                  value={target}
                  onChange={e => setTarget(parseInt(e.target.value))}
                  className="w-full accent-pink-500"
                />
                <div className="flex justify-between text-xs text-tiki-muted mt-1">
                  <span>2</span><span>99</span>
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xs text-tiki-muted">Ganaste Chance</p>
                  <p className="font-mono font-bold text-xl text-cyan-400">{winChance}%</p>
                </div>
                <div className="glass rounded-xl p-3 text-center">
                  <p className="text-xs text-tiki-muted">Multiplicador</p>
                  <p className="font-mono font-bold text-xl text-yellow-400">{multiplier.toFixed(2)}×</p>
                </div>
              </div>

              {/* Bet amount */}
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
                onClick={roll}
                disabled={rolling || betAmount < 10 || betAmount > balance || winChance <= 0}
                className="btn-primary w-full py-4 justify-center text-lg font-black"
              >
                {rolling ? <span className="flex items-center gap-2"><span className="spinner scale-75" />Tiraring…</span>
                  : `Tirar — Ganaste ${(betAmount * multiplier).toFixed(0)} CALDICOINS`}
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

function DiceSvg({ value, size = 80, win }) {
  const dots = {
    1: [[50, 50]],
    2: [[30, 30], [70, 70]],
    3: [[30, 30], [50, 50], [70, 70]],
    4: [[30, 30], [70, 30], [30, 70], [70, 70]],
    5: [[30, 30], [70, 30], [50, 50], [30, 70], [70, 70]],
    6: [[30, 28], [70, 28], [30, 50], [70, 50], [30, 72], [70, 72]],
  }
  const positions = dots[Math.max(1, Math.min(6, value))] || dots[1]
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" style={{ display: 'inline-block' }}>
      <rect x="5" y="5" width="90" height="90" rx="18"
        fill={win === true ? 'rgba(16,185,129,0.2)' : win === false ? 'rgba(239,68,68,0.2)' : 'rgba(236,72,153,0.15)'}
        stroke={win === true ? '#10b981' : win === false ? '#ef4444' : '#ec4899'}
        strokeWidth="3"/>
      {positions.map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="7" fill={win === true ? '#10b981' : win === false ? '#ef4444' : '#ec4899'}/>
      ))}
    </svg>
  )
}
