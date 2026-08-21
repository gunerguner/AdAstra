import type { HTMLAttributes, ReactNode } from 'react'
import styles from './Panel.module.css'

type Props = HTMLAttributes<HTMLElement> & {
  children: ReactNode
}

export default function Panel({ className, children, ...props }: Props) {
  return (
    <aside className={`${styles.panel} ${className ?? ''}`} {...props}>
      {children}
    </aside>
  )
}
