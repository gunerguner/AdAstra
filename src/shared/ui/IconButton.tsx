import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './IconButton.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean
  children: ReactNode
}

export default function IconButton({ active, className, type = 'button', children, ...props }: Props) {
  return (
    <button
      type={type}
      className={`${styles.button} ${active ? styles.active : ''} ${className ?? ''}`}
      {...props}
    >
      {children}
    </button>
  )
}
