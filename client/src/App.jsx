import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './hooks/useAuth.jsx'
import { SocketProvider } from './hooks/useSocket.jsx'

// Pages
import Landing from './pages/Landing.jsx'
import Register from './pages/Register.jsx'
import Login from './pages/Login.jsx'
import Lobby from './pages/Lobby.jsx'
import Room from './pages/Room.jsx'
import Profile from './pages/Profile.jsx'
import Leaderboard from './pages/Leaderboard.jsx'
import Fairness from './pages/Fairness.jsx'

// Game pages
import BlackjackGame from './pages/games/BlackjackGame.jsx'
import RouletteGame from './pages/games/RouletteGame.jsx'
import SlotsGame from './pages/games/SlotsGame.jsx'
import CrashGame from './pages/games/CrashGame.jsx'
import CoinflipGame from './pages/games/CoinflipGame.jsx'
import DiceGame from './pages/games/DiceGame.jsx'

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

      {/* Room */}
      <Route path="/room/:roomCode" element={<ProtectedRoute><Room /></ProtectedRoute>} />
      <Route path="/room/:roomCode/blackjack" element={<ProtectedRoute><BlackjackGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/roulette" element={<ProtectedRoute><RouletteGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/slots" element={<ProtectedRoute><SlotsGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/crash" element={<ProtectedRoute><CrashGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/coinflip" element={<ProtectedRoute><CoinflipGame /></ProtectedRoute>} />
      <Route path="/room/:roomCode/dice" element={<ProtectedRoute><DiceGame /></ProtectedRoute>} />

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
      </SocketProvider>
    </AuthProvider>
  )
}
