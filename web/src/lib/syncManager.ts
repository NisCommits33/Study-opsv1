/**
 * @file lib/syncManager.ts
 * @description Offline IndexedDB → Supabase sync for PWA support.
 */

const DB_NAME = 'studyops-offline'
const DB_VERSION = 1
const STORES = ['capture_inbox', 'study_sessions']

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      STORES.forEach(store => {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: 'id' })
        }
      })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

/**
 * Queues a write to IndexedDB for later sync.
 */
export async function queueOfflineWrite(store: string, data: any) {
  try {
    const db = await openDB()
    const tx = db.transaction(store, 'readwrite')
    tx.objectStore(store).put({ ...data, id: crypto.randomUUID(), _synced: false })
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve
      tx.onerror = reject
    })
  } catch (e) {
    console.warn('[syncManager] Failed to queue offline write:', e)
  }
}

/**
 * Flushes all pending offline writes to Supabase.
 */
export async function flushOfflineQueue(supabase: any) {
  try {
    const db = await openDB()
    for (const store of STORES) {
      const tx = db.transaction(store, 'readwrite')
      const objectStore = tx.objectStore(store)
      const request = objectStore.getAll()

      await new Promise<void>((resolve, reject) => {
        request.onsuccess = async () => {
          const items = request.result.filter((i: any) => !i._synced)
          for (const item of items) {
            const { _synced, ...row } = item
            await supabase.from(store).insert(row)
            objectStore.delete(item.id)
          }
          resolve()
        }
        request.onerror = reject
      })
    }
  } catch (e) {
    console.warn('[syncManager] Flush failed:', e)
  }
}

/**
 * Checks if the browser is online.
 */
export function isOnline(): boolean {
  return typeof navigator !== 'undefined' ? navigator.onLine : true
}
