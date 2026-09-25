"use client"

import { Component, useState, type ReactNode } from "react"
import dynamic from "next/dynamic"

import type { GlobeScene } from "@/components/globe/globe-stage"
import { useWebGL } from "@/hooks/use-webgl"
import type { MapMode } from "@/lib/preferences-store"

// Both are heavy (three.js ~1 MB, Leaflet ~150 KB) and browser-only, so they
// stream in after the first paint; the starfield covers the gap.
const GlobeStage = dynamic(() => import("@/components/globe/globe-stage"), { ssr: false })
const FlightMap = dynamic(() => import("@/components/flight-map"), { ssr: false })

type StageProps = {
  scene: GlobeScene
  mapMode: MapMode
}

/**
 * The backdrop behind every screen: the 3D globe when WebGL works, the flat
 * map in flight when chosen (or as the fallback), and a starfield otherwise.
 */
export function Stage({ scene, mapMode }: StageProps) {
  const webgl = useWebGL()
  const [globeFailed, setGlobeFailed] = useState(false)
  const globe = webgl && !globeFailed
  const inFlight = scene.mode === "flight" || scene.mode === "landed"
  const flat = inFlight && (mapMode !== "globe" || !globe)

  return (
    <div className="night-sky absolute inset-0 isolate" aria-hidden>
      {flat && scene.origin && scene.destination ? (
        <FlightMap
          origin={scene.origin}
          destination={scene.destination}
          progress={scene.progress}
          mode={mapMode === "satellite" ? "satellite" : "classic"}
          intro={scene.intro}
        />
      ) : (
        globe && (
          <SceneBoundary onError={() => setGlobeFailed(true)}>
            <GlobeStage scene={scene} onFailure={() => setGlobeFailed(true)} />
          </SceneBoundary>
        )
      )}
      {inFlight && mapMode === "globe" && !globe && (
        <p className="glass absolute top-24 left-1/2 z-[1100] -translate-x-1/2 rounded-full px-3 py-1.5 text-xs text-muted-foreground">
          3D ist auf diesem Gerät nicht verfügbar – du fliegst auf der Karte.
        </p>
      )}
    </div>
  )
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
