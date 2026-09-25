import { useSyncExternalStore } from "react"

function subscribe(onChange: () => void) {
  window.addEventListener("resize", onChange)
  return () => window.removeEventListener("resize", onChange)
}

// Encoded as a string so the snapshot is stable between resizes.
const snapshot = () => `${window.innerWidth}x${window.innerHeight}`

/** Window size in CSS px; 0×0 during server rendering. */
export function useViewport() {
  const size = useSyncExternalStore(subscribe, snapshot, () => "0x0")
  const [width, height] = size.split("x").map(Number)
  return { width, height, desktop: width >= 1024 }
}
