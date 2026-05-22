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

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return

    const onResult = ({ winningNumber, totalPremio, netProfit, totalBet }) => {
      setGirarning(false)
      setResult(winningNumber)
      setHistory(prev => [winningNumber, ...prev].slice(0, 15))
      setActiveBets([])
      if (netProfit > 0) {
        toast.success(`${winningNumber} — Ganaste ${netProfit.toLocaleString()} CALDICOINS!`)
      } else {
        toast.error(`${winningNumber} — Better luck next spin.`)
      }
    }
    const onError = ({ message }) => { toast.error(message); setGirarning(false) }
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }

    socket.on('roulette:result', onResult)
    socket.on('roulette:error', onError)
    socket.on('balance:update', onSaldoUpdate)

    return () => {
      socket.off('roulette:result', onResult)
      socket.off('roulette:error', onError)
      socket.off('balance:update', onSaldoUpdate)
    }
  }, [socket])

  const addBet = () => {
    if (!betType) { toast.error('Select a bet type'); return }
    if (betAmount < 10) { toast.error('Apuesta mínima 10 CALDICOINS'); return }
    const totalBet = activeBets.reduce((s, b) => s + b.amount, 0) + betAmount
    if (totalBet > balance) { toast.error('CALDICOINS insuficientes'); return }

    setActiveBets(prev => [...prev, { type: betType, value: betValue, amount: betAmount }])
    toast.success(`Apuesta colocada: ${betType}${betValue !== null ? ` (${betValue})` : ''} — ${betAmount} CALDICOINS`)
  }

  const spin = () => {
    if (activeBets.length === 0) { toast.error('Primero hacé una apuesta'); return }
    if (!socket) return
    setGirarning(true)
    setResult(null)
    socket.emit('roulette:bet', { roomCode, bets: activeBets })
    setTimeout(() => {
      socket.emit('roulette:spin', { roomCode })
    }, 100)
  }

  const clearBets = () => setActiveBets([])

  const colorClass = { red: 'bg-red-600', black: 'bg-gray-800', green: 'bg-emerald-600' }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">European Roulette</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Wheel display */}
            <div className="glass rounded-3xl p-6 text-center" style={{ background: 'radial-gradient(ellipse at center, rgba(16,185,129,0.08) 0%, transparent 70%)' }}>
              <AnimatePresence mode="wait">
                {spinning ? (
                  <motion.div key="spin" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-12">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                      className="w-32 h-32 mx-auto rounded-full border-4 border-emerald-500 border-t-transparent"
                    />
                    <p className="mt-4 text-tiki-muted animate-pulse">Girarning…</p>
                  </motion.div>
                ) : result !== null ? (
                  <motion.div key="result" initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-8">
                    <div className={`w-32 h-32 rounded-full mx-auto flex items-center justify-center text-5xl font-display font-black text-white ${colorClass[getColor(result)]}`}>
                      {result}
                    </div>
                    <p className="mt-4 text-lg font-semibold" style={{ color: getColor(result) === 'red' ? '#f87171' : getColor(result) === 'green' ? '#34d399' : '#94a3b8' }}>
                      {getColor(result).charAt(0).toUpperCase() + getColor(result).slice(1)}
                      {result !== 0 && ` • ${result % 2 === 0 ? 'Even' : 'Odd'}`}
                      {result !== 0 && ` • ${result <= 18 ? '1-18' : '19-36'}`}
                    </p>
                  </motion.div>
                ) : (
                  <motion.div key="idle" className="py-12">
                    <div className="w-32 h-32 rounded-full mx-auto border-4 border-emerald-500/30 flex items-center justify-center">
                      <span className="text-tiki-muted text-4xl font-display font-black">?</span>
                    </div>
                    <p className="mt-4 text-tiki-muted text-sm">Colocá tus apuestas, then spin!</p>
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
            <div className="glass rounded-2xl p-5 space-y-4">
              <h3 className="font-semibold text-tiki-text">Apostars</h3>

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
                <p className="text-xs text-tiki-muted mb-2">Straight (35×) — click a number:</p>
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
                  placeholder="Amount"
                  value={betAmount}
                  onChange={e => setBetAmount(parseInt(e.target.value) || 0)}
                  min={10}
                />
                <span className="text-xs text-yellow-500">CALDICOINS</span>
                <button onClick={addBet} disabled={!betType || betAmount < 10} className="btn-green text-sm py-2.5 px-4">
                  + Add Bet
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
                    <button onClick={spin} disabled={spinning} className="btn-primary flex-1 py-3 justify-center text-base">
                      {spinning ? <span className="spinner scale-75" /> : 'Girar!'}
                    </button>
                    <button onClick={clearBets} disabled={spinning} className="btn-ghost px-4 py-3">Clear</button>
                  </div>
                </div>
              )}
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
