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
      <div className="flex items-baseline gap-1.5">
        <span className="text-4xl font-semibold tabular-nums tracking-tight">{value}</span>
        <span className="text-sm text-muted-foreground">Min</span>
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
            className="flex-1 tabular-nums data-pressed:border-primary data-pressed:bg-primary data-pressed:text-primary-foreground"
          >
            {preset}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}
