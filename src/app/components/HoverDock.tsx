import { useState, type ReactNode } from 'react'
import { Panel } from '@/shared/ui'
import styles from './HoverDock.module.css'

type Props = {
  side: 'left' | 'right'
  handleLabel: string
  handleLabelPinned: string
  panelId: string
  handleIcon: ReactNode
  children: ReactNode
}

export default function HoverDock({
  side,
  handleLabel,
  handleLabelPinned,
  panelId,
  handleIcon,
  children,
}: Props) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned

  return (
    <div
      className={`${styles.dock} ${open ? styles.open : ''}`}
      data-side={side}
      data-pinned={pinned || undefined}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
      onFocusCapture={() => setHovered(true)}
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
        onClick={() => setPinned((value) => !value)}
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
