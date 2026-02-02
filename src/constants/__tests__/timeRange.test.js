// src/constants/__tests__/timeRange.test.js
import { describe, it, expect } from 'vitest'
import { TIME_RANGES, getRangeById } from '../timeRange.js'

describe('TIME_RANGES', () => {
  it('should export an array with correct structure', () => {
    expect(Array.isArray(TIME_RANGES)).toBe(true)
    expect(TIME_RANGES.length).toBeGreaterThan(0)
  })

  it('should have objects with id, label, and days properties', () => {
    TIME_RANGES.forEach(range => {
      expect(range).toHaveProperty('id')
      expect(range).toHaveProperty('label')
      expect(range).toHaveProperty('days')
      expect(typeof range.id).toBe('string')
      expect(typeof range.label).toBe('string')
    })
  })

  it('should contain the expected time range options', () => {
    const ids = TIME_RANGES.map(r => r.id)
    expect(ids).toContain('30d')
    expect(ids).toContain('60d')
    expect(ids).toContain('180d')
    expect(ids).toContain('all')
  })

  it('should have correct days values for each range', () => {
    const range30d = TIME_RANGES.find(r => r.id === '30d')
    const range60d = TIME_RANGES.find(r => r.id === '60d')
    const range180d = TIME_RANGES.find(r => r.id === '180d')
    const rangeAll = TIME_RANGES.find(r => r.id === 'all')

    expect(range30d.days).toBe(30)
    expect(range60d.days).toBe(60)
    expect(range180d.days).toBe(180)
    expect(rangeAll.days).toBeNull()
  })

  it('should have matching labels for each range', () => {
    const range30d = TIME_RANGES.find(r => r.id === '30d')
    const range60d = TIME_RANGES.find(r => r.id === '60d')
    const range180d = TIME_RANGES.find(r => r.id === '180d')
    const rangeAll = TIME_RANGES.find(r => r.id === 'all')

    expect(range30d.label).toBe('30D')
    expect(range60d.label).toBe('60D')
    expect(range180d.label).toBe('180D')
    expect(rangeAll.label).toBe('All')
  })

  it('should have all-time range with null days', () => {
    const allTimeRange = TIME_RANGES.find(r => r.days === null)
    expect(allTimeRange).toBeDefined()
    expect(allTimeRange.id).toBe('all')
  })
})

describe('getRangeById', () => {
  it('should return the correct range for a valid id', () => {
    const range = getRangeById('30d')
    expect(range).toBeDefined()
    expect(range.id).toBe('30d')
    expect(range.days).toBe(30)
    expect(range.label).toBe('30D')
  })

  it('should return the correct range for each valid id', () => {
    expect(getRangeById('30d').id).toBe('30d')
    expect(getRangeById('60d').id).toBe('60d')
    expect(getRangeById('180d').id).toBe('180d')
    expect(getRangeById('all').id).toBe('all')
  })

  it('should return the first range when id is not found', () => {
    const range = getRangeById('invalid_id')
    expect(range).toBe(TIME_RANGES[0])
    expect(range.id).toBe('30d')
  })

  it('should return the first range when id is null', () => {
    const range = getRangeById(null)
    expect(range).toBe(TIME_RANGES[0])
  })

  it('should return the first range when id is undefined', () => {
    const range = getRangeById(undefined)
    expect(range).toBe(TIME_RANGES[0])
  })

  it('should return the first range for empty string', () => {
    const range = getRangeById('')
    expect(range).toBe(TIME_RANGES[0])
  })

  it('should handle case-sensitive id matching', () => {
    const range = getRangeById('30D')
    expect(range).toBe(TIME_RANGES[0]) // Should fallback since '30D' !== '30d'
  })

  it('should return the all-time range correctly', () => {
    const range = getRangeById('all')
    expect(range.id).toBe('all')
    expect(range.days).toBeNull()
    expect(range.label).toBe('All')
  })
})
