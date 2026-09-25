"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { PauseIcon, PlayIcon, XIcon } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { flightPhase } from "@/lib/flight"
import { elapsedMs, useFlightStore } from "@/lib/flight-store"
import type { Ticket } from "@/lib/ticket"

// Leaflet touches `window` on import, so the map only renders in the browser.
const FlightMap = dynamic(() => import("@/components/flight-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
})

/** Re-render interval; keeps the plane moving smoothly without busy looping. */
const TICK_MS = 250

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}

export function FlightScreen({ ticket }: { ticket: Ticket }) {
  const { departedAt, pausedAt, pausedMs, pause, resume, land, abort } = useFlightStore()
  const [now, setNow] = useState(Date.now)
  const paused = pausedAt !== null

  useEffect(() => {
    if (paused) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [paused])

  const totalMs = ticket.durationMinutes * 60_000
  const elapsed = elapsedMs({ departedAt, pausedAt, pausedMs }, now)
  const progress = Math.min(1, Math.max(0, elapsed / totalMs))
  const remaining = formatRemaining(totalMs - elapsed)
  const route = `${ticket.origin.iata} → ${ticket.destination.iata}`

  useEffect(() => {
    if (progress >= 1) land()
  }, [progress, land])

  useEffect(() => {
    const previousTitle = document.title
    document.title = `${paused ? "⏸ " : ""}${remaining} · ${route}`
    return () => {
      document.title = previousTitle
    }
  }, [remaining, route, paused])

  return (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-2xl font-semibold tracking-wider">{route}</h1>
          <p className="text-sm text-muted-foreground">
            {ticket.flightNumber} · Sitz {ticket.seat} · nach {ticket.destination.city}
          </p>
        </div>
        <Badge variant={paused ? "secondary" : "outline"} className="mt-1">
          {paused ? "Pausiert" : flightPhase(progress)}
        </Badge>
      </div>

      <div className="aspect-square w-full overflow-hidden rounded-xl ring-1 ring-foreground/10">
        <FlightMap origin={ticket.origin} destination={ticket.destination} progress={progress} />
      </div>

      <div className="flex flex-col gap-4">
        <div
          className={`text-center font-mono text-6xl font-semibold tabular-nums tracking-tight transition-opacity ${paused ? "opacity-50" : ""}`}
          role="timer"
          aria-label="Verbleibende Zeit"
        >
          {remaining}
        </div>
        <Progress value={progress * 100} aria-label="Flugfortschritt" />
        <div className="flex justify-between font-mono text-xs text-muted-foreground">
          <span>{ticket.origin.iata}</span>
          <span>{Math.floor(progress * 100)} %</span>
          <span>{ticket.destination.iata}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          size="lg"
          variant={paused ? "default" : "outline"}
          className="h-11 text-base"
          onClick={() => {
            if (!paused) return pause()
            // Refresh `now` with the resume so elapsed time doesn't briefly jump back.
            resume()
            setNow(Date.now())
          }}
        >
          {paused ? <PlayIcon /> : <PauseIcon />}
          {paused ? "Fortsetzen" : "Pause"}
        </Button>
        <Button variant="ghost" onClick={abort}>
          <XIcon />
          Flug abbrechen
        </Button>
      </div>
    </>
  )
}
