import { useState, useEffect, useRef } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Chess } from 'chess.js'
import { useAuth } from '../../hooks/useAuth.jsx'
import { useSocket } from '../../hooks/useSocket.jsx'
import Navbar from '../../components/Navbar.jsx'
import BalanceBadge from '../../components/BalanceBadge.jsx'
import ChatPanel from '../../components/ChatPanel.jsx'
import Modal from '../../components/Modal.jsx'
import toast from 'react-hot-toast'
import { playWinSound, playLoseSound } from '../../utils/audio.js'

// Exquisite Glowing SVG Chess Pieces
const PIECE_SVGS = {
  P: ( // White Pawn
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83 1.15-1.41 2.53-1.41 4.03v2h11v-2c0-1.5-.58-2.88-1.41-4.03 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
    </svg>
  ),
  R: ( // White Rook
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
      <path d="M9 39h27v-3H9v3zm3-13h21v-4H12v4zm2.5-4l1.5-8h14l1.5 8h-17zm-1.5-8h20v-5H33v3h-3v-3h-4v3h-3v-3h-4v3h-3v-3H15v3h-3v-3H9v5h3z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
    </svg>
  ),
  N: ( // White Knight
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
      <path d="M22 10c-5 0-8 3-10 8 0 0 1.5-1.5 4-1.5 0 0-3 2.5-4 5.5-.5 1.5 0 3.5.5 5 1 .5 2 .5 2.5.5s-1.5 1.5-1.5 3c0 2.5 2 4.5 4.5 4.5h11.5c3 0 5.5-2.5 5.5-5.5v-6.5c0-3-1.5-5-3.5-6.5-1.5-1-4-1.5-5.5-1.5z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
      <circle cx="15" cy="18" r="1.5" fill="#78350f" />
    </svg>
  ),
  B: ( // White Bishop
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
      <path d="M9 36h27v-4H9v4zm13.5-32C17 11 15 15 15 19c0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5c0-4-2-8-7.5-15z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
      <circle cx="22.5" cy="5" r="1.5" fill="#d97706" />
    </svg>
  ),
  Q: ( // White Queen
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(251,191,36,0.6)]">
      <path d="M8 12l3 18h23l3-18-6 10-6-10-6 10-6-10z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
      <path d="M11 34h23v-2H11v2z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
      <circle cx="8" cy="10" r="1.5" fill="#d97706" />
      <circle cx="14" cy="8" r="1.5" fill="#d97706" />
      <circle cx="22.5" cy="6" r="1.5" fill="#d97706" />
      <circle cx="31" cy="8" r="1.5" fill="#d97706" />
      <circle cx="37" cy="10" r="1.5" fill="#d97706" />
    </svg>
  ),
  K: ( // White King
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_6px_rgba(251,191,36,0.8)]">
      <path d="M22.5 11.63V6M20 8.5h5M11.5 37h22v-3h-22v3zm4-12.5c0-3.5 2.5-6.5 6.5-6.5s6.5 3 6.5 6.5-2.5 6.5-6.5 6.5-6.5-3-6.5-6.5z" stroke="#d97706" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 22h20v4h-20v-4z" fill="#fef08a" stroke="#d97706" strokeWidth="1.5" />
    </svg>
  ),
  p: ( // Black Pawn
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
      <path d="M22.5 9c-2.21 0-4 1.79-4 4 0 .89.29 1.71.78 2.38C17.33 16.5 16 18.59 16 21c0 2.03.94 3.84 2.41 5.03-.83 1.15-1.41 2.53-1.41 4.03v2h11v-2c0-1.5-.58-2.88-1.41-4.03 1.47-1.19 2.41-3 2.41-5.03 0-2.41-1.33-4.5-3.28-5.62.49-.67.78-1.49.78-2.38 0-2.21-1.79-4-4-4z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
    </svg>
  ),
  r: ( // Black Rook
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
      <path d="M9 39h27v-3H9v3zm3-13h21v-4H12v4zm2.5-4l1.5-8h14l1.5 8h-17zm-1.5-8h20v-5H33v3h-3v-3h-4v3h-3v-3h-4v3h-3v-3H15v3h-3v-3H9v5h3z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
    </svg>
  ),
  n: ( // Black Knight
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
      <path d="M22 10c-5 0-8 3-10 8 0 0 1.5-1.5 4-1.5 0 0-3 2.5-4 5.5-.5 1.5 0 3.5.5 5 1 .5 2 .5 2.5.5s-1.5 1.5-1.5 3c0 2.5 2 4.5 4.5 4.5h11.5c3 0 5.5-2.5 5.5-5.5v-6.5c0-3-1.5-5-3.5-6.5-1.5-1-4-1.5-5.5-1.5z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
      <circle cx="15" cy="18" r="1.5" fill="#f87171" />
    </svg>
  ),
  b: ( // Black Bishop
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
      <path d="M9 36h27v-4H9v4zm13.5-32C17 11 15 15 15 19c0 4.14 3.36 7.5 7.5 7.5s7.5-3.36 7.5-7.5c0-4-2-8-7.5-15z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
      <circle cx="22.5" cy="5" r="1.5" fill="#f87171" />
    </svg>
  ),
  q: ( // Black Queen
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_4px_rgba(239,68,68,0.5)]">
      <path d="M8 12l3 18h23l3-18-6 10-6-10-6 10-6-10z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
      <path d="M11 34h23v-2H11v2z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
      <circle cx="8" cy="10" r="1.5" fill="#f87171" />
      <circle cx="14" cy="8" r="1.5" fill="#f87171" />
      <circle cx="22.5" cy="6" r="1.5" fill="#f87171" />
      <circle cx="31" cy="8" r="1.5" fill="#f87171" />
      <circle cx="37" cy="10" r="1.5" fill="#f87171" />
    </svg>
  ),
  k: ( // Black King
    <svg viewBox="0 0 45 45" className="w-12 h-12 filter drop-shadow-[0_0_6px_rgba(239,68,68,0.8)]">
      <path d="M22.5 11.63V6M20 8.5h5M11.5 37h22v-3h-22v3zm4-12.5c0-3.5 2.5-6.5 6.5-6.5s6.5 3 6.5 6.5-2.5 6.5-6.5 6.5-6.5-3-6.5-6.5z" stroke="#f87171" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12.5 22h20v4h-20v-4z" fill="#374151" stroke="#f87171" strokeWidth="1.5" />
    </svg>
  )
}

const PIECE_CHARS = {
  P: '♙', R: '♖', N: '♘', B: '♗', Q: '♕',
  p: '♟', r: '♜', n: '♞', b: '♝', q: '♛'
}

const coordsToSquare = (row, col) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
  return files[col] + ranks[row]
}

const squareToCoords = (square) => {
  const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']
  const ranks = ['8', '7', '6', '5', '4', '3', '2', '1']
  const col = files.indexOf(square[0])
  const row = ranks.indexOf(square[1])
  return { row, col }
}

export default function ChessGame() {
  const { roomCode } = useParams()
  const { user } = useAuth()
  const { socket } = useSocket()

  const [gameState, setGameState] = useState(null)
  const [selectedCell, setSelectedCell] = useState(null) // { row, col }
  const [validMoves, setValidMoves] = useState([]) // array of { row, col }
  const [betAmountInput, setBetAmountInput] = useState(100)
  const [showBetModal, setShowBetModal] = useState(false)
  const [pendingSeatColor, setPendingSeatColor] = useState(null)

  useEffect(() => {
    if (!socket) return

    socket.emit('chess:join', { roomCode })

    socket.on('chess:state', (state) => {
      setGameState(state)
      setSelectedCell(null)
      setValidMoves([])
    })

    socket.on('chess:error', ({ message }) => {
      toast.error(message)
    })

    return () => {
      socket.off('chess:state')
      socket.off('chess:error')
      socket.emit('chess:leave', { roomCode })
    }
  }, [socket, roomCode])

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // Get authentic legal moves from chess.js using current FEN
  const getMovesForPiece = (row, col) => {
    if (!gameState || !gameState.fen) return []
    try {
      const chess = new Chess(gameState.fen)
      const square = coordsToSquare(row, col)
      const moves = chess.moves({ square, verbose: true })
      return moves.map(m => squareToCoords(m.to))
    } catch (e) {
      return []
    }
  }

  const handleCellClick = (row, col) => {
    if (!gameState || gameState.status !== 'playing') return

    const myColor = gameState.white?.userId === user.id ? 'white' : gameState.black?.userId === user.id ? 'black' : null
    if (!myColor || gameState.turn !== myColor) return

    // If cell is a valid move, execute it!
    const isValid = validMoves.some(m => m.row === row && m.col === col)
    if (isValid && selectedCell) {
      socket.emit('chess:move', {
        roomCode,
        fromRow: selectedCell.row,
        fromCol: selectedCell.col,
        toRow: row,
        toCol: col
      })
      setSelectedCell(null)
      setValidMoves([])
      return
    }

    // Select piece
    const piece = gameState.board[row][col]
    if (piece) {
      const isPieceWhite = piece === piece.toUpperCase()
      if ((myColor === 'white' && isPieceWhite) || (myColor === 'black' && !isPieceWhite)) {
        setSelectedCell({ row, col })
        setValidMoves(getMovesForPiece(row, col))
        return
      }
    }

    setSelectedCell(null)
    setValidMoves([])
  }

  const sitDown = (color) => {
    if (!socket || !gameState) return
    
    // If the other seat has a bet, we must match it directly
    if (color === 'white' && gameState.black && gameState.betAmount > 0) {
      socket.emit('chess:sit', { roomCode, color, bet: gameState.betAmount })
    } else if (color === 'black' && gameState.white && gameState.betAmount > 0) {
      socket.emit('chess:sit', { roomCode, color, bet: gameState.betAmount })
    } else {
      setPendingSeatColor(color)
      setShowBetModal(true)
    }
  }

  const confirmSit = () => {
    socket.emit('chess:sit', { roomCode, color: pendingSeatColor, bet: betAmountInput })
    setShowBetModal(false)
  }

  const resignGame = () => {
    if (window.confirm('¿Seguro de que querés abandonar y darle la victoria al rival?')) {
      socket.emit('chess:resign', { roomCode })
    }
  }

  const offerDraw = () => {
    socket.emit('chess:draw_offer', { roomCode })
    toast.success('Oferta de tablas enviada')
  }

  const acceptDraw = () => {
    socket.emit('chess:draw_accept', { roomCode })
  }

  const getCapturedPieces = () => {
    if (!gameState || !gameState.board) return { white: [], black: [] }
    const initial = {
      white: ['P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', 'R', 'R', 'N', 'N', 'B', 'B', 'Q'],
      black: ['p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', 'r', 'r', 'n', 'n', 'b', 'b', 'q']
    }
    const current = { white: [], black: [] }
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const piece = gameState.board[r][c]
        if (piece) {
          if (piece === piece.toUpperCase()) {
            current.white.push(piece)
          } else {
            current.black.push(piece)
          }
        }
      }
    }
    const capturedWhite = []
    const tempWhite = [...current.white]
    for (const p of initial.white) {
      const idx = tempWhite.indexOf(p)
      if (idx > -1) {
        tempWhite.splice(idx, 1)
      } else {
        capturedWhite.push(p)
      }
    }
    const capturedBlack = []
    const tempBlack = [...current.black]
    for (const p of initial.black) {
      const idx = tempBlack.indexOf(p)
      if (idx > -1) {
        tempBlack.splice(idx, 1)
      } else {
        capturedBlack.push(p)
      }
    }
    return { white: capturedWhite, black: capturedBlack }
  }

  const renderMovesHistory = () => {
    const history = gameState.movesHistory || []
    const pairs = []
    for (let i = 0; i < history.length; i += 2) {
      pairs.push({
        num: Math.floor(i / 2) + 1,
        white: history[i],
        black: history[i + 1] || ''
      })
    }
    return (
      <div className="space-y-1 max-h-[140px] overflow-y-auto font-mono text-xs pr-1 scrollbar-thin">
        {pairs.length === 0 ? (
          <span className="text-tiki-muted italic text-[11px]">Aún no hay jugadas.</span>
        ) : (
          pairs.map(p => (
            <div key={p.num} className="flex justify-between py-1 border-b border-white/5">
              <span className="text-amber-500/80 font-bold w-1/4">{p.num}.</span>
              <span className="text-white font-medium w-3/8">{p.white}</span>
              <span className="text-gray-400 font-medium w-3/8">{p.black}</span>
            </div>
          ))
        )}
      </div>
    )
  }

  if (!gameState) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="spinner" />
      </div>
    )
  }

  const myColor = gameState.white?.userId === user.id ? 'white' : gameState.black?.userId === user.id ? 'black' : null
  const isSpectator = !myColor

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Link to={`/room/${roomCode}`} className="btn-ghost text-sm py-2 px-3">← Room</Link>
            <h1 className="font-display font-bold text-2xl gradient-text">Ajedrez Premium</h1>
            <span className="badge-violet text-xs">Caoba Pub</span>
          </div>
          <BalanceBadge balance={user?.balance || 0} />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3 flex flex-col items-center">
            
            {/* Top Player */}
            <div className="w-full max-w-[500px] flex items-center justify-between bg-black/40 border border-white/5 rounded-t-2xl p-4">
              <div className="flex items-center gap-3">
                {gameState.black ? (
                  <>
                    <img src={`/avatars/${gameState.black.avatar}.png`} alt="avatar" className="w-10 h-10 rounded-xl" onError={e => e.target.src = '/avatars/tiki1.png'} />
                    <div>
                      <h4 className="text-white font-bold">{gameState.black.nickname}</h4>
                      <span className="text-[10px] text-red-400 uppercase tracking-widest font-black">Piezas Negras</span>
                    </div>
                  </>
                ) : (
                  <button onClick={() => sitDown('black')} className="btn-ghost py-1.5 px-3 text-xs">+ Sentarse en Negras</button>
                )}
              </div>
              
              {gameState.status === 'playing' && (
                <div className={`font-mono font-bold text-lg px-4 py-1.5 rounded-xl border ${gameState.turn === 'black' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-black/50 text-gray-500 border-white/5'}`}>
                  {formatTimer(gameState.timers.black)}
                </div>
              )}
            </div>

            {/* Chess board and border frame */}
            <div className="w-full max-w-[500px] aspect-square bg-[#2b1810] rounded-lg p-3 shadow-2xl border-4 border-[#ca8a04]">
              <div className="w-full h-full grid grid-cols-8 grid-rows-8 bg-amber-950 rounded overflow-hidden">
                {Array.from({ length: 8 }).map((_, rIndex) => {
                  // If black player, render board inverted so Black is always at the bottom
                  const row = myColor === 'black' ? rIndex : 7 - rIndex
                  
                  return Array.from({ length: 8 }).map((_, cIndex) => {
                    const col = myColor === 'black' ? 7 - cIndex : cIndex
                    const isDarkCell = (row + col) % 2 === 0
                    
                    const cellColor = isDarkCell 
                      ? 'bg-gradient-to-br from-[#5c4033] to-[#452a1e]' 
                      : 'bg-gradient-to-br from-[#f5f5dc] to-[#e4dfd0]'
                    
                    const piece = gameState.board[row][col]
                    const isSelected = selectedCell?.row === row && selectedCell?.col === col
                    const isValidMove = validMoves.some(m => m.row === row && m.col === col)

                    return (
                      <div
                        key={`${row}-${col}`}
                        onClick={() => handleCellClick(row, col)}
                        className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all ${cellColor} ${isSelected ? 'ring-4 ring-yellow-400/80 z-10' : ''}`}
                      >
                        {/* Pieces SVG */}
                        {piece && (
                          <div className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform">
                            {PIECE_SVGS[piece]}
                          </div>
                        )}

                        {/* Dot indicator for empty valid moves */}
                        {isValidMove && !piece && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                        )}

                        {/* Red overlay for enemy piece target under attack */}
                        {isValidMove && piece && (
                          <span className="absolute inset-0 bg-red-500/30 border border-red-500/80" />
                        )}
                      </div>
                    )
                  })
                })}
              </div>
            </div>

            {/* Bottom Player */}
            <div className="w-full max-w-[500px] flex items-center justify-between bg-black/40 border border-white/5 rounded-b-2xl p-4">
              <div className="flex items-center gap-3">
                {gameState.black ? (
                  <>
                    <img src={`/avatars/${gameState.black.avatar}.png`} alt="avatar" className="w-10 h-10 rounded-xl" onError={e => e.target.src = '/avatars/tiki1.png'} />
                    <div>
                      <h4 className="text-white font-bold">{gameState.black.nickname}</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-[10px] text-red-400 uppercase tracking-widest font-black">Piezas Negras</span>
                        {gameState.status === 'playing' && getCapturedPieces().white.length > 0 && (
                          <div className="flex items-center gap-0.5 text-xs text-white/60 bg-white/5 px-1.5 py-0.5 rounded font-serif">
                            {getCapturedPieces().white.map((p, idx) => (
                              <span key={idx}>{PIECE_CHARS[p]}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <button onClick={() => sitDown('black')} className="btn-ghost py-1.5 px-3 text-xs">+ Sentarse en Negras</button>
                )}
              </div>
              
              {gameState.status === 'playing' && (
                <div className={`font-mono font-bold text-lg px-4 py-1.5 rounded-xl border ${gameState.turn === 'black' ? 'bg-red-500/20 text-red-400 border-red-500/30' : 'bg-black/50 text-gray-500 border-white/5'}`}>
                  {formatTimer(gameState.timers.black)}
                </div>
              )}
            </div>

            {/* Chess board and border frame */}
            <div className="w-full max-w-[500px] aspect-square bg-[#2b1810] rounded-lg p-3 shadow-2xl border-4 border-[#ca8a04]">
              <div className="w-full h-full grid grid-cols-8 grid-rows-8 bg-amber-950 rounded overflow-hidden">
                {Array.from({ length: 8 }).map((_, rIndex) => {
                  const row = myColor === 'black' ? rIndex : 7 - rIndex
                  
                  return Array.from({ length: 8 }).map((_, cIndex) => {
                    const col = myColor === 'black' ? 7 - cIndex : cIndex
                    const isDarkCell = (row + col) % 2 === 0
                    
                    const cellColor = isDarkCell 
                      ? 'bg-gradient-to-br from-[#5c4033] to-[#452a1e]' 
                      : 'bg-gradient-to-br from-[#f5f5dc] to-[#e4dfd0]'
                    
                    const piece = gameState.board[row][col]
                    const isSelected = selectedCell?.row === row && selectedCell?.col === col
                    const isValidMove = validMoves.some(m => m.row === row && m.col === col)

                    return (
                      <div
                        key={`${row}-${col}`}
                        onClick={() => handleCellClick(row, col)}
                        className={`relative aspect-square flex items-center justify-center cursor-pointer transition-all ${cellColor} ${isSelected ? 'ring-4 ring-yellow-400/80 z-10' : ''}`}
                      >
                        {/* Pieces SVG */}
                        {piece && (
                          <div className="w-full h-full flex items-center justify-center hover:scale-110 transition-transform pointer-events-none select-none">
                            {PIECE_SVGS[piece]}
                          </div>
                        )}

                        {/* Dot indicator for empty valid moves */}
                        {isValidMove && !piece && (
                          <span className="w-4 h-4 rounded-full bg-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse pointer-events-none select-none" />
                        )}

                        {/* Red overlay for enemy piece target under attack */}
                        {isValidMove && piece && (
                          <span className="absolute inset-0 bg-red-500/30 border border-red-500/80 pointer-events-none select-none" />
                        )}
                      </div>
                    )
                  })
                })}
              </div>
            </div>

            {/* Bottom Player */}
            <div className="w-full max-w-[500px] flex items-center justify-between bg-black/40 border border-white/5 rounded-b-2xl p-4">
              <div className="flex items-center gap-3">
                {gameState.white ? (
                  <>
                    <img src={`/avatars/${gameState.white.avatar}.png`} alt="avatar" className="w-10 h-10 rounded-xl" onError={e => e.target.src = '/avatars/tiki1.png'} />
                    <div>
                      <h4 className="text-white font-bold">{gameState.white.nickname}</h4>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-1">
                        <span className="text-[10px] text-amber-400 uppercase tracking-widest font-black">Piezas Blancas</span>
                        {gameState.status === 'playing' && getCapturedPieces().black.length > 0 && (
                          <div className="flex items-center gap-0.5 text-xs text-black/70 bg-white/10 px-1.5 py-0.5 rounded font-serif">
                            {getCapturedPieces().black.map((p, idx) => (
                              <span key={idx}>{PIECE_CHARS[p]}</span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <button onClick={() => sitDown('white')} className="btn-ghost py-1.5 px-3 text-xs">+ Sentarse en Blancas</button>
                )}
              </div>
              
              {gameState.status === 'playing' && (
                <div className={`font-mono font-bold text-lg px-4 py-1.5 rounded-xl border ${gameState.turn === 'white' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' : 'bg-black/50 text-gray-500 border-white/5'}`}>
                  {formatTimer(gameState.timers.white)}
                </div>
              )}
            </div>

            {/* Control buttons */}
            {gameState.status === 'playing' && !isSpectator && (
              <div className="flex items-center gap-4 mt-6">
                <button onClick={resignGame} className="btn-red py-2.5 px-6 text-sm flex items-center gap-2">🏳️ Rendirse</button>
                
                {gameState.drawOfferedBy && gameState.drawOfferedBy !== user.id ? (
                  <button onClick={acceptDraw} className="btn-green py-2.5 px-6 text-sm">🤝 Aceptar Tablas</button>
                ) : (
                  <button onClick={offerDraw} disabled={!!gameState.drawOfferedBy} className="btn-ghost py-2.5 px-6 text-sm">
                     {gameState.drawOfferedBy === user.id ? '⌛ Tablas Ofrecidas' : '🤝 Proponer Tablas'}
                  </button>
                )}
              </div>
            )}

            {gameState.activeBetPool > 0 && (
              <div className="mt-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl px-4 py-2 flex items-center gap-2">
                <span className="text-yellow-400 text-xs font-bold uppercase tracking-wider">🏆 Pozo de Apuestas:</span>
                <span className="text-yellow-300 font-mono font-black">{gameState.activeBetPool.toLocaleString()} C</span>
              </div>
            )}
          </div>

          {/* Right Panel: Tabbed Stats & Chat */}
          <div className="h-[620px] flex flex-col gap-4">
            
            {/* Cyberpunk Game Info & Move History Panel */}
            <div className="glass rounded-3xl p-5 border border-white/5 bg-slate-900/60 flex flex-col gap-4 flex-1 max-h-[260px]">
              <div>
                <h3 className="font-display font-bold text-sm text-white mb-1 uppercase tracking-wider">Tablero de Jugadas</h3>
                {gameState.status === 'playing' ? (
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-tiki-muted">Turno:</span>
                    <span className={`px-2 py-0.5 rounded font-black uppercase text-[10px] ${gameState.turn === 'white' ? 'bg-amber-500/20 text-amber-400' : 'bg-red-500/20 text-red-400'}`}>
                      {gameState.turn === 'white' ? 'Blancas (Tú)' : 'Negras (Tú)'}
                    </span>
                  </div>
                ) : (
                  <span className="text-xs text-tiki-muted italic">Esperando que se inicien los duelos...</span>
                )}
              </div>

              <div className="flex-1 overflow-hidden border border-white/5 rounded-2xl bg-black/40 p-3 flex flex-col">
                <div className="flex justify-between text-[10px] text-tiki-muted font-bold uppercase tracking-wider border-b border-white/10 pb-1 mb-2">
                  <span className="w-1/4">#</span>
                  <span className="w-3/8">Blancas</span>
                  <span className="w-3/8">Negras</span>
                </div>
                {renderMovesHistory()}
              </div>
            </div>

            {/* Chat Panel container */}
            <div className="flex-[2] h-[340px] flex flex-col">
              <ChatPanel roomCode={roomCode} />
            </div>
          </div>
        </div>
      </main>

      {/* Bet Amount Modal */}
      <Modal open={showBetModal} onClose={() => setShowBetModal(false)} title="Establecer Apuesta">
        <div className="space-y-4">
          <p className="text-sm text-tiki-muted">Elegí la cantidad de CALDICOINS que querés apostar. Tu rival deberá igualar esta misma suma para jugar contigo.</p>
          <div className="flex items-center gap-3">
            <input
              type="number"
              className="input flex-1 font-mono"
              value={betAmountInput}
              onChange={e => setBetAmountInput(Math.max(0, parseInt(e.target.value) || 0))}
              min={0}
            />
            <span className="text-xs text-yellow-500">CALDICOINS</span>
          </div>
          <div className="flex gap-2">
            <button onClick={confirmSit} className="btn-primary flex-1 justify-center py-2.5">Confirmar y Sentarse</button>
            <button onClick={() => setShowBetModal(false)} className="btn-ghost px-4 py-2.5">Cancelar</button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
