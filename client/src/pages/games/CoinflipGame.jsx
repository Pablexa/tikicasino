import { useState, useEffect, useRef, Suspense } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Center, Environment, OrbitControls } from '@react-three/drei'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import RightSidebar from '../../components/RightSidebar.jsx'
import toast from 'react-hot-toast'
import { playWinSound, playLoseSound } from '../../utils/audio.js'

// Preload gold coin 3D model
useGLTF.preload('/gold coin 3d model.glb')

function Coin3D({ flipping, result }) {
  const { scene } = useGLTF('/gold coin 3d model.glb')
  const coinRef = useRef()

  // Process and force high-end shiny gold materials on the loaded mesh
  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true
          child.receiveShadow = true
          if (child.material) {
            child.material.metalness = 0.98  // Force ultra-high metal shine
            child.material.roughness = 0.12  // Smooth polished surface
            child.material.needsUpdate = true
          }
        }
      })
    }
  }, [scene])

  useFrame((state) => {
    if (!coinRef.current) return
    const t = state.clock.getElapsedTime()

    if (flipping) {
      // High-speed vertical head-over-heels flip (spin on X and Y)
      coinRef.current.rotation.x += 0.55
      coinRef.current.rotation.y += 0.12
      coinRef.current.rotation.z = -Math.PI / 2  // Force the Tiki mask to stay oriented upright
      coinRef.current.position.y = Math.sin(t * 15) * 1.3
    } else if (result) {
      // Settle perfectly standed up facing the camera (rotation.x = PI / 2)
      // Heads: rotation.y = 0, Tails: rotation.y = PI
      const targetRotX = Math.PI / 2
      const targetRotY = result.result === 'heads' ? 0 : Math.PI
      coinRef.current.rotation.x += (targetRotX - coinRef.current.rotation.x) * 0.15
      coinRef.current.rotation.y += (targetRotY - coinRef.current.rotation.y) * 0.15
      coinRef.current.rotation.z = -Math.PI / 2  // Force the Tiki mask to stay oriented upright
      coinRef.current.position.y += (0 - coinRef.current.position.y) * 0.15
    } else {
      // Idle float (gentle stand up tilt, left-to-right rotation to show depth)
      coinRef.current.rotation.x = Math.PI / 2 + Math.sin(t * 0.5) * 0.05
      coinRef.current.rotation.y = Math.sin(t * 1.5) * 0.25
      coinRef.current.rotation.z = -Math.PI / 2  // Force the Tiki mask to stay oriented upright
      coinRef.current.position.y = Math.sin(t * 2.5) * 0.12
    }
  })

  return (
    <Center>
      <primitive 
        ref={coinRef} 
        object={scene} 
        scale={[2.0, 2.0, 2.0]} 
        position={[0, 0, 0]}
      />
    </Center>
  )
}

export default function CoinflipGame() {
  const { roomCode } = useParams()
  const { user, updateBalance } = useAuth()
  const { socket } = useSocket()

  const [balance, setBalance] = useState(user?.balance || 0)
  const [betAmount, setBetAmount] = useState(100)
  const [choice, setChoice] = useState('heads')
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState(null)
  const [history, setHistory] = useState([])
  const [showReward, setShowReward] = useState(false)

  useEffect(() => { setBalance(user?.balance || 0) }, [user?.balance])

  useEffect(() => {
    if (!socket) return
    const onResult = (r) => {
      setTimeout(() => {
        setFlipping(false)
        setResult(r)
        setHistory(prev => [r, ...prev].slice(0, 10))
        if (r.win) {
          playWinSound()
          setShowReward(true)
          toast.success(`¡Salió ${r.result === 'heads' ? 'CARA' : 'CECA'}! ¡Ganaste! +${r.payout.toLocaleString()} CALDICOINS!`)
        } else {
          playLoseSound()
          toast.error(`Salió ${r.result === 'heads' ? 'CARA' : 'CECA'} — Perdiste esta ronda.`)
        }
      }, 1200)
    }
    const onError = ({ message }) => { toast.error(message); setFlipping(false) }
    const onSaldoUpdate = ({ balance: b }) => { setBalance(b); updateBalance(b) }
    
    socket.on('coinflip:result', onResult)
    socket.on('coinflip:error', onError)
    socket.on('balance:update', onSaldoUpdate)
    
    return () => {
      socket.off('coinflip:result', onResult)
      socket.off('coinflip:error', onError)
      socket.off('balance:update', onSaldoUpdate)
    }
  }, [socket])

  const flip = () => {
    if (!socket) return
    if (betAmount < 10) { toast.error('Min 10 CALDICOINS'); return }
    if (betAmount > balance) { toast.error('CALDICOINS insuficientes'); return }
    setFlipping(true)
    setResult(null)
    socket.emit('coinflip:play', { roomCode, choice, betAmount })
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Coinflip</h1>
          </div>
          <BalanceBadge balance={balance} />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Coin display */}
            <div className="glass rounded-3xl p-10 text-center" style={{ background: 'radial-gradient(ellipse at center, rgba(6,182,212,0.08) 0%, transparent 70%)' }}>
              <div className="flex justify-center mb-8">
                <div className="w-[300px] h-[300px] relative rounded-3xl overflow-hidden border border-cyan-500/10 bg-black/40 shadow-[inset_0_0_20px_rgba(6,182,212,0.15)] flex items-center justify-center">
                  
                  {/* Floating HUD Badge to indicate side clearly */}
                  {result && (
                    <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-10 select-none pointer-events-none">
                      <span className="text-[9px] text-tiki-muted font-black tracking-widest">LADO</span>
                      <motion.span 
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest border shadow-lg ${
                          result.result === 'heads'
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-cyan-500/10'
                            : 'bg-violet-500/20 text-violet-300 border-violet-500/40 shadow-violet-500/10'
                        }`}
                      >
                        {result.result === 'heads' ? '🌞 CARA' : '🦅 CECA'}
                      </motion.span>
                    </div>
                  )}

                  <Suspense fallback={
                    <div className="text-cyan-400 text-xs font-bold flex flex-col items-center gap-2">
                      <span className="spinner scale-75" />
                      Cargando Caldicoin 3D...
                    </div>
                  }>
                    <Canvas camera={{ position: [0, 0, 4.0], fov: 45 }} className="w-full h-full">
                      {/* Ambient and directional lights adapt to result side dynamically */}
                      <ambientLight intensity={result ? 2.5 : 1.8} color={
                        result ? (result.result === 'heads' ? '#22d3ee' : '#c084fc') : '#ffffff'
                      } />
                      <directionalLight 
                        position={[0, 5, 5]} 
                        intensity={result ? 4.5 : 3.5} 
                        color={result ? (result.result === 'heads' ? '#06b6d4' : '#a855f7') : '#ffffff'} 
                        castShadow 
                      />
                      <pointLight position={[-5, 5, -5]} color="#06b6d4" intensity={4} />
                      <pointLight position={[5, -5, 5]} color="#a855f7" intensity={5} />
                      <Coin3D flipping={flipping} result={result} />
                      <Environment preset="sunset" />
                      <OrbitControls enableZoom={false} />
                    </Canvas>
                  </Suspense>
                </div>
              </div>

              {result && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className={`font-display font-black text-4xl mb-2 ${result.win ? 'text-green-400' : 'text-red-400'}`}>
                    {result.win ? '¡GANASTE!' : '¡PERDISTE!'}
                  </p>
                  {result.win && <p className="text-green-400 font-mono font-bold">+{result.payout.toLocaleString()} CALDICOINS</p>}
                </motion.div>
              )}

              {/* History */}
              {history.length > 0 && (
                <div className="flex justify-center gap-2 mt-6 flex-wrap">
                  <span className="text-[10px] text-tiki-muted font-bold uppercase mr-1 flex items-center">Últimas:</span>
                  {history.map((h, i) => (
                    <span key={i} className={`w-8 h-8 rounded-full text-xs font-black flex items-center justify-center ${h.result === 'heads' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : 'bg-violet-500/20 text-violet-400 border border-violet-500/30'}`}>
                      {h.result === 'heads' ? 'C' : 'X'}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="glass rounded-2xl p-5 space-y-5">
              {/* Choice */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setChoice('heads')}
                  disabled={flipping}
                  className={`py-4 rounded-2xl font-display font-bold text-lg transition-all border-2 ${choice === 'heads' ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300 shadow-cyan-glow' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Cara
                </button>
                <button
                  onClick={() => setChoice('tails')}
                  disabled={flipping}
                  className={`py-4 rounded-2xl font-display font-bold text-lg transition-all border-2 ${choice === 'tails' ? 'bg-violet-500/20 border-violet-500/50 text-violet-300 shadow-violet-glow' : 'border-white/10 text-tiki-muted hover:border-white/20'}`}
                >
                  Ceca
                </button>
              </div>

              <div className="flex gap-3 items-center">
                <input type="number" className="input flex-1 font-mono font-bold" value={betAmount} onChange={e => setBetAmount(parseInt(e.target.value) || 0)} min={10} disabled={flipping} />
                <span className="text-xs text-yellow-500 font-semibold">CALDICOINS</span>
              </div>

              <div className="flex gap-2 flex-wrap">
                {[50,100,250,500,1000,5000].map(b => (
                  <button key={b} onClick={() => setBetAmount(b)} disabled={flipping} className="bet-quick-btn">{b >= 1000 ? `${b/1000}K` : b}</button>
                ))}
              </div>

              <button
                onClick={flip}
                disabled={flipping || betAmount < 10 || betAmount > balance}
                className="btn-primary w-full py-4 justify-center text-lg font-black"
              >
                {flipping ? (
                  <span className="flex items-center gap-2"><span className="spinner scale-75" /> Lanzando moneda…</span>
                ) : `Lanzar — ${betAmount.toLocaleString()} CALDICOINS → 2.00×`}
              </button>
            </div>
          </div>

          <div className="h-[580px] lg:col-span-1">
            <RightSidebar roomCode={roomCode} />
          </div>
        </div>
      </main>

      {/* custom reward celebration modal */}
      <AnimatePresence>
        {showReward && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.8, rotate: -3 }}
              animate={{ scale: 1, rotate: 0 }}
              exit={{ scale: 0.8, rotate: 3 }}
              className="glass max-w-md w-full p-8 rounded-3xl border border-yellow-500/30 text-center relative overflow-hidden shadow-[0_0_80px_rgba(251,191,36,0.2)] mx-4"
            >
              {/* Confetti particles */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(24)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="absolute w-2 h-2 rounded-full"
                    style={{
                      left: `${Math.random() * 100}%`,
                      top: `-5%`,
                      backgroundColor: ['#fbbf24', '#22d3ee', '#10b981', '#a78bfa'][i % 4]
                    }}
                    animate={{
                      y: ['0%', '1100%'],
                      x: [`0px`, `${Math.sin(i) * 60}px`],
                      rotate: [0, 360]
                    }}
                    transition={{
                      duration: 2 + Math.random() * 2,
                      repeat: Infinity,
                      delay: Math.random() * 1.5
                    }}
                  />
                ))}
              </div>

              <div className="flex justify-center mb-4">
                <CoinSvg side="heads" size={80} />
              </div>
              <h2 className="font-display font-black text-4xl text-yellow-400 mb-2">
                ¡DUPLICASTE!
              </h2>
              <p className="text-tiki-muted text-xs mb-6">Felicidades, acertaste la moneda.</p>
              
              <div className="bg-white/5 border border-white/10 p-5 rounded-2xl mb-6">
                <span className="text-[10px] text-tiki-muted uppercase font-bold tracking-wider block mb-1">
                  Premio Coinflip
                </span>
                <span className="text-3xl font-mono font-black text-cyan-400 block">
                  +{result?.payout?.toLocaleString()} CALDICOINS
                </span>
              </div>

              <button
                onClick={() => setShowReward(false)}
                className="btn-primary w-full py-3.5 justify-center font-black text-base shadow-[0_0_30px_rgba(251,191,36,0.3)]"
              >
                ¡OTRO LANZAMIENTO! 🔥
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function CoinSvg({ side, size = 100, win }) {
  const isCara = side === 'heads'
  const gradId = `coinGrad-${side}-${Math.floor(Math.random() * 1000000)}`
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" fill="none" className="drop-shadow-[0_0_25px_rgba(251,191,36,0.2)]">
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={isCara ? '#fbbf24' : '#c084fc'}/>
          <stop offset="50%" stopColor={isCara ? '#f59e0b' : '#a855f7'}/>
          <stop offset="100%" stopColor={isCara ? '#d97706' : '#7c3aed'}/>
        </linearGradient>
      </defs>
      
      {/* Outer coin border */}
      <circle cx="50" cy="50" r="46" fill={`url(#${gradId})`} stroke={isCara ? '#fef08a' : '#e9d5ff'} strokeWidth="3" opacity="0.95"/>
      
      {/* Inner dashed ring */}
      <circle cx="50" cy="50" r="38" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="2" strokeDasharray="3, 3"/>
      
      {/* Win/Lose overlay */}
      {win !== undefined && (
        <circle cx="50" cy="50" r="46" fill={win ? 'rgba(16,185,129,0.25)' : 'rgba(239,68,68,0.25)'}/>
      )}
      
      {/* Central icon */}
      <g transform="translate(50, 46)">
        <text textAnchor="middle" fontSize="32" fill="white" style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.4))' }}>
          {isCara ? '🌞' : '🦅'}
        </text>
      </g>
      
      {/* Label */}
      <text x="50" y="80" textAnchor="middle" fontSize="10" fontWeight="900" fill="white" fontFamily="Inter" style={{ letterSpacing: '0.12em', textShadow: '0px 1px 3px rgba(0,0,0,0.6)' }}>
        {isCara ? 'CARA' : 'CECA'}
      </text>
    </svg>
  )
}
