import type { AtmosphereState } from '@/engine/render/atmosphereState'

export function applyUiAtmosphere(state: AtmosphereState) {
  const root = document.documentElement
  if (root.dataset.skyPhase !== state.phase) {
    root.dataset.skyPhase = state.phase
  }
  const warmth = (Math.round(state.warmth * 8) / 8).toFixed(3)
  if (root.style.getPropertyValue('--ui-warmth') !== warmth) {
    root.style.setProperty('--ui-warmth', warmth)
  }
}
