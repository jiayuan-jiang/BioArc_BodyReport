const DB_NAME = 'bioarc-offline'
const DB_VERSION = 1
const STORE = 'submissions'

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION)
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

// Runs fn against the store inside a transaction and resolves with fn's
// IDBRequest result once the transaction completes (request.result is
// already populated by then, since requests settle before their transaction).
async function withStore(mode, fn) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const store = tx.objectStore(STORE)
    const req = fn(store)
    tx.oncomplete = () => resolve(req?.result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
  })
}

export function dbGetAll() {
  return withStore('readonly', (store) => store.getAll())
}

export function dbPut(entry) {
  return withStore('readwrite', (store) => store.put(entry))
}

export function dbDelete(id) {
  return withStore('readwrite', (store) => store.delete(id))
}
