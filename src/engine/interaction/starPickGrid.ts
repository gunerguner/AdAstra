/** 恒星拾取网格：按 NDC 分格，避免每帧扫全部亮星。 */
export const STAR_PICK_GRID_COLS = 16
export const STAR_PICK_GRID_ROWS = 16

export type StarPickGrid = {
  cols: number
  rows: number
  buckets: number[][]
}

export function createStarPickGrid(cols = STAR_PICK_GRID_COLS, rows = STAR_PICK_GRID_ROWS): StarPickGrid {
  return {
    cols,
    rows,
    buckets: Array.from({ length: cols * rows }, () => []),
  }
}

export function clearStarPickGrid(grid: StarPickGrid) {
  for (const bucket of grid.buckets) bucket.length = 0
}

export function starPickCell(ndcX: number, ndcY: number, cols: number, rows: number) {
  const col = Math.min(cols - 1, Math.max(0, Math.floor((ndcX * 0.5 + 0.5) * cols)))
  const row = Math.min(rows - 1, Math.max(0, Math.floor((ndcY * 0.5 + 0.5) * rows)))
  return row * cols + col
}

export function addStarToPickGrid(grid: StarPickGrid, index: number, ndcX: number, ndcY: number) {
  grid.buckets[starPickCell(ndcX, ndcY, grid.cols, grid.rows)].push(index)
}

export function queryStarPickGrid(
  grid: StarPickGrid,
  ndcX: number,
  ndcY: number,
  radius: number,
  into: number[],
) {
  into.length = 0
  const minX = ndcX - radius
  const maxX = ndcX + radius
  const minY = ndcY - radius
  const maxY = ndcY + radius
  const col0 = Math.min(grid.cols - 1, Math.max(0, Math.floor((minX * 0.5 + 0.5) * grid.cols)))
  const col1 = Math.min(grid.cols - 1, Math.max(0, Math.floor((maxX * 0.5 + 0.5) * grid.cols)))
  const row0 = Math.min(grid.rows - 1, Math.max(0, Math.floor((minY * 0.5 + 0.5) * grid.rows)))
  const row1 = Math.min(grid.rows - 1, Math.max(0, Math.floor((maxY * 0.5 + 0.5) * grid.rows)))
  for (let row = row0; row <= row1; row += 1) {
    for (let col = col0; col <= col1; col += 1) {
      const bucket = grid.buckets[row * grid.cols + col]
      for (const index of bucket) into.push(index)
    }
  }
  return into
}
