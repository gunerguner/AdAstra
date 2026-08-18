export function ndcRadiusForPixels(pixels: number, minScreenSize: number) {
  return pixels * 2 / Math.max(1, minScreenSize)
}

export type OverlaySize = { width: number; height: number }

export type OverlayPlacement = {
  visible: boolean
  x: number
  y: number
}

export function overlayScreenPosition(
  ndc: { x: number; y: number } | null,
  width: number,
  height: number,
  offsetX: number,
  offsetY: number,
  edge = 1,
  size?: OverlaySize,
): OverlayPlacement {
  if (!ndc || Math.abs(ndc.x) > edge || Math.abs(ndc.y) > edge) {
    return { visible: false, x: 0, y: 0 }
  }
  let x = (ndc.x * 0.5 + 0.5) * width + offsetX
  let y = (-ndc.y * 0.5 + 0.5) * height + offsetY
  if (size) {
    if (x + size.width > width - 12) x = (ndc.x * 0.5 + 0.5) * width - size.width - 16
    if (y < 12) y = 12
    if (y + size.height > height - 12) y = height - size.height - 12
    if (x < 12) x = 12
  }
  return { visible: true, x, y }
}

export function applyOverlayPlacement(node: HTMLElement, placement: OverlayPlacement) {
  if (!placement.visible) {
    if (node.style.display !== 'none') node.style.display = 'none'
    return false
  }
  const x = Math.round(placement.x)
  const y = Math.round(placement.y)
  const transform = `translate3d(${x}px, ${y}px, 0)`
  if (node.style.display !== 'block') node.style.display = 'block'
  if (node.style.transform !== transform) node.style.transform = transform
  return true
}
