import { Layers3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import HoverDock from './HoverDock'

type Props = {
  children: ReactNode
}

export default function ControlPanel({ children }: Props) {
  const t = useT()
  return (
    <HoverDock
      side="right"
      panelId="sky-control-panel"
      handleLabel={t('controls.title')}
      handleLabelPinned={t('controls.collapse')}
      handleIcon={<Layers3 size={15} strokeWidth={1.65} />}
    >
      {children}
    </HoverDock>
  )
}
