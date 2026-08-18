import { BufferGeometry, Group, Line, type ShaderMaterial, Vector3 } from 'three'
import { equatorialUnit } from '@/engine/coordinates/skyMath'
import { densifyGreatCircle, horizontalVector, toVector3 } from '@/engine/coordinates/skyGeometry'
import { makeSkyLineMaterial } from '@/engine/render/materials/skyLineMaterial'
import type { ConstellationStars } from '@/engine/astronomy/constellationData'
import type { SkyProjectionUniforms } from '@/engine/render/skyContext'

function addSkyLine(group: Group, points: Vector3[], kind: string, material: ShaderMaterial) {
  const densified = densifyGreatCircle(points)
  if (densified.length < 2) return
  const mesh = new Line(new BufferGeometry().setFromPoints(densified), material)
  mesh.frustumCulled = false
  mesh.userData.kind = kind
  group.add(mesh)
}

export function createGridLayer(
  constellationStars: ConstellationStars[],
  uniforms: {
    horizonMat: Float32Array
    sky: SkyProjectionUniforms
    showBelow: { value: number }
  },
) {
  const group = new Group()
  const constellationLine = makeSkyLineMaterial('#9da7e7', 0.5, true, uniforms)
  const equatorialGrid = makeSkyLineMaterial('#8eb4d8', 0.55, true, uniforms)
  const horizontalGrid = makeSkyLineMaterial('#6f9a7a', 0.5, false, uniforms)

  constellationStars.forEach((line) => {
    line.segments.forEach((segment) => {
      const points = densifyGreatCircle(segment.map((star) => toVector3(equatorialUnit(star.raHours, star.decDeg))))
      if (points.length > 1) {
        const mesh = new Line(new BufferGeometry().setFromPoints(points), constellationLine)
        mesh.frustumCulled = false
        mesh.userData.kind = 'constellation'
        group.add(mesh)
      }
    })
  })

  ;[-60, -30, 0, 30, 60].forEach((dec) => {
    for (let start = 0; start < 360; start += 90) {
      addSkyLine(
        group,
        Array.from({ length: 19 }, (_, index) => toVector3(equatorialUnit((start + index * 5) / 15, dec))),
        'equatorialGrid',
        equatorialGrid,
      )
    }
  })
  for (let raHours = 0; raHours < 24; raHours += 2) {
    addSkyLine(
      group,
      [-75, -60, -45, -30, -15, 0, 15, 30, 45, 60, 75].map((dec) => toVector3(equatorialUnit(raHours, dec))),
      'equatorialGrid',
      equatorialGrid,
    )
  }
  ;[15, 30, 45, 60, 75].forEach((alt) => {
    for (let start = 0; start < 360; start += 90) {
      addSkyLine(
        group,
        Array.from({ length: 19 }, (_, index) => horizontalVector(alt, start + index * 5)),
        'horizontalGrid',
        horizontalGrid,
      )
    }
  })
  for (let az = 0; az < 360; az += 30) {
    addSkyLine(
      group,
      [2, 15, 30, 45, 60, 75, 88].map((alt) => horizontalVector(alt, az)),
      'horizontalGrid',
      horizontalGrid,
    )
  }

  return { group, constellationLine, equatorialGrid, horizontalGrid }
}
