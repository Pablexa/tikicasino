import { useState, useEffect, useCallback } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

const DICE_FACES = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅']
const LIVES_ICONS = ['', '💀', '❤️❤️', '❤️❤️❤️']

function Die({ value, size = 48 }) {
  return (
    <motion.div
      initial={{ rotateX: 360 }}
      animate={{ rotateX: 0 }}
      className="flex items-center justify-center rounded-xl font-bold select-none"
      style={{
        width: size, height: size, fontSize: size * 0.65,
        background: 'rgba(34,197,94,0.1)',
        border: '2px solid rgba(34,197,94,0.3)',
      }}
    >
      {value ? DICE_FACES[value] : '?'}
    </motion.div>
  )
}

function LivesBar({ lives, max = 3 }) {
  return (
    <div className="flex gap-1">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-sm ${i < lives ? 'text-red-400' : 'text-gray-700'}`}>❤️</span>
      ))}
    </div>
  )
}

export default function LiarsBarGame() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [phase, setPhase] = useState('lobby') // lobby | bidding | reveal | finished
  const [gameState, setGameState] = useState(null)
  const [myDice, setMyDice] = useState([])
  const [lobbyPlayers, setLobbyPlayers] = useState([])
  const [revealInfo, setRevealInfo] = useState(null)
  const [bidQty, setBidQty] = useState(1)
  const [bidFace, setBidFace] = useState(1)
  const [inLobby, setInLobby] = useState(false)

  useEffect(() => {
    if (!socket) return

    const onLobby = ({ players, count }) => {
      setLobbyPlayers(players)
    }
    const onState = (state) => {
      setGameState(state)
      setPhase(state.phase === 'finished' ? 'finished' : 'bidding')
      setRevealInfo(null)
      if (state.winner) {
        if (state.winner === user?.id) toast.success('¡Ganaste Liar\'s Bar! 🎉')
        else toast.error('Perdiste. Mejor suerte la próxima.')
      }
    }
    const onMyDice = ({ dice }) => setMyDice(dice)
    const onReveal = (info) => {
      setRevealInfo(info)
      setPhase('reveal')
      const won = info.callerWon ? (info.lastAction?.callerId === user?.id) : (info.lastAction?.bidderId === user?.id)
      // Show what happened
      const loserWasMe = gameState?.players[info.loserIdx]?.id === user?.id
      if (loserWasMe) toast.error(`¡Perdiste una vida! (${info.actual} dados mostraban ${info.bid?.faceValue})`)
      else toast(`Se revelaron ${info.actual} dados con ${info.bid?.faceValue}`, { icon: '🎲' })
    }
    const onError = ({ message }) => toast.error(message)

    socket.on('liarsbar:lobby', onLobby)
    socket.on('liarsbar:state', onState)
    socket.on('liarsbar:myDice', onMyDice)
    socket.on('liarsbar:reveal', onReveal)
    socket.on('liarsbar:error', onError)

    return () => {
      socket.off('liarsbar:lobby', onLobby)
      socket.off('liarsbar:state', onState)
      socket.off('liarsbar:myDice', onMyDice)
      socket.off('liarsbar:reveal', onReveal)
      socket.off('liarsbar:error', onError)
    }
  }, [socket, user?.id, gameState])

  const joinLobby = () => {
    socket.emit('liarsbar:join', { roomCode })
    setInLobby(true)
  }

  const startGame = () => socket.emit('liarsbar:start', { roomCode })
  const placeBid = () => socket.emit('liarsbar:bid', { roomCode, quantity: bidQty, faceValue: bidFace })
  const callLiar = () => socket.emit('liarsbar:callLiar', { roomCode })

  const isMyTurn = gameState?.currentPlayerId === user?.id
  const myPlayer = gameState?.players.find(p => p.id === user?.id)
  const currentBid = gameState?.currentBid

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Sala</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">🎲 Liar's Bar</h1>
            <span className="badge-violet text-xs">2-15 jugadores</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">

            {/* Lobby */}
            {phase === 'lobby' && (
              <div className="glass rounded-3xl p-8 text-center space-y-6">
                <div>
                  <p className="text-4xl mb-3">🎲</p>
                  <h2 className="font-display font-bold text-2xl text-tiki-text mb-2">Liar's Bar</h2>
                  <p className="text-tiki-muted text-sm max-w-md mx-auto">
                    Cada jugador tira dados secretos. Por turno, hacés una apuesta sobre cuántos dados del valor X existen en total.
                    ¡Si pensás que mienten, gritá <span className="text-red-400 font-bold">¡Mentira!</span>
                  </p>
                </div>

                {!inLobby ? (
                  <button onClick={joinLobby} className="btn-primary px-8 py-3 text-base">
                    Unirse a la sala
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="glass rounded-2xl p-4">
                      <p className="text-sm font-semibold text-tiki-muted mb-3">
                        Jugadores en sala ({lobbyPlayers.length}/15)
                      </p>
                      <div className="flex flex-wrap gap-2 justify-center">
                        {lobbyPlayers.map((p, i) => (
                          <span key={i} className={`badge-green text-xs ${p.id === user?.id ? 'ring-1 ring-green-400' : ''}`}>
                            {p.id === user?.id ? '⭐ Vos' : `Jugador ${i + 1}`}
                          </span>
                        ))}
                      </div>
                    </div>
                    {lobbyPlayers.length >= 2 ? (
                      <button onClick={startGame} className="btn-primary px-8 py-3 text-base">
                        ¡Empezar con {lobbyPlayers.length} jugadores!
                      </button>
                    ) : (
                      <p className="text-tiki-muted text-sm">Esperando más jugadores… (mínimo 2)</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Active game */}
            {(phase === 'bidding' || phase === 'reveal') && gameState && (
              <div className="space-y-4">
                {/* Players status */}
                <div className="glass rounded-2xl p-4">
                  <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest mb-3">Jugadores</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {gameState.players.map((p, i) => (
                      <div key={i} className={`p-3 rounded-xl border ${
                        p.id === user?.id ? 'border-tiki-green/40 bg-tiki-green/5' :
                        gameState.currentPlayerId === p.id ? 'border-yellow-400/40 bg-yellow-400/5' :
                        'border-white/5'
                      } ${p.eliminated ? 'opacity-40' : ''}`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-semibold text-tiki-text">
                            {p.id === user?.id ? '⭐ Vos' : `J${i + 1}`}
                            {gameState.currentPlayerId === p.id && ' 🎯'}
                          </span>
                          <span className="text-xs text-tiki-muted">{p.diceCount}🎲</span>
                        </div>
                        <LivesBar lives={p.lives} />
                        {/* Show revealed dice */}
                        {phase === 'reveal' && p.dice && (
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {p.dice.map((d, di) => (
                              <span key={di} className="text-lg">{DICE_FACES[d]}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* My dice */}
                {!myPlayer?.eliminated && (
                  <div className="glass rounded-2xl p-4">
                    <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest mb-3">Tus dados (solo los ves vos)</p>
                    <div className="flex gap-3 flex-wrap">
                      {myDice.map((d, i) => <Die key={i} value={d} />)}
                    </div>
                  </div>
                )}

                {/* Current bid */}
                <div className="glass rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest mb-2">Apuesta actual</p>
                  {currentBid ? (
                    <p className="font-display font-bold text-3xl text-yellow-400">
                      {currentBid.quantity}× {DICE_FACES[currentBid.faceValue]}
                    </p>
                  ) : (
                    <p className="text-tiki-muted">Sin apuesta — el primer jugador abre</p>
                  )}
                  {phase === 'reveal' && revealInfo && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3">
                      <p className="text-sm text-tiki-muted">
                        Total real: <span className="text-white font-bold text-xl">{revealInfo.actual}</span> dados con {DICE_FACES[revealInfo.bid?.faceValue]}
                      </p>
                      <p className={`font-bold text-lg mt-1 ${revealInfo.callerWon ? 'text-green-400' : 'text-red-400'}`}>
                        {revealInfo.callerWon ? '¡Era mentira!' : '¡Era verdad!'}
                      </p>
                    </motion.div>
                  )}
                </div>

                {/* Actions */}
                {phase === 'bidding' && isMyTurn && !myPlayer?.eliminated && (
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <p className="text-sm font-semibold text-tiki-green">¡Es tu turno!</p>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-tiki-muted mb-1 block">Cantidad de dados</label>
                        <div className="flex items-center gap-2">
                          <button onClick={() => setBidQty(q => Math.max(1, q - 1))} className="btn-ghost px-3 py-2">−</button>
                          <span className="font-mono font-bold text-xl w-8 text-center">{bidQty}</span>
                          <button onClick={() => setBidQty(q => Math.min(75, q + 1))} className="btn-ghost px-3 py-2">+</button>
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-tiki-muted mb-1 block">Valor del dado</label>
                        <div className="flex gap-1 flex-wrap">
                          {[1,2,3,4,5,6].map(f => (
                            <button key={f} onClick={() => setBidFace(f)}
                              className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                                bidFace === f ? 'bg-tiki-green/30 border border-tiki-green text-white' : 'bg-white/5 border border-white/10 text-tiki-muted hover:border-white/30'
                              }`}>{DICE_FACES[f]}</button>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={placeBid} className="btn-primary py-3 justify-center font-bold">
                        Apostar: {bidQty}× {DICE_FACES[bidFace]}
                      </button>
                      {currentBid && (
                        <button onClick={callLiar} className="btn-danger py-3 justify-center font-bold">
                          ¡Mentira! 🔥
                        </button>
                      )}
                    </div>
                  </div>
                )}

                {phase === 'bidding' && !isMyTurn && (
                  <div className="glass rounded-2xl p-4 text-center text-tiki-muted">
                    Esperando que otro jugador haga su jugada…
                  </div>
                )}
              </div>
            )}

            {/* Finished */}
            {phase === 'finished' && gameState && (
              <div className="glass rounded-3xl p-8 text-center space-y-4">
                <p className="text-5xl">🏆</p>
                <h2 className="font-display font-black text-3xl gradient-text">
                  {gameState.winner === user?.id ? '¡Ganaste!' : 'Partida terminada'}
                </h2>
                <button onClick={() => { setPhase('lobby'); setInLobby(false); setGameState(null); setMyDice([]); }}
                  className="btn-primary px-8 py-3">
                  Jugar de nuevo
                </button>
              </div>
            )}

            {/* Rules */}
            {phase === 'lobby' && (
              <div className="glass rounded-2xl p-4 text-xs text-tiki-muted space-y-1">
                <p className="font-semibold text-tiki-text text-sm mb-2">Reglas</p>
                <p>• Cada jugador tira sus dados en secreto.</p>
                <p>• Por turno: apostá cuántos dados de cierto valor hay <em>en total</em> entre todos.</p>
                <p>• La apuesta siempre debe ser mayor a la anterior.</p>
                <p>• Presioná <span className="text-red-400">¡Mentira!</span> si creés que el otro miente.</p>
                <p>• Si era mentira, el apostador pierde una vida. Si era cierto, vos perdés.</p>
                <p>• El jugador que quede con vidas gana.</p>
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
