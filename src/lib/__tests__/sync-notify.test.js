// src/lib/__tests__/sync-notify.test.js
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { onLocalMutate, notifyLocalMutate } from '../sync-notify.js'

describe('sync-notify', () => {
  beforeEach(() => {
    // Clear all listeners between tests by calling notifyLocalMutate
    // which doesn't clear listeners, so we need to manually track and unsubscribe
    vi.clearAllMocks()
  })

  describe('onLocalMutate', () => {
    it('should accept a callback function', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      expect(typeof unsubscribe).toBe('function')
    })

    it('should return an unsubscribe function', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      expect(typeof unsubscribe).toBe('function')

      // Cleanup
      unsubscribe()
    })

    it('should allow multiple listeners to be registered', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      const unsubscribe1 = onLocalMutate(callback1)
      const unsubscribe2 = onLocalMutate(callback2)
      const unsubscribe3 = onLocalMutate(callback3)

      notifyLocalMutate()

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
      expect(callback3).toHaveBeenCalledTimes(1)

      // Cleanup
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    })
  })

  describe('notifyLocalMutate', () => {
    it('should call registered callback when notified', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      notifyLocalMutate()

      expect(callback).toHaveBeenCalledTimes(1)

      // Cleanup
      unsubscribe()
    })

    it('should call callback with no arguments', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      notifyLocalMutate()

      expect(callback).toHaveBeenCalledWith()

      // Cleanup
      unsubscribe()
    })

    it('should call all registered callbacks', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      const unsubscribe1 = onLocalMutate(callback1)
      const unsubscribe2 = onLocalMutate(callback2)
      const unsubscribe3 = onLocalMutate(callback3)

      notifyLocalMutate()

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)
      expect(callback3).toHaveBeenCalledTimes(1)

      // Cleanup
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    })

    it('should call callbacks on each notify', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      notifyLocalMutate()
      notifyLocalMutate()
      notifyLocalMutate()

      expect(callback).toHaveBeenCalledTimes(3)

      // Cleanup
      unsubscribe()
    })

    it('should not call callback after unsubscribe', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      notifyLocalMutate()
      expect(callback).toHaveBeenCalledTimes(1)

      unsubscribe()

      notifyLocalMutate()
      expect(callback).toHaveBeenCalledTimes(1) // Still 1, not called again
    })

    it('should handle multiple unsubscribes independently', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      const callback3 = vi.fn()

      const unsubscribe1 = onLocalMutate(callback1)
      const unsubscribe2 = onLocalMutate(callback2)
      const unsubscribe3 = onLocalMutate(callback3)

      // Unsubscribe callback2
      unsubscribe2()

      notifyLocalMutate()

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(0) // Not called after unsubscribe
      expect(callback3).toHaveBeenCalledTimes(1)

      // Cleanup
      unsubscribe1()
      unsubscribe3()
    })

    it('should safely unsubscribe the same callback multiple times', () => {
      const callback = vi.fn()
      const unsubscribe = onLocalMutate(callback)

      unsubscribe()
      unsubscribe() // Second call should be safe

      notifyLocalMutate()

      expect(callback).toHaveBeenCalledTimes(0)
    })

    it('should catch and silently ignore errors in callbacks', () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Callback error')
      })
      const successCallback = vi.fn()

      const unsubscribe1 = onLocalMutate(errorCallback)
      const unsubscribe2 = onLocalMutate(successCallback)

      // Should not throw
      expect(() => notifyLocalMutate()).not.toThrow()

      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(successCallback).toHaveBeenCalledTimes(1) // Should still be called

      // Cleanup
      unsubscribe1()
      unsubscribe2()
    })

    it('should continue calling remaining callbacks after one throws', () => {
      const callback1 = vi.fn()
      const errorCallback = vi.fn(() => {
        throw new Error('Error in middle callback')
      })
      const callback2 = vi.fn()

      const unsubscribe1 = onLocalMutate(callback1)
      const unsubscribeError = onLocalMutate(errorCallback)
      const unsubscribe2 = onLocalMutate(callback2)

      notifyLocalMutate()

      expect(callback1).toHaveBeenCalledTimes(1)
      expect(errorCallback).toHaveBeenCalledTimes(1)
      expect(callback2).toHaveBeenCalledTimes(1)

      // Cleanup
      unsubscribe1()
      unsubscribeError()
      unsubscribe2()
    })

    it('should handle multiple errors in different callbacks', () => {
      const error1 = vi.fn(() => {
        throw new Error('Error 1')
      })
      const error2 = vi.fn(() => {
        throw new Error('Error 2')
      })
      const success = vi.fn()

      const unsubscribe1 = onLocalMutate(error1)
      const unsubscribe2 = onLocalMutate(error2)
      const unsubscribe3 = onLocalMutate(success)

      expect(() => notifyLocalMutate()).not.toThrow()

      expect(error1).toHaveBeenCalledTimes(1)
      expect(error2).toHaveBeenCalledTimes(1)
      expect(success).toHaveBeenCalledTimes(1)

      // Cleanup
      unsubscribe1()
      unsubscribe2()
      unsubscribe3()
    })
  })

  describe('Integration tests', () => {
    it('should support subscribe-notify-unsubscribe workflow', () => {
      const callback = vi.fn()

      // Subscribe
      const unsubscribe = onLocalMutate(callback)

      // Notify
      notifyLocalMutate()
      expect(callback).toHaveBeenCalledTimes(1)

      // Notify again
      notifyLocalMutate()
      expect(callback).toHaveBeenCalledTimes(2)

      // Unsubscribe
      unsubscribe()

      // Notify after unsubscribe
      notifyLocalMutate()
      expect(callback).toHaveBeenCalledTimes(2) // No additional calls
    })

    it('should handle rapid subscribe/unsubscribe cycles', () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()

      const unsub1 = onLocalMutate(callback1)
      notifyLocalMutate()

      const unsub2 = onLocalMutate(callback2)
      notifyLocalMutate()

      unsub1()
      notifyLocalMutate()

      unsub2()
      notifyLocalMutate()

      expect(callback1).toHaveBeenCalledTimes(2) // Called in first 2 notifications
      expect(callback2).toHaveBeenCalledTimes(2) // Called in middle 2 notifications
    })

    it('should support adding the same callback multiple times', () => {
      const callback = vi.fn()

      const unsubscribe1 = onLocalMutate(callback)
      const unsubscribe2 = onLocalMutate(callback)

      notifyLocalMutate()

      // Since Set is used, same callback added twice only exists once
      // Callback should be called once (Set deduplicates)
      expect(callback).toHaveBeenCalledTimes(1)

      // Unsubscribe one - this removes the callback from the Set
      unsubscribe1()

      notifyLocalMutate()

      // Should not be called (callback was removed from Set)
      expect(callback).toHaveBeenCalledTimes(1)

      // Cleanup - calling unsubscribe2 is safe but does nothing
      unsubscribe2()
    })

    it('should work with no listeners registered', () => {
      expect(() => notifyLocalMutate()).not.toThrow()
    })

    it('should handle async callbacks correctly', async () => {
      const asyncCallback = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
      })

      const unsubscribe = onLocalMutate(asyncCallback)

      notifyLocalMutate()

      expect(asyncCallback).toHaveBeenCalledTimes(1)

      // Wait for async callback to complete
      await new Promise(resolve => setTimeout(resolve, 20))

      // Cleanup
      unsubscribe()
    })

    it('should handle async callback errors silently', async () => {
      const asyncErrorCallback = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10))
        throw new Error('Async error')
      })
      const successCallback = vi.fn()

      const unsubscribe1 = onLocalMutate(asyncErrorCallback)
      const unsubscribe2 = onLocalMutate(successCallback)

      expect(() => notifyLocalMutate()).not.toThrow()

      expect(asyncErrorCallback).toHaveBeenCalledTimes(1)
      expect(successCallback).toHaveBeenCalledTimes(1)

      // Wait for async to settle
      await new Promise(resolve => setTimeout(resolve, 20))

      // Cleanup
      unsubscribe1()
      unsubscribe2()
    })
  })
})
