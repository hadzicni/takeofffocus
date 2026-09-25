import airportData from "@/lib/data/airports.json"
import { haversineDistanceKm, type Coordinates } from "@/lib/geo"

/** Subset of the OpenFlights airports.dat fields. */
export type Airport = Coordinates & {
  iata: string
  name: string
  city: string
  country: string
}

export const airports: readonly Airport[] = airportData

const airportsByIata = new Map(airports.map((airport) => [airport.iata, airport]))

export function getAirport(iata: string): Airport | undefined {
  return airportsByIata.get(iata.toUpperCase())
}

export function distanceBetweenAirportsKm(from: Airport, to: Airport): number {
  return haversineDistanceKm(from, to)
}

/** Closest airport to a position, e.g. from the Geolocation API. */
export function findNearestAirport(position: Coordinates): Airport {
  let nearest = airports[0]
  let nearestDistance = Infinity

  for (const airport of airports) {
    const distance = haversineDistanceKm(position, airport)
    if (distance < nearestDistance) {
      nearest = airport
      nearestDistance = distance
    }
  }

  return nearest
}
