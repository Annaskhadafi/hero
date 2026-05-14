const EMBEDDING_DIMENSION = 128

export interface EmbeddingValidationResult {
  valid: boolean
  error?: string
}

/**
 * Validates that the input is a valid face embedding:
 * - Must be an array
 * - Must have exactly 128 elements
 * - All elements must be finite floating-point numbers
 */
export function validateEmbedding(input: unknown): EmbeddingValidationResult {
  if (!Array.isArray(input)) {
    return { valid: false, error: 'Embedding must be an array.' }
  }

  if (input.length !== EMBEDDING_DIMENSION) {
    return {
      valid: false,
      error: `Embedding must have exactly ${EMBEDDING_DIMENSION} elements, got ${input.length}.`,
    }
  }

  for (let i = 0; i < input.length; i++) {
    const val = input[i]
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      return { valid: false, error: `Element at index ${i} is not a finite number.` }
    }
  }

  return { valid: true }
}
