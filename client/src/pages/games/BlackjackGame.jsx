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

function PlayingCard({ card, small = false, index = 0 }) {
  if (!card) return null
  const delay = index * 0.12 // Staggered dealing feel!
  
  if (card.hidden) {
    return (
      <motion.div
        initial={{ y: -120, x: 100, rotate: -20, scale: 0.4, opacity: 0 }}
        animate={{ y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 }}
        transition={{ type: 'spring', damping: 15, stiffness: 120, delay }}
        className={`playing-card hidden ${small ? 'scale-75' : ''}`}
        style={{ minWidth: small ? 40 : 56, minHeight: small ? 60 : 84 }}
      >
        <span className="text-tiki-muted text-xl">?</span>
      </motion.div>
    )
  }
  const isRed = RED_SUITS.includes(card.suit)
  return (
    <motion.div
      initial={{ y: -120, x: 100, rotate: -20, scale: 0.4, opacity: 0 }}
      animate={{ y: 0, x: 0, rotate: 0, scale: 1, opacity: 1 }}
      transition={{ type: 'spring', damping: 15, stiffness: 120, delay }}
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
  const [betTimer, setBetTimer] = useState(0)
  const [activeTurn, setActiveTurn] = useState(null)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return

    socket.emit('blackjack:join', { roomCode })

    const onState = ({ state: s, balance: b }) => {
      setState(s)
      if (b !== undefined) { setBalance(b); updateBalance(b) }
      setLoading(false)
      if (s.result) {
        if (['win', 'blackjack'].includes(s.result)) toast.success(`¡Ganaste! +${s.payout.toLocaleString()} CALDICOINS`)
        if (s.result === 'bust') toast.error('¡Te pasaste!')
        if (s.result === 'push') toast('Empate — apuesta devuelta', { icon: '🤝' })
        if (s.result === 'loss') toast.error('El dealer gana esta mano')
      }
    }

    const onTableState = (tableState) => {
      const mySeat = tableState.seats.find(s => s.userId === user?.id)

      if (mySeat && mySeat.result && (!state || state.result !== mySeat.result)) {
        if (['win', 'blackjack'].includes(mySeat.result)) {
          toast.success(`¡Ganaste! +${mySeat.payout.toLocaleString()} CALDICOINS 🎉`)
        } else if (mySeat.result === 'bust') {
          toast.error('¡Te pasaste! 💥')
        } else if (mySeat.result === 'push') {
          toast('Empate — apuesta devuelta 🤝', { icon: '🤝' })
        } else if (mySeat.result === 'loss') {
          toast.error('El dealer gana esta mano 😔')
        }
      }

      if (mySeat) {
        setState({
          phase: tableState.phase,
          playerHand: mySeat.hand,
          playerValue: mySeat.value,
          dealerHand: tableState.dealerHand,
          dealerValue: tableState.dealerValue,
          bet: mySeat.bet,
          result: mySeat.result,
          payout: mySeat.payout,
          canDouble: tableState.phase === 'playing' && mySeat.isTurn && mySeat.hand.length === 2 && balance >= mySeat.bet * 2
        })
      } else {
        setState({
          phase: tableState.phase,
          playerHand: [],
          playerValue: 0,
          dealerHand: tableState.dealerHand,
          dealerValue: tableState.dealerValue,
          bet: 0,
          result: null,
          payout: 0,
          canDouble: false
        })
      }

      const others = {}
      tableState.seats.forEach(s => {
        if (s.userId !== user?.id) {
          others[s.userId] = {
            nickname: s.nickname,
            avatar: s.avatar,
            state: {
              playerHand: s.hand,
              playerValue: s.value,
              bet: s.bet,
              result: s.result,
              payout: s.payout,
              isTurn: s.isTurn
            }
          }
        }
      })
      setOtherHands(others)
      
      setBetTimer(tableState.betTimer)
      setActiveTurn(tableState.activeTurnUserId)
      setLoading(false)
    }

    const onError = ({ message }) => { toast.error(message); setLoading(false) }
    const onBalanceUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }

    socket.on('blackjack:state', onState)
    socket.on('blackjack:tableState', onTableState)
    socket.on('blackjack:error', onError)
    socket.on('balance:update', onBalanceUpdate)

    return () => {
      socket.off('blackjack:state', onState)
      socket.off('blackjack:tableState', onTableState)
      socket.off('blackjack:error', onError)
      socket.off('balance:update', onBalanceUpdate)
    }
  }, [socket, roomCode, user])

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
  const myTurn = state?.phase === 'playing' && activeTurn === user?.id
  const canSplit = myTurn && state?.playerHand?.length === 2 &&
    state.playerHand[0]?.rank === state.playerHand[1]?.rank && balance >= state?.bet * 2

  const seats = [null, null, null, null, null]
  const seatYOffsets = [-24, -8, 0, -8, -24]

  seats[2] = {
    userId: user?.id || 'me',
    nickname: user?.nickname || 'Vos',
    isMe: true,
    hand: state?.playerHand || [],
    value: state?.playerValue || 0,
    bet: state?.bet || 0,
    result: state?.result,
    payout: state?.payout,
    isTurn: activeTurn === user?.id
  }

  const otherPlayersList = Object.entries(otherHands).map(([uId, other]) => ({
    userId: uId,
    nickname: other.nickname,
    isMe: false,
    hand: other.state?.playerHand || [],
    value: other.state?.playerValue || 0,
    bet: other.state?.bet || 0,
    result: other.state?.result,
    payout: other.state?.payout,
    isTurn: activeTurn === uId
  }))

  const seatAssignmentOrder = [1, 3, 0, 4]
  otherPlayersList.forEach((player, index) => {
    if (index < seatAssignmentOrder.length) {
      const seatIdx = seatAssignmentOrder[index]
      seats[seatIdx] = player
    }
  })

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
            <div className="rounded-3xl p-6 min-h-[460px] relative border border-yellow-600/30 shadow-[0_0_50px_rgba(5,44,30,0.5)] overflow-hidden" style={{ background: 'radial-gradient(circle at top, #0f5132 0%, #052c1e 100%)' }}>
              {/* Outer gold felt border line inside the table */}
              <div className="absolute inset-4 border border-yellow-600/10 rounded-2xl pointer-events-none" />

              {/* Dashed semicircular line on the table */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120%] h-[280px] border-b-2 border-dashed border-yellow-600/15 rounded-full pointer-events-none" />

              {/* Dealer hand */}
              <div className="text-center mb-6 relative z-10">
                <p className="text-[10px] font-black text-yellow-600 uppercase tracking-widest mb-2">CRUPIER</p>
                {state?.dealerHand?.length > 0 ? (
                  <>
                    <div className="flex justify-center gap-2 mb-2 flex-wrap">
                      {state.dealerHand.map((card, i) => <PlayingCard key={i} card={card} index={i} />)}
                    </div>
                    {state.dealerValue !== null && (
                      <span className="badge-green text-xs font-mono">{state.dealerValue}</span>
                    )}
                  </>
                ) : (
                  <div className="h-20 flex items-center justify-center">
                    <p className="text-white/30 text-xs uppercase tracking-widest animate-pulse">Esperando apuestas…</p>
                  </div>
                )}
              </div>

              {/* Gold Felt Typography in middle */}
              <div className="text-center my-6 pointer-events-none select-none relative z-10">
                <div className="text-yellow-500/20 font-serif font-black text-base tracking-widest uppercase">BLACKJACK PAYS 3 TO 2</div>
                <div className="text-white/20 text-[9px] tracking-wider uppercase font-semibold mt-0.5">Dealer must stand on 17 & draw to 16</div>
                
                {state?.phase === 'betting' && betTimer > 0 && (
                  <div className="mt-4 animate-pulse">
                    <span className="bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg tracking-widest uppercase">
                      ⏳ Rda. Inicia: {betTimer}s
                    </span>
                  </div>
                )}
              </div>

              {/* Unified seats in beautiful circular semi-circle curved arc! */}
              <div className="flex justify-between items-end gap-2 pt-6 border-t border-yellow-600/10 relative z-10 px-2 min-h-[170px]">
                {seats.map((seat, seatIdx) => {
                  if (!seat) {
                    return (
                      <div
                        key={`empty-${seatIdx}`}
                        className="flex-1 max-w-[120px] p-3 rounded-2xl flex flex-col items-center justify-center border border-dashed border-yellow-600/10 bg-black/10 min-h-[140px] opacity-35 select-none pointer-events-none"
                        style={{ transform: `translateY(${seatYOffsets[seatIdx]}px)` }}
                      >
                        <span className="text-[9px] font-black tracking-widest text-yellow-600/70 uppercase">Libre</span>
                      </div>
                    )
                  }

                  const isSeatTurn = seat.isTurn;
                  return (
                    <div
                      key={seat.userId}
                      className={`flex-1 max-w-[120px] p-3 rounded-2xl flex flex-col items-center text-center relative transition-all duration-300 ${
                        seat.isMe
                          ? 'bg-cyan-950/60 border-2 border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.2)]'
                          : 'bg-black/50 border border-white/5 shadow-md'
                      } ${isSeatTurn ? 'ring-2 ring-yellow-400 ring-offset-2 ring-offset-[#052c1e] scale-105 z-20 shadow-[0_0_25px_rgba(234,179,8,0.4)] animate-pulse' : ''}`}
                      style={{
                        transform: `translateY(${seatYOffsets[seatIdx]}px)`,
                        minHeight: '140px'
                      }}
                    >
                      {/* Bet amount floating badge */}
                      {seat.bet > 0 && (
                        <span className="absolute -top-3 bg-yellow-500 text-black text-[9px] font-black px-2 py-0.5 rounded-full shadow-md uppercase tracking-wider">
                          {seat.bet.toLocaleString()} C
                        </span>
                      )}

                      <div className="mb-2 w-full">
                        <span className={`text-[9px] font-black uppercase tracking-wider truncate block w-full ${seat.isMe ? 'text-cyan-300 font-display' : 'text-white/60'}`}>
                          {seat.nickname} {seat.isMe && '• TÚ'}
                        </span>
                        {isSeatTurn && (
                          <span className="text-[8px] font-black text-yellow-400 block tracking-widest animate-pulse mt-0.5">JUGANDO</span>
                        )}
                      </div>

                      {/* Hand Cards */}
                      <div className="flex justify-center gap-0.5 min-h-[60px] items-center mb-2 flex-wrap">
                        {seat.hand.length > 0 ? (
                          seat.hand.map((card, idx) => (
                            <PlayingCard key={idx} card={card} index={idx} small />
                          ))
                        ) : (
                          <span className="text-[8px] text-white/10 italic py-4">Esperando...</span>
                        )}
                      </div>

                      {/* Hand values / results */}
                      {seat.hand.length > 0 && (
                        <div className="flex flex-col items-center gap-1 mt-auto">
                          <span className={`badge-green text-[9px] font-mono py-0 px-1.5 ${seat.value > 21 ? '!bg-red-500/20 !border-red-500/30 text-red-400' : ''}`}>
                            {seat.value}
                          </span>
                          {seat.result && (
                            <span className={`text-[8px] font-black tracking-wider uppercase mt-1 ${RESULT_COLORS[seat.result] || 'text-white'}`}>
                              {RESULT_LABELS[seat.result] || seat.result}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
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
                <div className="space-y-3">
                  <div className={`grid gap-3 ${canSplit ? 'grid-cols-2 sm:grid-cols-4' : state?.canDouble ? 'grid-cols-3' : 'grid-cols-2'}`}>
                    <button
                      onClick={() => emit('blackjack:hit')}
                      disabled={loading || !myTurn}
                      className="btn-primary py-3 justify-center text-sm font-bold disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      {loading ? <span className="spinner scale-75" /> : 'Pedir'}
                    </button>
                    <button
                      onClick={() => emit('blackjack:stand')}
                      disabled={loading || !myTurn}
                      className="btn-ghost py-3 justify-center text-sm font-bold disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                    >
                      Plantarse
                    </button>
                    {state?.canDouble && (
                      <button
                        onClick={() => emit('blackjack:double')}
                        disabled={loading || !myTurn || balance < state.bet * 2}
                        className="btn-gold py-3 justify-center text-sm font-bold disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
                      >
                        Doblar
                      </button>
                    )}
                    {canSplit && (
                      <button
                        onClick={() => toast('Split — próximamente!', { icon: '✂️' })}
                        disabled={loading || !myTurn}
                        className="py-3 justify-center text-sm font-bold rounded-xl border border-purple-500/40 text-purple-300 hover:bg-purple-500/10 transition-colors flex items-center disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        Split
                      </button>
                    )}
                  </div>
                  {!myTurn && (
                    <p className="text-center text-xs text-yellow-400/80 animate-pulse py-1">
                      🕒 Esperando el turno de: <strong>{otherHands[activeTurn]?.nickname || 'otro jugador'}</strong>...
                    </p>
                  )}
                </div>
              )}

              {/* Result phase — new round starts automatically */}
              {state?.phase === 'result' && (
                <div className="text-center bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 animate-pulse">
                  <p className="text-yellow-400 font-bold text-xs tracking-wider uppercase">
                    Ronda finalizada
                  </p>
                  <p className="text-white/60 text-[10px] mt-1">
                    La mesa se está limpiando. La próxima ronda iniciará automáticamente en unos segundos... 🕒
                  </p>
                </div>
              )}

              {/* Current bet display */}
              {state?.bet > 0 && (
                <div className="text-center text-xs text-tiki-muted">
                  Apuesta actual: <span className="text-yellow-400 font-mono font-bold">{state.bet.toLocaleString()} CALDICOINS</span>
                </div>
              )}
            </div>

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
