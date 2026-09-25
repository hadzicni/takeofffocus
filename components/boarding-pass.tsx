import { PlaneIcon } from "lucide-react"

import { Barcode } from "@/components/barcode"
import { Card } from "@/components/ui/card"
import type { Airport } from "@/lib/airports"
import { formatKm } from "@/lib/format"
import type { Ticket } from "@/lib/ticket"

const time = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" })
const date = new Intl.DateTimeFormat("de-CH", { day: "2-digit", month: "short" })

export function BoardingPass({ ticket }: { ticket: Ticket }) {
  const arrivesAt = ticket.issuedAt + ticket.durationMinutes * 60_000
  const barcodeValue = `${ticket.flightNumber}${ticket.origin.iata}${ticket.destination.iata}${ticket.seat}${ticket.issuedAt}`

  return (
    <Card className="gap-0 bg-transparent py-0 text-ticket-foreground ring-0 drop-shadow-xl">
      <div className="flex items-center justify-between bg-ticket-accent px-5 py-2.5 text-xs font-semibold uppercase tracking-widest">
        <span>TakeoffFocus</span>
        <span>Boarding Pass</span>
      </div>

      <div className="flex flex-col gap-5 bg-ticket px-5 pt-5 pb-3">
        <div className="flex items-center justify-between gap-4">
          <AirportCode airport={ticket.origin} />
          <div className="flex flex-1 flex-col items-center gap-1 text-ticket-muted">
            <PlaneIcon className="size-5 rotate-45 text-ticket-foreground" />
            <span className="text-[0.7rem] tabular-nums">
              {formatKm(ticket.distanceKm)}
            </span>
          </div>
          <AirportCode airport={ticket.destination} align="end" />
        </div>

        <dl className="grid grid-cols-3 gap-x-4 gap-y-3">
          <Field label="Datum" value={date.format(ticket.issuedAt)} />
          <Field label="Abflug" value={time.format(ticket.issuedAt)} />
          <Field label="Ankunft" value={time.format(arrivesAt)} />
          <Field label="Flug" value={ticket.flightNumber} />
          <Field label="Gate" value={ticket.gate} />
          <Field label="Sitz" value={ticket.seat} highlight />
        </dl>
      </div>

      <div className="ticket-perforation" aria-hidden />

      <div className="flex flex-col items-center gap-2 bg-ticket px-5 pt-2 pb-5">
        <Barcode code={barcodeValue} className="h-14 w-full" />
        <span className="font-mono text-[0.65rem] tracking-[0.3em] text-ticket-muted">
          {ticket.flightNumber.replace(" ", "")}
          {ticket.origin.iata}
          {ticket.destination.iata}
          {ticket.seat}
        </span>
      </div>
    </Card>
  )
}

function AirportCode({ airport, align = "start" }: { airport: Airport; align?: "start" | "end" }) {
  return (
    <div className={align === "end" ? "text-right" : undefined}>
      <div className="font-mono text-4xl font-semibold tracking-wider">{airport.iata}</div>
      <div className="text-xs text-ticket-muted">{airport.city}</div>
    </div>
  )
}

function Field({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[0.65rem] font-medium uppercase tracking-widest text-ticket-muted">
        {label}
      </dt>
      <dd className={highlight ? "text-lg font-semibold tabular-nums" : "font-medium tabular-nums"}>
        {value}
      </dd>
    </div>
  )
}
