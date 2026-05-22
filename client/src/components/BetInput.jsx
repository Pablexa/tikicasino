import { useState } from 'react'
import { motion } from 'framer-motion'

export default function BetInput({ value, onChange, min = 10, max = 50000, balance = 0 }) {
  const quickAmounts = [100, 500, 1000, 5000]

  const setAmount = (amount) => {
    const clamped = Math.min(Math.max(amount, min), Math.min(max, balance))
    onChange(clamped)
  }

  const handleChange = (e) => {
    const val = parseInt(e.target.value.replace(/\D/g, '')) || 0
    onChange(val)
  }

  const isValid = value >= min && value <= balance && value <= max

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            className={`input pr-16 font-mono font-bold ${!isValid && value > 0 ? 'border-red-500/50' : ''}`}
            placeholder="0"
            value={value || ''}
            onChange={handleChange}
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-yellow-500">
            CALDICOINS
          </span>
        </div>
        <button
          type="button"
          onClick={() => setAmount(balance)}
          className="btn-ghost text-xs py-3 px-3 flex-shrink-0"
        >
          MAX
        </button>
      </div>

      {/* Quick amounts */}
      <div className="flex gap-2 flex-wrap">
        {quickAmounts.map(amount => (
          <button
            key={amount}
            type="button"
            onClick={() => setAmount(amount)}
            className="bet-quick-btn"
          >
            +{amount >= 1000 ? `${amount / 1000}K` : amount}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setAmount(Math.floor(value / 2))}
          className="bet-quick-btn"
        >
          ½
        </button>
        <button
          type="button"
          onClick={() => setAmount(value * 2)}
          className="bet-quick-btn"
        >
          ×2
        </button>
      </div>

      {/* Validation message */}
      {value > 0 && !isValid && (
        <motion.p
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-xs text-red-400"
        >
          {value > balance ? 'CALDICOINS insuficientes' : value < min ? `Apuesta mínima: ${min} CALDICOINS` : `Apuesta máxima: ${max.toLocaleString()} CALDICOINS`}
        </motion.p>
      )}
    </div>
  )
}
