let supported: boolean | undefined

/** Whether this browser can create a WebGL context (cached after the first check). */
export function hasWebGL(): boolean {
  if (supported !== undefined) return supported
  try {
    const canvas = document.createElement("canvas")
    supported = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"))
  } catch {
    supported = false
  }
  return supported
}
