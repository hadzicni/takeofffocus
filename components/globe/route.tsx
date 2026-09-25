"use client"

import { useMemo, useRef } from "react"
import { Html, Line } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { Vector3, type Color, type Mesh } from "three"
import type { Line2 } from "three-stdlib"

import type { Airport } from "@/lib/airports"
import type { PlanePose } from "@/lib/globe-flight"
import { easeInOutCubic, toUnitVector, type GreatCircle } from "@/lib/globe-math"

/** Lift the route just off the surface so it never z-fights the globe. */
const ROUTE_ALTITUDE = 0.0007
const SEGMENTS = 96
/** Seconds for a newly planned route to draw itself across the globe. */
const DRAW_S = 1.4

/** Grow markers with camera distance so they stay visible from far out. */
const screenScale = (distance: number, nearDistance: number) => Math.max(1, distance / nearDistance)

type RouteProps = {
  /** Identifies the route; a new id redraws the planned line. */
  id: string
  circle: GreatCircle
  /** Planned (not yet flying): the line draws itself in, no flown part. */
  planned: boolean
  progress: number
  pose: PlanePose
  color: Color
  animate: boolean
}

export function Route({ id, circle, planned, progress, pose, color, animate }: RouteProps) {
  // Pushed above 1 so the line crosses the bloom threshold and glows.
  const glow = useMemo(() => color.clone().multiplyScalar(2.2), [color])

  return planned ? (
    <PlannedRoute key={id} circle={circle} color={glow} animate={animate} />
  ) : (
    <FlownRoute circle={circle} progress={progress} pose={pose} color={color} glow={glow} />
  )
}

function PlannedRoute({ circle, color, animate }: { circle: GreatCircle; color: Color; animate: boolean }) {
  const line = useRef<Line2>(null)
  const drawnAt = useRef<number | null>(null)
  const points = useMemo(() => circle.sample(0, 1, SEGMENTS, ROUTE_ALTITUDE * 1.4), [circle])
  const positions = useMemo(() => new Float32Array((SEGMENTS + 1) * 3), [])

  useFrame(({ clock }) => {
    if (!line.current) return
    drawnAt.current ??= clock.elapsedTime
    const t = animate ? Math.min(1, (clock.elapsedTime - drawnAt.current) / DRAW_S) : 1
    if (t === 1 && drawnAt.current < 0) return
    // Draw by collapsing the not-yet-drawn points onto the pen tip.
    const tip = easeInOutCubic(t) * SEGMENTS
    for (let i = 0; i <= SEGMENTS; i++) {
      const point = points[Math.min(i, Math.floor(tip))]
      positions.set([point.x, point.y, point.z], i * 3)
    }
    line.current.geometry.setPositions(positions)
    if (t === 1) drawnAt.current = -1
  })

  return <Line ref={line} points={points} color={color} lineWidth={2.5} toneMapped={false} />
}

function FlownRoute({
  circle,
  progress,
  pose,
  color,
  glow,
}: {
  circle: GreatCircle
  progress: number
  pose: PlanePose
  color: Color
  glow: Color
}) {
  const remaining = useMemo(() => circle.sample(0, 1, SEGMENTS, ROUTE_ALTITUDE), [circle])
  // Quantised so the flown line rebuilds a few hundred times per flight, not every tick.
  const flownUntil = Math.max(0.002, Math.round(progress * 400) / 400)
  const flown = useMemo(
    () =>
      circle.sample(0, flownUntil, Math.max(2, Math.ceil(SEGMENTS * flownUntil)), ROUTE_ALTITUDE * 1.4),
    [circle, flownUntil]
  )
  const dash = circle.angle / 60

  return (
    <group>
      <Line
        points={remaining}
        color={color}
        lineWidth={1.5}
        dashed
        dashSize={dash}
        gapSize={dash * 0.8}
        transparent
        opacity={0.5}
      />
      <Line points={flown} color={glow} lineWidth={3} toneMapped={false} />
      <GroundTrack pose={pose} color={glow} />
    </group>
  )
}

/** Glowing dot on the surface below the plane: the current position on the flight plan. */
function GroundTrack({ pose, color }: { pose: PlanePose; color: Color }) {
  const dot = useRef<Mesh>(null)
  const outward = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    if (!dot.current) return
    dot.current.position.copy(pose.up).multiplyScalar(1 + ROUTE_ALTITUDE * 2)
    dot.current.lookAt(outward.copy(pose.up).multiplyScalar(2))
    dot.current.scale.setScalar(screenScale(camera.position.distanceTo(dot.current.position), 0.2))
  })

  return (
    <mesh ref={dot}>
      <circleGeometry args={[0.0018, 16]} />
      <meshBasicMaterial color={color} toneMapped={false} />
    </mesh>
  )
}

export function AirportMarker({ airport, color }: { airport: Airport; color: Color }) {
  const label = useRef<HTMLDivElement>(null)
  const ring = useRef<Mesh>(null)
  const { position, facing } = useMemo(() => {
    const up = toUnitVector(airport)
    return {
      position: up.clone().multiplyScalar(1 + ROUTE_ALTITUDE),
      facing: up.clone().multiplyScalar(2),
    }
  }, [airport])
  const toCamera = useMemo(() => new Vector3(), [])

  useFrame(({ camera }) => {
    toCamera.subVectors(camera.position, position)
    ring.current?.scale.setScalar(screenScale(toCamera.length(), 0.25))
    // Hide the label while the airport is on the far side of the globe.
    if (label.current) label.current.style.opacity = toCamera.dot(position) > 0 ? "1" : "0"
  })

  return (
    <group position={position}>
      <mesh ref={ring} onUpdate={(mesh) => mesh.lookAt(facing)}>
        <ringGeometry args={[0.0026, 0.0038, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html center zIndexRange={[5, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className="globe-label">
          {airport.iata}
        </div>
      </Html>
    </group>
  )
}
