"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { PauseIcon, PlayIcon, Volume2Icon, VolumeXIcon, XIcon } from "lucide-react"

import { FlapText } from "@/components/flap-text"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCabinNoise } from "@/hooks/use-cabin-noise"
import { flightPhase } from "@/lib/flight"
import { elapsedMs, useFlightStore } from "@/lib/flight-store"
import { announceLanding } from "@/lib/notifications"
import { MAP_MODES, usePreferencesStore, type MapMode } from "@/lib/preferences-store"
import type { Ticket } from "@/lib/ticket"

// Leaflet touches `window` on import, so the map only renders in the browser.
const FlightMap = dynamic(() => import("@/components/flight-map"), {
  ssr: false,
  loading: () => <div className="size-full animate-pulse bg-muted" />,
})

/** Re-render interval; keeps the plane moving smoothly without busy looping. */
const TICK_MS = 250

function formatRemaining(ms: number) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const mmss = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`
  return hours > 0 ? `${hours}:${mmss}` : mmss
}

export function FlightScreen({ ticket }: { ticket: Ticket }) {
  const { phase, departedAt, pausedAt, pausedMs, pause, resume, land, abort } = useFlightStore()
  const { mapMode, setMapMode, ambientVolume, setAmbientVolume } = usePreferencesStore()
  const [now, setNow] = useState(Date.now)
  const [soundOn, setSoundOn] = useState(false)
  const paused = pausedAt !== null
  const landed = phase === "landed"

  // The cabin falls quiet while paused and after landing.
  useCabinNoise(soundOn && !paused && !landed, ambientVolume)

  useEffect(() => {
    if (paused || landed) return
    const id = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(id)
  }, [paused, landed])

  const totalMs = ticket.durationMinutes * 60_000
  const elapsed = elapsedMs({ departedAt, pausedAt, pausedMs }, now)
  const progress = Math.min(1, Math.max(0, elapsed / totalMs))
  const remaining = formatRemaining(totalMs - elapsed)
  const route = `${ticket.origin.iata} → ${ticket.destination.iata}`

  useEffect(() => {
    if (progress >= 1 && land()) announceLanding(ticket)
  }, [progress, land, ticket])

  useEffect(() => {
    const previousTitle = document.title
    const status = landed ? "Gelandet" : `${paused ? "⏸ " : ""}${remaining}`
    document.title = `${status} · ${route}`
    return () => {
      document.title = previousTitle
    }
  }, [remaining, route, paused, landed])

  return (
    <>
      <div className="takeoff-reveal flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="font-mono text-2xl font-semibold tracking-wider">{route}</h1>
          <p className="text-sm text-muted-foreground">
            {ticket.flightNumber} · Sitz {ticket.seat} · nach {ticket.destination.city}
          </p>
        </div>
        {/* Flight mode annunciator: green for the engaged mode, amber when on hold */}
        <Badge
          variant="outline"
          className={`mt-1 h-6 px-2.5 font-mono font-bold tracking-[0.15em] uppercase ${
            paused && !landed
              ? "border-primary/60 bg-primary/10 text-primary"
              : "border-engaged/60 bg-engaged/10 text-engaged"
          }`}
        >
          {landed ? "Gelandet" : paused ? "Pausiert" : flightPhase(progress)}
        </Badge>
      </div>

      <div className="relative aspect-square w-full overflow-hidden rounded-xl shadow-[0_0_0_1px_var(--color-border),0_1px_0_1px_var(--color-panel-highlight)]">
        <FlightMap
          origin={ticket.origin}
          destination={ticket.destination}
          progress={progress}
          mode={mapMode}
        />
        {/* Above Leaflet's panes and controls (z-index up to 1000) */}
        <ToggleGroup
          value={[mapMode]}
          onValueChange={([mode]) => mode && setMapMode(mode as MapMode)}
          size="sm"
          spacing={0}
          aria-label="Kartenmodus"
          className="takeoff-reveal absolute top-2 right-2 z-[1100] bg-card/85 p-0.5 ring-1 ring-border backdrop-blur-sm [--reveal-delay:1400ms]"
        >
          {MAP_MODES.map(({ value, label }) => (
            <ToggleGroupItem key={value} value={value} className="rounded-md! px-2 text-xs">
              {label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      <div className="takeoff-reveal flex flex-col gap-4 [--reveal-delay:1400ms]">
        <div
          className={`flex justify-center transition-opacity motion-reduce:transition-none ${paused ? "opacity-50" : ""}`}
          role="timer"
          aria-label="Verbleibende Zeit"
        >
          <FlapText text={remaining} className={remaining.length > 5 ? "text-4xl" : "text-6xl"} />
        </div>
        <Progress value={progress * 100} aria-label="Flugfortschritt" />
        <div className="flex justify-between font-mono text-xs font-bold tracking-widest text-muted-foreground">
          <span>{ticket.origin.iata}</span>
          <span>{Math.floor(progress * 100)} %</span>
          <span>{ticket.destination.iata}</span>
        </div>
      </div>

      {!landed && (
        <div className="takeoff-reveal flex flex-col gap-2 [--reveal-delay:1600ms]">
          <Button
            size="lg"
            variant={paused ? "default" : "outline"}
            className="h-11 text-base"
            onClick={() => {
              if (!paused) return pause()
              // Refresh `now` with the resume so elapsed time doesn't briefly jump back.
              resume()
              setNow(Date.now())
            }}
          >
            {paused ? <PlayIcon /> : <PauseIcon />}
            {paused ? "Fortsetzen" : "Pause"}
          </Button>
          <div className="flex h-9 items-center gap-3">
            <Toggle
              pressed={soundOn}
              onPressedChange={setSoundOn}
              aria-label="Kabinengeräusch"
              className="shrink-0"
            >
              {soundOn ? <Volume2Icon /> : <VolumeXIcon />}
            </Toggle>
            {soundOn ? (
              <Slider
                value={ambientVolume * 100}
                onValueChange={(value) =>
                  setAmbientVolume((Array.isArray(value) ? value[0] : value) / 100)
                }
                min={5}
                max={100}
                aria-label="Lautstärke Kabinengeräusch"
                className="flex-1"
              />
            ) : (
              <span className="text-sm text-muted-foreground">Kabinengeräusch</span>
            )}
          </div>
          <Button variant="ghost" onClick={abort}>
            <XIcon />
            Flug abbrechen
          </Button>
        </div>
      )}
    </>
  )
}
