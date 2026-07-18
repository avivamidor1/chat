# Project Structure

```
realtime_chat/
├── AGENTS.md
├── CLAUDE.md
├── README.md
├── eslint.config.mjs
├── next-env.d.ts
├── next.config.ts
├── package-lock.json
├── package.json
├── postcss.config.mjs
├── tsconfig.json
├── public/
│   ├── file.svg
│   ├── globe.svg
│   ├── vercel.svg
│   └── window.svg
└── src/
    ├── proxy.ts
    ├── app/
    │   ├── favicon.ico
    │   ├── globals.css
    │   ├── layout.tsx
    │   ├── page.tsx
    │   ├── api/
    │   │   ├── [[...slugs]]/
    │   │   │   ├── auth.ts
    │   │   │   └── route.ts
    │   │   └── realtime/
    │   │       └── route.ts
    │   └── room/
    │       └── [roomId]/
    │           └── page.tsx
    ├── components/
    │   └── providers.tsx
    ├── hooks/
    │   └── use-username.ts
    └── lib/
        ├── client.ts
        ├── realtime-client.ts
        ├── realtime.ts
        └── redis.ts
```
