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
