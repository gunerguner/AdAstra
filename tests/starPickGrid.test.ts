import { describe, expect, it } from 'vitest'
import {
  addStarToPickGrid,
  createStarPickGrid,
  queryStarPickGrid,
  starPickCell,
} from '../src/engine/interaction/starPickGrid'

describe('starPickGrid', () => {
  it('bins stars by NDC and only returns nearby candidates', () => {
    const grid = createStarPickGrid(8, 8)
    addStarToPickGrid(grid, 1, -0.9, -0.9)
    addStarToPickGrid(grid, 2, 0.9, 0.9)
    addStarToPickGrid(grid, 3, 0.05, 0.02)
    const nearby: number[] = []
    queryStarPickGrid(grid, 0, 0, 0.2, nearby)
    expect(nearby).toContain(3)
    expect(nearby).not.toContain(1)
    expect(nearby).not.toContain(2)
    expect(starPickCell(0, 0, 8, 8)).toBe(4 * 8 + 4)
  })
})
