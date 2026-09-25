"use client"

import { PlaneLandingIcon, RotateCcwIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { formatKm } from "@/lib/format"
import type { Airport } from "@/lib/airports"
import type { Ticket } from "@/lib/ticket"

type LandingDialogProps = {
  ticket: Ticket
  open: boolean
  onNewFlight: (origin: Airport) => void
}

export function LandingDialog({ ticket, open, onNewFlight }: LandingDialogProps) {
  const { origin, destination } = ticket

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onNewFlight(origin)}>
      <DialogContent showCloseButton={false} className="gap-6 p-6">
        <DialogHeader className="items-center text-center">
          <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/15 text-primary">
            <PlaneLandingIcon className="size-6" />
          </div>
          <DialogTitle className="text-xl">Willkommen in {destination.city}</DialogTitle>
          <DialogDescription>
            Flug {ticket.flightNumber} ist sicher gelandet. Gute Arbeit!
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 gap-2 rounded-lg bg-muted/60 p-4 text-center">
          <Stat label="Fokus" value={`${ticket.durationMinutes} Min`} />
          <Stat label="Distanz" value={formatKm(ticket.distanceKm)} />
          <Stat label="Ziel" value={destination.iata} />
        </dl>
        <p className="-mt-3 text-center text-xs text-muted-foreground">{destination.name}</p>

        <DialogFooter className="flex-col gap-2 sm:flex-col">
          <Button size="lg" className="h-11 text-base" onClick={() => onNewFlight(destination)}>
            <PlaneLandingIcon className="-scale-x-100" />
            Weiterfliegen ab {destination.iata}
          </Button>
          <Button variant="ghost" onClick={() => onNewFlight(origin)}>
            <RotateCcwIcon />
            Neuer Flug ab {origin.iata}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.65rem] font-medium uppercase tracking-widest text-muted-foreground">
        {label}
      </dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
