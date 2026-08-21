import { Layers3 } from 'lucide-react'
import type { ReactNode } from 'react'
import HoverDock from './HoverDock'

type Props = {
  children: ReactNode
}

export default function ControlPanel({ children }: Props) {
  return (
    <HoverDock
      side="right"
      panelId="sky-control-panel"
      handleLabel="图层与视角"
      handleLabelPinned="收起图层工具栏"
      handleIcon={<Layers3 size={15} strokeWidth={1.65} />}
    >
      {children}
    </HoverDock>
  )
}
