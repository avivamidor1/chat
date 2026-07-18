# Private Chat — Self-Destructing Realtime Rooms

A private, two-person chat app where rooms expire automatically and messages can be destroyed on demand. Built as a full-stack showcase of realtime messaging, cookie-based access control, and serverless Redis.

> **Resume / portfolio project** — demonstrates end-to-end product thinking: auth constraints, ephemeral data, live UX signals (typing), and a type-safe API surface.

<!-- Optional: replace with your deployed URL after publish
**Live demo:** [https://your-app.vercel.app](https://your-app.vercel.app)
-->

---

## Features

- **Invite-only rooms** — create a room and share the link; max **2** participants
- **Realtime messaging** — messages push instantly via Upstash Realtime (SSE)
- **Typing indicators** — live `is typing…` status over the same realtime channel
- **Self-destruct TTL** — rooms expire after a fixed window; countdown shown in the UI
- **Destroy now** — either participant can wipe the room and clear messages immediately
- **Cookie-gated access** — httpOnly auth tokens, join locking, and capacity checks in middleware
- **Anonymous identity** — random username per session (no signup flow)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js** (App Router) + React 19 |
| API | **Elysia** + **Eden** (end-to-end typed client) |
| Realtime | **Upstash Realtime** |
| Persistence | **Upstash Redis** (room meta, message lists, TTL) |
| Data fetching | **TanStack Query** |
| Validation | **Zod** |
| Styling | **Tailwind CSS** |
| Language | **TypeScript** |

---

## Architecture (high level)

```
Lobby  →  POST /api/room/create  →  Redis meta + auth cookie
       →  /room/[roomId]

Middleware (proxy)  →  seat claim (max 2) + cookie validation

Room page
  ├─ REST (Elysia): messages, TTL, destroy, typing emit
  └─ SSE (Upstash Realtime): chat.message | chat.typing | chat.destroy
```

**Design choices worth noting**

- Room membership is enforced at the **edge proxy**, not only in the UI
- Messages and room metadata share a **TTL** so data is genuinely ephemeral
- Typing events are **ephemeral emits** (not stored in Redis)
- Eden keeps the frontend client aligned with the backend route types

---

## Getting started

### Prerequisites

- Node.js 20+
- An [Upstash](https://upstash.com) Redis database (+ Realtime-compatible setup)

### Setup

```bash
git clone <your-repo-url>
cd realtime_chat
npm install
```

Create a `.env` file in the project root:

```env
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Local development server |
| `npm run build` | Production build |
| `npm start` | Run production server |
| `npm run lint` | ESLint |

---

## How it works (user flow)

1. Open the lobby and create a secure room  
2. Copy the room URL and send it to one other person  
3. Chat in realtime; typing status appears when the other person is writing  
4. Watch the self-destruct countdown, or hit **Destroy now** to end the room immediately  

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Lobby — create room
│   ├── room/[roomId]/page.tsx   # Chat UI + typing + realtime
│   └── api/
│       ├── [[...slugs]]/        # Elysia API (rooms, messages, typing)
│       └── realtime/            # Upstash Realtime handler
├── components/                  # App providers
├── hooks/                       # Username / session helpers
├── lib/                         # Redis, realtime schema, Eden client
└── proxy.ts                     # Room join + capacity auth gate
```

---

## What this project shows on a resume

- Full-stack TypeScript with a typed HTTP client (Eden ↔ Elysia)
- Realtime UX beyond CRUD (live messages + typing indicators)
- Access control and concurrency concerns (2-seat rooms, join locks, cookies)
- Ephemeral data modeling with Redis TTL and intentional teardown flows
- Clean product constraints: private by design, no accounts required

---

## License

Personal / portfolio use. Add a license file if you open-source this publicly.
