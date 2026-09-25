import { useMemo } from "react"

import { findRouteOptions } from "@/lib/flight"
import { useFlightStore } from "@/lib/flight-store"

/** The destinations matching the chosen origin and duration, and the one currently offered. */
export function usePlannedRoute() {
  const origin = useFlightStore((state) => state.origin)
  const durationMinutes = useFlightStore((state) => state.durationMinutes)
  const routeIndex = useFlightStore((state) => state.routeIndex)

  const options = useMemo(
    () => (origin ? findRouteOptions(origin, durationMinutes) : []),
    [origin, durationMinutes]
  )
  const route = options.length > 0 ? options[routeIndex % options.length] : null

  return { origin, durationMinutes, options, route }
}
