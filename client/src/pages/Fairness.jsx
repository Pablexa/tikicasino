import { Link } from 'react-router-dom'
import Navbar from '../components/Navbar.jsx'

export default function Fairness() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-3xl mx-auto w-full px-4 py-10 space-y-8">
        <div className="text-center mb-8">
          <h1 className="font-display font-black text-4xl gradient-text mb-3">Fairness & Transparency</h1>
          <p className="text-tiki-muted">How TikiCasino randomness works — for educational purposes only</p>
        </div>

        {[
          {
            title: 'This is a Simulation',
            body: 'TikiCasino is a social entertainment simulator. All games use fictional CALDICOINS with no real-world value. There is no real gambling, no real money, and no real prizes. This platform exists purely for social fun between friends.',
            accent: 'border-yellow-500/30 bg-yellow-500/5',
          },
          {
            title: 'Random Number Generation',
            body: 'All game outcomes are generated using Node.js\'s built-in crypto.randomBytes() function on the server. This provides cryptographically strong pseudo-random numbers, far better than Math.random(). The client never controls or influences the outcome — all results are calculated server-side.',
            accent: 'border-cyan-500/30 bg-cyan-500/5',
          },
          {
            title: 'Server-Side Validation',
            body: 'Every bet, cashout, and game action is validated on the server. The client only displays state — it cannot cheat, manipulate bets, or influence outcomes. Saldo changes only happen on the backend with proper transaction records.',
            accent: 'border-green-500/30 bg-green-500/5',
          },
          {
            title: 'House Edge Simulation',
            body: 'Like real casino games, TikiCasino simulates a small house edge for entertainment realism:\n• Crash: ~4% theoretical house edge\n• Dice: ~2% house edge\n• Roulette: European single-zero (2.7% theoretical)\n• Slots: Random weighted symbols\n\nRemember: these are fictional points. There is no real economic impact.',
            accent: 'border-violet-500/30 bg-violet-500/5',
          },
          {
            title: 'No Real Money',
            body: 'CALDICOINS cannot be bought, sold, transferred for money, deposited, withdrawn, or exchanged for anything of real value. There are no payment gateways, no crypto wallets, and no real financial transactions of any kind. Any attempt to buy or sell CALDICOINS outside the platform is a scam and not affiliated with TikiCasino.',
            accent: 'border-red-500/30 bg-red-500/5',
          },
        ].map(section => (
          <div key={section.title} className={`glass rounded-2xl p-6 border ${section.accent}`}>
            <h2 className="font-display font-bold text-xl text-tiki-text mb-3">{section.title}</h2>
            {section.body.split('\n').map((line, i) => (
              <p key={i} className={`text-tiki-muted leading-relaxed ${i > 0 ? 'mt-1' : ''} ${line.startsWith('•') ? 'ml-4' : ''}`}>
                {line}
              </p>
            ))}
          </div>
        ))}

        <div className="text-center">
          <Link to="/" className="btn-ghost text-sm py-2 px-6">← Volver to Inicio</Link>
        </div>
      </main>
    </div>
  )
}
