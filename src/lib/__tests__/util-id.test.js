// src/lib/__tests__/util-id.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { uuid } from '../util-id.js'

describe('uuid', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should return a string', () => {
    const id = uuid()
    expect(typeof id).toBe('string')
  })

  it('should return a non-empty string', () => {
    const id = uuid()
    expect(id.length).toBeGreaterThan(0)
  })

  it('should match UUID v4 format', () => {
    const id = uuid()
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    // where x is any hexadecimal digit and y is one of 8, 9, a, or b
    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    expect(id).toMatch(uuidV4Regex)
  })

  it('should generate unique values', () => {
    const ids = new Set()
    const iterations = 100

    for (let i = 0; i < iterations; i++) {
      ids.add(uuid())
    }

    // All generated UUIDs should be unique
    expect(ids.size).toBe(iterations)
  })

  it('should use crypto.randomUUID when available', () => {
    const mockRandomUUID = vi.fn(() => '12345678-1234-4234-8234-123456789012')

    // Mock crypto.randomUUID using vi.spyOn
    const spy = vi.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(mockRandomUUID)

    const id = uuid()

    expect(mockRandomUUID).toHaveBeenCalled()
    expect(id).toBe('12345678-1234-4234-8234-123456789012')

    // Restore
    spy.mockRestore()
  })

  it('should use fallback implementation when crypto.randomUUID is not available', () => {
    // Mock globalThis without randomUUID but with getRandomValues
    const mockGetRandomValues = vi.fn((array) => {
      // Fill with deterministic values for testing
      for (let i = 0; i < array.length; i++) {
        array[i] = 0xab
      }
      return array
    })

    // Mock crypto to not have randomUUID
    vi.stubGlobal('crypto', {
      getRandomValues: mockGetRandomValues,
    })

    const id = uuid()

    expect(mockGetRandomValues).toHaveBeenCalled()
    expect(typeof id).toBe('string')
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

    // Restore
    vi.unstubAllGlobals()
  })

  it('should handle fallback with random values correctly', () => {
    // Create a controlled random implementation
    const mockGetRandomValues = vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = Math.floor(Math.random() * 256)
      }
      return array
    })

    vi.stubGlobal('crypto', {
      getRandomValues: mockGetRandomValues,
    })

    const id = uuid()

    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

    // Restore
    vi.unstubAllGlobals()
  })

  it('should generate different UUIDs on consecutive calls', () => {
    const id1 = uuid()
    const id2 = uuid()
    const id3 = uuid()

    expect(id1).not.toBe(id2)
    expect(id2).not.toBe(id3)
    expect(id1).not.toBe(id3)
  })

  it('should have correct UUID version (4)', () => {
    const id = uuid()
    const parts = id.split('-')

    // The third section should start with '4'
    expect(parts[2][0]).toBe('4')
  })

  it('should have correct UUID variant bits', () => {
    const id = uuid()
    const parts = id.split('-')

    // The fourth section should start with 8, 9, a, or b
    const variantChar = parts[3][0].toLowerCase()
    expect(['8', '9', 'a', 'b']).toContain(variantChar)
  })

  it('should use fallback when crypto is undefined', () => {
    // Temporarily remove crypto
    vi.stubGlobal('crypto', undefined)

    // This will throw because fallback also needs crypto.getRandomValues
    expect(() => uuid()).toThrow()

    // Restore
    vi.unstubAllGlobals()
  })

  it('should handle crypto.randomUUID being null', () => {
    const mockGetRandomValues = vi.fn((array) => {
      for (let i = 0; i < array.length; i++) {
        array[i] = 0xff
      }
      return array
    })

    vi.stubGlobal('crypto', {
      randomUUID: null,
      getRandomValues: mockGetRandomValues,
    })

    const id = uuid()

    expect(mockGetRandomValues).toHaveBeenCalled()
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i)

    // Restore
    vi.unstubAllGlobals()
  })
})
