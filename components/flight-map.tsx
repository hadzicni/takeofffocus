"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useState } from "react"
import { divIcon, latLngBounds, type LatLngBounds, type LatLngTuple, type PointTuple } from "leaflet"
import { CircleMarker, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from "react-leaflet"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { Airport } from "@/lib/airports"
import { interpolate, mapBearing, unwrapLongitude, type Coordinates } from "@/lib/geo"

export type FlatMapMode = "classic" | "satellite"

type FlightMapProps = {
  origin: Airport
  destination: Airport
  /** Fraction of the route flown, 0–1. */
  progress: number
  mode: FlatMapMode
  /** Play the takeoff camera and liftoff; false when switching views mid-flight. */
  intro: boolean
}

const toLatLng = ({ lat, lon }: Coordinates): LatLngTuple => [lat, lon]

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

const TILES: Record<FlatMapMode, { url: string; attribution: string; subdomains: string }> = {
  classic: {
    url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTRIBUTION,
    subdomains: "abcd",
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution:
      "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    subdomains: "abc",
  },
}

const ROUTE_PADDING: PointTuple = [48, 48]

/** Takeoff camera: starts close on the origin, then flies out to the whole route. */
const TAKEOFF_ZOOM = 9
const TAKEOFF_CAMERA_S = 2.2
const TAKEOFF_CAMERA_DELAY_MS = 150

// Airplane silhouette pointing north (Material Symbols "flight", Apache 2.0).
const PLANE_PATH =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"

export default function FlightMap({ origin, destination, progress, mode, intro }: FlightMapProps) {
  // Unwrapped so routes across the antimeridian are drawn the short way.
  const end = useMemo(() => unwrapLongitude(origin, destination), [origin, destination])
  const bounds = useMemo(() => latLngBounds([toLatLng(origin), toLatLng(end)]), [origin, end])
  const reducedMotion = usePrefersReducedMotion()
  // Captured once: switching tiles mid-flight must not restart the takeoff.
  const [playIntro] = useState(intro && !reducedMotion)

  const planeIcon = useMemo(
    () =>
      divIcon({
        className: "flight-plane",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        // The body wrapper carries the liftoff animation; Leaflet owns the outer element's transform.
        html: `<div class="flight-plane-body${playIntro ? " flight-plane-liftoff" : ""}"><svg viewBox="0 0 24 24" style="transform: rotate(${mapBearing(origin, end)}deg)"><path d="${PLANE_PATH}"/></svg></div>`,
      }),
    [origin, end, playIntro]
  )

  const position = interpolate(origin, end, progress)
  const initialView = playIntro
    ? { center: toLatLng(origin), zoom: TAKEOFF_ZOOM }
    : { bounds, boundsOptions: { padding: ROUTE_PADDING } }
  const tiles = TILES[mode]

  return (
    <div className="flight-map">
      <MapContainer
        {...initialView}
        zoomControl={false}
        scrollWheelZoom={false}
        className="size-full"
      >
        <TileLayer
          key={mode}
          url={tiles.url}
          attribution={tiles.attribution}
          subdomains={tiles.subdomains}
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
        {playIntro && <TakeoffCamera bounds={bounds} />}
      </MapContainer>
    </div>
  )
}

function TakeoffCamera({ bounds }: { bounds: LatLngBounds }) {
  const map = useMap()

  useEffect(() => {
    const id = setTimeout(
      () => map.flyToBounds(bounds, { padding: ROUTE_PADDING, duration: TAKEOFF_CAMERA_S }),
      TAKEOFF_CAMERA_DELAY_MS
    )
    return () => clearTimeout(id)
  }, [map, bounds])

  return null
}
