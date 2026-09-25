"use client"

import { useMemo } from "react"
import { TicketIcon } from "lucide-react"

import { AirportCombobox } from "@/components/airport-combobox"
import { DurationPicker } from "@/components/duration-picker"
import { RoutePreview } from "@/components/route-preview"
import { Button } from "@/components/ui/button"
import { findRouteOptions } from "@/lib/flight"
import { useFlightStore } from "@/lib/flight-store"
import { createTicket } from "@/lib/ticket"

export function StartScreen() {
  const { origin, durationMinutes, routeIndex, setOrigin, setDuration, nextRoute, issueTicket } =
    useFlightStore()

  const routeOptions = useMemo(
    () => (origin ? findRouteOptions(origin, durationMinutes) : []),
    [origin, durationMinutes]
  )
  const route = routeOptions.length > 0 ? routeOptions[routeIndex % routeOptions.length] : null

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Wohin fliegen wir heute?</h1>
        <p className="text-sm text-muted-foreground">
          Wähle deinen Abflughafen und wie lange du dich konzentrieren möchtest.
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <SectionLabel>Abflug</SectionLabel>
        <AirportCombobox value={origin} onValueChange={setOrigin} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Fokusdauer</SectionLabel>
        <DurationPicker value={durationMinutes} onValueChange={setDuration} />
      </section>

      <section className="flex flex-col gap-3">
        <SectionLabel>Deine Route</SectionLabel>
        {origin && route ? (
          <>
            <RoutePreview
              origin={origin}
              route={route}
              focusMinutes={durationMinutes}
              canShuffle={routeOptions.length > 1}
              onShuffle={nextRoute}
            />
            <Button
              size="lg"
              className="h-11 text-base"
              onClick={() => issueTicket(createTicket(origin, route, durationMinutes))}
            >
              <TicketIcon />
              Boarding Pass ausstellen
            </Button>
          </>
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Wähle einen Abflughafen, um dein Ziel zu sehen.
          </p>
        )}
      </section>
    </>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  )
}
