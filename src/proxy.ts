import { NextRequest, NextResponse } from "next/server"
import { redis } from "./lib/redis"
import { nanoid } from "nanoid"

const AUTH_COOKIE = "x-auth-token"
const MAX_CONNECTED = 2

function authCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    // lax so invite links from other apps still work
    sameSite: "lax" as const,
  }
}

export const proxy = async (req: NextRequest) => {
  const pathname = req.nextUrl.pathname

  const roomMatch = pathname.match(/^\/room\/([^/]+)$/)
  if (!roomMatch) return NextResponse.redirect(new URL("/", req.url))

  const roomId = roomMatch[1]
  const metaKey = `meta:${roomId}`

  const meta = await redis.hgetall<{ connected: string[]; createdAt: number }>(
    metaKey
  )

  if (!meta) {
    return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
  }

  const connected = meta.connected ?? []
  const existingToken = req.cookies.get(AUTH_COOKIE)?.value

  // Already a member of this room
  if (existingToken && connected.includes(existingToken)) {
    if (req.nextUrl.searchParams.has("_auth")) {
      const url = req.nextUrl.clone()
      url.searchParams.delete("_auth")
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  // No cookie yet: mint (or reuse) an identity WITHOUT taking a seat,
  // then redirect so the next request carries the cookie.
  // A shared pending token prevents parallel first-hits from minting two seats.
  if (!existingToken) {
    if (connected.length >= MAX_CONNECTED) {
      return NextResponse.redirect(new URL("/?error=room-full", req.url))
    }

    // Guard against infinite redirect when cookies are blocked
    if (req.nextUrl.searchParams.has("_auth")) {
      return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
    }

    const pendingKey = `pending-auth:${roomId}`
    let token = await redis.get<string>(pendingKey)

    if (!token) {
      token = nanoid()
      const created = await redis.set(pendingKey, token, { nx: true, ex: 60 })
      if (!created) {
        token = (await redis.get<string>(pendingKey)) ?? token
      }
    }

    const url = req.nextUrl.clone()
    url.searchParams.set("_auth", "1")
    const response = NextResponse.redirect(url)
    response.cookies.set(AUTH_COOKIE, token, authCookieOptions())
    return response
  }

  // Has cookie but not seated yet — join under a short Redis lock
  const lockKey = `lock:join:${roomId}`
  const gotLock = await redis.set(lockKey, "1", { nx: true, ex: 5 })

  if (!gotLock) {
    return NextResponse.redirect(req.nextUrl)
  }

  try {
    const fresh = await redis.hgetall<{ connected: string[]; createdAt: number }>(
      metaKey
    )

    if (!fresh) {
      return NextResponse.redirect(new URL("/?error=room-not-found", req.url))
    }

    const list = fresh.connected ?? []

    if (list.includes(existingToken)) {
      return NextResponse.next()
    }

    if (list.length >= MAX_CONNECTED) {
      return NextResponse.redirect(new URL("/?error=room-full", req.url))
    }

    await redis.hset(metaKey, {
      connected: [...list, existingToken],
    })
    await redis.del(`pending-auth:${roomId}`)

    return NextResponse.next()
  } finally {
    await redis.del(lockKey)
  }
}

export const config = {
  matcher: "/room/:path*",
}
