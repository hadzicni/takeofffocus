"use client"

import "leaflet/dist/leaflet.css"

import { useMemo } from "react"
import { divIcon, latLngBounds, type LatLngTuple } from "leaflet"
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip } from "react-leaflet"

import type { Airport } from "@/lib/airports"
import { interpolate, mapBearing, unwrapLongitude, type Coordinates } from "@/lib/geo"

type FlightMapProps = {
  origin: Airport
  destination: Airport
  /** Fraction of the route flown, 0–1. */
  progress: number
}

const toLatLng = ({ lat, lon }: Coordinates): LatLngTuple => [lat, lon]

// Airplane silhouette pointing north (Material Symbols "flight", Apache 2.0).
const PLANE_PATH =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"

export default function FlightMap({ origin, destination, progress }: FlightMapProps) {
  // Unwrapped so routes across the antimeridian are drawn the short way.
  const end = useMemo(() => unwrapLongitude(origin, destination), [origin, destination])
  const bounds = useMemo(() => latLngBounds([toLatLng(origin), toLatLng(end)]), [origin, end])

  const planeIcon = useMemo(
    () =>
      divIcon({
        className: "flight-plane",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        html: `<svg viewBox="0 0 24 24" style="transform: rotate(${mapBearing(origin, end)}deg)"><path d="${PLANE_PATH}"/></svg>`,
      }),
    [origin, end]
  )

  const position = interpolate(origin, end, progress)

  return (
    <MapContainer
      bounds={bounds}
      boundsOptions={{ padding: [48, 48] }}
      zoomControl={false}
      scrollWheelZoom={false}
      className="size-full"
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />

      <Polyline
        positions={[toLatLng(position), toLatLng(end)]}
        pathOptions={{ className: "flight-route-remaining" }}
      />
      <Polyline
        positions={[toLatLng(origin), toLatLng(position)]}
        pathOptions={{ className: "flight-route-flown" }}
      />

      {[origin, { ...destination, ...end }].map((airport) => (
        <CircleMarker
          key={airport.iata}
          center={toLatLng(airport)}
          radius={5}
          pathOptions={{ className: "flight-airport" }}
        >
          <Tooltip permanent direction="top" offset={[0, -6]} className="flight-airport-label">
            {airport.iata}
          </Tooltip>
        </CircleMarker>
      ))}

      <Marker position={toLatLng(position)} icon={planeIcon} interactive={false} />
    </MapContainer>
  )
}
