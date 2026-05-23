import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

export default function TriviaGame() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [gameState, setGameState] = useState(null)
  const [selectedChoice, setSelectedChoice] = useState(null)

  // Anti-cheat: prevent text selection, right click, and copying!
  useEffect(() => {
    const handleCopy = (e) => {
      e.preventDefault()
      toast.error('⚠️ ¡Anti-Trampa Activo! No se permite copiar texto de las preguntas.')
    }
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault()
        toast.error('⚠️ ¡Anti-Trampa Activo! El copiado de texto está bloqueado.')
      }
    }
    
    document.addEventListener('copy', handleCopy)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('copy', handleCopy)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  useEffect(() => {
    if (!socket) return

    socket.emit('trivia:join', { roomCode })

    socket.on('trivia:state', (state) => {
      setGameState(state)
      // Reset selected answer if round changes or status changes back to playing
      if (state.status === 'playing' && selectedChoice !== null) {
        setSelectedChoice(null)
      }
    })

    socket.on('trivia:error', ({ message }) => {
      toast.error(message)
    })

    return () => {
      socket.off('trivia:state')
      socket.off('trivia:error')
      socket.emit('trivia:leave', { roomCode })
    }
  }, [socket, roomCode])

  const handleAnswerSubmit = (choiceIndex) => {
    if (!socket || !gameState || gameState.status !== 'playing') return
    const me = gameState.players.find(p => p.userId === user.id)
    if (!me || me.isEliminated || selectedChoice !== null) return

    setSelectedChoice(choiceIndex)
    socket.emit('trivia:answer', { roomCode, choiceIndex })
  }

  const joinBet = () => {
    if (!socket) return
    socket.emit('trivia:bet', { roomCode })
  }

  const startGame = () => {
    if (!socket) return
    socket.emit('trivia:start', { roomCode })
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black/90">
        <div className="spinner" />
      </div>
    )
  }

  const me = gameState.players.find(p => p.userId === user.id)
  const isSpectator = !me
  const hasPlacedBet = me && gameState.pool >= (gameState.players.length * 1000) // Simple approximation check
  const myBetPlaced = gameState.pool > 0 && gameState.players.some(p => p.userId === user.id && gameState.pool >= 1000) // More solid bet verification on client is computed by backend

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white select-none" onContextMenu={e => e.preventDefault()}>
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        
        {/* Top Header info */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Volver</Link>
            <h1 className="font-display font-bold text-2xl bg-gradient-to-r from-teal-400 to-indigo-500 bg-clip-text text-transparent">Preguntados VIP</h1>
            <span className="badge-violet text-xs font-black">Apuesta 1000 F</span>
          </div>
          <BalanceBadge balance={user?.balance || 0} />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 flex flex-col justify-between">
            
            {/* LOBBY / WAITING SCREEN */}
            {gameState.status === 'waiting' && (
              <div className="glass rounded-3xl p-8 text-center flex-1 flex flex-col items-center justify-center min-h-[450px]">
                <h2 className="text-3xl font-display font-black text-white mb-2">Sala de Espera de Trivia</h2>
                <p className="text-tiki-muted text-sm max-w-md mb-6">Apuesta fija de 1,000 Caldicoins. Responde rápido, sobrevive las 5 preguntas y llévate todo el bote.</p>

                {/* Bet Pool info badge */}
                <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-2xl px-6 py-4 mb-8">
                  <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider block mb-1">💰 Bote de Apuestas:</span>
                  <span className="text-yellow-300 text-4xl font-mono font-black">{gameState.pool.toLocaleString()} C</span>
                </div>

                <div className="flex gap-4">
                  <button 
                    onClick={joinBet}
                    className="btn-primary py-3 px-8 text-base shadow-[0_0_15px_rgba(20,184,166,0.3)]"
                  >
                    🎟️ Aportar 1,000 C
                  </button>

                  <button 
                    onClick={startGame}
                    className="btn-green py-3 px-8 text-base shadow-[0_0_15px_rgba(34,197,94,0.3)]"
                  >
                    🎮 Iniciar Partida
                  </button>
                </div>
              </div>
            )}

            {/* PLAYING STATE SCREEN */}
            {gameState.status === 'playing' && (
              <div className="glass rounded-3xl p-8 flex-1 flex flex-col justify-between min-h-[450px]">
                
                {/* Timer and Round info bar */}
                <div className="flex items-center justify-between mb-8">
                  <span className="badge-violet text-sm">Pregunta {gameState.currentRound + 1} de {gameState.totalRounds}</span>
                  
                  {/* Timer ring */}
                  <div className="flex items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/5 font-mono">
                    <span className="text-xs text-tiki-muted uppercase tracking-wider font-bold">Tiempo restante:</span>
                    <span className="text-teal-400 font-bold text-lg">{gameState.timer}s</span>
                  </div>
                </div>

                {/* Question Area (No Copy protection) */}
                <div className="text-center my-6 py-4 px-6 bg-slate-900/40 rounded-2xl border border-white/5 select-none pointer-events-none">
                  <h3 className="text-2xl md:text-3xl font-display font-bold leading-relaxed text-white">
                    {gameState.question?.text}
                  </h3>
                </div>

                {/* Elimination overlay warning */}
                {me?.isEliminated && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 text-center text-red-400 font-bold mb-6">
                    💀 Estás eliminado de la ronda actual. Puedes seguir como espectador.
                  </div>
                )}

                {/* Choices list */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {gameState.question?.choices.map((choice, index) => {
                    const isSelected = selectedChoice === index
                    
                    return (
                      <button
                        key={index}
                        disabled={me?.isEliminated || selectedChoice !== null}
                        onClick={() => handleAnswerSubmit(index)}
                        className={`text-left p-5 rounded-2xl border transition-all text-lg font-bold select-none cursor-pointer flex items-center gap-4 ${
                          isSelected 
                            ? 'bg-gradient-to-r from-teal-500 to-indigo-600 border-teal-400 shadow-[0_0_15px_rgba(20,184,166,0.4)] text-white scale-[1.02]' 
                            : (me?.isEliminated || selectedChoice !== null)
                              ? 'bg-slate-900/30 border-white/5 text-gray-500 cursor-not-allowed'
                              : 'bg-slate-900/50 border-white/10 hover:border-teal-400/50 hover:bg-slate-900 text-white'
                        }`}
                      >
                        <span className="w-8 h-8 flex items-center justify-center rounded-xl bg-black/40 font-mono text-xs text-teal-400">{index + 1}</span>
                        <span className="flex-1">{choice}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* REVEAL STATE SCREEN */}
            {gameState.status === 'reveal' && (
              <div className="glass rounded-3xl p-8 flex-1 flex flex-col justify-between min-h-[450px]">
                <div>
                  <div className="flex items-center justify-between mb-6">
                    <span className="badge-violet text-sm">Revelando Respuesta</span>
                    <span className="text-xs text-tiki-muted">Cargando siguiente ronda en unos segundos...</span>
                  </div>

                  {/* Question Title */}
                  <div className="text-center my-4 py-4 px-6 bg-slate-900/40 rounded-2xl border border-white/5 select-none pointer-events-none">
                    <h3 className="text-xl md:text-2xl font-display font-semibold text-white">
                      {gameState.reveal?.text}
                    </h3>
                  </div>
                </div>

                {/* Choices list with answers color coding */}
                <div className="grid md:grid-cols-2 gap-4 mt-6">
                  {gameState.reveal?.choices.map((choice, index) => {
                    const isCorrect = index === gameState.reveal.correct
                    const wasMySelection = selectedChoice === index

                    return (
                      <div
                        key={index}
                        className={`p-5 rounded-2xl border text-lg font-bold flex items-center gap-4 ${
                          isCorrect 
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : wasMySelection
                              ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.2)]'
                              : 'bg-slate-900/30 border-white/5 text-gray-500'
                        }`}
                      >
                        <span className={`w-8 h-8 flex items-center justify-center rounded-xl font-mono text-xs ${
                          isCorrect 
                            ? 'bg-emerald-500/40 text-emerald-300' 
                            : wasMySelection 
                              ? 'bg-red-500/40 text-red-300'
                              : 'bg-black/40 text-gray-500'
                        }`}>{index + 1}</span>
                        <span className="flex-1">{choice}</span>
                        {isCorrect && <span className="text-xs font-black uppercase text-emerald-400">Correcta ✓</span>}
                        {!isCorrect && wasMySelection && <span className="text-xs font-black uppercase text-red-400">Incorrecta ✗</span>}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* FINISHED STATE SCREEN */}
            {gameState.status === 'finished' && (
              <div className="glass rounded-3xl p-8 text-center flex-1 flex flex-col items-center justify-center min-h-[450px]">
                <h2 className="text-4xl font-display font-black bg-gradient-to-r from-yellow-400 to-amber-500 bg-clip-text text-transparent mb-2">¡Trivia Finalizada!</h2>
                <p className="text-tiki-muted text-sm mb-8">Todos los Caldicoins del bote fueron distribuidos a los supervivientes de la partida.</p>

                {/* Winners Table */}
                <div className="w-full max-w-md bg-slate-900/50 rounded-2xl border border-white/5 p-4 mb-6">
                  <h4 className="text-xs font-bold text-tiki-muted uppercase tracking-wider text-left mb-3 px-2">Tabla de Posiciones Final:</h4>
                  <div className="space-y-2">
                    {gameState.players.sort((a,b) => b.score - a.score).map((p, idx) => (
                      <div key={p.userId} className="flex items-center justify-between p-3 rounded-xl bg-black/30 border border-white/5">
                        <div className="flex items-center gap-3">
                          <span className={`font-mono font-black text-sm w-5 text-left ${idx === 0 ? 'text-yellow-400' : 'text-tiki-muted'}`}>{idx + 1}.</span>
                          <span className="text-white font-bold">{p.nickname}</span>
                          {p.isEliminated && <span className="text-[9px] bg-red-500/10 text-red-400 px-1.5 py-0.5 rounded font-bold uppercase">Eliminado</span>}
                          {!p.isEliminated && <span className="text-[9px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded font-bold uppercase">Superviviente</span>}
                        </div>
                        <span className="text-teal-400 font-mono font-black">{p.score.toLocaleString()} Puntos</span>
                      </div>
                    ))}
                  </div>
                </div>

                <Link to={`/room/${roomCode}`} className="btn-primary py-2.5 px-6 text-sm">Volver al Pub</Link>
              </div>
            )}
          </div>

          {/* Right Panel: Player statuses and Lobby active users */}
          <div className="flex flex-col gap-6">
            
            {/* Player list lobby panel */}
            <div className="glass rounded-3xl p-6 flex-1 flex flex-col">
              <h3 className="font-display font-bold text-lg text-white mb-4">Competidores</h3>
              <div className="space-y-3 flex-1 overflow-y-auto pr-1">
                {gameState.players.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between p-3 rounded-2xl bg-black/40 border border-white/5">
                    <div className="flex items-center gap-3">
                      <img src={`/avatars/${p.avatar}.png`} alt="avatar" className="w-8 h-8 rounded-lg" onError={e => e.target.src = '/avatars/tiki1.png'} />
                      <div>
                        <h4 className="text-white font-bold text-sm leading-none mb-1">{p.nickname}</h4>
                        <span className="text-[10px] text-teal-400 font-mono font-bold leading-none">{p.score} pts</span>
                      </div>
                    </div>
                    <div>
                      {p.isEliminated ? (
                        <span className="text-[10px] font-black uppercase text-red-400 tracking-wider">☠️ Caído</span>
                      ) : p.answered ? (
                        <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">✓ Listo</span>
                      ) : (
                        <span className="text-[10px] font-black uppercase text-amber-400 tracking-wider">⏳ Pensando</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Panel integration for real-time messaging */}
            <div className="h-[300px]">
              <ChatPanel roomCode={roomCode} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
