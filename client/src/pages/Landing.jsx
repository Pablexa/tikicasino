import { Suspense, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, OrbitControls, Environment, ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

function SpinningModel({ url }) {
  const { scene } = useGLTF(url)
  const groupRef = useRef()
  const timeRef = useRef(0)

  useEffect(() => {
    if (!scene) return
    const box = new THREE.Box3().setFromObject(scene)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.max(size.x, size.y, size.z)
    scene.scale.setScalar(2.4 / maxDim)
    const box2 = new THREE.Box3().setFromObject(scene)
    const center = new THREE.Vector3()
    box2.getCenter(center)
    scene.position.sub(center)
  }, [scene])

  useFrame((_, delta) => {
    if (!groupRef.current) return
    timeRef.current += delta
    groupRef.current.rotation.y += delta * 0.75
    groupRef.current.position.y = Math.sin(timeRef.current * 1.2) * 0.14
    groupRef.current.rotation.z = Math.sin(timeRef.current * 0.55) * 0.055
  })

  return <group ref={groupRef}><primitive object={scene} /></group>
}

function ModelFallback() {
  const ref = useRef()
  useFrame((_, d) => { if (ref.current) ref.current.rotation.y += d * 1.5 })
  return <mesh ref={ref}><torusGeometry args={[0.5, 0.15, 16, 32]} /><meshStandardMaterial color="#22c55e" wireframe /></mesh>
}

function ModelViewer() {
  return (
    <div className="relative w-full h-full" style={{ cursor: 'grab' }}>
      <div className="absolute inset-0 pointer-events-none" style={{
        background: 'radial-gradient(ellipse 70% 35% at 50% 80%, rgba(34,197,94,0.25) 0%, transparent 70%)',
      }} />
      <Canvas camera={{ position: [0, 0.2, 4.5], fov: 38 }} gl={{ antialias: true, alpha: true }} style={{ background: 'transparent' }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[5, 6, 4]} intensity={1.5} />
        <directionalLight position={[-4, 2, -4]} intensity={0.5} color="#22c55e" />
        <pointLight position={[0, -3, 0]} intensity={0.6} color="#4ade80" />
        <Environment preset="forest" />
        <Suspense fallback={<ModelFallback />}>
          <SpinningModel url="/model.glb" />
        </Suspense>
        <ContactShadows position={[0, -1.5, 0]} opacity={0.4} scale={6} blur={2.5} far={4} color="#22c55e" />
        <OrbitControls enableZoom={false} enablePan={false} enableDamping dampingFactor={0.08} rotateSpeed={0.6} minPolarAngle={Math.PI / 5} maxPolarAngle={Math.PI * 0.75} />
      </Canvas>
      <p className="absolute bottom-2 left-1/2 -translate-x-1/2 text-xs text-tiki-muted pointer-events-none select-none opacity-50">
        arrastrá para rotar
      </p>
    </div>
  )
}

const games = [
  { name: 'Blackjack', desc: 'Superá al dealer en 21', color: 'from-violet-900/60 to-purple-950/60', border: 'border-violet-500/20' },
  { name: 'Ruleta', desc: 'Rueda europea 0–36', color: 'from-emerald-900/60 to-teal-950/60', border: 'border-emerald-500/20' },
  { name: 'Slots', desc: 'Máquina de 5 carretes', color: 'from-yellow-900/60 to-orange-950/60', border: 'border-yellow-500/20' },
  { name: 'Crash', desc: 'Retirá antes del crash', color: 'from-red-900/60 to-rose-950/60', border: 'border-red-500/20' },
  { name: 'Moneda', desc: 'Cara o ceca — 2×', color: 'from-green-900/60 to-teal-950/60', border: 'border-green-500/20' },
  { name: 'Dados', desc: 'Más alto o más bajo', color: 'from-pink-900/60 to-fuchsia-950/60', border: 'border-pink-500/20' },
]

const features = [
  { title: 'Salas privadas', desc: 'Creá una sala, invitá a tus amigos con un código de 6 caracteres y jugá en tiempo real.' },
  { title: 'Chat en vivo', desc: 'Mandá mensajes en cada sala con comandos como /balance y /leaderboard.' },
  { title: 'Bonus diarios', desc: 'Reclamá CALDICOINS todos los días. Los rachas llegan hasta 10.000 al día 7.' },
  { title: 'Gratis para siempre', desc: 'Sin compras, sin depósitos. Solo diversión con CALDICOINS.' },
]

const c = { hidden: {}, visible: { transition: { staggerChildren: 0.07 } } }
const i = { hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0, transition: { duration: 0.45 } } }

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <nav className="flex items-center justify-between px-6 py-4 max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5">
          <motion.img src="/icon.png" alt="TikiCasino" className="w-10 h-10 rounded-xl object-cover"
            animate={{ rotate: [0, 6, -6, 0] }} transition={{ duration: 5, repeat: Infinity }} />
          <span className="font-display font-bold text-2xl gradient-text">TikiCasino</span>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/fairness" className="text-sm text-tiki-muted hover:text-tiki-text transition-colors hidden sm:block">Fairness</Link>
          <Link to="/login" className="btn-ghost text-sm py-2 px-4">Entrar</Link>
          <Link to="/register" className="btn-primary text-sm py-2 px-4">Registrarse</Link>
        </div>
      </nav>

      <main className="flex-1">
        <section className="max-w-7xl mx-auto px-6 pt-8 pb-20">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.65 }}>
              <div className="inline-flex items-center gap-2 badge-green mb-6">
                <span className="w-1.5 h-1.5 rounded-full bg-tiki-green animate-pulse" />
                Arcade multijugador privado
              </div>

              <h1 className="font-display font-black leading-none mb-6" style={{ fontSize: 'clamp(2.5rem, 7vw, 5.5rem)' }}>
                <span className="gradient-text">QUIERO QUEQUE</span>
                <br />
                <span style={{ color: '#f0fdf4' }}>67 MANGO TOILET</span>
              </h1>

              <p className="font-display font-black text-2xl sm:text-3xl mb-3 neon-green">
                JUGA CON LAS CALDICOINS
              </p>
              <p className="text-tiki-muted text-base max-w-xl mb-10 leading-relaxed font-semibold uppercase tracking-wide">
                TIKI TIKI CASINO — TIMBA A MAS NO PODER
              </p>

              <div className="flex flex-col sm:flex-row items-start gap-4">
                <Link to="/register" className="btn-primary text-base py-4 px-8">Crear cuenta gratis</Link>
                <Link to="/login" className="btn-ghost text-base py-4 px-8">Ya tengo cuenta</Link>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.8, delay: 0.2 }}
              className="relative h-[480px] lg:h-[560px]">
              <ModelViewer />
            </motion.div>
          </div>

          <motion.div variants={c} initial="hidden" animate="visible" className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mt-16">
            {games.map((g) => (
              <motion.div key={g.name} variants={i} whileHover={{ y: -6, scale: 1.03 }}
                className={`game-card bg-gradient-to-br ${g.color} border ${g.border} p-4 text-center`}>
                <h3 className="font-display font-bold text-sm" style={{ color: '#f0fdf4' }}>{g.name}</h3>
                <p className="text-xs text-tiki-muted mt-1">{g.desc}</p>
              </motion.div>
            ))}
          </motion.div>
        </section>

        <section className="py-20 px-6 border-t border-tiki-border">
          <div className="max-w-5xl mx-auto">
            <motion.h2 initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
              className="font-display font-bold text-3xl sm:text-4xl text-center gradient-text mb-12">
              Todo para armar una noche de casino
            </motion.h2>
            <div className="grid sm:grid-cols-2 gap-5">
              {features.map((f, idx) => (
                <motion.div key={f.title} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }} transition={{ delay: idx * 0.1 }} className="glass rounded-2xl p-6">
                  <h3 className="font-display font-bold text-lg mb-2" style={{ color: '#f0fdf4' }}>{f.title}</h3>
                  <p className="text-tiki-muted text-sm leading-relaxed">{f.desc}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 text-center">
          <motion.div initial={{ opacity: 0, scale: 0.95 }} whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }} className="max-w-2xl mx-auto glass rounded-3xl p-10">
            <h2 className="font-display font-black text-3xl gradient-text mb-4">Empezá a jugar en 30 segundos</h2>
            <p className="text-tiki-muted mb-8">
              Registrate gratis y recibís <strong style={{ color: '#fbbf24' }}>10.000 CALDICOINS</strong> al instante.
            </p>
            <Link to="/register" className="btn-primary text-base py-4 px-10">Crear cuenta — es gratis</Link>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-tiki-border py-8 px-6 text-center">
        <div className="flex items-center justify-center gap-6">
          <Link to="/fairness" className="text-xs text-tiki-muted hover:text-tiki-text transition-colors">Fairness</Link>
          <span className="text-tiki-muted text-xs">© 2025 TikiCasino</span>
        </div>
      </footer>
    </div>
  )
}
