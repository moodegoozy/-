// src/pages/OrdersAdmin.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { collection, doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'

type Order = any

// ✅ ترجمة الحالات
const badge = (s: string) => {
  const map: Record<string, string> = {
    pending: '⏳ قيد المراجعة',
    accepted: '✅ تم القبول',
    preparing: '👨‍🍳 قيد التحضير',
    ready: '📦 جاهز',
    out_for_delivery: '🚚 في الطريق',
    delivered: '🎉 تم التسليم',
    cancelled: '❌ ملغي',
  }
  return map[s] || s
}

// ✅ ألوان الحالات
const statusColor = (s: string) => {
  switch (s) {
    case 'pending': return 'bg-gray-200 text-gray-800'
    case 'accepted': return 'bg-blue-200 text-blue-800'
    case 'preparing': return 'bg-yellow-200 text-yellow-800'
    case 'ready': return 'bg-purple-200 text-purple-800'
    case 'out_for_delivery': return 'bg-indigo-200 text-indigo-800'
    case 'delivered': return 'bg-green-200 text-green-800'
    case 'cancelled': return 'bg-red-200 text-red-800'
    default: return 'bg-gray-100 text-gray-700'
  }
}

export const OrdersAdmin: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [error, setError] = useState<string | null>(null)

  const restaurantUid = useMemo(() => user?.uid ?? null, [user])

  useEffect(() => {
    if (!restaurantUid) return
    setError(null)

    const unsub = onSnapshot(
      collection(db, 'orders'),
      (snap) => {
        const all = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
        const mine = all.filter((o: any) => {
          const r1 = o.restaurantId === restaurantUid
          const r2 = o?.items?.[0]?.ownerId === restaurantUid
          return r1 || r2
        })

        mine.sort((a: any, b: any) => {
          const ta = a.createdAt?.toMillis?.() ?? 0
          const tb = b.createdAt?.toMillis?.() ?? 0
          return tb - ta
        })

        setOrders(mine)
        setError(null)
      },
      (err) => {
        console.error('Firestore error:', err)
        setError('حدثت مشكلة في جلب الطلبات.')
      }
    )

    return () => unsub()
  }, [restaurantUid])

  const updateStatus = async (id: string, status: string) => {
    await updateDoc(doc(db, 'orders', id), { 
      status, 
      updatedAt: serverTimestamp()
    })
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-extrabold text-yellow-500">📋 إدارة الطلبات</h1>

      {error && <div className="text-red-500 text-sm mb-2">{error}</div>}

      {orders.map((o: any) => {
        const deliveryFee = Number(o.deliveryFee ?? 0)
        const baseAmount = Number(o.restaurantPayout ?? o.subtotal ?? 0)
        const commissionRate = Number(o.commissionRate ?? 0.15)
        const commissionAmountRaw =
          o.applicationShare ??
          o.commissionAmount ??
          (Number.isFinite(baseAmount) ? +(baseAmount * commissionRate).toFixed(2) : 0)
        const commissionAmount = Number(commissionAmountRaw)
        const fallbackTotal =
          Number.isFinite(baseAmount) && Number.isFinite(commissionAmount) && Number.isFinite(deliveryFee)
            ? baseAmount + commissionAmount + deliveryFee
            : 0
        const customerTotal = Number(o.total ?? fallbackTotal)
        const formatAmount = (value: number) =>
          Number.isFinite(value) ? value.toFixed(2) : '0.00'

        return (
          <div
            key={o.id}
            className="bg-white rounded-2xl shadow-xl p-5 text-gray-900 space-y-4 transition hover:shadow-2xl"
          >
            {/* 🧾 رأس الطلب */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div className="font-bold text-lg">
                طلب #{o.id.slice(-6)}
                <span className="text-gray-500 text-sm ml-2">
                  {o.items?.map((i:any)=>`${i.name}×${i.qty}`).join(' • ')}
                </span>
              </div>
              <div className="font-extrabold text-xl text-green-600">{formatAmount(customerTotal)} ر.س</div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 text-sm text-gray-700">
              <div className="rounded-xl bg-yellow-50 border border-yellow-200 p-3">
                <p className="text-xs text-gray-500">حصة المطعم</p>
                <p className="text-base font-semibold text-primary">{formatAmount(baseAmount)} ر.س</p>
              </div>
              <div className="rounded-xl bg-rose-50 border border-rose-200 p-3">
                <p className="text-xs text-gray-500">ضريبة التطبيق (15٪)</p>
                <p className="text-base font-semibold text-rose-600">{formatAmount(commissionAmount)} ر.س</p>
              </div>
              <div className="rounded-xl bg-emerald-50 border border-emerald-200 p-3">
                <p className="text-xs text-gray-500">رسوم التوصيل</p>
                <p className="text-base font-semibold text-emerald-600">{formatAmount(deliveryFee)} ر.س</p>
              </div>
            </div>

            {/* 📌 الحالة الحالية */}
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">الحالة:</span>
              <span className={`px-3 py-1 rounded-full text-sm font-bold ${statusColor(o.status)}`}>
                {badge(o.status || 'pending')}
              </span>
            </div>

            {/* 🏠 العنوان */}
            <div className="text-sm text-gray-700">
              <span className="font-semibold">العنوان:</span> {o.address}
            </div>

            {/* 🗺️ موقع العميل على الخريطة */}
            {o.location && (
              <div className="mt-3">
                <h3 className="font-semibold text-sm text-gray-800 mb-2">📍 موقع العميل:</h3>
                <iframe
                  title={`map-${o.id}`}
                  width="100%"
                  height="250"
                  style={{ borderRadius: '12px' }}
                  loading="lazy"
                  allowFullScreen
                  src={`https://www.google.com/maps?q=${o.location.lat},${o.location.lng}&hl=ar&z=15&output=embed`}
                ></iframe>
              </div>
            )}

            {/* 🔘 أزرار تغيير الحالة */}
            <div className="mt-3 grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
              {['accepted','preparing','ready','out_for_delivery','delivered','cancelled'].map(s => {
                return (
                  <button
                    key={s}
                    onClick={()=>updateStatus(o.id, s)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 hover:bg-gray-200 transition"
                  >
                    {badge(s)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}

      {orders.length === 0 && !error && (
        <div className="text-gray-400 text-center text-lg">🚫 لا توجد طلبات حالياً.</div>
      )}
    </div>
  )
}
