// src/pages/TrackOrders.tsx
import React, { useEffect, useState } from 'react'
import { collection, getDocs, onSnapshot, orderBy, query, where, limit } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'

type Order = any

export const TrackOrders: React.FC = () => {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [err, setErr] = useState<string | null>(null)
  const [diag, setDiag] = useState<any>(null)

  useEffect(() => {
    if (!user) return
    setErr(null)
    setDiag(null)

    // الاستعلام الأساسي: customerId + orderBy(createdAt)
    const q1 = query(
      collection(db, 'orders'),
      where('customerId', '==', user.uid),
      orderBy('createdAt', 'desc')
    )

    // نحاول الاشتراك.. لو صار خطأ فهرس، نطيح على فولبّاك
    const unsub = onSnapshot(
      q1,
      snap => {
        setOrders(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
        setErr(null)
      },
      async (e) => {
        console.error('TrackOrders onSnapshot error:', e)
        setErr('⚠️ احتمال تحتاج Composite Index لـ customerId + createdAt. بنعرض البيانات بدون ترتيب مؤقتًا.')

        // فولبّاك بدون orderBy (ما يحتاج فهرس مركب)
        const q2 = query(
          collection(db, 'orders'),
          where('customerId', '==', user.uid)
        )
        const s2 = await getDocs(q2)
        const list = s2.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

        // تشخيص سريع: نعرض عينة من أحدث 5 طلبات عامة
        const q3 = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(5))
        let sample: any[] = []
        try {
          const s3 = await getDocs(q3)
          sample = s3.docs.map(d => {
            const data = d.data() as any
            return {
              id: d.id,
              customerId: data.customerId,
              restaurantId: data.restaurantId,
              createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? null,
            }
          })
        } catch {}

        setDiag({
          uid: user.uid,
          fallbackCount: list.length,
          sample,
        })
        setOrders(list)
      }
    )

    return () => unsub()
  }, [user])

  const badge = (s: string) => {
    const map: Record<string, string> = {
      pending: 'قيد المراجعة',
      accepted: 'تم القبول',
      preparing: 'قيد التحضير',
      ready: 'جاهز للتسليم',
      out_for_delivery: 'في الطريق',
      delivered: 'تم التسليم',
      cancelled: 'ملغي',
    }
    return map[s] || s
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold">طلباتي</h1>

      {err && (
        <div className="text-xs bg-yellow-50 text-yellow-800 border border-yellow-200 rounded-xl p-3">
          {err}
          {diag && (
            <div className="mt-1">
              <div>UID: <b>{diag.uid}</b></div>
              <div>عدد نتائج الفولبّاك: <b>{diag.fallbackCount}</b></div>
              {Array.isArray(diag.sample) && diag.sample.length > 0 && (
                <div className="mt-1">
                  <div className="font-semibold">عينة (أحدث 5):</div>
                  {diag.sample.map((x: any) => (
                    <div key={x.id} className="truncate">
                      #{x.id} • customerId: {String(x.customerId)} • restaurantId: {String(x.restaurantId)} • createdAt: {x.createdAt || '—'}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {orders.map((o) => {
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
          <div key={o.id} className="bg-white rounded-2xl shadow p-4">
            <div className="flex items-center justify-between">
              <div className="font-bold">طلب #{o.id.slice(-6)}</div>
              <div className="text-sm px-3 py-1 rounded-full bg-gray-900 text-white">
                {badge(o.status)}
              </div>
            </div>

            {o.restaurantName && (
              <div className="mt-1 text-yellow-600 font-semibold">
                المطعم: {o.restaurantName}
              </div>
            )}

            <div className="mt-2 text-sm text-gray-700">
              {o.items?.map((i: any) => `${i.name}×${i.qty}`).join(' • ')}
            </div>
            <div className="mt-2 font-bold">
              الإجمالي المدفوع: {formatAmount(customerTotal)} ر.س
            </div>
            <div className="mt-1 text-xs text-gray-500 leading-relaxed">
              يشمل حصة المطعم بقيمة <span className="font-semibold text-gray-700">{formatAmount(baseAmount)} ر.س</span>
              {' '}وضريبة التطبيق بنسبة 15٪ بمبلغ
              {' '}
              <span className="font-semibold text-gray-700">{formatAmount(commissionAmount)} ر.س</span> بالإضافة إلى رسوم التوصيل
              {' '}
              <span className="font-semibold text-gray-700">{formatAmount(deliveryFee)} ر.س</span>.
            </div>
          </div>
        )
      })}

      {orders.length === 0 && !err && (
        <div className="text-gray-600">لا توجد طلبات حتى الآن.</div>
      )}
    </div>
  )
}
