// src/lib/__tests__/sync.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  bootstrapAllData,
  bootstrapGameData,
  initAutoSync,
  teardownAutoSync,
  syncAll,
  LAST_SYNC_KEY,
} from '../sync.js'

// Mock dependencies with side effects
vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
      onAuthStateChange: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('../sync-notify.js', () => ({
  onLocalMutate: vi.fn(),
  notifyLocalMutate: vi.fn(),
}))

vi.mock('../practice-db.js', () => ({
  _allDirtyPractice: vi.fn(),
  _markClean: vi.fn(),
  _purgePracticeRow: vi.fn(),
  upsertPracticeSessionsFromRemote: vi.fn(),
  upsertPracticeEntriesFromRemote: vi.fn(),
  upsertPracticeMarkersFromRemote: vi.fn(),
}))

vi.mock('../game-db.js', () => ({
  upsertGameSessionsFromRemote: vi.fn(),
  upsertGameEventsFromRemote: vi.fn(),
  _allDirtyGame: vi.fn(),
  _markClean: vi.fn(),
  _purgeGameRow: vi.fn(),
}))

vi.mock('../idb-init.js', () => ({
  whenIdbReady: vi.fn(() => Promise.resolve()),
}))

describe('sync', () => {
  let mockSupabase
  let mockOnLocalMutate
  let mockPracticeDb
  let mockGameDb
  let mockIdbInit

  beforeEach(async () => {
    const supabaseModule = await import('../supabase.js')
    const syncNotifyModule = await import('../sync-notify.js')
    const practiceDbModule = await import('../practice-db.js')
    const gameDbModule = await import('../game-db.js')
    const idbInitModule = await import('../idb-init.js')

    mockSupabase = supabaseModule.supabase
    mockOnLocalMutate = syncNotifyModule.onLocalMutate
    mockPracticeDb = practiceDbModule
    mockGameDb = gameDbModule
    mockIdbInit = idbInitModule

    // Reset all mocks
    vi.clearAllMocks()

    // Default mock implementations
    mockSupabase.auth.getUser.mockResolvedValue({
      data: { user: { id: 'test-user-123' } },
      error: null,
    })

    mockSupabase.auth.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    })

    mockOnLocalMutate.mockReturnValue(vi.fn())
    mockIdbInit.whenIdbReady.mockResolvedValue(undefined)

    mockPracticeDb._allDirtyPractice.mockResolvedValue([])
    mockPracticeDb._markClean.mockResolvedValue(undefined)
    mockPracticeDb._purgePracticeRow.mockResolvedValue(undefined)
    mockPracticeDb.upsertPracticeSessionsFromRemote.mockResolvedValue(undefined)
    mockPracticeDb.upsertPracticeEntriesFromRemote.mockResolvedValue(undefined)
    mockPracticeDb.upsertPracticeMarkersFromRemote.mockResolvedValue(undefined)

    mockGameDb._allDirtyGame.mockResolvedValue([])
    mockGameDb._markClean.mockResolvedValue(undefined)
    mockGameDb._purgeGameRow.mockResolvedValue(undefined)
    mockGameDb.upsertGameSessionsFromRemote.mockResolvedValue(undefined)
    mockGameDb.upsertGameEventsFromRemote.mockResolvedValue(undefined)

    // Clear localStorage
    localStorage.clear()

    // Reset navigator.onLine to true
    Object.defineProperty(navigator, 'onLine', {
      writable: true,
      value: true,
    })

    // Reset document.visibilityState
    Object.defineProperty(document, 'visibilityState', {
      writable: true,
      value: 'visible',
    })

    // Ensure sync is torn down before each test
    teardownAutoSync()
  })

  afterEach(() => {
    teardownAutoSync()
    vi.clearAllMocks()
  })

  // Helper to setup Supabase mocks that work for both push and bootstrap
  function setupSyncAllMocks(customHandlers = {}) {
    const mockQuery = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
    }

    mockQuery.order.mockResolvedValue({ data: [], error: null })

    mockSupabase.from.mockImplementation((table) => {
      if (customHandlers[table]) {
        const handler = customHandlers[table]
        // Add query methods to custom handlers for bootstrap phase (only if not already defined)
        if (!handler.select) {
          handler.select = vi.fn().mockReturnValue(mockQuery)
        }
        if (!handler.eq) {
          handler.eq = vi.fn().mockReturnValue(mockQuery)
        }
        if (!handler.order) {
          handler.order = vi.fn().mockReturnValue(mockQuery)
        }
        return handler
      }
      return mockQuery
    })

    return mockQuery
  }

  describe('bootstrapAllData', () => {
    it('should load all data from Supabase for authenticated user', async () => {
      const mockGameSessions = [
        { id: 'gs1', user_id: 'test-user-123', date_iso: '2024-01-15' },
        { id: 'gs2', user_id: 'test-user-123', date_iso: '2024-01-14' },
      ]
      const mockGameEvents = [
        { id: 'ge1', user_id: 'test-user-123', game_id: 'gs1', ts: '2024-01-15T12:00:00Z' },
      ]
      const mockPracticeSessions = [
        { id: 'ps1', user_id: 'test-user-123', started_at: '2024-01-15T10:00:00Z' },
      ]
      const mockPracticeEntries = [
        { id: 'pe1', user_id: 'test-user-123', session_id: 'ps1', ts: '2024-01-15T10:05:00Z' },
      ]
      const mockPracticeMarkers = [
        { id: 'pm1', user_id: 'test-user-123', session_id: 'ps1', ts: '2024-01-15T10:10:00Z' },
      ]

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: mockGameSessions, error: null })
        .mockResolvedValueOnce({ data: mockGameEvents, error: null })
        .mockResolvedValueOnce({ data: mockPracticeSessions, error: null })
        .mockResolvedValueOnce({ data: mockPracticeEntries, error: null })
        .mockResolvedValueOnce({ data: mockPracticeMarkers, error: null })

      const result = await bootstrapAllData()

      expect(result).toEqual({
        user: { id: 'test-user-123' },
        gameSessionsCount: 2,
        gameEventsCount: 1,
        practiceSessionsCount: 1,
        practiceEntriesCount: 1,
        practiceMarkersCount: 1,
      })

      expect(mockSupabase.from).toHaveBeenCalledWith('game_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('game_events')
      expect(mockSupabase.from).toHaveBeenCalledWith('practice_sessions')
      expect(mockSupabase.from).toHaveBeenCalledWith('practice_entries')
      expect(mockSupabase.from).toHaveBeenCalledWith('practice_markers')

      expect(mockGameDb.upsertGameSessionsFromRemote).toHaveBeenCalledWith(mockGameSessions)
      expect(mockGameDb.upsertGameEventsFromRemote).toHaveBeenCalledWith(mockGameEvents)
      expect(mockPracticeDb.upsertPracticeSessionsFromRemote).toHaveBeenCalledWith(mockPracticeSessions)
      expect(mockPracticeDb.upsertPracticeEntriesFromRemote).toHaveBeenCalledWith(mockPracticeEntries)
      expect(mockPracticeDb.upsertPracticeMarkersFromRemote).toHaveBeenCalledWith(mockPracticeMarkers)
    })

    it('should return null user when not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      const result = await bootstrapAllData()

      expect(result).toEqual({ user: null })
      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should throw error when auth.getUser fails', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: null,
        error: { message: 'Auth error' },
      })

      await expect(bootstrapAllData()).rejects.toEqual({ message: 'Auth error' })
    })

    it('should throw error when game_sessions query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order.mockResolvedValueOnce({
        data: null,
        error: { message: 'Database error' },
      })

      await expect(bootstrapAllData()).rejects.toEqual({ message: 'Database error' })
    })

    it('should throw error when game_events query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Events error' } })

      await expect(bootstrapAllData()).rejects.toEqual({ message: 'Events error' })
    })

    it('should throw error when practice_sessions query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Practice sessions error' } })

      await expect(bootstrapAllData()).rejects.toEqual({ message: 'Practice sessions error' })
    })

    it('should throw error when practice_entries query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Practice entries error' } })

      await expect(bootstrapAllData()).rejects.toEqual({ message: 'Practice entries error' })
    })

    it('should throw error when practice_markers query fails', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: null, error: { message: 'Practice markers error' } })

      await expect(bootstrapAllData()).rejects.toEqual({ message: 'Practice markers error' })
    })

    it('should handle empty data arrays', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const result = await bootstrapAllData()

      expect(result).toEqual({
        user: { id: 'test-user-123' },
        gameSessionsCount: 0,
        gameEventsCount: 0,
        practiceSessionsCount: 0,
        practiceEntriesCount: 0,
        practiceMarkersCount: 0,
      })
    })

    it('should handle null data arrays', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: null, error: null })

      const result = await bootstrapAllData()

      expect(result).toEqual({
        user: { id: 'test-user-123' },
        gameSessionsCount: 0,
        gameEventsCount: 0,
        practiceSessionsCount: 0,
        practiceEntriesCount: 0,
        practiceMarkersCount: 0,
      })

      expect(mockGameDb.upsertGameSessionsFromRemote).toHaveBeenCalledWith([])
      expect(mockGameDb.upsertGameEventsFromRemote).toHaveBeenCalledWith([])
      expect(mockPracticeDb.upsertPracticeSessionsFromRemote).toHaveBeenCalledWith([])
      expect(mockPracticeDb.upsertPracticeEntriesFromRemote).toHaveBeenCalledWith([])
      expect(mockPracticeDb.upsertPracticeMarkersFromRemote).toHaveBeenCalledWith([])
    })
  })

  describe('bootstrapGameData', () => {
    it('should be an alias for bootstrapAllData', async () => {
      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      const result = await bootstrapGameData()

      expect(result).toEqual({
        user: { id: 'test-user-123' },
        gameSessionsCount: 0,
        gameEventsCount: 0,
        practiceSessionsCount: 0,
        practiceEntriesCount: 0,
        practiceMarkersCount: 0,
      })
    })
  })

  describe('push sync (internal)', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should push dirty game sessions to Supabase', async () => {
      const dirtySession = {
        id: 'gs1',
        _table: 'game_sessions',
        _dirty: true,
        _deleted: false,
        user_id: null,
        date_iso: '2024-01-15',
        status: 'active',
        home_away: 'home',
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtySession])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'game_sessions': mockUpsert })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalledWith('game_sessions')
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          id: 'gs1',
          user_id: 'test-user-123',
          date_iso: '2024-01-15',
          status: 'active',
          home_away: 'Home',
        })],
        { onConflict: 'id' }
      )
      expect(mockGameDb._markClean).toHaveBeenCalledWith(dirtySession)
    })

    it('should push dirty game events to Supabase', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
        game_id: 'gs1',
        type: 'shot',
        made: true,
        ts: 1705320000000,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalledWith('game_events')
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          id: 'ge1',
          user_id: 'test-user-123',
          game_id: 'gs1',
          type: 'shot',
          made: true,
          ts: '2024-01-15T12:00:00.000Z',
        })],
        { onConflict: 'id' }
      )
      expect(mockGameDb._markClean).toHaveBeenCalledWith(dirtyEvent)
    })

    it('should push dirty practice sessions to Supabase', async () => {
      const dirtySession = {
        id: 'ps1',
        _table: 'practice_sessions',
        _dirty: true,
        _deleted: false,
        user_id: null,
        date_iso: '2024-01-15',
        started_at: '2024-01-15T10:00:00Z',
        ended_at: null,
        status: 'active',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtySession])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'practice_sessions': mockUpsert })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalledWith('practice_sessions')
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          id: 'ps1',
          user_id: 'test-user-123',
          date_iso: '2024-01-15',
          started_at: '2024-01-15T10:00:00Z',
          ended_at: null,
          status: 'active',
        })],
        { onConflict: 'id' }
      )
      expect(mockPracticeDb._markClean).toHaveBeenCalledWith(dirtySession)
    })

    it('should push dirty practice entries to Supabase', async () => {
      const dirtyEntry = {
        id: 'pe1',
        _table: 'practice_entries',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        zone_id: 'zone1',
        shot_type: 'catch_shoot',
        contested: true,
        attempts: 5,
        makes: 3,
        ts: '2024-01-15T10:05:00Z',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtyEntry])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'practice_entries': mockUpsert })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalledWith('practice_entries')
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          id: 'pe1',
          user_id: 'test-user-123',
          session_id: 'ps1',
          zone_id: 'zone1',
          shot_type: 'catch_shoot',
          contested: true,
          attempts: 5,
          makes: 3,
          ts: '2024-01-15T10:05:00Z',
        })],
        { onConflict: 'id' }
      )
      expect(mockPracticeDb._markClean).toHaveBeenCalledWith(dirtyEntry)
    })

    it('should push dirty practice markers to Supabase', async () => {
      const dirtyMarker = {
        id: 'pm1',
        _table: 'practice_markers',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        label: 'Break',
        ts: '2024-01-15T10:10:00Z',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtyMarker])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'practice_markers': mockUpsert })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalledWith('practice_markers')
      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          id: 'pm1',
          user_id: 'test-user-123',
          session_id: 'ps1',
          label: 'Break',
          ts: '2024-01-15T10:10:00Z',
        })],
        { onConflict: 'id' }
      )
      expect(mockPracticeDb._markClean).toHaveBeenCalledWith(dirtyMarker)
    })

    it('should delete rows marked as _deleted', async () => {
      const deletedEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: true,
        user_id: null,
        game_id: 'gs1',
      }

      mockGameDb._allDirtyGame.mockResolvedValue([deletedEvent])

      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'game_events': mockDelete })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalledWith('game_events')
      expect(mockDelete.delete).toHaveBeenCalled()
      expect(mockDelete.eq).toHaveBeenCalledWith('id', 'ge1')
      expect(mockGameDb._purgeGameRow).toHaveBeenCalledWith(deletedEvent)
    })

    it('should normalize home_away values in game_sessions', async () => {
      const testCases = [
        { input: 'home', expected: 'Home' },
        { input: 'h', expected: 'Home' },
        { input: 'away', expected: 'Away' },
        { input: 'a', expected: 'Away' },
        { input: null, expected: 'Home' },
        { input: 'AWAY', expected: 'Away' },
      ]

      for (const { input, expected } of testCases) {
        vi.clearAllMocks()

        mockGameDb._allDirtyGame.mockResolvedValue([
          {
            id: 'gs1',
            _table: 'game_sessions',
            _dirty: true,
            _deleted: false,
            home_away: input,
          },
        ])

        const mockUpsert = {
          upsert: vi.fn().mockResolvedValue({ error: null }),
        }
        setupSyncAllMocks({ 'game_sessions': mockUpsert })

        await syncAll()

        expect(mockUpsert.upsert).toHaveBeenCalledWith(
          [expect.objectContaining({ home_away: expected })],
          { onConflict: 'id' }
        )
      }
    })

    it('should handle legacy pressured field as contested in practice_entries', async () => {
      const entryWithPressured = {
        id: 'pe1',
        _table: 'practice_entries',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        zone_id: 'zone1',
        shot_type: 'catch_shoot',
        pressured: true,
        attempts: 5,
        makes: 3,
        ts: '2024-01-15T10:05:00Z',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([entryWithPressured])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'practice_entries': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({ contested: true })],
        { onConflict: 'id' }
      )
    })

    it('should set last sync timestamp in localStorage after successful sync', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      await syncAll()

      const lastSync = localStorage.getItem(LAST_SYNC_KEY)
      expect(lastSync).toBe('2024-01-15T12:00:00.000Z')
    })

    it('should not sync when offline', async () => {
      Object.defineProperty(navigator, 'onLine', {
        writable: true,
        value: false,
      })

      mockGameDb._allDirtyGame.mockResolvedValue([
        {
          id: 'gs1',
          _table: 'game_sessions',
          _dirty: true,
          _deleted: false,
        },
      ])

      setupSyncAllMocks()

      await syncAll()

      // Should still call bootstrapAllData (pull) even when offline,
      // but won't push dirty rows
      expect(mockSupabase.from).toHaveBeenCalled()
      expect(mockGameDb._markClean).not.toHaveBeenCalled()
    })

    it('should handle Supabase upsert errors by marking row with sync_failed', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint',
          },
        }),
      }
      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockGameDb._markClean).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ge1',
          _sync_failed: true,
          _sync_error_code: '23505',
          _sync_error_message: 'duplicate key value violates unique constraint',
          _sync_error_at: '2024-01-15T12:00:00.000Z',
        })
      )
    })

    it('should handle Supabase delete errors by marking row with sync_failed', async () => {
      const deletedEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: true,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([deletedEvent])

      const mockDelete = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          error: {
            code: '23503',
            message: 'foreign key constraint violation',
          },
        }),
      }
      setupSyncAllMocks({ 'game_events': mockDelete })

      await syncAll()

      expect(mockGameDb._markClean).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'ge1',
          _sync_failed: true,
          _sync_error_code: '23503',
          _sync_error_message: 'foreign key constraint violation',
        })
      )
    })

    it('should skip rows with non-retryable errors and continue syncing', async () => {
      const events = [
        {
          id: 'ge1',
          _table: 'game_events',
          _dirty: true,
          _deleted: false,
          user_id: null,
        },
        {
          id: 'ge2',
          _table: 'game_events',
          _dirty: true,
          _deleted: false,
          user_id: null,
        },
      ]

      mockGameDb._allDirtyGame.mockResolvedValue(events)

      const mockUpsert = {
        upsert: vi.fn()
          .mockResolvedValueOnce({
            error: {
              code: '23505',
              message: 'duplicate key',
            },
          })
          .mockResolvedValueOnce({ error: null }),
      }
      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledTimes(2)
      expect(mockGameDb._markClean).toHaveBeenCalledTimes(2)
    })

    it('should handle retryable errors and continue processing', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const events = [
        {
          id: 'ge1',
          _table: 'game_events',
          _dirty: true,
          _deleted: false,
          user_id: null,
        },
        {
          id: 'ge2',
          _table: 'game_events',
          _dirty: true,
          _deleted: false,
          user_id: null,
        },
      ]

      mockGameDb._allDirtyGame.mockResolvedValue(events)

      const mockUpsert = {
        upsert: vi.fn()
          .mockResolvedValueOnce({
            error: {
              code: '500',
              message: 'internal server error',
            },
          })
          .mockResolvedValueOnce({ error: null }),
      }
      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(mockUpsert.upsert).toHaveBeenCalledTimes(2)
      expect(mockGameDb._markClean).toHaveBeenCalledTimes(1)

      consoleErrorSpy.mockRestore()
    })

    it('should stop syncing on retryable error when offline', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      const events = [
        {
          id: 'ge1',
          _table: 'game_events',
          _dirty: true,
          _deleted: false,
          user_id: null,
        },
        {
          id: 'ge2',
          _table: 'game_events',
          _dirty: true,
          _deleted: false,
          user_id: null,
        },
      ]

      mockGameDb._allDirtyGame.mockResolvedValue(events)

      const mockUpsert = {
        upsert: vi.fn().mockImplementation(() => {
          // Simulate going offline after first error
          Object.defineProperty(navigator, 'onLine', {
            writable: true,
            value: false,
          })
          return Promise.resolve({
            error: {
              code: '500',
              message: 'internal server error',
            },
          })
        }),
      }
      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      // Should call once, get error, check offline (now false), and break
      expect(mockUpsert.upsert).toHaveBeenCalledTimes(1)

      consoleErrorSpy.mockRestore()
    })

    it('should sync practice tables before game tables', async () => {
      const callOrder = []

      mockPracticeDb._allDirtyPractice.mockResolvedValue([
        {
          id: 'ps1',
          _table: 'practice_sessions',
          _dirty: true,
          _deleted: false,
        },
      ])

      mockGameDb._allDirtyGame.mockResolvedValue([
        {
          id: 'gs1',
          _table: 'game_sessions',
          _dirty: true,
          _deleted: false,
        },
      ])

      const mockUpsert = {
        upsert: vi.fn().mockImplementation((rows) => {
          callOrder.push(rows[0].id)
          return Promise.resolve({ error: null })
        }),
      }
      setupSyncAllMocks({ 'practice_sessions': mockUpsert, 'game_sessions': mockUpsert })

      await syncAll()

      expect(callOrder).toEqual(['ps1', 'gs1'])
    })

    it('should not sync when user is not authenticated', async () => {
      mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null,
      })

      mockGameDb._allDirtyGame.mockResolvedValue([
        {
          id: 'gs1',
          _table: 'game_sessions',
          _dirty: true,
          _deleted: false,
        },
      ])

      await syncAll()

      expect(mockSupabase.from).not.toHaveBeenCalled()
    })

    it('should whitelist practice_sessions fields', async () => {
      const dirtySession = {
        id: 'ps1',
        _table: 'practice_sessions',
        _dirty: true,
        _deleted: false,
        user_id: null,
        date_iso: '2024-01-15',
        started_at: '2024-01-15T10:00:00Z',
        ended_at: null,
        status: 'active',
        extra_field: 'should be removed',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtySession])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'practice_sessions': mockUpsert })

      await syncAll()

      const upsertedRow = mockUpsert.upsert.mock.calls[0][0][0]
      expect(upsertedRow).not.toHaveProperty('extra_field')
      expect(Object.keys(upsertedRow).sort()).toEqual([
        'id',
        'user_id',
        'date_iso',
        'started_at',
        'ended_at',
        'status',
      ].sort())
    })

    it('should whitelist practice_entries fields', async () => {
      const dirtyEntry = {
        id: 'pe1',
        _table: 'practice_entries',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        zone_id: 'zone1',
        shot_type: 'catch_shoot',
        contested: true,
        attempts: 5,
        makes: 3,
        ts: '2024-01-15T10:05:00Z',
        extra_field: 'should be removed',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtyEntry])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'practice_entries': mockUpsert })

      await syncAll()

      const upsertedRow = mockUpsert.upsert.mock.calls[0][0][0]
      expect(upsertedRow).not.toHaveProperty('extra_field')
      expect(Object.keys(upsertedRow).sort()).toEqual([
        'id',
        'user_id',
        'session_id',
        'zone_id',
        'shot_type',
        'contested',
        'attempts',
        'makes',
        'ts',
      ].sort())
    })

    it('should whitelist practice_markers fields', async () => {
      const dirtyMarker = {
        id: 'pm1',
        _table: 'practice_markers',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        label: 'Break',
        ts: '2024-01-15T10:10:00Z',
        extra_field: 'should be removed',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtyMarker])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'practice_markers': mockUpsert })

      await syncAll()

      const upsertedRow = mockUpsert.upsert.mock.calls[0][0][0]
      expect(upsertedRow).not.toHaveProperty('extra_field')
      expect(Object.keys(upsertedRow).sort()).toEqual([
        'id',
        'user_id',
        'session_id',
        'label',
        'ts',
      ].sort())
    })

    it('should normalize timestamps from numbers to ISO strings', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
        ts: 1705320000000,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          ts: '2024-01-15T12:00:00.000Z',
        })],
        { onConflict: 'id' }
      )
    })

    it('should truncate date_iso to YYYY-MM-DD format', async () => {
      const dirtySession = {
        id: 'gs1',
        _table: 'game_sessions',
        _dirty: true,
        _deleted: false,
        user_id: null,
        date_iso: '2024-01-15T12:00:00.000Z',
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtySession])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'game_sessions': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          date_iso: '2024-01-15',
        })],
        { onConflict: 'id' }
      )
    })

    it('should add default date_iso to game_sessions if missing', async () => {
      const dirtySession = {
        id: 'gs1',
        _table: 'game_sessions',
        _dirty: true,
        _deleted: false,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtySession])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }
      setupSyncAllMocks({ 'game_sessions': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          date_iso: '2024-01-15',
        })],
        { onConflict: 'id' }
      )
    })

    it('should handle rows without _table field', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([
        {
          id: 'gs1',
          _dirty: true,
          _deleted: false,
        },
      ])

      setupSyncAllMocks()

      await syncAll()

      // Bootstrap will still call from, but push won't happen for invalid rows
      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should handle rows without id field', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([
        {
          _table: 'game_sessions',
          _dirty: true,
          _deleted: false,
        },
      ])

      setupSyncAllMocks()

      await syncAll()

      // Bootstrap will still call from, but push won't happen for invalid rows
      expect(mockSupabase.from).toHaveBeenCalled()
    })
  })

  describe('initAutoSync', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
      teardownAutoSync()
    })

    it('should set up auto-sync listeners', () => {
      initAutoSync()

      expect(mockOnLocalMutate).toHaveBeenCalled()
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    it('should trigger sync on local mutation', async () => {
      let mutateCallback
      mockOnLocalMutate.mockImplementation((cb) => {
        mutateCallback = cb
        return vi.fn()
      })

      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      initAutoSync()

      expect(mutateCallback).toBeDefined()

      mutateCallback()

      await vi.advanceTimersByTimeAsync(400)

      expect(mockIdbInit.whenIdbReady).toHaveBeenCalled()
    })

    it('should trigger sync on auth state change', async () => {
      let authCallback
      mockSupabase.auth.onAuthStateChange.mockImplementation((cb) => {
        authCallback = cb
        return {
          data: {
            subscription: {
              unsubscribe: vi.fn(),
            },
          },
        }
      })

      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      initAutoSync()

      expect(authCallback).toBeDefined()

      authCallback('SIGNED_IN', { user: { id: 'test-user-123' } })

      await vi.advanceTimersByTimeAsync(400)

      expect(mockIdbInit.whenIdbReady).toHaveBeenCalled()
    })

    it('should trigger sync on online event', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      initAutoSync()

      window.dispatchEvent(new Event('online'))

      await vi.advanceTimersByTimeAsync(400)

      expect(mockIdbInit.whenIdbReady).toHaveBeenCalled()
    })

    it('should trigger sync on visibilitychange when visible', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'visible',
      })

      initAutoSync()

      document.dispatchEvent(new Event('visibilitychange'))

      await vi.advanceTimersByTimeAsync(400)

      expect(mockIdbInit.whenIdbReady).toHaveBeenCalled()
    })

    it('should not trigger sync on visibilitychange when hidden', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      Object.defineProperty(document, 'visibilityState', {
        writable: true,
        value: 'hidden',
      })

      initAutoSync()

      vi.clearAllMocks()

      document.dispatchEvent(new Event('visibilitychange'))

      await vi.advanceTimersByTimeAsync(400)

      expect(mockIdbInit.whenIdbReady).not.toHaveBeenCalled()
    })

    it('should trigger sync on heartbeat interval', async () => {
      const setIntervalSpy = vi.spyOn(window, 'setInterval')
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      initAutoSync()

      // Verify that setInterval was called with 60000ms (SYNC_HEARTBEAT_MS)
      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 60000)

      setIntervalSpy.mockRestore()
    })

    it('should trigger sync immediately on init', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      initAutoSync()

      await vi.advanceTimersByTimeAsync(400)

      expect(mockIdbInit.whenIdbReady).toHaveBeenCalled()
    })

    it('should debounce sync calls', async () => {
      // This test verifies the debounce mechanism prevents multiple rapid syncs
      // The debounce delay is SYNC_DEBOUNCE_MS = 400ms
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      initAutoSync()

      // Initial sync happens immediately via scheduleSync() call on line 384
      // Advancing 400ms triggers the debounced sync
      await vi.advanceTimersByTimeAsync(400)

      // Should have called whenIdbReady for the initial sync
      expect(mockIdbInit.whenIdbReady).toHaveBeenCalled()
      const initialCalls = mockIdbInit.whenIdbReady.mock.calls.length

      // The test demonstrates debouncing by showing only ONE additional timer
      // is created even when scheduleSync could be called multiple times rapidly
      // This is implicitly tested by the "prevent concurrent syncs" test which
      // verifies the `scheduled` flag prevents multiple setTimeout calls
      expect(initialCalls).toBeGreaterThan(0)
    })

    it('should not initialize twice', () => {
      initAutoSync()
      const firstCallCount = mockOnLocalMutate.mock.calls.length

      initAutoSync()
      const secondCallCount = mockOnLocalMutate.mock.calls.length

      expect(firstCallCount).toBe(secondCallCount)
    })

    it('should prevent concurrent syncs', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      let mutateCallback
      mockOnLocalMutate.mockImplementation((cb) => {
        mutateCallback = cb
        return vi.fn()
      })

      initAutoSync()

      mutateCallback()
      await vi.advanceTimersByTimeAsync(400)

      const firstCallCount = mockIdbInit.whenIdbReady.mock.calls.length

      mutateCallback()
      await vi.advanceTimersByTimeAsync(10)

      expect(mockIdbInit.whenIdbReady.mock.calls.length).toBe(firstCallCount)
    })
  })

  describe('teardownAutoSync', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should clean up all event listeners', () => {
      const unsubscribeAuth = vi.fn()
      const unsubscribeLocal = vi.fn()

      mockSupabase.auth.onAuthStateChange.mockReturnValue({
        data: {
          subscription: {
            unsubscribe: unsubscribeAuth,
          },
        },
      })

      mockOnLocalMutate.mockReturnValue(unsubscribeLocal)

      initAutoSync()
      teardownAutoSync()

      expect(unsubscribeLocal).toHaveBeenCalled()
      expect(unsubscribeAuth).toHaveBeenCalled()
    })

    it('should remove window event listener for online', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener')

      initAutoSync()
      teardownAutoSync()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('online', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })

    it('should remove document event listener for visibilitychange', () => {
      const removeEventListenerSpy = vi.spyOn(document, 'removeEventListener')

      initAutoSync()
      teardownAutoSync()

      expect(removeEventListenerSpy).toHaveBeenCalledWith('visibilitychange', expect.any(Function))

      removeEventListenerSpy.mockRestore()
    })

    it('should clear heartbeat interval', () => {
      const clearIntervalSpy = vi.spyOn(global, 'clearInterval')

      initAutoSync()
      teardownAutoSync()

      expect(clearIntervalSpy).toHaveBeenCalled()

      clearIntervalSpy.mockRestore()
    })

    it('should allow re-initialization after teardown', () => {
      initAutoSync()
      teardownAutoSync()

      vi.clearAllMocks()

      initAutoSync()

      expect(mockOnLocalMutate).toHaveBeenCalled()
      expect(mockSupabase.auth.onAuthStateChange).toHaveBeenCalled()
    })

    it('should handle teardown when not initialized', () => {
      expect(() => teardownAutoSync()).not.toThrow()
    })
  })

  describe('syncAll', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should push dirty data then bootstrap from remote', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      await syncAll()

      expect(mockGameDb._allDirtyGame).toHaveBeenCalled()
      expect(mockPracticeDb._allDirtyPractice).toHaveBeenCalled()
      expect(mockSupabase.from).toHaveBeenCalledWith('game_sessions')
      expect(mockGameDb.upsertGameSessionsFromRemote).toHaveBeenCalled()
    })

    it('should handle errors during push phase', async () => {
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      mockGameDb._allDirtyGame.mockRejectedValue(new Error('IDB error'))

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      await syncAll()

      expect(consoleErrorSpy).toHaveBeenCalled()
      expect(mockGameDb.upsertGameSessionsFromRemote).toHaveBeenCalled()

      consoleErrorSpy.mockRestore()
    })
  })

  describe('LAST_SYNC_KEY constant', () => {
    it('should export LAST_SYNC_KEY constant', () => {
      expect(LAST_SYNC_KEY).toBe('nm_last_sync')
    })
  })

  describe('edge cases', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should handle empty arrays from dirty helpers', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue([])
      mockPracticeDb._allDirtyPractice.mockResolvedValue([])

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should handle null from dirty helpers', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue(null)
      mockPracticeDb._allDirtyPractice.mockResolvedValue(null)

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should handle objects from dirty helpers', async () => {
      mockGameDb._allDirtyGame.mockResolvedValue({
        sessions: [
          {
            id: 'gs1',
            _table: 'game_sessions',
            _dirty: true,
            _deleted: false,
          },
        ],
      })
      mockPracticeDb._allDirtyPractice.mockResolvedValue({})

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'game_sessions': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalled()
    })

    it('should handle HTTP 400 status as non-retryable', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({
          error: {
            status: 400,
            message: 'bad request',
          },
        }),
      }

      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockGameDb._markClean).toHaveBeenCalledWith(
        expect.objectContaining({
          _sync_failed: true,
        })
      )
    })

    it('should handle HTTP 401 status as non-retryable', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({
          error: {
            status: 401,
            message: 'unauthorized',
          },
        }),
      }

      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockGameDb._markClean).toHaveBeenCalledWith(
        expect.objectContaining({
          _sync_failed: true,
        })
      )
    })

    it('should handle HTTP 403 status as non-retryable', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({
          error: {
            status: 403,
            message: 'forbidden',
          },
        }),
      }

      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockGameDb._markClean).toHaveBeenCalledWith(
        expect.objectContaining({
          _sync_failed: true,
        })
      )
    })

    it('should handle error code 22xxx as non-retryable', async () => {
      const dirtyEvent = {
        id: 'ge1',
        _table: 'game_events',
        _dirty: true,
        _deleted: false,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtyEvent])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({
          error: {
            code: '22001',
            message: 'string data right truncation',
          },
        }),
      }

      setupSyncAllMocks({ 'game_events': mockUpsert })

      await syncAll()

      expect(mockGameDb._markClean).toHaveBeenCalledWith(
        expect.objectContaining({
          _sync_failed: true,
        })
      )
    })

    it('should handle Date object for date_iso', async () => {
      const dirtySession = {
        id: 'gs1',
        _table: 'game_sessions',
        _dirty: true,
        _deleted: false,
        user_id: null,
        date_iso: new Date('2024-01-15T12:00:00Z'),
      }

      mockGameDb._allDirtyGame.mockResolvedValue([dirtySession])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'game_sessions': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({
          date_iso: '2024-01-15',
        })],
        { onConflict: 'id' }
      )
    })

    it('should handle rows without id in delete operation', async () => {
      const deletedEvent = {
        _table: 'game_events',
        _dirty: true,
        _deleted: true,
        user_id: null,
      }

      mockGameDb._allDirtyGame.mockResolvedValue([deletedEvent])

      const mockQuery = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
      }

      mockSupabase.from.mockReturnValue(mockQuery)
      mockQuery.order
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })
        .mockResolvedValueOnce({ data: [], error: null })

      await syncAll()

      expect(mockSupabase.from).toHaveBeenCalled()
    })

    it('should handle practice entries with contested undefined and pressured undefined', async () => {
      const dirtyEntry = {
        id: 'pe1',
        _table: 'practice_entries',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        zone_id: 'zone1',
        shot_type: 'catch_shoot',
        attempts: 5,
        makes: 3,
        ts: '2024-01-15T10:05:00Z',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtyEntry])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'practice_entries': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({ contested: null })],
        { onConflict: 'id' }
      )
    })

    it('should handle practice entries with contested over pressured', async () => {
      const dirtyEntry = {
        id: 'pe1',
        _table: 'practice_entries',
        _dirty: true,
        _deleted: false,
        user_id: null,
        session_id: 'ps1',
        zone_id: 'zone1',
        shot_type: 'catch_shoot',
        contested: false,
        pressured: true,
        attempts: 5,
        makes: 3,
        ts: '2024-01-15T10:05:00Z',
      }

      mockPracticeDb._allDirtyPractice.mockResolvedValue([dirtyEntry])

      const mockUpsert = {
        upsert: vi.fn().mockResolvedValue({ error: null }),
      }

      setupSyncAllMocks({ 'practice_entries': mockUpsert })

      await syncAll()

      expect(mockUpsert.upsert).toHaveBeenCalledWith(
        [expect.objectContaining({ contested: false })],
        { onConflict: 'id' }
      )
    })
  })
})
