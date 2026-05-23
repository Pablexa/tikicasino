import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import Navbar from '../components/Navbar.jsx'
import BalanceBadge from '../components/BalanceBadge.jsx'
import Modal from '../components/Modal.jsx'
import { IconPlus, IconKey, IconGift, IconZap, IconTrophy } from '../components/Icons.jsx'
import api from '../lib/api.js'
import toast from 'react-hot-toast'

const GAME_ICONS = {
  blackjack: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(139,92,246,0.5)]">
      <rect x="3" y="5" width="11" height="15" rx="2" fill="#1e1b4b" stroke="#8b5cf6" strokeWidth="1.5" transform="rotate(-10 3 5)" />
      <rect x="8" y="3" width="11" height="15" rx="2" fill="#fff" stroke="#a78bfa" strokeWidth="1.5" />
      <text x="10.5" y="9" fontSize="6" fontWeight="bold" fill="#ef4444" fontFamily="sans-serif">A</text>
      <path d="M13.5 10.5 L12.5 12 L14.5 12 Z" fill="#ef4444" />
      <circle cx="13.5" cy="13.5" r="1.5" fill="#ef4444" />
    </svg>
  ),
  roulette: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]">
      <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="2" fill="#064e3b" />
      <circle cx="12" cy="12" r="7" stroke="#34d399" strokeWidth="1.5" strokeDasharray="4 2" />
      <circle cx="12" cy="12" r="3" fill="#059669" />
      <path d="M12 2 L12 22 M2 12 L22 12" stroke="#34d399" strokeWidth="1" opacity="0.4" />
      <circle cx="12" cy="7" r="1.2" fill="#fff" />
    </svg>
  ),
  slots: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]">
      <rect x="4" y="4" width="14" height="16" rx="2" fill="#1e293b" stroke="#f59e0b" strokeWidth="2" />
      <rect x="6" y="7" width="10" height="6" rx="1" fill="#0f172a" stroke="#d97706" strokeWidth="1" />
      <text x="11" y="12" fontSize="5" fontWeight="black" fill="#fbbf24" letterSpacing="1" textAnchor="middle" fontFamily="monospace">7 7 7</text>
      <path d="M18 14 L21 11" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" />
      <circle cx="21" cy="10" r="2" fill="#ef4444" />
    </svg>
  ),
  crash: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(239,68,68,0.5)]">
      <path d="M6 18 Q12 18 18 12 T20 4" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" />
      <path d="M16 4 L20 4 L20 8" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      <g transform="translate(14, 4) rotate(-45)">
        <path d="M0 -6 L3 0 L-3 0 Z" fill="#ef4444" />
        <rect x="-2" y="0" width="4" height="6" fill="#f87171" />
        <path d="M-2 6 L0 9 L2 6 Z" fill="#f59e0b" />
      </g>
    </svg>
  ),
  coinflip: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
      <circle cx="12" cy="12" r="10" fill="#0e7490" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="12" cy="12" r="7" fill="rgba(6,182,212,0.15)" stroke="#22d3ee" strokeWidth="1" strokeDasharray="3 1" />
      <text x="12" y="15" textAnchor="middle" fontSize="9" fontWeight="900" fill="#22d3ee" fontFamily="monospace">C</text>
    </svg>
  ),
  dice: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(236,72,153,0.5)]">
      <rect x="3" y="7" width="11" height="11" rx="2" fill="#db2777" stroke="#f472b6" strokeWidth="1.5" transform="rotate(-8 3 7)" />
      <circle cx="6" cy="10" r="1" fill="#fff" />
      <circle cx="11" cy="15" r="1" fill="#fff" />
      <rect x="10" y="5" width="11" height="11" rx="2" fill="#be185d" stroke="#f472b6" strokeWidth="1.5" />
      <circle cx="12.5" cy="7.5" r="1" fill="#fff" />
      <circle cx="15.5" cy="10.5" r="1" fill="#fff" />
      <circle cx="18.5" cy="13.5" r="1" fill="#fff" />
    </svg>
  ),
  poker: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(79,70,229,0.5)]">
      <rect x="5" y="3" width="14" height="18" rx="2" fill="#312e81" stroke="#4f46e5" strokeWidth="2" />
      <path d="M12 7 L14 11 L12 15 L10 11 Z" fill="#818cf8" />
      <circle cx="12" cy="11" r="2.5" fill="#4f46e5" />
      <path d="M12 14 L12 17" stroke="#4f46e5" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
  liarsbar: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]">
      <path d="M4 14 Q4 6 11 8 Q11 15 4 14 Z" fill="#ea580c" stroke="#fb923c" strokeWidth="1.5" />
      <circle cx="7" cy="10" r="0.8" fill="#fff" />
      <path d="M20 14 Q20 6 13 8 Q13 15 20 14 Z" fill="#c2410c" stroke="#fb923c" strokeWidth="1.5" />
      <circle cx="17" cy="10" r="0.8" fill="#fff" />
    </svg>
  ),
  chess: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]">
      <path d="M5 20H19V18H5V20ZM7 16H17V14H7V16ZM12 5V2M10.5 3.5H13.5" stroke="#fbbf24" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 5C10 7.5 7.5 8.5 7.5 12H16.5C16.5 8.5 14 7.5 12 5Z" fill="#451a03" stroke="#fbbf24" strokeWidth="1.5" />
      <circle cx="12" cy="8.5" r="1" fill="#fbbf24" />
    </svg>
  ),
  trivia: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(168,85,247,0.5)]">
      <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="#a855f7" strokeWidth="2" />
      <path d="M9.09 9C9.3251 8.24248 9.82222 7.60193 10.4903 7.19524C11.1584 6.78855 11.9548 6.64237 12.721 6.78281C13.4872 6.92325 14.1688 7.34024 14.6402 7.95759C15.1116 8.57493 15.3401 9.34861 15.28 10.12C15.28 11.75 12.8 12.63 12.8 13.5" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12.8" cy="17.5" r="1" fill="#c084fc" />
    </svg>
  ),
  shooter: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
      <circle cx="12" cy="12" r="8" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="#22d3ee" />
      <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" stroke="#22d3ee" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const GAMES = [
  { id: 'blackjack', name: 'Blackjack', desc: 'Superá al dealer', color: 'from-violet-900/50 to-purple-950/50', border: 'border-violet-500/20' },
  { id: 'roulette', name: 'Ruleta', desc: 'Rueda europea', color: 'from-emerald-900/50 to-teal-950/50', border: 'border-emerald-500/20' },
  { id: 'slots', name: 'Slots', desc: '5 carretes', color: 'from-yellow-900/50 to-orange-950/50', border: 'border-yellow-500/20' },
  { id: 'crash', name: 'Crash', desc: 'Retirá antes del crash', color: 'from-red-900/50 to-rose-950/50', border: 'border-red-500/20' },
  { id: 'coinflip', name: 'Moneda', desc: 'Cara o ceca', color: 'from-green-900/50 to-teal-950/50', border: 'border-green-500/20' },
  { id: 'dice', name: 'Dados', desc: 'Más alto o más bajo', color: 'from-pink-900/50 to-fuchsia-950/50', border: 'border-pink-500/20' },
  { id: 'poker', name: 'Video Poker', desc: 'Jacks or Better', color: 'from-indigo-900/50 to-blue-950/50', border: 'border-indigo-500/20' },
  { id: 'liarsbar', name: "Liar's Bar", desc: '2-15 jugadores', color: 'from-orange-900/50 to-amber-950/50', border: 'border-orange-500/20', multiplayer: true },
  { id: 'chess', name: 'Ajedrez', desc: 'Duelo mental por CALDICOINS', color: 'from-amber-900/50 to-yellow-950/50', border: 'border-amber-500/20', multiplayer: true },
  { id: 'trivia', name: 'Preguntados VIP', desc: 'Lucha Kahoot por 1000 Caldicoins', color: 'from-purple-900/50 to-indigo-950/50', border: 'border-purple-500/20', multiplayer: true },
  { id: 'shooter', name: 'Shooter 2D Arena', desc: 'Acción arena por 500 Caldicoins', color: 'from-cyan-900/50 to-blue-950/50', border: 'border-cyan-500/20', multiplayer: true }
]

function formatTimeLeft(date) {
  const ms = new Date(date).getTime() - Date.now()
  if (ms <= 0) return '¡Listo!'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  const s = Math.floor((ms % 60000) / 1000)
  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

export default function Lobby() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [roomName, setRoomName] = useState('')
  const [customCode, setCustomCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [activeRooms, setActiveRooms] = useState([])
  const [bonusCooldown, setBonusCooldown] = useState(null)
  const [refillCooldown, setRefillCooldown] = useState(null)

  useEffect(() => {
    api.get('/leaderboard/global').then(r => setLeaderboard(r.data.leaderboard?.slice(0, 5) || [])).catch(() => {})
    checkCooldowns()
    fetchActiveRooms()

    const roomsTimer = setInterval(fetchActiveRooms, 5000)
    return () => clearInterval(roomsTimer)
  }, [])

  const fetchActiveRooms = async () => {
    try {
      const { data } = await api.get('/rooms/active')
      setActiveRooms(data.rooms || [])
    } catch {}
  }

  const checkCooldowns = async () => {
    try {
      const { data } = await api.get('/auth/me')
      const u = data.user
      if (u.dailyBonusLastClaimedAt) {
        const next = new Date(u.dailyBonusLastClaimedAt).getTime() + 24*60*60*1000
        if (Date.now() < next) setBonusCooldown(new Date(next))
      }
      if (u.emergencyRefillLastClaimedAt) {
        const next = new Date(u.emergencyRefillLastClaimedAt).getTime() + 30*60*1000
        if (Date.now() < next) setRefillCooldown(new Date(next))
      }
    } catch {}
  }

  const createRoom = async () => {
    if (!roomName.trim()) { toast.error('Poné un nombre a la sala'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/rooms/create', { 
        name: roomName.trim(), 
        customCode: customCode.trim() 
      })
      toast.success(`Sala ${data.room.code} creada`)
      navigate(`/room/${data.room.code}`)
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear sala') }
    finally { setLoading(false) }
  }

  const joinRoom = async (code = null) => {
    const targetCode = code || joinCode
    if (!targetCode.trim()) { toast.error('Ingresá el código'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/rooms/join', { code: targetCode.trim().toUpperCase() })
      navigate(`/room/${data.room.code}`)
    } catch (err) { toast.error(err.response?.data?.error || 'Sala no encontrada') }
    finally { setLoading(false) }
  }

  const claimDaily = async () => {
    try {
      const { data } = await api.post('/bonuses/daily')
      toast.success(data.message)
      setBonusCooldown(new Date(data.nextClaimAt))
      refreshUser()
    } catch (err) { toast.error(err.response?.data?.error || 'No se puede reclamar todavía') }
  }

  const claimRefill = async () => {
    try {
      const { data } = await api.post('/bonuses/emergency-refill')
      toast.success(data.message)
      setRefillCooldown(new Date(data.nextClaimAt))
      refreshUser()
    } catch (err) { toast.error(err.response?.data?.error || 'No se puede reclamar todavía') }
  }

  const canRefill = user?.balance < 500 && !refillCooldown

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl gradient-text bg-gradient-to-r from-teal-400 to-indigo-400">Lobby Principal</h1>
            <p className="text-tiki-muted text-sm mt-1">Hola de nuevo, <span className="text-tiki-text font-semibold">{user?.nickname}</span></p>
          </div>
          <BalanceBadge balance={user?.balance} size="lg" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            
            {/* Quick buttons */}
            <div className="grid sm:grid-cols-2 gap-4">
              <button onClick={() => setShowCreate(true)} className="btn-primary py-4 text-base justify-center gap-3 w-full shadow-[0_0_15px_rgba(20,184,166,0.2)]">
                <IconPlus size={20} />Crear sala
              </button>
              <button onClick={() => setShowJoin(true)} className="btn-ghost py-4 text-base justify-center gap-3 w-full border-white/5">
                <IconKey size={20} />Unirse con código
              </button>
            </div>

            {/* Bonuses claim card */}
            <div className="glass rounded-2xl p-4 flex flex-wrap gap-3">
              <button onClick={claimDaily} disabled={!!bonusCooldown}
                className={`flex-1 flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm transition-all ${
                  !bonusCooldown
                    ? 'text-tiki-green border border-tiki-green/30 hover:bg-tiki-green/5'
                    : 'opacity-40 border border-tiki-border text-tiki-muted'
                }`} style={!bonusCooldown ? { background: 'rgba(34,197,94,0.08)' } : { background: 'rgba(255,255,255,0.03)' }}>
                <IconGift size={18} />
                <span>{bonusCooldown ? `Bonus diario: ${formatTimeLeft(bonusCooldown)}` : 'Reclamar bonus diario'}</span>
              </button>

              {canRefill && (
                <button onClick={claimRefill} className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-red-400 border border-red-500/30 hover:bg-red-500/5 transition-all"
                  style={{ background: 'rgba(239,68,68,0.08)' }}>
                  <IconZap size={18} />Recarga de emergencia
                </button>
              )}
            </div>

            {/* ACTIVE ROOMS LIST */}
            <div className="glass rounded-2xl p-6 border border-white/5">
              <h2 className="font-display font-bold text-lg text-white mb-4 flex items-center gap-2">
                <span className="animate-pulse w-2.5 h-2.5 rounded-full bg-emerald-400 block" />
                Salas Activas en TikiCasino
              </h2>
              {activeRooms.length === 0 ? (
                <p className="text-tiki-muted text-sm text-center py-6 bg-black/10 rounded-xl border border-dashed border-white/5">No hay salas creadas en este momento. ¡Sé el primero creando una!</p>
              ) : (
                <div className="grid sm:grid-cols-2 gap-3">
                  {activeRooms.map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-4 rounded-xl bg-black/40 border border-white/5 hover:border-teal-500/30 transition-all">
                      <div>
                        <h4 className="font-bold text-sm text-white">{room.name}</h4>
                        <span className="font-mono text-xs font-black text-teal-400">{room.code}</span>
                        <div className="flex gap-2 mt-1">
                          <span className="text-[10px] text-tiki-muted">Host: {room.owner?.nickname}</span>
                          <span className="text-[10px] text-teal-400 font-bold">• {room.members?.length} jugadores</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => joinRoom(room.code)}
                        className="btn-primary py-1.5 px-3 text-xs justify-center"
                      >
                        Unirse
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Games Showcase */}
            <div>
              <h2 className="font-display font-bold text-lg text-tiki-text mb-4">Juegos</h2>
              <p className="text-xs text-tiki-muted mb-4">Creá o unite a una sala primero para empezar a jugar.</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
                {GAMES.map((game) => (
                  <motion.div key={game.id} whileHover={{ y: -4 }}
                    className={`game-card bg-gradient-to-br ${game.color} border ${game.border} p-4`}>
                    <div className="mb-2">{GAME_ICONS[game.id]}</div>
                    <h3 className="font-display font-bold text-tiki-text text-sm">{game.name}</h3>
                    <p className="text-xs text-tiki-muted mt-0.5">{game.desc}</p>
                    {game.multiplayer
                      ? <span className="badge-violet text-xs mt-2 inline-block">Multijugador</span>
                      : <p className="text-xs text-tiki-green mt-2">Disponible en salas</p>
                    }
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar: Leaderboard */}
          <div className="space-y-6">
            <div className="glass rounded-2xl p-5 border border-white/5">
              <h2 className="font-display font-bold text-lg text-tiki-text mb-4 flex items-center gap-2">
                <IconTrophy size={18} className="text-yellow-400 animate-bounce" />
                Top jugadores
              </h2>
              {leaderboard.length === 0 ? (
                <p className="text-tiki-muted text-sm text-center py-4">Nadie todavía</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0">
                      <span className={`text-sm font-bold w-6 text-center ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-tiki-muted'}`}>{i+1}</span>
                      <span className="flex-1 text-sm font-medium text-tiki-text truncate">{p.nickname}</span>
                      <span className="text-xs font-mono text-yellow-400">{p.balance?.toLocaleString()} C</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Create Room Modal with Custom Code */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear sala">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Nombre de la sala</label>
            <input className="input" placeholder="La sala del crak" value={roomName} onChange={e => setRoomName(e.target.value)} maxLength={30} />
          </div>
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Código Personalizado (Opcional - 3 a 6 letras/números)</label>
            <input className="input font-mono tracking-widest text-center uppercase" placeholder="ABC123" value={customCode} onChange={e => setCustomCode(e.target.value.toUpperCase().slice(0, 6))} maxLength={6} />
          </div>
          <button onClick={createRoom} disabled={loading || !roomName.trim()} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="spinner scale-75" /> : 'Crear sala'}
          </button>
        </div>
      </Modal>

      {/* Join Room Modal */}
      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Unirse a sala">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Código de sala</label>
            <input className="input font-mono tracking-widest text-lg text-center uppercase" placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && joinRoom()} maxLength={6} />
          </div>
          <button onClick={() => joinRoom()} disabled={loading || joinCode.length < 3} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="spinner scale-75" /> : 'Unirse'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
