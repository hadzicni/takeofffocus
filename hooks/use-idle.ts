import { useEffect, useState } from "react"

const ACTIVITY = ["pointermove", "pointerdown", "keydown", "wheel", "touchstart"] as const

/** True after `timeoutMs` without pointer or keyboard activity, while `enabled`. */
export function useIdle(timeoutMs: number, enabled: boolean) {
  const [idle, setIdle] = useState(false)

  useEffect(() => {
    if (!enabled) return
    let timer = setTimeout(() => setIdle(true), timeoutMs)
    const wake = () => {
      clearTimeout(timer)
      setIdle(false)
      timer = setTimeout(() => setIdle(true), timeoutMs)
    }
    for (const event of ACTIVITY) window.addEventListener(event, wake, { passive: true })
    return () => {
      clearTimeout(timer)
      for (const event of ACTIVITY) window.removeEventListener(event, wake)
    }
  }, [timeoutMs, enabled])

  return enabled && idle
}
