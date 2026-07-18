"use client"

import { useUsername } from "@/hooks/use-username"
import { client } from "@/lib/client"
import { useRealtime } from "@/lib/realtime-client"
import { useMutation, useQuery } from "@tanstack/react-query"
import { format } from "date-fns"
import { useParams, useRouter } from "next/navigation"
import { useEffect, useRef, useState } from "react"

function formatTimeRemaining(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, "0")}`
}

const TYPING_IDLE_MS = 2000

const Page = () => {
  const params = useParams()
  const roomId = params.roomId as string
  const router = useRouter()

  const { username } = useUsername()
  const [input, setInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  const [copyStatus, setCopyStatus] = useState("COPY")
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null)
  const [otherTyping, setOtherTyping] = useState<{
    sender: string
    isTyping: boolean
  } | null>(null)

  const typingIdleRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastTypingSentRef = useRef(false)

  const stopTyping = () => {
    if (typingIdleRef.current) {
      clearTimeout(typingIdleRef.current)
      typingIdleRef.current = null
    }

    if (!lastTypingSentRef.current || !username) return

    lastTypingSentRef.current = false
    void client.messages.typing.post(
      { sender: username, isTyping: false },
      { query: { roomId } }
    )
  }

  const signalTyping = () => {
    if (!username) return

    if (!lastTypingSentRef.current) {
      lastTypingSentRef.current = true
      void client.messages.typing.post(
        { sender: username, isTyping: true },
        { query: { roomId } }
      )
    }

    if (typingIdleRef.current) clearTimeout(typingIdleRef.current)
    typingIdleRef.current = setTimeout(stopTyping, TYPING_IDLE_MS)
  }

  useEffect(() => {
    return () => {
      if (typingIdleRef.current) clearTimeout(typingIdleRef.current)
    }
  }, [])

  const { data: ttlData } = useQuery({
    queryKey: ["ttl", roomId],
    queryFn: async () => {
      const res = await client.room.ttl.get({ query: { roomId } })
      return res.data
    },
  })

  useEffect(() => {
    if (ttlData?.ttl !== undefined) setTimeRemaining(ttlData.ttl)
  }, [ttlData])

  useEffect(() => {
    if (timeRemaining === null || timeRemaining < 0) return

    if (timeRemaining === 0) {
      router.push("/?destroyed=true")
      return
    }

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval)
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timeRemaining, router])

  const { data: messages, refetch } = useQuery({
    queryKey: ["messages", roomId],
    queryFn: async () => {
      const res = await client.messages.get({ query: { roomId } })
      return res.data
    },
  })

  const { mutate: sendMessage, isPending } = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      stopTyping()
      await client.messages.post({ sender: username, text }, { query: { roomId } })
      setInput("")
    },
  })

  useRealtime({
    channels: [roomId],
    events: ["chat.message", "chat.destroy", "chat.typing"],
    onData: ({ event, data }) => {
      if (event === "chat.message") {
        refetch()
      }

      if (event === "chat.destroy") {
        router.push("/?destroyed=true")
      }

      if (event === "chat.typing") {
        if (data.sender === username) return
        setOtherTyping({ sender: data.sender, isTyping: data.isTyping })
      }
    },
  })

  const { mutate: destroyRoom } = useMutation({
    mutationFn: async () => {
      await client.room.delete(null, { query: { roomId } })
    },
  })

  const copyLink = () => {
    const url = window.location.href
    navigator.clipboard.writeText(url)
    setCopyStatus("COPIED!")
    setTimeout(() => setCopyStatus("COPY"), 2000)
  }

  return (
    <main className="flex flex-col h-screen max-h-screen overflow-hidden bg-night text-ink">
      <header className="border-b border-line p-4 flex items-center justify-between bg-surface/40">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <span className="text-xs text-muted uppercase">Room ID</span>
            <div className="flex items-center gap-2">
              <span className="font-bold text-copper truncate">{roomId.slice(0,10) + "..."}</span>
              <button
                onClick={copyLink}
                className="text-[10px] bg-line hover:bg-line/80 px-2 py-0.5 rounded text-muted hover:text-sand transition-colors"
              >
                {copyStatus}
              </button>
            </div>
          </div>

          <div className="h-8 w-px bg-line" />

          <div className="flex flex-col">
            <span className="text-xs text-muted uppercase">Self-Destruct</span>
            <span
              className={`text-sm font-bold flex items-center gap-2 ${
                timeRemaining !== null && timeRemaining < 60
                  ? "text-danger"
                  : "text-sand"
              }`}
            >
              {timeRemaining !== null ? formatTimeRemaining(timeRemaining) : "--:--"}
            </span>
          </div>
        </div>

        <button
          onClick={() => destroyRoom()}
          className="text-xs bg-line hover:bg-danger px-3 py-1.5 rounded text-muted hover:text-ink font-bold transition-all group flex items-center gap-2 disabled:opacity-50"
        >
          <span className="group-hover:animate-pulse">💣</span>
          DESTROY NOW
        </button>
      </header>

      {/* MESSAGES */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin">
        {messages?.messages.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-dim text-sm font-mono">
              No messages yet, start the conversation.
            </p>
          </div>
        )}

        {messages?.messages.map((msg) => (
          <div key={msg.id} className="flex flex-col items-start">
            <div className="max-w-[80%] group">
              <div className="flex items-baseline gap-3 mb-1">
                <span
                  className={`text-xs font-bold ${
                    msg.sender === username ? "text-copper" : "text-sky"
                  }`}
                >
                  {msg.sender === username ? "YOU" : msg.sender}
                </span>

                <span className="text-[10px] text-dim">
                  {format(msg.timestamp, "HH:mm")}
                </span>
              </div>

              <p className="text-sm text-ink/80 leading-relaxed break-all">
                {msg.text}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="p-4 border-t border-line bg-surface/40">
        <div className="h-5 mb-2">
          {otherTyping?.isTyping && (
            <p className="text-xs text-muted font-mono animate-pulse">
              {otherTyping.sender} is typing...
            </p>
          )}
        </div>

        <div className="flex gap-4">
          <div className="flex-1 relative group">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-copper animate-pulse">
              {">"}
            </span>
            <input
              autoFocus
              type="text"
              value={input}
              ref={inputRef}
              onKeyDown={(e) => {
                if (e.key === "Enter" && input.trim()) {
                  sendMessage({ text: input })
                  inputRef.current?.focus()
                }
              }}
              placeholder="Type message..."
              onChange={(e) => {
                const value = e.target.value
                setInput(value)

                if (value.length > 0) {
                  signalTyping()
                } else {
                  stopTyping()
                }
              }}
              className="w-full bg-night border border-line focus:border-copper/50 focus:outline-none transition-colors text-ink placeholder:text-dim py-3 pl-8 pr-4 text-sm"
            />
          </div>

          <button
            onClick={() => {
              sendMessage({ text: input })
              inputRef.current?.focus()
            }}
            disabled={!input.trim() || isPending}
            className="bg-copper text-night px-6 text-sm font-bold hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            SEND
          </button>
        </div>
      </div>
    </main>
  )
}

export default Page
