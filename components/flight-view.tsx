"use client"

import { Component, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"

import type { Airport } from "@/lib/airports"
import type { MapMode } from "@/lib/preferences-store"
import { hasWebGL } from "@/lib/webgl"

// Both views are heavy (Leaflet ~150 KB, three.js ~700 KB) and browser-only.
const GlobeView = dynamic(() => import("@/components/globe/globe-view"), {
  ssr: false,
  loading: () => <ViewLoading />,
})
const FlightMap = dynamic(() => import("@/components/flight-map"), {
  ssr: false,
  loading: () => <ViewLoading />,
})

/** Views mounted within this window after boarding play the takeoff intro. */
const INTRO_WINDOW_MS = 4000

type FlightViewProps = {
  origin: Airport
  destination: Airport
  progress: number
  elapsedMs: number
  mode: MapMode
}

/** The 3D globe when WebGL works, otherwise (or after a failure) the 2D map. */
export function FlightView({ origin, destination, progress, elapsedMs, mode }: FlightViewProps) {
  const [webgl] = useState(hasWebGL)
  const [globeFailed, setGlobeFailed] = useState(false)
  // Only the view that is on screen at boarding gets the takeoff intro.
  const [introMode] = useState(() => (elapsedMs < INTRO_WINDOW_MS ? mode : null))
  const intro = mode === introMode

  if (mode === "globe" && webgl && !globeFailed) {
    return (
      <SceneBoundary onError={() => setGlobeFailed(true)}>
        <GlobeView
          origin={origin}
          destination={destination}
          progress={progress}
          intro={intro}
          onFailure={() => setGlobeFailed(true)}
        />
      </SceneBoundary>
    )
  }

  return (
    <>
      <FlightMap
        origin={origin}
        destination={destination}
        progress={progress}
        mode={mode === "globe" ? "classic" : mode}
        intro={intro}
      />
      {mode === "globe" && (
        <p className="absolute bottom-2 left-2 z-[1100] bg-card/85 px-2 py-1 font-mono text-[0.65rem] font-bold tracking-widest text-primary uppercase ring-1 ring-border">
          3D nicht verfügbar · 2D-Karte
        </p>
      )}
    </>
  )
}

function ViewLoading() {
  return <div className="size-full animate-pulse bg-card motion-reduce:animate-none" />
}

/** Catches render errors in the 3D scene (e.g. shader or texture failures). */
class SceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch() {
    this.props.onError()
  }

  render() {
    return this.state.failed ? null : this.props.children
  }
}
