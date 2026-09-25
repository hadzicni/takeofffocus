"use client"

import { useEffect, useRef, useState } from "react"
import { GlobeIcon, PauseIcon, PlayIcon, Volume2Icon, VolumeXIcon, XIcon } from "lucide-react"

import type { CameraView } from "@/components/globe/scene-director"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCabinNoise } from "@/hooks/use-cabin-noise"
import { formatDuration, type FlightClock } from "@/hooks/use-flight-clock"
import { useIdle } from "@/hooks/use-idle"
import { flightPhase } from "@/lib/flight"
import { useFlightStore } from "@/lib/flight-store"
import { formatKm } from "@/lib/format"
import { MAP_MODES, usePreferencesStore, type MapMode } from "@/lib/preferences-store"
import type { Ticket } from "@/lib/ticket"

const clockTime = new Intl.DateTimeFormat("de-CH", { hour: "2-digit", minute: "2-digit" })
/** Quiet time before the HUD recedes and only the timer stays. */
const IDLE_MS = 5000

type FlightHudProps = {
  ticket: Ticket
  clock: FlightClock
  view: CameraView
  onViewChange: (view: CameraView) => void
  globeAvailable: boolean
}

export function FlightHud({ ticket, clock, view, onViewChange, globeAvailable }: FlightHudProps) {
  const { phase, departedAt, pausedMs, pause, resume, abort } = useFlightStore()
  const { mapMode, setMapMode, ambientVolume, setAmbientVolume } = usePreferencesStore()
  const [soundOn, setSoundOn] = useState(false)
  const landed = phase === "landed"
  const { paused, progress } = clock
  const idle = useIdle(IDLE_MS, !paused && !landed)

  // The cabin falls quiet while paused and after landing.
  useCabinNoise(soundOn && !paused && !landed, ambientVolume)

  // Space toggles pause, unless a control has focus (it handles Space itself).
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.code !== "Space" || landed || event.target !== document.body) return
      event.preventDefault()
      if (paused) resume()
      else pause()
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [paused, landed, pause, resume])

  const flownKm = ticket.distanceKm * progress
  const landingAt = departedAt ? departedAt + pausedMs + ticket.durationMinutes * 60_000 : null
  const status = landed ? "Gelandet" : paused ? "Pausiert" : flightPhase(progress)

  return (
    <div
      data-idle={idle || undefined}
      className="pointer-events-none absolute inset-0 flex flex-col justify-between gap-4 px-3 pt-[4.25rem] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6 sm:pt-20 sm:pb-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="hud-chrome takeoff-reveal glass pointer-events-auto flex flex-col gap-1.5 rounded-2xl px-4 py-3 [--reveal-delay:2200ms]">
          <div className="flex items-center gap-3">
            <p className="text-lg font-semibold tracking-tight">
              {ticket.origin.iata}
              <span className="mx-1.5 text-muted-foreground">→</span>
              {ticket.destination.iata}
            </p>
            <StatusPill status={status} live={!paused && !landed} caution={paused && !landed} />
          </div>
          <p className="text-xs text-muted-foreground">
            {ticket.origin.city} nach {ticket.destination.city} · {ticket.flightNumber} · Sitz {ticket.seat}
          </p>
        </div>

        <div className="hud-chrome takeoff-reveal glass pointer-events-auto flex items-center gap-1 rounded-full p-1 [--reveal-delay:2200ms]">
          <ToggleGroup
            value={[mapMode]}
            onValueChange={([mode]) => mode && setMapMode(mode as MapMode)}
            size="sm"
            spacing={0.5}
            aria-label="Ansicht"
          >
            {MAP_MODES.map(({ value, label }) => (
              <ToggleGroupItem
                key={value}
                value={value}
                disabled={value === "globe" && !globeAvailable}
                className="h-8 rounded-full px-3 text-xs aria-pressed:bg-foreground aria-pressed:text-background"
              >
                {label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          {mapMode === "globe" && globeAvailable && (
            <Toggle
              pressed={view === "overview"}
              onPressedChange={(pressed) => onViewChange(pressed ? "overview" : "follow")}
              size="sm"
              aria-label="Übersicht über den ganzen Globus"
              title="Übersicht"
              className="size-8 rounded-full aria-pressed:bg-foreground aria-pressed:text-background"
            >
              <GlobeIcon />
            </Toggle>
          )}
        </div>
      </div>

      <section
        aria-label="Flug"
        className="hud-panel takeoff-reveal glass pointer-events-auto mx-auto flex w-full max-w-xl flex-col gap-5 rounded-[2rem] px-5 pt-5 pb-4 [--reveal-delay:1400ms] sm:px-8 sm:pt-7 sm:pb-6"
      >
        <div className="flex flex-col items-center gap-1">
          <p className="hud-chrome eyebrow">{landed ? "Angekommen" : paused ? "Pausiert" : "Verbleibende Fokuszeit"}</p>
          <p
            role="timer"
            aria-label="Verbleibende Fokuszeit"
            className={`hud-timer text-[clamp(3.75rem,15vw,6.25rem)] leading-none font-semibold tracking-[-0.045em] tabular-nums transition-opacity motion-reduce:transition-none ${paused ? "opacity-50" : ""}`}
          >
            {formatDuration(clock.remainingMs)}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3 font-mono text-xs font-medium">
            <span>{ticket.origin.iata}</span>
            <Progress value={progress * 100} aria-label="Flugfortschritt" className="flex-1" />
            <span>{ticket.destination.iata}</span>
          </div>
          <div className="hud-chrome flex justify-between text-xs text-muted-foreground tabular-nums">
            <span>
              {formatKm(flownKm)} von {formatKm(ticket.distanceKm)}
            </span>
            <span>
              {paused || !landingAt ? "Landung pausiert" : `Landung ${clockTime.format(landingAt)}`}
            </span>
          </div>
        </div>

        {!landed && (
          <div className="hud-chrome flex items-center justify-center gap-3">
            <Toggle
              pressed={soundOn}
              onPressedChange={setSoundOn}
              aria-label="Kabinengeräusch"
              title="Kabinengeräusch"
              className="size-11 shrink-0 rounded-full bg-white/[0.06] aria-pressed:bg-foreground aria-pressed:text-background"
            >
              {soundOn ? <Volume2Icon /> : <VolumeXIcon />}
            </Toggle>

            <Button
              size="lg"
              className="h-11 min-w-36 rounded-full px-6 text-[0.9375rem] font-semibold"
              onClick={paused ? resume : pause}
            >
              {paused ? <PlayIcon /> : <PauseIcon />}
              {paused ? "Weiterfliegen" : "Pause"}
            </Button>

            <AbortButton onConfirm={abort} />
          </div>
        )}

        {!landed && soundOn && (
          <div className="hud-chrome -mt-1 flex items-center gap-3 px-2">
            <Volume2Icon className="size-3.5 shrink-0 text-muted-foreground" aria-hidden />
            <Slider
              value={ambientVolume * 100}
              onValueChange={(value) => setAmbientVolume((Array.isArray(value) ? value[0] : value) / 100)}
              min={5}
              max={100}
              aria-label="Lautstärke Kabinengeräusch"
            />
          </div>
        )}
      </section>
    </div>
  )
}

function StatusPill({ status, live, caution }: { status: string; live: boolean; caution: boolean }) {
  const color = caution ? "bg-primary" : "bg-live"
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-white/[0.06] px-2.5 py-1 text-xs font-medium">
      <span className="relative flex size-1.5">
        {live && (
          <span className={`absolute inset-0 animate-ping rounded-full ${color} opacity-70 motion-reduce:animate-none`} />
        )}
        <span className={`relative size-1.5 rounded-full ${color}`} />
      </span>
      {status}
    </span>
  )
}

/** Ending a focus session early is deliberate: the first press asks, the second ends. */
function AbortButton({ onConfirm }: { onConfirm: () => void }) {
  const [armed, setArmed] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => () => clearTimeout(timer.current), [])

  function press() {
    if (armed) return onConfirm()
    setArmed(true)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setArmed(false), 3000)
  }

  return (
    <Button
      variant={armed ? "destructive" : "secondary"}
      onClick={press}
      aria-label={armed ? "Wirklich beenden? Zum Bestätigen erneut drücken" : "Flug beenden"}
      title="Flug beenden"
      className={`h-11 shrink-0 rounded-full transition-all ${armed ? "px-4" : "w-11 px-0"}`}
    >
      <XIcon />
      {armed && <span className="text-sm">Beenden?</span>}
    </Button>
  )
}
