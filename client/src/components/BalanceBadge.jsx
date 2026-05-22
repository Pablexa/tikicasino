import { motion } from 'framer-motion'

export default function BalanceBadge({ balance, size = 'md', animated = true }) {
  const sizes = {
    sm: 'text-sm px-3 py-1',
    md: 'text-base px-4 py-2',
    lg: 'text-xl px-5 py-2.5',
  }

  return (
    <motion.div
      key={balance}
      initial={animated ? { scale: 1.08 } : false}
      animate={{ scale: 1 }}
      className={`inline-flex items-center gap-2 rounded-xl font-display font-bold ${sizes[size]}`}
      style={{
        background: 'linear-gradient(135deg, rgba(245,158,11,0.15), rgba(239,68,68,0.1))',
        border: '1px solid rgba(245,158,11,0.3)',
      }}
    >
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#fbbf24" strokeWidth="2"/>
        <circle cx="12" cy="12" r="6" fill="rgba(251,191,36,0.15)"/>
        <text x="12" y="16" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fbbf24" fontFamily="Inter">C</text>
      </svg>
      <span className="text-yellow-400 font-mono">
        {typeof balance === 'number' ? balance.toLocaleString() : '—'}
      </span>
      <span className="text-yellow-600 text-xs font-semibold">CALDICOINS</span>
    </motion.div>
  )
}
