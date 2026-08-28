/** 控制区小节标题，可带图标和右侧附加。 */
import type { ReactNode } from 'react'
import styles from './SectionTitle.module.css'

type Props = {
  icon?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}

export default function SectionTitle({ icon, trailing, children }: Props) {
  return (
    <div className={styles.title}>
      {icon}
      {children}
      {trailing && <b>{trailing}</b>}
    </div>
  )
}
