import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSocket } from '../hooks/useSocket.jsx'
import Navbar from '../components/Navbar.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import PlayerCard from '../components/PlayerCard.jsx'
import { IconCopy, IconSettings, IconUsers } from '../components/Icons.jsx'
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
      <circle cx="12" cy="12" r="10" stroke="#a855f7" strokeWidth="2" />
      <path d="M9 9 C9 7, 15 7, 15 9 C15 11, 12 11, 12 13" stroke="#c084fc" strokeWidth="2" strokeLinecap="round" />
      <circle cx="12" cy="17" r="1" fill="#c084fc" />
    </svg>
  ),
  shooter: (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]">
      <circle cx="12" cy="12" r="8" stroke="#06b6d4" strokeWidth="2" />
      <circle cx="12" cy="12" r="3" fill="#22d3ee" />
      <path d="M12 2 L12 6 M12 18 L12 22 M2 12 L6 12 M18 12 L22 12" stroke="#22d3ee" strokeWidth="2" />
    </svg>
  )
};

const GAMES = [
  { id: 'blackjack', name: 'Blackjack', desc: 'Superá al dealer', color: 'from-violet-600/20 to-purple-700/20', border: 'border-violet-500/20' },
  { id: 'roulette', name: 'Ruleta', desc: 'Girá la ruleta', color: 'from-emerald-600/20 to-teal-700/20', border: 'border-emerald-500/20' },
  { id: 'slots', name: 'Slots', desc: 'Máquina de 5 rodillos', color: 'from-yellow-600/20 to-orange-700/20', border: 'border-yellow-500/20' },
  { id: 'crash', name: 'Crash', desc: 'Retirá a tiempo', color: 'from-red-600/20 to-rose-700/20', border: 'border-red-500/20' },
  { id: 'coinflip', name: 'Moneda', desc: 'Cara o ceca', color: 'from-cyan-600/20 to-sky-700/20', border: 'border-cyan-500/20' },
  { id: 'dice', name: 'Dados', desc: 'Más alto o más bajo', color: 'from-pink-600/20 to-fuchsia-700/20', border: 'border-pink-500/20' },
  { id: 'poker', name: 'Video Poker', desc: 'Jacks or Better', color: 'from-indigo-600/20 to-blue-700/20', border: 'border-indigo-500/20' },
  { id: 'liarsbar', name: "Liar's Bar", desc: '2-15 jugadores · ¡Mentira!', color: 'from-orange-600/20 to-amber-700/20', border: 'border-orange-500/20', multiplayer: true },
  { id: 'chess', name: 'Ajedrez', desc: 'Duelo mental por CALDICOINS', color: 'from-amber-600/20 to-yellow-800/20', border: 'border-amber-500/20', multiplayer: true },
  { id: 'trivia', name: 'Preguntados VIP', desc: 'Multijugador estilo Kahoot (Apuesta 1000 C)', color: 'from-purple-600/20 to-indigo-700/20', border: 'border-purple-500/20', multiplayer: true },
  { id: 'shooter', name: 'Shooter 2D Arena', desc: 'Acción multijugador arena (Apuesta 500 C)', color: 'from-cyan-600/20 to-blue-700/20', border: 'border-cyan-500/20', multiplayer: true }
];

export default function Room() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    loadRoom()
  }, [roomCode])

  useEffect(() => {
    if (!socket || !room) return

    socket.emit('room:join', { roomCode })

    socket.on('room:state', ({ room: r, chatHistory, onlineUsers: ou }) => {
      setRoom(r)
      setOnlineUsers(new Set(ou))
    })

    socket.on('room:memberJoined', ({ userId, nickname, avatar, balance }) => {
      setOnlineUsers(prev => new Set([...prev, userId]))
      setRoom(prev => {
        if (!prev) return prev
        const exists = prev.members.find(m => m.userId === userId)
        if (exists) return prev
        return { ...prev, members: [...prev.members, { userId, user: { nickname, avatar: avatar || 'tiki1', balance }, role: 'member' }] }
      })
    })

    socket.on('room:memberLeft', ({ userId }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s })
    })

    socket.on('room:kicked', ({ userId }) => {
      if (userId === user?.id) {
        toast.error('Fuiste removido de esta sala.')
        navigate('/lobby')
      }
    })

    socket.on('room:deleted', () => {
      toast.error('Esta sala fue eliminada por inactividad o desconexión.')
      navigate('/lobby')
    })

    socket.on('room:balanceUpdate', ({ userId, balance }) => {
      setRoom(prev => {
        if (!prev) return prev
        return {
          ...prev,
          members: prev.members.map(m =>
            m.userId === userId
              ? { ...m, user: { ...m.user, balance } }
              : m
          )
        }
      })
    })

    socket.on('balance:update', ({ balance }) => {
      // Saldo updates handled by Navbar via auth context
    })

    return () => {
      const currentPath = window.location.pathname.toLowerCase();
      const targetPrefix = `/room/${roomCode}`.toLowerCase();
      const isSubRoute = currentPath.startsWith(targetPrefix);
      if (!isSubRoute) {
        socket.emit('room:leave', { roomCode })
      }
      socket.off('room:state')
      socket.off('room:memberJoined')
      socket.off('room:memberLeft')
      socket.off('room:kicked')
      socket.off('room:deleted')
      socket.off('room:balanceUpdate')
      socket.off('balance:update')
    }
  }, [socket, room?.id])

  const loadRoom = async () => {
    try {
      const { data } = await api.get(`/rooms/${roomCode}`)
      setRoom(data.room)
    } catch (err) {
      toast.error('Room not found or access denied')
      navigate('/lobby')
    } finally {
      setLoading(false)
    }
  }

  const copyCode = () => {
    navigator.clipboard.writeText(roomCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    toast.success('¡Código copiado!')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('¡Link de invitación copiado!')
  }

  const kickMember = async (userId) => {
    try {
      if (socket) {
        socket.emit('room:kick', { roomCode, targetUserId: userId })
      }
      await api.post(`/rooms/${roomCode}/kick`, { userId })
      toast.success('Jugador removido')
    } catch (err) {
      toast.error(err.response?.data?.error || 'No se puede remover al jugador')
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  )
  if (!room) return null

  const isOwner = room.ownerId === user?.id
  const sortedMembers = [...(room.members || [])].sort((a, b) =>
    (b.user?.balance || 0) - (a.user?.balance || 0)
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        {/* Room header */}
        <div className="glass rounded-2xl p-5 mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display font-bold text-2xl text-tiki-text">{room.name}</h1>
                {isOwner && <span className="badge-gold text-xs">Host</span>}
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono font-bold text-lg gradient-text tracking-widest">{roomCode}</span>
                <button onClick={copyCode} className="p-1.5 rounded-lg hover:bg-white/10 text-tiki-muted hover:text-cyan-400 transition-all">
                  {copied
                    ? <svg width="16" height="16" viewBox="0 0 24 24" fill="none"><polyline points="20 6 9 17 4 12" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    : <IconCopy size={16} />
                  }

                </button>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="badge-cyan">
                <IconUsers size={12} />
                {room.members?.length || 0} jugadores
              </span>
              <button onClick={copyLink} className="btn-ghost text-sm py-2 px-3">
                Invitar
              </button>
              <Link to="/lobby" className="btn-ghost text-sm py-2 px-3">
                Salir
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Games */}
            <div>
              <h2 className="font-display font-bold text-lg text-tiki-text mb-4">Elegí un juego</h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {GAMES.map(game => (
                  <motion.div
                    key={game.id}
                    whileHover={{ y: -3, scale: 1.02 }}
                    className={`game-card bg-gradient-to-br ${game.color} border ${game.border} p-4 cursor-pointer`}
                    onClick={() => navigate(`/room/${roomCode}/${game.id}`)}
                  >
                    <div className="mb-2">{GAME_ICONS[game.id]}</div>
                    <h3 className="font-display font-bold text-tiki-text text-sm">{game.name}</h3>
                    <p className="text-xs text-tiki-muted mt-0.5">{game.desc}</p>
                    {game.multiplayer && (
                      <span className="badge-violet text-xs mt-2 inline-block">Multijugador</span>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 h-[600px]">
            {/* Jugadores */}
            <div className="glass rounded-2xl p-4 flex-shrink-0">
              <h3 className="font-semibold text-sm text-tiki-text mb-3 flex items-center gap-2">
                <IconUsers size={16} className="text-cyan-400" />
                Jugadores ({room.members?.length || 0})
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {sortedMembers.map((m) => (
                  <div key={m.userId} className="group relative">
                    <PlayerCard
                      user={m.user}
                      isYou={m.userId === user?.id}
                      role={m.role}
                    />
                    {isOwner && m.userId !== user?.id && (
                      <button
                        onClick={() => kickMember(m.userId)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 hidden group-hover:flex px-2 py-1 rounded-lg text-xs text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        Kick
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Chat */}
            <div className="flex-1 min-h-0">
              <ChatPanel roomCode={roomCode} roomId={room?.id} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
