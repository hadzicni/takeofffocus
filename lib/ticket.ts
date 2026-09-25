import type { Airport } from "@/lib/airports"
import type { RouteOption } from "@/lib/flight"

export type Ticket = {
  origin: Airport
  destination: Airport
  distanceKm: number
  durationMinutes: number
  flightNumber: string
  seat: string
  gate: string
  /** Epoch ms at which the boarding pass was issued. */
  issuedAt: number
}

const SEAT_LETTERS = "ABCDEF"

const randomInt = (min: number, max: number) =>
  min + Math.floor(Math.random() * (max - min + 1))

const randomLetter = (letters: string) => letters[randomInt(0, letters.length - 1)]

export function createTicket(
  origin: Airport,
  route: RouteOption,
  durationMinutes: number,
  now = Date.now()
): Ticket {
  return {
    origin,
    destination: route.destination,
    distanceKm: route.distanceKm,
    durationMinutes,
    flightNumber: `TF ${randomInt(100, 999)}`,
    seat: `${randomInt(1, 32)}${randomLetter(SEAT_LETTERS)}`,
    gate: `${randomLetter("ABCDE")}${randomInt(1, 60)}`,
    issuedAt: now,
  }
}
