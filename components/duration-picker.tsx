"use client"

import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { DURATION_PRESETS, MAX_DURATION, MIN_DURATION } from "@/lib/flight-store"

type DurationPickerProps = {
  value: number
  onValueChange: (minutes: number) => void
}

export function DurationPicker({ value, onValueChange }: DurationPickerProps) {
  const pressed = DURATION_PRESETS.some((preset) => preset === value) ? [String(value)] : []

  return (
    <div className="flex flex-col gap-4">
      {/* A selected value, so it reads cyan like a target set on the flight control unit */}
      <div className="flex items-baseline gap-2 font-mono">
        <span className="text-5xl font-bold tabular-nums text-selected">{value}</span>
        <span className="text-xs font-bold tracking-[0.2em] text-muted-foreground uppercase">
          Min
        </span>
      </div>
      <Slider
        value={value}
        onValueChange={(minutes) => onValueChange(Array.isArray(minutes) ? minutes[0] : minutes)}
        min={MIN_DURATION}
        max={MAX_DURATION}
        step={5}
        aria-label="Fokusdauer in Minuten"
      />
      <ToggleGroup
        value={pressed}
        onValueChange={([preset]) => preset && onValueChange(Number(preset))}
        variant="outline"
        size="sm"
        className="w-full"
      >
        {DURATION_PRESETS.map((preset) => (
          <ToggleGroupItem
            key={preset}
            value={String(preset)}
            className="flex-1 tabular-nums"
          >
            {preset}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
