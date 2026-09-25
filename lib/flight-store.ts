import { create } from "zustand"

import type { Airport } from "@/lib/airports"

export const DURATION_PRESETS = [15, 25, 45, 60, 90] as const
export const MIN_DURATION = 10
export const MAX_DURATION = 180

type FlightSetupState = {
  origin: Airport | null
  durationMinutes: number
  /** Index into the route options for the current origin and duration. */
  routeIndex: number
  setOrigin: (origin: Airport | null) => void
  setDuration: (minutes: number) => void
  nextRoute: () => void
}

export const useFlightStore = create<FlightSetupState>()((set) => ({
  origin: null,
  durationMinutes: 25,
  routeIndex: 0,
  setOrigin: (origin) => set({ origin, routeIndex: 0 }),
  setDuration: (durationMinutes) => set({ durationMinutes, routeIndex: 0 }),
  nextRoute: () => set((state) => ({ routeIndex: state.routeIndex + 1 })),
}))
