import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { AvatarSvg } from './AvatarSvg.jsx'
import { IconHome, IconTrophy, IconLogout, IconShield } from './Icons.jsx'
import toast from 'react-hot-toast'

export default function Navbar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    try {
      await logout()
      navigate('/')
      toast.success('Sesión cerrada')
    } catch {
      toast.error('Error al cerrar sesión')
    }
  }

  return (
    <header className="sticky top-0 z-40 w-full">
      <div className="glass border-b border-tiki-border backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
          <Link to={user ? '/lobby' : '/'} className="flex items-center gap-2.5 flex-shrink-0">
            <motion.img src="/icon.png" alt="TikiCasino" className="w-9 h-9 rounded-xl object-cover"
              animate={{ rotate: [0, 5, -5, 0] }} transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }} />
            <span className="font-display font-bold text-xl gradient-text hidden sm:block">TikiCasino</span>
          </Link>

          {user && (
            <nav className="hidden md:flex items-center gap-1">
              <NavLink to="/lobby" icon={<IconHome size={16} />}>Lobby</NavLink>
              <NavLink to="/leaderboard" icon={<IconTrophy size={16} />}>Ranking</NavLink>
              <NavLink to="/fairness" icon={<IconShield size={16} />}>Fairness</NavLink>
            </nav>
          )}

          <div className="flex items-center gap-3">
            {user ? (
              <>
                <motion.div key={user.balance} initial={{ scale: 1.1 }} animate={{ scale: 1 }} className="badge-gold hidden sm:flex">
                  <span style={{ color: '#fbbf24' }}>C</span>
                  {user.balance?.toLocaleString()}
                </motion.div>

                <Link to="/profile" className="flex items-center gap-2 px-2 py-1.5 rounded-xl hover:bg-tiki-green/5 transition-all group">
                  <AvatarSvg name={user.avatar} size={32} />
                  <span className="text-sm font-medium text-tiki-text hidden sm:block group-hover:text-tiki-green-glow transition-colors">
                    {user.nickname}
                  </span>
                </Link>

                <button onClick={handleLogout} className="p-2 rounded-xl text-tiki-muted hover:text-red-400 hover:bg-red-500/10 transition-all" title="Salir">
                  <IconLogout size={18} />
                </button>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-ghost text-sm py-2 px-4">Entrar</Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">Registrarse</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function NavLink({ to, icon, children }) {
  return (
    <Link to={to} className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-tiki-muted hover:text-tiki-text hover:bg-tiki-green/5 transition-all">
      {icon}{children}
    </Link>
  )
}
