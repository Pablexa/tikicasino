# TikiCasino

> **Play fake. Win fake. Flex real.**

TikiCasino is a **social fake casino simulator** — a multiplayer arcade for you and your friends using fictional **FCOINS** points with zero real-world value.

---

## ⚠️ DISCLAIMER

> This is a fake casino simulator. FCOINS have no real value. No real money, crypto, deposits, or withdrawals are supported. FCOINS are fictional points that cannot be bought, sold, exchanged, or converted into anything of real value.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite + TailwindCSS + Framer Motion |
| Backend | Node.js + Express + Socket.IO |
| Auth | JWT (httpOnly cookies) + bcrypt |
| Database | Prisma ORM → SQLite (dev) / PostgreSQL (prod) |
| Realtime | Socket.IO (self-hosted) |
| Email | Nodemailer / Brevo SMTP (dev: console log) |

## Games

- **Blackjack** — Hit, Stand, Double against the dealer
- **European Roulette** — Full bet types (straight, red/black, dozens, columns)
- **Slots** — 5-reel, 3-row with weighted symbols and jackpot
- **Crash** — Live multiplier, bet and cashout before the crash
- **Coinflip** — Heads or tails, 2× payout
- **Dice** — Roll higher/lower with dynamic multipliers

---

## Quick Start

### 1. Install dependencies

```bash
cd TIKICASINO
npm install
```

### 2. Setup the database

```bash
cd server
npx prisma generate
npx prisma db push
```

This creates a local SQLite database at `server/prisma/dev.db`.

### 3. Run in development

```bash
# From project root:
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3001

### 4. Register and verify

1. Go to http://localhost:5173/register
2. Create an account
3. Check the **server console** for your verification token (dev mode — no email needed!)
4. Go to http://localhost:5173/verify-email and paste the token
5. Receive 10,000 FCOINS and start playing!

---

## Development Mode (No Email Required)

When `SMTP_HOST` / `SMTP_USER` / `SMTP_PASS` are not set, verification tokens are **printed to the server console** instead of emailed. This is the default for local development.

Example console output:
```
========================================
DEV MODE: Email Verification
Email: user@example.com
Token: a3f9b2c8d1e4...
Verification URL: http://localhost:5173/verify-email?token=a3f9b2c8...
========================================
```

---

## Environment Variables

Copy `server/.env.example` to `server/.env`:

```env
PORT=3001
NODE_ENV=development
APP_URL=http://localhost:5173
JWT_SECRET=your-long-random-secret
COOKIE_SECRET=your-cookie-secret

# Optional: PostgreSQL for production
# DATABASE_URL=postgresql://user:pass@host:5432/tikicasino

# Optional: Email (Brevo SMTP or other)
# EMAIL_PROVIDER=smtp
# SMTP_HOST=smtp.brevo.com
# SMTP_PORT=587
# SMTP_USER=your-brevo-email
# SMTP_PASS=your-brevo-api-key
```

---

## Deploy to Render (Free)

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial TikiCasino commit"
git remote add origin https://github.com/YOUR_USERNAME/tikicasino.git
git push -u origin main
```

### 2. Create Render Web Service

1. Go to [render.com](https://render.com) → New → Web Service
2. Connect your GitHub repo
3. Settings:
   - **Build Command:** `npm install && cd client && npm install && npm run build && cd ../server && npm install && npx prisma generate && npx prisma db push`
   - **Start Command:** `cd server && npm start`
   - **Root Directory:** (leave empty)

### 3. Set Environment Variables on Render

```
NODE_ENV=production
JWT_SECRET=<generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
COOKIE_SECRET=<another random secret>
APP_URL=https://your-app.onrender.com
DATABASE_URL=<Render PostgreSQL URL or leave empty for SQLite>
```

### 4. Optional: Add Render PostgreSQL

1. Render Dashboard → New → PostgreSQL (free tier)
2. Copy the **Internal Database URL**
3. Add as `DATABASE_URL` environment variable
4. Change `server/prisma/schema.prisma` provider from `"sqlite"` to `"postgresql"`

---

## Project Structure

```
TIKICASINO/
├── client/                 # React frontend
│   └── src/
│       ├── components/     # Shared UI components
│       ├── hooks/          # Auth + Socket contexts
│       ├── lib/            # Axios API client
│       ├── pages/          # All page components
│       │   └── games/      # Individual game pages
│       └── styles/         # Global CSS
├── server/                 # Express backend
│   ├── prisma/             # Database schema
│   └── src/
│       ├── db/             # Prisma client
│       ├── games/          # Game engines (blackjack, roulette, etc.)
│       ├── middleware/      # Auth, rate limiting, error handler
│       ├── routes/         # REST API routes
│       ├── sockets/        # Socket.IO handlers
│       └── utils/          # Email service
└── shared/                 # Shared constants and types
```

---

## FCOINS System

| Event | Amount |
|-------|--------|
| Email verified (welcome bonus) | +10,000 |
| Daily bonus (Day 1) | +2,000 |
| Daily bonus (Day 7 streak) | +10,000 |
| Emergency refill (balance < 500) | +1,000 |
| Emergency refill cooldown | 30 min |

---

## License

MIT — for entertainment only. Not for real gambling.
