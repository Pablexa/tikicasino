// TikiCasino SVG Avatar components
// 8 unique tiki-style avatars using only SVG - no images, no external services

export const AVATAR_LIST = ['tiki1','tiki2','tiki3','tiki4','tiki5','tiki6','tiki7','tiki8']

const defs = (id, c1, c2) => `
  <defs>
    <linearGradient id="g${id}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${c1}"/>
      <stop offset="100%" stop-color="${c2}"/>
    </linearGradient>
  </defs>
`

export const AVATARS = {
  tiki1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('1','#06b6d4','#8b5cf6')}
    <circle cx="40" cy="40" r="38" fill="url(#g1)"/>
    <ellipse cx="28" cy="34" rx="5" ry="6" fill="#0f172a"/>
    <ellipse cx="52" cy="34" rx="5" ry="6" fill="#0f172a"/>
    <circle cx="29" cy="32" r="2" fill="#22d3ee"/>
    <circle cx="53" cy="32" r="2" fill="#22d3ee"/>
    <rect x="32" y="42" width="16" height="5" rx="2.5" fill="#0f172a" opacity="0.5"/>
    <path d="M26 54 Q40 64 54 54" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M20 15 L25 6 L30 14 L40 4 L50 14 L55 6 L60 15Z" fill="url(#g1)"/>
  </svg>`,

  tiki2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('2','#f59e0b','#ef4444')}
    <circle cx="40" cy="40" r="38" fill="url(#g2)"/>
    <rect x="24" y="28" width="10" height="12" rx="3" fill="#0f172a"/>
    <rect x="46" y="28" width="10" height="12" rx="3" fill="#0f172a"/>
    <circle cx="29" cy="33" r="2.5" fill="#fbbf24"/>
    <circle cx="51" cy="33" r="2.5" fill="#fbbf24"/>
    <path d="M30 48 L40 56 L50 48" stroke="#0f172a" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
    <circle cx="40" cy="20" r="8" fill="#0f172a" opacity="0.3"/>
    <circle cx="40" cy="20" r="5" fill="#fbbf24"/>
  </svg>`,

  tiki3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('3','#10b981','#06b6d4')}
    <circle cx="40" cy="40" r="38" fill="url(#g3)"/>
    <polygon points="28,28 34,42 22,42" fill="#0f172a"/>
    <polygon points="52,28 58,42 46,42" fill="#0f172a"/>
    <circle cx="28" cy="36" r="3" fill="#34d399"/>
    <circle cx="52" cy="36" r="3" fill="#34d399"/>
    <ellipse cx="40" cy="52" rx="10" ry="6" fill="#0f172a" opacity="0.4"/>
    <ellipse cx="40" cy="50" rx="8" ry="4" fill="#0f172a" opacity="0.6"/>
    <path d="M18 38 L12 36 L18 40Z" fill="url(#g3)"/>
    <path d="M62 38 L68 36 L62 40Z" fill="url(#g3)"/>
  </svg>`,

  tiki4: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('4','#8b5cf6','#ec4899')}
    <circle cx="40" cy="40" r="38" fill="url(#g4)"/>
    <ellipse cx="28" cy="33" rx="6" ry="7" fill="#0f172a"/>
    <ellipse cx="52" cy="33" rx="6" ry="7" fill="#0f172a"/>
    <circle cx="28" cy="31" r="2.5" fill="#a78bfa"/>
    <circle cx="52" cy="31" r="2.5" fill="#a78bfa"/>
    <rect x="30" y="44" width="20" height="6" rx="3" fill="#0f172a" opacity="0.5"/>
    <path d="M24 54 Q40 66 56 54" stroke="#0f172a" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M22 14 Q40 4 58 14 L56 20 Q40 12 24 20Z" fill="#0f172a" opacity="0.3"/>
  </svg>`,

  tiki5: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('5','#ef4444','#f59e0b')}
    <circle cx="40" cy="40" r="38" fill="url(#g5)"/>
    <rect x="22" y="26" width="12" height="14" rx="6" fill="#0f172a"/>
    <rect x="46" y="26" width="12" height="14" rx="6" fill="#0f172a"/>
    <circle cx="28" cy="31" r="3" fill="#f87171"/>
    <circle cx="52" cy="31" r="3" fill="#f87171"/>
    <path d="M28 48 Q40 58 52 48" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="35" y="20" width="10" height="4" rx="2" fill="#0f172a" opacity="0.4"/>
    <line x1="20" y1="36" x2="12" y2="32" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
    <line x1="60" y1="36" x2="68" y2="32" stroke="#0f172a" stroke-width="3" stroke-linecap="round"/>
  </svg>`,

  tiki6: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('6','#06b6d4','#10b981')}
    <rect x="8" y="8" width="64" height="64" rx="20" fill="url(#g6)"/>
    <ellipse cx="28" cy="32" rx="5" ry="6" fill="#0f172a"/>
    <ellipse cx="52" cy="32" rx="5" ry="6" fill="#0f172a"/>
    <circle cx="29" cy="30" r="2" fill="#22d3ee"/>
    <circle cx="53" cy="30" r="2" fill="#22d3ee"/>
    <rect x="31" y="42" width="18" height="5" rx="2.5" fill="#0f172a" opacity="0.5"/>
    <path d="M25 52 Q40 62 55 52" stroke="#0f172a" stroke-width="3" stroke-linecap="round" fill="none"/>
    <rect x="28" y="12" width="24" height="6" rx="3" fill="#0f172a" opacity="0.3"/>
  </svg>`,

  tiki7: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('7','#7c3aed','#06b6d4')}
    <circle cx="40" cy="40" r="38" fill="url(#g7)"/>
    <path d="M22 28 L34 28 L34 44 L22 44Z" rx="4" fill="#0f172a"/>
    <path d="M46 28 L58 28 L58 44 L46 44Z" rx="4" fill="#0f172a"/>
    <circle cx="28" cy="36" r="3" fill="#7c3aed"/>
    <circle cx="52" cy="36" r="3" fill="#7c3aed"/>
    <path d="M26 50 L40 60 L54 50 L54 56 L40 66 L26 56Z" fill="#0f172a" opacity="0.4"/>
    <circle cx="40" cy="18" r="6" fill="#0f172a" opacity="0.4"/>
    <path d="M34 18 L40 10 L46 18Z" fill="#7c3aed"/>
  </svg>`,

  tiki8: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80">
    ${defs('8','#f59e0b','#8b5cf6')}
    <circle cx="40" cy="40" r="38" fill="url(#g8)"/>
    <ellipse cx="28" cy="33" rx="6" ry="7" fill="#0f172a"/>
    <ellipse cx="52" cy="33" rx="6" ry="7" fill="#0f172a"/>
    <circle cx="28" cy="31" r="2.5" fill="#fbbf24"/>
    <circle cx="52" cy="31" r="2.5" fill="#fbbf24"/>
    <path d="M26 48 Q40 58 54 48 L52 54 Q40 64 28 54Z" fill="#0f172a" opacity="0.5"/>
    <path d="M18 10 L22 2 L26 10 L32 4 L36 10 L40 3 L44 10 L48 4 L52 10 L58 2 L62 10Z" fill="url(#g8)" opacity="0.8"/>
  </svg>`,
}

export function AvatarSvg({ name = 'tiki1', size = 40, className = '' }) {
  const svg = AVATARS[name] || AVATARS.tiki1
  return (
    <div
      className={`rounded-full overflow-hidden flex-shrink-0 ${className}`}
      style={{ width: size, height: size }}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
