import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import toast from 'react-hot-toast'

export default function ShooterGame() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()

  const canvasRef = useRef(null)
  const [gameState, setGameState] = useState(null)
  
  // Player inputs state trackers
  const [keysPressed, setKeysPressed] = useState({})
  const [aimAngle, setAimAngle] = useState(0)
  const [isShooting, setIsShooting] = useState(false)

  // Socket triggers
  useEffect(() => {
    if (!socket) return

    socket.emit('shooter:join', { roomCode })

    socket.on('shooter:state', (state) => {
      setGameState(state)
    })

    socket.on('shooter:error', ({ message }) => {
      toast.error(message)
    })

    return () => {
      socket.off('shooter:state')
      socket.off('shooter:error')
      socket.emit('shooter:leave', { roomCode })
    }
  }, [socket, roomCode])

  // Key event listeners for movement
  useEffect(() => {
    const handleKeyDown = (e) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        setKeysPressed(prev => ({ ...prev, [k]: true }))
      }
    }
    const handleKeyUp = (e) => {
      const k = e.key.toLowerCase()
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        setKeysPressed(prev => ({ ...prev, [k]: false }))
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [])

  // Mouse angle tracking
  const handleMouseMove = (e) => {
    const canvas = canvasRef.current
    if (!canvas || !gameState) return

    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const me = gameState.players.find(p => p.userId === user.id)
    if (!me || me.isDead || !me.hasBet) return

    const angle = Math.atan2(mouseY - me.y, mouseX - me.x)
    setAimAngle(angle)
  }

  const handleMouseDown = () => setIsShooting(true)
  const handleMouseUp = () => setIsShooting(false)

  // Emits user inputs at 30Hz for ultimate fluid responsiveness
  useEffect(() => {
    if (!socket || !gameState) return
    const me = gameState.players.find(p => p.userId === user.id)
    if (!me || me.isDead || !me.hasBet) return

    const interval = setInterval(() => {
      socket.emit('shooter:input', {
        roomCode,
        keys: keysPressed,
        angle: aimAngle,
        shoot: isShooting
      })
    }, 1000 / 30)

    return () => clearInterval(interval)
  }, [socket, keysPressed, aimAngle, isShooting, gameState])

  // Place Spawn / Registration Bet of 500 Caldicoins (Only allowed during intermission)
  const placeSpawnBet = () => {
    if (!socket) return
    socket.emit('shooter:bet', { roomCode })
  }

  // Draw board
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !gameState) return

    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // 1. Draw grid
    ctx.strokeStyle = 'rgba(6, 182, 212, 0.08)'
    ctx.lineWidth = 1
    const gridSize = 40
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath()
      ctx.moveTo(x, 0)
      ctx.lineTo(x, canvas.height)
      ctx.stroke()
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath()
      ctx.moveTo(0, y)
      ctx.lineTo(canvas.width, y)
      ctx.stroke()
    }

    // 2. Draw Bullets (Rendered as glowing golden balls)
    for (const b of gameState.bullets) {
      ctx.save()
      ctx.shadowBlur = 12
      ctx.shadowColor = '#fbbf24'
      ctx.fillStyle = '#fbbf24'
      ctx.beginPath()
      ctx.arc(b.x, b.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // 3. Draw Active Players
    for (const p of gameState.players) {
      if (p.isDead || !p.hasBet) continue

      const isMe = p.userId === user.id

      ctx.save()
      ctx.shadowBlur = isMe ? 20 : 10
      ctx.shadowColor = p.color

      // Draw player outer ring
      ctx.strokeStyle = p.color
      ctx.lineWidth = isMe ? 4 : 2
      ctx.fillStyle = 'rgba(0, 0, 0, 0.7)'
      ctx.beginPath()
      ctx.arc(p.x, p.y, 16, 0, Math.PI * 2)
      ctx.fill()
      ctx.stroke()

      // Direction vector indicator
      ctx.strokeStyle = p.color
      ctx.lineWidth = 3
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(
        p.x + Math.cos(p.angle) * 22,
        p.y + Math.sin(p.angle) * 22
      )
      ctx.stroke()

      ctx.fillStyle = p.color
      ctx.beginPath()
      ctx.arc(p.x, p.y, 5, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()

      // HP indicator label
      ctx.fillStyle = '#ffffff'
      ctx.font = 'bold 10px monospace'
      ctx.textAlign = 'center'
      ctx.fillText(p.nickname, p.x, p.y - 32)

      ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'
      ctx.fillRect(p.x - 20, p.y - 25, 40, 4)

      ctx.fillStyle = p.hp > 50 ? '#10b981' : p.hp > 25 ? '#f59e0b' : '#ef4444'
      ctx.fillRect(p.x - 20, p.y - 25, (p.hp / 100) * 40, 4)
    }

  }, [gameState, user.id])

  const me = gameState?.players.find(p => p.userId === user.id)
  
  // Decide which overlay to display based on status & player states
  const showIntermissionOverlay = gameState?.status === 'intermission'
  const showSpectatorOverlay = gameState?.status === 'playing' && (!me || me.isDead || !me.hasBet)

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white select-none">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">

        {/* Top Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Volver</Link>
            <h1 className="font-display font-bold text-2xl bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Shooter 2D Arena</h1>
            <span className="badge-cyan text-xs font-black">Apuesta 500 F</span>
          </div>
          <BalanceBadge balance={user?.balance || 0} />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          
          {/* Main Area */}
          <div className="lg:col-span-3 flex flex-col items-center">
            
            {/* HUD Status Bar */}
            <div className="w-full max-w-[800px] flex items-center justify-between px-6 py-3 rounded-t-3xl border-t border-x border-cyan-500/20 bg-black/40 backdrop-blur">
              <span className="text-xs font-bold font-mono tracking-widest text-tiki-muted">ESTADO DE LA ARENA</span>
              
              {gameState && (
                <div className="flex items-center gap-4">
                  {gameState.status === 'intermission' ? (
                    <>
                      <span className="animate-pulse w-2 h-2 rounded-full bg-yellow-400 block" />
                      <span className="text-xs font-bold text-yellow-400 font-mono">INTERVENCIÓN: {gameState.timer}s</span>
                    </>
                  ) : (
                    <>
                      <span className="animate-ping w-2 h-2 rounded-full bg-red-500 block" />
                      <span className="text-xs font-bold text-red-500 font-mono">BATALLA EN CURSO: {gameState.timer}s</span>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Cyberpunk canvas frame */}
            <div className="relative rounded-b-3xl overflow-hidden border border-cyan-500/20 bg-black/60 shadow-[0_0_30px_rgba(6,182,212,0.1)] w-full max-w-[800px]">
              
              <canvas
                ref={canvasRef}
                width={800}
                height={600}
                className="w-full aspect-[4/3] block cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
              />

              {/* FASE 1: Intermission/Registration Overlay */}
              <AnimatePresence>
                {showIntermissionOverlay && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                  >
                    <span className="text-yellow-400 text-xs font-black tracking-widest uppercase mb-2 animate-bounce">⏳ PRÓXIMO COMBATE</span>
                    <h3 className="text-4xl font-display font-black mb-1 bg-gradient-to-r from-yellow-400 to-orange-500 bg-clip-text text-transparent">
                      FASE DE INSCRIPCIÓN
                    </h3>
                    <p className="text-tiki-muted text-sm max-w-sm mb-8">
                      La arena de combate se abrirá en <span className="text-white font-mono font-bold">{gameState?.timer} segundos</span>.
                    </p>

                    {me?.hasBet ? (
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-emerald-400 text-sm font-black border border-emerald-500/30 px-6 py-3 rounded-full bg-emerald-500/5 shadow-[0_0_15px_rgba(16,185,129,0.15)] flex items-center gap-2">
                          ✓ INSCRIPCIÓN CONFIRMADA
                        </span>
                        <span className="text-[10px] text-tiki-muted">Preparado para el inicio del combate.</span>
                      </div>
                    ) : (
                      <button
                        onClick={placeSpawnBet}
                        className="btn-primary py-3.5 px-8 text-base font-black uppercase tracking-wider shadow-[0_0_20px_rgba(20,184,166,0.4)]"
                      >
                        ⚔️ Inscribirse (500 C)
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* FASE 2: Spectator / Elimination Overlay */}
              <AnimatePresence>
                {showSpectatorOverlay && (
                  <motion.div 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center"
                  >
                    <h3 className="text-3xl font-display font-black mb-2 bg-gradient-to-r from-red-400 to-amber-500 bg-clip-text text-transparent">
                      {me?.hasBet ? '💀 FUISTE ELIMINADO' : '🎥 MODO ESPECTADOR'}
                    </h3>
                    <p className="text-tiki-muted text-sm max-w-md">
                      {me?.hasBet 
                        ? 'No podés reaparecer durante esta ronda. Esperá a que termine el combate para anotarte a la siguiente partida.' 
                        : 'El combate ya se está disputando. Esperá a la próxima intervención de 15 segundos para inscribirte.'}
                    </p>
                    
                    <div className="mt-8 bg-black/50 border border-white/5 px-6 py-3 rounded-2xl">
                      <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">Ronda finaliza en:</span>
                      <span className="text-xl font-mono font-black text-cyan-400">{gameState?.timer} segundos</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* In-game tips */}
            <div className="mt-4 flex gap-6 text-xs text-tiki-muted font-mono bg-black/20 px-4 py-2 rounded-xl border border-white/5 w-full max-w-[800px] justify-between">
              <span>⌨️ WASD: Moverse</span>
              <span>🖱️ Ratón: Apuntar</span>
              <span>🔥 Clic: Disparar</span>
            </div>

          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            
            {/* Combat list */}
            <div className="glass rounded-3xl p-6 flex flex-col min-h-[220px]">
              <h3 className="font-display font-bold text-lg text-white mb-4">Lobby de Combate</h3>
              <div className="space-y-3 overflow-y-auto max-h-[200px]">
                {gameState?.players.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between p-2.5 rounded-xl bg-black/30 border border-white/5">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full block border" style={{ backgroundColor: p.color, borderColor: '#fff' }} />
                      <div className="flex flex-col">
                        <span className="text-white font-bold text-xs flex items-center gap-1.5">
                          {p.nickname}
                          {p.userId === user.id && <span className="text-[8px] bg-cyan-500/10 text-teal-400 px-1 py-0.5 rounded font-black">TÚ</span>}
                        </span>
                        {gameState.status === 'playing' && p.hasBet && (
                          <span className="text-[9px] text-yellow-500/80 font-mono font-bold">{p.kills} bajas</span>
                        )}
                      </div>
                    </div>
                    <div>
                      {p.hasBet ? (
                        p.isDead ? (
                          <span className="text-[8px] font-black uppercase text-red-500 bg-red-500/10 px-1.5 py-0.5 rounded">💀 ELIMINADO</span>
                        ) : (
                          <span className="text-[8px] font-black uppercase text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">⚔️ LUCHANDO</span>
                        )
                      ) : (
                        <span className="text-[8px] font-black uppercase text-tiki-muted bg-white/5 px-1.5 py-0.5 rounded">🎥 ESPECTADOR</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Chat Panel */}
            <div className="h-[280px]">
              <ChatPanel roomCode={roomCode} />
            </div>

          </div>

        </div>

      </main>
    </div>
  )
}
