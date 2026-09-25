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
  setMapMode: (mode: MapMode) => void
}

/** Per-device preferences, kept in localStorage (falls back to memory if unavailable). */
export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      mapMode: "classic",
      setMapMode: (mapMode) => set({ mapMode }),
    }),
    { name: "takeofffocus-preferences" }
  )
)
