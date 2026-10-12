/** 上下文丢失时停渲染；浏览器恢复后再重建场景。 */
export function bindWebglContextRecovery(
  canvas: EventTarget,
  handlers: { onLost: () => void; onRestored: () => void },
) {
  const onLost = (event: Event) => {
    event.preventDefault()
    handlers.onLost()
  }
  canvas.addEventListener('webglcontextlost', onLost)
  canvas.addEventListener('webglcontextrestored', handlers.onRestored)
  return () => {
    canvas.removeEventListener('webglcontextlost', onLost)
    canvas.removeEventListener('webglcontextrestored', handlers.onRestored)
  }
}
