"use client"

import { ArrowLeftIcon, PlaneTakeoffIcon } from "lucide-react"

import { BoardingPass } from "@/components/boarding-pass"
import { Button } from "@/components/ui/button"
import type { Ticket } from "@/lib/ticket"

type BoardingScreenProps = {
  ticket: Ticket
  onBoard: () => void
  onBack: () => void
}

export function BoardingScreen({ ticket, onBoard, onBack }: BoardingScreenProps) {
  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Bereit zum Boarding</h1>
        <p className="text-sm text-muted-foreground">
          {ticket.durationMinutes} Minuten Fokus nach {ticket.destination.city}. Handy weg,
          Tab offen lassen.
        </p>
      </div>

      <BoardingPass ticket={ticket} />

      <div className="flex flex-col gap-2">
        <Button size="lg" className="h-11 text-base" onClick={onBoard}>
          <PlaneTakeoffIcon />
          Boarding
        </Button>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeftIcon />
          Route ändern
        </Button>
      </div>
    </>
  )
}
