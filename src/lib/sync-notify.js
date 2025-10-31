// src/lib/sync-notify.js
// Minimal pub/sub used by the data layer to trigger auto-sync.
// practice-db.js / game-db.js call notifyLocalMutate() after any write.
// sync.js listens with onLocalMutate(() => scheduleSync())

const listeners = new Set()

/**
 * onLocalMutate(callback): () => void
 * Subscribe to local mutation events. Returns an unsubscribe function.
 */
export function onLocalMutate(callback) {
  listeners.add(callback)
  return () => listeners.delete(callback)
}

/**
 * notifyLocalMutate()
 * Call this after any local IndexedDB write to request a sync.
 */
export function notifyLocalMutate() {
  for (const fn of listeners) {
    try { fn() } catch { /* noop */ }
  }
}
