import { createContext, useContext, useState, useEffect, useCallback } from 'react'
import api from '../lib/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchMe = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
    } catch {
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchMe() }, [fetchMe])

  const login = async (nickname, password) => {
    const { data } = await api.post('/auth/login', { nickname, password })
    setUser(data.user)
    return data
  }

  const register = async (formData) => {
    const { data } = await api.post('/auth/register', { ...formData })
    setUser(data.user) // auto-logged in on register
    return data
  }

  const logout = async () => {
    await api.post('/auth/logout')
    setUser(null)
  }

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get('/auth/me')
      setUser(data.user)
      return data.user
    } catch { return null }
  }, [])

  const updateBalance = (newBalance) => {
    setUser(prev => prev ? { ...prev, balance: newBalance } : prev)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser, updateBalance }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}

function getDeviceId() {
  let id = localStorage.getItem('tiki_did')
  if (!id) {
    id = Math.random().toString(36).slice(2) + Date.now().toString(36)
    localStorage.setItem('tiki_did', id)
  }
  return id
}
