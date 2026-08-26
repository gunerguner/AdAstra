import type { ButtonHTMLAttributes, ReactNode } from 'react'
import styles from './ToggleButton.module.css'

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  pressed?: boolean
  variant?: 'ecliptic' | 'equator'
  children: ReactNode
}

const VARIANT_CLASS = {
  ecliptic: styles.ecliptic,
  equator: styles.equator,
} as const

export default function ToggleButton({ pressed, variant, className, type = 'button', children, ...props }: Props) {
  const variantClass = variant ? VARIANT_CLASS[variant] : ''
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
