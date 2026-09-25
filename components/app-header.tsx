"use client"

import { useSyncExternalStore } from "react"

const utc = new Intl.DateTimeFormat("de-CH", {
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "UTC",
})

function subscribe(onChange: () => void) {
  const id = setInterval(onChange, 10_000)
  return () => clearInterval(id)
}

/** Top strip of the panel: product legend left, UTC clock right, as on a flight deck. */
export function AppHeader() {
  const time = useSyncExternalStore(
    subscribe,
    () => utc.format(Date.now()),
    () => "--:--"
  )

  return (
    <header className="flex items-center justify-between border-b border-border/70 pb-3 font-mono text-xs font-bold tracking-[0.25em] uppercase">
      <span className="flex items-center gap-2.5">
        <span aria-hidden className="size-2.5 rotate-45 bg-primary shadow-[0_0_10px_var(--color-primary)]" />
        TakeoffFocus
      </span>
      <span className="text-selected tabular-nums" aria-label={`Uhrzeit ${time} UTC`}>
        {time}
        <span className="ml-1 text-muted-foreground">Z</span>
      </span>
    </header>
  )
}
