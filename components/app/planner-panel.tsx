"use client"

import { ArrowRightIcon } from "lucide-react"

import { DestinationCard } from "@/components/app/destination-card"
import { Field, Panel, PanelHeading } from "@/components/app/panel"
import { AirportCombobox } from "@/components/airport-combobox"
import { DurationPicker } from "@/components/duration-picker"
import { Button } from "@/components/ui/button"
import { usePlannedRoute } from "@/hooks/use-planned-route"
import { useFlightStore } from "@/lib/flight-store"
import { createTicket } from "@/lib/ticket"

export function PlannerPanel() {
  const { origin, durationMinutes, options, route } = usePlannedRoute()
  const setOrigin = useFlightStore((state) => state.setOrigin)
  const setDuration = useFlightStore((state) => state.setDuration)
  const nextRoute = useFlightStore((state) => state.nextRoute)
  const issueTicket = useFlightStore((state) => state.issueTicket)

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
          Wähle Abflughafen und Fokuszeit. Du fliegst so lange, wie du dich konzentrierst, und
          landest, wenn die Zeit um ist.
        </PanelHeading>

        <Field label="Abflug">
          <AirportCombobox value={origin} onValueChange={setOrigin} />
        </Field>

        <Field label="Fokuszeit">
          <DurationPicker value={durationMinutes} onValueChange={setDuration} />
        </Field>

        <DestinationCard
          origin={origin}
          route={route}
          focusMinutes={durationMinutes}
          canShuffle={options.length > 1}
          onShuffle={nextRoute}
        />
      </div>
    </Panel>
  )
}
