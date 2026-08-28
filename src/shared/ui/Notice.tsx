/** 底部提示条。非 sticky 时 4 秒后自动关掉。 */
import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '@/i18n'
import IconButton from './IconButton'
import styles from './Notice.module.css'

type Props = {
  message: string | null
  sticky?: boolean
  onDismiss: () => void
}

export default function Notice({ message, sticky = false, onDismiss }: Props) {
  const t = useT()
  useEffect(() => {
    if (!message || sticky) return
    const timer = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timer)
  }, [message, sticky, onDismiss])

  if (!message) return null

  return (
    <div className={styles.notice} role="status" aria-live="polite">
      <p>{message}</p>
      <IconButton className={styles.close} onClick={onDismiss} aria-label={t('notice.close')}>
        <X size={14} />
      </IconButton>
    </div>
  )
}
