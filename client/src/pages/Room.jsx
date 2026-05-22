import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { useSocket } from '../hooks/useSocket.jsx'
import Navbar from '../components/Navbar.jsx'
import ChatPanel from '../components/ChatPanel.jsx'
import PlayerCard from '../components/PlayerCard.jsx'
import { IconCopy, IconConfiguración, IconUsers } from '../components/Icons.jsx'
import api from '../lib/api.js'
import toast from 'react-hot-toast'

const GAMES = [
  { id: 'blackjack', name: 'Blackjack', desc: 'Beat the dealer', color: 'from-violet-600/20 to-purple-700/20', border: 'border-violet-500/20' },
  { id: 'roulette', name: 'Roulette', desc: 'Girar the wheel', color: 'from-emerald-600/20 to-teal-700/20', border: 'border-emerald-500/20' },
  { id: 'slots', name: 'Slots', desc: '5-reel machine', color: 'from-yellow-600/20 to-orange-700/20', border: 'border-yellow-500/20' },
  { id: 'crash', name: 'Crash', desc: 'Cash out in time', color: 'from-red-600/20 to-rose-700/20', border: 'border-red-500/20' },
  { id: 'coinflip', name: 'Coinflip', desc: 'Cara or tails', color: 'from-cyan-600/20 to-sky-700/20', border: 'border-cyan-500/20' },
  { id: 'dice', name: 'Dice', desc: 'Más alto or lower', color: 'from-pink-600/20 to-fuchsia-700/20', border: 'border-pink-500/20' },
]

export default function Room() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()
  const navigate = useNavigate()

  const [room, setRoom] = useState(null)
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [copied, setCopiado] = useState(false)

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

    socket.on('room:memberJoined', ({ userId, nickname }) => {
      setOnlineUsers(prev => new Set([...prev, userId]))
      setRoom(prev => {
        if (!prev) return prev
        const exists = prev.members.find(m => m.userId === userId)
        if (exists) return prev
        return { ...prev, members: [...prev.members, { userId, user: { nickname, avatar: 'tiki1' }, role: 'member' }] }
      })
    })

    socket.on('room:memberLeft', ({ userId }) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(userId); return s })
    })

    socket.on('room:kicked', ({ userId }) => {
      if (userId === user?.id) {
        toast.error('You have been removed from this room.')
        navigate('/lobby')
      }
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
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
    toast.success('Room code copied!')
  }

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href)
    toast.success('Invite link copied!')
  }

  const kickMember = async (userId) => {
    try {
      await api.post(`/rooms/${roomCode}/kick`, { userId })
      toast.success('Player removed')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Cannot kick player')
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
                {room.members?.length || 0} players
              </span>
              <button onClick={copyLink} className="btn-ghost text-sm py-2 px-3">
                Invite Link
              </button>
              <Link to="/lobby" className="btn-ghost text-sm py-2 px-3">
                Leave
              </Link>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Main area */}
          <div className="lg:col-span-3 space-y-6">
            {/* Games */}
            <div>
              <h2 className="font-display font-bold text-lg text-tiki-text mb-4">Choose a Game</h2>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {GAMES.map(game => (
                  <motion.div
                    key={game.id}
                    whileHover={{ y: -4, scale: 1.02 }}
                    className={`game-card bg-gradient-to-br ${game.color} border ${game.border} p-5 cursor-pointer`}
                    onClick={() => navigate(`/room/${roomCode}/${game.id}`)}
                  >
                    <h3 className="font-display font-bold text-tiki-text text-lg">{game.name}</h3>
                    <p className="text-xs text-tiki-muted mt-1">{game.desc}</p>
                    <div className="mt-4">
                      <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1">
                        Play now
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none"><polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>
                      </span>
                    </div>
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
