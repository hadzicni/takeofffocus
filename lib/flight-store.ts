import { create } from "zustand"

import type { Airport } from "@/lib/airports"
import type { Ticket } from "@/lib/ticket"

export const DURATION_PRESETS = [15, 25, 45, 60, 90] as const
export const MIN_DURATION = 10
export const MAX_DURATION = 180

export type Phase = "setup" | "boarding" | "flight" | "landed"

type FlightState = {
  phase: Phase
  origin: Airport | null
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

const idleSession = { ticket: null, departedAt: null, pausedAt: null, pausedMs: 0, resumedAt: null }

export const useFlightStore = create<FlightState>()((set, get) => ({
  phase: "setup",
  origin: null,
  durationMinutes: 25,
  routeIndex: 0,
  ...idleSession,
  setOrigin: (origin) => set({ origin, routeIndex: 0 }),
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
  newFlight: (origin) => set({ ...idleSession, phase: "setup", origin, routeIndex: 0 }),
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
