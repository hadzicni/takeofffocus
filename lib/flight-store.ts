import { create } from "zustand"

import type { Airport } from "@/lib/airports"
import type { Ticket } from "@/lib/ticket"

export const DURATION_PRESETS = [15, 25, 45, 60, 90] as const
export const MIN_DURATION = 10
export const MAX_DURATION = 180

export type Phase = "setup" | "boarding" | "flight"

type FlightState = {
  phase: Phase
  origin: Airport | null
  durationMinutes: number
  /** Index into the route options for the current origin and duration. */
  routeIndex: number
  ticket: Ticket | null
  /** Epoch ms at which the focus session started. */
  departedAt: number | null
  setOrigin: (origin: Airport | null) => void
  setDuration: (minutes: number) => void
  nextRoute: () => void
  issueTicket: (ticket: Ticket) => void
  cancelBoarding: () => void
  board: () => void
}

export const useFlightStore = create<FlightState>()((set) => ({
  phase: "setup",
  origin: null,
  durationMinutes: 25,
  routeIndex: 0,
  ticket: null,
  departedAt: null,
  setOrigin: (origin) => set({ origin, routeIndex: 0 }),
  setDuration: (durationMinutes) => set({ durationMinutes, routeIndex: 0 }),
  nextRoute: () => set((state) => ({ routeIndex: state.routeIndex + 1 })),
  issueTicket: (ticket) => set({ ticket, phase: "boarding" }),
  cancelBoarding: () => set({ ticket: null, phase: "setup" }),
  board: () => set({ phase: "flight", departedAt: Date.now() }),
}))
