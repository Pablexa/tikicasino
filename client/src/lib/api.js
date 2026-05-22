import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Only redirect if not already on auth pages
      const path = window.location.pathname
      if (!['/login', '/register', '/'].includes(path)) {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
