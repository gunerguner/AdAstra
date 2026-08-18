export function brightLimbAngle(
  bodyView: { x: number; y: number } | null,
  sunView: { x: number; y: number } | null,
) {
  if (!bodyView || !sunView) return 0
  return Math.atan2(sunView.y - bodyView.y, sunView.x - bodyView.x)
}
