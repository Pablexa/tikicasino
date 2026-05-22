import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket.jsx'
import { useAuth } from '../hooks/useAuth.jsx'
import { AvatarSvg } from './AvatarSvg.jsx'
import { IconEnviar } from './Icons.jsx'

export default function ChatPanel({ roomCode, roomId }) {
  const { socket } = useSocket()
  const { user } = useAuth()
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!socket) return

    const handleMessage = (msg) => {
      setMessages(prev => [...prev.slice(-199), msg])
    }
    const handleHistory = (msgs) => { setMessages(msgs || []) }
    // room:state includes chatHistory on join
    const handleRoomState = ({ chatHistory }) => {
      if (chatHistory) setMessages(chatHistory)
    }

    socket.on('chat:message', handleMessage)
    socket.on('chat:history', handleHistory)
    socket.on('room:state', handleRoomState)

    return () => {
      socket.off('chat:message', handleMessage)
      socket.off('chat:history', handleHistory)
      socket.off('room:state', handleRoomState)
    }
  }, [socket])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = () => {
    const msg = input.trim()
    if (!msg || !socket || !roomCode) return
    socket.emit('chat:send', { roomCode, message: msg })
    setInput('')
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      send()
    }
  }

  return (
    <div className="glass rounded-2xl flex flex-col h-full min-h-0">
      {/* Header */}
      <div className="px-4 py-3 border-b border-white/5 flex-shrink-0">
        <h3 className="text-sm font-semibold text-tiki-text">Chat en vivo</h3>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-0 chat-messages">
        {messages.length === 0 && (
          <p className="text-center text-tiki-muted text-xs py-8">
            Todavía no hay mensajes. ¡Saludá!
          </p>
        )}
        <AnimatePresence initial={false}>
          {messages.map((msg, i) => (
            <motion.div
              key={msg.id || i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.15 }}
            >
              {msg.type === 'system' ? (
                <div className="text-center">
                  <span className="text-xs text-violet-400 italic px-2 py-0.5 rounded-full bg-violet-500/10">
                    {msg.message}
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <AvatarSvg name={msg.avatar || 'tiki1'} size={24} className="flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-xs font-semibold text-tiki-muted">
                      {msg.userId === user?.id ? (
                        <span className="text-tiki-green">Vos</span>
                      ) : msg.nickname}
                    </span>
                    <p className="text-sm text-tiki-text break-words leading-relaxed">{msg.message}</p>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/5 flex-shrink-0">
        <div className="flex gap-2">
          <input
            className="input flex-1 py-2 text-sm"
            placeholder="Escribí un mensaje… (/help para comandos)"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            maxLength={300}
          />
          <button
            onClick={send}
            disabled={!input.trim()}
            className="btn-primary p-2.5 rounded-xl flex-shrink-0"
          >
            <IconEnviar size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
