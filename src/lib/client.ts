import { treaty } from "@elysia/eden"
import type { App } from "../app/api/[[...slugs]]/route"

function getBaseUrl() {
  // Browser: always use the current site (works on localhost and Vercel)
  if (typeof window !== "undefined") {
    return window.location.origin
  }

  // Server-side (SSR): Vercel sets VERCEL_URL without a protocol
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`
  }

  // Local `next dev` / `next start` default
  return "http://localhost:3000"
}

export const client = treaty<App>(getBaseUrl()).api
