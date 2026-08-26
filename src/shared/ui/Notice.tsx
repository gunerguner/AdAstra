import { X } from 'lucide-react'
import { useEffect } from 'react'
import { useT } from '@/i18n'
import IconButton from './IconButton'
import styles from './Notice.module.css'

type Props = {
  message: string | null
  onDismiss: () => void
}

export default function Notice({ message, onDismiss }: Props) {
  const t = useT()
  useEffect(() => {
    if (!message) return
    const timer = window.setTimeout(onDismiss, 4000)
    return () => window.clearTimeout(timer)
  }, [message, onDismiss])

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
