"use client"

import { useMemo, useRef } from "react"
import { Html, Line } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import { Vector3, type Color, type Mesh } from "three"

import type { Airport } from "@/lib/airports"
import type { PlanePose } from "@/lib/globe-flight"
import { toUnitVector, type GreatCircle } from "@/lib/globe-math"

/** Lift the route just off the surface so it never z-fights the globe. */
const ROUTE_ALTITUDE = 0.0007
const SEGMENTS = 96

/** Grow markers with camera distance so they stay visible from the overview. */
const screenScale = (distance: number, nearDistance: number) => Math.max(1, distance / nearDistance)

type RouteProps = {
  circle: GreatCircle
  progress: number
  origin: Airport
  destination: Airport
  pose: PlanePose
  routeColor: Color
  markerColor: Color
}

export function Route({ circle, progress, origin, destination, pose, routeColor, markerColor }: RouteProps) {
  const remaining = useMemo(() => circle.sample(0, 1, SEGMENTS, ROUTE_ALTITUDE), [circle])
  // Quantised so the flown line rebuilds a few hundred times per flight, not every tick.
  const flownUntil = Math.max(0.002, Math.round(progress * 400) / 400)
  const flown = useMemo(
    () => circle.sample(0, flownUntil, Math.max(2, Math.ceil(SEGMENTS * flownUntil)), ROUTE_ALTITUDE * 1.4),
    [circle, flownUntil]
  )
  // Pushed above 1 so the flown line crosses the bloom threshold and glows.
  const glow = useMemo(() => routeColor.clone().multiplyScalar(2.2), [routeColor])
  const dash = circle.angle / 60

  return (
    <group>
      <Line
        points={remaining}
        color={routeColor}
        lineWidth={1.5}
        dashed
        dashSize={dash}
        gapSize={dash * 0.8}
        transparent
        opacity={0.55}
      />
      <Line points={flown} color={glow} lineWidth={3} toneMapped={false} />
      <GroundTrack pose={pose} color={glow} />
      <AirportMarker airport={origin} color={markerColor} />
      <AirportMarker airport={destination} color={markerColor} />
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

function AirportMarker({ airport, color }: { airport: Airport; color: Color }) {
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

  // Hide the label while the airport is on the far side of the globe.
  useFrame(({ camera }) => {
    toCamera.subVectors(camera.position, position)
    ring.current?.scale.setScalar(screenScale(toCamera.length(), 0.25))
    if (label.current) label.current.style.opacity = toCamera.dot(position) > 0 ? "1" : "0"
  })

  return (
    <group position={position}>
      <mesh ref={ring} onUpdate={(mesh) => mesh.lookAt(facing)}>
        <ringGeometry args={[0.0026, 0.0038, 24]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
      <Html center zIndexRange={[20, 0]} style={{ pointerEvents: "none" }}>
        <div ref={label} className="globe-label">
          {airport.iata}
        </div>
      </Html>
    </group>
  )
}
