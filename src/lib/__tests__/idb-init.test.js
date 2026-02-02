// src/lib/__tests__/idb-init.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the idb library
const mockOpenDB = vi.fn()
vi.mock('idb', () => ({
  openDB: mockOpenDB,
}))

describe('idb-init', () => {
  beforeEach(() => {
    mockOpenDB.mockClear()
    mockOpenDB.mockResolvedValue({})
    vi.resetModules()
  })

  describe('whenIdbReady', () => {
    it('should return a promise', async () => {
      const { whenIdbReady } = await import('../idb-init.js')
      const result = whenIdbReady()
      expect(result).toBeInstanceOf(Promise)
    })

    it('should call openDB twice to create game and practice databases', async () => {
      const { whenIdbReady } = await import('../idb-init.js')
      await whenIdbReady()

      expect(mockOpenDB).toHaveBeenCalledTimes(2)

      // First call: game DB
      expect(mockOpenDB).toHaveBeenNthCalledWith(1, 'game', 2, expect.any(Object))

      // Second call: practice DB
      expect(mockOpenDB).toHaveBeenNthCalledWith(2, 'practice', 2, expect.any(Object))
    })

    it('should create game database with sessions and events stores', async () => {
      const mockDb = {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
        createObjectStore: vi.fn(),
      }

      mockOpenDB.mockImplementation((name, version, { upgrade }) => {
        if (name === 'game') {
          upgrade(mockDb)
        }
        return Promise.resolve({})
      })

      const { whenIdbReady } = await import('../idb-init.js')
      await whenIdbReady()

      expect(mockDb.createObjectStore).toHaveBeenCalledWith('sessions')
      expect(mockDb.createObjectStore).toHaveBeenCalledWith('events')
    })

    it('should create practice database with sessions, entries, and markers stores', async () => {
      const mockGameDb = {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
        createObjectStore: vi.fn(),
      }

      const mockPracticeDb = {
        objectStoreNames: {
          contains: vi.fn().mockReturnValue(false),
        },
        createObjectStore: vi.fn(),
      }

      mockOpenDB.mockImplementation((name, version, { upgrade }) => {
        if (name === 'game') {
          upgrade(mockGameDb)
        } else if (name === 'practice') {
          upgrade(mockPracticeDb)
        }
        return Promise.resolve({})
      })

      const { whenIdbReady } = await import('../idb-init.js')
      await whenIdbReady()

      expect(mockPracticeDb.createObjectStore).toHaveBeenCalledWith('sessions')
      expect(mockPracticeDb.createObjectStore).toHaveBeenCalledWith('entries')
      expect(mockPracticeDb.createObjectStore).toHaveBeenCalledWith('markers')
    })

    it('should not create stores that already exist', async () => {
      const mockDb = {
        objectStoreNames: {
          contains: vi.fn((storeName) => storeName === 'sessions'),
        },
        createObjectStore: vi.fn(),
      }

      mockOpenDB.mockImplementation((name, version, { upgrade }) => {
        upgrade(mockDb)
        return Promise.resolve({})
      })

      const { whenIdbReady } = await import('../idb-init.js')
      await whenIdbReady()

      // Sessions store already exists, so it should not be created again
      expect(mockDb.createObjectStore).not.toHaveBeenCalledWith('sessions')
      // Events store does not exist, so it should be created
      expect(mockDb.createObjectStore).toHaveBeenCalled()
    })

    it('should implement singleton behavior and return same promise on multiple calls', async () => {
      const { whenIdbReady } = await import('../idb-init.js')
      const promise1 = whenIdbReady()
      const promise2 = whenIdbReady()
      const promise3 = whenIdbReady()

      expect(promise1).toBe(promise2)
      expect(promise2).toBe(promise3)

      await Promise.all([promise1, promise2, promise3])

      // openDB should only be called once per database (2 total)
      expect(mockOpenDB).toHaveBeenCalledTimes(2)
    })

    it('should resolve successfully when databases are created', async () => {
      const { whenIdbReady } = await import('../idb-init.js')
      await expect(whenIdbReady()).resolves.toBeUndefined()
    })

    it('should handle errors during database creation', async () => {
      mockOpenDB.mockRejectedValueOnce(new Error('IndexedDB not available'))

      const { whenIdbReady } = await import('../idb-init.js')
      await expect(whenIdbReady()).rejects.toThrow('IndexedDB not available')
    })
  })
})
