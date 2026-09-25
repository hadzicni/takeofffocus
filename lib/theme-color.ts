import { Color, SRGBColorSpace } from "three"

/**
 * Resolves a CSS colour token (any syntax the browser knows, e.g. oklch) to a
 * three.js Color by painting one pixel, so the 3D scene shares the theme.
 */
export function readThemeColor(token: string, fallback = "#ffffff"): Color {
  const value = getComputedStyle(document.documentElement).getPropertyValue(token).trim()
  const context = document.createElement("canvas").getContext("2d", { willReadFrequently: true })
  if (!value || !context) return new Color(fallback)

  context.fillStyle = value
  context.fillRect(0, 0, 1, 1)
  const [r, g, b] = context.getImageData(0, 0, 1, 1).data
  return new Color().setRGB(r / 255, g / 255, b / 255, SRGBColorSpace)
}
