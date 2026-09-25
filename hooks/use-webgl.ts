import { useSyncExternalStore } from "react"

import { hasWebGL } from "@/lib/webgl"

const noop = () => () => {}

/**
 * Whether WebGL is available. False during server rendering and hydration,
 * then the real answer, so server and client markup always match.
 */
export function useWebGL() {
  return useSyncExternalStore(noop, hasWebGL, () => false)
}
