/** 快速导航：定位天体、必要时转视角、地平下给提示。 */
import type { Dispatch, RefObject, SetStateAction } from 'react'
import type { RuntimeCatalog } from '@/engine/catalog/catalogService'
import { interpolateBodySnapshots, type BodySnapshotWindow } from '@/engine/astronomy/bodyInterpolation'
import { locateSkyTarget } from '@/engine/interaction/locateSkyTarget'
import { skyObjectLabel, useLocale } from '@/i18n'
import type { SelectedSkyObject, SkySimulation, SkyView } from '@/shared/types/sky'

function formatSignedAltitude(degrees: number) {
  const sign = degrees < 0 ? '−' : ''
  return `${sign}${Math.abs(degrees).toFixed(1)}°`
}

export function useLocateTarget(options: {
  catalog: RuntimeCatalog | null
  simulationRef: RefObject<SkySimulation>
  bodySnapshotRef: RefObject<BodySnapshotWindow | null>
  setView: (view: SkyView) => void
  setSelected: Dispatch<SetStateAction<SelectedSkyObject | null>>
  setNotice: Dispatch<SetStateAction<string | null>>
}) {
  const { catalog, simulationRef, bodySnapshotRef, setView, setSelected, setNotice } = options
  const { locale, t } = useLocale()

  return (id: string, type: 'star' | 'body') => {
    if (!catalog) return
    const latest = simulationRef.current
    const result = locateSkyTarget({
      id,
      type,
      bodies: interpolateBodySnapshots(bodySnapshotRef.current, latest.utcMillis),
      starById: catalog.starById,
      utcMillis: latest.utcMillis,
      observer: latest.observer,
      view: latest.view,
    })
    if (!result) {
      setNotice(type === 'body' ? t('notice.bodyPending') : null)
      return
    }
    if (!result.belowHorizon) {
      setView({ azimuth: result.azimuth, altitude: result.altitude, fov: latest.view.fov })
    }
    setSelected(result.selected)
    latest.wake?.()
    setNotice(result.belowHorizon
      ? t('notice.belowHorizon', {
        name: skyObjectLabel(result.selected, catalog, locale, t),
        altitude: formatSignedAltitude(result.targetAltitude),
      })
      : null)
  }
}
