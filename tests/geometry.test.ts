import { describe, expect, it } from 'vitest'
import { pointInRects } from '@shared/geometry'

describe('pointInRects', () => {
  const pill = { x: 200, y: 8, width: 560, height: 44 }
  const window = { x: 480, y: 12 }

  it('hits a control when the cursor is over it on screen', () => {
    expect(pointInRects({ x: 480 + 300, y: 12 + 30 }, [pill], window)).toBe(true)
  })

  it('misses the transparent area around the controls', () => {
    expect(pointInRects({ x: 480 + 100, y: 12 + 30 }, [pill], window)).toBe(false)
    expect(pointInRects({ x: 480 + 300, y: 12 + 60 }, [pill], window)).toBe(false)
  })

  it('treats the right and bottom edges as outside', () => {
    expect(pointInRects({ x: 480 + 760, y: 12 + 30 }, [pill], window)).toBe(false)
    expect(pointInRects({ x: 480 + 300, y: 12 + 52 }, [pill], window)).toBe(false)
  })

  it('is false when there are no controls', () => {
    expect(pointInRects({ x: 0, y: 0 }, [], window)).toBe(false)
  })
})
