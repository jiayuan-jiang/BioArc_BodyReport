import { dbGetAll, dbPut, dbDelete } from './db'
import { submitToKobo } from '../utils/koboApi'
import { resolveEnvironment } from '../utils/environmentApi'

export async function enqueueSubmission(form) {
  const id = crypto.randomUUID()
  const entry = {
    id,
    form,
    status: 'pending',
    createdAt: new Date().toISOString(),
    attempts: 0,
    lastError: null,
  }
  await dbPut(entry)
  return id
}

export async function listQueue() {
  const all = await dbGetAll()
  return all.sort((a, b) => a.createdAt.localeCompare(b.createdAt))
}

export async function removeFromQueue(id) {
  return dbDelete(id)
}

// fetch() rejects with a TypeError on a genuine connectivity failure (offline,
// DNS, CORS-as-opaque-network-error) — a Kobo 4xx/5xx response instead throws
// a plain Error from koboApi.js. That distinction is what lets processQueue
// stop retrying the whole batch on a dead network but keep failing loudly on
// a real submission error.
function isNetworkError(e) {
  return e instanceof TypeError
}

// Walks the local queue oldest-first, backfilling any environmental data that
// couldn't be fetched at collection time (using the original collectionDate,
// not now), then submitting. Stops the batch as soon as a network error is
// hit, since further entries would just fail the same way.
export async function processQueue(onProgress) {
  const entries = await listQueue()
  let synced = 0

  for (const entry of entries) {
    if (!navigator.onLine) break

    // Reassigned as each step below succeeds, so a resolved env backfill is
    // never thrown away just because the submit after it fails — the retry
    // persists (and reuses) whatever progress was actually made.
    let form = entry.form
    try {
      if (form.envFetchPending) {
        form = await resolveEnvironment(form)
      }
      await submitToKobo(form, entry.id)
      await removeFromQueue(entry.id)
      synced++
      onProgress?.()
    } catch (e) {
      await dbPut({
        ...entry,
        form,
        status: 'error',
        attempts: entry.attempts + 1,
        lastError: e.message || String(e),
      })
      onProgress?.()
      if (isNetworkError(e)) break
    }
  }

  const remaining = await listQueue()
  return { synced, remaining: remaining.length }
}
