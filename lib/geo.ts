export type Coordinates = {
  lat: number
  lon: number
}

/** Mean Earth radius in kilometres (IUGG). */
export const EARTH_RADIUS_KM = 6371

/** Assumed average cruise speed used to turn distances into flight times. */
export const CRUISE_SPEED_KMH = 800

const toRadians = (degrees: number) => (degrees * Math.PI) / 180

/** Great-circle distance between two points using the Haversine formula. */
export function haversineDistanceKm(from: Coordinates, to: Coordinates): number {
  const dLat = toRadians(to.lat - from.lat)
  const dLon = toRadians(to.lon - from.lon)
  const lat1 = toRadians(from.lat)
  const lat2 = toRadians(to.lat)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(a)))
}

/** Flight time in minutes for a distance at the given speed. */
export function flightMinutes(distanceKm: number, speedKmh = CRUISE_SPEED_KMH): number {
  return (distanceKm / speedKmh) * 60
}

/** Distance in kilometres covered in the given number of minutes. */
export function distanceForMinutes(minutes: number, speedKmh = CRUISE_SPEED_KMH): number {
  return (minutes / 60) * speedKmh
}

const toDegrees = (radians: number) => (radians * 180) / Math.PI

/**
 * Shifts `to.lon` by ±360° so the straight line from `from` doesn't wrap
 * around the globe when a route crosses the antimeridian.
 */
export function unwrapLongitude(from: Coordinates, to: Coordinates): Coordinates {
  const delta = to.lon - from.lon
  if (delta > 180) return { ...to, lon: to.lon - 360 }
  if (delta < -180) return { ...to, lon: to.lon + 360 }
  return to
}

/** Point at fraction `t` (0–1) along the straight map line between two points. */
export function interpolate(from: Coordinates, to: Coordinates, t: number): Coordinates {
  const end = unwrapLongitude(from, to)
  return {
    lat: from.lat + (end.lat - from.lat) * t,
    lon: from.lon + (end.lon - from.lon) * t,
  }
}

const mercatorY = (lat: number) => Math.log(Math.tan(Math.PI / 4 + toRadians(lat) / 2))

/** Heading in degrees (0 = north, clockwise) of the straight line on a Web Mercator map. */
export function mapBearing(from: Coordinates, to: Coordinates): number {
  const end = unwrapLongitude(from, to)
  const dx = toRadians(end.lon - from.lon)
  const dy = mercatorY(end.lat) - mercatorY(from.lat)
  return (toDegrees(Math.atan2(dx, dy)) + 360) % 360
}
