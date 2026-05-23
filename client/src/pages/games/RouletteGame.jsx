import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

// Color config
const NUM_COLORS = { 0: 'green' }
const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
function getColor(n) { if (n === 0) return 'green'; return RED_NUMS.includes(n) ? 'red' : 'black' }

const BET_TYPES = [
  { id: 'red', label: 'Red', color: 'bg-red-600 hover:bg-red-500', payout: '2×' },
  { id: 'black', label: 'Black', color: 'bg-gray-700 hover:bg-gray-600', payout: '2×' },
  { id: 'even', label: 'Even', color: 'bg-blue-700 hover:bg-blue-600', payout: '2×' },
  { id: 'odd', label: 'Odd', color: 'bg-blue-700 hover:bg-blue-600', payout: '2×' },
  { id: 'low', label: '1-18', color: 'bg-indigo-700 hover:bg-indigo-600', payout: '2×' },
  { id: 'high', label: '19-36', color: 'bg-indigo-700 hover:bg-indigo-600', payout: '2×' },
  { id: 'dozen1', label: '1st 12', color: 'bg-violet-700 hover:bg-violet-600', payout: '3×' },
  { id: 'dozen2', label: '2nd 12', color: 'bg-violet-700 hover:bg-violet-600', payout: '3×' },
  { id: 'dozen3', label: '3rd 12', color: 'bg-violet-700 hover:bg-violet-600', payout: '3×' },
]

export default function RouletteGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [balance, setBalance] = useState(user?.balance || 0)
  const [betType, setBetType] = useState(null)
  const [betValue, setBetValue] = useState(null)
  const [betAmount, setBetAmount] = useState(100)
  const [activeBets, setActiveBets] = useState([])
  const [spinning, setGirarning] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [timer, setTimer] = useState(20)
  const [status, setStatus] = useState('betting')
  const [isBetConfirmed, setIsBetConfirmed] = useState(false)
  const [roomBetsFeed, setRoomBetsFeed] = useState([])

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return

    socket.emit('roulette:join', { roomCode })

    const onState = ({ timer: t, status: s, history: h }) => {
      setTimer(t)
      setStatus(s)
      setHistory(h)
      if (s === 'spinning') setGirarning(true)
    }

    const onTick = ({ timer: t, status: s }) => {
      setTimer(t)
      setStatus(s)
      if (s === 'spinning') {
        setGirarning(true)
        setResult(null)
      } else {
        setGirarning(false)
      }
    }

    const onRoundStart = ({ timer: t, status: s }) => {
      setTimer(t)
      setStatus(s)
      setGirarning(false)
      setResult(null)
      setActiveBets([])
      setIsBetConfirmed(false)
    }

    const onPlayerBet = ({ nickname, amount }) => {
      setRoomBetsFeed(prev => [{ nickname, amount, id: Math.random() }, ...prev].slice(0, 10))
    }

    const onSpinResult = ({ winningNumber, history: h }) => {
      setGirarning(true)
      // Delay the result to match a 2-second spinning animation
      setTimeout(() => {
        setGirarning(false)
        setResult(winningNumber)
        setHistory(h)
      }, 2000)
    }

    const onResult = ({ winningNumber, netProfit }) => {
      setTimeout(() => {
        if (netProfit > 0) {
          toast.success(`¡Ganaste ${netProfit.toLocaleString()} CALDICOINS en Ruleta! 🎉`)
        } else {
          toast.error(`Perdiste en esta ronda de Ruleta. 😔`)
        }
      }, 2200)
    }

    const onError = ({ message }) => { toast.error(message); setGirarning(false) }
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }

    socket.on('roulette:state', onState)
    socket.on('roulette:tick', onTick)
    socket.on('roulette:roundStart', onRoundStart)
    socket.on('roulette:playerBet', onPlayerBet)
    socket.on('roulette:spinResult', onSpinResult)
    socket.on('roulette:result', onResult)
    socket.on('roulette:error', onError)
    socket.on('balance:update', onSaldoUpdate)

    return () => {
      socket.off('roulette:state', onState)
      socket.off('roulette:tick', onTick)
      socket.off('roulette:roundStart', onRoundStart)
      socket.off('roulette:playerBet', onPlayerBet)
      socket.off('roulette:spinResult', onSpinResult)
      socket.off('roulette:result', onResult)
      socket.off('roulette:error', onError)
      socket.off('balance:update', onSaldoUpdate)
    }
  }, [socket, roomCode])

  const addBet = () => {
    if (isBetConfirmed) { toast.error('Apuestas ya confirmadas para esta ronda'); return }
    if (status !== 'betting') { toast.error('Mesa cerrada, esperá a la próxima ronda'); return }
    if (!betType) { toast.error('Seleccioná un tipo de apuesta'); return }
    if (betAmount < 10) { toast.error('Apuesta mínima 10 CALDICOINS'); return }
    const totalBet = activeBets.reduce((s, b) => s + b.amount, 0) + betAmount
    if (totalBet > balance) { toast.error('CALDICOINS insuficientes'); return }

    setActiveBets(prev => [...prev, { type: betType, value: betValue, amount: betAmount }])
    toast.success(`Apuesta agregada: ${betType}${betValue !== null ? ` (${betValue})` : ''} — ${betAmount} CALDICOINS`)
  }

  const confirmBets = () => {
    if (activeBets.length === 0) { toast.error('Primero colocá tus apuestas'); return }
    if (!socket) return
    socket.emit('roulette:bet', { roomCode, bets: activeBets })
    setIsBetConfirmed(true)
    toast.success('¡Apuestas confirmadas y enviadas!')
  }

  const clearBets = () => {
    if (isBetConfirmed) { toast.error('No podés limpiar apuestas ya enviadas'); return }
    setActiveBets([])
  }

  const colorClass = { red: 'bg-red-600', black: 'bg-gray-800', green: 'bg-emerald-600' }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">European Roulette</h1>
            <span className="badge-violet text-xs">Multijugador</span>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">
            {/* Wheel display & Live Countdown */}
            <div className="glass rounded-3xl p-6 text-center relative" style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}>
              
              {/* Synced Timer */}
              <div className="absolute top-4 right-4 bg-black/40 border border-white/10 rounded-full px-4 py-1.5 flex items-center gap-2">
                <span className={`w-2.5 h-2.5 rounded-full ${status === 'betting' ? 'bg-green-400 animate-ping' : 'bg-red-500 animate-pulse'}`} />
                <span className="text-xs font-semibold text-white uppercase tracking-wider">
                  {status === 'betting' ? `Apostando: ${timer}s` : 'Girando...'}
                </span>
              </div>

              <div className="py-6 flex flex-col items-center justify-center">
                <RouletteWheel winningNumber={result} spinning={spinning} />
                
                {result !== null && !spinning && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mt-6 flex flex-col items-center justify-center bg-black/50 border border-white/10 rounded-2xl px-6 py-3"
                  >
                    <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-widest block mb-1">Resultado de Ronda</span>
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl font-display font-black text-white ${colorClass[getColor(result)]}`}>
                        {result}
                      </div>
                      <span className="text-base font-bold text-white font-mono uppercase">
                        {getColor(result) === 'red' ? 'Rojo' : getColor(result) === 'green' ? 'Cero' : 'Negro'}
                        {result !== 0 && ` • ${result % 2 === 0 ? 'Par' : 'Impar'}`}
                      </span>
                    </div>
                  </motion.div>
                )}
                
                {result === null && !spinning && (
                  <p className="mt-4 text-tiki-muted text-xs tracking-wider animate-pulse uppercase">Esperando apuestas...</p>
                )}
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="flex justify-center gap-1.5 flex-wrap mt-4">
                  {history.map((n, i) => (
                    <span key={i} className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${colorClass[getColor(n)]}`}>
                      {n}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Bet types */}
            <div className={`glass rounded-2xl p-5 space-y-4 ${status !== 'betting' || isBetConfirmed ? 'opacity-40 pointer-events-none' : ''}`}>
              <h3 className="font-semibold text-tiki-text flex items-center gap-2">
                🎰 Colocá tus Apuestas {isBetConfirmed && <span className="text-xs text-green-400 font-bold">(Apuestas Confirmadas)</span>}
              </h3>

              {/* Outside bets */}
              <div className="grid grid-cols-3 gap-2">
                {BET_TYPES.map(bt => (
                  <button
                    key={bt.id}
                    onClick={() => { setBetType(bt.id); setBetValue(null) }}
                    className={`py-2.5 px-3 rounded-xl text-sm font-semibold text-white transition-all border-2 ${bt.color} ${betType === bt.id ? 'border-white/50 scale-105' : 'border-transparent'}`}
                  >
                    <span>{bt.label}</span>
                    <span className="text-xs opacity-70 block">{bt.payout}</span>
                  </button>
                ))}
              </div>

              {/* Number grid */}
              <div>
                <p className="text-xs text-tiki-muted mb-2">Pleno (35×) — Tocá un número:</p>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: 37 }, (_, n) => (
                    <button
                      key={n}
                      onClick={() => { setBetType('straight'); setBetValue(n) }}
                      className={`roulette-number text-xs font-bold text-white transition-all ${colorClass[getColor(n)]} ${betType === 'straight' && betValue === n ? 'ring-2 ring-white scale-110' : ''}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Amount & actions */}
              <div className="flex items-center gap-3 pt-2 border-t border-white/5">
                <input
                  type="number"
                  className="input w-36 font-mono text-sm"
                  placeholder="Monto"
                  value={betAmount}
                  onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                  min={10}
                />
                <span className="text-xs text-yellow-500">CALDICOINS</span>
                <button onClick={addBet} disabled={!betType || betAmount < 10 || isBetConfirmed} className="btn-green text-sm py-2.5 px-4">
                  + Agregar Apuesta
                </button>
              </div>

              {/* Active bets */}
              {activeBets.length > 0 && (
                <div className="space-y-2">
                  {activeBets.map((b, i) => (
                    <div key={i} className="flex justify-between text-sm bg-white/5 rounded-lg px-3 py-2">
                      <span className="text-tiki-text">{b.type}{b.value !== null ? ` (${b.value})` : ''}</span>
                      <span className="text-yellow-400 font-mono">{b.amount.toLocaleString()} C</span>
                    </div>
                  ))}
                  <div className="flex gap-2 pt-2">
                    <button onClick={confirmBets} disabled={isBetConfirmed} className="btn-primary flex-1 py-3 justify-center text-base">
                      {isBetConfirmed ? '✓ Apuestas Enviadas' : 'Confirmar Apuestas'}
                    </button>
                    <button onClick={clearBets} disabled={isBetConfirmed} className="btn-ghost px-4 py-3">Limpiar</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right sidebar: Chat + Live Room Bets Feed */}
          <div className="flex flex-col gap-6 h-[600px]">
            {/* Live Bets Feed */}
            {roomBetsFeed.length > 0 && (
              <div className="glass rounded-2xl p-4 flex-shrink-0">
                <h3 className="font-semibold text-xs text-cyan-400 uppercase tracking-widest mb-3">
                  🔥 Apuestas en la Sala
                </h3>
                <div className="space-y-1.5 max-h-36 overflow-y-auto">
                  {roomBetsFeed.map(feed => (
                    <div key={feed.id} className="flex justify-between items-center text-xs bg-white/5 px-3 py-1.5 rounded-lg">
                      <span className="text-white font-medium truncate max-w-[100px]">{feed.nickname}</span>
                      <span className="text-yellow-400 font-mono font-bold">{feed.amount.toLocaleString()} C</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatPanel roomCode={roomCode} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

function RouletteWheel({ winningNumber, spinning }) {
  const canvasRef = useRef(null)
  const animationFrameRef = useRef(null)
  const angleRef = useRef(0)
  const ballAngleRef = useRef(0)
  const ballRadiusRef = useRef(95)

  const WHEEL_NUMBERS = [
    0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23,
    10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26
  ]

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const width = canvas.width
    const height = canvas.height
    const cx = width / 2
    const cy = height / 2

    let active = true

    const render = () => {
      if (!active) return

      // Spin physics
      if (spinning) {
        angleRef.current += 0.04
        ballAngleRef.current -= 0.07
        ballRadiusRef.current = 114 + Math.sin(Date.now() / 80) * 1.5 // realistic outer track wobble
      } else if (winningNumber !== null) {
        // Settle ball into target slot index
        const targetIdx = WHEEL_NUMBERS.indexOf(winningNumber)
        const targetSlotAngle = (targetIdx * 2 * Math.PI) / 37
        
        // Slow down wheel rotation slightly
        angleRef.current += 0.015
        
        // Lock ball to target slot so it rotates solidly WITH the wheel (angleRef.current + targetSlotAngle)
        const targetBallAngle = angleRef.current + targetSlotAngle
        
        // Handle angle interpolation taking the shortest path
        let angleDiff = targetBallAngle - ballAngleRef.current
        // Normalize angle difference to [-PI, PI] for shortest rotation path
        angleDiff = Math.atan2(Math.sin(angleDiff), Math.cos(angleDiff))
        
        ballAngleRef.current += angleDiff * 0.12
        
        // Settle into the pocket slot just below the numbers (82px)
        const radDiff = 82 - ballRadiusRef.current
        ballRadiusRef.current += radDiff * 0.12
      } else {
        // Idle slow rotation
        angleRef.current += 0.003
        ballAngleRef.current = 0
        ballRadiusRef.current = 0 // hidden
      }

      // Draw Wheel
      ctx.clearRect(0, 0, width, height)

      // 1. Mahogany wood outer ring
      const outerGrad = ctx.createRadialGradient(cx, cy, 122, cx, cy, 152)
      outerGrad.addColorStop(0, '#2e1005')
      outerGrad.addColorStop(0.5, '#5c220f')
      outerGrad.addColorStop(1, '#1c0803')
      ctx.fillStyle = outerGrad
      ctx.beginPath()
      ctx.arc(cx, cy, 152, 0, Math.PI * 2)
      ctx.fill()

      // 2. Brass rim separator
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.arc(cx, cy, 128, 0, Math.PI * 2)
      ctx.stroke()

      // 3. Black felt inner background
      ctx.fillStyle = '#0f172a'
      ctx.beginPath()
      ctx.arc(cx, cy, 124, 0, Math.PI * 2)
      ctx.fill()

      // 4. Slots (37 wedges)
      const wedgeAngle = (2 * Math.PI) / 37
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(angleRef.current)

      const RED_NUMS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]

      for (let i = 0; i < 37; i++) {
        const num = WHEEL_NUMBERS[i]
        const col = num === 0 ? '#059669' : RED_NUMS.includes(num) ? '#dc2626' : '#1e293b'
        
        ctx.fillStyle = col
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.arc(0, 0, 120, i * wedgeAngle - wedgeAngle / 2, i * wedgeAngle + wedgeAngle / 2)
        ctx.closePath()
        ctx.fill()

        // Subtle separator lines
        ctx.strokeStyle = 'rgba(217, 119, 6, 0.25)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(Math.cos(i * wedgeAngle - wedgeAngle/2) * 120, Math.sin(i * wedgeAngle - wedgeAngle/2) * 120)
        ctx.stroke()

        // Numbers text
        ctx.save()
        ctx.rotate(i * wedgeAngle)
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 10px Arial'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(num.toString(), 0, -104)
        ctx.restore()
      }
      ctx.restore()

      // 5. Central brass turret
      const turretGrad = ctx.createRadialGradient(cx, cy, 5, cx, cy, 36)
      turretGrad.addColorStop(0, '#fef08a')
      turretGrad.addColorStop(0.5, '#eab308')
      turretGrad.addColorStop(1, '#854d0e')
      ctx.fillStyle = turretGrad
      ctx.beginPath()
      ctx.arc(cx, cy, 36, 0, Math.PI * 2)
      ctx.fill()
      
      // Gold ring around turret
      ctx.strokeStyle = '#d97706'
      ctx.lineWidth = 2
      ctx.beginPath()
      ctx.arc(cx, cy, 36, 0, Math.PI * 2)
      ctx.stroke()
      
      // Turret handles (four metallic pins)
      ctx.save()
      ctx.translate(cx, cy)
      ctx.rotate(-angleRef.current * 1.5)
      ctx.fillStyle = '#fef08a'
      ctx.strokeStyle = '#ca8a04'
      ctx.lineWidth = 2
      for (let h = 0; h < 4; h++) {
        ctx.rotate(Math.PI / 2)
        ctx.beginPath()
        ctx.arc(0, -22, 4, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(0, 0)
        ctx.lineTo(0, -22)
        ctx.stroke()
      }
      ctx.restore()

      // 6. Draw Ball
      if (ballRadiusRef.current > 0) {
        const ballX = cx + Math.cos(ballAngleRef.current) * ballRadiusRef.current
        const ballY = cy + Math.sin(ballAngleRef.current) * ballRadiusRef.current

        // Shiny white/silver ball with heavy cyan glow
        ctx.save()
        ctx.shadowColor = '#22d3ee'
        ctx.shadowBlur = 12
        const ballGrad = ctx.createRadialGradient(ballX - 2, ballY - 2, 1, ballX, ballY, 5)
        ballGrad.addColorStop(0, '#ffffff')
        ballGrad.addColorStop(1, '#94a3b8')
        ctx.fillStyle = ballGrad
        ctx.beginPath()
        ctx.arc(ballX, ballY, 5, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }

      animationFrameRef.current = requestAnimationFrame(render)
    }

    render()

    return () => {
      active = false
      cancelAnimationFrame(animationFrameRef.current)
    }
  }, [spinning, winningNumber])

  return (
    <div className="relative w-[340px] h-[340px] mx-auto bg-black/60 rounded-full border border-white/5 shadow-2xl flex items-center justify-center p-2">
      <canvas ref={canvasRef} width={340} height={340} className="w-full h-full block rounded-full" />
    </div>
  )
}
