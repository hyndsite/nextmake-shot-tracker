// src/lib/sync-notify.js
const listeners = new Set()

export function onLocalMutate(fn){
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function notifyLocalMutate(){
  for (const fn of listeners) try { fn() } catch {}
}
