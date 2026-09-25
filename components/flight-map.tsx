"use client"

import "leaflet/dist/leaflet.css"

import { useEffect, useMemo, useRef, type RefObject } from "react"
import { divIcon, latLngBounds, type LatLngBounds, type LatLngTuple, type PointTuple } from "leaflet"
import {
  CircleMarker,
  MapContainer,
  Marker,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
} from "react-leaflet"

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion"
import type { Airport } from "@/lib/airports"
import { interpolate, mapBearing, unwrapLongitude, type Coordinates } from "@/lib/geo"
import type { MapMode } from "@/lib/preferences-store"

type FlightMapProps = {
  origin: Airport
  destination: Airport
  /** Fraction of the route flown, 0–1. */
  progress: number
  mode: MapMode
}

const toLatLng = ({ lat, lon }: Coordinates): LatLngTuple => [lat, lon]

const CARTO_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'

const TILES: Record<MapMode, { url: string; attribution: string; subdomains: string }> = {
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
  night: {
    url: "https://{s}.basemaps.cartocdn.com/dark_nolabels/{z}/{x}/{y}{r}.png",
    attribution: CARTO_ATTRIBUTION,
    subdomains: "abcd",
  },
}

/** The tilted night view crops the edges, so the route needs more breathing room. */
const routePadding = (mode: MapMode): PointTuple => (mode === "night" ? [96, 96] : [48, 48])

/** Takeoff camera: starts close on the origin, then flies out to the whole route. */
const TAKEOFF_ZOOM = 9
const TAKEOFF_CAMERA_S = 2.2
const TAKEOFF_CAMERA_DELAY_MS = 150

/** Max scene shift (px) that keeps the plane drifting toward the centre in night mode. */
const PARALLAX_PX = 14

// Airplane silhouette pointing north (Material Symbols "flight", Apache 2.0).
const PLANE_PATH =
  "M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"

export default function FlightMap({ origin, destination, progress, mode }: FlightMapProps) {
  // Unwrapped so routes across the antimeridian are drawn the short way.
  const end = useMemo(() => unwrapLongitude(origin, destination), [origin, destination])
  const bounds = useMemo(() => latLngBounds([toLatLng(origin), toLatLng(end)]), [origin, end])
  const stageRef = useRef<HTMLDivElement>(null)

  const planeIcon = useMemo(
    () =>
      divIcon({
        className: "flight-plane",
        iconSize: [28, 28],
        iconAnchor: [14, 14],
        // The body wrapper carries the liftoff animation; Leaflet owns the outer element's transform.
        html: `<div class="flight-plane-body"><svg viewBox="0 0 24 24" style="transform: rotate(${mapBearing(origin, end)}deg)"><path d="${PLANE_PATH}"/></svg></div>`,
      }),
    [origin, end]
  )

  const position = interpolate(origin, end, progress)
  const reducedMotion = usePrefersReducedMotion()
  const initialView = reducedMotion
    ? { bounds, boundsOptions: { padding: routePadding(mode) } }
    : { center: toLatLng(origin), zoom: TAKEOFF_ZOOM }
  const tiles = TILES[mode]

  return (
    <div className="flight-map" data-mode={mode}>
      <div ref={stageRef} className="flight-map-stage">
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
          {!reducedMotion && <TakeoffCamera bounds={bounds} padding={routePadding(mode)} />}
          <ModeCamera mode={mode} bounds={bounds} animate={!reducedMotion} />
          {mode === "night" && !reducedMotion && (
            <Parallax stageRef={stageRef} position={position} />
          )}
        </MapContainer>
      </div>
      <div className="flight-map-horizon" aria-hidden />
    </div>
  )
}

function TakeoffCamera({ bounds, padding }: { bounds: LatLngBounds; padding: PointTuple }) {
  const map = useMap()
  // Only the padding at takeoff matters; later mode switches are ModeCamera's job.
  const takeoffPadding = useRef(padding)

  useEffect(() => {
    const id = setTimeout(
      () =>
        map.flyToBounds(bounds, { padding: takeoffPadding.current, duration: TAKEOFF_CAMERA_S }),
      TAKEOFF_CAMERA_DELAY_MS
    )
    return () => clearTimeout(id)
  }, [map, bounds])

  return null
}

/**
 * Refits the route when the mode changes, and locks panning while the map is
 * tilted since Leaflet can't map pointer input through a 3D transform.
 */
function ModeCamera({
  mode,
  bounds,
  animate,
}: {
  mode: MapMode
  bounds: LatLngBounds
  animate: boolean
}) {
  const map = useMap()
  const previousMode = useRef(mode)

  useEffect(() => {
    const tilted = mode === "night"
    for (const handler of [map.dragging, map.touchZoom, map.doubleClickZoom, map.boxZoom]) {
      if (tilted) handler.disable()
      else handler.enable()
    }

    if (previousMode.current === mode) return
    previousMode.current = mode
    map.fitBounds(bounds, { padding: routePadding(mode), animate })
  }, [map, mode, bounds, animate])

  return null
}

/** Shifts the tilted stage slightly against the plane's offset, so the camera seems to follow it. */
function Parallax({
  stageRef,
  position,
}: {
  stageRef: RefObject<HTMLDivElement | null>
  position: Coordinates
}) {
  const map = useMap()

  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const point = map.latLngToContainerPoint(toLatLng(position))
    const size = map.getSize()
    const clamp = (value: number) => Math.max(-1, Math.min(1, value))
    const dx = clamp((point.x - size.x / 2) / (size.x / 2))
    const dy = clamp((point.y - size.y / 2) / (size.y / 2))
    stage.style.setProperty("--parallax-x", `${(-dx * PARALLAX_PX).toFixed(1)}px`)
    stage.style.setProperty("--parallax-y", `${(-dy * PARALLAX_PX).toFixed(1)}px`)
  }, [map, stageRef, position])

  useEffect(() => {
    const stage = stageRef.current
    return () => {
      stage?.style.removeProperty("--parallax-x")
      stage?.style.removeProperty("--parallax-y")
    }
  }, [stageRef])

  return null
}
