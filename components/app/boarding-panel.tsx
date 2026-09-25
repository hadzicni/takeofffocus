"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowLeftIcon, PlaneTakeoffIcon } from "lucide-react"

import { Panel, PanelHeading } from "@/components/app/panel"
import { BoardingPass } from "@/components/boarding-pass"
import { Button } from "@/components/ui/button"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import { useFlightStore } from "@/lib/flight-store"
import { requestNotificationPermission } from "@/lib/notifications"
import type { Ticket } from "@/lib/ticket"

/** Stub tear + pass lift; keep in sync with the takeoff block in globals.css. */
const DEPARTURE_MS = 650

export function BoardingPanel({ ticket }: { ticket: Ticket }) {
  const board = useFlightStore((state) => state.board)
  const cancelBoarding = useFlightStore((state) => state.cancelBoarding)
  const reducedMotion = usePrefersReducedMotion()
  const [departing, setDeparting] = useState(false)
  const timeout = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timeout.current), [])

  function startBoarding() {
    // Must run inside the click; browsers ignore permission prompts outside user gestures.
    requestNotificationPermission()
    if (reducedMotion) return board()
    setDeparting(true)
    timeout.current = setTimeout(board, DEPARTURE_MS)
  }

  return (
    <Panel
      aria-label="Boarding"
      data-departing={departing || undefined}
      footer={
        <div className="boarding-chrome flex flex-col gap-2">
          <Button
            size="lg"
            className="h-12 w-full rounded-xl text-[0.9375rem] font-semibold"
            onClick={startBoarding}
            disabled={departing}
          >
            <PlaneTakeoffIcon />
            Einsteigen und abheben
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full rounded-xl text-muted-foreground"
            onClick={cancelBoarding}
            disabled={departing}
          >
            <ArrowLeftIcon />
            Route ändern
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-7">
        <div className="boarding-chrome">
          <PanelHeading eyebrow={`Gate ${ticket.gate} · Boarding`} title="Bereit zum Einsteigen">
            {ticket.durationMinutes} Minuten Fokus nach {ticket.destination.city}. Leg das Handy weg
            und lass diesen Tab offen.
          </PanelHeading>
        </div>
        <BoardingPass ticket={ticket} />
      </div>
    </Panel>
  )
}
