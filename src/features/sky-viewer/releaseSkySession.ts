/** 天空会话的卸载顺序。先停帧，再卸监听，最后放 Worker 和 GPU。 */
export type SkySessionHandles = {
  stopLoop: () => void
  disconnectResize: () => void
  unbindController: () => void
  terminateWorker: () => void
  disposeScene: () => void
}

export function releaseSkySession(session: SkySessionHandles) {
  session.stopLoop()
  session.disconnectResize()
  session.unbindController()
  session.terminateWorker()
  session.disposeScene()
}
