// src/pages/RestaurantOrders.tsx
import React, { useEffect, useState } from 'react'
import { collection, onSnapshot, orderBy, query, where, updateDoc, doc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'

type Order = any

export const RestaurantOrders: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    // ✅ جلب الطلبات الخاصة بالمطعم حسب restaurantId
    const q = query(
      collection(db, 'orders'),
      where('restaurantId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setOrders(snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false)
    })
    return () => unsub()
  }, [user])

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'orders', id), { status, updatedAt: serverTimestamp() })
  }

  if (loading) return <div>⏳ جاري تحميل الطلبات...</div>

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold mb-4">📦 طلبات المطعم</h1>

      {orders.length === 0 && <div className="text-gray-600">لا توجد طلبات حالياً.</div>}

      {orders.map((o) => (
        <div key={o.id} className="bg-white text-black rounded-2xl shadow p-4">
          <div className="flex items-center justify-between">
            <div className="font-bold">#{o.id.slice(-6)}</div>
            <div className="font-bold">{o.total?.toFixed?.(2)} ر.س</div>
          </div>

          <div className="mt-1 text-sm text-gray-700">
            {o.items.map((i: any) => `${i.name}×${i.qty}`).join(' • ')}
          </div>
          <div className="mt-2 text-sm">العنوان: {o.address}</div>
          <div className="mt-2 text-sm text-gray-500">العميل: {o.customerId}</div>

          <div className="mt-3 flex flex-wrap gap-2">
            {['accepted','preparing','ready','out_for_delivery','delivered','cancelled'].map(s => (
              <button 
                key={s} 
                onClick={() => updateStatus(o.id, s)} 
                className="px-3 py-1 rounded-lg bg-gray-200 hover:bg-gray-300 text-sm"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
