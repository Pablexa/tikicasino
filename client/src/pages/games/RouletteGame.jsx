import { useState, useEffect } from 'react'
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

              <AnimatePresence mode="wait">
                {spinning ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
                      className="w-32 h-32 mx-auto rounded-full border-4 border-emerald-500 border-t-transparent"
                    />
                    <p className="mt-4 text-tiki-muted animate-pulse">Girando la Ruleta...</p>
                  </motion.div>
                ) : result !== null ? (
                  <motion.div key="result" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8">
                    <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl font-display font-black text-white ${colorClass[getColor(result)]}`}>
                      {result}
                    </div>
                    <p className="mt-4 text-lg font-semibold" style={{ color: getColor(result) === 'red' ? '#f87171' : getColor(result) === 'green' ? '#34d399' : '#94a3b8' }}>
                      {getColor(result).toUpperCase()}
                      {result !== 0 && ` • ${result % 2 === 0 ? 'Even' : 'Odd'}`}
                      {result !== 0 && ` • ${result <= 18 ? '1-18' : '19-36'}`}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="py-12">
                    <div className="w-32 h-32 rounded-full mx-auto border-4 border-emerald-500/30 flex items-center justify-center">
                      <span className="text-tiki-muted text-4xl font-display font-black">?</span>
                    </div>
                    <p className="mt-4 text-tiki-muted text-sm">Colocá tus apuestas en el tablero</p>
                  </motion.div>
                )}
              </AnimatePresence>

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
                      <span className="text-yellow-400 font-mono">{b.amount.toLocaleString()} F</span>
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
