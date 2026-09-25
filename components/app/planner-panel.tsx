"use client"

import { ArrowRightIcon } from "lucide-react"

import { DestinationCard } from "@/components/app/destination-card"
import { Field, Panel, PanelHeading } from "@/components/app/panel"
import { AirportCombobox } from "@/components/airport-combobox"
import { DurationPicker } from "@/components/duration-picker"
import { Button } from "@/components/ui/button"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { usePlannedRoute } from "@/hooks/use-planned-route"
import { durationForFlight, useFlightStore, type DestinationMode } from "@/lib/flight-store"
import { formatFlightTime } from "@/lib/format"
import { createTicket } from "@/lib/ticket"

const DESTINATION_MODES: { value: DestinationMode; label: string }[] = [
  { value: "auto", label: "Passend zur Zeit" },
  { value: "manual", label: "Selbst wählen" },
]

export function PlannerPanel() {
  const { origin, destinationMode, destination, durationMinutes, options, route } = usePlannedRoute()
  const setOrigin = useFlightStore((state) => state.setOrigin)
  const setDestinationMode = useFlightStore((state) => state.setDestinationMode)
  const setDestination = useFlightStore((state) => state.setDestination)
  const setDuration = useFlightStore((state) => state.setDuration)
  const nextRoute = useFlightStore((state) => state.nextRoute)
  const issueTicket = useFlightStore((state) => state.issueTicket)

  const manual = destinationMode === "manual"
  const matchingDuration = route ? durationForFlight(route.flightMinutes) : null

  return (
    <Panel
      aria-label="Flug planen"
      footer={
        <Button
          size="lg"
          className="h-12 w-full rounded-xl text-[0.9375rem] font-semibold"
          disabled={!origin || !route}
          onClick={() => origin && route && issueTicket(createTicket(origin, route, durationMinutes))}
        >
          Boarding Pass ausstellen
          <ArrowRightIcon />
        </Button>
      }
    >
      <div className="flex flex-col gap-8">
        <PanelHeading eyebrow="Neuer Flug" title="Wohin trägt dich dein Fokus?">
          {manual
            ? "Wähle Abflug und Ziel. Die Fokuszeit richtet sich nach der Flugzeit, du kannst sie aber anpassen."
            : "Wähle Abflughafen und Fokuszeit. Du fliegst so lange, wie du dich konzentrierst, und landest, wenn die Zeit um ist."}
        </PanelHeading>

        <Field label="Abflug">
          <AirportCombobox
            label="Abflughafen"
            value={origin}
            onValueChange={setOrigin}
            exclude={manual ? destination : null}
            locate
          />
        </Field>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="eyebrow">Ziel</h2>
            <ToggleGroup
              value={[destinationMode]}
              onValueChange={([mode]) => mode && setDestinationMode(mode as DestinationMode)}
              size="sm"
              spacing={0.5}
              aria-label="Ziel bestimmen"
              className="rounded-full bg-white/[0.04] p-0.5"
            >
              {DESTINATION_MODES.map(({ value, label }) => (
                <ToggleGroupItem
                  key={value}
                  value={value}
                  className="h-7 rounded-full px-3 text-xs aria-pressed:bg-foreground aria-pressed:text-background"
                >
                  {label}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
          </div>
          {manual && (
            <AirportCombobox
              label="Zielflughafen"
              placeholder="Wohin möchtest du fliegen?"
              value={destination}
              onValueChange={setDestination}
              exclude={origin}
            />
          )}
        </div>

        <Field label="Fokuszeit">
          <DurationPicker value={durationMinutes} onValueChange={setDuration} />
          {manual && route && matchingDuration !== null && (
            <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>Echte Flugzeit {formatFlightTime(route.flightMinutes)}</span>
              {durationMinutes !== matchingDuration && (
                <Button
                  variant="link"
                  size="xs"
                  className="h-auto px-0 text-xs"
                  onClick={() => setDuration(matchingDuration)}
                >
                  Auf Flugzeit setzen
                </Button>
              )}
            </div>
          )}
        </Field>

        <DestinationCard
          origin={origin}
          route={route}
          focusMinutes={durationMinutes}
          manual={manual}
          canShuffle={!manual && options.length > 1}
          onShuffle={nextRoute}
        />
      </div>
    </Panel>
  )
}
