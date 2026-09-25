"use client"

import { PlaneIcon, ShuffleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter } from "@/components/ui/card"
import type { Airport } from "@/lib/airports"
import type { RouteOption } from "@/lib/flight"

const km = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 })

type RoutePreviewProps = {
  origin: Airport
  route: RouteOption
  focusMinutes: number
  canShuffle: boolean
  onShuffle: () => void
}

export function RoutePreview({ origin, route, focusMinutes, canShuffle, onShuffle }: RoutePreviewProps) {
  const { destination } = route

  return (
    <Card>
      <CardContent className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <AirportCode airport={origin} />
          <div className="flex flex-1 items-center gap-2 text-muted-foreground">
            <span className="h-px flex-1 border-t border-dashed border-muted-foreground/40" />
            <PlaneIcon className="size-4 rotate-45 text-primary" />
            <span className="h-px flex-1 border-t border-dashed border-muted-foreground/40" />
          </div>
          <AirportCode airport={destination} align="end" />
        </div>

        <dl className="grid grid-cols-3 gap-2 border-t pt-4 text-sm">
          <Stat label="Distanz" value={`${km.format(route.distanceKm)} km`} />
          <Stat label="Flugzeit" value={`ca. ${Math.round(route.flightMinutes)} Min`} />
          <Stat label="Fokus" value={`${focusMinutes} Min`} />
        </dl>

        {!route.withinTolerance && (
          <p className="text-xs text-muted-foreground">
            Kein Ziel passt genau zu {focusMinutes} Minuten, das ist die nächstbeste Route.
            Der Timer läuft trotzdem {focusMinutes} Minuten.
          </p>
        )}
      </CardContent>
      {canShuffle && (
        <CardFooter>
          <Button variant="ghost" size="sm" onClick={onShuffle} className="-ml-2">
            <ShuffleIcon />
            Anderes Ziel
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}

function AirportCode({ airport, align = "start" }: { airport: Airport; align?: "start" | "end" }) {
  return (
    <div className={align === "end" ? "text-right" : undefined}>
      <div className="font-mono text-3xl font-semibold tracking-wider">{airport.iata}</div>
      <div className="text-xs text-muted-foreground">{airport.city}</div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  )
}
