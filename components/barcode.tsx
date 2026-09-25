import { useMemo } from "react"

/** Deterministic PRNG so the same code always renders the same bars. */
function seededRandom(seed: string) {
  let h = 2166136261
  for (const char of seed) h = Math.imul(h ^ char.charCodeAt(0), 16777619)
  return () => {
    h = Math.imul(h ^ (h >>> 15), h | 1)
    h ^= h + Math.imul(h ^ (h >>> 7), h | 61)
    return ((h ^ (h >>> 14)) >>> 0) / 4294967296
  }
}

type Bar = { x: number; width: number }

function generateBars(code: string, length: number): Bar[] {
  const random = seededRandom(code)
  const bars: Bar[] = []
  let x = 0
  while (x < length) {
    const width = 1 + Math.floor(random() * 3)
    bars.push({ x, width: Math.min(width, length - x) })
    x += width + 1 + Math.floor(random() * 2)
  }
  return bars
}

type BarcodeProps = {
  code: string
  className?: string
}

/** Decorative barcode look; not a scannable symbology. */
export function Barcode({ code, className }: BarcodeProps) {
  const length = 160
  const bars = useMemo(() => generateBars(code, length), [code])

  return (
    <svg
      viewBox={`0 0 ${length} 40`}
      preserveAspectRatio="none"
      className={className}
      role="img"
      aria-label={`Barcode ${code}`}
    >
      {bars.map((bar) => (
        <rect key={bar.x} x={bar.x} width={bar.width} height={40} fill="currentColor" />
      ))}
    </svg>
  )
}
