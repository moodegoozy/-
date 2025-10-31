import React, { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from 'firebase/firestore'

import { useAuth } from '@/auth'
import { db } from '@/firebase'
import { usePlatformSettings } from '@/context/PlatformSettingsContext'

type Restaurant = {
  id: string
  name: string
  city?: string
  status?: string
  createdAt?: Date | null
}

type OrderRecord = {
  id: string
  restaurantId?: string
  total?: number
  subtotal?: number
  commissionAmount?: number
  supervisorShare?: number
  platformShare?: number
  createdAt?: Date | null
  status?: string
}

type SupervisorProfile = {
  name?: string
  percentage?: number
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) return value
  if (typeof value === 'object' && value) {
    const ts = value as { seconds?: number; toDate?: () => Date }
    if (typeof ts.toDate === 'function') return ts.toDate()
    if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000)
  }
  return null
}

const toNumber = (value: unknown) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const { commissionRate } = usePlatformSettings()
  const [profile, setProfile] = useState<SupervisorProfile | null>(null)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [orders, setOrders] = useState<OrderRecord[]>([])
  const [requestName, setRequestName] = useState('')
  const [requestCity, setRequestCity] = useState('')
  const [requestLocation, setRequestLocation] = useState('')
  const [reportBody, setReportBody] = useState('')
  const [requests, setRequests] = useState<Restaurant[]>([])
  const [submittingRequest, setSubmittingRequest] = useState(false)
  const [submittingReport, setSubmittingReport] = useState(false)

  useEffect(() => {
    if (!user) return

    const ref = doc(db, 'supervisors', user.uid)
    void getDoc(ref).then((snapshot) => {
      if (snapshot.exists()) {
        setProfile(snapshot.data() as SupervisorProfile)
      }
    })
  }, [user])

  useEffect(() => {
    if (!user) return
    const restaurantsQuery = query(collection(db, 'restaurants'), where('supervisorId', '==', user.uid))
    const unsubscribe = onSnapshot(restaurantsQuery, (snapshot) => {
      setRestaurants(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            name: String(data.name ?? 'مطعم بدون اسم'),
            city: typeof data.city === 'string' ? data.city : undefined,
            status: typeof data.status === 'string' ? data.status : undefined,
            createdAt: toDate(data.createdAt),
          }
        }),
      )
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user) return
    const reqQuery = query(collection(db, 'restaurantRequests'), where('supervisorId', '==', user.uid), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(reqQuery, (snapshot) => {
      setRequests(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            name: String(data.name ?? 'طلب بدون اسم'),
            city: typeof data.city === 'string' ? data.city : undefined,
            status: typeof data.status === 'string' ? data.status : undefined,
            createdAt: toDate(data.createdAt),
          }
        }),
      )
    })

    return () => unsubscribe()
  }, [user])

  useEffect(() => {
    if (!user || restaurants.length === 0) {
      setOrders([])
      return
    }

    const restaurantIds = restaurants.map((restaurant) => restaurant.id)
    const chunks: string[][] = []
    for (let i = 0; i < restaurantIds.length; i += 10) {
      chunks.push(restaurantIds.slice(i, i + 10))
    }

    const unsubscribers = chunks.map((chunk) =>
      onSnapshot(
        query(collection(db, 'orders'), where('restaurantId', 'in', chunk), orderBy('createdAt', 'desc')),
        (snapshot) => {
          setOrders((prev) => {
            const map = new Map<string, OrderRecord>()
            prev.forEach((order) => {
              if (!chunk.includes(order.restaurantId ?? '')) {
                map.set(order.id, order)
              }
            })
            snapshot.docs.forEach((document) => {
              const data = document.data() as Record<string, unknown>
              const commission = toNumber(
                data.commissionAmount ?? data.applicationFeeTotal ?? data.applicationShare ?? data.platformShare,
              )
              const supervisor = toNumber(data.supervisorShare ?? commission / 2)
              const platform = toNumber(data.platformShare ?? commission - supervisor)
              map.set(document.id, {
                id: document.id,
                restaurantId: typeof data.restaurantId === 'string' ? data.restaurantId : undefined,
                total: toNumber(data.total ?? data.totalWithFees),
                subtotal: toNumber(data.subtotal ?? data.restaurantPayout ?? data.baseSubtotal),
                commissionAmount: commission,
                supervisorShare: supervisor,
                platformShare: platform,
                status: typeof data.status === 'string' ? data.status : undefined,
                createdAt: toDate(data.createdAt),
              })
            })
            return Array.from(map.values()).sort((a, b) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0))
          })
        },
      ),
    )

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe())
    }
  }, [restaurants, user])

  const submitRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    if (!requestName.trim()) {
      setRequestName(requestName.trim())
      return alert('يرجى كتابة اسم المطعم المطلوب تسجيله.')
    }

    setSubmittingRequest(true)
    try {
      await addDoc(collection(db, 'restaurantRequests'), {
        name: requestName.trim(),
        city: requestCity.trim() || null,
        location: requestLocation.trim() || null,
        supervisorId: user.uid,
        supervisorEmail: user.email ?? null,
        createdAt: serverTimestamp(),
        status: 'pending',
      })
      setRequestName('')
      setRequestCity('')
      setRequestLocation('')
      alert('تم إرسال طلب تسجيل المطعم إلى المطور بنجاح.')
    } catch (error) {
      console.error('فشل في إرسال الطلب:', error)
      alert('تعذر إرسال الطلب، يرجى المحاولة مرة أخرى.')
    } finally {
      setSubmittingRequest(false)
    }
  }

  const submitReport = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!user) return
    const trimmed = reportBody.trim()
    if (!trimmed) {
      return alert('اكتب ملاحظتك أو تقريرك قبل الإرسال.')
    }

    setSubmittingReport(true)
    try {
      await addDoc(collection(db, 'reports'), {
        supervisorId: user.uid,
        supervisorEmail: user.email ?? null,
        message: trimmed,
        createdAt: serverTimestamp(),
        status: 'pending',
      })
      setReportBody('')
      alert('تم إرسال التقرير إلى لوحة المطور.')
    } catch (error) {
      console.error('فشل في إرسال التقرير:', error)
      alert('تعذر إرسال التقرير حالياً، حاول لاحقاً.')
    } finally {
      setSubmittingReport(false)
    }
  }

  const totals = useMemo(() => {
    return orders.reduce(
      (acc, order) => {
        acc.orders += 1
        acc.base += order.subtotal ?? 0
        acc.markup += order.commissionAmount ?? 0
        acc.supervisor += order.supervisorShare ?? (order.commissionAmount ?? 0) / 2
        acc.platform += order.platformShare ?? 0
        return acc
      },
      { orders: 0, base: 0, markup: 0, supervisor: 0, platform: 0 },
    )
  }, [orders])

  const ordersByRestaurant = useMemo(() => {
    const map = new Map<string, OrderRecord[]>()
    orders.forEach((order) => {
      const id = order.restaurantId ?? 'unknown'
      if (!map.has(id)) {
        map.set(id, [])
      }
      map.get(id)!.push(order)
    })
    return map
  }, [orders])

  return (
    <div className="space-y-8 text-slate-900">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold">
          لوحة المشرف{profile?.name ? ` – ${profile.name}` : ''}
        </h1>
        <p className="text-sm text-slate-600">
          تابع المطاعم المرتبطة بك، أرسل طلبات التسجيل الجديدة، وشارك التقارير مع فريق التطوير.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">عدد المطاعم</div>
          <div className="text-2xl font-semibold">{restaurants.length}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">عدد الطلبات الإجمالي</div>
          <div className="text-2xl font-semibold">{totals.orders}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">إجمالي مبيعات المطاعم</div>
          <div className="text-2xl font-semibold">{totals.base.toFixed(2)} ر.س</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">دخل المشرف من النسبة</div>
          <div className="text-2xl font-semibold">{totals.supervisor.toFixed(2)} ر.س</div>
          <div className="text-[11px] text-slate-500 mt-1">النسبة الحالية للتطبيق {(commissionRate * 100).toFixed(0)}%</div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={submitRequest} className="space-y-3 rounded-2xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold text-slate-900">📨 طلب تسجيل مطعم جديد</h2>
          <p className="text-sm text-slate-600">
            اكتب بيانات المطعم الذي ترغب في إضافته وسيتم إشعار المطور لإكمال الربط.
          </p>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="اسم المطعم"
            value={requestName}
            onChange={(event) => setRequestName(event.target.value)}
            required
            disabled={submittingRequest}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="المدينة (اختياري)"
            value={requestCity}
            onChange={(event) => setRequestCity(event.target.value)}
            disabled={submittingRequest}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="ملاحظات عن الموقع أو العنوان (اختياري)"
            value={requestLocation}
            onChange={(event) => setRequestLocation(event.target.value)}
            disabled={submittingRequest}
          />
          <button
            type="submit"
            disabled={submittingRequest}
            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submittingRequest ? 'جارٍ الإرسال...' : 'إرسال الطلب'}
          </button>
        </form>

        <form onSubmit={submitReport} className="space-y-3 rounded-2xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold text-slate-900">📝 إرسال تقرير أو ملاحظة</h2>
          <p className="text-sm text-slate-600">أرسل تحديثاتك للمطور حول سير العمل أو المشاكل التي تواجهك.</p>
          <textarea
            className="h-32 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="اكتب تقريرك بالتفصيل"
            value={reportBody}
            onChange={(event) => setReportBody(event.target.value)}
            disabled={submittingReport}
          />
          <button
            type="submit"
            disabled={submittingReport}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {submittingReport ? 'جارٍ الإرسال...' : 'إرسال التقرير'}
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">🍽️ المطاعم المرتبطة بك</h2>
        {restaurants.length === 0 && (
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
            لا توجد مطاعم مرتبطة بك حالياً. يمكنك إرسال طلب تسجيل جديد من النموذج أعلاه.
          </div>
        )}
        {restaurants.map((restaurant) => {
          const restaurantOrders = ordersByRestaurant.get(restaurant.id) ?? []
          const baseTotal = restaurantOrders.reduce((sum, order) => sum + (order.subtotal ?? 0), 0)
          const supervisorTotal = restaurantOrders.reduce((sum, order) => sum + (order.supervisorShare ?? 0), 0)

          return (
            <div key={restaurant.id} className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow">
              <header className="flex flex-col gap-1 text-right">
                <h3 className="text-lg font-semibold text-slate-900">{restaurant.name}</h3>
                <div className="text-xs text-slate-500">
                  {restaurant.city && <span>📍 {restaurant.city} • </span>}
                  {restaurant.status && <span>الحالة: {restaurant.status}</span>}
                  {!restaurant.status && <span>الحالة: قيد التشغيل</span>}
                </div>
                <div className="text-xs text-slate-500">
                  إجمالي المبيعات: {baseTotal.toFixed(2)} ر.س • حصة المشرف: {supervisorTotal.toFixed(2)} ر.س
                </div>
              </header>

              {restaurantOrders.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
                  لا توجد طلبات لهذا المطعم حالياً.
                </div>
              ) : (
                <div className="space-y-2 text-sm text-slate-700">
                  {restaurantOrders.slice(0, 5).map((order) => (
                    <div key={order.id} className="flex flex-col rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-900">طلب #{order.id.slice(-6)}</span>
                        <span className="text-xs text-slate-500">
                          {order.createdAt ? order.createdAt.toLocaleString('ar-SA') : '—'}
                        </span>
                      </div>
                      <div className="grid gap-1 text-xs text-slate-600 md:grid-cols-4">
                        <div>الإجمالي: {order.total?.toFixed(2)} ر.س</div>
                        <div>السعر الأساسي: {order.subtotal?.toFixed(2)} ر.س</div>
                        <div>نسبة التطبيق: {(order.commissionAmount ?? 0).toFixed(2)} ر.س</div>
                        <div>نصيبك: {(order.supervisorShare ?? 0).toFixed(2)} ر.س</div>
                      </div>
                      <div className="text-xs text-slate-500">الحالة الحالية: {order.status ?? '—'}</div>
                    </div>
                  ))}
                  {restaurantOrders.length > 5 && (
                    <div className="text-xs text-slate-500">عرض {restaurantOrders.length} طلباً — يتم إظهار آخر 5 طلبات فقط.</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">📋 طلبات التسجيل المرسلة</h2>
        {requests.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-500">
            لا توجد طلبات مسجلة حتى الآن.
          </div>
        ) : (
          <div className="grid gap-3 md:grid-cols-2">
            {requests.map((req) => (
              <div key={req.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow text-sm text-slate-700">
                <div className="font-semibold text-slate-900">{req.name}</div>
                {req.city && <div className="text-xs text-slate-500">📍 {req.city}</div>}
                <div className="text-xs text-slate-500">الحالة الحالية: {req.status ?? 'pending'}</div>
                <div className="text-xs text-slate-400">
                  {req.createdAt ? req.createdAt.toLocaleString('ar-SA') : '—'}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

export default AdminDashboard
