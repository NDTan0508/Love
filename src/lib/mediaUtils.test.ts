import { describe, expect, it } from 'vitest'
import { getMemoryImageSrc } from './mediaUtils'

describe('mediaUtils', () => {
  it('adds lightweight query params for unsplash card images', () => {
    const src = getMemoryImageSrc('https://images.unsplash.com/photo-123?w=400', 'card')

    expect(src).toContain('auto=format')
    expect(src).toContain('fit=crop')
    expect(src).toContain('w=640')
    expect(src).toContain('q=76')
  })

  it('adds larger query params for detail images', () => {
    const src = getMemoryImageSrc('https://images.unsplash.com/photo-123?w=400', 'detail')

    expect(src).toContain('w=1280')
    expect(src).toContain('q=84')
  })

  it('keeps non-unsplash image urls unchanged', () => {
    const src = getMemoryImageSrc('https://example.com/image.jpg', 'card')

    expect(src).toBe('https://example.com/image.jpg')
  })
})
