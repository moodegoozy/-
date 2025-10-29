import { useEffect, useState } from 'react'

export type CartItem = {
  id: string
  name: string
  price: number
  qty: number
  ownerId?: string   // ✅ أضفنا خاصية المطعم
}

const KEY = 'broast_cart'
const APPLICATION_FEE_PER_ITEM = 1.15

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(KEY)
      return raw ? JSON.parse(raw) : []
    } catch { 
      return [] 
    }
  })

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(items))
  }, [items])

  const add = (it: Omit<CartItem, 'qty'>, qty = 1) => {
    setItems(prev => {
      const idx = prev.findIndex(p => p.id === it.id)
      if (idx >= 0) {
        const copy = [...prev]
        copy[idx] = { 
          ...copy[idx], 
          qty: copy[idx].qty + qty,
          ownerId: it.ownerId ?? copy[idx].ownerId  // ✅ نحافظ على ownerId
        }
        return copy
      }
      return [...prev, { ...it, qty }]
    })
  }

  const remove = (id: string) => 
    setItems(prev => prev.filter(p => p.id !== id))

  const changeQty = (id: string, qty: number) => 
    setItems(prev => prev.map(p => p.id === id ? { ...p, qty } : p))

  const clear = () => setItems([])

  const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0)
  const applicationFeeTotal = items.reduce((sum, it) => sum + APPLICATION_FEE_PER_ITEM * it.qty, 0)
  const totalWithFees = subtotal + applicationFeeTotal
  const getItemTotalWithFees = (item: CartItem) => (item.price + APPLICATION_FEE_PER_ITEM) * item.qty
  const getUnitPriceWithFees = (basePrice: number) => basePrice + APPLICATION_FEE_PER_ITEM

  return {
    items,
    add,
    remove,
    changeQty,
    clear,
    subtotal,
    totalWithFees,
    applicationFeePerItem: APPLICATION_FEE_PER_ITEM,
    applicationFeeTotal,
    getItemTotalWithFees,
    getUnitPriceWithFees,
  }
}
