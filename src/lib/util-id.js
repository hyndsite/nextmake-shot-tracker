// src/lib/util-id.js
// small helper so we don't add an extra library for ids
export function nanoid(){
    // 16-char URL-safe
    return (crypto?.getRandomValues ? [...crypto.getRandomValues(new Uint8Array(12))]
      : Array.from({length:12},()=>Math.floor(Math.random()*256)))
      .map(b => "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_".charAt(b%64))
      .join("")
  }
  