import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import Navbar from '../components/Navbar.jsx'
import BalanceBadge from '../components/BalanceBadge.jsx'
import { AvatarSvg, AVATAR_LIST } from '../components/AvatarSvg.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import api from '../lib/api.js'
import toast from 'react-hot-toast'

export default function Perfil() {
  const { user, refreshUser } = useAuth()
  const [stats, setStats] = useState(null)
  const [selectedAvatar, setSelectedAvatar] = useState(user?.avatar || 'tiki1')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    api.get('/stats/me').then(r => setStats(r.data.stats)).catch(() => {})
  }, [])

  const saveAvatar = async () => {
    if (selectedAvatar === user?.avatar) return
    setSaving(true)
    try {
      await api.patch('/users/me', { avatar: selectedAvatar })
      await refreshUser()
      toast.success('Avatar updated!')
    } catch { toast.error('Failed to update avatar') }
    finally { setSaving(false) }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-8 space-y-6">
        <h1 className="font-display font-black text-3xl gradient-text">My Perfil</h1>

        {/* Perfil card */}
        <div className="glass rounded-3xl p-8 flex flex-col sm:flex-row items-center sm:items-start gap-6">
          <AvatarSvg name={user?.avatar || 'tiki1'} size={96} />
          <div className="flex-1 text-center sm:text-left">
            <h2 className="font-display font-bold text-2xl text-tiki-text">{user?.nickname}</h2>
            <p className="text-tiki-muted text-sm mt-1">{user?.email}</p>
            <div className="flex items-center justify-center sm:justify-start gap-3 mt-4 flex-wrap">
              <BalanceBadge balance={user?.balance} size="md" />
              {user?.emailVerificado
                ? <span className="badge-green">Verificado</span>
                : <span className="badge-red">Sin verificar</span>}
            </div>
            <p className="text-xs text-tiki-muted mt-3">
              Joined {user?.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
            </p>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Ganastes', value: stats.wins, color: 'text-green-400' },
              { label: 'Perdistees', value: stats.losses, color: 'text-red-400' },
              { label: 'Total Won', value: `${stats.totalWon?.toLocaleString()} F`, color: 'text-yellow-400' },
              { label: 'Net Profit', value: `${stats.netProfit >= 0 ? '+' : ''}${stats.netProfit?.toLocaleString()} F`, color: stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400' },
            ].map(s => (
              <div key={s.label} className="glass rounded-2xl p-4 text-center">
                <p className="text-xs text-tiki-muted mb-1">{s.label}</p>
                <p className={`font-display font-bold text-xl ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>
        )}

        {/* Avatar picker */}
        <div className="glass rounded-2xl p-6">
          <h3 className="font-display font-bold text-lg text-tiki-text mb-4">Change Avatar</h3>
          <div className="grid grid-cols-4 sm:grid-cols-8 gap-3 mb-4">
            {AVATAR_LIST.map(av => (
              <button
                key={av}
                onClick={() => setSelectedAvatar(av)}
                className={`p-2 rounded-xl transition-all border-2 ${selectedAvatar === av ? 'border-cyan-400 bg-cyan-500/10 scale-110' : 'border-transparent hover:border-white/20'}`}
              >
                <AvatarSvg name={av} size={56} />
              </button>
            ))}
          </div>
          <button onClick={saveAvatar} disabled={saving || selectedAvatar === user?.avatar} className="btn-primary py-2.5 px-6">
            {saving ? <span className="spinner scale-75" /> : 'Guardar Avatar'}
          </button>
        </div>

        {/* Recent transactions */}
        {stats?.recentTransactions?.length > 0 && (
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display font-bold text-lg text-tiki-text mb-4">Recent Activity</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {stats.recentTransactions.map(tx => (
                <div key={tx.id} className="flex items-center justify-between py-2 px-3 rounded-xl bg-white/5 text-sm">
                  <div>
                    <span className="text-tiki-text font-medium capitalize">{tx.type.replace(/_/g, ' ')}</span>
                    <span className="text-tiki-muted text-xs ml-2">{new Date(tx.createdAt).toLocaleDateString()}</span>
                  </div>
                  <span className={`font-mono font-bold ${tx.amount > 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {tx.amount > 0 ? '+' : ''}{tx.amount.toLocaleString()} F
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
