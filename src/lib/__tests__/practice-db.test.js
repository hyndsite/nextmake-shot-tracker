// src/lib/__tests__/practice-db.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  st,
  addPracticeSession,
  endPracticeSession,
  listPracticeSessions,
  addEntry,
  updateEntry,
  deleteEntry,
  addMarker,
  getTodaySummary,
  deletePracticeSession,
  listActivePracticeSessions,
  listEntriesBySession,
  _allDirtyPractice,
  _markClean,
  _purgePracticeRow,
} from '../practice-db.js'

// Mock dependencies
vi.mock('idb-keyval', () => ({
  createStore: vi.fn((dbName, storeName) => ({ dbName, storeName })),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
}))

vi.mock('../sync-notify.js', () => ({
  notifyLocalMutate: vi.fn(),
}))

vi.mock('../util-id.js', () => ({
  uuid: vi.fn(() => 'test-uuid-123'),
}))

describe('practice-db', () => {
  let mockGet, mockSet, mockDel
  let notifyLocalMutate
  let uuidCounter = 0

  beforeEach(async () => {
    const idbKeyval = await import('idb-keyval')
    const syncNotify = await import('../sync-notify.js')
    const utilId = await import('../util-id.js')

    mockGet = idbKeyval.get
    mockSet = idbKeyval.set
    mockDel = idbKeyval.del
    notifyLocalMutate = syncNotify.notifyLocalMutate

    // Reset mocks
    mockGet.mockClear()
    mockSet.mockClear()
    mockDel.mockClear()
    notifyLocalMutate.mockClear()

    // Default implementations
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue(undefined)
    mockDel.mockResolvedValue(undefined)

    // Reset uuid counter
    uuidCounter = 0
    utilId.uuid.mockImplementation(() => `test-uuid-${++uuidCounter}`)

    vi.useFakeTimers()
    vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('st (store references)', () => {
    it('should export store references for practice sessions, entries, and markers', () => {
      expect(st).toBeDefined()
      expect(st.practice).toBeDefined()
      expect(st.practice.sessions).toBeDefined()
      expect(st.practice.entries).toBeDefined()
      expect(st.practice.markers).toBeDefined()
    })
  })

  describe('addPracticeSession', () => {
    beforeEach(() => {
      // Mock index reads to return empty array
      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve([])
        return Promise.resolve(null)
      })
    })

    it('should create a new practice session with default values', async () => {
      const result = await addPracticeSession()

      expect(result).toBeDefined()
      expect(result.id).toBe('test-uuid-1')
      expect(result.user_id).toBeNull()
      expect(result.mode).toBe('practice')
      expect(result.date_iso).toBe('2024-01-15')
      expect(result.started_at).toBe('2024-01-15T12:00:00.000Z')
      expect(result.ended_at).toBeNull()
      expect(result.status).toBe('active')
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)
      expect(result._table).toBe('practice_sessions')

      expect(mockSet).toHaveBeenCalled()
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should create session with custom date', async () => {
      const result = await addPracticeSession({ dateISO: '2024-02-20' })

      expect(result.date_iso).toBe('2024-02-20')
    })

    it('should add session id to index', async () => {
      await addPracticeSession()

      // Should read index, then write updated index
      expect(mockGet).toHaveBeenCalledWith('__index__', st.practice.sessions)
      expect(mockSet).toHaveBeenCalledWith('__index__', ['test-uuid-1'], st.practice.sessions)
    })
  })

  describe('endPracticeSession', () => {
    it('should end an active practice session', async () => {
      const mockSession = {
        id: 'session-1',
        status: 'active',
        started_at: '2024-01-15T10:00:00Z',
        ended_at: null,
      }

      mockGet.mockResolvedValue(mockSession)

      const result = await endPracticeSession('session-1')

      expect(result.status).toBe('ended')
      expect(result.ended_at).toBe('2024-01-15T12:00:00.000Z')
      expect(result._dirty).toBe(true)
      expect(result._table).toBe('practice_sessions')

      expect(mockSet).toHaveBeenCalledWith('session-1', result, st.practice.sessions)
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should return null if session not found', async () => {
      mockGet.mockResolvedValue(null)

      const result = await endPracticeSession('non-existent')

      expect(result).toBeNull()
      expect(mockSet).not.toHaveBeenCalled()
      expect(notifyLocalMutate).not.toHaveBeenCalled()
    })
  })

  describe('listPracticeSessions', () => {
    it('should return empty array when no sessions exist', async () => {
      mockGet.mockResolvedValue([])

      const result = await listPracticeSessions()

      expect(result).toEqual([])
    })

    it('should return non-deleted sessions sorted by started_at descending', async () => {
      mockGet
        .mockResolvedValueOnce(['id1', 'id2', 'id3'])
        .mockResolvedValueOnce({ id: 'id1', started_at: '2024-01-01T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id2', started_at: '2024-01-03T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id3', started_at: '2024-01-02T00:00:00Z', _deleted: false })

      const result = await listPracticeSessions()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('id2')
      expect(result[1].id).toBe('id3')
      expect(result[2].id).toBe('id1')
    })

    it('should exclude deleted sessions', async () => {
      mockGet
        .mockResolvedValueOnce(['id1', 'id2'])
        .mockResolvedValueOnce({ id: 'id1', started_at: '2024-01-01T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id2', started_at: '2024-01-02T00:00:00Z', _deleted: true })

      const result = await listPracticeSessions()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('id1')
    })
  })

  describe('listActivePracticeSessions', () => {
    it('should return only active sessions without ended_at', async () => {
      mockGet
        .mockResolvedValueOnce(['id1', 'id2', 'id3'])
        .mockResolvedValueOnce({ id: 'id1', status: 'active', ended_at: null, started_at: '2024-01-03T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id2', status: 'ended', ended_at: '2024-01-02T00:00:00Z', started_at: '2024-01-02T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id3', status: 'active', ended_at: null, started_at: '2024-01-01T00:00:00Z', _deleted: false })

      const result = await listActivePracticeSessions()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('id1')
      expect(result[1].id).toBe('id3')
    })
  })

  describe('addEntry', () => {
    beforeEach(() => {
      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve([])
        return Promise.resolve(null)
      })
    })

    it('should add a practice entry with required fields', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'catch_shoot',
        attempts: 10,
        makes: 7,
      }

      const result = await addEntry(input)

      expect(result.id).toBe('test-uuid-1')
      expect(result.user_id).toBeNull()
      expect(result.mode).toBe('practice')
      expect(result.session_id).toBe('session-1')
      expect(result.zone_id).toBe('zone-1')
      expect(result.shot_type).toBe('catch_shoot')
      expect(result.attempts).toBe(10)
      expect(result.makes).toBe(7)
      expect(result.contested).toBe(false)
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)
      expect(result._table).toBe('practice_entries')

      expect(mockSet).toHaveBeenCalled()
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should handle contested field', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'off_dribble',
        contested: true,
        attempts: 5,
        makes: 3,
      }

      const result = await addEntry(input)

      expect(result.contested).toBe(true)
    })

    it('should accept legacy pressured field', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'catch_shoot',
        pressured: true,
        attempts: 5,
        makes: 3,
      }

      const result = await addEntry(input)

      expect(result.contested).toBe(true)
    })

    it('should handle layup metadata', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'layup',
        pickupType: 'one_dribble',
        finishType: 'right_hand',
        attempts: 8,
        makes: 6,
      }

      const result = await addEntry(input)

      expect(result.pickup_type).toBe('one_dribble')
      expect(result.finish_type).toBe('right_hand')
    })

    it('should accept custom timestamp', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'catch_shoot',
        ts: '2024-01-10T10:00:00Z',
        attempts: 5,
        makes: 3,
      }

      const result = await addEntry(input)

      expect(result.ts).toBe('2024-01-10T10:00:00Z')
    })

    it('should convert attempts and makes to numbers', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'catch_shoot',
        attempts: '10',
        makes: '7',
      }

      const result = await addEntry(input)

      expect(result.attempts).toBe(10)
      expect(result.makes).toBe(7)
      expect(typeof result.attempts).toBe('number')
      expect(typeof result.makes).toBe('number')
    })

    it('should add entry id to index', async () => {
      const input = {
        sessionId: 'session-1',
        zoneId: 'zone-1',
        shotType: 'catch_shoot',
        attempts: 5,
        makes: 3,
      }

      await addEntry(input)

      expect(mockSet).toHaveBeenCalledWith('__index__', ['test-uuid-1'], st.practice.entries)
    })
  })

  describe('updateEntry', () => {
    it('should update an existing practice entry', async () => {
      const existingEntry = {
        id: 'entry-1',
        session_id: 'session-1',
        zone_id: 'zone-1',
        shot_type: 'catch_shoot',
        contested: false,
        attempts: 5,
        makes: 3,
        ts: '2024-01-15T10:00:00Z',
      }

      mockGet.mockImplementation((key) => {
        if (key === 'entry-1') return Promise.resolve(existingEntry)
        if (key === '__index__') return Promise.resolve(['entry-1'])
        return Promise.resolve(null)
      })

      const result = await updateEntry({
        id: 'entry-1',
        attempts: 10,
        makes: 7,
      })

      expect(result.id).toBe('entry-1')
      expect(result.attempts).toBe(10)
      expect(result.makes).toBe(7)
      expect(result.session_id).toBe('session-1')
      expect(result.zone_id).toBe('zone-1')
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)

      expect(mockSet).toHaveBeenCalled()
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should throw error when id is missing', async () => {
      await expect(updateEntry({ attempts: 5, makes: 3 })).rejects.toThrow('updateEntry requires id')
    })

    it('should throw error when entry not found', async () => {
      mockGet.mockResolvedValue(null)

      await expect(updateEntry({ id: 'non-existent', attempts: 5, makes: 3 })).rejects.toThrow('practice entry not found')
    })

    it('should update contested field', async () => {
      const existingEntry = {
        id: 'entry-1',
        contested: false,
        attempts: 5,
        makes: 3,
      }

      mockGet.mockImplementation((key) => {
        if (key === 'entry-1') return Promise.resolve(existingEntry)
        if (key === '__index__') return Promise.resolve(['entry-1'])
        return Promise.resolve(null)
      })

      const result = await updateEntry({
        id: 'entry-1',
        contested: true,
        attempts: 5,
        makes: 3,
      })

      expect(result.contested).toBe(true)
    })

    it('should update layup metadata', async () => {
      const existingEntry = {
        id: 'entry-1',
        pickup_type: 'one_dribble',
        finish_type: 'right_hand',
        attempts: 5,
        makes: 3,
      }

      mockGet.mockImplementation((key) => {
        if (key === 'entry-1') return Promise.resolve(existingEntry)
        if (key === '__index__') return Promise.resolve(['entry-1'])
        return Promise.resolve(null)
      })

      const result = await updateEntry({
        id: 'entry-1',
        pickupType: 'two_dribble',
        finishType: 'left_hand',
        attempts: 8,
        makes: 6,
      })

      expect(result.pickup_type).toBe('two_dribble')
      expect(result.finish_type).toBe('left_hand')
    })
  })

  describe('deleteEntry', () => {
    it('should soft-delete an entry', async () => {
      const mockEntry = {
        id: 'entry-1',
        session_id: 'session-1',
        attempts: 5,
        makes: 3,
      }

      mockGet.mockResolvedValue(mockEntry)

      const result = await deleteEntry('entry-1')

      expect(result._deleted).toBe(true)
      expect(result._dirty).toBe(true)
      expect(result._table).toBe('practice_entries')

      expect(mockSet).toHaveBeenCalledWith('entry-1', result, st.practice.entries)
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should return null when id is not provided', async () => {
      const result = await deleteEntry(null)

      expect(result).toBeNull()
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('should return null when entry does not exist', async () => {
      mockGet.mockResolvedValue(null)

      const result = await deleteEntry('non-existent')

      expect(result).toBeNull()
      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('addMarker', () => {
    beforeEach(() => {
      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve([])
        return Promise.resolve(null)
      })
    })

    it('should add a practice marker', async () => {
      const input = {
        sessionId: 'session-1',
        label: 'Water break',
      }

      const result = await addMarker(input)

      expect(result.id).toBe('test-uuid-1')
      expect(result.user_id).toBeNull()
      expect(result.mode).toBe('practice')
      expect(result.session_id).toBe('session-1')
      expect(result.label).toBe('Water break')
      expect(result.ts).toBe('2024-01-15T12:00:00.000Z')
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)
      expect(result._table).toBe('practice_markers')

      expect(mockSet).toHaveBeenCalled()
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should use empty label by default', async () => {
      const result = await addMarker({ sessionId: 'session-1' })

      expect(result.label).toBe('')
    })
  })

  describe('getTodaySummary', () => {
    it('should aggregate today\'s practice entries', async () => {
      const todaySession = {
        id: 'session-1',
        date_iso: '2024-01-15',
        _deleted: false,
      }

      const entries = [
        { id: 'e1', session_id: 'session-1', zone_id: 'corner_3', attempts: 10, makes: 7, _deleted: false },
        { id: 'e2', session_id: 'session-1', zone_id: 'mid_range', attempts: 8, makes: 6, _deleted: false },
        { id: 'e3', session_id: 'session-1', zone_id: 'wing_3', attempts: 12, makes: 8, _deleted: false },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['e1', 'e2', 'e3'])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        if (key === 'e3') return Promise.resolve(entries[2])
        if (key === 'session-1') return Promise.resolve(todaySession)
        return Promise.resolve(null)
      })

      const result = await getTodaySummary()

      expect(result.date).toBe('2024-01-15')
      expect(result.attempts).toBe(30)
      expect(result.makes).toBe(21)
      expect(result.fg).toBeCloseTo(0.7)
    })

    it('should calculate eFG% correctly with three-pointers', async () => {
      const todaySession = {
        id: 'session-1',
        date_iso: '2024-01-15',
        _deleted: false,
      }

      const entries = [
        { id: 'e1', session_id: 'session-1', zone_id: 'left_corner_3', attempts: 10, makes: 5, _deleted: false },
        { id: 'e2', session_id: 'session-1', zone_id: 'center_mid', attempts: 10, makes: 5, _deleted: false },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['e1', 'e2'])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        if (key === 'session-1') return Promise.resolve(todaySession)
        return Promise.resolve(null)
      })

      const result = await getTodaySummary()

      expect(result.attempts).toBe(20)
      expect(result.makes).toBe(10)
      expect(result.threesAttempts).toBe(10)
      expect(result.threesMakes).toBe(5)
      // eFG = (10 + 0.5 * 5) / 20 = 12.5 / 20 = 0.625
      expect(result.efg).toBeCloseTo(0.625)
    })

    it('should exclude deleted entries', async () => {
      const todaySession = {
        id: 'session-1',
        date_iso: '2024-01-15',
        _deleted: false,
      }

      const entries = [
        { id: 'e1', session_id: 'session-1', zone_id: 'corner_3', attempts: 10, makes: 7, _deleted: false },
        { id: 'e2', session_id: 'session-1', zone_id: 'mid_range', attempts: 8, makes: 6, _deleted: true },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['e1', 'e2'])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        if (key === 'session-1') return Promise.resolve(todaySession)
        return Promise.resolve(null)
      })

      const result = await getTodaySummary()

      expect(result.attempts).toBe(10)
      expect(result.makes).toBe(7)
    })

    it('should exclude entries from different dates', async () => {
      const todaySession = {
        id: 'session-1',
        date_iso: '2024-01-15',
        _deleted: false,
      }

      const yesterdaySession = {
        id: 'session-2',
        date_iso: '2024-01-14',
        _deleted: false,
      }

      const entries = [
        { id: 'e1', session_id: 'session-1', zone_id: 'corner_3', attempts: 10, makes: 7, _deleted: false },
        { id: 'e2', session_id: 'session-2', zone_id: 'mid_range', attempts: 8, makes: 6, _deleted: false },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['e1', 'e2'])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        if (key === 'session-1') return Promise.resolve(todaySession)
        if (key === 'session-2') return Promise.resolve(yesterdaySession)
        return Promise.resolve(null)
      })

      const result = await getTodaySummary()

      expect(result.attempts).toBe(10)
      expect(result.makes).toBe(7)
    })

    it('should return zeros when no entries exist', async () => {
      mockGet.mockResolvedValue([])

      const result = await getTodaySummary()

      expect(result.date).toBe('2024-01-15')
      expect(result.attempts).toBe(0)
      expect(result.makes).toBe(0)
      expect(result.fg).toBe(0)
      expect(result.efg).toBe(0)
    })
  })

  describe('deletePracticeSession', () => {
    it('should mark session, entries, and markers as deleted', async () => {
      const mockSession = { id: 'session-1', status: 'active' }
      const mockEntries = [
        { id: 'entry-1', session_id: 'session-1' },
        { id: 'entry-2', session_id: 'session-1' },
        { id: 'entry-3', session_id: 'other-session' },
      ]
      const mockMarkers = [
        { id: 'marker-1', session_id: 'session-1' },
        { id: 'marker-2', session_id: 'other-session' },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve([])
        if (key === 'entry-1') return Promise.resolve(mockEntries[0])
        if (key === 'entry-2') return Promise.resolve(mockEntries[1])
        if (key === 'entry-3') return Promise.resolve(mockEntries[2])
        if (key === 'marker-1') return Promise.resolve(mockMarkers[0])
        if (key === 'marker-2') return Promise.resolve(mockMarkers[1])
        if (key === 'session-1') return Promise.resolve(mockSession)
        return Promise.resolve(null)
      })

      // First call returns entry ids, second call returns marker ids
      let callCount = 0
      mockGet.mockImplementation((key) => {
        if (key === '__index__') {
          callCount++
          if (callCount === 1) return Promise.resolve(['entry-1', 'entry-2', 'entry-3'])
          if (callCount === 2) return Promise.resolve(['marker-1', 'marker-2'])
          return Promise.resolve([])
        }
        if (key === 'entry-1') return Promise.resolve(mockEntries[0])
        if (key === 'entry-2') return Promise.resolve(mockEntries[1])
        if (key === 'entry-3') return Promise.resolve(mockEntries[2])
        if (key === 'marker-1') return Promise.resolve(mockMarkers[0])
        if (key === 'marker-2') return Promise.resolve(mockMarkers[1])
        if (key === 'session-1') return Promise.resolve(mockSession)
        return Promise.resolve(null)
      })

      await deletePracticeSession('session-1')

      // Verify entries belonging to this session are marked deleted
      expect(mockSet).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        _deleted: true,
        _dirty: true,
        _table: 'practice_entries',
      }), st.practice.entries)

      expect(mockSet).toHaveBeenCalledWith('entry-2', expect.objectContaining({
        _deleted: true,
        _dirty: true,
        _table: 'practice_entries',
      }), st.practice.entries)

      // Verify markers belonging to this session are marked deleted
      expect(mockSet).toHaveBeenCalledWith('marker-1', expect.objectContaining({
        _deleted: true,
        _dirty: true,
        _table: 'practice_markers',
      }), st.practice.markers)

      // Verify session is marked deleted
      expect(mockSet).toHaveBeenCalledWith('session-1', expect.objectContaining({
        _deleted: true,
        _dirty: true,
        _table: 'practice_sessions',
      }), st.practice.sessions)

      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should handle null id gracefully', async () => {
      await deletePracticeSession(null)

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('listEntriesBySession', () => {
    it('should return entries for a specific session sorted by timestamp', async () => {
      const entries = [
        { id: 'e1', session_id: 'session-1', ts: '2024-01-15T12:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'session-1', ts: '2024-01-15T12:05:00Z', _deleted: false },
        { id: 'e3', session_id: 'other-session', ts: '2024-01-15T12:03:00Z', _deleted: false },
        { id: 'e4', session_id: 'session-1', ts: '2024-01-15T12:02:00Z', _deleted: false },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['e1', 'e2', 'e3', 'e4'])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        if (key === 'e3') return Promise.resolve(entries[2])
        if (key === 'e4') return Promise.resolve(entries[3])
        return Promise.resolve(null)
      })

      const result = await listEntriesBySession('session-1')

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('e1')
      expect(result[1].id).toBe('e4')
      expect(result[2].id).toBe('e2')
    })

    it('should exclude deleted entries', async () => {
      const entries = [
        { id: 'e1', session_id: 'session-1', ts: '2024-01-15T12:00:00Z', _deleted: false },
        { id: 'e2', session_id: 'session-1', ts: '2024-01-15T12:05:00Z', _deleted: true },
      ]

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['e1', 'e2'])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        return Promise.resolve(null)
      })

      const result = await listEntriesBySession('session-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('e1')
    })
  })

  describe('_allDirtyPractice', () => {
    it('should return all dirty sessions, entries, and markers', async () => {
      const sessions = [
        { id: 's1', _dirty: true },
        { id: 's2', _dirty: false },
      ]
      const entries = [
        { id: 'e1', _dirty: true },
        { id: 'e2', _dirty: false },
      ]
      const markers = [
        { id: 'm1', _dirty: true },
        { id: 'm2', _dirty: false },
      ]

      let callCount = 0
      mockGet.mockImplementation((key) => {
        if (key === '__index__') {
          callCount++
          if (callCount === 1) return Promise.resolve(['s1', 's2'])
          if (callCount === 2) return Promise.resolve(['e1', 'e2'])
          if (callCount === 3) return Promise.resolve(['m1', 'm2'])
          return Promise.resolve([])
        }
        if (key === 's1') return Promise.resolve(sessions[0])
        if (key === 's2') return Promise.resolve(sessions[1])
        if (key === 'e1') return Promise.resolve(entries[0])
        if (key === 'e2') return Promise.resolve(entries[1])
        if (key === 'm1') return Promise.resolve(markers[0])
        if (key === 'm2') return Promise.resolve(markers[1])
        return Promise.resolve(null)
      })

      const result = await _allDirtyPractice()

      expect(result).toHaveLength(3)
      expect(result.map(r => r.id)).toEqual(['s1', 'e1', 'm1'])
    })

    it('should return empty array when no dirty rows exist', async () => {
      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve([])
        return Promise.resolve(null)
      })

      const result = await _allDirtyPractice()

      expect(result).toEqual([])
    })
  })

  describe('_markClean', () => {
    it('should mark practice session as clean', async () => {
      const dirtySession = { id: 'session-1', _table: 'practice_sessions', _dirty: true }
      mockGet.mockResolvedValue(dirtySession)

      await _markClean(dirtySession)

      expect(mockSet).toHaveBeenCalledWith('session-1', expect.objectContaining({
        id: 'session-1',
        _dirty: false,
      }), st.practice.sessions)
    })

    it('should mark practice entry as clean', async () => {
      const dirtyEntry = { id: 'entry-1', _table: 'practice_entries', _dirty: true }
      mockGet.mockResolvedValue(dirtyEntry)

      await _markClean(dirtyEntry)

      expect(mockSet).toHaveBeenCalledWith('entry-1', expect.objectContaining({
        id: 'entry-1',
        _dirty: false,
      }), st.practice.entries)
    })

    it('should mark practice marker as clean', async () => {
      const dirtyMarker = { id: 'marker-1', _table: 'practice_markers', _dirty: true }
      mockGet.mockResolvedValue(dirtyMarker)

      await _markClean(dirtyMarker)

      expect(mockSet).toHaveBeenCalledWith('marker-1', expect.objectContaining({
        id: 'marker-1',
        _dirty: false,
      }), st.practice.markers)
    })

    it('should handle missing _table property', async () => {
      await _markClean({ id: 'test' })

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('_purgePracticeRow', () => {
    it('should delete practice session row and remove from index', async () => {
      const row = { id: 'session-1', _table: 'practice_sessions' }

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['session-1', 'session-2'])
        return Promise.resolve(null)
      })

      await _purgePracticeRow(row)

      expect(mockDel).toHaveBeenCalledWith('session-1', st.practice.sessions)
      expect(mockSet).toHaveBeenCalledWith('__index__', ['session-2'], st.practice.sessions)
    })

    it('should delete practice entry row and remove from index', async () => {
      const row = { id: 'entry-1', _table: 'practice_entries' }

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['entry-1', 'entry-2'])
        return Promise.resolve(null)
      })

      await _purgePracticeRow(row)

      expect(mockDel).toHaveBeenCalledWith('entry-1', st.practice.entries)
      expect(mockSet).toHaveBeenCalledWith('__index__', ['entry-2'], st.practice.entries)
    })

    it('should delete practice marker row and remove from index', async () => {
      const row = { id: 'marker-1', _table: 'practice_markers' }

      mockGet.mockImplementation((key) => {
        if (key === '__index__') return Promise.resolve(['marker-1', 'marker-2'])
        return Promise.resolve(null)
      })

      await _purgePracticeRow(row)

      expect(mockDel).toHaveBeenCalledWith('marker-1', st.practice.markers)
      expect(mockSet).toHaveBeenCalledWith('__index__', ['marker-2'], st.practice.markers)
    })

    it('should handle missing _table property', async () => {
      await _purgePracticeRow({ id: 'test' })

      expect(mockDel).not.toHaveBeenCalled()
    })
  })
})
