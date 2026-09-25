"use client"

import { useMemo, useRef } from "react"
import { Stars } from "@react-three/drei"
import { useFrame } from "@react-three/fiber"
import {
  AdditiveBlending,
  BufferGeometry,
  CanvasTexture,
  Float32BufferAttribute,
  MathUtils,
  Vector3,
  type Group,
} from "three"

import { CLOUD_ALTITUDE } from "@/lib/globe-flight"
import type { GreatCircle } from "@/lib/globe-math"

/** Soft round sprite drawn once on a canvas; avoids shipping an image asset. */
function glowTexture(size: number, stops: [number, string][]) {
  const canvas = document.createElement("canvas")
  canvas.width = canvas.height = size
  const context = canvas.getContext("2d")!
  const gradient = context.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
  for (const [offset, color] of stops) gradient.addColorStop(offset, color)
  context.fillStyle = gradient
  context.fillRect(0, 0, size, size)
  return new CanvasTexture(canvas)
}

/** Small seeded PRNG (mulberry32): the same route always gets the same cloud field. */
function seededRandom(seed: number) {
  let state = seed >>> 0
  return () => {
    state = (state + 0x6d2b79f5) >>> 0
    let t = state
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

type CloudsProps = {
  circle: GreatCircle
  sun: Vector3
  count: number
  drift: boolean
}

/**
 * Cloud puffs between departure and cruise altitude: a dense bank around the
 * origin (the climb passes through it) and a looser corridor along the route.
 */
export function Clouds({ circle, sun, count, drift }: CloudsProps) {
  const group = useRef<Group>(null)
  const sprite = useMemo(
    () => glowTexture(64, [[0, "rgba(255,255,255,0.9)"], [0.45, "rgba(255,255,255,0.35)"], [1, "rgba(255,255,255,0)"]]),
    []
  )

  const geometry = useMemo(() => {
    const positions: number[] = []
    const colors: number[] = []
    const normal = circle.normal()
    const point = new Vector3()
    const tangent = new Vector3()
    // Keep the corridor a similar physical width on short and long routes.
    const bank = 0.035 / Math.max(circle.angle, 0.035)
    const random = seededRandom(Math.floor(circle.angle * 1e9))
    const between = (min: number, max: number) => min + random() * (max - min)

    for (let i = 0; i < count; i++) {
      const nearOrigin = i < count * 0.55
      const t = nearOrigin ? between(-bank, bank * 2.5) : random()
      const lateral = between(-1, 1) * (nearOrigin ? 0.025 : 0.035)
      circle.pointAt(t, point)
      circle.tangentAt(t, tangent)
      point
        .addScaledVector(normal, lateral)
        .addScaledVector(tangent, between(-0.005, 0.005))
        .normalize()

      // Lit on the day side, faint blue-grey at night.
      const light = MathUtils.lerp(0.12, 1, MathUtils.smoothstep(point.dot(sun), -0.15, 0.25))
      colors.push(light * 0.95, light * 0.97, light)

      point.multiplyScalar(1 + between(CLOUD_ALTITUDE.min, CLOUD_ALTITUDE.max))
      positions.push(point.x, point.y, point.z)
    }

    const buffer = new BufferGeometry()
    buffer.setAttribute("position", new Float32BufferAttribute(positions, 3))
    buffer.setAttribute("color", new Float32BufferAttribute(colors, 3))
    return buffer
  }, [circle, sun, count])

  // A slow sway rather than a drift, so the clouds stay over the route for hours.
  useFrame(({ clock }) => {
    if (drift && group.current) group.current.rotation.y = 0.003 * Math.sin(clock.elapsedTime * 0.05)
  })

  return (
    <group ref={group}>
      <points geometry={geometry}>
        <pointsMaterial
          map={sprite}
          size={0.011}
          sizeAttenuation
          vertexColors
          transparent
          opacity={0.6}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

/** Stars and a sun whose glare the bloom pass turns into soft rays. */
export function Sky({ sun, twinkle }: { sun: Vector3; twinkle: boolean }) {
  const glare = useMemo(
    () => glowTexture(128, [[0, "rgba(255,248,230,1)"], [0.15, "rgba(255,230,180,0.6)"], [1, "rgba(255,200,120,0)"]]),
    []
  )
  const position = useMemo(() => sun.clone().multiplyScalar(60), [sun])

  return (
    <>
      <Stars radius={90} depth={40} count={2500} factor={3} saturation={0} fade speed={twinkle ? 0.4 : 0} />
      <sprite position={position} scale={[9, 9, 1]}>
        <spriteMaterial
          map={glare}
          color={[3, 2.8, 2.4]}
          blending={AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </sprite>
    </>
  )
}
