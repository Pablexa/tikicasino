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

const GAMES = [
  { id: 'blackjack', name: 'Blackjack', desc: 'Superá al dealer', color: 'from-violet-900/50 to-purple-950/50', border: 'border-violet-500/20' },
  { id: 'roulette', name: 'Ruleta', desc: 'Rueda europea', color: 'from-emerald-900/50 to-teal-950/50', border: 'border-emerald-500/20' },
  { id: 'slots', name: 'Slots', desc: '5 carretes', color: 'from-yellow-900/50 to-orange-950/50', border: 'border-yellow-500/20' },
  { id: 'crash', name: 'Crash', desc: 'Retirá antes del crash', color: 'from-red-900/50 to-rose-950/50', border: 'border-red-500/20' },
  { id: 'coinflip', name: 'Moneda', desc: 'Cara o ceca', color: 'from-green-900/50 to-teal-950/50', border: 'border-green-500/20' },
  { id: 'dice', name: 'Dados', desc: 'Más alto o más bajo', color: 'from-pink-900/50 to-fuchsia-950/50', border: 'border-pink-500/20' },
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
  const [joinCode, setJoinCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [leaderboard, setLeaderboard] = useState([])
  const [bonusCooldown, setBonusCooldown] = useState(null)
  const [refillCooldown, setRefillCooldown] = useState(null)

  useEffect(() => {
    api.get('/leaderboard/global').then(r => setLeaderboard(r.data.leaderboard?.slice(0, 5) || [])).catch(() => {})
    checkCooldowns()
  }, [])

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
      const { data } = await api.post('/rooms/create', { name: roomName.trim() })
      toast.success(`Sala ${data.room.code} creada`)
      navigate(`/room/${data.room.code}`)
    } catch (err) { toast.error(err.response?.data?.error || 'Error al crear sala') }
    finally { setLoading(false) }
  }

  const joinRoom = async () => {
    if (!joinCode.trim()) { toast.error('Ingresá el código'); return }
    setLoading(true)
    try {
      const { data } = await api.post('/rooms/join', { code: joinCode.trim().toUpperCase() })
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
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display font-bold text-3xl gradient-text">Lobby</h1>
            <p className="text-tiki-muted text-sm mt-1">Hola de nuevo, <span className="text-tiki-text font-semibold">{user?.nickname}</span></p>
          </div>
          <BalanceBadge balance={user?.balance} size="lg" />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="grid sm:grid-cols-2 gap-4">
              <button onClick={() => setShowCreate(true)} className="btn-primary py-4 text-base justify-center gap-3 w-full">
                <IconPlus size={20} />Crear sala
              </button>
              <button onClick={() => setShowJoin(true)} className="btn-ghost py-4 text-base justify-center gap-3 w-full">
                <IconKey size={20} />Unirse con código
              </button>
            </div>

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

            <div>
              <h2 className="font-display font-bold text-lg text-tiki-text mb-4">Juegos</h2>
              <p className="text-xs text-tiki-muted mb-4">Creá o unite a una sala primero para empezar a jugar.</p>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {GAMES.map((game) => (
                  <motion.div key={game.id} whileHover={{ y: -4 }}
                    className={`game-card bg-gradient-to-br ${game.color} border ${game.border} p-5`}>
                    <h3 className="font-display font-bold text-tiki-text">{game.name}</h3>
                    <p className="text-xs text-tiki-muted mt-1">{game.desc}</p>
                    <p className="text-xs text-tiki-green mt-3">Disponible en salas</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass rounded-2xl p-5">
              <h2 className="font-display font-bold text-lg text-tiki-text mb-4 flex items-center gap-2">
                <IconTrophy size={18} className="text-yellow-400" />
                Top jugadores
              </h2>
              {leaderboard.length === 0 ? (
                <p className="text-tiki-muted text-sm text-center py-4">Nadie todavía</p>
              ) : (
                <div className="space-y-2">
                  {leaderboard.map((p, i) => (
                    <div key={p.id} className="flex items-center gap-3 py-2">
                      <span className={`text-sm font-bold w-6 text-center ${i===0?'text-yellow-400':i===1?'text-gray-300':i===2?'text-amber-600':'text-tiki-muted'}`}>{i+1}</span>
                      <span className="flex-1 text-sm font-medium text-tiki-text truncate">{p.nickname}</span>
                      <span className="text-xs font-mono text-yellow-400">{p.balance?.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Crear sala">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Nombre de la sala</label>
            <input className="input" placeholder="La sala del crak" value={roomName} onChange={e => setRoomName(e.target.value)} onKeyDown={e => e.key === 'Enter' && createRoom()} maxLength={30} />
          </div>
          <button onClick={createRoom} disabled={loading || !roomName.trim()} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="spinner scale-75" /> : 'Crear sala'}
          </button>
        </div>
      </Modal>

      <Modal open={showJoin} onClose={() => setShowJoin(false)} title="Unirse a sala">
        <div className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Código de sala</label>
            <input className="input font-mono tracking-widest text-lg text-center uppercase" placeholder="ABC123" value={joinCode} onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={e => e.key === 'Enter' && joinRoom()} maxLength={6} />
          </div>
          <button onClick={joinRoom} disabled={loading || joinCode.length !== 6} className="btn-primary w-full justify-center py-3">
            {loading ? <span className="spinner scale-75" /> : 'Unirse'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
