"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, PlaneTakeoffIcon } from "lucide-react"

import { BoardingPass } from "@/components/boarding-pass"
import { Button } from "@/components/ui/button"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { requestNotificationPermission } from "@/lib/notifications"
import type { Ticket } from "@/lib/ticket"

/** Stub tear + pass lift; keep in sync with the takeoff block in globals.css. */
const DEPARTURE_MS = 650

type BoardingScreenProps = {
  ticket: Ticket
  onBoard: () => void
  onBack: () => void
}

export function BoardingScreen({ ticket, onBoard, onBack }: BoardingScreenProps) {
  const reducedMotion = usePrefersReducedMotion()
  const [departing, setDeparting] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  // Warm up the map chunk so the takeoff camera starts right after the pass lifts away.
  useEffect(() => {
    void import("@/components/flight-map")
  }, [])

  function board() {
    // Must run inside the click; browsers ignore permission prompts outside user gestures.
    requestNotificationPermission()
    if (reducedMotion) return onBoard()
    setDeparting(true)
    timeout.current = setTimeout(onBoard, DEPARTURE_MS)
  }

  return (
    <div data-departing={departing || undefined} className="flex flex-col gap-8">
      <div className="boarding-chrome flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bereit zum Boarding</h1>
        <p className="text-sm text-muted-foreground">
          {ticket.durationMinutes} Minuten Fokus nach {ticket.destination.city}. Handy weg,
          Tab offen lassen.
        </p>
      </div>

      <BoardingPass ticket={ticket} />

      <div className="boarding-chrome flex flex-col gap-2">
        <Button size="lg" className="h-11 text-base" onClick={board} disabled={departing}>
          <PlaneTakeoffIcon />
          Boarding
        </Button>
        <Button variant="ghost" onClick={onBack} disabled={departing}>
          <ArrowLeftIcon />
          Route ändern
        </Button>
      </div>
    </div>
  )
}
