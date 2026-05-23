import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Environment, OrbitControls } from '@react-three/drei'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import RightSidebar from '../../components/RightSidebar.jsx'
import toast from 'react-hot-toast'
import { playWinSound, playLoseSound } from '../../utils/audio.js'

// Preload 3D tavern props
useGLTF.preload('/Revolver.glb')
useGLTF.preload('/Cartas.glb')

function TavernTable3D({ phase, revealInfo }) {
  const revolver = useGLTF('/Revolver.glb')
  const cards = useGLTF('/Cartas.glb')
  
  const revolverRef = useRef()
  const cardsRef = useRef()

  // Apply premium metal and paper finishes to the models
  useEffect(() => {
    if (revolver.scene) {
      revolver.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material.metalness = 0.96  // Polished gun steel
            child.material.roughness = 0.12  // Smooth metallic cylinder
            child.material.needsUpdate = true
          }
        }
      })
    }
    if (cards.scene) {
      cards.scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material.metalness = 0.18
            child.material.roughness = 0.28  // High quality cardstock
            child.material.needsUpdate = true
          }
        }
      })
    }
  }, [revolver.scene, cards.scene])

  useFrame((state) => {
    const t = state.clock.getElapsedTime()
    
    // Revolver Animations - Floating left-center
    if (revolverRef.current) {
      if (phase === 'reveal') {
        // Dramatic spinning cylinder and barrel shake
        revolverRef.current.rotation.y = Math.PI / 2 + Math.sin(t * 18) * 0.15
        revolverRef.current.rotation.z = t * 14
        revolverRef.current.position.y = 0.05 + Math.sin(t * 22) * 0.05
      } else {
        // Gentle, tension-filled levitation
        revolverRef.current.rotation.y = Math.PI / 2 + Math.sin(t * 0.8) * 0.15
        revolverRef.current.rotation.z = Math.sin(t * 0.4) * 0.08
        revolverRef.current.position.y = 0.05 + Math.sin(t * 1.3) * 0.04
      }
    }

    // Stacked Cards Animations - Floating right-center
    if (cardsRef.current) {
      cardsRef.current.rotation.y = t * 0.08
      cardsRef.current.position.y = -0.22 + Math.sin(t * 1.1) * 0.02
    }
  })

  return (
    <group>
      {/* 3D Revolver in the left-front - scaled up heavily and spaced out */}
      <primitive 
        ref={revolverRef} 
        object={revolver.scene} 
        scale={[0.72, 0.72, 0.72]} 
        position={[-0.16, 0.05, 0.08]} 
      />
      
      {/* 3D Cards stacked under the right-back - scaled up heavily and spaced out */}
      <primitive 
        ref={cardsRef} 
        object={cards.scene} 
        scale={[0.72, 0.72, 0.72]} 
        position={[0.16, -0.22, -0.2]} 
        rotation={[-Math.PI / 2, 0, 0]}
      />
    </group>
  )
}

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
      socket.emit('liarsbar:leave', { roomCode })
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
    <div className="min-h-screen flex flex-col bg-[#0b0c10] text-gray-100 selection:bg-amber-500 selection:text-black">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3 border border-white/5 bg-white/5 rounded-xl hover:bg-white/10 transition-all">← Volver a Sala</Link>
            <div>
              <h1 className="font-display font-black text-2xl tracking-tight bg-gradient-to-r from-amber-400 via-orange-500 to-yellow-500 bg-clip-text text-transparent">🍻 LIAR'S BAR</h1>
              <p className="text-[10px] text-amber-500/80 font-mono tracking-widest uppercase mt-0.5">Estilo Taberna Rusa · Multijugador</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full text-xs font-bold border border-purple-500/30 bg-purple-950/20 text-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.15)]">Mesa Activa</span>
            <span className="px-3 py-1 rounded-full text-xs font-bold border border-white/10 bg-white/5 text-gray-400 font-mono">{roomCode}</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 space-y-6">

            {/* Lobby Setup Phase */}
            {phase === 'lobby' && (
              <div className="relative rounded-3xl p-8 text-center border border-amber-500/10 overflow-hidden shadow-2xl" 
                style={{ background: 'linear-gradient(135deg, rgba(20,15,10,0.95), rgba(10,5,2,0.98))' }}>
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.06),transparent_70%)] pointer-events-none" />
                <div className="relative z-10 max-w-lg mx-auto space-y-6">
                  <div className="inline-flex p-5 bg-amber-500/10 border border-amber-500/20 rounded-full text-5xl mb-1 shadow-[0_0_30px_rgba(245,158,11,0.1)]">
                    🃏
                  </div>
                  <div>
                    <h2 className="font-display font-black text-3xl text-amber-400 tracking-tight">Mesa de Mentiras</h2>
                    <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                      El juego definitivo de engaño y sangre fría. Jugá tus cartas tapadas, declará el valor oficial de la mesa, y mentí para sobrevivir. ¡Si te atrapan, gatillás el tambor del revólver!
                    </p>
                  </div>

                  {!inLobby ? (
                    <button onClick={joinLobby} className="w-full sm:w-auto px-10 py-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black text-base rounded-xl transition-all shadow-[0_0_30px_rgba(245,158,11,0.35)] active:scale-98">
                      Sentarse en la Mesa
                    </button>
                  ) : (
                    <div className="space-y-5 bg-black/40 border border-white/5 rounded-2xl p-5">
                      <div>
                        <p className="text-xs font-mono text-amber-500 uppercase tracking-widest mb-3">Jugadores Listos ({lobbyPlayers.length}/15)</p>
                        <div className="flex flex-wrap gap-2.5 justify-center">
                          {lobbyPlayers.map((p, i) => (
                            <span key={i} className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                              p.id === user?.id 
                                ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(251,191,36,0.3)]' 
                                : 'bg-white/5 border border-white/10 text-gray-300'
                            }`}>
                              {p.id === user?.id ? '⭐ Vos' : `Jugador ${i + 1}`}
                            </span>
                          ))}
                        </div>
                      </div>
                      
                      {lobbyPlayers.length >= 2 ? (
                        <button onClick={startGame} className="w-full px-8 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-black font-black text-sm rounded-xl transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          ¡Comenzar Partida!
                        </button>
                      ) : (
                        <div className="py-2 text-xs text-amber-500/70 font-mono animate-pulse">
                          ⌛ Esperando oponentes para iniciar… (mínimo 2 jugadores)
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Immersive Cinematic Game Board */}
            {(phase === 'bidding' || phase === 'reveal') && gameState && (
              <div className="space-y-6">
                {/* Circular Tavern Table Layout (Steam Liar's Bar Style) */}
                <div className="relative w-full h-[580px] rounded-3xl overflow-hidden border border-amber-900/40 shadow-[0_25px_60px_rgba(0,0,0,0.85)] flex items-center justify-center bg-[#09150e]"
                  style={{
                    background: 'radial-gradient(circle at center, #1e4530 0%, #0d2116 60%, #040906 100%)'
                  }}>
                  {/* Mahogany outer rim and felt details */}
                  <div className="absolute inset-0 border-[14px] border-[#3e1d0f] rounded-3xl opacity-90 pointer-events-none z-10" />
                  <div className="absolute inset-[14px] border-2 border-amber-500/20 rounded-2xl pointer-events-none" />
                  
                  {/* Center Felt Markings */}
                  <div className="absolute w-[280px] h-[280px] rounded-full border-4 border-dashed border-amber-500/10 pointer-events-none opacity-40" />

                  {/* 3D Canvas / Center stage (The Revolver and Deck) */}
                  <div className="w-[200px] h-[200px] z-10 flex flex-col items-center justify-center relative">
                    <Suspense fallback={
                      <div className="text-amber-500 text-[10px] font-mono animate-pulse">
                        Cargando 3D...
                      </div>
                    }>
                      <Canvas camera={{ position: [0, 0.35, 1.15], fov: 30 }} className="w-full h-full">
                        <ambientLight intensity={1.8} />
                        <directionalLight position={[2, 4, 2]} intensity={2.5} />
                        <pointLight position={[-2, 2, -2]} color="#fbbf24" intensity={3} />
                        <pointLight position={[2, -2, 2]} color="#06b6d4" intensity={2} />
                        <TavernTable3D phase={phase} revealInfo={revealInfo} />
                        <Environment preset="sunset" />
                        <OrbitControls enableZoom={false} />
                      </Canvas>
                    </Suspense>
                    <div className="absolute -bottom-6 bg-black/80 px-3 py-1 rounded-full border border-amber-500/30 shadow-lg text-[10px] font-black text-amber-400 font-mono uppercase tracking-wider whitespace-nowrap">
                      Solo {CARD_NAMES[gameState.tableCard] || 'Reyes'}
                    </div>
                  </div>

                  {/* Player seats Distributed in a circle */}
                  {gameState.players.map((p, idx) => {
                    const myIndex = gameState.players.findIndex(pl => pl.id === user?.id)
                    const seatIndex = myIndex !== -1 
                      ? (idx - myIndex + gameState.players.length) % gameState.players.length 
                      : idx;
                      
                    // Map seat index to relative placement in a circle
                    let seatClass = "";
                    const totalSeats = gameState.players.length;
                    
                    if (totalSeats === 2) {
                      seatClass = seatIndex === 0 
                        ? "bottom-6 left-1/2 -translate-x-1/2" 
                        : "top-6 left-1/2 -translate-x-1/2";
                    } else if (totalSeats === 3) {
                      seatClass = seatIndex === 0 
                        ? "bottom-6 left-1/2 -translate-x-1/2" 
                        : seatIndex === 1 
                        ? "top-12 left-6" 
                        : "top-12 right-6";
                    } else {
                      // 4 or more players circular cross
                      if (seatIndex === 0) seatClass = "bottom-6 left-1/2 -translate-x-1/2";
                      else if (seatIndex === 1) seatClass = "top-1/2 -translate-y-1/2 left-6";
                      else if (seatIndex === 2) seatClass = "top-6 left-1/2 -translate-x-1/2";
                      else seatClass = "top-1/2 -translate-y-1/2 right-6";
                    }

                    const isActive = gameState.currentPlayerId === p.id;
                    const isMe = p.id === user?.id;
                    const isLastBidder = lastPlay && lastPlay.playerId === p.id;

                    return (
                      <div key={idx} className={`absolute z-20 w-44 md:w-48 transition-all duration-300 ${seatClass}`}>
                        <div className={`relative rounded-2xl border p-3.5 bg-black/85 backdrop-blur-md shadow-2xl transition-all ${
                          isMe 
                            ? 'border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.15)]' 
                            : isActive 
                            ? 'border-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.25)] animate-pulse' 
                            : 'border-white/5'
                        } ${p.eliminated ? 'opacity-30 grayscale' : ''}`}>
                          
                          {isActive && (
                            <span className="absolute -top-2 -right-2 bg-amber-400 text-black font-black text-[8px] px-2 py-0.5 rounded-full uppercase tracking-wider shadow-lg">
                              TURNO
                            </span>
                          )}

                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-black text-white truncate max-w-[85px]">
                              {isMe ? '⭐ Vos' : `Jugador ${idx + 1}`}
                            </span>
                            <span className="text-[10px] font-mono text-gray-400 flex items-center gap-0.5">
                              🎴 {p.handCount || p.diceCount}
                            </span>
                          </div>

                          <div className="mb-2">
                            <LivesBar lives={p.lives} />
                          </div>

                          <div className="bg-black/50 border border-white/5 rounded-xl p-1.5 text-center text-[8px] font-mono text-gray-400 flex items-center justify-between">
                            <span>Gatillazos:</span>
                            <span className="font-bold text-amber-500">{p.triggerPulls}/6</span>
                          </div>

                          {/* How many cards they played (TUS CARTAS JUGADAS EN MESA) - matches Steam! */}
                          {isLastBidder && (
                            <div className="mt-2 bg-[#1b0905]/80 border border-red-500/20 p-2 rounded-xl text-center space-y-1 animate-bounce shadow-inner">
                              <span className="text-[7.5px] text-amber-500/80 font-mono tracking-wider block uppercase">Jugó Boca Abajo:</span>
                              <div className="flex gap-1 justify-center">
                                {Array.from({ length: lastPlay.quantity }).map((_, cIdx) => (
                                  <div key={cIdx} 
                                    className="w-5 h-7 rounded border border-red-500/40 bg-gradient-to-br from-red-800 to-black flex items-center justify-center shadow-md relative overflow-hidden"
                                    style={{ transform: `rotate(${(cIdx - 1) * 6}deg)` }}>
                                    <div className="absolute inset-0.5 border border-dashed border-red-500/10 rounded bg-[#400]" />
                                    <span className="text-[8px] text-red-500 font-bold relative z-10">🎴</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {phase === 'reveal' && p.dice && (
                            <div className="flex gap-1 mt-2.5 justify-center flex-wrap">
                              {p.dice.map((card, ci) => (
                                <Card key={ci} value={card} size="small" />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Cinematic Round Reveal Panel */}
                {phase === 'reveal' && revealInfo && (
                  <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className="rounded-2xl p-6 text-center border-2 border-red-500/20 bg-gradient-to-b from-red-950/20 to-black/80 shadow-[0_0_50px_rgba(239,68,68,0.15)] space-y-4">
                    <div>
                      <h3 className="font-display font-black text-2xl text-red-500 uppercase tracking-tight">
                        📢 ¡REVELACIÓN DE MENTIRA!
                      </h3>
                      <p className="text-gray-400 text-xs mt-1">
                        El oponente gritó que las cartas descartadas eran falsas. ¡Veamos las cartas!
                      </p>
                    </div>

                    <div className="flex gap-3 justify-center my-4">
                      {revealInfo.playedCards?.map((card, ci) => (
                        <div key={ci} className="w-16 h-24 rounded-xl border-2 border-red-500/30 bg-red-950/30 flex flex-col items-center justify-center shadow-lg transform rotate-2">
                          <span className="text-3xl filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">{CARD_ICONS[card]}</span>
                          <span className="text-[10px] text-red-400 font-mono font-bold mt-2">{card}</span>
                        </div>
                      ))}
                    </div>

                    <div className="space-y-3 max-w-md mx-auto">
                      <p className={`font-black text-xl tracking-tight uppercase ${revealInfo.isLiar ? 'text-red-500 animate-pulse' : 'text-green-500'}`}>
                        {revealInfo.isLiar ? '❌ ¡ERA UNA MENTIRA TOTAL!' : '✅ ¡ERA VERDAD! DIJO LA VERDAD'}
                      </p>
                      
                      <div className="p-4 bg-black/80 border border-white/5 rounded-2xl shadow-inner space-y-2">
                        <span className="text-xs font-mono text-gray-400 block uppercase tracking-wider">
                          Resultado de la Ruleta Rusa
                        </span>
                        <span className={`text-2xl font-black block font-display ${revealInfo.gunFired ? 'text-red-500 animate-bounce' : 'text-cyan-400'}`}>
                          {revealInfo.gunFired ? '💥 ¡💥 BANG! ¡EL ARMA DISPARÓ!' : '🔫 ¡CLIC! Recámara vacía. ¡Sobrevivió!'}
                        </span>
                        <span className="text-[10px] text-gray-500 block font-mono">
                          El perdedor acumula {revealInfo.triggerPulls}/6 clics en el tambor.
                        </span>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* My Interactive Hand Selection */}
                {!myPlayer?.eliminated && phase === 'bidding' && (
                  <div className="glass rounded-2xl p-5 space-y-4 border border-cyan-500/10">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-mono text-amber-500 uppercase tracking-widest">Tus Cartas de la Mano</h4>
                        <p className="text-[10px] text-gray-400 mt-0.5">Podés seleccionar de 1 a 3 cartas para descartar boca abajo.</p>
                      </div>
                      {selectedIndices.length > 0 && (
                        <button onClick={() => setSelectedIndices([])} className="text-xs text-red-400 font-bold hover:underline transition-all">
                          Desmarcar todas
                        </button>
                      )}
                    </div>
                    
                    <div className="flex gap-4 overflow-x-auto pb-4 pt-2 justify-center">
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

                {/* Active Action Controls */}
                {phase === 'bidding' && isMyTurn && !myPlayer?.eliminated && (
                  <motion.div initial={{ y: 15 }} animate={{ y: 0 }} 
                    className="rounded-2xl p-6 text-center border-t-4 border-amber-400 bg-gradient-to-b from-[#1c120a] to-[#0b0c10] shadow-[0_-10px_30px_rgba(245,158,11,0.08)] space-y-4">
                    <p className="text-sm font-black text-amber-400 font-mono tracking-widest uppercase animate-pulse">🎯 ¡ES TU TURNO DE JUGAR!</p>
                    
                    <div className="grid sm:grid-cols-2 gap-4 max-w-2xl mx-auto">
                      <button
                        onClick={playSelectedCards}
                        disabled={selectedIndices.length === 0}
                        className={`py-4 justify-center font-black rounded-xl text-sm flex items-center gap-2 transition-all ${
                          selectedIndices.length > 0
                            ? 'bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-black shadow-[0_0_20px_rgba(245,158,11,0.3)] active:scale-98 cursor-pointer'
                            : 'bg-white/5 text-gray-600 border border-white/5 cursor-not-allowed'
                        }`}
                      >
                        Jugar {selectedIndices.length} {selectedIndices.length === 1 ? 'Carta' : 'Cartas'} boca abajo
                      </button>

                      {lastPlay && (
                        <button onClick={callLiar} className="btn-danger py-4 justify-center font-black text-sm flex items-center gap-2 shadow-lg shadow-red-500/20 active:scale-98">
                          🔫 ¡Mentira! (Gatillar Revólver)
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}

                {phase === 'bidding' && !isMyTurn && (
                  <div className="bg-black/40 border border-white/5 rounded-2xl p-5 text-center text-xs text-gray-500 font-mono animate-pulse">
                    ⌛ Esperando que el rival decida su jugada…
                  </div>
                )}
              </div>
            )}

            {/* Match Over / Victory Screen */}
            {phase === 'finished' && gameState && (
              <div className="relative rounded-3xl p-10 text-center border border-yellow-500/30 overflow-hidden shadow-2xl bg-gradient-to-b from-[#1a1405] to-[#0c0d11]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(234,179,8,0.08),transparent_75%)] pointer-events-none" />
                <div className="relative z-10 space-y-6 max-w-sm mx-auto">
                  <div className="text-6xl animate-bounce">🏆</div>
                  <div>
                    <h2 className="font-display font-black text-3xl bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent">
                      {gameState.winner === user?.id ? '¡Vencedor Absoluto!' : 'Partida Finalizada'}
                    </h2>
                    <p className="text-gray-400 text-sm mt-3 leading-relaxed">
                      {gameState.winner === user?.id 
                        ? 'Demostraste tener la mejor cara de póker de TikiCasino. Sobreviviste al tambor de la muerte.' 
                        : 'El último sobreviviente en la mesa de bar se queda con la gloria y el botín.'}
                    </p>
                  </div>
                  <button onClick={() => { setPhase('lobby'); setInLobby(false); setGameState(null); setMyHand([]); }}
                    className="w-full py-4 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-black rounded-xl transition-all shadow-[0_0_20px_rgba(251,191,36,0.3)]">
                    Volver a Jugar
                  </button>
                </div>
              </div>
            )}

            {/* Instruction Panel */}
            {phase === 'lobby' && (
              <div className="glass rounded-2xl p-5 border border-white/5 space-y-3">
                <h4 className="font-display font-bold text-xs text-amber-500 uppercase tracking-widest">Reglamento Oficial de la Taberna</h4>
                <div className="grid sm:grid-cols-2 gap-4 text-[11px] text-gray-400">
                  <div className="space-y-1.5">
                    <p><span className="text-white font-bold">1. La Mesa de Juego:</span> Se define un valor requerido (Ases, Reyes o Reinas). Toda carta jugada boca abajo se clama que es de ese valor. Los Comodines (🃏) siempre son verdades.</p>
                    <p><span className="text-white font-bold">2. Descartar:</span> En tu turno, jugás de 1 a 3 cartas de tu mano. El oponente decide si confía en tu palabra o te tacha de mentiroso.</p>
                  </div>
                  <div className="space-y-1.5">
                    <p><span className="text-white font-bold">3. Cuestionar:</span> Si gritan "¡Mentira!", se revelan tus cartas. Si mentiste, vas a la Ruleta Rusa. Si dijiste la verdad, el que gritó debe gatillar contra sí mismo.</p>
                    <p><span className="text-white font-bold">4. Sobrevivir:</span> Gatillar aumenta tus probabilidades de recibir el disparo en el tambor de 6 recámaras. ¡El último jugador con vidas gana!</p>
                  </div>
                </div>
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
