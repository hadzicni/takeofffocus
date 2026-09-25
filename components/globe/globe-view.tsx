"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { PerformanceMonitor, useProgress, useTexture } from "@react-three/drei"
import { Canvas, useThree } from "@react-three/fiber"
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing"
import { GlobeIcon } from "lucide-react"
import { ToneMappingMode } from "postprocessing"

import { Airplane } from "@/components/globe/airplane"
import { Clouds, Sky } from "@/components/globe/atmosphere"
import { EARTH_TEXTURES, Earth } from "@/components/globe/earth"
import { FlightDirector, type CameraView } from "@/components/globe/flight-director"
import { Route } from "@/components/globe/route"
import { Toggle } from "@/components/ui/toggle"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { Airport } from "@/lib/airports"
import { TAKEOFF, TAKEOFF_TOTAL_S, createPose } from "@/lib/globe-flight"
import { GreatCircle, sunDirection, toUnitVector } from "@/lib/globe-math"
import { readThemeColor } from "@/lib/theme-color"

// Start fetching the textures as soon as this chunk loads (it is warmed up on the boarding screen).
useTexture.preload(EARTH_TEXTURES)

/**
 * Frame budget. The scene renders on demand: every frame during the takeoff,
 * then at a steady 30 fps in cruise (sessions last up to hours, so this halves
 * the GPU work on battery), and only a few times a second with reduced motion.
 */
const FPS = { takeoff: 60, cruise: 30, still: 4 }

type GlobeViewProps = {
  origin: Airport
  destination: Airport
  progress: number
  /** Play the establishing shot and takeoff; false when switching views mid-flight. */
  intro: boolean
  /** Called when WebGL stops working (context lost), so the 2D map can take over. */
  onFailure: () => void
}

export default function GlobeView({ origin, destination, progress, intro, onFailure }: GlobeViewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const motion = !reducedMotion
  // Captured once: changing the view mid-flight must not restart the takeoff.
  const [playIntro] = useState(intro && motion)
  const [view, setView] = useState<CameraView>(motion ? "follow" : "overview")
  const [ready, setReady] = useState(false)
  const [takingOff, setTakingOff] = useState(playIntro)
  const [degraded, setDegraded] = useState(false)

  const circle = useMemo(
    () => new GreatCircle(toUnitVector(origin), toUnitVector(destination)),
    [origin, destination]
  )
  const sun = useMemo(() => sunDirection(new Date()), [])
  const pose = useMemo(() => createPose(), [])
  const colors = useMemo(
    () => ({
      space: readThemeColor("--card"),
      route: readThemeColor("--route"),
      marker: readThemeColor("--selected"),
      accent: readThemeColor("--primary"),
    }),
    []
  )

  useEffect(() => {
    if (!ready || !takingOff) return
    const id = setTimeout(() => setTakingOff(false), (TAKEOFF_TOTAL_S + 0.5) * 1000)
    return () => clearTimeout(id)
  }, [ready, takingOff])

  const fps = !motion ? FPS.still : takingOff ? FPS.takeoff : FPS.cruise

  return (
    <div className="relative size-full">
      <Canvas
        frameloop="demand"
        dpr={degraded ? 1 : [1, 1.75]}
        camera={{ fov: 40, near: 0.0004, far: 200, position: [0, 0, 4] }}
        gl={{ antialias: false, logarithmicDepthBuffer: true, powerPreference: "high-performance" }}
        onCreated={({ gl }) => {
          gl.domElement.addEventListener("webglcontextlost", (event) => {
            event.preventDefault()
            onFailure()
          })
        }}
        aria-hidden
      >
        <color attach="background" args={[colors.space]} />
        {/* Drops resolution and post-processing if the frame rate sags (e.g. integrated GPUs). */}
        <PerformanceMonitor onDecline={() => setDegraded(true)} flipflops={1} />
        <FrameDriver fps={fps} />

        <hemisphereLight args={["#9fb7ff", "#0b0f18", 0.45]} />
        <directionalLight position={sun.clone().multiplyScalar(10)} intensity={2.4} />

        <Suspense fallback={null}>
          <Earth sun={sun} />
          <Sky sun={sun} twinkle={motion} />
          <Clouds circle={circle} sun={sun} count={degraded ? 400 : 900} drift={motion} />
          <Route
            circle={circle}
            progress={progress}
            origin={origin}
            destination={destination}
            pose={pose}
            routeColor={colors.route}
            markerColor={colors.marker}
          />
          <Airplane pose={pose} accent={colors.accent} strobe={motion} />
          <FlightDirector
            pose={pose}
            circle={circle}
            progress={progress}
            view={view}
            intro={playIntro}
            motion={motion}
          />
          <Ready onReady={() => setReady(true)} />
        </Suspense>

        {/* Bloom only on values above 1 (sun, route glow, nav lights), so the globe stays crisp. */}
        {!degraded && (
          <EffectComposer multisampling={4}>
            <Bloom mipmapBlur intensity={0.75} luminanceThreshold={1} luminanceSmoothing={0.15} />
            {/* The composer renders to an HDR target, so tone mapping moves here (matches the renderer default). */}
            <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
          </EffectComposer>
        )}
      </Canvas>

      {!ready && <LoadingOverlay />}

      {ready && (
        <Toggle
          pressed={view === "overview"}
          onPressedChange={(pressed) => setView(pressed ? "overview" : "follow")}
          size="sm"
          aria-label="Globus-Übersicht"
          className="takeoff-reveal absolute bottom-2 left-2 z-10 bg-card/85 px-2 text-xs ring-1 ring-border backdrop-blur-sm"
          style={{ "--reveal-delay": `${playIntro ? TAKEOFF.establishS * 1000 : 0}ms` } as React.CSSProperties}
        >
          <GlobeIcon />
          Übersicht
        </Toggle>
      )}
    </div>
  )
}

function Ready({ onReady }: { onReady: () => void }) {
  useEffect(onReady, [onReady])
  return null
}

function FrameDriver({ fps }: { fps: number }) {
  const invalidate = useThree((state) => state.invalidate)

  useEffect(() => {
    let frame = 0
    let last = 0
    const interval = 1000 / fps
    const tick = (now: number) => {
      if (now - last >= interval - 2) {
        last = now
        invalidate()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fps, invalidate])

  return null
}

function LoadingOverlay() {
  const { progress } = useProgress()

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card font-mono text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
      <span>3D-Szene wird geladen</span>
      <div className="h-1 w-40 overflow-hidden bg-muted" role="progressbar" aria-valuenow={Math.round(progress)} aria-valuemin={0} aria-valuemax={100} aria-label="3D-Szene wird geladen">
        <div className="h-full bg-selected transition-[width] motion-reduce:transition-none" style={{ width: `${progress}%` }} />
      </div>
      <span className="text-selected tabular-nums">{Math.round(progress)} %</span>
    </div>
  )
}
