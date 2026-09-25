"use client"

import { ArrowRightIcon, RotateCcwIcon } from "lucide-react"

import { FlapText } from "@/components/flap-text"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import type { Airport } from "@/lib/airports"
import { formatKm } from "@/lib/format"
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
      <DialogContent
        showCloseButton={false}
        className="gap-7 rounded-[1.75rem] p-7 ring-white/10 sm:max-w-md"
      >
        <DialogHeader className="items-center gap-3 text-center">
          <p className="eyebrow">Gelandet · Flug {ticket.flightNumber}</p>
          <FlapText text={destination.iata} animate className="text-5xl" />
          <DialogTitle className="mt-1 text-2xl font-semibold tracking-tight">
            Willkommen in {destination.city}
          </DialogTitle>
          <DialogDescription className="text-pretty">
            {ticket.durationMinutes} Minuten konzentriert, {formatKm(ticket.distanceKm)} zurückgelegt.
            Das war ein guter Flug.
          </DialogDescription>
        </DialogHeader>

        <dl className="grid grid-cols-3 divide-x divide-white/[0.06] rounded-2xl bg-white/[0.04] py-4 text-center ring-1 ring-white/[0.06]">
          <Stat label="Fokuszeit" value={`${ticket.durationMinutes} min`} />
          <Stat label="Strecke" value={formatKm(ticket.distanceKm)} />
          <Stat label="Route" value={`${origin.iata}–${destination.iata}`} />
        </dl>

        <DialogFooter className="m-0 flex-col gap-2 border-0 bg-transparent p-0 sm:flex-col">
          <Button
            size="lg"
            className="h-12 w-full rounded-xl text-[0.9375rem] font-semibold"
            onClick={() => onNewFlight(destination)}
          >
            Weiterfliegen ab {destination.iata}
            <ArrowRightIcon />
          </Button>
          <Button
            variant="ghost"
            className="h-10 w-full rounded-xl text-muted-foreground"
            onClick={() => onNewFlight(origin)}
          >
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
    <div className="flex flex-col gap-1 px-2">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}
