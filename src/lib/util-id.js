
export function uuid() {
  // web standard in browsers & Node 19+/Vite dev
  if (globalThis?.crypto?.randomUUID) return globalThis.crypto.randomUUID()
  // tiny fallback (not cryptographically strong)
  return ([1e7]+-1e3+-4e3+-8e3+-1e11)
    .replace(/[018]/g, c => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4).toString(16))
}
