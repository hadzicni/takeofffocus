"use client"

import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatKm } from "@/lib/format"
import { DURATION_PRESETS, MAX_DURATION, MIN_DURATION } from "@/lib/flight-store"
import { distanceForMinutes } from "@/lib/geo"

type DurationPickerProps = {
  value: number
  onValueChange: (minutes: number) => void
}

export function DurationPicker({ value, onValueChange }: DurationPickerProps) {
  const pressed = DURATION_PRESETS.some((preset) => preset === value) ? [String(value)] : []

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <p className="flex items-baseline gap-2">
          <span className="text-6xl leading-none font-semibold tracking-tighter tabular-nums">
            {value}
          </span>
          <span className="text-base text-muted-foreground">Minuten</span>
        </p>
        {/* Ties the abstract duration to the journey it buys */}
        <p className="pb-1 text-right text-xs text-muted-foreground">
          Reichweite
          <span className="block font-mono text-sm text-foreground tabular-nums">
            ≈ {formatKm(distanceForMinutes(value))}
          </span>
        </p>
      </div>
      <Slider
        value={value}
        onValueChange={(minutes) => onValueChange(Array.isArray(minutes) ? minutes[0] : minutes)}
        min={MIN_DURATION}
        max={MAX_DURATION}
        step={5}
        aria-label="Fokuszeit in Minuten"
      />
      <ToggleGroup
        value={pressed}
        onValueChange={([preset]) => preset && onValueChange(Number(preset))}
        size="sm"
        spacing={1.5}
        aria-label="Schnellauswahl Fokuszeit"
        className="w-full"
      >
        {DURATION_PRESETS.map((preset) => (
          <ToggleGroupItem
            key={preset}
            value={String(preset)}
            className="h-9 flex-1 rounded-full bg-white/[0.04] text-sm tabular-nums aria-pressed:bg-foreground aria-pressed:text-background"
          >
            {preset} min
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
