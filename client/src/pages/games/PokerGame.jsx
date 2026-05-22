import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BetInput from '../../components/BetInput.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

const SUIT_SYMBOLS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }
const RED_SUITS = ['hearts', 'diamonds']

// Poker hand rankings
const HAND_NAMES = {
  royal_flush: '🔥 Royal Flush',
  straight_flush: '✨ Straight Flush',
  four_of_a_kind: '💥 Póker',
  full_house: '🏠 Full House',
  flush: '🌊 Color',
  straight: '↗️ Escalera',
  three_of_a_kind: '3️⃣ Trío',
  two_pair: '2️⃣ Doble Par',
  pair: '1️⃣ Par',
  high_card: '🃏 Carta Alta',
}

const PAYOUTS = {
  royal_flush: 800, straight_flush: 50, four_of_a_kind: 25,
  full_house: 9, flush: 6, straight: 4,
  three_of_a_kind: 3, two_pair: 2, pair: 1, high_card: 0,
}

function PlayingCard({ card, held, onToggle, small = false, dealing = false }) {
  if (!card) return (
    <div className="playing-card" style={{ minWidth: 56, minHeight: 84, opacity: 0.3 }}>
      <span className="text-tiki-muted">?</span>
    </div>
  )
  const isRed = RED_SUITS.includes(card.suit)
  return (
    <motion.div
      initial={dealing ? { rotateY: 180, opacity: 0 } : false}
      animate={{ rotateY: 0, opacity: 1 }}
      transition={{ duration: 0.4 }}
      onClick={onToggle}
      className={`playing-card ${isRed ? 'red' : 'black'} relative cursor-pointer select-none transition-all duration-200 ${held ? 'ring-2 ring-yellow-400 -translate-y-3 shadow-lg shadow-yellow-400/30' : 'hover:-translate-y-1'}`}
      style={{ minWidth: small ? 44 : 56, minHeight: small ? 66 : 84 }}
    >
      <span style={{ fontSize: small ? 11 : 14 }}>{card.rank}</span>
      <span style={{ fontSize: small ? 9 : 12 }}>{SUIT_SYMBOLS[card.suit]}</span>
      {held && (
        <div className="absolute -top-5 left-1/2 -translate-x-1/2 text-yellow-400 font-bold text-xs">
          GUARDAR
        </div>
      )}
    </motion.div>
  )
}

export default function PokerGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [phase, setPhase] = useState('betting') // betting | dealt | result
  const [hand, setHand] = useState([])
  const [held, setHeld] = useState([false, false, false, false, false])
  const [result, setResult] = useState(null)
  const [bet, setBet] = useState(100)
  const [balance, setBalance] = useState(user?.balance || 0)
  const [loading, setLoading] = useState(false)
  const [dealing, setDealing] = useState(false)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return
    const onState = ({ hand: h, phase: p, result: r, balance: b }) => {
      if (h) setHand(h)
      if (p) setPhase(p)
      if (r !== undefined) setResult(r)
      if (b !== undefined) { setBalance(b); updateBalance(b) }
      setLoading(false)
      setDealing(false)
      if (r && r.handName) {
        const payout = PAYOUTS[r.handName] || 0
        if (payout > 0) toast.success(`${HAND_NAMES[r.handName]} — +${r.winAmount?.toLocaleString()} CALDICOINS!`)
        else toast(`${HAND_NAMES[r.handName]} — Sin pago`, { icon: '🃏' })
      }
    }
    const onError = ({ message }) => { toast.error(message); setLoading(false) }
    const onBalanceUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }
    socket.on('poker:state', onState)
    socket.on('poker:error', onError)
    socket.on('balance:update', onBalanceUpdate)
    return () => {
      socket.off('poker:state', onState)
      socket.off('poker:error', onError)
      socket.off('balance:update', onBalanceUpdate)
    }
  }, [socket])

  const deal = () => {
    if (bet < 10) { toast.error('Mínimo 10 CALDICOINS'); return }
    if (bet > balance) { toast.error('CALDICOINS insuficientes'); return }
    setLoading(true); setDealing(true)
    setHeld([false, false, false, false, false])
    setResult(null)
    socket.emit('poker:deal', { roomCode, amount: bet })
  }

  const draw = () => {
    setLoading(true); setDealing(true)
    socket.emit('poker:draw', { roomCode, held })
  }

  const toggleHeld = (i) => {
    if (phase !== 'dealt') return
    setHeld(prev => { const n = [...prev]; n[i] = !n[i]; return n })
  }

  const newRound = () => {
    setPhase('betting'); setHand([]); setResult(null)
    setHeld([false, false, false, false, false])
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Sala</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Video Poker</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            {/* Table */}
            <div className="glass rounded-3xl p-6" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.05) 0%, transparent 70%)' }}>
              {/* Hand display */}
              <div className="flex justify-center items-end gap-3 mb-6 min-h-32">
                <AnimatePresence>
                  {hand.length > 0 ? hand.map((card, i) => (
                    <PlayingCard key={i} card={card} held={held[i]} onToggle={() => toggleHeld(i)} dealing={dealing} />
                  )) : (
                    <p className="text-tiki-muted text-sm self-center">Las cartas aparecen acá</p>
                  )}
                </AnimatePresence>
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-4">
                    <span className="font-display font-black text-3xl text-yellow-400">
                      {HAND_NAMES[result.handName] || '🃏 Mano'}
                    </span>
                    {result.winAmount > 0 && (
                      <p className="text-green-400 font-mono font-bold mt-1">+{result.winAmount?.toLocaleString()} CALDICOINS</p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Phase hint */}
              {phase === 'dealt' && !result && (
                <p className="text-center text-tiki-muted text-sm">
                  Tocá las cartas que querés <span className="text-yellow-400 font-semibold">GUARDAR</span>, luego pedí nuevas
                </p>
              )}
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-4">
              {phase === 'betting' && (
                <>
                  <BetInput value={bet} onChange={setBet} min={10} max={Math.min(10000, balance)} balance={balance} />
                  <button onClick={deal} disabled={loading || bet < 10 || bet > balance} className="btn-primary w-full justify-center py-3.5 text-base">
                    {loading ? <span className="spinner scale-75" /> : `Repartir — ${bet.toLocaleString()} CALDICOINS`}
                  </button>
                </>
              )}
              {phase === 'dealt' && (
                <button onClick={draw} disabled={loading} className="btn-primary w-full justify-center py-3.5 text-base">
                  {loading ? <span className="spinner scale-75" /> : 'Pedir nuevas cartas'}
                </button>
              )}
              {phase === 'result' && (
                <button onClick={newRound} className="btn-primary w-full justify-center py-3.5 text-base">
                  Nueva mano
                </button>
              )}
              {bet > 0 && phase !== 'betting' && (
                <p className="text-center text-xs text-tiki-muted">
                  Apuesta: <span className="text-yellow-400 font-mono font-bold">{bet.toLocaleString()} CALDICOINS</span>
                </p>
              )}
            </div>

            {/* Payout table */}
            <div className="glass rounded-2xl p-4">
              <p className="font-semibold text-sm text-tiki-text mb-3">Tabla de pagos (× apuesta)</p>
              <div className="grid grid-cols-2 gap-1 text-xs">
                {Object.entries(PAYOUTS).filter(([, v]) => v > 0).map(([k, v]) => (
                  <div key={k} className={`flex justify-between px-3 py-1.5 rounded-lg ${result?.handName === k ? 'bg-yellow-400/20 text-yellow-400' : 'text-tiki-muted'}`}>
                    <span>{HAND_NAMES[k]}</span>
                    <span className="font-mono font-bold">{v}×</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="h-[600px]">
            <ChatPanel roomCode={roomCode} />
          </div>
        </div>
        <p className="text-center text-xs text-tiki-muted mt-6">CALDICOINS son puntos ficticios. Sin dinero real.</p>
      </main>
    </div>
  )
}
