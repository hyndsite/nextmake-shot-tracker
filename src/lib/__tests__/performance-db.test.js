// src/lib/__tests__/performance-db.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { getGamePerformance, getPracticePerformance } from '../performance-db.js'
import dayjs from 'dayjs'

// Mock dependencies
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  keys: vi.fn(),
}))

vi.mock('../idb-init.js', () => ({
  whenIdbReady: vi.fn(() => Promise.resolve()),
}))

vi.mock('../game-db.js', () => ({
  st: {
    game: {
      sessions: { dbName: 'game', storeName: 'sessions' },
      events: { dbName: 'game', storeName: 'events' },
    },
  },
}))

vi.mock('../practice-db.js', () => ({
  st: {
    practice: {
      sessions: { dbName: 'practice', storeName: 'sessions' },
      entries: { dbName: 'practice', storeName: 'entries' },
    },
  },
}))

describe('performance-db', () => {
  let mockGet, mockKeys

  beforeEach(async () => {
    const idbKeyval = await import('idb-keyval')

    mockGet = idbKeyval.get
    mockKeys = idbKeyval.keys

    mockGet.mockClear()
    mockKeys.mockClear()

    mockGet.mockResolvedValue(null)
    mockKeys.mockResolvedValue([])

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('getGamePerformance', () => {
    it('should return empty metrics when no sessions exist', async () => {
      mockKeys.mockResolvedValue([])

      const result = await getGamePerformance({ days: 30 })

      expect(result.metrics).toEqual([])
      expect(result.trend).toEqual([])
      expect(result.overallFgPct).toBe(0)
      expect(result.overallEfgPct).toBe(0)
      expect(result.totalAttempts).toBe(0)
      expect(result.trendBuckets.daily).toEqual([])
      expect(result.trendBuckets.weekly).toEqual([])
      expect(result.trendBuckets.monthly).toEqual([])
    })

    it('should aggregate zone performance from game events', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', started_at: '2024-01-10T10:00:00Z', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:05:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: false, is_three: true, ts: '2024-01-10T10:06:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:07:00Z', _deleted: false },
        { id: 'e4', game_id: 'game-1', type: 'shot', zone_id: 'center_mid', made: true, is_three: false, ts: '2024-01-10T10:08:00Z', _deleted: false },
        { id: 'e5', game_id: 'game-1', type: 'shot', zone_id: 'center_mid', made: false, is_three: false, ts: '2024-01-10T10:09:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3', 'e4', 'e5'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30 })

      expect(result.metrics).toHaveLength(2)

      const corner3Metric = result.metrics.find(m => m.id === 'left_corner_3')
      expect(corner3Metric).toBeDefined()
      expect(corner3Metric.attempts).toBe(3)
      expect(corner3Metric.makes).toBe(2)
      expect(corner3Metric.fgPct).toBeCloseTo(66.67, 1)

      const midRangeMetric = result.metrics.find(m => m.id === 'center_mid')
      expect(midRangeMetric).toBeDefined()
      expect(midRangeMetric.attempts).toBe(2)
      expect(midRangeMetric.makes).toBe(1)
      expect(midRangeMetric.fgPct).toBe(50)
    })

    it('should calculate overall FG% and eFG% correctly', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:01:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-1', type: 'shot', zone_id: 'center_mid', made: true, is_three: false, ts: '2024-01-10T10:02:00Z', _deleted: false },
        { id: 'e4', game_id: 'game-1', type: 'shot', zone_id: 'center_mid', made: true, is_three: false, ts: '2024-01-10T10:03:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3', 'e4'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30 })

      // Overall: 4 makes / 4 attempts = 100% FG
      expect(result.overallFgPct).toBe(100)
      expect(result.totalAttempts).toBe(4)

      // eFG%: (4 makes + 0.5 * 2 threes) / 4 attempts = 5 / 4 = 125%
      expect(result.overallEfgPct).toBe(125)
    })

    it('should filter by time range', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-01', _deleted: false },
        { id: 'game-2', date_iso: '2024-01-14', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-01T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-2', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-14T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1', 'game-2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        if (key === 'game-2') return Promise.resolve(sessions[1])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      // Filter to last 7 days (only game-2 should be included)
      const result = await getGamePerformance({ days: 7 })

      expect(result.totalAttempts).toBe(1)
      expect(result.metrics[0].attempts).toBe(1)
    })

    it('should filter by shot type', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', shot_type: 'catch_shoot', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', shot_type: 'off_dribble', made: true, is_three: true, ts: '2024-01-10T10:01:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-1', type: 'shot', zone_id: 'center_mid', shot_type: 'catch_shoot', made: true, is_three: false, ts: '2024-01-10T10:02:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30, shotType: 'catch_shoot' })

      // Only catch_shoot shots should be included
      expect(result.totalAttempts).toBe(2)
      expect(result.metrics).toHaveLength(2)
    })

    it('should filter by contested status', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', contested: true, made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', contested: false, made: true, is_three: true, ts: '2024-01-10T10:01:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-1', type: 'shot', zone_id: 'center_mid', contested: true, made: true, is_three: false, ts: '2024-01-10T10:02:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30, contested: 'contested' })

      // Only contested shots should be included
      expect(result.totalAttempts).toBe(2)
    })

    it('should handle free throws separately', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'freethrow', made: true, ts: '2024-01-10T10:01:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-1', type: 'freethrow', made: false, ts: '2024-01-10T10:02:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30, shotType: 'all' })

      // Free throws should appear in metrics but not in overall FG/eFG
      const ftMetric = result.metrics.find(m => m.id === 'free_throw')
      expect(ftMetric).toBeDefined()
      expect(ftMetric.attempts).toBe(2)
      expect(ftMetric.makes).toBe(1)
      expect(ftMetric.fgPct).toBe(50)

      // Overall stats should only count field goals
      expect(result.totalAttempts).toBe(1)
    })

    it('should exclude free throws when filtering by specific shot type', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', shot_type: 'catch_shoot', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'freethrow', made: true, ts: '2024-01-10T10:01:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30, shotType: 'catch_shoot' })

      // Free throws should not appear when filtering by shot type
      const ftMetric = result.metrics.find(m => m.id === 'free_throw')
      expect(ftMetric).toBeUndefined()
      expect(result.totalAttempts).toBe(1)
    })

    it('should exclude deleted sessions and events', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', _deleted: false },
        { id: 'game-2', date_iso: '2024-01-11', _deleted: true },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:01:00Z', _deleted: true },
        { id: 'e3', game_id: 'game-2', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-11T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1', 'game-2'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        if (key === 'game-2') return Promise.resolve(sessions[1])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30 })

      // Only e1 should be counted (game-1 not deleted, e1 not deleted)
      expect(result.totalAttempts).toBe(1)
    })

    it('should generate monthly trend data', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-05', _deleted: false },
        { id: 'game-2', date_iso: '2024-02-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-05T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: false, is_three: true, ts: '2024-01-05T10:01:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-2', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-02-10T10:00:00Z', _deleted: false },
        { id: 'e4', game_id: 'game-2', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-02-10T10:01:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1', 'game-2'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3', 'e4'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        if (key === 'game-2') return Promise.resolve(sessions[1])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: null })

      expect(result.trend).toHaveLength(2)
      expect(result.trendBuckets.monthly).toHaveLength(2)

      const jan = result.trend.find(t => t.monthKey === '2024-01')
      expect(jan).toBeDefined()
      expect(jan.fgPct).toBe(50)
      expect(jan.fga).toBe(2)

      const feb = result.trend.find(t => t.monthKey === '2024-02')
      expect(feb).toBeDefined()
      expect(feb.fgPct).toBe(100)
      expect(feb.fga).toBe(2)
    })

    it('should generate daily trend data', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-10', started_at: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'game-2', date_iso: '2024-01-12', started_at: '2024-01-12T10:00:00Z', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-2', type: 'shot', zone_id: 'left_corner_3', made: false, is_three: true, ts: '2024-01-12T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1', 'game-2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        if (key === 'game-2') return Promise.resolve(sessions[1])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30 })

      expect(result.trendBuckets.daily).toHaveLength(2)
      expect(result.trendBuckets.daily[0].bucketKey).toBe('game-1')
      expect(result.trendBuckets.daily[0].fgPct).toBe(100)
      expect(result.trendBuckets.daily[1].bucketKey).toBe('game-2')
      expect(result.trendBuckets.daily[1].fgPct).toBe(0)
    })

    it('should generate weekly trend data', async () => {
      const sessions = [
        { id: 'game-1', date_iso: '2024-01-08', _deleted: false },
        { id: 'game-2', date_iso: '2024-01-10', _deleted: false },
        { id: 'game-3', date_iso: '2024-01-15', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-08T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-2', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e3', game_id: 'game-3', type: 'shot', zone_id: 'left_corner_3', made: false, is_three: true, ts: '2024-01-15T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1', 'game-2', 'game-3'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'game-1') return Promise.resolve(sessions[0])
        if (key === 'game-2') return Promise.resolve(sessions[1])
        if (key === 'game-3') return Promise.resolve(sessions[2])
        const event = events.find(e => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30 })

      // Should have 2 weeks worth of data
      expect(result.trendBuckets.weekly.length).toBeGreaterThan(0)
    })

    it('filters game sessions and events by athleteId when provided', async () => {
      const sessions = [
        { id: 'game-1', athlete_id: 'ath-1', date_iso: '2024-01-10', _deleted: false },
        { id: 'game-2', athlete_id: 'ath-2', date_iso: '2024-01-10', _deleted: false },
      ]

      const events = [
        { id: 'e1', game_id: 'game-1', athlete_id: 'ath-1', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', game_id: 'game-2', athlete_id: 'ath-2', type: 'shot', zone_id: 'left_corner_3', made: true, is_three: true, ts: '2024-01-10T10:01:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['game-1', 'game-2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        const session = sessions.find((s) => s.id === key)
        if (session) return Promise.resolve(session)
        const event = events.find((e) => e.id === key)
        return Promise.resolve(event || null)
      })

      const result = await getGamePerformance({ days: 30, athleteId: 'ath-1' })

      expect(result.totalAttempts).toBe(1)
      expect(result.metrics).toHaveLength(1)
      expect(result.metrics[0].id).toBe('left_corner_3')
    })
  })

  describe('getPracticePerformance', () => {
    it('should return empty metrics when no sessions exist', async () => {
      mockKeys.mockResolvedValue([])

      const result = await getPracticePerformance({ days: 30 })

      expect(result.metrics).toEqual([])
      expect(result.trend).toEqual([])
      expect(result.overallFgPct).toBe(0)
      expect(result.overallEfgPct).toBe(0)
      expect(result.totalAttempts).toBe(0)
    })

    it('should aggregate zone performance from practice entries', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', started_at: '2024-01-10T10:00:00Z', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 10, makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 5, makes: 3, ts: '2024-01-10T10:05:00Z', _deleted: false },
        { id: 'e3', session_id: 'practice-1', zone_id: 'center_mid', attempts: 8, makes: 6, ts: '2024-01-10T10:10:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30 })

      expect(result.metrics).toHaveLength(2)

      const corner3Metric = result.metrics.find(m => m.id === 'left_corner_3')
      expect(corner3Metric).toBeDefined()
      expect(corner3Metric.attempts).toBe(15)
      expect(corner3Metric.makes).toBe(10)
      expect(corner3Metric.fgPct).toBeCloseTo(66.67, 1)

      const midRangeMetric = result.metrics.find(m => m.id === 'center_mid')
      expect(midRangeMetric).toBeDefined()
      expect(midRangeMetric.attempts).toBe(8)
      expect(midRangeMetric.makes).toBe(6)
      expect(midRangeMetric.fgPct).toBe(75)
    })

    it('should calculate overall FG% and eFG% correctly', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 10, makes: 5, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'center_mid', attempts: 10, makes: 5, ts: '2024-01-10T10:05:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30 })

      // Overall: 10 makes / 20 attempts = 50% FG
      expect(result.overallFgPct).toBe(50)
      expect(result.totalAttempts).toBe(20)

      // eFG%: (10 makes + 0.5 * 5 threes) / 20 attempts = 12.5 / 20 = 62.5%
      expect(result.overallEfgPct).toBe(62.5)
    })

    it('should filter by time range', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-01', _deleted: false },
        { id: 'practice-2', date_iso: '2024-01-14', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 10, makes: 7, ts: '2024-01-01T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-2', zone_id: 'left_corner_3', attempts: 5, makes: 3, ts: '2024-01-14T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1', 'practice-2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        if (key === 'practice-2') return Promise.resolve(sessions[1])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      // Filter to last 7 days (only practice-2 should be included)
      const result = await getPracticePerformance({ days: 7 })

      expect(result.totalAttempts).toBe(5)
    })

    it('should filter by shot type', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', shot_type: 'catch_shoot', attempts: 10, makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'left_corner_3', shot_type: 'off_dribble', attempts: 5, makes: 3, ts: '2024-01-10T10:05:00Z', _deleted: false },
        { id: 'e3', session_id: 'practice-1', zone_id: 'center_mid', shot_type: 'catch_shoot', attempts: 8, makes: 6, ts: '2024-01-10T10:10:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30, shotType: 'catch_shoot' })

      // Only catch_shoot entries should be included
      expect(result.totalAttempts).toBe(18)
    })

    it('should filter by contested status', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', contested: true, attempts: 10, makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'left_corner_3', contested: false, attempts: 5, makes: 3, ts: '2024-01-10T10:05:00Z', _deleted: false },
        { id: 'e3', session_id: 'practice-1', zone_id: 'center_mid', contested: true, attempts: 8, makes: 6, ts: '2024-01-10T10:10:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30, contested: 'contested' })

      // Only contested entries should be included
      expect(result.totalAttempts).toBe(18)
    })

    it('should handle free throws separately', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 10, makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'free_throw', attempts: 20, makes: 15, ts: '2024-01-10T10:05:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30, shotType: 'all' })

      // Free throws should appear in metrics but not in overall FG/eFG
      const ftMetric = result.metrics.find(m => m.id === 'free_throw')
      expect(ftMetric).toBeDefined()
      expect(ftMetric.attempts).toBe(20)
      expect(ftMetric.makes).toBe(15)

      // Overall stats should only count field goals
      expect(result.totalAttempts).toBe(10)
    })

    it('should exclude deleted sessions and entries', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
        { id: 'practice-2', date_iso: '2024-01-11', _deleted: true },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 10, makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 5, makes: 3, ts: '2024-01-10T10:05:00Z', _deleted: true },
        { id: 'e3', session_id: 'practice-2', zone_id: 'left_corner_3', attempts: 8, makes: 6, ts: '2024-01-11T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1', 'practice-2'])
        .mockResolvedValueOnce(['e1', 'e2', 'e3'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        if (key === 'practice-2') return Promise.resolve(sessions[1])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30 })

      // Only e1 should be counted
      expect(result.totalAttempts).toBe(10)
    })

    it('should generate monthly trend data', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-05', _deleted: false },
        { id: 'practice-2', date_iso: '2024-02-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 10, makes: 5, ts: '2024-01-05T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-2', zone_id: 'left_corner_3', attempts: 10, makes: 8, ts: '2024-02-10T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1', 'practice-2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        if (key === 'practice-2') return Promise.resolve(sessions[1])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: null })

      expect(result.trend).toHaveLength(2)
      expect(result.trendBuckets.monthly).toHaveLength(2)

      const jan = result.trend.find(t => t.monthKey === '2024-01')
      expect(jan).toBeDefined()
      expect(jan.fgPct).toBe(50)

      const feb = result.trend.find(t => t.monthKey === '2024-02')
      expect(feb).toBeDefined()
      expect(feb.fgPct).toBe(80)
    })

    it('should handle entries with mixed numeric types', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        // Test with numeric string attempts (performance-db converts to number)
        // Note: makes must be a number (practice-db.addEntry always converts)
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: '10', makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        // Test with actual numbers
        { id: 'e2', session_id: 'practice-1', zone_id: 'center_mid', attempts: 5, makes: 3, ts: '2024-01-10T10:05:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30 })

      expect(result.totalAttempts).toBe(15)
      expect(result.metrics).toHaveLength(2)

      const corner3Metric = result.metrics.find(m => m.id === 'left_corner_3')
      expect(corner3Metric).toBeDefined()
      expect(corner3Metric.attempts).toBe(10)
      expect(corner3Metric.makes).toBe(7)

      const midMetric = result.metrics.find(m => m.id === 'center_mid')
      expect(midMetric).toBeDefined()
      expect(midMetric.attempts).toBe(5)
      expect(midMetric.makes).toBe(3)
    })

    it('should handle entries with zero attempts', async () => {
      const sessions = [
        { id: 'practice-1', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', zone_id: 'left_corner_3', attempts: 0, makes: 0, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-1', zone_id: 'center_mid', attempts: 10, makes: 7, ts: '2024-01-10T10:05:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        if (key === 'practice-1') return Promise.resolve(sessions[0])
        const entry = entries.find(e => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30 })

      // Entry with 0 attempts should be skipped
      expect(result.totalAttempts).toBe(10)
      expect(result.metrics).toHaveLength(1)
    })

    it('filters practice sessions and entries by athleteId when provided', async () => {
      const sessions = [
        { id: 'practice-1', athlete_id: 'ath-1', date_iso: '2024-01-10', _deleted: false },
        { id: 'practice-2', athlete_id: 'ath-2', date_iso: '2024-01-10', _deleted: false },
      ]

      const entries = [
        { id: 'e1', session_id: 'practice-1', athlete_id: 'ath-1', zone_id: 'left_corner_3', attempts: 10, makes: 7, ts: '2024-01-10T10:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'practice-2', athlete_id: 'ath-2', zone_id: 'center_mid', attempts: 10, makes: 1, ts: '2024-01-10T10:00:00Z', _deleted: false },
      ]

      mockKeys
        .mockResolvedValueOnce(['practice-1', 'practice-2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet.mockImplementation((key) => {
        const session = sessions.find((s) => s.id === key)
        if (session) return Promise.resolve(session)
        const entry = entries.find((e) => e.id === key)
        return Promise.resolve(entry || null)
      })

      const result = await getPracticePerformance({ days: 30, athleteId: 'ath-1' })

      expect(result.totalAttempts).toBe(10)
      expect(result.metrics).toHaveLength(1)
      expect(result.metrics[0].id).toBe('left_corner_3')
    })
  })
})
