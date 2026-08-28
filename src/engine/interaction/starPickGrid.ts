/** 恒星拾取网格：按 NDC 分格，避免每帧扫全部亮星。 */
export const STAR_PICK_GRID_COLS = 16
export const STAR_PICK_GRID_ROWS = 16

export type StarPickGrid = {
  cols: number
  rows: number
  buckets: number[][]
}

/** 分配 cols×rows 个空桶。 */
export function createStarPickGrid(cols = STAR_PICK_GRID_COLS, rows = STAR_PICK_GRID_ROWS): StarPickGrid {
  return {
    cols,
    rows,
    buckets: Array.from({ length: cols * rows }, () => []),
  }
}

/** 清空桶内容，复用数组避免分配。 */
export function clearStarPickGrid(grid: StarPickGrid) {
  for (const bucket of grid.buckets) bucket.length = 0
}

function ndcToBin(ndc: number, count: number) {
  return Math.min(count - 1, Math.max(0, Math.floor((ndc * 0.5 + 0.5) * count)))
}

/** NDC → 格子下标。 */
export function starPickCell(ndcX: number, ndcY: number, cols: number, rows: number) {
  return ndcToBin(ndcY, rows) * cols + ndcToBin(ndcX, cols)
}

/** 把恒星下标丢进对应格子。 */
export function addStarToPickGrid(grid: StarPickGrid, index: number, ndcX: number, ndcY: number) {
  grid.buckets[starPickCell(ndcX, ndcY, grid.cols, grid.rows)].push(index)
}

/** 半径覆盖到的格子里所有恒星下标，写入 into。 */
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
  const col0 = ndcToBin(minX, grid.cols)
  const col1 = ndcToBin(maxX, grid.cols)
  const row0 = ndcToBin(minY, grid.rows)
  const row1 = ndcToBin(maxY, grid.rows)
  for (let row = row0; row <= row1; row += 1) {
    for (let col = col0; col <= col1; col += 1) {
      const bucket = grid.buckets[row * grid.cols + col]
      for (const index of bucket) into.push(index)
    }
  }
  return into
}
