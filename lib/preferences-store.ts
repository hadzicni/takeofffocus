import { create } from "zustand"
import { persist } from "zustand/middleware"

export type MapMode = "classic" | "satellite" | "night"

export const MAP_MODES: { value: MapMode; label: string }[] = [
  { value: "classic", label: "Klassisch" },
  { value: "satellite", label: "Satellit" },
  { value: "night", label: "Nacht 3D" },
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
      mapMode: "classic",
      ambientVolume: 0.5,
      setMapMode: (mapMode) => set({ mapMode }),
      setAmbientVolume: (ambientVolume) => set({ ambientVolume }),
    }),
    { name: "takeofffocus-preferences" }
  )
)
