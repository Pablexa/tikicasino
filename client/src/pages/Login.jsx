import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useAuth } from '../hooks/useAuth.jsx'
import toast from 'react-hot-toast'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ nickname: '', password: '' })
  const [loading, setLoading] = useState(false)

  const set = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      await login(form.nickname, form.password)
      toast.success('¡Bienvenido de vuelta!')
      navigate('/lobby')
    } catch (err) {
      toast.error(err.response?.data?.error || 'Usuario o contraseña incorrectos.')
    } finally { setLoading(false) }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-4">
            <img src="/icon.png" alt="TikiCasino" className="w-10 h-10 rounded-xl object-cover" />
            <span className="font-display font-bold text-2xl gradient-text">TikiCasino</span>
          </Link>
          <h1 className="font-display font-bold text-2xl text-tiki-text">Bienvenido</h1>
          <p className="text-tiki-muted text-sm mt-1">Entrá a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit} className="glass-heavy rounded-3xl p-7 space-y-5">
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Usuario</label>
            <input className="input" type="text" placeholder="TuUsuario"
              value={form.nickname} onChange={set('nickname')} required />
          </div>
          <div>
            <label className="text-xs font-semibold text-tiki-muted uppercase tracking-wide block mb-1.5">Contraseña</label>
            <input className="input" type="password" placeholder="Tu contraseña"
              value={form.password} onChange={set('password')} required />
          </div>

          <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3.5 text-base">
            {loading ? <span className="spinner scale-75" /> : 'Entrar'}
          </button>

          <p className="text-center text-sm text-tiki-muted">
            ¿No tenés cuenta? <Link to="/register" className="text-tiki-green hover:underline font-medium">Registrarse gratis</Link>
          </p>
        </form>
      </motion.div>
    </div>
  )
}
