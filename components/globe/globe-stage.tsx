"use client"

import { Suspense, useEffect, useMemo, useRef, useState } from "react"
import { PerformanceMonitor, useProgress, useTexture } from "@react-three/drei"
import { Canvas, useThree } from "@react-three/fiber"
import { Bloom, EffectComposer, ToneMapping } from "@react-three/postprocessing"
import { ToneMappingMode } from "postprocessing"

import { Airplane } from "@/components/globe/airplane"
import { Clouds, Sky } from "@/components/globe/atmosphere"
import { EARTH_TEXTURES, Earth } from "@/components/globe/earth"
import { AirportMarker, Route } from "@/components/globe/route"
import { SceneDirector, type CameraView, type SceneMode } from "@/components/globe/scene-director"
import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { Airport } from "@/lib/airports"
import { TAKEOFF_TOTAL_S, createPose } from "@/lib/globe-flight"
import { GreatCircle, sunDirection, toUnitVector } from "@/lib/globe-math"
import { readThemeColor } from "@/lib/theme-color"

// Start fetching the textures as soon as this chunk loads.
useTexture.preload(EARTH_TEXTURES)

/**
 * Frame budget. Rendering is on demand: 60 fps during the takeoff and for a
 * moment after every scene change (camera moves), 30 fps otherwise (sessions
 * last up to hours, so this halves GPU work on battery), and only a few frames
 * a second with reduced motion.
 */
const FPS = { smooth: 60, steady: 30, still: 4 }
const TRANSITION_BOOST_S = 2.5

export type GlobeScene = {
  mode: SceneMode
  origin: Airport | null
  destination: Airport | null
  progress: number
  /** Play the takeoff when the flight starts; false for views mounted mid-flight. */
  intro: boolean
  view: CameraView
  /** Shift of the globe in px (right, up), making room for panels. */
  framing: { x: number; y: number }
}

type GlobeStageProps = {
  scene: GlobeScene
  /** WebGL stopped working (context lost); the app falls back to 2D. */
  onFailure: () => void
}

export default function GlobeStage({ scene, onFailure }: GlobeStageProps) {
  const { mode, origin, destination, progress, view, framing } = scene
  const reducedMotion = usePrefersReducedMotion()
  const motion = !reducedMotion
  const [ready, setReady] = useState(false)
  const [degraded, setDegraded] = useState(false)

  const circle = useMemo(
    () =>
      origin && destination
        ? new GreatCircle(toUnitVector(origin), toUnitVector(destination))
        : null,
    [origin, destination]
  )
  const originVector = useMemo(() => (origin ? toUnitVector(origin) : null), [origin])
  const routeId = origin && destination ? `${origin.iata}-${destination.iata}` : ""
  const sun = useMemo(() => sunDirection(new Date()), [])
  const pose = useMemo(() => createPose(), [])
  const colors = useMemo(
    () => ({
      space: readThemeColor("--background"),
      route: readThemeColor("--route"),
      marker: readThemeColor("--foreground"),
      accent: readThemeColor("--primary"),
    }),
    []
  )

  // Keyed on the mode only, so the boost doesn't restart when `intro` expires mid-takeoff.
  const boostSeconds = mode === "flight" ? TAKEOFF_TOTAL_S + 1 : TRANSITION_BOOST_S

  return (
    <>
      <div
        className="absolute inset-0 transition-opacity duration-1000 motion-reduce:transition-none"
        style={{ opacity: ready ? 1 : 0 }}
      >
        <Canvas
          frameloop="demand"
          dpr={degraded ? 1 : [1, 1.5]}
          camera={{ fov: 38, near: 0.0004, far: 200, position: [0, 1.1, 3.1] }}
          gl={{
            antialias: false,
            logarithmicDepthBuffer: true,
            powerPreference: "high-performance",
          }}
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
          <FrameDriver
            fps={motion ? FPS.steady : FPS.still}
            boostFps={motion ? FPS.smooth : FPS.still}
            boostKey={`${mode}|${routeId}|${origin?.iata}|${view}`}
            boostSeconds={boostSeconds}
          />

          <hemisphereLight args={["#9fb7ff", "#0b0f18", 0.45]} />
          <directionalLight position={sun.clone().multiplyScalar(10)} intensity={2.4} />

          <Suspense fallback={null}>
            <Earth sun={sun} />
            <Sky sun={sun} twinkle={motion} />
            {origin && <AirportMarker airport={origin} color={colors.marker} />}
            {circle && destination && (
              <>
                <AirportMarker airport={destination} color={colors.marker} />
                <Route
                  id={routeId}
                  circle={circle}
                  planned={mode === "planning"}
                  progress={progress}
                  pose={pose}
                  color={colors.route}
                  animate={motion}
                />
                <Clouds circle={circle} sun={sun} count={degraded ? 400 : 900} drift={motion} />
                <Airplane pose={pose} accent={colors.accent} strobe={motion} />
              </>
            )}
            <SceneDirector
              mode={mode}
              pose={pose}
              circle={circle}
              origin={originVector}
              progress={progress}
              view={view}
              intro={scene.intro && motion}
              motion={motion}
              framing={framing}
            />
            <Ready onReady={setReady} />
          </Suspense>

          {/* Bloom only on values above 1 (sun, route glow, nav lights, city lights). */}
          {!degraded && (
            <EffectComposer multisampling={4}>
              <Bloom mipmapBlur intensity={0.75} luminanceThreshold={1} luminanceSmoothing={0.15} />
              {/* The composer renders to an HDR target, so tone mapping moves here. */}
              <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
            </EffectComposer>
          )}
        </Canvas>
      </div>
      {!ready && <GlobeLoading />}
    </>
  )
}

function Ready({ onReady }: { onReady: (ready: boolean) => void }) {
  useEffect(() => onReady(true), [onReady])
  return null
}

/** Invalidates the on-demand canvas at `fps`, or `boostFps` for a while after `boostKey` changes. */
function FrameDriver({
  fps,
  boostFps,
  boostKey,
  boostSeconds,
}: {
  fps: number
  boostFps: number
  boostKey: string
  boostSeconds: number
}) {
  const invalidate = useThree((state) => state.invalidate)
  const boostUntil = useRef(0)

  useEffect(() => {
    boostUntil.current = performance.now() + boostSeconds * 1000
  }, [boostKey, boostSeconds])

  useEffect(() => {
    let frame = 0
    let last = 0
    const tick = (now: number) => {
      const interval = 1000 / (now < boostUntil.current ? boostFps : fps)
      if (now - last >= interval - 2) {
        last = now
        invalidate()
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [fps, boostFps, invalidate])

  return null
}

/** Small pill while the globe streams in; the rest of the app is usable meanwhile. */
function GlobeLoading() {
  const { progress } = useProgress()

  return (
    <div className="glass pointer-events-none absolute right-4 bottom-4 z-10 flex items-center gap-2.5 rounded-full px-3.5 py-2 text-xs text-muted-foreground">
      <span className="relative flex size-2">
        <span className="absolute inset-0 animate-ping rounded-full bg-sky opacity-60 motion-reduce:animate-none" />
        <span className="relative size-2 rounded-full bg-sky" />
      </span>
      Globus wird geladen · <span className="font-mono tabular-nums">{Math.round(progress)} %</span>
    </div>
  )
}
