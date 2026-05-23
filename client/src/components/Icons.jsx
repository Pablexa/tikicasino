// TikiCasino SVG Icon Library
// All icons as inline SVG components - no external libraries

export function IconCoin({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="#fbbf24" strokeWidth="2"/>
      <circle cx="12" cy="12" r="7" fill="rgba(251,191,36,0.15)" stroke="#fbbf24" strokeWidth="1"/>
      <text x="12" y="15.5" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#fbbf24" fontFamily="Inter" dominantBaseline="central">C</text>
    </svg>
  )
}

export function IconCards({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="5" width="12" height="16" rx="2" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5"/>
      <rect x="8" y="3" width="12" height="16" rx="2" fill="rgba(6,182,212,0.2)" stroke="#06b6d4" strokeWidth="1.5"/>
      <text x="14" y="14" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#06b6d4" fontFamily="Inter">A</text>
    </svg>
  )
}

export function IconDice({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="4" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1.5"/>
      <circle cx="8" cy="8" r="1.5" fill="#10b981"/>
      <circle cx="16" cy="8" r="1.5" fill="#10b981"/>
      <circle cx="12" cy="12" r="1.5" fill="#10b981"/>
      <circle cx="8" cy="16" r="1.5" fill="#10b981"/>
      <circle cx="16" cy="16" r="1.5" fill="#10b981"/>
    </svg>
  )
}

export function IconRocket({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2C12 2 8 6 8 12H16C16 6 12 2 12 2Z" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="9" y="11" width="6" height="8" rx="1" fill="rgba(239,68,68,0.15)" stroke="#ef4444" strokeWidth="1.5"/>
      <path d="M9 13H6L7 19H9" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M15 13H18L17 19H15" fill="rgba(239,68,68,0.2)" stroke="#ef4444" strokeWidth="1" strokeLinejoin="round"/>
      <circle cx="12" cy="8" r="1.5" fill="#ef4444"/>
    </svg>
  )
}

export function IconSlots({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="2" y="4" width="20" height="16" rx="3" fill="rgba(245,158,11,0.15)" stroke="#f59e0b" strokeWidth="1.5"/>
      <rect x="5" y="7" width="4" height="10" rx="1" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1"/>
      <rect x="10" y="7" width="4" height="10" rx="1" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1"/>
      <rect x="15" y="7" width="4" height="10" rx="1" fill="rgba(245,158,11,0.2)" stroke="#f59e0b" strokeWidth="1"/>
      <text x="7" y="15" textAnchor="middle" fontSize="6" fill="#fbbf24" fontFamily="Inter">7</text>
      <text x="12" y="15" textAnchor="middle" fontSize="6" fill="#fbbf24" fontFamily="Inter">7</text>
      <text x="17" y="15" textAnchor="middle" fontSize="6" fill="#fbbf24" fontFamily="Inter">7</text>
    </svg>
  )
}

export function IconRoulette({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" fill="rgba(16,185,129,0.1)" stroke="#10b981" strokeWidth="1.5"/>
      <circle cx="12" cy="12" r="6" fill="rgba(16,185,129,0.15)" stroke="#10b981" strokeWidth="1"/>
      <circle cx="12" cy="12" r="2" fill="#10b981"/>
      <line x1="12" y1="2" x2="12" y2="6" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="12" y1="18" x2="12" y2="22" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="2" y1="12" x2="6" y2="12" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
      <line x1="18" y1="12" x2="22" y2="12" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconCoinFlip({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <ellipse cx="12" cy="12" rx="8" ry="10" fill="rgba(6,182,212,0.15)" stroke="#06b6d4" strokeWidth="1.5"/>
      <ellipse cx="12" cy="10" rx="8" ry="2" fill="rgba(6,182,212,0.3)" stroke="#06b6d4" strokeWidth="1"/>
      <text x="12" y="13.5" textAnchor="middle" fontSize="7" fontWeight="bold" fill="#22d3ee" fontFamily="Inter" dominantBaseline="central">C</text>
    </svg>
  )
}

export function IconPoker({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 3L14.5 8.5L21 9.5L16.5 14L17.5 21L12 18L6.5 21L7.5 14L3 9.5L9.5 8.5L12 3Z" fill="rgba(139,92,246,0.2)" stroke="#8b5cf6" strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconHome({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M3 12L12 3L21 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M5 10V20H10V15H14V20H19V10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconUsers({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="9" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 21V17C3 15.3 4.3 14 6 14H12C13.7 14 15 15.3 15 17V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <circle cx="17" cy="7" r="3" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M21 21V17C21 15.5 20 14.2 18.5 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  )
}

export function IconTrophy({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M6 4H18V12C18 15.3 15.3 18 12 18C8.7 18 6 15.3 6 12V4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
      <path d="M6 6H3C3 6 2 10 6 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M18 6H21C21 6 22 10 18 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M12 18V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M8 21H16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconUser({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="2"/>
      <path d="M4 20C4 16.7 7.6 14 12 14C16.4 14 20 16.7 20 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconLogout({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M15 3H19C19.6 3 20 3.4 20 4V20C20 20.6 19.6 21 19 21H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M10 17L15 12L10 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <line x1="15" y1="12" x2="3" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconPlus({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconKey({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="8" cy="12" r="5" stroke="currentColor" strokeWidth="2"/>
      <path d="M13 12H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M19 12V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <path d="M17 12V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconSend({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M22 2L11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M22 2L15 22L11 13L2 9L22 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconCopy({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="9" y="9" width="13" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M5 15H4C2.9 15 2 14.1 2 13V4C2 2.9 2.9 2 4 2H13C14.1 2 15 2.9 15 4V5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconStar({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconCheck({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="20 6 9 17 4 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconX({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconSettings({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 2V5M12 19V22M4.2 4.2L6.3 6.3M17.7 17.7L19.8 19.8M2 12H5M19 12H22M4.2 19.8L6.3 17.7M17.7 6.3L19.8 4.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconInfo({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
      <line x1="12" y1="8" x2="12" y2="8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      <line x1="12" y1="12" x2="12" y2="16" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  )
}

export function IconChevronRight({ size = 16, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polyline points="9 18 15 12 9 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconShield({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <path d="M12 2L4 6V12C4 16.4 7.4 20.5 12 22C16.6 20.5 20 16.4 20 12V6L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconGift({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <rect x="3" y="9" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2"/>
      <path d="M3 13H21" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 9V22" stroke="currentColor" strokeWidth="2"/>
      <path d="M12 9C12 9 9 9 9 6.5C9 5.1 10.1 4 12 4C13.9 4 15 5.1 15 6.5C15 9 12 9 12 9Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}

export function IconZap({ size = 20, className = '' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" className={className}>
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  )
}
