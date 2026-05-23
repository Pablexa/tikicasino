import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket.jsx'
import { AvatarSvg } from './AvatarSvg.jsx'

export default function LiveBetsFeed({ roomCode }) {
  const { socket } = useSocket()
  const [activeBets, setActiveBets] = useState([])
  const [recentBets, setRecentBets] = useState([])

  useEffect(() => {
    if (!socket) return

    const handleBet = (bet) => {
      // Add or update active bet
      setActiveBets(prev => {
        const filtered = prev.filter(b => b.userId !== bet.userId || b.gameType !== bet.gameType)
        return [...filtered, bet]
      })
    }

    const handleResult = (res) => {
      // Remove from active bets
      setActiveBets(prev => prev.filter(b => b.userId !== res.userId || b.gameType !== res.gameType))
      
      // Add to recent bets history
      setRecentBets(prev => [res, ...prev].slice(0, 15))
    }

    // Reset active bets on new rounds (for Roulette and Crash)
    const handleRoundReset = () => {
      setActiveBets([])
    }

    socket.on('room:game:bet', handleBet)
    socket.on('room:game:result', handleResult)
    socket.on('crash:roundStart', handleRoundReset)
    socket.on('roulette:spinStart', handleRoundReset)

    return () => {
      socket.off('room:game:bet', handleBet)
      socket.off('room:game:result', handleResult)
      socket.off('crash:roundStart', handleRoundReset)
      socket.off('roulette:spinStart', handleRoundReset)
    }
  }, [socket])

  const gameNames = {
    slots: '🎰 Slots',
    coinflip: '🪙 Coinflip',
    dice: '🎲 Dados',
    roulette: '🎡 Ruleta',
    crash: '🚀 Crash',
    blackjack: '🃏 Blackjack',
    poker: '🃏 Poker'
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-tiki-text flex items-center gap-2">
          <span>⚡</span> Apuestas en Vivo
        </h3>
        <span className="text-[10px] bg-cyan-500/20 text-cyan-400 font-mono px-2 py-0.5 rounded-full border border-cyan-500/30 animate-pulse">
          Sincronizado
        </span>
      </div>

      {/* Tabs / Content */}
      <div className="flex-1 flex flex-col min-h-0 overflow-y-auto p-3 space-y-4">
        {/* Active Bets Section */}
        <div>
          <h4 className="text-[11px] font-bold text-yellow-500 tracking-wider uppercase mb-2">
            Apuestas Activas ({activeBets.length})
          </h4>
          {activeBets.length === 0 ? (
            <p className="text-[11px] text-tiki-muted italic pl-1">Ninguna apuesta en curso...</p>
          ) : (
            <div className="space-y-1.5">
              <AnimatePresence initial={false}>
                {activeBets.map((bet, i) => (
                  <motion.div
                    key={`${bet.userId}-${bet.gameType}-${i}`}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    className="flex items-center justify-between bg-white/5 border border-white/5 rounded-xl px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarSvg name={bet.avatar || 'tiki1'} size={20} className="flex-shrink-0" />
                      <span className="text-xs font-semibold text-tiki-text truncate">{bet.nickname}</span>
                    </div>
                    <div className="flex items-center gap-2 text-right">
                      <span className="text-[10px] bg-white/10 text-white/80 font-mono px-1.5 py-0.5 rounded-md">
                        {gameNames[bet.gameType] || bet.gameType}
                      </span>
                      <span className="text-xs text-yellow-400 font-mono font-bold">
                        {bet.betAmount.toLocaleString()} F
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* History Section */}
        <div className="flex-1 flex flex-col min-h-0">
          <h4 className="text-[11px] font-bold text-tiki-muted tracking-wider uppercase mb-2">
            Historial de la Sala ({recentBets.length})
          </h4>
          {recentBets.length === 0 ? (
            <p className="text-[11px] text-tiki-muted italic pl-1">Esperando jugadas...</p>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 chat-messages">
              <AnimatePresence initial={false}>
                {recentBets.map((res, i) => (
                  <motion.div
                    key={`${res.userId}-${res.timestamp || i}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex items-center justify-between border rounded-xl px-3 py-2 ${
                      res.win
                        ? 'bg-green-500/5 border-green-500/10 shadow-[inset_0_0_12px_rgba(16,185,129,0.03)]'
                        : 'bg-red-500/5 border-red-500/10'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <AvatarSvg name={res.avatar || 'tiki1'} size={20} className="flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="text-xs font-semibold text-tiki-text truncate block">{res.nickname}</span>
                        <span className="text-[9px] text-tiki-muted font-semibold block leading-none">
                          {gameNames[res.gameType] || res.gameType}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0 flex flex-col items-end">
                      <span className={`text-xs font-mono font-black ${res.win ? 'text-green-400' : 'text-red-400'}`}>
                        {res.win ? `+${res.payout.toLocaleString()}` : `-${res.betAmount.toLocaleString()}`} F
                      </span>
                      <span className={`text-[9px] font-bold px-1 rounded-md leading-none mt-0.5 ${
                        res.win ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                      }`}>
                        {res.win ? 'GANÓ' : 'PERDIÓ'}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
