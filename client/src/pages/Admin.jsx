import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../hooks/useSocket.jsx'
import Navbar from '../components/Navbar.jsx'
import { AvatarSvg } from '../components/AvatarSvg.jsx'
import toast from 'react-hot-toast'

export default function Admin() {
  const { socket } = useSocket()
  
  const [password, setPassword] = useState('')
  const [isAuth, setIsAuth] = useState(false)
  const [activeUsers, setActiveUsers] = useState([])
  const [activeRooms, setActiveRooms] = useState([])
  
  // Announcement input
  const [announcementMsg, setAnnouncementMsg] = useState('')
  // Coins input for specific user
  const [coinsAmount, setCoinsAmount] = useState(500)
  const [globalCoinsAmount, setGlobalCoinsAmount] = useState(1000)

  // Anti-Inspect / DevTools Protection for Admin Panel
  useEffect(() => {
    // 1. Disable right-click context menu
    const handleContextMenu = (e) => e.preventDefault();
    document.addEventListener('contextmenu', handleContextMenu);

    // 2. Disable F12 and standard inspection shortcuts
    const handleKeyDown = (e) => {
      if (
        e.key === 'F12' ||
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
        (e.ctrlKey && e.key === 'U')
      ) {
        e.preventDefault();
        toast.error('Acceso restringido: Inspección deshabilitada.');
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    // 3. Active DevTools Detection (detects dimension thresholds)
    const checkDevTools = setInterval(() => {
      const threshold = 160;
      const widthThreshold = window.outerWidth - window.innerWidth > threshold;
      const heightThreshold = window.outerHeight - window.innerHeight > threshold;
      
      if (widthThreshold || heightThreshold) {
        window.location.href = '/lobby';
        toast.error('DevTools detectado. Redirigiendo...');
      }
    }, 800);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
      clearInterval(checkDevTools);
    };
  }, []);

  useEffect(() => {
    if (!socket) return

    const onAuthSuccess = ({ activeUsers: users, activeRooms: rooms }) => {
      setIsAuth(true)
      setActiveUsers(users || [])
      setActiveRooms(rooms || [])
      toast.success('Acceso concedido — Modo Admin activado 🛠️')
    }

    const onError = ({ message }) => {
      toast.error(message)
    }

    const onActionSuccess = ({ message }) => {
      toast.success(message)
    }

    const onRefresh = () => {
      // Re-trigger auth check to reload the fresh data list
      socket.emit('admin:auth', { password })
    }

    socket.on('admin:auth:success', onAuthSuccess)
    socket.on('admin:error', onError)
    socket.on('admin:action:success', onActionSuccess)
    socket.on('admin:data:refresh', onRefresh)

    return () => {
      socket.off('admin:auth:success', onAuthSuccess)
      socket.off('admin:error', onError)
      socket.off('admin:action:success', onActionSuccess)
      socket.off('admin:data:refresh', onRefresh)
    }
  }, [socket, password])

  const handleLogin = (e) => {
    e.preventDefault()
    if (!socket) return
    socket.emit('admin:auth', { password })
  }

  const giveCoins = (userId) => {
    if (!socket) return
    socket.emit('admin:giveCoins', { password, targetUserId: userId, amount: coinsAmount })
  }

  const takeCoins = (userId) => {
    if (!socket) return
    socket.emit('admin:takeCoins', { password, targetUserId: userId, amount: coinsAmount })
  }

  const giveCoinsAll = () => {
    if (!socket) return
    socket.emit('admin:giveCoinsAll', { password, amount: globalCoinsAmount })
  }

  const closeRoom = (roomCode) => {
    if (!socket) return
    if (window.confirm(`¿Seguro que querés cerrar la sala ${roomCode}?`)) {
      socket.emit('admin:closeRoom', { password, roomCode })
    }
  }

  const closeAllRooms = () => {
    if (!socket) return
    if (window.confirm('¿Seguro que querés cerrar TODAS las salas activas de la plataforma?')) {
      socket.emit('admin:closeAllRooms', { password })
    }
  }

  const wipeAll = () => {
    if (!socket) return
    if (window.confirm('⚠️ WIPE TOTAL ⚠️\nEsta acción borrará todas las salas activas y reseteará los saldos de absolutamente todos los jugadores de la base de datos a 1,000 CALDICOINS.\n¿Estás completamente seguro de proceder?')) {
      socket.emit('admin:wipeAll', { password })
    }
  }

  const sendAnnouncement = (e) => {
    e.preventDefault()
    if (!socket || !announcementMsg.trim()) return
    socket.emit('admin:broadcast', { password, message: announcementMsg })
    setAnnouncementMsg('')
  }

  if (!isAuth) {
    return (
      <div className="min-h-screen flex flex-col bg-black">
        <Navbar />
        <div className="flex-1 flex items-center justify-center px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass max-w-md w-full p-8 rounded-3xl border border-red-500/20 shadow-[0_0_50px_rgba(239,68,68,0.1)] text-center"
          >
            <span className="text-5xl block mb-4">🛠️</span>
            <h1 className="font-display font-black text-2xl text-tiki-text mb-2">
              Panel de Administración
            </h1>
            <p className="text-xs text-tiki-muted mb-6">
              Ingresá la contraseña maestra de seguridad para acceder a los controles.
            </p>

            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="input w-full text-center py-3 text-lg font-mono tracking-widest bg-black/60"
                required
              />
              <button
                type="submit"
                className="btn-primary w-full py-3.5 justify-center font-bold text-base bg-gradient-to-r from-red-600 to-amber-500 hover:shadow-[0_0_20px_rgba(239,68,68,0.4)]"
              >
                Autenticar ⚡
              </button>
            </form>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-8">
        <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-4">
          <div>
            <h1 className="font-display font-black text-3xl text-red-500 tracking-tight flex items-center gap-2">
              <span>🛠️</span> Panel de Control Maestro
            </h1>
            <p className="text-xs text-tiki-muted mt-1 font-mono uppercase">
              Admin Mode: Conectado & Autenticado
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={wipeAll} className="btn-secondary text-red-400 border-red-500/20 hover:bg-red-500/10 text-xs px-4 py-2">
              WIPE COMPLETO ⚠️
            </button>
            <button onClick={closeAllRooms} className="btn-secondary text-orange-400 border-orange-500/20 hover:bg-orange-500/10 text-xs px-4 py-2">
              Cerrar Todas las Salas 📴
            </button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-8">
          {/* Announcement Card */}
          <div className="glass rounded-2xl p-5 md:col-span-2">
            <h3 className="font-display font-bold text-lg mb-2 text-cyan-400 flex items-center gap-2">
              <span>📢</span> Transmitir Anuncio Global
            </h3>
            <p className="text-xs text-tiki-muted mb-4">
              Este mensaje aparecerá en pantalla completa para todos los usuarios en línea inmediatamente (y desaparecerá en 20 segundos).
            </p>
            <form onSubmit={sendAnnouncement} className="flex gap-3">
              <input
                type="text"
                placeholder="Escribí el anuncio aquí..."
                value={announcementMsg}
                onChange={e => setAnnouncementMsg(e.target.value)}
                className="input flex-1 py-3"
                required
              />
              <button type="submit" className="btn-primary px-6 font-bold bg-cyan-600 hover:shadow-cyan-glow">
                Transmitir 🔥
              </button>
            </form>
          </div>

          {/* Quick Balance for All Card */}
          <div className="glass rounded-2xl p-5">
            <h3 className="font-display font-bold text-lg mb-2 text-yellow-400 flex items-center gap-2">
              <span>💰</span> Regalo Global
            </h3>
            <p className="text-xs text-tiki-muted mb-4">
              Agrega esta cantidad de monedas a TODOS los usuarios registrados al mismo tiempo.
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                value={globalCoinsAmount}
                onChange={e => setGlobalCoinsAmount(parseInt(e.target.value) || 0)}
                className="input w-28 font-mono text-center font-bold"
                min={1}
              />
              <button onClick={giveCoinsAll} className="btn-primary flex-1 justify-center font-bold">
                Entregar 🚀
              </button>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Registered Users Table */}
          <div className="glass rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-display font-bold text-lg text-tiki-text flex items-center gap-2">
                <span>👥</span> Cuentas Registradas ({activeUsers.length})
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-tiki-muted font-bold">MONTO ACCIÓN:</span>
                <input
                  type="number"
                  value={coinsAmount}
                  onChange={e => setCoinsAmount(parseInt(e.target.value) || 0)}
                  className="input w-24 py-1 text-center font-mono font-bold text-xs"
                />
              </div>
            </div>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto chat-messages">
              {activeUsers.length === 0 ? (
                <p className="text-center text-tiki-muted py-8 text-sm italic">Ningún jugador registrado...</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-tiki-muted border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <th className="pb-2 font-bold">Usuario</th>
                      <th className="pb-2 font-bold">Estado</th>
                      <th className="pb-2 font-bold">Saldo Actual</th>
                      <th className="pb-2 font-bold text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeUsers.map(u => (
                      <tr key={u.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 flex items-center gap-2">
                          <AvatarSvg name={u.avatar || 'tiki1'} size={24} />
                          <span className="font-semibold text-white">{u.nickname}</span>
                        </td>
                        <td className="py-3">
                          {u.isOnline ? (
                            <span className="inline-flex items-center gap-1 bg-green-500/10 border border-green-500/20 text-green-400 font-bold px-2 py-0.5 rounded text-[10px]">
                              🟢 Online
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-white/5 border border-white/10 text-tiki-muted font-bold px-2 py-0.5 rounded text-[10px]">
                              ⚪ Offline
                            </span>
                          )}
                        </td>
                        <td className="py-3 font-mono font-black text-yellow-400">
                          {u.balance.toLocaleString()} CALDICOINS
                        </td>
                        <td className="py-3 text-right space-x-1">
                          <button
                            onClick={() => giveCoins(u.id)}
                            className="bg-green-600/20 text-green-400 hover:bg-green-600/30 font-bold px-2.5 py-1 rounded-lg border border-green-500/20 cursor-pointer"
                          >
                            +{coinsAmount}
                          </button>
                          <button
                            onClick={() => takeCoins(u.id)}
                            className="bg-red-600/20 text-red-400 hover:bg-red-600/30 font-bold px-2.5 py-1 rounded-lg border border-red-500/20 cursor-pointer"
                          >
                            -{coinsAmount}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Active Rooms Table */}
          <div className="glass rounded-2xl p-6">
            <h3 className="font-display font-bold text-lg text-tiki-text flex items-center gap-2 mb-4">
              <span>🏠</span> Salas Activas ({activeRooms.length})
            </h3>

            <div className="overflow-x-auto max-h-[400px] overflow-y-auto chat-messages">
              {activeRooms.length === 0 ? (
                <p className="text-center text-tiki-muted py-8 text-sm italic">No hay salas creadas en este momento...</p>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="text-tiki-muted border-b border-white/5 uppercase tracking-wider text-[10px]">
                      <th className="pb-2 font-bold">Código</th>
                      <th className="pb-2 font-bold">Nombre</th>
                      <th className="pb-2 font-bold text-center">Miembros</th>
                      <th className="pb-2 font-bold text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody>
                    {activeRooms.map(r => (
                      <tr key={r.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="py-3 font-mono font-black text-cyan-400">
                          {r.code}
                        </td>
                        <td className="py-3 font-semibold text-white">
                          {r.name}
                        </td>
                        <td className="py-3 font-semibold text-center text-tiki-muted">
                          {r.members?.length || 0}
                        </td>
                        <td className="py-3 text-right">
                          <button
                            onClick={() => closeRoom(r.code)}
                            className="bg-red-500/10 text-red-400 hover:bg-red-500/20 font-bold px-3 py-1 rounded-lg border border-red-500/20"
                          >
                            Cerrar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
