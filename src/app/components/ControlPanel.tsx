import type { ReactNode } from 'react'
import { Panel } from '@/shared/ui'
import styles from './ControlPanel.module.css'

type Props = {
  open: boolean
  children: ReactNode
}

export default function ControlPanel({ open, children }: Props) {
  return (
    <Panel
      className={styles.panel}
      collapsed={!open}
      aria-hidden={!open}
      inert={!open}
    >
      <div className={styles.scroll}>{children}</div>
    </Panel>
  )
}
