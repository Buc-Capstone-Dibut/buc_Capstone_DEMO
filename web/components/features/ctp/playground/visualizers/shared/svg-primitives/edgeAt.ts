/**
 * Compute precise EdgeLine endpoints between two circular nodes.
 *
 * Given two node centers and their radii, this returns (x1, y1, x2, y2)
 * that sit exactly on each node's boundary along the line connecting them.
 *
 * Use this for tree/list/graph visualizations where edges should start
 * and end on the visible perimeter of nodes (not inside or outside).
 */
export function edgeAt(
  from: { x: number; y: number },
  to: { x: number; y: number },
  fromR: number,
  toR: number,
): { x1: number; y1: number; x2: number; y2: number } {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist === 0) {
    return { x1: from.x, y1: from.y, x2: to.x, y2: to.y };
  }
  const ux = dx / dist;
  const uy = dy / dist;
  return {
    x1: from.x + ux * fromR,
    y1: from.y + uy * fromR,
    x2: to.x - ux * toR,
    y2: to.y - uy * toR,
  };
}
