import { MathUtils, Vector3 } from "three"

import { easeInOutCubic, easeOutCubic, type GreatCircle } from "@/lib/globe-math"

/**
 * Heights above the unit globe. Exaggerated roughly 15× so the climb reads at
 * globe scale; a real cruise altitude would be 0.0017.
 */
export const ALTITUDE = { ground: 0.0009, departure: 0.006, cruise: 0.015 }

/** Clouds sit between the departure and cruise altitudes, so the climb passes through them. */
export const CLOUD_ALTITUDE = { min: 0.0035, max: 0.0085 }

/**
 * Takeoff in the 3D scene, continuing the choreography in globals.css:
 *   0 → establishS              establishing shot, from space down to the runway
 *   establishS → +liftoffS      takeoff roll and climb through the clouds
 */
export const TAKEOFF = { establishS: 3.4, liftoffS: 4 }
export const TAKEOFF_TOTAL_S = TAKEOFF.establishS + TAKEOFF.liftoffS

/** Length of the takeoff roll in globe units (~75 km, exaggerated like the altitudes). */
const RUNWAY = 0.012

export type PlanePose = {
  position: Vector3
  /** Local vertical (away from the globe centre). */
  up: Vector3
  /** Direction of travel, tangent to the globe. */
  forward: Vector3
  /** Radians, nose up positive. */
  pitch: number
  /** Radians, right wing down positive. */
  roll: number
  altitude: number
  /** Liftoff progress 0–1; 1 once airborne or when there is no intro. */
  liftoff: number
}

export const createPose = (): PlanePose => ({
  position: new Vector3(),
  up: new Vector3(0, 1, 0),
  forward: new Vector3(0, 0, 1),
  pitch: 0,
  roll: 0,
  altitude: ALTITUDE.ground,
  liftoff: 1,
})

const smoothstep = (edge0: number, edge1: number, x: number) =>
  MathUtils.smoothstep(x, edge0, edge1)

/**
 * Where the plane is. Route position follows the focus progress; the takeoff
 * intro adds a roll from behind the origin and a climb to departure altitude,
 * ending exactly where the progress-driven pose continues.
 */
export function updatePose(
  pose: PlanePose,
  circle: GreatCircle,
  progress: number,
  /** Seconds since the intro started, or Infinity when there is none. */
  introS: number,
  /** Scene time in seconds, for the gentle in-flight motion. */
  time: number,
  motion: boolean
) {
  const liftoff = MathUtils.clamp((introS - TAKEOFF.establishS) / TAKEOFF.liftoffS, 0, 1)
  const rollOut = circle.angle > 0 ? (RUNWAY / circle.angle) * (1 - easeOutCubic(liftoff)) : 0
  const t = progress - rollOut

  circle.pointAt(t, pose.up)
  circle.tangentAt(t, pose.forward)

  // Intro climb to departure altitude, then the phases from the badge:
  // climb 5–15 %, cruise, descend 85–100 %.
  const intro = MathUtils.lerp(ALTITUDE.ground, ALTITUDE.departure, easeInOutCubic(liftoff))
  const climbed = MathUtils.lerp(intro, ALTITUDE.cruise, smoothstep(0.05, 0.15, progress))
  const altitude = MathUtils.lerp(climbed, ALTITUDE.ground, smoothstep(0.85, 1, progress))
  pose.altitude = altitude
  pose.position.copy(pose.up).multiplyScalar(1 + altitude)
  pose.liftoff = liftoff

  const rotation = liftoff > 0 && liftoff < 1 ? 0.24 * Math.sin(Math.PI * liftoff) : 0
  const phasePitch = progress < 0.15 && progress > 0.05 ? 0.05 : progress > 0.85 ? -0.04 : 0
  pose.pitch = rotation + phasePitch
  pose.roll = motion ? 0.05 * Math.sin(time * 0.37) + 0.02 * Math.sin(time * 1.13) : 0
  if (motion) pose.pitch += 0.015 * Math.sin(time * 0.53)
}
