import { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { SocketProvider, useSocket } from './hooks/useSocket.jsx'
import { motion, AnimatePresence } from 'framer-motion'

// Pages
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Lobby from './pages/Lobby.jsx'
import Room from './pages/Room.jsx'
import Profile from './pages/Profile.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Fairness from './pages/Fairness.jsx'
import Admin from './pages/Admin.jsx'

// Game pages
import BlackjackGame from './pages/games/BlackjackGame.jsx'
import RouletteGame from './pages/games/RouletteGame.jsx'
import SlotsGame from './pages/games/SlotsGame.jsx'
import CrashGame from './pages/games/CrashGame.jsx'
import CoinflipGame from './pages/games/CoinflipGame.jsx'
import DiceGame from './pages/games/DiceGame.jsx'
import PokerGame from './pages/games/PokerGame.jsx'
import LiarsBarGame from './pages/games/LiarsBarGame.jsx'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  return children
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="spinner" />
    </div>
  )
  if (user) return <Navigate to="/lobby" replace />
  return children
}

function GlobalAnnouncement() {
  const { socket } = useSocket()
  const [announcement, setAnnouncement] = useState(null)

  useEffect(() => {
    if (!socket) return

    const handleAnnouncement = ({ message }) => {
      setAnnouncement(message)
      // Disappear after 20 seconds
      const timer = setTimeout(() => {
        setAnnouncement(null)
      }, 20000)
      return () => clearTimeout(timer)
    }

    socket.on('admin:announcement', handleAnnouncement)
    return () => {
      socket.off('admin:announcement', handleAnnouncement)
    }
  }, [socket])

  return (
    <AnimatePresence>
      {announcement && (
        <motion.div
          initial={{ y: -120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -120, opacity: 0 }}
          transition={{ type: 'spring', damping: 15 }}
          className="fixed top-6 left-4 right-4 z-[9999] max-w-3xl mx-auto"
        >
          <div className="bg-gradient-to-r from-red-600 to-amber-500 text-white font-black text-center py-4 px-6 rounded-2xl border border-yellow-400/40 shadow-[0_0_50px_rgba(239,68,68,0.5)] flex items-center justify-between relative overflow-hidden backdrop-blur-md">
            {/* Pulsing decoration */}
            <div className="absolute inset-0 bg-white/5 animate-pulse pointer-events-none" />
            
            <div className="flex items-center gap-3 min-w-0 flex-1 justify-center">
              <span className="text-2xl flex-shrink-0 animate-bounce">📢</span>
              <p className="text-sm md:text-base font-black tracking-wide uppercase truncate">
                {announcement}
              </p>
            </div>
            
            <button
              onClick={() => setAnnouncement(null)}
              className="text-white/80 hover:text-white bg-black/20 hover:bg-black/40 w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-all flex-shrink-0 ml-3"
            >
              ✕
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/fairness" element={<Fairness />} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />

      {/* Protected */}
      <Route path="/lobby" element={<ProtectedRoute><Lobby /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/leaderboard" element={<ProtectedRoute><Leaderboard /></ProtectedRoute>} />
      <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />

      {/* Room */}
      <Route path="/room/:roomCode" element={<ProtectedRoute><Room /></ProtectedRoute>} />
      <Route path="/room/:roomCode/blackjack" element={<ProtectedRoute><BlackjackGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/roulette" element={<ProtectedRoute><RouletteGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/slots" element={<ProtectedRoute><SlotsGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/crash" element={<ProtectedRoute><CrashGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/coinflip" element={<ProtectedRoute><CoinflipGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/dice" element={<ProtectedRoute><DiceGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/poker" element={<ProtectedRoute><PokerGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/liarsbar" element={<ProtectedRoute><LiarsBarGame /></ProtectedRoute>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <AppRoutes />
        <GlobalAnnouncement />
      </SocketProvider>
    </AuthProvider>
  )
}
