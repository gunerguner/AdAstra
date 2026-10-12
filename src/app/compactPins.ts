/** 窄屏两侧同时钉住时只留快速定位。宽屏允许两侧都开。 */
export function exclusiveCompactPin(
  isCompact: boolean,
  navPinned: boolean,
  controlsPinned: boolean,
) {
  if (isCompact && navPinned && controlsPinned) {
    return { navPinned: true, controlsPinned: false }
  }
  return { navPinned, controlsPinned }
}
