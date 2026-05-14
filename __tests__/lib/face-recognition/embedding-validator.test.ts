import { validateEmbedding } from '@/lib/face-recognition/embedding-validator'

describe('validateEmbedding', () => {
  const validEmbedding = Array.from({ length: 128 }, (_, i) => Math.sin(i) * 0.5)

  it('returns valid for a correct 128-element float array', () => {
    const result = validateEmbedding(validEmbedding)
    expect(result).toEqual({ valid: true })
  })

  it('returns invalid when input is not an array', () => {
    expect(validateEmbedding(null)).toEqual({ valid: false, error: 'Embedding must be an array.' })
    expect(validateEmbedding(undefined)).toEqual({
      valid: false,
      error: 'Embedding must be an array.',
    })
    expect(validateEmbedding('hello')).toEqual({
      valid: false,
      error: 'Embedding must be an array.',
    })
    expect(validateEmbedding(42)).toEqual({ valid: false, error: 'Embedding must be an array.' })
    expect(validateEmbedding({})).toEqual({ valid: false, error: 'Embedding must be an array.' })
  })

  it('returns invalid when array length is not 128', () => {
    const tooShort = Array.from({ length: 127 }, () => 0.5)
    expect(validateEmbedding(tooShort)).toEqual({
      valid: false,
      error: 'Embedding must have exactly 128 elements, got 127.',
    })

    const tooLong = Array.from({ length: 129 }, () => 0.5)
    expect(validateEmbedding(tooLong)).toEqual({
      valid: false,
      error: 'Embedding must have exactly 128 elements, got 129.',
    })

    expect(validateEmbedding([])).toEqual({
      valid: false,
      error: 'Embedding must have exactly 128 elements, got 0.',
    })
  })

  it('returns invalid when an element is NaN', () => {
    const withNaN = [...validEmbedding]
    withNaN[5] = NaN
    expect(validateEmbedding(withNaN)).toEqual({
      valid: false,
      error: 'Element at index 5 is not a finite number.',
    })
  })

  it('returns invalid when an element is Infinity', () => {
    const withInf = [...validEmbedding]
    withInf[10] = Infinity
    expect(validateEmbedding(withInf)).toEqual({
      valid: false,
      error: 'Element at index 10 is not a finite number.',
    })
  })

  it('returns invalid when an element is -Infinity', () => {
    const withNegInf = [...validEmbedding]
    withNegInf[0] = -Infinity
    expect(validateEmbedding(withNegInf)).toEqual({
      valid: false,
      error: 'Element at index 0 is not a finite number.',
    })
  })

  it('returns invalid when an element is a string', () => {
    const withString = [...validEmbedding] as unknown[]
    withString[3] = 'not a number'
    expect(validateEmbedding(withString)).toEqual({
      valid: false,
      error: 'Element at index 3 is not a finite number.',
    })
  })

  it('accepts zero values', () => {
    const allZeros = Array.from({ length: 128 }, () => 0)
    expect(validateEmbedding(allZeros)).toEqual({ valid: true })
  })

  it('accepts negative values', () => {
    const negatives = Array.from({ length: 128 }, () => -0.99)
    expect(validateEmbedding(negatives)).toEqual({ valid: true })
  })
})
