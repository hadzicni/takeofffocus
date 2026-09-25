"use client"

import { useState } from "react"

import { BoardingPanel } from "@/components/app/boarding-panel"
import { Brand } from "@/components/app/brand"
import { FlightHud } from "@/components/app/flight-hud"
import { PlannerPanel } from "@/components/app/planner-panel"
import type { CameraView, SceneMode } from "@/components/globe/scene-director"
import { LandingDialog } from "@/components/landing-dialog"
import { Stage } from "@/components/stage"
import { useFlightClock } from "@/hooks/use-flight-clock"
import { usePlannedRoute } from "@/hooks/use-planned-route"
import { useViewport } from "@/hooks/use-viewport"
import { useWebGL } from "@/hooks/use-webgl"
import { useFlightStore } from "@/lib/flight-store"
import { usePreferencesStore } from "@/lib/preferences-store"

/** Views mounted within this window after boarding still get the takeoff intro. */
const INTRO_WINDOW_MS = 4000
/** Planner/boarding panel width + its left margin, see Panel. */
const SIDE_PANEL_PX = 420 + 24

export function TakeoffFocus() {
  const { phase, ticket, newFlight } = useFlightStore()
  const mapMode = usePreferencesStore((state) => state.mapMode)
  const planned = usePlannedRoute()
  const clock = useFlightClock()
  const viewport = useViewport()
  const globeAvailable = useWebGL()
  const [view, setView] = useState<CameraView>("follow")

  const inFlight = (phase === "flight" || phase === "landed") && ticket
  const origin = ticket?.origin ?? planned.origin
  const destination = ticket?.destination ?? planned.route?.destination ?? null
  const mode: SceneMode =
    phase === "flight" ? "flight" : phase === "landed" ? "landed" : origin ? "planning" : "idle"

  // Keep the globe clear of the panels: right of the sidebar on desktop,
  // above the bottom sheet on phones.
  const framing = inFlight
    ? { x: 0, y: viewport.desktop ? 0 : viewport.height * 0.08 }
    : viewport.desktop
      ? { x: SIDE_PANEL_PX / 2, y: 0 }
      : { x: 0, y: viewport.height * 0.2 }

  return (
    <div className="fixed inset-0 overflow-hidden bg-background">
      <Stage
        mapMode={mapMode}
        scene={{
          mode,
          origin,
          destination,
          progress: clock.progress,
          intro: clock.elapsedMs < INTRO_WINDOW_MS,
          view,
          framing,
        }}
      />

      {/* Legibility: soft shade behind the header and wherever panels sit */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-background/80 to-transparent" />
      {inFlight ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-background/85 via-background/30 to-transparent" />
      ) : (
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent lg:bg-gradient-to-r lg:from-background/75 lg:via-background/10" />
      )}

      <header className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-4 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6 sm:pt-5">
        <div className="pointer-events-auto">
          <Brand />
        </div>
      </header>

      <main className="pointer-events-none absolute inset-0">
        {phase === "setup" && <PlannerPanel />}
        {phase === "boarding" && ticket && <BoardingPanel ticket={ticket} />}
        {inFlight && (
          <FlightHud
            ticket={ticket}
            clock={clock}
            view={view}
            onViewChange={setView}
            globeAvailable={globeAvailable}
          />
        )}
      </main>

      {inFlight && (
        <LandingDialog
          ticket={ticket}
          open={phase === "landed"}
          onNewFlight={(from) => {
            setView("follow")
            newFlight(from)
          }}
        />
      )}
    </div>
  )
}
