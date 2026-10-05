/** 侧栏：精确指针可悬停展开，点按手柄钉住。左右各一个（快捷导航 / 图层）。 */
import { useState, type ReactNode } from 'react'
import { Panel } from '@/shared/ui'
import styles from './HoverDock.module.css'

/** 悬停展开只对鼠标/触控板有意义；触摸设备点一下就钉住，不靠 pointerenter。 */
const FINE_POINTER = typeof window !== 'undefined'
  && window.matchMedia('(hover: hover) and (pointer: fine)').matches

type Props = {
  side: 'left' | 'right'
  handleLabel: string
  handleLabelPinned: string
  panelId: string
  handleIcon: ReactNode
  pinned: boolean
  onPinnedChange: (pinned: boolean) => void
  children: ReactNode
}

export default function HoverDock({
  side,
  handleLabel,
  handleLabelPinned,
  panelId,
  handleIcon,
  pinned,
  onPinnedChange,
  children,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const open = (FINE_POINTER && hovered) || pinned

  return (
    <div
      className={`${styles.dock} ${open ? styles.open : ''}`}
      data-side={side}
      data-pinned={pinned || undefined}
      onPointerEnter={() => {
        if (FINE_POINTER) setHovered(true)
      }}
      onPointerLeave={() => {
        if (FINE_POINTER) setHovered(false)
      }}
      onFocusCapture={() => {
        if (FINE_POINTER) setHovered(true)
      }}
      onBlurCapture={(event) => {
        const next = event.relatedTarget
        if (next instanceof Node && event.currentTarget.contains(next)) return
        setHovered(false)
      }}
    >
      <button
        type="button"
        className={styles.handle}
        aria-label={pinned ? handleLabelPinned : handleLabel}
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => onPinnedChange(!pinned)}
      >
        {handleIcon}
        <span className={styles.handleSpine} aria-hidden="true" />
      </button>
      <Panel
        id={panelId}
        className={styles.sheet}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.scroll}>{children}</div>
      </Panel>
    </div>
  )
}
