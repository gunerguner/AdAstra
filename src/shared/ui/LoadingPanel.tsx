import panelStyles from './StatusPanel.module.css'

export function LoadingPanel({ message }: { message: string }) {
  return (
    <div className={`${panelStyles.panel} ${panelStyles.loading}`} role="status" aria-live="polite">
      {message}
    </div>
  )
}
