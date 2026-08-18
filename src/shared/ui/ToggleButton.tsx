import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './ToggleButton.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean
  variant?: 'ecliptic' | 'equator'
  children: ReactNode
}

export default function ToggleButton({ pressed, variant, className, type = 'button', children, ...props }: Props) {
  const variantClass = variant === 'ecliptic' ? styles.ecliptic : variant === 'equator' ? styles.equator : ''
  return (
    <button
      type={type}
      className={`${styles.toggle} ${pressed ? styles.active : ''} ${variantClass} ${className ?? ''}`}
      aria-pressed={pressed}
      {...props}
    >
      {children}
    </button>
  )
}
