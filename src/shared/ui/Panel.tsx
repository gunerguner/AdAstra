import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Panel.module.css'

type Props = HTMLAttributes<HTMLElement> & {
  collapsed?: boolean
  children: ReactNode
}

export default function Panel({ collapsed, className, children, ...props }: Props) {
  return (
    <aside className={`${styles.panel} ${collapsed ? styles.collapsed : ''} ${className ?? ''}`} {...props}>
      {children}
    </aside>
  )
}
