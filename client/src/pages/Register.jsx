import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import { AvatarSvg, AVATAR_LIST } from '../components/AvatarSvg.jsx'
import toast from 'react-hot-toast'

export default function Register() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nickname: '', password: '', confirmPassword: '', avatar: 'tiki1' })
  const [loading, setLoading] = useState(false)

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) { toast.error('Las contraseñas no coinciden'); return }
    if (form.password.length < 6) { toast.error('La contraseña debe tener al menos 6 caracteres'); return }
    setLoading(true)
    try {
      await register({ nickname: form.nickname, password: form.password, avatar: form.avatar })
      toast.success('¡Cuenta creada! Recibiste 10.000 CALDICOINS')
      navigate('/lobby')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Error al registrarse.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/icon.png" alt="TikiCasino" className="w-10 h-10 rounded-xl object-cover" />
            <span className="font-display font-bold text-2xl gradient-text">TikiCasino</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-tiki-text">Crear cuenta</h1>
          <p className="text-tiki-muted text-sm mt-1">Una cuenta por persona. Se detecta la IP.</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-heavy rounded-3xl p-7 space-y-5">
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Nombre de usuario</label>
            <input className="input" type="text" placeholder="JugadorEpico99"
              value={form.nickname} onChange={set('nickname')}
              required minLength={3} maxLength={20}
              pattern="[a-zA-Z0-9_]+" title="Solo letras, números y guiones bajos" />
          </div>
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Contraseña</label>
            <input className="input" type="password" placeholder="Mínimo 6 caracteres"
              value={form.password} onChange={set('password')} required minLength={6} />
          </div>
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Repetir contraseña</label>
            <input className="input" type="password" placeholder="Repetí la contraseña"
              value={form.confirmPassword} onChange={set('confirmPassword')} required />
          </div>

          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-3">Elegí tu avatar</label>
            <div className="grid grid-cols-4 gap-2">
              {AVATAR_LIST.map(av => (
                <button key={av} type="button" onClick={() => setForm(f => ({ ...f, avatar: av }))}
                  className={`p-2 rounded-xl transition-all border-2 ${form.avatar === av ? 'border-tiki-green bg-tiki-green/10' : 'border-transparent hover:border-tiki-green/20'}`}>
                  <AvatarSvg name={av} size={48} />
                </button>
              ))}
            </div>
          </div>

          <button type="submit" disabled={loading || !form.nickname || !form.password}
            className="btn-primary w-full justify-center py-3.5 text-base">
            {loading ? <span className="spinner scale-75" /> : 'Crear cuenta — gratis'}
          </button>

          <p className="text-center text-sm text-tiki-muted">
            ¿Ya tenés cuenta? <Link to="/login" className="text-tiki-green hover:underline font-medium">Entrar</Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
