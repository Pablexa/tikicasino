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

const GAMES = [
  { id: 'blackjack', name: 'Blackjack', desc: 'Superá al dealer', color: 'from-violet-600/20 to-purple-700/20', border: 'border-violet-500/20', emoji: '🃏' },
  { id: 'roulette', name: 'Ruleta', desc: 'Girá la ruleta', color: 'from-emerald-600/20 to-teal-700/20', border: 'border-emerald-500/20', emoji: '🎰' },
  { id: 'slots', name: 'Slots', desc: 'Máquina de 5 rodillos', color: 'from-yellow-600/20 to-orange-700/20', border: 'border-yellow-500/20', emoji: '🎳' },
  { id: 'crash', name: 'Crash', desc: 'Retirá a tiempo', color: 'from-red-600/20 to-rose-700/20', border: 'border-red-500/20', emoji: '🚀' },
  { id: 'coinflip', name: 'Moneda', desc: 'Cara o ceca', color: 'from-cyan-600/20 to-sky-700/20', border: 'border-cyan-500/20', emoji: '🪙' },
  { id: 'dice', name: 'Dados', desc: 'Más alto o más bajo', color: 'from-pink-600/20 to-fuchsia-700/20', border: 'border-pink-500/20', emoji: '🎲' },
  { id: 'poker', name: 'Video Poker', desc: 'Jacks or Better', color: 'from-indigo-600/20 to-blue-700/20', border: 'border-indigo-500/20', emoji: '♠️' },
  { id: 'liarsbar', name: "Liar's Bar", desc: '2-15 jugadores · ¡Mentira!', color: 'from-orange-600/20 to-amber-700/20', border: 'border-orange-500/20', emoji: '🎭', multiplayer: true },
]

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
      socket.emit('room:leave', { roomCode })
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
                    <div className="text-2xl mb-2">{game.emoji}</div>
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
