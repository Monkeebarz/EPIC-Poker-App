# EPIC Poker App

A multi-layer real-time multiplayer poker platform with provably fair game mechanics and customizable table/chip themes.

## Architecture Overview

### Layer 1: Frontend
- **Framework:** Next.js + React + Tailwind CSS
- **Real-time:** Socket.io client
- **Auth:** NextAuth.js / Auth.js

### Layer 2: Real-Time Engine
- **Server:** Node.js + Socket.io
- **Purpose:** Live card dealing, turn timers, chat, game state sync

### Layer 3: Backend API
- **Framework:** Express.js (Node.js)
- **Purpose:** Auth, accounts, game logic, payouts

### Layer 4: Database
- **MongoDB:** Player profiles, game history, customization themes
- **Redis:** Active game state, timers, session management

### Layer 5: Authorization
- **NextAuth.js / Auth.js:** Email, Google, Facebook, Discord, X OAuth

### Layer 6: Hosting
- **Frontend:** Vercel
- **Backend/WebSocket:** AWS EC2 / DigitalOcean

### Layer 7: Payments
- **Stripe:** Subscriptions, credits

### Layer 8: Chips/Credits
- **In-app credit system** (play chips)

---

## Project Structure

```
EPIC-Poker-App/
├── frontend/              # Next.js app (Layer 1)
│   ├── app/
│   ├── components/
│   ├── pages/
│   └── public/
├── backend/               # Express API (Layer 3)
│   ├── routes/
│   ├── middleware/
│   ├── models/
│   └── utils/
├── shared/                # Shared poker logic
│   ├── poker-engine/
│   ├── types/
│   └── constants/
├── realtime/              # Socket.io server (Layer 2)
│   ├── handlers/
│   └── events/
├── docs/                  # Architecture & design docs
└── docker-compose.yml     # Local MongoDB + Redis
```

---

## Phases & Progress

### Phase 0: Foundation (Current)
- [x] Repo structure & README
- [ ] Basic Next.js frontend
- [ ] Basic Express backend
- [ ] MongoDB connection
- [ ] Basic auth (email signup/login)
- [ ] User schema
- [ ] Poker engine skeleton

### Phase 1: Core Game Logic (Next)
- [ ] Hand evaluation engine
- [ ] Seeded shuffle (provably fair)
- [ ] Table component (React)
- [ ] Socket.io real-time sync
- [ ] Game flow (preflop → showdown)
- [ ] Turn timers & pot calculation

### Phase 2: Customization
- [ ] Theme system (felt, cards, chips)
- [ ] User profile customization UI
- [ ] MongoDB theme persistence
- [ ] SVG chip builder

### Phase 3: Monetization & Polish
- [ ] Stripe integration
- [ ] Social logins (OAuth)
- [ ] Deployment (Vercel + EC2/DO)
- [ ] Game lobbies & matchmaking

---

## Getting Started

```bash
# Clone repo
git clone https://github.com/Monkeebarz/EPIC-Poker-App.git
cd EPIC-Poker-App

# Install dependencies (both frontend and backend)
npm install --prefix frontend
npm install --prefix backend

# Start local dev
npm run dev:frontend  # Terminal 1
npm run dev:backend   # Terminal 2
```

---

## Tech Stack Summary

| Layer | Tech | Why |
|-------|------|-----|
| Frontend | Next.js + React + Tailwind | Component-based, easy customization |
| Real-time | Socket.io | WebSocket for live updates |
| API | Express.js | Auth, game logic, payouts |
| Database | MongoDB + Redis | MongoDB for persistence, Redis for live state |
| Auth | NextAuth.js | Email + 5 OAuth providers |
| Hosting | Vercel + EC2/DO | Vercel for frontend, persistent server for WebSocket |
| Payments | Stripe | Subscriptions & credits |

---

## Environment Setup

### Prerequisites
- Node.js 18+
- MongoDB (local or MongoDB Atlas)
- Redis (local or Redis Cloud)

### Local Development
1. Create `.env.local` in `/frontend` and `/backend`
2. Add MongoDB connection string
3. Add Redis connection string
4. Add NextAuth secrets (generate with `openssl rand -base64 32`)

---

## Next Steps

1. Set up MongoDB and Redis locally
2. Build Phase 1 game logic
3. Implement WebSocket real-time sync
4. Add authentication system

---

**Last Updated:** 2026-06-10
