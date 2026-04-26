const COLS = 20;
const ROWS = 14;
const ORIGIN_X = 480;
const ORIGIN_Y = 100;
const TILE_W = 64;
const TILE_H = 32;

export default class PathfindingSystem {
  constructor(scene) {
    this.scene = scene;
    this.cols = COLS;
    this.rows = ROWS;

    this.grid = [];
    for (let c = 0; c < COLS; c++) {
      this.grid[c] = [];
      for (let r = 0; r < ROWS; r++) {
        const isBorder = (c === 0 || c === COLS - 1 || r === 0 || r === ROWS - 1);
        this.grid[c][r] = !isBorder;
      }
    }

    this.setBlocked(9, 1, true);
    this.setBlocked(10, 1, true);

    this.setBlocked(9, 12, true);
    this.setBlocked(10, 12, true);

    this.setBlocked(1, 12, true);
  }

  isInBounds(col, row) {
    return col >= 0 && col < this.cols && row >= 0 && row < this.rows;
  }

  setBlocked(col, row, blocked) {
    if (!this.isInBounds(col, row)) return false;
    this.grid[col][row] = !blocked;
    return true;
  }

  isWalkable(col, row) {
    if (!this.isInBounds(col, row)) return false;
    return this.grid[col][row];
  }

  isoToScreen(col, row) {
    const x = ORIGIN_X + (col - row) * TILE_W / 2;
    const y = ORIGIN_Y + (col + row) * TILE_H / 2;
    return { x, y };
  }

  screenToIso(x, y) {
    const isoX = (x - ORIGIN_X) / (TILE_W / 2);
    const isoY = (y - ORIGIN_Y) / (TILE_H / 2);
    const col = Math.round((isoY + isoX) / 2);
    const row = Math.round((isoY - isoX) / 2);
    return { col, row };
  }

  heuristic(col, row, endCol, endRow) {
    return Math.max(Math.abs(col - endCol), Math.abs(row - endRow));
  }

  findPath(startCol, startRow, endCol, endRow) {
    if (startCol === endCol && startRow === endRow) {
      return [{ col: startCol, row: startRow }];
    }
    if (!this.isWalkable(startCol, startRow)) return [];
    if (!this.isWalkable(endCol, endRow)) return [];

    const open = [];
    const closed = new Set();

    const startH = this.heuristic(startCol, startRow, endCol, endRow);
    open.push({
      col: startCol,
      row: startRow,
      g: 0,
      h: startH,
      f: startH,
      parent: null
    });

    const NEIGHBORS = [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]];

    let iterations = 0;
    while (open.length > 0) {
      if (open.length > 1000 || iterations > 10000) break;
      iterations++;

      open.sort((a, b) => a.f - b.f);
      const current = open.shift();

      if (current.col === endCol && current.row === endRow) {
        const path = [];
        let node = current;
        while (node) {
          path.unshift({ col: node.col, row: node.row });
          node = node.parent;
        }
        return path;
      }

      closed.add(`${current.col},${current.row}`);

      for (let i = 0; i < NEIGHBORS.length; i++) {
        const dx = NEIGHBORS[i][0];
        const dy = NEIGHBORS[i][1];
        const nCol = current.col + dx;
        const nRow = current.row + dy;

        if (!this.isInBounds(nCol, nRow)) continue;
        if (!this.isWalkable(nCol, nRow)) continue;
        if (closed.has(`${nCol},${nRow}`)) continue;

        const isDiagonal = (dx !== 0 && dy !== 0);

        if (isDiagonal) {
          if (!this.isWalkable(current.col + dx, current.row) && !this.isWalkable(current.col, current.row + dy)) continue;
        }

        const cost = isDiagonal ? Math.SQRT2 : 1;
        const gNew = current.g + cost;

        let existing = null;
        for (let j = 0; j < open.length; j++) {
          if (open[j].col === nCol && open[j].row === nRow) {
            existing = open[j];
            break;
          }
        }

        if (existing && existing.g <= gNew) continue;

        const h = this.heuristic(nCol, nRow, endCol, endRow);

        if (existing) {
          existing.g = gNew;
          existing.h = h;
          existing.f = gNew + h;
          existing.parent = current;
        } else {
          open.push({
            col: nCol,
            row: nRow,
            g: gNew,
            h: h,
            f: gNew + h,
            parent: current
          });
        }
      }
    }

    return [];
  }
}
