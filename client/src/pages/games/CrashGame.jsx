import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

export default function CrashGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [balance, setBalance] = useState(user?.balance || 0)
  const [betAmount, setBetAmount] = useState(100)
  const [phase, setPhase] = useState('waiting') // waiting | betting | flying | crashed
  const [multiplier, setMultiplicador] = useState(1.00)
  const [crashPoint, setCrashPoint] = useState(null)
  const [history, setHistory] = useState([])
  const [hasBet, setHasBet] = useState(false)
  const [cashedOut, setCashedOut] = useState(false)
  const [cashoutInfo, setCashoutInfo] = useState(null)
  const [bettingCountdown, setBettingCountdown] = useState(null)
  const countdownRef = useRef(null)
  const canvasRef = useRef(null)
  const graphPointsRef = useRef([])

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return

    // Join the crash game room
    socket.emit('crash:join', { roomCode })

    const onState = (state) => {
      setPhase(state.phase)
      setMultiplicador(state.multiplier || 1.00)
      setHistory(state.history || [])
      if (state.phase === 'betting') {
        setBettingCountdown(Math.ceil((state.bettingGanastedowMs || 10000) / 1000))
        setHasBet(false)
        setCashedOut(false)
        setCashoutInfo(null)
        graphPointsRef.current = []
      }
    }

    const onRoundStart = ({ bettingGanastedowMs }) => {
      setPhase('betting')
      setMultiplicador(1.00)
      setCrashPoint(null)
      setHasBet(false)
      setCashedOut(false)
      setCashoutInfo(null)
      graphPointsRef.current = []
      let sec = Math.ceil(bettingGanastedowMs / 1000)
      setBettingCountdown(sec)
      if (countdownRef.current) clearInterval(countdownRef.current)
      countdownRef.current = setInterval(() => {
        sec--
        setBettingCountdown(sec)
        if (sec <= 0) clearInterval(countdownRef.current)
      }, 1000)
    }

    const onTick = ({ multiplier: m }) => {
      setPhase('flying')
      setMultiplicador(m)
      graphPointsRef.current.push(m)
    }

    const onCrash = ({ crashPoint: cp, history: h }) => {
      setCrashPoint(cp)
      setPhase('crashed')
      setHistory(h || [])
      if (hasBet && !cashedOut) {
        toast.error(`Crasheó at ${cp.toFixed(2)}x — You lost!`)
      }
    }

    const onBetPlaced = ({ balance: b }) => {
      setHasBet(true)
      setBalance(b)
      updateBalance(b)
      toast.success('Apuesta colocada!')
    }

    const onCashedOut = ({ cashoutMultiplicador, payout, balance: b }) => {
      setCashedOut(true)
      setCashoutInfo({ cashoutMultiplicador, payout })
      setBalance(b)
      updateBalance(b)
      toast.success(`Retirado at ${cashoutMultiplicador.toFixed(2)}x! +${payout.toLocaleString()} CALDICOINS`)
    }

    const onError = ({ message }) => toast.error(message)
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }

    socket.on('crash:state', onState)
    socket.on('crash:roundStart', onRoundStart)
    socket.on('crash:tick', onTick)
    socket.on('crash:roundCrash', onCrash)
    socket.on('crash:betPlaced', onBetPlaced)
    socket.on('crash:cashedOut', onCashedOut)
    socket.on('crash:error', onError)
    socket.on('balance:update', onSaldoUpdate)

    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      socket.off('crash:state', onState)
      socket.off('crash:roundStart', onRoundStart)
      socket.off('crash:tick', onTick)
      socket.off('crash:roundCrash', onCrash)
      socket.off('crash:betPlaced', onBetPlaced)
      socket.off('crash:cashedOut', onCashedOut)
      socket.off('crash:error', onError)
      socket.off('balance:update', onSaldoUpdate)
    }
  }, [socket, hasBet, cashedOut])

  const placeBet = () => {
    if (!socket || phase !== 'betting') { toast.error('Fase de apuesta only'); return }
    if (betAmount < 10) { toast.error('Apuesta mínima 10 CALDICOINS'); return }
    if (betAmount > balance) { toast.error('CALDICOINS insuficientes'); return }
    socket.emit('crash:bet', { roomCode, amount: betAmount })
  }

  const cashout = () => {
    if (!socket || phase !== 'flying' || !hasBet || cashedOut) return
    socket.emit('crash:cashout', { roomCode })
  }

  // Multiplicador color
  const mColor = phase === 'crashed' ? '#ef4444'
    : multiplier >= 10 ? '#fbbf24'
    : multiplier >= 3 ? '#10b981'
    : '#22d3ee'

  const phaseLabel = {
    waiting: 'Esperando ronda…',
    betting: `Betting — ${bettingCountdown}s`,
    flying: null,
    crashed: `Crasheó at ${crashPoint?.toFixed(2)}x`,
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Crash</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Crash graph area */}
            <div className="glass rounded-3xl overflow-hidden" style={{ background: 'radial-gradient(ellipse at bottom, rgba(239,68,68,0.06) 0%, transparent 70%)' }}>
              <div className="flex items-center justify-between px-6 pt-4 pb-2">
                {/* History */}
                <div className="flex gap-1.5 flex-wrap">
                  {history.slice(0, 8).map((h, i) => (
                    <span key={i} className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${
                      h.crashPoint < 1.5 ? 'bg-red-500/20 text-red-400' :
                      h.crashPoint < 3 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {h.crashPoint.toFixed(2)}×
                    </span>
                  ))}
                </div>
                {phase !== 'flying' && phase !== 'crashed' && (
                  <span className="text-xs text-tiki-muted">{phaseLabel[phase]}</span>
                )}
              </div>

              {/* Multiplicador display */}
              <div className="flex items-center justify-center py-16">
                <div className="text-center">
                  <motion.div
                    key={phase}
                    animate={phase === 'flying' ? { scale: [1, 1.02, 1], opacity: 1 } : { scale: 1, opacity: 1 }}
                    transition={phase === 'flying' ? { duration: 0.5, repeat: Infinity } : {}}
                  >
                    <span
                      className="crash-multiplier font-mono"
                      style={{ color: mColor, textShadow: `0 0 40px ${mColor}` }}
                    >
                      {phase === 'crashed' ? crashPoint?.toFixed(2) : multiplier.toFixed(2)}×
                    </span>
                  </motion.div>
                  {phase === 'crashed' && <p className="text-red-400 font-bold mt-2 text-xl">CRASHED!</p>}
                  {phase === 'betting' && (
                    <p className="text-tiki-muted mt-2 animate-pulse">
                      Betting window — {bettingCountdown}s remaining
                    </p>
                  )}
                  {cashedOut && cashoutInfo && (
                    <motion.p
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-green-400 font-bold mt-2"
                    >
                      Retirado at {cashoutInfo.cashoutMultiplicador.toFixed(2)}× (+{cashoutInfo.payout.toLocaleString()} F)
                    </motion.p>
                  )}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="flex gap-3">
                <input
                  type="number"
                  className="input flex-1 font-mono font-bold text-lg"
                  value={betAmount}
                  onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                  disabled={phase !== 'betting' || hasBet}
                  min={10}
                />
                <span className="flex items-center text-xs text-yellow-500 font-semibold">CALDICOINS</span>
              </div>

              {/* Quick bets */}
              <div className="flex gap-2 flex-wrap">
                {[50,100,250,500,1000,5000].map(b => (
                  <button key={b} onClick={() => setBetAmount(b)} disabled={phase !== 'betting' || hasBet}
                    className="bet-quick-btn">{b >= 1000 ? `${b/1000}K` : b}</button>
                ))}
              </div>

              <div className="flex gap-3">
                {!hasBet ? (
                  <button
                    onClick={placeBet}
                    disabled={phase !== 'betting' || hasBet || betAmount < 10 || betAmount > balance}
                    className="btn-primary flex-1 py-3.5 justify-center text-base"
                  >
                    {phase === 'betting' ? `Bet ${betAmount.toLocaleString()} CALDICOINS` : 'Esperando…'}
                  </button>
                ) : (
                  <button
                    onClick={cashout}
                    disabled={phase !== 'flying' || cashedOut}
                    className={`flex-1 py-3.5 justify-center text-base font-bold rounded-xl transition-all ${
                      phase === 'flying' && !cashedOut
                        ? 'bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-green-glow hover:shadow-[0_0_40px_rgba(16,185,129,0.6)] animate-pulse'
                        : 'btn-ghost opacity-50'
                    }`}
                  >
                    {cashedOut ? `Cashed at ${cashoutInfo?.cashoutMultiplicador?.toFixed(2)}×` :
                      phase === 'flying' ? `CASHOUT @ ${multiplier.toFixed(2)}×` : 'Apuesta colocada — waiting…'}
                  </button>
                )}
              </div>
            </div>

            <div className="glass rounded-2xl p-4 text-xs text-tiki-muted space-y-1">
              <p className="font-semibold text-tiki-text text-sm mb-2">How to play</p>
              <p>• Place bets during the 10-second betting window.</p>
              <p>• The multiplier rises from 1.00× until it crashes.</p>
              <p>• Click CASHOUT before the crash to win multiplier × bet.</p>
              <p>• If you don't cashout in time, you lose your bet.</p>
            </div>
          </div>

          {/* Chat */}
          <div className="h-[600px]">
            <ChatPanel roomCode={roomCode} />
          </div>
        </div>
      </main>
    </div>
  )
}
