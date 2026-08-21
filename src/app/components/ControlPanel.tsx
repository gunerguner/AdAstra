import { Layers3 } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Panel } from '@/shared/ui'
import styles from './ControlPanel.module.css'

type Props = {
  children: ReactNode
}

export default function ControlPanel({ children }: Props) {
  const [hovered, setHovered] = useState(false)
  const [pinned, setPinned] = useState(false)
  const open = hovered || pinned

  return (
    <div
      className={`${styles.dock} ${open ? styles.open : ''}`}
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
        aria-label={pinned ? '收起图层工具栏' : '图层与视角'}
        aria-expanded={open}
        aria-controls="sky-control-panel"
        onClick={() => setPinned((value) => !value)}
      >
        <Layers3 size={15} strokeWidth={1.65} />
        <span className={styles.handleSpine} aria-hidden="true" />
      </button>
      <Panel
        id="sky-control-panel"
        className={styles.sheet}
        aria-hidden={!open}
        inert={!open}
      >
        <div className={styles.scroll}>{children}</div>
      </Panel>
    </div>
  )
}
