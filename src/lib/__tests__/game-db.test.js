// src/lib/__tests__/game-db.test.js
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import {
  st,
  listGameSessions,
  getGameSession,
  getActiveGameSession,
  addGameSession,
  endGameSession,
  deleteGameSession,
  addGameEvent,
  deleteGameEvent,
  listGameEventsBySession,
  _allDirtyGame,
  _markClean,
  _purgeGameRow,
} from '../game-db.js'

// Mock dependencies
vi.mock('idb-keyval', () => ({
  createStore: vi.fn((dbName, storeName) => ({ dbName, storeName })),
  get: vi.fn(),
  set: vi.fn(),
  keys: vi.fn(),
  del: vi.fn(),
}))

vi.mock('../idb-init.js', () => ({
  whenIdbReady: vi.fn(() => Promise.resolve()),
}))

vi.mock('../sync-notify.js', () => ({
  notifyLocalMutate: vi.fn(),
}))

vi.mock('../supabase.js', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: vi.fn(),
  },
}))

vi.mock('../util-id.js', () => ({
  uuid: vi.fn(() => 'test-uuid-123'),
}))

describe('game-db', () => {
  let mockGet, mockSet, mockKeys, mockDel
  let notifyLocalMutate

  beforeEach(async () => {
    const idbKeyval = await import('idb-keyval')
    const syncNotify = await import('../sync-notify.js')

    mockGet = idbKeyval.get
    mockSet = idbKeyval.set
    mockKeys = idbKeyval.keys
    mockDel = idbKeyval.del
    notifyLocalMutate = syncNotify.notifyLocalMutate

    // Reset all mocks
    mockGet.mockClear()
    mockSet.mockClear()
    mockKeys.mockClear()
    mockDel.mockClear()
    notifyLocalMutate.mockClear()

    // Default mock implementations
    mockGet.mockResolvedValue(null)
    mockSet.mockResolvedValue(undefined)
    mockKeys.mockResolvedValue([])
    mockDel.mockResolvedValue(undefined)
  })

  describe('st (store references)', () => {
    it('should export store references for game sessions and events', () => {
      expect(st).toBeDefined()
      expect(st.game).toBeDefined()
      expect(st.game.sessions).toBeDefined()
      expect(st.game.events).toBeDefined()
    })
  })

  describe('listGameSessions', () => {
    it('should return empty array when no sessions exist', async () => {
      mockKeys.mockResolvedValue([])

      const result = await listGameSessions()

      expect(result).toEqual([])
    })

    it('should return non-deleted sessions sorted by started_at descending', async () => {
      mockKeys.mockResolvedValue(['id1', 'id2', 'id3'])
      mockGet
        .mockResolvedValueOnce({ id: 'id1', started_at: '2024-01-01T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id2', started_at: '2024-01-03T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id3', started_at: '2024-01-02T00:00:00Z', _deleted: false })

      const result = await listGameSessions()

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('id2')
      expect(result[1].id).toBe('id3')
      expect(result[2].id).toBe('id1')
    })

    it('should exclude deleted sessions', async () => {
      mockKeys.mockResolvedValue(['id1', 'id2', 'id3'])
      mockGet
        .mockResolvedValueOnce({ id: 'id1', started_at: '2024-01-01T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id2', started_at: '2024-01-02T00:00:00Z', _deleted: true })
        .mockResolvedValueOnce({ id: 'id3', started_at: '2024-01-03T00:00:00Z', _deleted: false })

      const result = await listGameSessions()

      expect(result).toHaveLength(2)
      expect(result.map(r => r.id)).toEqual(['id3', 'id1'])
    })

    it('should handle null/undefined rows', async () => {
      mockKeys.mockResolvedValue(['id1', 'id2', 'id3'])
      mockGet
        .mockResolvedValueOnce({ id: 'id1', started_at: '2024-01-01T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(undefined)

      const result = await listGameSessions()

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('id1')
    })
  })

  describe('getGameSession', () => {
    it('should return session by id', async () => {
      const mockSession = { id: 'test-id', status: 'active' }
      mockGet.mockResolvedValue(mockSession)

      const result = await getGameSession('test-id')

      expect(result).toEqual(mockSession)
      expect(mockGet).toHaveBeenCalledWith('test-id', st.game.sessions)
    })

    it('should return null when id is not provided', async () => {
      const result = await getGameSession(null)

      expect(result).toBeNull()
      expect(mockGet).not.toHaveBeenCalled()
    })

    it('should return null when session does not exist', async () => {
      mockGet.mockResolvedValue(null)

      const result = await getGameSession('non-existent')

      expect(result).toBeNull()
    })
  })

  describe('getActiveGameSession', () => {
    it('should return the first active session without ended_at', async () => {
      mockKeys.mockResolvedValue(['id1', 'id2', 'id3'])
      mockGet
        .mockResolvedValueOnce({ id: 'id1', status: 'completed', ended_at: '2024-01-01T00:00:00Z', started_at: '2024-01-01T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id2', status: 'active', ended_at: null, started_at: '2024-01-02T00:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'id3', status: 'active', ended_at: '2024-01-03T00:00:00Z', started_at: '2024-01-03T00:00:00Z', _deleted: false })

      const result = await getActiveGameSession()

      expect(result).toBeDefined()
      expect(result.id).toBe('id2')
    })

    it('should return null when no active sessions exist', async () => {
      mockKeys.mockResolvedValue(['id1'])
      mockGet.mockResolvedValueOnce({ id: 'id1', status: 'completed', ended_at: '2024-01-01T00:00:00Z', started_at: '2024-01-01T00:00:00Z', _deleted: false })

      const result = await getActiveGameSession()

      expect(result).toBeNull()
    })
  })

  describe('addGameSession', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should create a new game session with default values', async () => {
      const result = await addGameSession()

      expect(result).toBeDefined()
      expect(result.id).toBe('test-uuid-123')
      expect(result.status).toBe('active')
      expect(result.started_at).toBe('2024-01-15T12:00:00.000Z')
      expect(result.ended_at).toBeNull()
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)
      expect(result._table).toBe('game_sessions')

      expect(mockSet).toHaveBeenCalledWith('test-uuid-123', result, st.game.sessions)
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should create session with provided metadata', async () => {
      const meta = {
        team_name: 'Warriors',
        opponent_name: 'Lakers',
        venue: 'Home Court',
        level: 'College',
        home_away: 'Away',
      }

      const result = await addGameSession(meta)

      expect(result.team_name).toBe('Warriors')
      expect(result.opponent_name).toBe('Lakers')
      expect(result.venue).toBe('Home Court')
      expect(result.level).toBe('College')
      expect(result.home_away).toBe('Away')
    })

    it('should normalize home_away values', async () => {
      const testCases = [
        { input: 'home', expected: 'Home' },
        { input: 'h', expected: 'Home' },
        { input: 'away', expected: 'Away' },
        { input: 'a', expected: 'Away' },
        { input: 'AWAY', expected: 'Away' },
        { input: null, expected: 'Home' },
        { input: undefined, expected: 'Home' },
        { input: 'invalid', expected: 'Home' },
      ]

      for (const { input, expected } of testCases) {
        const result = await addGameSession({ home_away: input })
        expect(result.home_away).toBe(expected)
      }
    })

    it('should accept camelCase metadata properties', async () => {
      const meta = {
        teamName: 'Warriors',
        opponentName: 'Lakers',
        homeAway: 'away',
      }

      const result = await addGameSession(meta)

      expect(result.team_name).toBe('Warriors')
      expect(result.opponent_name).toBe('Lakers')
      expect(result.home_away).toBe('Away')
    })

    it('should set date_iso from started_at by default', async () => {
      const result = await addGameSession()

      expect(result.date_iso).toBe('2024-01-15')
    })

    it('should use provided date_iso', async () => {
      const result = await addGameSession({ date_iso: '2023-12-25' })

      expect(result.date_iso).toBe('2023-12-25')
    })
  })

  describe('endGameSession', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T14:00:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should end an active game session', async () => {
      const mockSession = {
        id: 'session-1',
        status: 'active',
        started_at: '2024-01-15T12:00:00Z',
        ended_at: null,
        home_away: 'home',
        _dirty: false,
      }

      mockGet.mockResolvedValue(mockSession)

      const result = await endGameSession('session-1')

      expect(result.status).toBe('completed')
      expect(result.ended_at).toBe('2024-01-15T14:00:00.000Z')
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)
      expect(result._table).toBe('game_sessions')

      expect(mockSet).toHaveBeenCalledWith('session-1', result, st.game.sessions)
      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should merge patch data when ending session', async () => {
      const mockSession = {
        id: 'session-1',
        status: 'active',
        started_at: '2024-01-15T12:00:00Z',
        ended_at: null,
        home_away: 'home',
      }

      mockGet.mockResolvedValue(mockSession)

      const patch = {
        team_score: 95,
        opponent_score: 88,
      }

      const result = await endGameSession('session-1', patch)

      expect(result.team_score).toBe(95)
      expect(result.opponent_score).toBe(88)
      expect(result.status).toBe('completed')
    })

    it('should return null if session not found', async () => {
      mockGet.mockResolvedValue(null)

      const result = await endGameSession('non-existent')

      expect(result).toBeNull()
      expect(mockSet).not.toHaveBeenCalled()
      expect(notifyLocalMutate).not.toHaveBeenCalled()
    })

    it('should normalize home_away when ending', async () => {
      const mockSession = {
        id: 'session-1',
        status: 'active',
        home_away: 'a',
      }

      mockGet.mockResolvedValue(mockSession)

      const result = await endGameSession('session-1')

      expect(result.home_away).toBe('Away')
    })
  })

  describe('deleteGameSession', () => {
    it('should mark session and its events as deleted', async () => {
      const mockSession = { id: 'session-1', status: 'active' }
      const mockEvents = [
        { id: 'event-1', game_id: 'session-1', type: 'shot' },
        { id: 'event-2', game_id: 'session-1', type: 'freethrow' },
        { id: 'event-3', game_id: 'other-session', type: 'shot' },
      ]

      mockKeys.mockResolvedValue(['event-1', 'event-2', 'event-3'])
      mockGet
        .mockResolvedValueOnce(mockEvents[0])
        .mockResolvedValueOnce(mockEvents[1])
        .mockResolvedValueOnce(mockEvents[2])
        .mockResolvedValueOnce(mockSession)

      const result = await deleteGameSession('session-1')

      expect(result).toBe(true)

      // Verify events belonging to this session are marked deleted
      expect(mockSet).toHaveBeenCalledWith('event-1', expect.objectContaining({
        id: 'event-1',
        _deleted: true,
        _dirty: true,
        _table: 'game_events',
      }), st.game.events)

      expect(mockSet).toHaveBeenCalledWith('event-2', expect.objectContaining({
        id: 'event-2',
        _deleted: true,
        _dirty: true,
        _table: 'game_events',
      }), st.game.events)

      // Event from different session should not be marked deleted
      expect(mockSet).not.toHaveBeenCalledWith('event-3', expect.anything(), st.game.events)

      // Verify session is marked deleted
      expect(mockSet).toHaveBeenCalledWith('session-1', expect.objectContaining({
        id: 'session-1',
        _deleted: true,
        _dirty: true,
        _table: 'game_sessions',
      }), st.game.sessions)

      expect(notifyLocalMutate).toHaveBeenCalledTimes(1)
    })

    it('should return false when id is not provided', async () => {
      const result = await deleteGameSession(null)

      expect(result).toBe(false)
      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('addGameEvent', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date('2024-01-15T12:30:00Z'))
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('should add a shot event with required fields', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        game_id: 'game-1',
        type: 'shot',
        zone_id: 'zone-1',
        shot_type: 'catch_shoot',
        is_three: false,
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.id).toBe('test-uuid-123')
      expect(result.game_id).toBe('game-1')
      expect(result.type).toBe('shot')
      expect(result.zone_id).toBe('zone-1')
      expect(result.shot_type).toBe('catch_shoot')
      expect(result.is_three).toBe(false)
      expect(result.made).toBe(true)
      expect(result.mode).toBe('game')
      expect(result.ts).toBe('2024-01-15T12:30:00.000Z')
      expect(result._dirty).toBe(true)
      expect(result._deleted).toBe(false)
      expect(result._table).toBe('game_events')

      expect(mockSet).toHaveBeenCalled()
      expect(notifyLocalMutate).toHaveBeenCalled()
    })

    it('should throw error when game_id is missing', async () => {
      await expect(addGameEvent({ type: 'shot' })).rejects.toThrow('game_id is required')
    })

    it('should throw error when type is missing', async () => {
      await expect(addGameEvent({ game_id: 'game-1' })).rejects.toThrow('type is required')
    })

    it('should accept camelCase property names', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        gameId: 'game-1',
        type: 'shot',
        zoneId: 'zone-1',
        shotType: 'off_dribble',
        isThree: true,
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.game_id).toBe('game-1')
      expect(result.zone_id).toBe('zone-1')
      expect(result.shot_type).toBe('off_dribble')
      expect(result.is_three).toBe(true)
    })

    it('should handle contested field', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        game_id: 'game-1',
        type: 'shot',
        contested: true,
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.contested).toBe(true)
    })

    it('should accept legacy pressured field as contested', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        game_id: 'game-1',
        type: 'shot',
        pressured: true,
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.contested).toBe(true)
    })

    it('should handle layup metadata fields', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        game_id: 'game-1',
        type: 'shot',
        pickup_type: 'one_dribble',
        finish_type: 'left_hand',
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.pickup_type).toBe('one_dribble')
      expect(result.finish_type).toBe('left_hand')
    })

    it('should accept custom timestamp', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        game_id: 'game-1',
        type: 'shot',
        ts: '2024-01-01T10:00:00Z',
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.ts).toBe('2024-01-01T10:00:00.000Z')
    })

    it('should preserve existing event fields when editing', async () => {
      const existingEvent = {
        id: 'existing-id',
        game_id: 'game-1',
        type: 'shot',
        user_id: 'user-123',
        made: false,
      }

      mockGet.mockResolvedValue(existingEvent)
      mockKeys.mockResolvedValue([])

      const input = {
        id: 'existing-id',
        game_id: 'game-1',
        type: 'shot',
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.id).toBe('existing-id')
      expect(result.user_id).toBe('user-123')
      expect(result.made).toBe(true)
    })

    it('should handle freethrow events', async () => {
      mockGet.mockResolvedValue(null)
      mockKeys.mockResolvedValue([])

      const input = {
        game_id: 'game-1',
        type: 'freethrow',
        made: true,
      }

      const result = await addGameEvent(input)

      expect(result.type).toBe('freethrow')
      expect(result.made).toBe(true)
    })
  })

  describe('deleteGameEvent', () => {
    it('should mark event as deleted', async () => {
      const mockEvent = {
        id: 'event-1',
        game_id: 'game-1',
        type: 'shot',
      }

      mockGet.mockResolvedValue(mockEvent)
      mockKeys.mockResolvedValue([])

      const result = await deleteGameEvent('event-1')

      expect(result).toBe(true)
      expect(mockSet).toHaveBeenCalledWith('event-1', expect.objectContaining({
        id: 'event-1',
        _deleted: true,
        _dirty: true,
        _table: 'game_events',
      }), st.game.events)
      expect(notifyLocalMutate).toHaveBeenCalled()
    })

    it('should return false when id is not provided', async () => {
      const result = await deleteGameEvent(null)

      expect(result).toBe(false)
      expect(mockSet).not.toHaveBeenCalled()
    })

    it('should return false when event does not exist', async () => {
      mockGet.mockResolvedValue(null)

      const result = await deleteGameEvent('non-existent')

      expect(result).toBe(false)
      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('listGameEventsBySession', () => {
    it('should return events for a specific game sorted by timestamp', async () => {
      mockKeys.mockResolvedValue(['e1', 'e2', 'e3', 'e4'])
      mockGet
        .mockResolvedValueOnce({ id: 'e1', game_id: 'game-1', ts: '2024-01-15T12:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'e2', game_id: 'game-1', ts: '2024-01-15T12:05:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'e3', game_id: 'other-game', ts: '2024-01-15T12:03:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'e4', game_id: 'game-1', ts: '2024-01-15T12:02:00Z', _deleted: false })

      const result = await listGameEventsBySession('game-1')

      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('e1')
      expect(result[1].id).toBe('e4')
      expect(result[2].id).toBe('e2')
    })

    it('should exclude deleted events', async () => {
      mockKeys.mockResolvedValue(['e1', 'e2'])
      mockGet
        .mockResolvedValueOnce({ id: 'e1', game_id: 'game-1', ts: '2024-01-15T12:00:00Z', _deleted: false })
        .mockResolvedValueOnce({ id: 'e2', game_id: 'game-1', ts: '2024-01-15T12:05:00Z', _deleted: true })

      const result = await listGameEventsBySession('game-1')

      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('e1')
    })

    it('should return empty array when no events exist for game', async () => {
      mockKeys.mockResolvedValue(['e1'])
      mockGet.mockResolvedValueOnce({ id: 'e1', game_id: 'other-game', ts: '2024-01-15T12:00:00Z', _deleted: false })

      const result = await listGameEventsBySession('game-1')

      expect(result).toEqual([])
    })
  })

  describe('_allDirtyGame', () => {
    it('should return all dirty sessions and events', async () => {
      mockKeys
        .mockResolvedValueOnce(['s1', 's2'])
        .mockResolvedValueOnce(['e1', 'e2'])

      mockGet
        .mockResolvedValueOnce({ id: 's1', _dirty: true })
        .mockResolvedValueOnce({ id: 's2', _dirty: false })
        .mockResolvedValueOnce({ id: 'e1', _dirty: true })
        .mockResolvedValueOnce({ id: 'e2', _dirty: false })

      const result = await _allDirtyGame()

      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('s1')
      expect(result[1].id).toBe('e1')
    })

    it('should return empty array when no dirty rows exist', async () => {
      mockKeys
        .mockResolvedValueOnce(['s1'])
        .mockResolvedValueOnce(['e1'])

      mockGet
        .mockResolvedValueOnce({ id: 's1', _dirty: false })
        .mockResolvedValueOnce({ id: 'e1', _dirty: false })

      const result = await _allDirtyGame()

      expect(result).toEqual([])
    })
  })

  describe('_markClean', () => {
    it('should mark game session as clean', async () => {
      const dirtySession = { id: 'session-1', _table: 'game_sessions', _dirty: true, status: 'active' }
      mockGet.mockResolvedValue(dirtySession)

      await _markClean(dirtySession)

      expect(mockSet).toHaveBeenCalledWith('session-1', expect.objectContaining({
        id: 'session-1',
        _dirty: false,
      }), st.game.sessions)
    })

    it('should mark game event as clean', async () => {
      const dirtyEvent = { id: 'event-1', _table: 'game_events', _dirty: true, type: 'shot' }
      mockGet.mockResolvedValue(dirtyEvent)

      await _markClean(dirtyEvent)

      expect(mockSet).toHaveBeenCalledWith('event-1', expect.objectContaining({
        id: 'event-1',
        _dirty: false,
      }), st.game.events)
    })

    it('should handle missing _table property', async () => {
      await _markClean({ id: 'test' })

      expect(mockSet).not.toHaveBeenCalled()
    })

    it('should handle row not found in store', async () => {
      mockGet.mockResolvedValue(null)

      await _markClean({ id: 'test', _table: 'game_sessions' })

      expect(mockSet).not.toHaveBeenCalled()
    })
  })

  describe('_purgeGameRow', () => {
    it('should delete game session row', async () => {
      const row = { id: 'session-1', _table: 'game_sessions' }

      await _purgeGameRow(row)

      expect(mockDel).toHaveBeenCalledWith('session-1', st.game.sessions)
    })

    it('should delete game event row', async () => {
      const row = { id: 'event-1', _table: 'game_events' }

      await _purgeGameRow(row)

      expect(mockDel).toHaveBeenCalledWith('event-1', st.game.events)
    })

    it('should handle missing _table property', async () => {
      await _purgeGameRow({ id: 'test' })

      expect(mockDel).not.toHaveBeenCalled()
    })
  })
})
