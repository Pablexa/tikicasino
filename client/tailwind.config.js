/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        tiki: {
          bg: '#060d08',
          surface: '#0a1510',
          card: '#0f1f15',
          border: '#1a3022',
          // Primary accent — green
          green: '#22c55e',
          'green-glow': '#4ade80',
          // Secondary — lime/yellow-green
          lime: '#84cc16',
          'lime-glow': '#a3e635',
          // Tertiary — emerald
          emerald: '#10b981',
          // Keep violet for contrast
          violet: '#8b5cf6',
          'violet-glow': '#a78bfa',
          // Status colors
          gold: '#f59e0b',
          'gold-glow': '#fbbf24',
          red: '#ef4444',
          'red-glow': '#f87171',
          // Text
          text: '#f0fdf4',
          muted: '#4d7a5a',
          subtle: '#1a3022',
        },
      },
      backgroundImage: {
        'tiki-gradient': 'linear-gradient(135deg, #060d08 0%, #0a1510 100%)',
        'green-gradient': 'linear-gradient(135deg, #22c55e, #84cc16)',
        'gold-gradient': 'linear-gradient(135deg, #f59e0b, #ef4444)',
        'emerald-gradient': 'linear-gradient(135deg, #10b981, #22c55e)',
        'card-gradient': 'linear-gradient(135deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        'green-glow': '0 0 20px rgba(34, 197, 94, 0.35)',
        'green-glow-lg': '0 0 40px rgba(34, 197, 94, 0.5)',
        'lime-glow': '0 0 20px rgba(132, 204, 22, 0.3)',
        'violet-glow': '0 0 20px rgba(139, 92, 246, 0.3)',
        'gold-glow': '0 0 20px rgba(245, 158, 11, 0.3)',
        'red-glow': '0 0 20px rgba(239, 68, 68, 0.3)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.5)',
        'card-hover': '0 8px 32px rgba(0, 0, 0, 0.7)',
      },
      animation: {
        'pulse-slow': 'pulse 3s ease-in-out infinite',
        'float': 'float 6s ease-in-out infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'spin-slow': 'spin 8s linear infinite',
        'bounce-slow': 'bounce 2s ease-in-out infinite',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        glow: {
          '0%': { textShadow: '0 0 10px rgba(34,197,94,0.5)' },
          '100%': { textShadow: '0 0 30px rgba(34,197,94,0.9), 0 0 60px rgba(132,204,22,0.4)' },
        },
        slideUp: {
          from: { transform: 'translateY(20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        slideDown: {
          from: { transform: 'translateY(-20px)', opacity: 0 },
          to: { transform: 'translateY(0)', opacity: 1 },
        },
        fadeIn: {
          from: { opacity: 0 },
          to: { opacity: 1 },
        },
        scaleIn: {
          from: { transform: 'scale(0.95)', opacity: 0 },
          to: { transform: 'scale(1)', opacity: 1 },
        },
      },
    },
  },
  plugins: [],
}
