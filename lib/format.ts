const kilometres = new Intl.NumberFormat("de-CH", { maximumFractionDigits: 0 })

export const formatKm = (km: number) => `${kilometres.format(km)} km`

/** 47 → "47 min", 111 → "1 h 51 min". */
export function formatFlightTime(minutes: number) {
  const rounded = Math.round(minutes)
  if (rounded < 60) return `${rounded} min`
  const rest = rounded % 60
  return rest === 0 ? `${rounded / 60} h` : `${Math.floor(rounded / 60)} h ${rest} min`
}
