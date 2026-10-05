/** 右侧图层/视角控制：包一层 HoverDock。 */
import { Layers3 } from 'lucide-react'
import type { ReactNode } from 'react'
import { useT } from '@/i18n'
import HoverDock from './HoverDock'

type Props = {
  pinned: boolean
  onPinnedChange: (pinned: boolean) => void
  children: ReactNode
}

export default function ControlPanel({ pinned, onPinnedChange, children }: Props) {
  const t = useT()
  return (
    <HoverDock
      side="right"
      panelId="sky-control-panel"
      handleLabel={t('controls.title')}
      handleLabelPinned={t('controls.collapse')}
      handleIcon={<Layers3 size={15} strokeWidth={1.65} />}
      pinned={pinned}
      onPinnedChange={onPinnedChange}
    >
      {children}
    </HoverDock>
  )
}
