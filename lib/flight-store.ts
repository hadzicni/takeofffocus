import { create } from "zustand"

import type { Airport } from "@/lib/airports"
import { flightMinutes, haversineDistanceKm } from "@/lib/geo"
import type { Ticket } from "@/lib/ticket"

export const DURATION_PRESETS = [15, 25, 45, 60, 90] as const
export const MIN_DURATION = 10
export const MAX_DURATION = 180

export type Phase = "setup" | "boarding" | "flight" | "landed"

/** How the destination is chosen: matched to the focus time, or picked by hand. */
export type DestinationMode = "auto" | "manual"

/** A focus time for a real flight time: nearest 5 minutes, within the slider's range. */
export const durationForFlight = (flightMinutes: number) =>
  Math.min(MAX_DURATION, Math.max(MIN_DURATION, Math.round(flightMinutes / 5) * 5))

type FlightState = {
  phase: Phase
  origin: Airport | null
  destinationMode: DestinationMode
  /** The hand-picked destination (manual mode only). */
  destination: Airport | null
  durationMinutes: number
  /** Index into the route options for the current origin and duration. */
  routeIndex: number
  ticket: Ticket | null
  /** Epoch ms at which the focus session started. */
  departedAt: number | null
  /** Epoch ms at which the session was paused, null while running. */
  pausedAt: number | null
  /** Total time spent paused before the current pause. */
  pausedMs: number
  /** Epoch ms of the last resume; a floor for "now" until the clock re-ticks. */
  resumedAt: number | null
  setOrigin: (origin: Airport | null) => void
  setDestinationMode: (mode: DestinationMode) => void
  /** Picks a destination and sets the focus time to its flight time. */
  setDestination: (destination: Airport | null) => void
  setDuration: (minutes: number) => void
  nextRoute: () => void
  issueTicket: (ticket: Ticket) => void
  cancelBoarding: () => void
  board: () => void
  pause: () => void
  resume: () => void
  /** Ends the flight; returns false if it had already landed. */
  land: () => boolean
  abort: () => void
  /** Back to setup for another flight from `origin`. */
  newFlight: (origin: Airport) => void
}

/** Focus time matching the hand-picked route, or no change if the route is incomplete. */
function manualDuration(origin: Airport | null, destination: Airport | null) {
  if (!origin || !destination) return {}
  return { durationMinutes: durationForFlight(flightMinutes(haversineDistanceKm(origin, destination))) }
}

const idleSession = { ticket: null, departedAt: null, pausedAt: null, pausedMs: 0, resumedAt: null }

export const useFlightStore = create<FlightState>()((set, get) => ({
  phase: "setup",
  origin: null,
  destinationMode: "auto",
  destination: null,
  durationMinutes: 25,
  routeIndex: 0,
  ...idleSession,
  setOrigin: (origin) =>
    set((state) => {
      // A destination can't also be the origin.
      const destination = state.destination?.iata === origin?.iata ? null : state.destination
      return {
        origin,
        destination,
        routeIndex: 0,
        ...(state.destinationMode === "manual" ? manualDuration(origin, destination) : {}),
      }
    }),
  setDestinationMode: (destinationMode) =>
    set((state) => ({
      destinationMode,
      routeIndex: 0,
      ...(destinationMode === "manual" ? manualDuration(state.origin, state.destination) : {}),
    })),
  setDestination: (destination) =>
    set((state) => ({ destination, ...manualDuration(state.origin, destination) })),
  setDuration: (durationMinutes) => set({ durationMinutes, routeIndex: 0 }),
  nextRoute: () => set((state) => ({ routeIndex: state.routeIndex + 1 })),
  issueTicket: (ticket) => set({ ticket, phase: "boarding" }),
  cancelBoarding: () => set({ ...idleSession, phase: "setup" }),
  board: () =>
    set({ phase: "flight", departedAt: Date.now(), pausedAt: null, pausedMs: 0, resumedAt: null }),
  pause: () => set((state) => (state.pausedAt ? {} : { pausedAt: Date.now() })),
  resume: () =>
    set((state) =>
      state.pausedAt
        ? {
            pausedAt: null,
            pausedMs: state.pausedMs + Date.now() - state.pausedAt,
            resumedAt: Date.now(),
          }
        : {}
    ),
  land: () => {
    if (get().phase !== "flight") return false
    set({ phase: "landed" })
    return true
  },
  abort: () => set({ ...idleSession, phase: "setup" }),
  newFlight: (origin) =>
    set({ ...idleSession, phase: "setup", origin, destination: null, routeIndex: 0 }),
}))

/** Focus time elapsed at `now`, excluding pauses. */
export function elapsedMs(
  state: Pick<FlightState, "departedAt" | "pausedAt" | "pausedMs" | "resumedAt">,
  now: number
): number {
  if (state.departedAt === null) return 0
  const current = state.pausedAt ?? Math.max(now, state.resumedAt ?? 0)
  return Math.max(0, current - state.departedAt - state.pausedMs)
}
