import React, { useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from 'firebase/firestore'

import { useAuth } from '@/auth'
import { db } from '@/firebase'

type TabKey = 'overview' | 'commission' | 'restaurants' | 'reports'

type NormalizedOrder = {
  id: string
  status: string
  createdAt: Date | null
  baseAmount: number
  commissionAmount: number
  deliveryFee: number
  total: number
  restaurantName: string
  items: Array<{ name?: string; qty?: number }>
}

type RestaurantRecord = {
  id: string
  name: string
  ownerName?: string
  city?: string
  status?: string
  createdAt: Date | null
}

type RestaurantRequest = {
  id: string
  name: string
  ownerName?: string
  notes?: string
  status: 'pending' | 'approved' | 'rejected'
  createdAt: Date | null
}

type AlertState = { kind: 'success' | 'error'; message: string } | null

const tabs: Array<{ id: TabKey; label: string; description: string }> = [
  {
    id: 'overview',
    label: 'نظرة عامة',
    description: 'ملخص لأهم أرقام المنصة اليوم.'
  },
  {
    id: 'commission',
    label: 'العمولة',
    description: 'متابعة عمولة المنصة وحساب التوزيعات.'
  },
  {
    id: 'restaurants',
    label: 'إدارة المطاعم',
    description: 'طلبات الانضمام، حالة التفعيل، والمتابعة اليومية.'
  },
  {
    id: 'reports',
    label: 'التقارير',
    description: 'إحصاءات دورية واستبصارات تساعد في اتخاذ القرار.'
  }
]

const formatCurrency = (value: number) =>
  `${value.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س`

const toNumber = (value: unknown): number => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

const toDate = (value: unknown): Date | null => {
  if (!value) return null
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === 'string' || typeof value === 'number') {
    const result = new Date(value)
    return Number.isNaN(result.getTime()) ? null : result
  }
  if (typeof value === 'object') {
    const timestamp = value as { seconds?: number; toDate?: () => Date }
    if (typeof timestamp.toDate === 'function') {
      const date = timestamp.toDate()
      return Number.isNaN(date.getTime()) ? null : date
    }
    if (typeof timestamp.seconds === 'number') {
      const date = new Date(timestamp.seconds * 1000)
      return Number.isNaN(date.getTime()) ? null : date
    }
  }
  return null
}

const formatDate = (date: Date | null) =>
  date
    ? date.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const statusLabel = (status: string) => {
  const dictionary: Record<string, string> = {
    pending: 'قيد المراجعة',
    accepted: 'تم القبول',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    out_for_delivery: 'في الطريق',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  }
  return dictionary[status] ?? status
}

const statusBadgeClass = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-gray-100 text-gray-700'
    case 'accepted':
      return 'bg-blue-100 text-blue-700'
    case 'preparing':
      return 'bg-yellow-100 text-yellow-700'
    case 'ready':
      return 'bg-purple-100 text-purple-700'
    case 'out_for_delivery':
      return 'bg-indigo-100 text-indigo-700'
    case 'delivered':
      return 'bg-emerald-100 text-emerald-700'
    case 'cancelled':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-slate-100 text-slate-700'
  }
}

const requestBadgeClass = (status: RestaurantRequest['status']) => {
  switch (status) {
    case 'approved':
      return 'bg-emerald-100 text-emerald-700'
    case 'rejected':
      return 'bg-rose-100 text-rose-700'
    default:
      return 'bg-yellow-100 text-yellow-700'
  }
}

const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [orders, setOrders] = useState<NormalizedOrder[]>([])
  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([])
  const [requests, setRequests] = useState<RestaurantRequest[]>([])
  const [creatingRequest, setCreatingRequest] = useState(false)
  const [alert, setAlert] = useState<AlertState>(null)

  useEffect(() => {
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          const baseAmount = toNumber(
            data.restaurantAmount ?? data.restaurantTotal ?? data.subtotal ?? data.total ?? 0,
          )
          const commission = toNumber(
            data.appCommission ?? data.platformCommission ?? data.commission ?? baseAmount * 0.15,
          )
          const deliveryFee = toNumber(data.deliveryFee ?? data.delivery ?? 0)
          const total = toNumber(data.total ?? baseAmount + commission + deliveryFee)

          return {
            id: document.id,
            status: String(data.status ?? 'pending'),
            createdAt: toDate(data.createdAt),
            baseAmount,
            commissionAmount: commission,
            deliveryFee,
            total,
            restaurantName: String(data.restaurantName ?? data.restaurant ?? 'مطعم غير معروف'),
            items: Array.isArray(data.items) ? (data.items as Array<{ name?: string; qty?: number }>) : [],
          }
        }),
      )
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const restaurantsQuery = query(collection(db, 'restaurants'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(restaurantsQuery, (snapshot) => {
      setRestaurants(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            name: String(data.name ?? 'مطعم غير معروف'),
            ownerName: data.ownerName ? String(data.ownerName) : undefined,
            city: data.city ? String(data.city) : undefined,
            status: data.status ? String(data.status) : undefined,
            createdAt: toDate(data.createdAt),
          }
        }),
      )
    })

    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const requestsQuery = query(collection(db, 'restaurantRequests'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(requestsQuery, (snapshot) => {
      setRequests(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          const status = String(data.status ?? 'pending') as RestaurantRequest['status']
          return {
            id: document.id,
            name: String(data.name ?? 'مطعم بدون اسم'),
            ownerName: data.ownerName ? String(data.ownerName) : undefined,
            notes: data.notes ? String(data.notes) : undefined,
            status,
            createdAt: toDate(data.createdAt),
          }
        }),
      )
    })

    return () => unsubscribe()
  }, [])

  const metrics = useMemo(() => {
    const totals = orders.reduce(
      (acc, order) => {
        acc.restaurant += order.baseAmount
        acc.commission += order.commissionAmount
        acc.delivery += order.deliveryFee
        acc.total += order.total
        acc.count += 1
        acc.byStatus[order.status] = (acc.byStatus[order.status] ?? 0) + 1

        if (order.createdAt) {
          const key = `${order.createdAt.getFullYear()}-${String(order.createdAt.getMonth() + 1).padStart(2, '0')}`
          const bucket = acc.byMonth.get(key) ?? { commission: 0, payout: 0, count: 0 }
          bucket.commission += order.commissionAmount
          bucket.payout += order.baseAmount
          bucket.count += 1
          acc.byMonth.set(key, bucket)
        }

        return acc
      },
      {
        restaurant: 0,
        commission: 0,
        delivery: 0,
        total: 0,
        count: 0,
        byStatus: {} as Record<string, number>,
        byMonth: new Map<string, { commission: number; payout: number; count: number }>(),
      },
    )

    const monthlyBreakdown = Array.from(totals.byMonth.entries())
      .map(([month, value]) => ({ month, ...value }))
      .sort((a, b) => (a.month > b.month ? 1 : -1))

    const pendingRequests = requests.filter((request) => request.status === 'pending')

    return {
      ...totals,
      monthlyBreakdown,
      pendingRequests,
    }
  }, [orders, requests])

  const handleRequestUpdate = async (requestId: string, status: RestaurantRequest['status']) => {
    try {
      await updateDoc(doc(db, 'restaurantRequests', requestId), {
        status,
        reviewedAt: serverTimestamp(),
      })
      setAlert({ kind: 'success', message: 'تم تحديث حالة الطلب بنجاح.' })
    } catch (error) {
      console.error(error)
      setAlert({ kind: 'error', message: 'تعذر تحديث حالة الطلب، يرجى المحاولة لاحقاً.' })
    }
  }

  const handleCreateRequest = async (form: FormData) => {
    const name = String(form.get('name') ?? '').trim()
    const ownerName = String(form.get('ownerName') ?? '').trim()
    const notes = String(form.get('notes') ?? '').trim()

    if (!name) {
      setAlert({ kind: 'error', message: 'يرجى إدخال اسم المطعم.' })
      return
    }

    try {
      setCreatingRequest(true)
      await addDoc(collection(db, 'restaurantRequests'), {
        name,
        ownerName: ownerName || null,
        notes: notes || null,
        status: 'pending',
        createdAt: serverTimestamp(),
      })
      setAlert({ kind: 'success', message: 'تم إرسال طلب الانضمام، وسيتم مراجعته قريباً.' })
    } catch (error) {
      console.error(error)
      setAlert({ kind: 'error', message: 'تعذر إرسال الطلب، يرجى المحاولة لاحقاً.' })
    } finally {
      setCreatingRequest(false)
    }
  }

  const handleSubmitNewRequest = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    event.currentTarget.reset()
    handleCreateRequest(form)
  }

  useEffect(() => {
    if (!alert) return
    const timeout = window.setTimeout(() => setAlert(null), 4000)
    return () => window.clearTimeout(timeout)
  }, [alert])

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 text-white">
        <p className="text-lg font-semibold">يجب تسجيل الدخول كمشرفة للوصول إلى هذه الصفحة.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <header className="border-b border-white/10 bg-slate-900/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-8 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-yellow-400">لوحة تحكم سفرة البيت</h1>
            <p className="text-sm text-slate-200">مرحباً {user.email ?? 'مشرفة'}! تابعي مؤشرات الأداء وطلبات الانضمام في مكان واحد.</p>
          </div>
          <div className="rounded-2xl bg-white/5 px-4 py-2 text-xs text-slate-200">
            آخر تحديث: {new Date().toLocaleTimeString('ar-SA')}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-10">
        {alert && (
          <div
            className={`mb-6 rounded-3xl border px-4 py-3 text-sm ${
              alert.kind === 'success'
                ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100'
                : 'border-rose-500/40 bg-rose-500/10 text-rose-100'
            }`}
          >
            {alert.message}
          </div>
        )}

        <nav className="grid gap-3 rounded-3xl bg-white/5 p-2 sm:grid-cols-2 lg:grid-cols-4">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-5 text-right transition focus:outline-none focus:ring-2 focus:ring-yellow-400/60 ${
                activeTab === tab.id
                  ? 'bg-yellow-400 text-slate-950 shadow-lg'
                  : 'bg-slate-900/60 text-slate-200 hover:bg-slate-900'
              }`}
            >
              <p className="text-base font-semibold">{tab.label}</p>
              <p className="mt-2 text-xs opacity-80">{tab.description}</p>
            </button>
          ))}
        </nav>

        <section className="mt-8 space-y-8">
          {activeTab === 'overview' && (
            <div className="space-y-8">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-3xl bg-gradient-to-br from-yellow-400 to-yellow-500 p-6 text-slate-950 shadow-lg">
                  <p className="text-sm font-medium">إجمالي الطلبات</p>
                  <p className="mt-3 text-3xl font-extrabold">{metrics.count}</p>
                  <p className="mt-1 text-xs text-slate-900/70">آخر ٧ أيام محدثة لحظياً من فواتير المطاعم.</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm text-slate-200">حصة المنصة</p>
                  <p className="mt-3 text-2xl font-bold text-yellow-300">{formatCurrency(metrics.commission)}</p>
                  <p className="mt-1 text-xs text-slate-400">شامل جميع الطلبات المسجلة.</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm text-slate-200">مستحقات المطاعم</p>
                  <p className="mt-3 text-2xl font-bold text-emerald-300">{formatCurrency(metrics.restaurant)}</p>
                  <p className="mt-1 text-xs text-slate-400">يتم تحويلها تلقائياً بعد خصم العمولة.</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm text-slate-200">طلبات قيد المراجعة</p>
                  <p className="mt-3 text-2xl font-bold text-sky-300">{metrics.pendingRequests.length}</p>
                  <p className="mt-1 text-xs text-slate-400">طلبات انضمام المطاعم التي تنتظر الاعتماد.</p>
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold">الطلبات الأخيرة</h2>
                  <span className="text-xs text-slate-300">يتم التحديث مباشرةً من Firestore</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead className="text-xs uppercase text-slate-300">
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-2">المطعم</th>
                        <th className="px-3 py-2">التاريخ</th>
                        <th className="px-3 py-2">الإجمالي</th>
                        <th className="px-3 py-2">عمولة التطبيق</th>
                        <th className="px-3 py-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {orders.slice(0, 8).map((order) => (
                        <tr key={order.id}>
                          <td className="px-3 py-2 font-medium">{order.restaurantName}</td>
                          <td className="px-3 py-2">{formatDate(order.createdAt)}</td>
                          <td className="px-3 py-2">{formatCurrency(order.total)}</td>
                          <td className="px-3 py-2">{formatCurrency(order.commissionAmount)}</td>
                          <td className="px-3 py-2">
                            <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${statusBadgeClass(order.status)}`}>
                              {statusLabel(order.status)}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {orders.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            لا توجد طلبات مسجلة حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'commission' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm text-slate-200">إجمالي العمولة</p>
                  <p className="mt-3 text-3xl font-bold text-yellow-300">{formatCurrency(metrics.commission)}</p>
                  <p className="mt-1 text-xs text-slate-400">مجموع ما سيتم تحويله إلى رصيد التطبيق.</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm text-slate-200">إجمالي صافي المطاعم</p>
                  <p className="mt-3 text-3xl font-bold text-emerald-300">{formatCurrency(metrics.restaurant)}</p>
                  <p className="mt-1 text-xs text-slate-400">بعد خصم العمولة (15٪) تلقائياً من كل طلب.</p>
                </div>
                <div className="rounded-3xl bg-white/5 p-6">
                  <p className="text-sm text-slate-200">رسوم التوصيل</p>
                  <p className="mt-3 text-3xl font-bold text-sky-300">{formatCurrency(metrics.delivery)}</p>
                  <p className="mt-1 text-xs text-slate-400">للاطلاع فقط، لا تدخل ضمن عمولة المنصة.</p>
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-semibold">توزيع شهري</h3>
                <div className="mt-6 space-y-4">
                  {metrics.monthlyBreakdown.length === 0 && (
                    <p className="text-sm text-slate-300">لا يوجد بيانات كافية حالياً.</p>
                  )}
                  {metrics.monthlyBreakdown.map((month) => (
                    <div key={month.month} className="grid gap-4 rounded-2xl bg-slate-900/60 p-4 sm:grid-cols-4">
                      <div>
                        <p className="text-xs text-slate-300">الشهر</p>
                        <p className="text-base font-semibold">{month.month}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300">عمولة التطبيق</p>
                        <p className="text-sm font-medium text-yellow-300">{formatCurrency(month.commission)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300">صافي المطاعم</p>
                        <p className="text-sm font-medium text-emerald-300">{formatCurrency(month.payout)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-300">عدد الطلبات</p>
                        <p className="text-sm font-medium text-slate-100">{month.count}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-semibold">تفاصيل الاحتساب</h3>
                <ul className="mt-4 list-disc space-y-2 pr-6 text-sm text-slate-200">
                  <li>يتم احتساب عمولة التطبيق تلقائياً بنسبة 15٪ من إجمالي الطلب قبل رسوم التوصيل.</li>
                  <li>يظهر صافي المطعم بعد خصم العمولة مباشرة في سجل الطلب.</li>
                  <li>يمكن تصدير الأرقام إلى التقارير الشهرية من تبويب التقارير.</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'restaurants' && (
            <div className="space-y-6">
              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-semibold">إضافة طلب انضمام جديد</h3>
                <p className="mt-1 text-sm text-slate-300">يتم إرسال الطلب إلى قائمة المراجعة للموافقة أو الرفض.</p>
                <form className="mt-6 grid gap-4 md:grid-cols-2" onSubmit={handleSubmitNewRequest}>
                  <div className="md:col-span-1 space-y-2">
                    <label htmlFor="restaurant-name" className="text-xs text-slate-200">
                      اسم المطعم
                    </label>
                    <input
                      id="restaurant-name"
                      name="name"
                      required
                      placeholder="مطعم سفرة البيت"
                      className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
                    />
                  </div>
                  <div className="md:col-span-1 space-y-2">
                    <label htmlFor="restaurant-owner" className="text-xs text-slate-200">
                      اسم المالك (اختياري)
                    </label>
                    <input
                      id="restaurant-owner"
                      name="ownerName"
                      placeholder="أم أحمد"
                      className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
                    />
                  </div>
                  <div className="md:col-span-2 space-y-2">
                    <label htmlFor="restaurant-notes" className="text-xs text-slate-200">
                      ملاحظات إضافية
                    </label>
                    <textarea
                      id="restaurant-notes"
                      name="notes"
                      rows={3}
                      placeholder="روابط السوشيال، نوع المطبخ، أوقات العمل..."
                      className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-sm focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
                    />
                  </div>
                  <div className="md:col-span-2 flex justify-end">
                    <button
                      type="submit"
                      disabled={creatingRequest}
                      className="rounded-2xl bg-yellow-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-70"
                    >
                      {creatingRequest ? 'جارٍ الإرسال...' : 'إضافة الطلب'}
                    </button>
                  </div>
                </form>
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <h3 className="text-lg font-semibold">طلبات الانضمام</h3>
                  <span className="text-xs text-slate-300">{metrics.pendingRequests.length} طلب قيد المراجعة</span>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead className="text-xs uppercase text-slate-300">
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-2">المطعم</th>
                        <th className="px-3 py-2">المالكة</th>
                        <th className="px-3 py-2">التاريخ</th>
                        <th className="px-3 py-2">الحالة</th>
                        <th className="px-3 py-2">التحكم</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {requests.map((request) => (
                        <tr key={request.id}>
                          <td className="px-3 py-2 font-medium">
                            <div className="space-y-1">
                              <p>{request.name}</p>
                              {request.notes && <p className="text-xs text-slate-400">{request.notes}</p>}
                            </div>
                          </td>
                          <td className="px-3 py-2">{request.ownerName ?? '—'}</td>
                          <td className="px-3 py-2">{formatDate(request.createdAt)}</td>
                          <td className="px-3 py-2">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${requestBadgeClass(request.status)}`}
                            >
                              {request.status === 'pending'
                                ? 'قيد المراجعة'
                                : request.status === 'approved'
                                ? 'تمت الموافقة'
                                : 'مرفوض'}
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                onClick={() => handleRequestUpdate(request.id, 'approved')}
                                className="rounded-2xl bg-emerald-400/20 px-3 py-1 text-xs font-semibold text-emerald-200 hover:bg-emerald-400/30"
                              >
                                قبول
                              </button>
                              <button
                                onClick={() => handleRequestUpdate(request.id, 'rejected')}
                                className="rounded-2xl bg-rose-400/20 px-3 py-1 text-xs font-semibold text-rose-200 hover:bg-rose-400/30"
                              >
                                رفض
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {requests.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            لا توجد طلبات حالياً.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-semibold">المطاعم النشطة</h3>
                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full text-right text-sm">
                    <thead className="text-xs uppercase text-slate-300">
                      <tr className="border-b border-white/10">
                        <th className="px-3 py-2">المطعم</th>
                        <th className="px-3 py-2">المالكة</th>
                        <th className="px-3 py-2">المدينة</th>
                        <th className="px-3 py-2">تاريخ الإضافة</th>
                        <th className="px-3 py-2">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 text-slate-200">
                      {restaurants.map((restaurant) => (
                        <tr key={restaurant.id}>
                          <td className="px-3 py-2 font-medium">{restaurant.name}</td>
                          <td className="px-3 py-2">{restaurant.ownerName ?? '—'}</td>
                          <td className="px-3 py-2">{restaurant.city ?? '—'}</td>
                          <td className="px-3 py-2">{formatDate(restaurant.createdAt)}</td>
                          <td className="px-3 py-2">
                            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                              {restaurant.status ?? 'نشط'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {restaurants.length === 0 && (
                        <tr>
                          <td colSpan={5} className="px-3 py-6 text-center text-slate-400">
                            لم يتم تسجيل مطاعم بعد.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                {Object.entries(metrics.byStatus).map(([status, count]) => (
                  <div key={status} className="rounded-3xl bg-white/5 p-6">
                    <p className="text-sm text-slate-200">{statusLabel(status)}</p>
                    <p className="mt-3 text-3xl font-bold text-white">{count}</p>
                    <p className="mt-1 text-xs text-slate-400">نسبة {((count / (metrics.count || 1)) * 100).toFixed(1)}٪ من إجمالي الطلبات.</p>
                  </div>
                ))}
                {Object.keys(metrics.byStatus).length === 0 && (
                  <p className="rounded-3xl bg-white/5 p-6 text-sm text-slate-300">
                    لا تتوفر بيانات كافية لإظهار التقارير.
                  </p>
                )}
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-semibold">ملاحظات تشغيلية</h3>
                <ul className="mt-4 list-disc space-y-2 pr-6 text-sm text-slate-200">
                  <li>تحققي من الطلبات التي تحمل حالة «قيد المراجعة» أو «ملغي» للتأكد من تحديث الحالة لدى المطعم.</li>
                  <li>قومي بمراجعة طلبات الانضمام الجديدة بشكل يومي لضمان إضافة المطاعم إلى التطبيق دون تأخير.</li>
                  <li>استخدمي تبويب العمولة لمراجعة التحويلات قبل نهاية كل شهر.</li>
                </ul>
              </div>

              <div className="rounded-3xl bg-white/5 p-6">
                <h3 className="text-lg font-semibold">تصدير التقارير</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <button className="rounded-2xl bg-yellow-400/20 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/30">
                    تنزيل تقرير شهر حالي
                  </button>
                  <button className="rounded-2xl bg-yellow-400/20 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/30">
                    تقرير العمولات التفصيلي
                  </button>
                  <button className="rounded-2xl bg-yellow-400/20 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/30">
                    تقرير أداء المطاعم
                  </button>
                  <button className="rounded-2xl bg-yellow-400/20 px-4 py-3 text-sm font-semibold text-yellow-200 hover:bg-yellow-400/30">
                    أرشيف الطلبات المكتمل
                  </button>
                </div>
                <p className="mt-4 text-xs text-slate-400">
                  يتم تحضير ملفات CSV قابلة للتصدير لاحقاً، حالياً الأزرار للعرض فقط وتمثل المهام القادمة للفريق التقني.
                </p>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

export { AdminDashboard }
export default AdminDashboard
