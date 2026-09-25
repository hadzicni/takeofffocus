import { create } from "zustand"
import { persist } from "zustand/middleware"

export type MapMode = "globe" | "classic" | "satellite"

export const MAP_MODES: { value: MapMode; label: string }[] = [
  { value: "globe", label: "3D Globus" },
  { value: "classic", label: "Karte" },
  { value: "satellite", label: "Satellit" },
]

type PreferencesState = {
  mapMode: MapMode
  /** Cabin ambience volume, 0–1. Playback itself always starts off. */
  ambientVolume: number
  setMapMode: (mode: MapMode) => void
  setAmbientVolume: (volume: number) => void
}

/** Per-device preferences, kept in localStorage (falls back to memory if unavailable). */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      mapMode: "globe",
      ambientVolume: 0.5,
      setMapMode: (mapMode) => set({ mapMode }),
      setAmbientVolume: (ambientVolume) => set({ ambientVolume }),
    }),
    {
      name: "takeofffocus-preferences",
      version: 1,
      // v0 had a CSS-tilted "night" mode and a 2D default; both move to the real 3D globe.
      // An explicit satellite choice is kept.
      migrate: (persisted, version) => {
        const state = persisted as Partial<PreferencesState> & { mapMode?: string }
        if (version < 1 && state.mapMode !== "satellite") state.mapMode = "globe"
        return state as PreferencesState
      },
    }
  )
)
