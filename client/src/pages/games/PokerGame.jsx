import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

const SUITS = { spades: '♠', hearts: '♥', diamonds: '♦', clubs: '♣' }

function PlayingCard({ card, hidden, className = '' }) {
  if (hidden) return (
    <div className={`playing-card border-2 border-white/20 opacity-50 bg-tiki-border ${className}`} style={{ minWidth: 44, minHeight: 66 }}>
      <span className="text-white/20">?</span>
    </div>
  )
  if (!card) return <div className={`w-11 h-[66px] rounded-lg border border-white/10 ${className}`} />
  const isRed = ['hearts', 'diamonds'].includes(card.suit)
  return (
    <motion.div
      initial={{ rotateY: 180 }} animate={{ rotateY: 0 }}
      className={`playing-card ${isRed ? 'red' : 'black'} ${className}`}
      style={{ minWidth: 44, minHeight: 66, fontSize: 14 }}
    >
      <span>{card.rank}</span>
      <span style={{ fontSize: 11 }}>{SUITS[card.suit]}</span>
    </motion.div>
  )
}

function PokerPlayer({ player, isMe, actionIdx }) {
  if (!player) return <div className="h-24 w-24 rounded-2xl border border-white/5" />
  const isAction = player.isAction
  const isDealer = player.isDealer
  return (
    <div className={`relative p-3 rounded-2xl flex flex-col items-center transition-all ${isAction ? 'bg-yellow-400/10 border border-yellow-400/30' : 'bg-black/30 border border-white/10'} ${player.folded ? 'opacity-40' : ''}`}>
      {isDealer && <div className="absolute -top-3 -right-3 w-6 h-6 bg-white text-black rounded-full flex items-center justify-center text-xs font-bold shadow-lg">D</div>}
      
      {/* Name and Stack */}
      <span className="text-xs font-bold text-white mb-1 truncate w-full text-center">
        {isMe ? '⭐ Vos' : player.nickname}
      </span>
      <span className="text-xs font-mono text-yellow-400 mb-2">{player.stack.toLocaleString()} C</span>
      
      {/* Cards */}
      <div className="flex gap-1 mb-2">
        {player.cardCount === 2 && !player.holeCards && (
          <><PlayingCard hidden /><PlayingCard hidden /></>
        )}
        {player.holeCards && player.holeCards.map((c, i) => <PlayingCard key={i} card={c} />)}
        {player.cardCount === 0 && <><div className="w-11 h-[66px]"/><div className="w-11 h-[66px]"/></>}
      </div>
      
      {/* Bet / Action */}
      <div className="h-6 flex items-center justify-center w-full">
        {player.bet > 0 && <span className="text-xs bg-yellow-400/20 text-yellow-400 px-2 py-0.5 rounded-full font-bold border border-yellow-400/30">{player.bet}</span>}
        {player.folded && <span className="text-xs text-red-400 font-bold uppercase tracking-wider">Fold</span>}
        {player.allin && <span className="text-xs text-rose-500 font-bold uppercase tracking-wider">All-in</span>}
      </div>
    </div>
  )
}

export default function TexasHoldemGame() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [table, setTable] = useState(null)
  const [inGame, setInGame] = useState(false)
  const [raiseAmount, setRaiseAmount] = useState(0)

  useEffect(() => {
    if (!socket) return

    socket.emit('poker:join', { roomCode })

    const onState = (state) => {
      setTable(state)
      setInGame(state.players.some(p => p.id === user?.id))
      // set min raise
      if (state.currentBet > 0) setRaiseAmount(state.currentBet * 2)
      else setRaiseAmount(100)
    }

    const onJoined = ({ nickname, count }) => {
      if (nickname !== user?.nickname) toast(`${nickname} se unió a la mesa (${count}/8)`)
    }

    const onClosed = () => {
      toast.error('La mesa se cerró.')
      setTable(null)
    }

    const onError = ({ message }) => toast.error(message)

    socket.on('poker:state', onState)
    socket.on('poker:playerJoined', onJoined)
    socket.on('poker:tableClosed', onClosed)
    socket.on('poker:error', onError)

    return () => {
      socket.emit('poker:leave', { roomCode })
      socket.off('poker:state', onState)
      socket.off('poker:playerJoined', onJoined)
      socket.off('poker:tableClosed', onClosed)
      socket.off('poker:error', onError)
    }
  }, [socket, roomCode, user?.id])

  const startGame = () => socket.emit('poker:start', { roomCode })
  const sendAction = (action, amount = 0) => socket.emit('poker:action', { roomCode, action, amount })

  if (!table) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  )

  const myPlayer = table.players.find(p => p.id === user?.id)
  const isMyTurn = myPlayer?.isAction && table.phase !== 'showdown' && table.phase !== 'waiting'
  const canCheck = myPlayer && table.currentBet === myPlayer.bet
  const minRaise = table.currentBet > 0 ? table.currentBet * 2 : 100
  const maxRaise = myPlayer ? myPlayer.stack + myPlayer.bet : 0

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Sala</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">♠️ Texas Hold'em</h1>
            <span className="badge-violet text-xs">Multijugador</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            
            {/* Poker Table */}
            <div className="glass rounded-3xl p-6 min-h-[500px] relative flex flex-col justify-between" style={{ background: 'radial-gradient(ellipse at center, rgba(34,197,94,0.1) 0%, transparent 70%)', border: '1px solid rgba(34,197,94,0.2)' }}>
              
              {/* Waiting State */}
              {table.phase === 'waiting' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black/40 rounded-3xl backdrop-blur-sm">
                  <h2 className="text-2xl font-bold mb-2">Esperando jugadores...</h2>
                  <p className="text-tiki-muted mb-6">{table.players.length}/8 en la mesa (2000 CALDICOINS Buy-in)</p>
                  {table.players.length >= 2 && inGame && (
                    <button onClick={startGame} className="btn-primary px-8 py-3">Iniciar partida</button>
                  )}
                  {!inGame && table.players.length < 8 && (
                    <button onClick={() => socket.emit('poker:join', { roomCode })} className="btn-primary px-8 py-3">Sentarse (2000 C)</button>
                  )}
                </div>
              )}

              {/* Top Players */}
              <div className="flex justify-center gap-4">
                {table.players.slice(0, 4).map(p => <PokerPlayer key={p.id} player={p} isMe={p.id === user?.id} />)}
              </div>

              {/* Table Center (Community Cards + Pot) */}
              <div className="flex flex-col items-center justify-center py-8">
                <div className="bg-black/40 rounded-full px-6 py-2 mb-6 border border-white/10 flex items-center gap-2">
                  <span className="text-tiki-muted text-sm uppercase tracking-widest font-semibold">Pozo</span>
                  <span className="text-yellow-400 font-mono font-bold text-xl">{table.pot.toLocaleString()}</span>
                </div>
                
                <div className="flex gap-2 min-h-[66px]">
                  <AnimatePresence>
                    {table.community.map((c, i) => <PlayingCard key={i} card={c} />)}
                  </AnimatePresence>
                  {/* Placeholders */}
                  {Array.from({ length: 5 - table.community.length }).map((_, i) => (
                    <div key={`ph-${i}`} className="w-11 h-[66px] rounded-lg border border-white/5 bg-white/5" />
                  ))}
                </div>

                {/* Showdown Winners */}
                {table.phase === 'showdown' && table.winners && (
                  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center bg-black/60 px-6 py-3 rounded-2xl border border-yellow-400/30">
                    {table.winners.map(w => (
                      <div key={w.playerId} className="mb-1 last:mb-0">
                        <span className="font-bold text-yellow-400 text-lg">{w.nickname} gana {w.amount} C</span>
                        <p className="text-sm text-tiki-muted">{w.handName}</p>
                      </div>
                    ))}
                  </motion.div>
                )}

                {/* Action Log */}
                {table.lastAction && table.phase !== 'showdown' && (
                  <div className="mt-4 text-sm text-tiki-muted bg-black/30 px-4 py-1 rounded-full">
                    <span className="font-semibold text-white">{table.lastAction.nickname}</span>{' '}
                    {table.lastAction.action === 'fold' && 'se retiró'}
                    {table.lastAction.action === 'check' && 'pasó'}
                    {table.lastAction.action === 'call' && `igualó ${table.lastAction.amount}`}
                    {table.lastAction.action === 'raise' && `subió a ${table.lastAction.amount}`}
                    {table.lastAction.action === 'allin' && `hizo ALL-IN con ${table.lastAction.amount}`}
                  </div>
                )}
              </div>

              {/* Bottom Players */}
              <div className="flex justify-center gap-4">
                {table.players.slice(4, 8).map(p => <PokerPlayer key={p.id} player={p} isMe={p.id === user?.id} />)}
              </div>
            </div>

            {/* Controls */}
            {inGame && table.phase !== 'waiting' && table.phase !== 'showdown' && (
              <div className={`glass rounded-2xl p-5 ${isMyTurn ? 'ring-2 ring-tiki-green' : 'opacity-50 pointer-events-none'}`}>
                {isMyTurn && <p className="text-tiki-green font-semibold text-sm mb-3">¡Es tu turno!</p>}
                
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => sendAction('fold')} className="btn-danger flex-1 py-3">Fold</button>
                  
                  {canCheck ? (
                    <button onClick={() => sendAction('check')} className="btn-ghost flex-1 py-3 bg-white/10">Pasar</button>
                  ) : (
                    <button onClick={() => sendAction('call')} className="btn-ghost flex-1 py-3 bg-white/10">
                      Igualar {table.currentBet - myPlayer.bet}
                    </button>
                  )}
                  
                  {/* Raise Controls */}
                  <div className="flex-1 min-w-[200px] flex gap-2">
                    <input type="number" value={raiseAmount} onChange={e => setRaiseAmount(Number(e.target.value))}
                      className="input w-24 text-center p-0" min={minRaise} max={maxRaise} />
                    <button onClick={() => sendAction('raise', raiseAmount)} className="btn-primary flex-1 py-3">Subir</button>
                  </div>

                  <button onClick={() => sendAction('allin')} className="btn-danger flex-1 py-3 bg-rose-600 border-none text-white">ALL-IN</button>
                </div>
              </div>
            )}
          </div>

          <div className="h-[600px]">
            <ChatPanel roomCode={roomCode} />
          </div>
        </div>
      </main>
    </div>
  )
}
