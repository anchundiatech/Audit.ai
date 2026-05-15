import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { dataService, clearDataCache } from '@/services/dataService'
import type { Claim, Workshop } from '@/types'

interface DataContextValue {
  claims: Claim[]
  workshops: Workshop[]
  loading: boolean
  refreshing: boolean
  refresh: () => Promise<void>
  lastUpdated: Date | null
}

const DataContext = createContext<DataContextValue>({
  claims: [],
  workshops: [],
  loading: true,
  refreshing: false,
  refresh: async () => {},
  lastUpdated: null,
})

export function DataProvider({ children }: { children: ReactNode }) {
  const [claims, setClaims] = useState<Claim[]>([])
  const [workshops, setWorkshops] = useState<Workshop[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const [c, w] = await Promise.all([
        dataService.getClaims(),
        dataService.getWorkshops(),
      ])
      setClaims(c)
      setWorkshops(w)
      setLastUpdated(new Date())
    } finally {
      setLoading(false)
      if (isRefresh) setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  return (
    <DataContext.Provider value={{ claims, workshops, loading, refreshing, refresh: () => load(true), lastUpdated }}>
      {children}
    </DataContext.Provider>
  )
}

export function useData() {
  return useContext(DataContext)
}

export { clearDataCache }
