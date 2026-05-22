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

function PlayingCard({ card, small = false }) {
  if (!card) return null
  if (card.hidden) {
    return (
      <div className={`playing-card hidden ${small ? 'scale-75' : ''}`} style={{ minWidth: small ? 40 : 56, minHeight: small ? 60 : 84 }}>
        <span className="text-tiki-muted text-xl">?</span>
      </div>
    )
  }
  const isRed = RED_SUITS.includes(card.suit)
  return (
    <motion.div
      initial={{ scale: 0.8, rotateY: 90 }}
      animate={{ scale: 1, rotateY: 0 }}
      className={`playing-card ${isRed ? 'red' : 'black'}`}
      style={{ minWidth: small ? 40 : 56, minHeight: small ? 60 : 84, fontSize: small ? 12 : 16 }}
    >
      <span>{card.rank}</span>
      <span style={{ fontSize: small ? 10 : 14 }}>{SUIT_SYMBOLS[card.suit]}</span>
    </motion.div>
  )
}

const RESULT_COLORS = {
  win: 'text-green-400',
  blackjack: 'text-yellow-400',
  push: 'text-blue-400',
  bust: 'text-red-400',
  loss: 'text-red-400',
}
const RESULT_LABELS = {
  win: '¡Ganaste!',
  blackjack: '¡Blackjack!',
  push: 'Empate',
  bust: '¡Te pasaste!',
  loss: 'El dealer gana',
}

export default function BlackjackGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [state, setState] = useState(null)
  const [bet, setBet] = useState(100)
  const [balance, setBalance] = useState(user?.balance || 0)
  const [loading, setLoading] = useState(false)
  const [otherHands, setOtherHands] = useState({})

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return

    socket.emit('blackjack:join', { roomCode })

    const onState = ({ state: s, balance: b }) => {
      setState(s)
      if (b !== undefined) { setBalance(b); updateBalance(b) }
      // Clear loading whenever we get any state update
      setLoading(false)
      if (s.result) {
        if (['win', 'blackjack'].includes(s.result)) toast.success(`¡Ganaste! +${s.payout.toLocaleString()} CALDICOINS`)
        if (s.result === 'bust') toast.error('¡Te pasaste!')
        if (s.result === 'push') toast('Empate — apuesta devuelta', { icon: '🤝' })
        if (s.result === 'loss') toast.error('El dealer gana esta mano')
      }
    }
    const onError = ({ message }) => { toast.error(message); setLoading(false) }
    const onBalanceUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }

    const onRoomHands = (hands) => {
      setOtherHands(hands)
    }

    const onRoomHand = ({ userId, nickname, avatar, state: s }) => {
      if (userId === user?.id) return
      setOtherHands(prev => {
        if (s.phase === 'betting' || !s.phase) {
          const copy = { ...prev }
          delete copy[userId]
          return copy
        }
        return { ...prev, [userId]: { nickname, avatar, state: s } }
      })
    }

    socket.on('blackjack:state', onState)
    socket.on('blackjack:error', onError)
    socket.on('balance:update', onBalanceUpdate)
    socket.on('blackjack:roomHands', onRoomHands)
    socket.on('room:blackjack:hand', onRoomHand)

    return () => {
      socket.off('blackjack:state', onState)
      socket.off('blackjack:error', onError)
      socket.off('balance:update', onBalanceUpdate)
      socket.off('blackjack:roomHands', onRoomHands)
      socket.off('room:blackjack:hand', onRoomHand)
    }
  }, [socket, roomCode])

  const emit = useCallback((event, data = {}) => {
    if (!socket || loading) return
    setLoading(true)
    socket.emit(event, { roomCode, ...data })
  }, [socket, roomCode, loading])

  const placeBet = () => {
    if (bet < 10) { toast.error('Mínimo 10 CALDICOINS'); return }
    if (bet > balance) { toast.error('CALDICOINS insuficientes'); return }
    emit('blackjack:bet', { amount: bet })
  }

  const isPlaying = state?.phase === 'playing'
  const canSplit = isPlaying && state?.playerHand?.length === 2 &&
    state.playerHand[0]?.rank === state.playerHand[1]?.rank && balance >= state?.bet * 2

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Sala</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Blackjack</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Game table */}
          <div className="lg:col-span-2 space-y-4">
            <div className="glass rounded-3xl p-6 min-h-96" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.06) 0%, transparent 70%)' }}>

              {/* Dealer hand */}
              <div className="text-center mb-8">
                <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest mb-3">Dealer</p>
                {state?.dealerHand?.length > 0 ? (
                  <>
                    <div className="flex justify-center gap-2 mb-3 flex-wrap">
                      {state.dealerHand.map((card, i) => <PlayingCard key={i} card={card} />)}
                    </div>
                    {state.dealerValue !== null && (
                      <span className="badge-green text-sm font-mono">{state.dealerValue}</span>
                    )}
                  </>
                ) : (
                  <div className="h-24 flex items-center justify-center">
                    <p className="text-tiki-muted text-sm">Esperando apuesta…</p>
                  </div>
                )}
              </div>

              {/* Result banner */}
              <AnimatePresence>
                {state?.result && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    className="text-center my-4"
                  >
                    <span className={`font-display font-black text-4xl ${RESULT_COLORS[state.result] || 'text-white'}`}>
                      {RESULT_LABELS[state.result] || state.result}
                    </span>
                    {state.payout > 0 && (
                      <p className="text-green-400 font-mono font-bold mt-2">
                        +{state.payout.toLocaleString()} CALDICOINS
                      </p>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Player hand */}
              <div className="text-center">
                {state?.playerHand?.length > 0 ? (
                  <>
                    <div className="flex justify-center gap-2 mb-3 flex-wrap">
                      {state.playerHand.map((card, i) => <PlayingCard key={i} card={card} />)}
                    </div>
                    <span className={`badge-green text-sm font-mono ${state.playerValue > 21 ? '!bg-red-500/20 !border-red-500/30 text-red-400' : ''}`}>
                      {state.playerValue}
                    </span>
                  </>
                ) : (
                  <div className="h-24 flex items-center justify-center">
                    <p className="text-tiki-muted text-sm">Tus cartas aparecen acá</p>
                  </div>
                )}
                <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest mt-3">Vos</p>
              </div>
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-4">
              {/* Bet phase */}
              {(!state || state.phase === 'betting') && (
                <>
                  <BetInput value={bet} onChange={setBet} min={10} max={Math.min(10000, balance)} balance={balance} />
                  <button
                    onClick={placeBet}
                    disabled={loading || bet < 10 || bet > balance}
                    className="btn-primary w-full justify-center py-3.5 text-base"
                  >
                    {loading ? <span className="spinner scale-75" /> : `Repartir — ${bet.toLocaleString()} CALDICOINS`}
                  </button>
                </>
              )}

              {/* Playing phase */}
              {isPlaying && (
                <div className={`grid gap-3 ${canSplit ? 'grid-cols-2 sm:grid-cols-4' : state?.canDouble ? 'grid-cols-3' : 'grid-cols-2'}`}>
                  <button
                    onClick={() => emit('blackjack:hit')}
                    disabled={loading}
                    className="btn-primary py-3 justify-center text-sm font-bold"
                  >
                    {loading ? <span className="spinner scale-75" /> : 'Pedir'}
                  </button>
                  <button
                    onClick={() => emit('blackjack:stand')}
                    disabled={loading}
                    className="btn-ghost py-3 justify-center text-sm font-bold"
                  >
                    Plantarse
                  </button>
                  {state?.canDouble && (
                    <button
                      onClick={() => emit('blackjack:double')}
                      disabled={loading || balance < state.bet * 2}
                      className="btn-gold py-3 justify-center text-sm font-bold"
                    >
                      Doblar
                    </button>
                  )}
                  {canSplit && (
                    <button
                      onClick={() => toast('Split — próximamente!', { icon: '✂️' })}
                      disabled={loading}
                      className="py-3 justify-center text-sm font-bold rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center"
                    >
                      Split
                    </button>
                  )}
                </div>
              )}

              {/* Result phase — new round */}
              {state?.phase === 'result' && (
                <button
                  onClick={() => { emit('blackjack:newRound') }}
                  disabled={loading}
                  className="btn-primary w-full justify-center py-3.5 text-base"
                >
                  {loading ? <span className="spinner scale-75" /> : 'Nueva ronda'}
                </button>
              )}

              {/* Current bet display */}
              {state?.bet > 0 && (
                <div className="text-center text-xs text-tiki-muted">
                  Apuesta actual: <span className="text-yellow-400 font-mono font-bold">{state.bet.toLocaleString()} CALDICOINS</span>
                </div>
              )}
            </div>

            {/* Other active blackjack tables in the room */}
            {Object.keys(otherHands).length > 0 && (
              <div className="glass rounded-2xl p-5 border border-white/5 space-y-4">
                <h3 className="font-display font-bold text-sm text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                  👥 Otras Mesas en la Sala
                </h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  {Object.entries(otherHands).map(([uId, p]) => (
                    <div key={uId} className="bg-black/30 border border-white/5 p-4 rounded-xl flex flex-col justify-between space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-white truncate max-w-[120px]">{p.nickname}</span>
                        <span className="text-xs text-yellow-400 font-mono font-bold bg-yellow-400/10 px-2 py-0.5 rounded-full border border-yellow-400/20">{p.state.bet.toLocaleString()} C</span>
                      </div>
                      
                      {p.state.playerHand?.length > 0 ? (
                        <div className="flex gap-1 flex-wrap justify-center py-2 bg-black/10 rounded-lg min-h-[70px] items-center">
                          {p.state.playerHand.map((c, i) => <PlayingCard key={i} card={c} small />)}
                        </div>
                      ) : (
                        <p className="text-xs text-tiki-muted text-center py-4">Esperando apuesta…</p>
                      )}

                      <div className="flex items-center justify-between text-xs text-tiki-muted border-t border-white/5 pt-2">
                        <span>Valor: <strong className="text-tiki-green font-mono">{p.state.playerValue}</strong></span>
                        {p.state.result && (
                          <span className={`font-bold ${RESULT_COLORS[p.state.result] || 'text-white'}`}>
                            {RESULT_LABELS[p.state.result] || p.state.result}
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Rules */}
            <div className="glass rounded-2xl p-4 text-xs text-tiki-muted space-y-1">
              <p className="font-semibold text-tiki-text text-sm mb-2">Cómo jugar</p>
              <p>• Superá al dealer sin pasarte de 21.</p>
              <p>• El dealer pide carta hasta 17 o más.</p>
              <p>• Blackjack (As + figura) paga 2.5×.</p>
              <p>• Doblar: duplicás la apuesta y recibís 1 carta.</p>
              <p>• Split: cuando tenés dos cartas iguales podés dividirlas (próximamente).</p>
            </div>
          </div>

          {/* Chat sidebar */}
          <div className="h-[600px]">
            <ChatPanel roomCode={roomCode} />
          </div>
        </div>

        <p className="text-center text-xs text-tiki-muted mt-6">
          CALDICOINS son puntos ficticios. Sin dinero real.
        </p>
      </main>
    </div>
  )
}
