import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import RightSidebar from '../../components/RightSidebar.jsx'
import toast from 'react-hot-toast'
import { playWinSound, playLoseSound } from '../../utils/audio.js'

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
  
  // Betting states
  const [hasBet, setHasBet] = useState(false)
  const [cashedOut, setCashedOut] = useState(false)
  const [cashoutInfo, setCashoutInfo] = useState(null)
  const [bettingCountdown, setBettingCountdown] = useState(null)
  
  // Auto cashout states
  const [autoCashoutEnabled, setAutoCashoutEnabled] = useState(false)
  const [autoCashoutVal, setAutoCashoutVal] = useState(2.00)
  
  const [showReward, setShowReward] = useState(false)

  const countdownRef = useRef(null)
  const canvasRef = useRef(null)
  const graphPointsRef = useRef([])
  
  // Keep values fresh in refs to avoid closure stale state in socket callbacks
  const hasBetRef = useRef(false)
  const cashedOutRef = useRef(false)
  const autoEnabledRef = useRef(false)
  const autoValRef = useRef(2.00)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    hasBetRef.current = hasBet
  }, [hasBet])

  useEffect(() => {
    cashedOutRef.current = cashedOut
  }, [cashedOut])

  useEffect(() => {
    autoEnabledRef.current = autoCashoutEnabled
  }, [autoCashoutEnabled])

  useEffect(() => {
    autoValRef.current = autoCashoutVal
  }, [autoCashoutVal])

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    
    // Clear canvas
    ctx.clearRect(0, 0, width, height)
    
    // Draw neon grid background
    ctx.strokeStyle = 'rgba(255,255,255,0.025)'
    ctx.lineWidth = 1
    const gridSize = 25
    for (let x = 0; x < width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, height)
      ctx.stroke()
    }
    for (let y = 0; y < height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(width, y)
      ctx.stroke()
    }

    // Axes lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(40, 0)
    ctx.lineTo(40, height - 40)
    ctx.lineTo(width, height - 40)
    ctx.stroke()

    const points = graphPointsRef.current

    if (phase === 'betting' || phase === 'waiting') {
      // Clean canvas rocket sitting on launchpad
      ctx.font = '36px Arial'
      ctx.textAlign = 'center'
      ctx.fillText('🚀', 50, height - 55)
    } else if (phase === 'flying' || phase === 'crashed') {
      const startX = 40
      const startY = height - 40
      const usableW = width - 80
      const usableH = height - 80

      // Render curve
      if (points.length > 0) {
        ctx.beginPath()
        ctx.strokeStyle = 'rgba(34, 211, 238, 0.8)' // Cyan curve
        ctx.lineWidth = 4
        ctx.shadowColor = 'rgba(34, 211, 238, 0.6)'
        ctx.shadowBlur = 10

        ctx.moveTo(startX, startY)
        let lastX = startX
        let lastY = startY

        for (let i = 0; i < points.length; i++) {
          const val = points[i]
          const ratioX = Math.min(i / 90, 1.0)
          const ratioY = Math.min(Math.log(val) / Math.log(8), 1.0)

          const x = startX + ratioX * usableW
          const y = startY - ratioY * usableH
          ctx.lineTo(x, y)
          lastX = x
          lastY = y
        }
        ctx.stroke()
        ctx.shadowBlur = 0 // reset

        // Gradient under curve
        const gradient = ctx.createLinearGradient(0, startY, 0, 0)
        gradient.addColorStop(0, 'rgba(6, 182, 212, 0.0)')
        gradient.addColorStop(1, 'rgba(6, 182, 212, 0.1)')
        ctx.lineTo(lastX, startY)
        ctx.closePath()
        ctx.fillStyle = gradient
        ctx.fill()

        // Draw emoji
        ctx.font = '42px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        if (phase === 'crashed') {
          ctx.fillText('💥', lastX, lastY)
        } else {
          ctx.fillText('🚀', lastX, lastY)
        }
      }
    }
  }, [multiplier, phase])

  useEffect(() => {
    if (!socket) return

    socket.emit('crash:join', { roomCode })

    const onState = (state) => {
      setPhase(state.phase)
      setMultiplicador(state.multiplier || 1.00)
      setHistory(state.history || [])
      if (state.phase === 'betting') {
        setBettingCountdown(Math.ceil((state.bettingWindowMs || 10000) / 1000))
        setHasBet(false)
        setCashedOut(false)
        setCashoutInfo(null)
        graphPointsRef.current = []
      }
    }

    const onRoundStart = ({ bettingWindowMs }) => {
      setPhase('betting')
      setMultiplicador(1.00)
      setCrashPoint(null)
      setHasBet(false)
      setCashedOut(false)
      setCashoutInfo(null)
      graphPointsRef.current = []
      
      let sec = Math.ceil(bettingWindowMs / 1000)
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
      
      // Auto-cashout trigger logic
      if (hasBetRef.current && !cashedOutRef.current && autoEnabledRef.current && autoValRef.current > 1.0) {
        if (m >= autoValRef.current) {
          socket.emit('crash:cashout', { roomCode })
          setCashedOut(true) // lock client-side immediately
        }
      }
    }

    const onCrash = ({ crashPoint: cp, history: h }) => {
      setCrashPoint(cp)
      setPhase('crashed')
      setHistory(h || [])
      
      // Reset countdown interval if any
      if (countdownRef.current) {
        clearInterval(countdownRef.current)
      }

      // Check if this client lost
      if (hasBetRef.current && !cashedOutRef.current) {
        playLoseSound()
        toast.error(`Explotó en ${cp.toFixed(2)}x — ¡Perdiste tu apuesta!`)
      }
    }

    const onBetPlaced = ({ balance: b }) => {
      setHasBet(true)
      setBalance(b)
      updateBalance(b)
      toast.success('¡Apuesta colocada!')
    }

    const onCashedOut = ({ cashoutMultiplier, payout, balance: b }) => {
      setCashedOut(true)
      setCashoutInfo({ cashoutMultiplier, payout })
      setBalance(b)
      updateBalance(b)
      playWinSound()
      setShowReward(true)
      toast.success(`¡Retirado en ${cashoutMultiplier.toFixed(2)}x! +${payout.toLocaleString()} CALDICOINS`)
    }

    const onError = ({ message }) => {
      toast.error(message)
      setHasBet(false)
      setCashedOut(false)
    }
    
    const onSaldoUpdate = ({ balance: b }) => {
      setBalance(b)
      updateBalance(b)
    }

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
  }, [socket, roomCode])

  const placeBet = () => {
    if (!socket || phase !== 'betting') { toast.error('Colocá tu apuesta en la fase de apuestas.'); return }
    if (betAmount < 10) { toast.error('Apuesta mínima 10 CALDICOINS'); return }
    if (betAmount > balance) { toast.error('CALDICOINS insuficientes'); return }
    socket.emit('crash:bet', { roomCode, amount: betAmount })
  }

  const cashout = () => {
    if (!socket || phase !== 'flying' || !hasBet || cashedOut) return
    socket.emit('crash:cashout', { roomCode })
  }

  const mColor = phase === 'crashed' ? '#ef4444'
    : multiplier >= 10 ? '#fbbf24'
    : multiplier >= 3 ? '#10b981'
    : '#22d3ee'

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
            {/* Graph area */}
            <div className="glass rounded-3xl overflow-hidden p-5 flex flex-col relative" style={{ background: 'radial-gradient(ellipse at bottom, rgba(34,211,238,0.06) 0%, transparent 70%)' }}>
              <div className="flex items-center justify-between mb-3 z-10">
                <div className="flex gap-2 flex-wrap items-center">
                  <span className="text-[10px] text-tiki-muted font-bold uppercase mr-1">Historial:</span>
                  {history.slice(0, 8).map((h, i) => (
                    <span key={i} className={`text-xs font-mono font-black px-2 py-0.5 rounded-full ${
                      h.crashPoint < 1.5 ? 'bg-red-500/20 text-red-400' :
                      h.crashPoint < 3 ? 'bg-orange-500/20 text-orange-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {h.crashPoint.toFixed(2)}×
                    </span>
                  ))}
                </div>
                {phase === 'betting' && (
                  <span className="text-xs text-yellow-400 font-bold tracking-wider animate-pulse uppercase">
                    ¡APUESTAS ABIERTAS! — {bettingCountdown}s
                  </span>
                )}
                {phase === 'waiting' && (
                  <span className="text-xs text-tiki-muted font-semibold animate-pulse uppercase">
                    Preparando cohete...
                  </span>
                )}
              </div>

              {/* Graphic Display Area */}
              <div className="relative w-full h-[320px] flex items-center justify-center">
                <canvas ref={canvasRef} width={640} height={320} className="w-full h-full block bg-black/40 rounded-2xl border border-white/5 shadow-inner" />
                
                {/* Clean Central Multiplier Display */}
                <div className="absolute flex flex-col items-center justify-center pointer-events-none select-none">
                  <motion.div
                    key={phase + multiplier}
                    initial={{ scale: 0.95 }}
                    animate={{ scale: phase === 'flying' ? [1, 1.03, 1] : 1 }}
                    transition={{ duration: 0.2 }}
                  >
                    <span
                      className="text-7xl font-black font-mono tracking-tight"
                      style={{ color: mColor, textShadow: `0 0 50px ${mColor}` }}
                    >
                      {phase === 'crashed' ? crashPoint?.toFixed(2) : multiplier.toFixed(2)}×
                    </span>
                  </motion.div>
                  {phase === 'crashed' && <span className="text-red-400 font-bold tracking-widest text-base uppercase mt-2 drop-shadow-[0_0_10px_rgba(239,68,68,0.5)]">¡EXPLOTÓ!</span>}
                  {phase === 'betting' && <span className="text-cyan-400 font-bold text-xs tracking-widest uppercase mt-2 animate-pulse">APUESTA AHORA</span>}
                </div>
              </div>
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                {/* Bet quantity */}
                <div className="space-y-2">
                  <span className="text-xs font-bold text-tiki-muted uppercase tracking-wider block">Monto de apuesta</span>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      className="input flex-1 font-mono font-bold text-lg"
                      value={betAmount}
                      onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                      disabled={phase !== 'betting' || hasBet}
                      min={10}
                    />
                    <span className="flex items-center text-xs text-yellow-500 font-black">F</span>
                  </div>
                </div>

                {/* Auto Cashout Controls */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-tiki-muted uppercase tracking-wider">Retiro Automático (Auto Cashout)</span>
                    <input
                      type="checkbox"
                      checked={autoCashoutEnabled}
                      onChange={e => setAutoCashoutEnabled(e.target.checked)}
                      className="w-4 h-4 rounded accent-cyan-500 cursor-pointer"
                      disabled={hasBet && phase !== 'betting'}
                    />
                  </div>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.1"
                      className={`input flex-1 font-mono font-bold ${!autoCashoutEnabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                      value={autoCashoutVal}
                      onChange={e => setAutoCashoutVal(parseFloat(e.target.value) || 1.1)}
                      disabled={!autoCashoutEnabled || (hasBet && phase !== 'betting')}
                      min={1.01}
                    />
                    <span className="flex items-center text-xs text-cyan-400 font-black">X</span>
                  </div>
                </div>
              </div>

              {/* Quick bets */}
              <div className="flex gap-2 flex-wrap">
                {[50,100,250,500,1000,5000].map(b => (
                  <button key={b} onClick={() => setBetAmount(b)} disabled={phase !== 'betting' || hasBet}
                    className="bet-quick-btn">{b >= 1000 ? `${b/1000}K` : b}</button>
                ))}
              </div>

              {/* ACTION BUTTON */}
              <div className="flex gap-3 pt-2">
                {!hasBet ? (
                  <button
                    onClick={placeBet}
                    disabled={phase !== 'betting' || betAmount < 10 || betAmount > balance}
                    className={`flex-1 py-4 justify-center text-base font-black rounded-xl transition-all shadow-lg ${
                      phase === 'betting'
                        ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-cyan-glow hover:shadow-[0_0_20px_rgba(6,182,212,0.4)]'
                        : 'bg-white/5 text-tiki-muted border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {phase === 'betting' ? `Apostar ${betAmount.toLocaleString()} F` : 'Esperando Siguiente Ronda…'}
                  </button>
                ) : (
                  <button
                    onClick={cashout}
                    disabled={phase !== 'flying' || cashedOut}
                    className={`flex-1 py-4 justify-center text-lg font-black rounded-xl transition-all ${
                      phase === 'flying' && !cashedOut
                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 text-white shadow-[0_0_40px_rgba(16,185,129,0.5)] hover:shadow-[0_0_60px_rgba(16,185,129,0.8)] cursor-pointer'
                        : 'bg-white/5 text-tiki-muted border border-white/5 cursor-not-allowed'
                    }`}
                  >
                    {cashedOut ? `¡Retirado en ${cashoutInfo?.cashoutMultiplier?.toFixed(2)}×!` :
                      phase === 'flying' ? `COBRAR / STOP (@ ${multiplier.toFixed(2)}×)` : 'Apuesta Colocada — esperando vuelo…'}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="h-[580px] lg:col-span-1">
            <RightSidebar roomCode={roomCode} />
          </div>
        </div>
      </main>

      {/* celebration full-screen reward modal */}
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
                      duration: 2.2 + Math.random() * 1.8,
                      repeat: Infinity,
                      delay: Math.random() * 1.5
                    }}
                  />
                ))}
              </div>

              <span className="text-6xl block mb-4">🏆</span>
              <h2 className="font-display font-black text-4xl text-yellow-400 mb-2">
                ¡COBRASTE A TIEMPO!
              </h2>
              <p className="text-tiki-muted text-xs mb-6">Felicidades, lograste bajarte del cohete.</p>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6">
                <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">
                  Multiplicador Asegurado
                </span>
                <span className="text-3xl font-mono font-black text-cyan-400 block mb-3">
                  {cashoutInfo?.cashoutMultiplier?.toFixed(2)}x
                </span>
                <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">
                  Caldicoins Acreditados
                </span>
                <span className="text-2xl font-mono font-black text-yellow-400 block">
                  +{cashoutInfo?.payout?.toLocaleString()} F
                </span>
              </div>

              <button
                onClick={() => setShowReward(false)}
                className="btn-primary w-full py-3.5 justify-center font-black text-base shadow-[0_0_30px_rgba(251,191,36,0.3)]"
              >
                ¡VAMOS! 🔥
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
