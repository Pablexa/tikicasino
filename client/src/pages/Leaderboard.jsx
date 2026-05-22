import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import { AvatarSvg } from '../components/AvatarSvg.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'

export default function Ranking() {
  const { user } = useAuth()
  const [players, setLeaderboard] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.get('/leaderboard/global').then(r => setLeaderboard(r.data.leaderboard || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="font-display font-black text-4xl gradient-text mb-2">Ranking</h1>
          <p className="text-tiki-muted">Top leaderboard por saldo de CALDICOINS</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20"><div className="spinner" /></div>
        ) : players.length === 0 ? (
          <div className="text-center py-20 text-tiki-muted">Sin leaderboard todavía. Be the first!</div>
        ) : (
          <div className="space-y-3">
            {players.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04 }}
                className={`glass rounded-2xl p-4 flex items-center gap-4 ${p.id === user?.id ? 'border border-cyan-500/30 bg-cyan-500/5' : ''}`}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-display font-black text-lg flex-shrink-0 ${
                  i === 0 ? 'bg-yellow-500/20 text-yellow-400' :
                  i === 1 ? 'bg-gray-400/20 text-gray-300' :
                  i === 2 ? 'bg-amber-600/20 text-amber-500' : 'bg-white/5 text-tiki-muted'
                }`}>
                  {i + 1}
                </div>
                <AvatarSvg name={p.avatar} size={44} />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-tiki-text truncate">
                    {p.nickname}
                    {p.id === user?.id && <span className="ml-2 text-xs text-cyan-400">(you)</span>}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-mono font-bold text-yellow-400 text-lg">{p.balance?.toLocaleString()}</p>
                  <p className="text-xs text-tiki-muted">CALDICOINS</p>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
