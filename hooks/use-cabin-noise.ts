import { useEffect, useRef } from "react"

import { CabinNoise } from "@/lib/cabin-noise"

/** Plays the cabin ambience at `volume` while `playing`, fading in and out. */
export function useCabinNoise(playing: boolean, volume: number) {
  const noise = useRef<CabinNoise | null>(null)

  useEffect(() => {
    // Created lazily so no AudioContext exists until the user turns sound on.
    if (playing && !noise.current) noise.current = new CabinNoise()
    noise.current?.setVolume(playing ? volume : 0)
  }, [playing, volume])

  useEffect(
    () => () => {
      noise.current?.dispose()
      noise.current = null
    },
    []
  )
}
