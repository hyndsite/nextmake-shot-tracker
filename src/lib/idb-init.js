import { openDB } from "idb";

// Run once, then reuse the same resolved promise everywhere
let _ready;
export function whenIdbReady() {
  if (_ready) return _ready;
  _ready = (async () => {
    // Game DB
    await openDB("game", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions");
        if (!db.objectStoreNames.contains("events"))   db.createObjectStore("events");
      },
    });
    // Practice DB
    await openDB("practice", 2, {
      upgrade(db) {
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions");
        if (!db.objectStoreNames.contains("entries"))  db.createObjectStore("entries");
        if (!db.objectStoreNames.contains("markers"))  db.createObjectStore("markers");
      },
    });
  })();
  return _ready;
}
