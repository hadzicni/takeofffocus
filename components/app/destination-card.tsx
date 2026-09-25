import { MapPinIcon, PlaneIcon, ShuffleIcon } from "lucide-react"

import { FlapText } from "@/components/flap-text"
import { Button } from "@/components/ui/button"
import type { Airport } from "@/lib/airports"
import type { RouteOption } from "@/lib/flight"
import { formatKm } from "@/lib/format"

type DestinationCardProps = {
  origin: Airport | null
  route: RouteOption | null
  focusMinutes: number
  canShuffle: boolean
  onShuffle: () => void
}

const card = "rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/[0.06]"

export function DestinationCard({ origin, route, focusMinutes, canShuffle, onShuffle }: DestinationCardProps) {
  if (!origin || !route) {
    return (
      <div className={`${card} flex items-center gap-4`}>
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/[0.06] text-muted-foreground">
          <MapPinIcon className="size-4" />
        </span>
        <p className="text-sm text-muted-foreground">
          Wähle deinen Abflughafen. Wir suchen ein Ziel, das genau so weit weg ist, wie du fokussieren
          willst.
        </p>
      </div>
    )
  }

  const { destination } = route
  const flightMinutes = Math.round(route.flightMinutes)

  return (
    <div className={`${card} flex flex-col gap-5`} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <h2 className="eyebrow">Dein Ziel</h2>
        {canShuffle && (
          <Button variant="ghost" size="sm" onClick={onShuffle} className="-my-1 -mr-2 text-muted-foreground">
            <ShuffleIcon />
            Anderes Ziel
          </Button>
        )}
      </div>

      <div className="flex items-center gap-3">
        <AirportCode airport={origin} />
        <div className="flex flex-1 items-center gap-2 text-primary" aria-hidden>
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-primary/60" />
          <PlaneIcon className="size-4 rotate-45" />
          <span className="h-px flex-1 bg-gradient-to-r from-primary/60 to-transparent" />
        </div>
        <AirportCode airport={destination} align="end" />
      </div>

      <dl className="grid grid-cols-3 gap-3 border-t border-white/[0.06] pt-4">
        <Stat label="Distanz" value={formatKm(route.distanceKm)} />
        <Stat
          label="Flugzeit"
          value={flightMinutes >= 60 ? `${Math.floor(flightMinutes / 60)} h ${flightMinutes % 60} min` : `${flightMinutes} min`}
        />
        <Stat label="Fokus" value={`${focusMinutes} min`} />
      </dl>

      {!route.withinTolerance && (
        <p className="-mt-1 text-xs leading-relaxed text-muted-foreground">
          Kein Ziel liegt genau {focusMinutes} Minuten entfernt, das ist die nächstbeste Route. Dein
          Timer läuft trotzdem exakt {focusMinutes} Minuten.
        </p>
      )}
    </div>
  )
}

function AirportCode({ airport, align = "start" }: { airport: Airport; align?: "start" | "end" }) {
  return (
    <div className={`flex min-w-0 flex-col gap-1.5 ${align === "end" ? "items-end text-right" : ""}`}>
      <FlapText text={airport.iata} animate className="text-[1.75rem]" />
      <span className="max-w-[8rem] truncate text-xs text-muted-foreground">{airport.city}</span>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-sm font-medium tabular-nums">{value}</dd>
    </div>
  )
}
