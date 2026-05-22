import { motion } from 'framer-motion'
import { AvatarSvg } from './AvatarSvg.jsx'

export default function PlayerCard({ user, rank, isYou, role }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
        isYou ? 'bg-cyan-500/10 border border-cyan-500/20' : 'hover:bg-white/5'
      }`}
    >
      {rank && (
        <span className={`text-xs font-bold w-5 text-center flex-shrink-0 ${
          rank === 1 ? 'text-yellow-400' : rank === 2 ? 'text-gray-300' : rank === 3 ? 'text-amber-600' : 'text-tiki-muted'
        }`}>
          {rank === 1 ? '◈' : rank === 2 ? '◇' : rank === 3 ? '△' : rank}
        </span>
      )}

      <AvatarSvg name={user.avatar || 'tiki1'} size={32} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className={`text-sm font-semibold truncate ${isYou ? 'text-cyan-400' : 'text-tiki-text'}`}>
            {user.nickname}
          </span>
          {isYou && <span className="text-xs text-tiki-muted">(you)</span>}
          {role === 'owner' && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-500/15 text-yellow-400 font-medium">Host</span>
          )}
        </div>
        <p className="text-xs text-tiki-muted font-mono">
          {user.balance?.toLocaleString() ?? '—'} F
        </p>
      </div>
    </motion.div>
  )
}
