export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

/** True if the point lies inside any rect, with rects given relative to `origin`. */
export function pointInRects(point: { x: number; y: number }, rects: Rect[], origin: { x: number; y: number }): boolean {
  const px = point.x - origin.x
  const py = point.y - origin.y
  return rects.some((r) => px >= r.x && px < r.x + r.width && py >= r.y && py < r.y + r.height)
}
