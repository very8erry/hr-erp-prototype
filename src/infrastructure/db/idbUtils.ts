export function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
  })
}

/**
 * IMPORTANT: create this promise immediately after creating the transaction,
 * before awaiting any request. IndexedDB transactions can complete between
 * microtasks, so attaching oncomplete after a request resolves can miss the
 * completion event and leave initialization waiting forever.
 */
export function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onerror = () => reject(tx.error ?? new Error('IndexedDB transaction failed'))
    tx.onabort = () => reject(tx.error ?? new Error('IndexedDB transaction aborted'))
  })
}

export async function getAllFromStore<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  const tx = db.transaction(storeName, 'readonly')
  const done = transactionDone(tx)
  const request = tx.objectStore(storeName).getAll()
  const result = await requestToPromise(request)
  await done
  return result as T[]
}

export async function getOneFromStore<T>(db: IDBDatabase, storeName: string, id: IDBValidKey): Promise<T | undefined> {
  const tx = db.transaction(storeName, 'readonly')
  const done = transactionDone(tx)
  const request = tx.objectStore(storeName).get(id)
  const result = await requestToPromise(request)
  await done
  return result as T | undefined
}
