import type { SkyView } from '@/shared/types/sky'

/**
 * React 视角写回 simulation ref。
 * 同一对象表示还在拖拽：ref 里的方位更新，不能被上一次 setView 盖回去。
 */
export function syncReactView(
  target: SkyView,
  applied: { current: SkyView },
  next: SkyView,
) {
  if (applied.current === next) return
  applied.current = next
  Object.assign(target, next)
}
