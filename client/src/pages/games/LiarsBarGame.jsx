import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import RightSidebar from '../../components/RightSidebar.jsx'
import toast from 'react-hot-toast'
import { playWinSound, playLoseSound } from '../../utils/audio.js'

const CARD_ICONS = {
  'A': '🅰',
  'K': '♚',
  'Q': '♛',
  'Joker': '🃏'
}

const CARD_NAMES = {
  'A': 'As (Ace)',
  'K': 'Rey (King)',
  'Q': 'Reina (Queen)',
  'Joker': 'Comodín (Joker)'
}

function Card({ value, selected, onClick, size = 'large' }) {
  const icon = CARD_ICONS[value] || '?'
  const name = CARD_NAMES[value] || 'Carta'

  const colorClass = 
    value === 'A' ? 'border-cyan-500/40 text-cyan-400 bg-cyan-950/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]' :
    value === 'K' ? 'border-amber-500/40 text-amber-400 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.15)]' :
    value === 'Q' ? 'border-purple-500/40 text-purple-400 bg-purple-950/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]' :
    'border-emerald-500/40 text-emerald-400 bg-emerald-950/20 shadow-[0_0_15px_rgba(16,185,129,0.15)]'

  if (size === 'small') {
    return (
      <div className={`w-12 h-18 rounded-lg border flex flex-col items-center justify-center font-bold text-lg select-none ${colorClass}`}>
        <span>{icon}</span>
      </div>
    )
  }

  return (
    <motion.button
      whileHover={{ y: -5, scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`w-28 h-40 rounded-2xl border-2 flex flex-col justify-between p-4 relative transition-all duration-200 cursor-pointer ${
        selected ? 'border-yellow-400 bg-yellow-950/30 scale-105 shadow-[0_0_30px_rgba(251,191,36,0.3)]' : colorClass
      }`}
    >
      <div className="flex justify-between w-full font-bold text-xs">
        <span>{value}</span>
        <span>{icon}</span>
      </div>
      <div className="text-4xl self-center font-display">{icon}</div>
      <div className="flex justify-between w-full font-bold text-xs rotate-180">
        <span>{value}</span>
        <span>{icon}</span>
      </div>
    </motion.button>
  )
}

function LivesBar({ lives, max = 3 }) {
  return (
    <div className="flex gap-1.5 justify-center">
      {Array.from({ length: max }).map((_, i) => (
        <span key={i} className={`text-base ${i < lives ? 'text-red-500 drop-shadow-[0_0_8px_rgba(239,68,68,0.6)]' : 'text-gray-800'}`}>❤️</span>
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
  const [myHand, setMyHand] = useState([])
  const [lobbyPlayers, setLobbyPlayers] = useState([])
  const [revealInfo, setRevealInfo] = useState(null)
  
  // Selection of cards indices in hand
  const [selectedIndices, setSelectedIndices] = useState([])
  const [inLobby, setInLobby] = useState(false)

  useEffect(() => {
    if (!socket) return

    const onLobby = ({ players }) => {
      setLobbyPlayers(players)
    }
    
    const onState = (state) => {
      setGameState(state)
      setPhase(state.phase === 'finished' ? 'finished' : 'bidding')
      setRevealInfo(null)
      setSelectedIndices([])
      if (state.winner) {
        if (state.winner === user?.id) {
          playWinSound()
          toast.success('¡Ganaste Liar\'s Bar! 🎉')
        } else {
          playLoseSound()
          toast.error('Perdiste. ¡Gatillaron contra vos!')
        }
      }
    }
    
    const onMyDice = ({ dice }) => setMyHand(dice || [])
    
    const onReveal = (info) => {
      setRevealInfo(info)
      setPhase('reveal')
      
      const loserWasMe = info.loserId === user?.id
      if (loserWasMe) {
        if (info.gunFired) {
          playLoseSound()
          toast.error('💥 ¡BANG! ¡El revólver disparó y perdiste una vida!')
        } else {
          toast.success('¡CLIC! El revólver estaba vacío. ¡Te salvaste!')
        }
      } else {
        if (info.gunFired) {
          toast.error(`💥 ¡BANG! J${gameState?.players.findIndex(p => p.id === info.loserId) + 1} disparó y perdió una vida!`)
        } else {
          toast(`¡CLIC! J${gameState?.players.findIndex(p => p.id === info.loserId) + 1} gatilló pero el arma estaba vacía`, { icon: '🔫' })
        }
      }
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

  const toggleSelectCard = (index) => {
    setSelectedIndices(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index)
      }
      if (prev.length >= 3) {
        toast.error('Solo podés jugar hasta 3 cartas juntas.')
        return prev
      }
      return [...prev, index]
    })
  }

  const playSelectedCards = () => {
    if (selectedIndices.length === 0) {
      toast.error('Seleccioná al menos 1 carta de tu mano.')
      return
    }
    socket.emit('liarsbar:bid', { roomCode, cardIndices: selectedIndices })
  }

  const callLiar = () => socket.emit('liarsbar:callLiar', { roomCode })

  const isMyTurn = gameState?.currentPlayerId === user?.id
  const myPlayer = gameState?.players.find(p => p.id === user?.id)
  const lastPlay = gameState?.lastAction?.type === 'play' ? gameState.lastAction : null

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Sala</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">🎲 Liar's Bar (Edición Cartas)</h1>
            <span className="badge-violet text-xs">Mesa Privada</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-5">

            {/* Lobby */}
            {phase === 'lobby' && (
              <div className="glass rounded-3xl p-8 text-center space-y-6">
                <div>
                  <p className="text-5xl mb-3">🃏</p>
                  <h2 className="font-display font-black text-3xl text-tiki-text mb-2">Liar's Bar (Cartas)</h2>
                  <p className="text-tiki-muted text-sm max-w-md mx-auto">
                    El legendario juego de mesa de mentiras. Jugá tus cartas tapadas y declará el valor de la mesa.
                    ¡Mentí con cabeza o gatillá el tambor del revólver!
                  </p>
                </div>

                {!inLobby ? (
                  <button onClick={joinLobby} className="btn-primary px-8 py-3 text-base font-black">
                    Unirse a la Mesa
                  </button>
                ) : (
                  <div className="space-y-4">
                    <div className="glass rounded-2xl p-4">
                      <p className="text-sm font-semibold text-tiki-muted mb-3">
                        Jugadores listos ({lobbyPlayers.length}/15)
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
                        ¡Empezar Partida!
                      </button>
                    ) : (
                      <p className="text-tiki-muted text-sm">Esperando oponentes… (mínimo 2)</p>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Active game */}
            {(phase === 'bidding' || phase === 'reveal') && gameState && (
              <div className="space-y-4">
                
                {/* Board Table Target */}
                <div className="glass rounded-2xl p-5 border border-white/5 relative overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, rgba(168,85,247,0.06) 0%, transparent 80%)' }}>
                  <div className="grid md:grid-cols-3 gap-4 items-center">
                    {/* Left details */}
                    <div className="text-center md:text-left space-y-1">
                      <span className="text-[10px] text-tiki-muted font-bold uppercase tracking-wider block">Carta Objetivo</span>
                      <h3 className="text-2xl font-black font-display text-yellow-400 uppercase">
                        Mesa de {CARD_NAMES[gameState.tableCard] || 'Reyes'}
                      </h3>
                      <p className="text-tiki-muted text-xs">Jokers (🃏) son comodines válidos siempre.</p>
                    </div>

                    {/* Middle Card Frame */}
                    <div className="flex justify-center">
                      <div className="w-20 h-28 rounded-xl border border-yellow-400/40 bg-yellow-950/20 flex flex-col items-center justify-center shadow-lg relative">
                        <span className="text-4xl">{CARD_ICONS[gameState.tableCard]}</span>
                        <span className="text-[10px] text-yellow-400 font-bold uppercase tracking-widest absolute bottom-2">{gameState.tableCard}</span>
                      </div>
                    </div>

                    {/* Right pile details */}
                    <div className="text-center md:text-right space-y-1">
                      <span className="text-[10px] text-tiki-muted font-bold uppercase tracking-wider block">Cartas en la Mesa</span>
                      <span className="text-3xl font-mono font-black text-white">{gameState.cardsOnTableCount || 0}</span>
                      <p className="text-tiki-muted text-xs">Descartadas boca abajo en esta ronda.</p>
                    </div>
                  </div>
                </div>

                {/* Players grid */}
                <div className="glass rounded-2xl p-4">
                  <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest mb-3">Jugadores en la Mesa</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {gameState.players.map((p, i) => (
                      <div key={i} className={`p-3 rounded-xl border transition-all ${
                        p.id === user?.id ? 'border-cyan-500/40 bg-cyan-950/5' :
                        gameState.currentPlayerId === p.id ? 'border-yellow-400/40 bg-yellow-400/5 shadow-[0_0_15px_rgba(234,179,8,0.15)] animate-pulse' :
                        'border-white/5'
                      } ${p.eliminated ? 'opacity-40 line-through' : ''}`}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-tiki-text">
                            {p.id === user?.id ? '⭐ Vos' : `Jugador ${i + 1}`}
                            {gameState.currentPlayerId === p.id && ' 🎯'}
                          </span>
                          <span className="text-xs text-tiki-muted">{p.handCount || p.diceCount} 🎴</span>
                        </div>
                        <LivesBar lives={p.lives} />
                        
                        <div className="text-center mt-2">
                          <span className="text-[10px] text-tiki-muted">Gatillo: {p.triggerPulls}/6 clics</span>
                        </div>

                        {phase === 'reveal' && p.dice && (
                          <div className="flex gap-1.5 mt-2 justify-center flex-wrap">
                            {p.dice.map((card, ci) => (
                              <Card key={ci} value={card} size="small" />
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Reveal & Gunfire results */}
                {phase === 'reveal' && revealInfo && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass rounded-2xl p-6 text-center space-y-3 border border-red-500/20">
                    <h3 className="font-display font-black text-2xl text-red-500 uppercase">
                      Revelación de Mentira
                    </h3>
                    
                    <p className="text-tiki-muted text-sm">
                      J{gameState?.players.findIndex(p => p.id === revealInfo.bidderId) + 1} jugó {revealInfo.bid?.quantity} cartas clamando ser <span className="text-yellow-400 font-bold">{revealInfo.bid?.faceValue}</span>:
                    </p>

                    <div className="flex gap-2 justify-center my-3">
                      {revealInfo.playedCards?.map((card, ci) => (
                        <div key={ci} className="w-14 h-20 rounded-xl border border-red-500/40 bg-red-950/20 flex flex-col items-center justify-center">
                          <span className="text-2xl">{CARD_ICONS[card]}</span>
                          <span className="text-[10px] text-red-400 font-mono font-bold mt-1">{card}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 pt-2">
                      <p className={`font-black text-xl ${revealInfo.isLiar ? 'text-red-400 animate-pulse' : 'text-green-400'}`}>
                        {revealInfo.isLiar ? '¡ERA UNA MENTIRA TOTAL!' : '¡ERA VERDAD! DIJO LA VERDAD'}
                      </p>
                      
                      <div className="p-3 bg-white/5 border border-white/10 rounded-xl max-w-sm mx-auto mt-2">
                        <span className="text-sm font-bold text-tiki-text block">
                          Disparo del Perdedor (Ruleta Rusa):
                        </span>
                        <span className={`text-2xl font-black block font-mono mt-1 ${revealInfo.gunFired ? 'text-red-500 tracking-wider animate-bounce' : 'text-cyan-400'}`}>
                          {revealInfo.gunFired ? '💥 ¡BANG! ¡Se disparó la bala!' : '🔫 ¡CLIC! Recámara vacía (Sobrevivió)'}
                        </span>
                        <span className="text-[10px] text-tiki-muted block mt-1">Gatillazos del oponente acumulados: {revealInfo.triggerPulls}/6</span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* My Hand display */}
                {!myPlayer?.eliminated && phase === 'bidding' && (
                  <div className="glass rounded-2xl p-5 space-y-4">
                    <div className="flex justify-between items-center">
                      <p className="text-xs font-semibold text-tiki-muted uppercase tracking-widest">Tus Cartas (Clic para seleccionar 1-3)</p>
                      {selectedIndices.length > 0 && (
                        <button onClick={() => setSelectedIndices([])} className="text-xs text-red-400 font-bold hover:underline">
                          Desmarcar todas
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-3 overflow-x-auto pb-2 justify-center">
                      {myHand.map((card, i) => (
                        <Card
                          key={i}
                          value={card}
                          selected={selectedIndices.includes(i)}
                          onClick={() => toggleSelectCard(i)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions turn controllers */}
                {phase === 'bidding' && isMyTurn && !myPlayer?.eliminated && (
                  <motion.div initial={{ y: 15 }} animate={{ y: 0 }} className="glass rounded-2xl p-5 space-y-3 text-center border-t-2 border-yellow-400/40">
                    <p className="text-sm font-bold text-yellow-400 animate-pulse">🎯 ¡Es tu turno de actuar!</p>
                    
                    <div className="grid sm:grid-cols-2 gap-3 pt-2">
                      <button
                        onClick={playSelectedCards}
                        disabled={selectedIndices.length === 0}
                        className={`py-3.5 justify-center font-black rounded-xl text-sm flex gap-2 ${
                          selectedIndices.length > 0
                            ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] cursor-pointer'
                            : 'bg-white/5 text-tiki-muted border border-white/5 cursor-not-allowed'
                        }`}
                      >
                        Jugar {selectedIndices.length} {selectedIndices.length === 1 ? 'Carta' : 'Cartas'} boca abajo
                      </button>

                      {lastPlay && (
                        <button onClick={callLiar} className="btn-danger py-3.5 justify-center font-black text-sm flex gap-1 shadow-lg shadow-red-500/25">
                          ¡Mentira! (Gatillar) 🔫
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {phase === 'bidding' && !isMyTurn && (
                  <div className="glass rounded-2xl p-4 text-center text-tiki-muted">
                    Esperando que el rival juegue sus cartas…
                  </div>
                )}
              </div>
            )}

            {/* Finished absolute winner */}
            {phase === 'finished' && gameState && (
              <div className="glass rounded-3xl p-8 text-center space-y-5 border border-yellow-500/30 shadow-[0_0_40px_rgba(251,191,36,0.1)]">
                <p className="text-6xl">🏆</p>
                <h2 className="font-display font-black text-3xl gradient-text">
                  {gameState.winner === user?.id ? '¡Ganaste Liar\'s Bar!' : 'Partida Terminada'}
                </h2>
                <p className="text-tiki-muted text-sm max-w-sm mx-auto">
                  {gameState.winner === user?.id ? 'Demostraste tener la mejor cara de póker de TikiCasino.' : 'El último sobreviviente se queda con las monedas.'}
                </p>
                <button onClick={() => { setPhase('lobby'); setInLobby(false); setGameState(null); setMyHand([]); }}
                  className="btn-primary px-8 py-3.5 font-bold shadow-[0_0_20px_rgba(251,191,36,0.2)]">
                  Jugar de Nuevo
                </button>
              </div>
            )}

            {/* Rules visual panel */}
            {phase === 'lobby' && (
              <div className="glass rounded-2xl p-5 text-xs text-tiki-muted space-y-2">
                <p className="font-bold text-tiki-text text-sm mb-1">Guía del Juego</p>
                <p>• Al iniciar, se define la mesa (ej. Mesa de Reinas: solo se valen Reinas ♛ o Comodines 🃏).</p>
                <p>• En tu turno, jugás de 1 a 3 cartas de tu mano boca abajo, declarando que son del valor de la mesa.</p>
                <p>• Si el siguiente sospecha que mentís, puede gritar <span className="text-red-400 font-bold">¡Mentira!</span> y revelar tu última jugada.</p>
                <p>• El que pierda el reto debe disparar el revólver de 6 cámaras (Ruleta Rusa). Si la bala sale, pierde una vida. ¡Suerte!</p>
              </div>
            )}
          </div>

          <div className="h-[580px] lg:col-span-1">
            <RightSidebar roomCode={roomCode} />
          </div>
        </div>
      </main>
    </div>
  )
}
