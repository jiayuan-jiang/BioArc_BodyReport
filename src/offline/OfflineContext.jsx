import { createContext, useContext, useCallback, useEffect, useRef, useState } from 'react'
import { listQueue, processQueue } from './queue'

const OfflineContext = createContext(null)

export function OfflineProvider({ children }) {
  const [online, setOnline] = useState(navigator.onLine)
  const [queue, setQueue] = useState([])
  const [syncing, setSyncing] = useState(false)
  const syncingRef = useRef(false)

  const refreshQueue = useCallback(async () => {
    setQueue(await listQueue())
  }, [])

  const syncNow = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return
    syncingRef.current = true
    setSyncing(true)
    try {
      await processQueue(refreshQueue)
    } finally {
      await refreshQueue()
      syncingRef.current = false
      setSyncing(false)
    }
  }, [refreshQueue])

  useEffect(() => {
    refreshQueue()
    if (navigator.onLine) syncNow()

    const goOnline = () => { setOnline(true); syncNow() }
    const goOffline = () => setOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)

    // Some devices/browsers don't fire 'online' reliably (e.g. after sleep) —
    // this is a low-frequency safety net, not the primary trigger.
    const interval = setInterval(() => { if (navigator.onLine) syncNow() }, 5 * 60 * 1000)

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      clearInterval(interval)
    }
  }, [refreshQueue, syncNow])

  return (
    <OfflineContext.Provider value={{ online, queue, syncing, syncNow, refreshQueue }}>
      {children}
    </OfflineContext.Provider>
  )
}

export function useOffline() {
  return useContext(OfflineContext)
}
