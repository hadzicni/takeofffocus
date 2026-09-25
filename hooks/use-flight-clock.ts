import { useEffect, useState } from "react"

import { elapsedMs, useFlightStore } from "@/lib/flight-store"
import { announceLanding } from "@/lib/notifications"

/** Re-render interval; keeps the plane moving smoothly without busy looping. */
const TICK_MS = 250

export type FlightClock = {
  elapsedMs: number
  remainingMs: number
  /** Fraction of the focus session done, 0–1. */
  progress: number
  paused: boolean
}

/**
 * The single clock for the running session. Mount it once (in the app shell):
 * it also lands the flight when time is up and keeps the tab title current.
 */
export function useFlightClock(): FlightClock {
  const { phase, ticket, departedAt, pausedAt, pausedMs, resumedAt, land } = useFlightStore()
  const [now, setNow] = useState(Date.now)
  const flying = phase === "flight"
  const paused = pausedAt !== null

  useEffect(() => {
    if (!flying || paused) return
    const tick = () => setNow(Date.now())
    // Tick at once too, so resuming doesn't briefly show the pre-pause time.
    const first = setTimeout(tick, 0)
    const id = setInterval(tick, TICK_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [flying, paused])

  const totalMs = (ticket?.durationMinutes ?? 0) * 60_000
  const elapsed = elapsedMs({ departedAt, pausedAt, pausedMs, resumedAt }, now)
  const progress =
    phase === "landed" ? 1 : totalMs > 0 ? Math.min(1, Math.max(0, elapsed / totalMs)) : 0

  useEffect(() => {
    if (flying && ticket && progress >= 1 && land()) announceLanding(ticket)
  }, [flying, ticket, progress, land])

  const remainingMs = Math.max(0, totalMs - elapsed)
  const title = !ticket
    ? null
    : phase === "landed"
      ? `Gelandet in ${ticket.destination.city}`
      : phase === "flight"
        ? `${paused ? "Pausiert · " : ""}${formatDuration(remainingMs)} · ${ticket.origin.iata} → ${ticket.destination.iata}`
        : null

  useEffect(() => {
    if (!title) return
    const previous = document.title
    document.title = title
    return () => {
      document.title = previous
    }
  }, [title])

  return { elapsedMs: elapsed, remainingMs, progress, paused }
}

/** 90 000 ms → "01:30", 4 500 000 ms → "1:15:00". */
export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}
