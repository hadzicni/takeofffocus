import { useMemo } from "react"

import { findRouteOptions, routeBetween } from "@/lib/flight"
import { useFlightStore } from "@/lib/flight-store"

/**
 * The route being planned: the hand-picked one in manual mode, otherwise the
 * destinations matching origin and duration and the one currently offered.
 */
export function usePlannedRoute() {
  const origin = useFlightStore((state) => state.origin)
  const destinationMode = useFlightStore((state) => state.destinationMode)
  const destination = useFlightStore((state) => state.destination)
  const durationMinutes = useFlightStore((state) => state.durationMinutes)
  const routeIndex = useFlightStore((state) => state.routeIndex)

  const options = useMemo(
    () => (origin && destinationMode === "auto" ? findRouteOptions(origin, durationMinutes) : []),
    [origin, destinationMode, durationMinutes]
  )

  const route =
    destinationMode === "manual"
      ? origin && destination
        ? routeBetween(origin, destination, durationMinutes)
        : null
      : options.length > 0
        ? options[routeIndex % options.length]
        : null

  return { origin, destinationMode, destination, durationMinutes, options, route }
}
