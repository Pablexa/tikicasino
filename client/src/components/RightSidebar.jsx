import { useState } from 'react'
import ChatPanel from './ChatPanel.jsx'
import LiveBetsFeed from './LiveBetsFeed.jsx'

export default function RightSidebar({ roomCode, roomId }) {
  const [activeTab, setActiveTab] = useState('chat') // chat | bets

  return (
    <div className="flex flex-col h-full gap-3 min-h-0">
      {/* Sliding Tab Header */}
      <div className="flex bg-black/50 border border-white/5 p-1 rounded-2xl flex-shrink-0 backdrop-blur-md">
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/20 shadow-cyan-glow'
              : 'text-tiki-muted hover:text-tiki-text border border-transparent'
          }`}
        >
          💬 Chat de Sala
        </button>
        <button
          onClick={() => setActiveTab('bets')}
          className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all flex items-center justify-center gap-1.5 ${
            activeTab === 'bets'
              ? 'bg-gradient-to-r from-cyan-600/30 to-cyan-500/20 text-cyan-300 border border-cyan-500/20 shadow-cyan-glow'
              : 'text-tiki-muted hover:text-tiki-text border border-transparent'
          }`}
        >
          ⚡ Apuestas en Vivo
        </button>
      </div>

      {/* Tab Panel Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'chat' ? (
          <ChatPanel roomCode={roomCode} roomId={roomId} />
        ) : (
          <LiveBetsFeed roomCode={roomCode} />
        )}
      </div>
    </div>
  )
}
