import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react'
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore'

import { db } from '@/firebase'

export const DEFAULT_COMMISSION_RATE = 0.15

export type PlatformSettingsContextValue = {
  commissionRate: number
  loading: boolean
  updateCommissionRate: (nextRate: number) => Promise<void>
}

const PlatformSettingsContext = createContext<PlatformSettingsContextValue>({
  commissionRate: DEFAULT_COMMISSION_RATE,
  loading: true,
  updateCommissionRate: async () => {},
})

const SETTINGS_DOC = doc(db, 'settings', 'app')

const normalizeRate = (value: unknown): number => {
  const parsed = Number(value)
  if (Number.isFinite(parsed) && parsed >= 0 && parsed <= 1) {
    return Number(parsed.toFixed(4))
  }
  return DEFAULT_COMMISSION_RATE
}

export const PlatformSettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [commissionRate, setCommissionRate] = useState(DEFAULT_COMMISSION_RATE)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onSnapshot(
      SETTINGS_DOC,
      (snapshot) => {
        if (!snapshot.exists()) {
          setCommissionRate(DEFAULT_COMMISSION_RATE)
          setLoading(false)
          return
        }

        const data = snapshot.data() as Record<string, unknown>
        const nextRate = normalizeRate(data.commissionRate ?? data.platformCommission)
        setCommissionRate(nextRate)
        setLoading(false)
      },
      (error) => {
        console.error('فشل في تحميل إعدادات المنصة:', error)
        setCommissionRate(DEFAULT_COMMISSION_RATE)
        setLoading(false)
      },
    )

    return () => unsubscribe()
  }, [])

  const updateCommissionRate = useCallback(async (nextRate: number) => {
    const normalized = normalizeRate(nextRate)
    await setDoc(
      SETTINGS_DOC,
      {
        commissionRate: normalized,
        platformCommission: normalized,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    )
    setCommissionRate(normalized)
  }, [])

  const value = useMemo(
    () => ({
      commissionRate,
      loading,
      updateCommissionRate,
    }),
    [commissionRate, loading, updateCommissionRate],
  )

  return <PlatformSettingsContext.Provider value={value}>{children}</PlatformSettingsContext.Provider>
}

export const usePlatformSettings = () => useContext(PlatformSettingsContext)
