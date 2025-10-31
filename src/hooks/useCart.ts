import { useEffect, useMemo, useState } from 'react'

import { DEFAULT_COMMISSION_RATE, usePlatformSettings } from '@/context/PlatformSettingsContext'

export type CartItem = {
  id: string
  name: string
  price: number
  basePrice?: number
  qty: number
  ownerId?: string
}

const STORAGE_KEY = 'broast_cart'

const roundCurrency = (value: number) => Number(value.toFixed(2))

const ensureBasePrice = (item: CartItem, fallbackMultiplier: number) => {
  if (typeof item.basePrice === 'number' && Number.isFinite(item.basePrice)) {
    return roundCurrency(item.basePrice)
  }
  if (!Number.isFinite(item.price) || item.price <= 0 || fallbackMultiplier <= 0) {
    return 0
  }
  return roundCurrency(item.price / fallbackMultiplier)
}

export function useCart() {
  const { commissionRate } = usePlatformSettings()
  const multiplier = useMemo(() => 1 + (commissionRate || 0), [commissionRate])

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      const parsed = JSON.parse(raw) as CartItem[]
      if (!Array.isArray(parsed)) return []
      return parsed.map((item) => ({
        ...item,
        basePrice: ensureBasePrice({ ...item }, 1 + DEFAULT_COMMISSION_RATE),
      }))
    } catch (error) {
      console.warn('تعذّر قراءة السلة من التخزين المحلي:', error)
      return []
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch (error) {
      console.warn('تعذّر حفظ السلة في التخزين المحلي:', error)
    }
  }, [items])

  const add = (item: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems((prev) => {
      const index = prev.findIndex((existing) => existing.id === item.id)
      if (index >= 0) {
        const copy = [...prev]
        const basePrice = ensureBasePrice(item as CartItem, multiplier)
        copy[index] = {
          ...copy[index],
          qty: copy[index].qty + qty,
          ownerId: item.ownerId ?? copy[index].ownerId,
          basePrice: Number.isFinite(basePrice) && basePrice > 0 ? basePrice : copy[index].basePrice,
        }
        return copy
      }

      const basePrice = ensureBasePrice(item as CartItem, multiplier)
      return [
        ...prev,
        {
          ...item,
          qty,
          basePrice: basePrice > 0 ? basePrice : undefined,
        },
      ]
    })
  }

  const remove = (id: string) => setItems((prev) => prev.filter((item) => item.id !== id))

  const changeQty = (id: string, qty: number) =>
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, qty } : item)))

  const clear = () => setItems([])

  const getBasePrice = (item: CartItem) => ensureBasePrice(item, multiplier)
  const getMarkupPerUnit = (item: CartItem) => {
    const base = getBasePrice(item)
    return roundCurrency(item.price - base)
  }

  const subtotal = items.reduce((sum, item) => sum + getBasePrice(item) * item.qty, 0)
  const totalWithFees = items.reduce((sum, item) => sum + item.price * item.qty, 0)
  const applicationFeeTotal = totalWithFees - subtotal

  const getItemTotalWithFees = (item: CartItem) => roundCurrency(item.price * item.qty)
  const getUnitPriceWithFees = (item: CartItem) => roundCurrency(item.price)

  return {
    items,
    add,
    remove,
    changeQty,
    clear,
    subtotal: roundCurrency(subtotal),
    totalWithFees: roundCurrency(totalWithFees),
    applicationFeeTotal: roundCurrency(applicationFeeTotal),
    commissionRate,
    getItemTotalWithFees,
    getUnitPriceWithFees,
    getBasePrice,
    getMarkupPerUnit,
  }
}
