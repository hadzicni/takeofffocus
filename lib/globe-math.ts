import { MathUtils, Vector3 } from "three"

import type { Coordinates } from "@/lib/geo"

/**
 * Globe space: a unit sphere, y up, oriented so an equirectangular texture on
 * three's SphereGeometry lines up (lon 0 on +x, lon 90°E on -z).
 */
export function toUnitVector({ lat, lon }: Coordinates, target = new Vector3()): Vector3 {
  const phi = MathUtils.degToRad(lat)
  const lambda = MathUtils.degToRad(lon)
  return target.set(
    Math.cos(phi) * Math.cos(lambda),
    Math.sin(phi),
    -Math.cos(phi) * Math.sin(lambda)
  )
}

/** Great circle through two points; `t` outside 0–1 extrapolates along the same circle. */
export class GreatCircle {
  /** Central angle between the endpoints, in radians. */
  readonly angle: number
  private readonly start: Vector3
  /** Unit vector perpendicular to `start`, in the plane of the circle, pointing towards the end. */
  private readonly across: Vector3

  constructor(from: Vector3, to: Vector3) {
    this.start = from.clone().normalize()
    const end = to.clone().normalize()
    const cos = MathUtils.clamp(this.start.dot(end), -1, 1)
    this.angle = Math.acos(cos)
    this.across = end.addScaledVector(this.start, -cos).normalize()
  }

  pointAt(t: number, target = new Vector3()): Vector3 {
    const theta = t * this.angle
    return target.copy(this.start).multiplyScalar(Math.cos(theta)).addScaledVector(this.across, Math.sin(theta))
  }

  /** Unit direction of travel at `t`, tangent to the sphere. */
  tangentAt(t: number, target = new Vector3()): Vector3 {
    const theta = t * this.angle
    return target.copy(this.start).multiplyScalar(-Math.sin(theta)).addScaledVector(this.across, Math.cos(theta))
  }

  /** Normal of the circle's plane; points "left" of the direction of travel. */
  normal(target = new Vector3()): Vector3 {
    return target.crossVectors(this.start, this.across).normalize()
  }

  /** Points along the arc from `from` to `to` (fractions of the route), `altitude` above the surface. */
  sample(from: number, to: number, segments: number, altitude = 0): Vector3[] {
    return Array.from({ length: segments + 1 }, (_, i) =>
      this.pointAt(from + ((to - from) * i) / segments).multiplyScalar(1 + altitude)
    )
  }
}

/**
 * Direction to the sun for a moment in time, from the subsolar point.
 * Ignores the equation of time (±16 min), which is invisible at this scale.
 */
export function sunDirection(date: Date, target = new Vector3()): Vector3 {
  const startOfYear = Date.UTC(date.getUTCFullYear(), 0, 0)
  const dayOfYear = (date.getTime() - startOfYear) / 86_400_000
  const declination = -23.44 * Math.cos(((2 * Math.PI) / 365) * (dayOfYear + 10))
  const utcHours = date.getUTCHours() + date.getUTCMinutes() / 60
  return toUnitVector({ lat: declination, lon: (12 - utcHours) * 15 }, target)
}

export const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2

export const easeOutCubic = (t: number) => 1 - (1 - t) ** 3
