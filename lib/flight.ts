import { airports, type Airport } from "@/lib/airports"
import { distanceForMinutes, flightMinutes, haversineDistanceKm } from "@/lib/geo"

/** Allowed deviation between the route's flight time and the focus duration. */
export const DURATION_TOLERANCE = 0.15

/** Shorter hops (e.g. JFK → EWR) don't make a sensible flight. */
const MIN_ROUTE_KM = 150

/** How many closest matches to offer when nothing is within tolerance. */
const FALLBACK_OPTIONS = 3

export type RouteOption = {
  destination: Airport
  distanceKm: number
  flightMinutes: number
  withinTolerance: boolean
}

/**
 * Destinations whose distance best matches the focus duration, best first.
 * Falls back to the closest matches when no airport lies within tolerance.
 */
export function findRouteOptions(
  origin: Airport,
  focusMinutes: number,
  tolerance = DURATION_TOLERANCE
): RouteOption[] {
  const targetKm = distanceForMinutes(focusMinutes)

  const options = airports
    .map((destination) => {
      const distanceKm = haversineDistanceKm(origin, destination)
      return {
        destination,
        distanceKm,
        flightMinutes: flightMinutes(distanceKm),
        withinTolerance: Math.abs(distanceKm - targetKm) <= targetKm * tolerance,
      }
    })
    .filter((option) => option.distanceKm >= MIN_ROUTE_KM)
    .sort((a, b) => Math.abs(a.distanceKm - targetKm) - Math.abs(b.distanceKm - targetKm))

  const matches = options.filter((option) => option.withinTolerance)
  return matches.length > 0 ? matches : options.slice(0, FALLBACK_OPTIONS)
}

export type FlightPhase = "Taxiing" | "Climbing" | "Cruising" | "Descending" | "Landing"

/** Phase of flight for a progress value between 0 and 1. */
export function flightPhase(progress: number): FlightPhase {
  if (progress < 0.05) return "Taxiing"
  if (progress < 0.15) return "Climbing"
  if (progress < 0.85) return "Cruising"
  if (progress < 0.95) return "Descending"
  return "Landing"
}
