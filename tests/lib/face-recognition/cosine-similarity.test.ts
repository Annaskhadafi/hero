import { cosineSimilarity } from '@/lib/face-recognition/cosine-similarity'

describe('cosineSimilarity', () => {
  it('returns 1 for identical vectors (self-similarity)', () => {
    const v = [1, 0, 0, 0]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0)
  })

  it('returns 1 for identical non-trivial vectors', () => {
    const v = [0.5, 0.3, -0.2, 0.8]
    expect(cosineSimilarity(v, v)).toBeCloseTo(1.0)
  })

  it('returns 0 for orthogonal vectors', () => {
    const a = [1, 0, 0]
    const b = [0, 1, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.0)
  })

  it('returns -1 for opposite vectors', () => {
    const a = [1, 0, 0]
    const b = [-1, 0, 0]
    expect(cosineSimilarity(a, b)).toBeCloseTo(-1.0)
  })

  it('returns 0 for zero-magnitude vector (first)', () => {
    const a = [0, 0, 0]
    const b = [1, 2, 3]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('returns 0 for zero-magnitude vector (second)', () => {
    const a = [1, 2, 3]
    const b = [0, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('returns 0 for both zero-magnitude vectors', () => {
    const a = [0, 0, 0]
    const b = [0, 0, 0]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('returns 0 for mismatched lengths', () => {
    const a = [1, 2, 3]
    const b = [1, 2]
    expect(cosineSimilarity(a, b)).toBe(0)
  })

  it('returns 0 for empty arrays', () => {
    expect(cosineSimilarity([], [])).toBe(0)
  })

  it('is commutative', () => {
    const a = [0.1, -0.5, 0.3, 0.9]
    const b = [0.4, 0.2, -0.7, 0.1]
    expect(cosineSimilarity(a, b)).toBeCloseTo(cosineSimilarity(b, a))
  })

  it('computes correct value for known vectors', () => {
    // a = [1, 2, 3], b = [4, 5, 6]
    // dot = 4+10+18 = 32
    // |a| = sqrt(14), |b| = sqrt(77)
    // cos = 32 / sqrt(14*77) = 32 / sqrt(1078) ≈ 0.9746
    const a = [1, 2, 3]
    const b = [4, 5, 6]
    expect(cosineSimilarity(a, b)).toBeCloseTo(0.9746, 3)
  })

  it('works with 128-dimensional vectors', () => {
    const a = Array.from({ length: 128 }, (_, i) => Math.sin(i))
    const b = Array.from({ length: 128 }, (_, i) => Math.cos(i))
    const result = cosineSimilarity(a, b)
    expect(result).toBeGreaterThanOrEqual(-1)
    expect(result).toBeLessThanOrEqual(1)
  })

  it('is scale-invariant (parallel vectors have similarity 1)', () => {
    const a = [1, 2, 3]
    const b = [2, 4, 6] // 2 * a
    expect(cosineSimilarity(a, b)).toBeCloseTo(1.0)
  })
})
