"use client"

import { useMemo } from "react"
import { PlaneTakeoffIcon } from "lucide-react"

import { AirportCombobox } from "@/components/airport-combobox"
import { DurationPicker } from "@/components/duration-picker"
import { RoutePreview } from "@/components/route-preview"
import { findRouteOptions } from "@/lib/flight"
import { useFlightStore } from "@/lib/flight-store"

export function StartScreen() {
  const { origin, durationMinutes, routeIndex, setOrigin, setDuration, nextRoute } =
    useFlightStore()

  const routeOptions = useMemo(
    () => (origin ? findRouteOptions(origin, durationMinutes) : []),
    [origin, durationMinutes]
  )
  const route = routeOptions.length > 0 ? routeOptions[routeIndex % routeOptions.length] : null

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 py-10">
      <header className="flex items-center gap-2 text-sm font-medium tracking-wide">
        <PlaneTakeoffIcon className="size-5 text-primary" />
        TakeoffFocus
      </header>

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
          <RoutePreview
            origin={origin}
            route={route}
            focusMinutes={durationMinutes}
            canShuffle={routeOptions.length > 1}
            onShuffle={nextRoute}
          />
        ) : (
          <p className="rounded-xl border border-dashed px-4 py-6 text-center text-sm text-muted-foreground">
            Wähle einen Abflughafen, um dein Ziel zu sehen.
          </p>
        )}
      </section>
    </main>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
      {children}
    </h2>
  )
}
