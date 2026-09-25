"use client"

import { useState } from "react"
import { LocateFixedIcon, LoaderCircleIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox"
import { airports, findNearestAirport, type Airport } from "@/lib/airports"

type AirportComboboxProps = {
  value: Airport | null
  onValueChange: (airport: Airport | null) => void
}

const airportLabel = (airport: Airport) => `${airport.iata} · ${airport.city}`

function matchesQuery(airport: Airport, query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return true
  return [airport.iata, airport.name, airport.city, airport.country].some((field) =>
    field.toLowerCase().includes(q)
  )
}

export function AirportCombobox({ value, onValueChange }: AirportComboboxProps) {
  const [locating, setLocating] = useState(false)
  const [locateError, setLocateError] = useState<string | null>(null)

  function locate() {
    if (!("geolocation" in navigator)) {
      setLocateError("Standortbestimmung wird von diesem Browser nicht unterstützt.")
      return
    }

    setLocating(true)
    setLocateError(null)
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        onValueChange(findNearestAirport({ lat: coords.latitude, lon: coords.longitude }))
        setLocating(false)
      },
      () => {
        setLocateError("Standort konnte nicht ermittelt werden.")
        setLocating(false)
      },
      { maximumAge: 10 * 60 * 1000, timeout: 10_000 }
    )
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <Combobox
          items={airports}
          value={value}
          onValueChange={onValueChange}
          itemToStringLabel={airportLabel}
          itemToStringValue={(airport) => airport.iata}
          isItemEqualToValue={(a, b) => a.iata === b.iata}
          filter={matchesQuery}
        >
          <ComboboxInput
            placeholder="Flughafen, Stadt oder IATA-Code"
            aria-label="Abflughafen"
            className="h-12 flex-1 rounded-xl bg-white/[0.04] text-base md:text-sm"
          />
          <ComboboxContent>
            <ComboboxEmpty>Kein Flughafen gefunden.</ComboboxEmpty>
            <ComboboxList>
              {(airport: Airport) => (
                <ComboboxItem key={airport.iata} value={airport} className="gap-3 rounded-lg py-2">
                  <span className="grid h-7 w-11 shrink-0 place-items-center rounded-md bg-white/[0.06] font-mono text-xs font-semibold tracking-wide">
                    {airport.iata}
                  </span>
                  <span className="flex min-w-0 flex-col">
                    <span className="truncate">
                      {airport.city}, {airport.country}
                    </span>
                    <span className="truncate text-xs text-muted-foreground">
                      {airport.name}
                    </span>
                  </span>
                </ComboboxItem>
              )}
            </ComboboxList>
          </ComboboxContent>
        </Combobox>
        <Button
          variant="secondary"
          size="icon"
          className="size-12 rounded-xl"
          onClick={locate}
          disabled={locating}
          aria-label="Nächstgelegenen Flughafen verwenden"
          title="Nächstgelegenen Flughafen verwenden"
        >
          {locating ? <LoaderCircleIcon className="animate-spin" /> : <LocateFixedIcon />}
        </Button>
      </div>
      {locateError && <p className="text-xs text-destructive">{locateError}</p>}
    </div>
  )
}
