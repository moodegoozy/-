import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
  statusLabel: string
  statusRaw?: unknown
  city?: string
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
    description: 'ملخص سريع لحالة المنصة والمهام اليومية',
  },
  {
    id: 'commission',
    label: 'العمولة',
    description: 'متابعة عمولات المنصة وحساباتها الشهرية',
  },
  {
    id: 'restaurants',
    label: 'إدارة المطاعم',
    description: 'إضافة مطعم جديد ومتابعة حالة التفعيل',
  },
  {
    id: 'reports',
    label: 'التقارير',
    description: 'إحصاءات موسعة عن الأداء والنمو',
  },
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
    const date = new Date(value)
    return Number.isNaN(date.getTime()) ? null : date
  }
  if (typeof value === 'object' && value !== null) {
    const maybeTimestamp = value as { seconds?: number; toDate?: () => Date }
    if (typeof maybeTimestamp.toDate === 'function') {
      const date = maybeTimestamp.toDate()
      return Number.isNaN(date.getTime()) ? null : date
    }
    if (typeof maybeTimestamp.seconds === 'number') {
      const date = new Date(maybeTimestamp.seconds * 1000)
      return Number.isNaN(date.getTime()) ? null : date
    }
  }
  return null
}

const formatDate = (value: Date | null) =>
  value
    ? value.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : '—'

const statusLabel = (status: string) => {
  const map: Record<string, string> = {
    pending: 'قيد المراجعة',
    accepted: 'تم القبول',
    preparing: 'قيد التحضير',
    ready: 'جاهز',
    out_for_delivery: 'في الطريق',
    delivered: 'تم التسليم',
    cancelled: 'ملغي',
  }
  return map[status] ?? status
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
      return 'bg-gray-100 text-gray-700'
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

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const [orders, setOrders] = useState<NormalizedOrder[]>([])
  const [ordersLoading, setOrdersLoading] = useState(true)
  const [ordersError, setOrdersError] = useState<string | null>(null)

  const [restaurants, setRestaurants] = useState<RestaurantRecord[]>([])
  const [restaurantsLoading, setRestaurantsLoading] = useState(true)

  const [requests, setRequests] = useState<RestaurantRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(true)
  const [requestsError, setRequestsError] = useState<string | null>(null)
  const [requestAlert, setRequestAlert] = useState<AlertState>(null)
  const [requestActionId, setRequestActionId] = useState<string | null>(null)

  const [form, setForm] = useState({ name: '', owner: '', notes: '' })
  const [savingRequest, setSavingRequest] = useState(false)

  useEffect(() => {
    const q = query(collection(db, 'orders'), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const normalized = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any
          const baseAmount = toNumber(data.restaurantPayout ?? data.subtotal)
          const commissionRate = toNumber(data.commissionRate ?? 0.15)
          let commissionAmount = toNumber(
            data.applicationShare ?? data.commissionAmount,
          )
          if (
            data.applicationShare === undefined &&
            data.commissionAmount === undefined &&
            Number.isFinite(baseAmount)
          ) {
            commissionAmount = Number((baseAmount * commissionRate).toFixed(2))
          }
          const deliveryFee = toNumber(data.deliveryFee)
          const total = toNumber(
            data.total ?? baseAmount + commissionAmount + deliveryFee,
          )

          return {
            id: docSnap.id,
            status: data.status ?? 'pending',
            createdAt: toDate(data.createdAt),
            baseAmount,
            commissionAmount,
            deliveryFee,
            total,
            restaurantName: data.restaurantName ?? 'مطعم',
            items: Array.isArray(data.items) ? data.items : [],
          }
        })

        setOrders(normalized)
        setOrdersError(null)
        setOrdersLoading(false)
      },
      (error) => {
        console.error('Failed to load orders for admin dashboard:', error)
        setOrdersError(
          'حدثت مشكلة في تحميل بيانات الطلبات. حاولِ مجدداً لاحقاً.',
        )
        setOrdersLoading(false)
      },
    )

    return () => unsub()
  }, [])

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, 'restaurants'),
      (snapshot) => {
        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any
          const statusLabelValue =
            typeof data.approvalStatus === 'string'
              ? data.approvalStatus
              : data.isApproved === true
              ? 'معتمد'
              : data.isApproved === false
              ? 'بانتظار التفعيل'
              : 'غير محدد'
          return {
            id: docSnap.id,
            name: data.name ?? 'مطعم بدون اسم',
            ownerName: data.ownerName ?? data.owner ?? undefined,
            statusLabel: statusLabelValue,
            statusRaw: data.approvalStatus ?? data.isApproved ?? null,
            city: data.city ?? undefined,
            createdAt: toDate(data.createdAt ?? data.updatedAt ?? null),
          }
        })
        setRestaurants(list)
        setRestaurantsLoading(false)
      },
      (error) => {
        console.error('Failed to load restaurants for admin dashboard:', error)
        setRestaurants([])
        setRestaurantsLoading(false)
      },
    )

    return () => unsub()
  }, [])

  useEffect(() => {
    const q = query(
      collection(db, 'restaurantApplications'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const records = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() as any
          return {
            id: docSnap.id,
            name: data.name ?? 'مطعم بدون اسم',
            ownerName: data.ownerName ?? data.owner ?? undefined,
            notes: data.notes ?? undefined,
            status: (data.status as RestaurantRequest['status']) ?? 'pending',
            createdAt: toDate(data.createdAt),
          }
        })
        setRequests(records)
        setRequestsError(null)
        setRequestsLoading(false)
      },
      (error) => {
        console.warn('restaurantApplications snapshot error:', error)
        setRequests([])
        setRequestsError('تعذر تحميل طلبات الانضمام (تحقق من الصلاحيات).')
        setRequestsLoading(false)
      },
    )

    return () => unsub()
  }, [])

  const openStatuses = useMemo(
    () =>
      new Set(['pending', 'accepted', 'preparing', 'ready', 'out_for_delivery']),
    [],
  )

  const ordersStats = useMemo(() => {
    const stats = {
      openCount: 0,
      deliveredCount: 0,
      cancelledCount: 0,
      totalBase: 0,
      totalCommission: 0,
      totalDelivery: 0,
      totalGross: 0,
      pendingCommission: 0,
      pendingPayout: 0,
      monthlyCommission: 0,
      monthlyDeliveredCount: 0,
    }

    const monthWindow = new Date()
    monthWindow.setDate(monthWindow.getDate() - 30)

    orders.forEach((order) => {
      stats.totalBase += order.baseAmount
      stats.totalCommission += order.commissionAmount
      stats.totalDelivery += order.deliveryFee
      stats.totalGross += order.total

      if (order.status === 'delivered') {
        stats.deliveredCount += 1
        if (order.createdAt && order.createdAt >= monthWindow) {
          stats.monthlyCommission += order.commissionAmount
          stats.monthlyDeliveredCount += 1
        }
      } else if (order.status === 'cancelled') {
        stats.cancelledCount += 1
      }

      if (openStatuses.has(order.status)) {
        stats.openCount += 1
        stats.pendingCommission += order.commissionAmount
        stats.pendingPayout += order.baseAmount
      }
    })

    return stats
  }, [openStatuses, orders])

  const pendingRequestsCount = useMemo(
    () => requests.filter((r) => r.status === 'pending').length,
    [requests],
  )

  const overviewHighlights = useMemo(
    () => [
      {
        title: 'الطلبات النشطة',
        value: `${ordersStats.openCount} طلب`,
        note:
          ordersStats.openCount > 0
            ? 'طلبات قيد المتابعة حالياً'
            : 'لا توجد طلبات مفتوحة الآن',
      },
      {
        title: 'المطاعم النشطة',
        value: `${restaurants.length} مطعم`,
        note:
          pendingRequestsCount > 0
            ? `${pendingRequestsCount} طلب انضمام بانتظار المراجعة`
            : 'لا توجد طلبات انضمام قيد الانتظار',
      },
      {
        title: 'عمولة آخر 30 يوماً',
        value: formatCurrency(ordersStats.monthlyCommission),
        note: `${ordersStats.monthlyDeliveredCount} طلب مكتمل خلال 30 يوماً`,
      },
    ],
    [ordersStats, pendingRequestsCount, restaurants.length],
  )

  const commissionCards = useMemo(
    () => [
      {
        title: 'إجمالي المبيعات',
        amount: formatCurrency(ordersStats.totalGross),
        note: `${orders.length} طلب مسجل في النظام`,
      },
      {
        title: 'عمولة التطبيق',
        amount: formatCurrency(ordersStats.totalCommission),
        note:
          ordersStats.pendingCommission > 0
            ? `${formatCurrency(
                ordersStats.pendingCommission,
              )} بانتظار التحصيل`
            : 'لا توجد عمولات متأخرة',
      },
      {
        title: 'مستحقات المطاعم',
        amount: formatCurrency(ordersStats.totalBase),
        note:
          ordersStats.pendingPayout > 0
            ? `${formatCurrency(
                ordersStats.pendingPayout,
              )} للطلبات المفتوحة`
            : 'جميع المستحقات تم حسابها',
      },
    ],
    [orders.length, ordersStats],
  )

  const recentOrders = useMemo(() => orders.slice(0, 6), [orders])

  const statusBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach((order) => {
      const label = statusLabel(order.status)
      map.set(label, (map.get(label) ?? 0) + 1)
    })
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1])
  }, [orders])

  const topRestaurants = useMemo(() => {
    const map = new Map<
      string,
      { name: string; total: number; commission: number; count: number }
    >()
    orders.forEach((order) => {
      const key = order.restaurantName || 'مطعم'
      const current =
        map.get(key) ?? { name: key, total: 0, commission: 0, count: 0 }
      current.total += order.total
      current.commission += order.commissionAmount
      current.count += 1
      map.set(key, current)
    })
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
  }, [orders])

  const reportsMetrics = useMemo(
    () => [
      {
        title: 'الطلبات المكتملة',
        value: `${ordersStats.deliveredCount} طلب`,
        note:
          ordersStats.monthlyDeliveredCount > 0
            ? `${ordersStats.monthlyDeliveredCount} خلال آخر 30 يوماً`
            : 'لا توجد طلبات مكتملة حديثاً',
      },
      {
        title: 'متوسط قيمة الطلب',
        value:
          ordersStats.deliveredCount > 0
            ? formatCurrency(
                ordersStats.totalGross / ordersStats.deliveredCount,
              )
            : '0.00 ر.س',
        note: 'بناءً على الطلبات المكتملة',
      },
      {
        title: 'الطلبات الملغاة',
        value: `${ordersStats.cancelledCount} طلب`,
        note:
          ordersStats.openCount > 0
            ? `${ordersStats.openCount} طلب مفتوح حالياً`
            : 'لا توجد طلبات مفتوحة',
      },
    ],
    [ordersStats],
  )

  const handleSubmitRequest = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!form.name.trim()) {
        setRequestAlert({ kind: 'error', message: 'يرجى إدخال اسم المطعم.' })
        return
      }

      setSavingRequest(true)
      try {
        await addDoc(collection(db, 'restaurantApplications'), {
          name: form.name.trim(),
          ownerName: form.owner.trim() || null,
          notes: form.notes.trim() || null,
          status: 'pending',
          createdAt: serverTimestamp(),
          createdBy: user?.uid ?? null,
          createdByEmail: user?.email ?? null,
        })

        setForm({ name: '', owner: '', notes: '' })
        setRequestAlert({
          kind: 'success',
          message: 'تم تسجيل طلب انضمام المطعم وسيتم مراجعته قريباً.',
        })
      } catch (error) {
        console.error('Failed to create restaurant application:', error)
        setRequestAlert({
          kind: 'error',
          message:
            'تعذر إنشاء الطلب. يرجى المحاولة لاحقاً أو التحقق من الصلاحيات.',
        })
      }
      setSavingRequest(false)
    },
    [form, user?.email, user?.uid],
  )

  const updateRequestStatus = useCallback(
    async (request: RestaurantRequest, status: RestaurantRequest['status']) => {
      setRequestActionId(request.id)
      setRequestAlert(null)
      try {
        await updateDoc(doc(db, 'restaurantApplications', request.id), {
          status,
          reviewedAt: serverTimestamp(),
          reviewedBy: user?.uid ?? null,
          reviewedByEmail: user?.email ?? null,
        })
        setRequestAlert({
          kind: 'success',
          message: `تم تحديث حالة طلب «${request.name}» إلى «${
            status === 'approved'
              ? 'تمت الموافقة'
              : status === 'rejected'
              ? 'مرفوض'
              : 'قيد المراجعة'
          }».`,
        })
      } catch (error) {
        console.error('Failed to update restaurant application:', error)
        setRequestAlert({
          kind: 'error',
          message:
            'تعذر تعديل حالة الطلب. تأكد من الصلاحيات وحاول مرة أخرى.',
        })
      }
      setRequestActionId(null)
    },
    [user?.email, user?.uid],
  )

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'commission':
        return (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border border-yellow-200 p-6">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                متابعة العمولة
              </h2>
              {ordersError && (
                <div className="mb-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 p-3 text-sm">
                  {ordersError}
                </div>
              )}
              {ordersLoading ? (
                <p className="text-sm text-gray-600">
                  جارِ تحميل بيانات الطلبات...
                </p>
              ) : (
                <>
                  <div className="grid gap-4 md:grid-cols-3">
                    {commissionCards.map((card) => (
                      <div
                        key={card.title}
                        className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4"
                      >
                        <p className="text-sm text-gray-600">{card.title}</p>
                        <p className="text-2xl font-bold text-primary mt-2">
                          {card.amount}
                        </p>
                        <p className="text-xs text-emerald-600 mt-1">
                          {card.note}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="mt-6 text-sm text-gray-700 leading-relaxed">
                    <p>
                      يتم احتساب عمولة المنصة بنسبة 15٪ من صافي قيمة الطلب قبل
                      رسوم التوصيل، ويتم إضافتها تلقائياً إلى إجمالي المبلغ
                      المدفوع من العميل.
                    </p>
                    <p className="mt-2">
                      إجمالي العمولات قيد المعالجة حالياً يبلغ{' '}
                      <span className="font-semibold text-primary">
                        {formatCurrency(ordersStats.pendingCommission)}
                      </span>
                      ، بينما حصة المطاعم غير المسددة تبلغ{' '}
                      <span className="font-semibold text-primary">
                        {formatCurrency(ordersStats.pendingPayout)}
                      </span>
                      .
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                أحدث الطلبات
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold">
                        الطلب
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        المطعم
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        الإجمالي
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        عمولة التطبيق
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        حصة المطعم
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        الحالة
                      </th>
                      <th className="px-4 py-3 text-right font-semibold">
                        التاريخ
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentOrders.map((order) => (
                      <tr key={order.id} className="hover:bg-yellow-50/60">
                        <td className="px-4 py-3 font-medium text-gray-900">
                          #{order.id.slice(-6)}
                        </td>
                        <td className="px-4 py-3 text-gray-700">
                          {order.restaurantName}
                        </td>
                        <td className="px-4 py-3 text-primary font-semibold">
                          {formatCurrency(order.total)}
                        </td>
                        <td className="px-4 py-3 text-rose-600 font-semibold">
                          {formatCurrency(order.commissionAmount)}
                        </td>
                        <td className="px-4 py-3 text-emerald-600 font-semibold">
                          {formatCurrency(order.baseAmount)}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadgeClass(
                              order.status,
                            )}`}
                          >
                            {statusLabel(order.status)}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">
                          {formatDate(order.createdAt)}
                        </td>
                      </tr>
                    ))}
                    {recentOrders.length === 0 && !ordersLoading && (
                      <tr>
                        <td
                          colSpan={7}
                          className="px-4 py-6 text-center text-gray-500"
                        >
                          لا توجد طلبات مسجلة بعد.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )
      case 'restaurants':
        return (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border border-yellow-200 p-6">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                إضافة مطعم جديد
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                سجلي بيانات المطعم للتواصل مع فريق الاعتماد. بعد الإرسال سيظهر
                الطلب تلقائياً في قائمة المتابعة بالأسفل.
              </p>
              {requestAlert && (
                <div
                  className={`mb-4 rounded-xl border p-3 text-sm ${
                    requestAlert.kind === 'success'
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                      : 'bg-rose-50 border-rose-200 text-rose-600'
                  }`}
                >
                  {requestAlert.message}
                </div>
              )}
              <form
                onSubmit={handleSubmitRequest}
                className="grid gap-4 md:grid-cols-2"
              >
                <div className="flex flex-col">
                  <label
                    className="text-sm font-medium text-primary mb-1"
                    htmlFor="restaurant-name"
                  >
                    اسم المطعم
                  </label>
                  <input
                    id="restaurant-name"
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, name: event.target.value }))
                    }
                    placeholder="مثال: سفرة البيت - فرع العليا"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col">
                  <label
                    className="text-sm font-medium text-primary mb-1"
                    htmlFor="restaurant-owner"
                  >
                    اسم المالك/المسؤول
                  </label>
                  <input
                    id="restaurant-owner"
                    type="text"
                    value={form.owner}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        owner: event.target.value,
                      }))
                    }
                    placeholder="اسم ممثل المطعم"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col md:col-span-2">
                  <label
                    className="text-sm font-medium text-primary mb-1"
                    htmlFor="restaurant-notes"
                  >
                    ملاحظات إضافية
                  </label>
                  <textarea
                    id="restaurant-notes"
                    rows={3}
                    value={form.notes}
                    onChange={(event) =>
                      setForm((prev) => ({
                        ...prev,
                        notes: event.target.value,
                      }))
                    }
                    placeholder="روابط المنيو، حسابات التواصل أو أي ملاحظات للمراجعة"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={savingRequest}
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-white text-sm font-semibold shadow-md transition hover:bg-primary/90 disabled:opacity-60"
                  >
                    {savingRequest ? 'جاري الحفظ...' : 'حفظ الطلب ومتابعته لاحقاً'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                طلبات المطاعم قيد المتابعة
              </h3>
              {requestsError && (
                <div className="mb-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 p-3 text-sm">
                  {requestsError}
                </div>
              )}
              {requestsLoading ? (
                <p className="text-sm text-gray-600">
                  جارِ تحميل طلبات الانضمام...
                </p>
              ) : requests.length === 0 ? (
                <p className="text-sm text-gray-600">
                  لا توجد طلبات انضمام مسجلة حالياً.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-right font-semibold">
                          المطعم
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          المالكة
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          الحالة
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          تاريخ الطلب
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          إجراءات
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {requests.map((request) => (
                        <tr key={request.id} className="hover:bg-yellow-50/60">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {request.name}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {request.ownerName ?? '—'}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-semibold ${requestBadgeClass(
                                request.status,
                              )}`}
                            >
                              {request.status === 'approved'
                                ? 'تمت الموافقة'
                                : request.status === 'rejected'
                                ? 'مرفوض'
                                : 'قيد المراجعة'}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDate(request.createdAt)}
                          </td>
                          <td className="px-4 py-3 space-y-1 md:space-y-0 md:space-x-1 md:space-x-reverse md:flex md:items-center">
                            <button
                              onClick={() => updateRequestStatus(request, 'approved')}
                              disabled={requestActionId === request.id}
                              className="px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-semibold hover:bg-emerald-600 transition disabled:opacity-60"
                            >
                              قبول
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request, 'rejected')}
                              disabled={requestActionId === request.id}
                              className="px-3 py-1 rounded-full bg-rose-500 text-white text-xs font-semibold hover:bg-rose-600 transition disabled:opacity-60"
                            >
                              رفض
                            </button>
                            <button
                              onClick={() => updateRequestStatus(request, 'pending')}
                              disabled={requestActionId === request.id}
                              className="px-3 py-1 rounded-full bg-gray-200 text-gray-700 text-xs font-semibold hover:bg-gray-300 transition disabled:opacity-60"
                            >
                              إعادة للمراجعة
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                قائمة المطاعم المسجلة
              </h3>
              {restaurantsLoading ? (
                <p className="text-sm text-gray-600">
                  جارِ تحميل بيانات المطاعم...
                </p>
              ) : restaurants.length === 0 ? (
                <p className="text-sm text-gray-600">
                  لم يتم تسجيل أي مطاعم حتى الآن.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-right font-semibold">
                          الاسم
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          المالكة
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          المدينة
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          الحالة
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          آخر تحديث
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {restaurants.map((restaurant) => (
                        <tr key={restaurant.id} className="hover:bg-yellow-50/60">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {restaurant.name}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {restaurant.ownerName ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {restaurant.city ?? '—'}
                          </td>
                          <td className="px-4 py-3 text-primary font-semibold">
                            {restaurant.statusLabel}
                          </td>
                          <td className="px-4 py-3 text-gray-500">
                            {formatDate(restaurant.createdAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )
      case 'reports':
        return (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border border-yellow-200 p-6">
              <h2 className="text-2xl font-semibold text-primary mb-4">
                الملخص التحليلي
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {reportsMetrics.map((metric) => (
                  <div
                    key={metric.title}
                    className="rounded-2xl border border-gray-200 p-4 bg-gray-50"
                  >
                    <p className="text-sm text-gray-500">{metric.title}</p>
                    <p className="text-2xl font-bold text-primary mt-2">
                      {metric.value}
                    </p>
                    <p className="text-xs text-emerald-600 mt-1">{metric.note}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                توزيع حالات الطلبات
              </h3>
              {statusBreakdown.length === 0 ? (
                <p className="text-sm text-gray-600">
                  لم يتم تسجيل أي طلبات حتى الآن.
                </p>
              ) : (
                <ul className="space-y-2 text-sm text-gray-700">
                  {statusBreakdown.map(([label, count]) => (
                    <li
                      key={label}
                      className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3"
                    >
                      <span>{label}</span>
                      <span className="font-semibold text-primary">
                        {count} طلب
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">
                أفضل المطاعم أداءً
              </h3>
              {topRestaurants.length === 0 ? (
                <p className="text-sm text-gray-600">
                  لا تتوفر بيانات كافية لعرض الترتيب.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200 text-sm">
                    <thead className="bg-gray-50 text-gray-600">
                      <tr>
                        <th className="px-4 py-3 text-right font-semibold">
                          المطعم
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          عدد الطلبات
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          إجمالي المبيعات
                        </th>
                        <th className="px-4 py-3 text-right font-semibold">
                          عمولة التطبيق
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {topRestaurants.map((entry) => (
                        <tr key={entry.name} className="hover:bg-yellow-50/60">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {entry.name}
                          </td>
                          <td className="px-4 py-3 text-gray-700">
                            {entry.count}
                          </td>
                          <td className="px-4 py-3 text-primary font-semibold">
                            {formatCurrency(entry.total)}
                          </td>
                          <td className="px-4 py-3 text-rose-600 font-semibold">
                            {formatCurrency(entry.commission)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        )
      default:
        return (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {overviewHighlights.map((highlight) => (
                <div
                  key={highlight.title}
                  className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200"
                >
                  <h2 className="text-xl font-semibold text-primary mb-2">
                    {highlight.title}
                  </h2>
                  <p className="text-3xl font-bold text-primary/90">
                    {highlight.value}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">{highlight.note}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-3">
                مهام اليوم
              </h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>
                  • {ordersStats.openCount > 0
                    ? 'راجعي الطلبات المفتوحة وحدثي حالاتها.'
                    : 'لا توجد طلبات مفتوحة تنتظر المراجعة.'}
                </li>
                <li>
                  • {pendingRequestsCount > 0
                    ? `هناك ${pendingRequestsCount} طلب انضمام بحاجة لاعتماد.`
                    : 'تمت مراجعة جميع طلبات الانضمام.'}
                </li>
                <li>
                  • تابعي أداء المطاعم وراجعي التقارير للتأكد من استقرار الخدمة.
                </li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 text-center">
              * يمكن ربط هذه الواجهة لاحقاً بعمليات أتمتة إضافية لتحديث حالة
              المطاعم وإرسال إشعارات فورية للمشرفات.
            </p>
          </section>
        )
    }
  }

  return (
    <div className="space-y-6">
      <header className="bg-primary text-white p-6 rounded-3xl shadow-lg text-center">
        <h1 className="text-3xl font-bold">لوحة تحكم المشرفات</h1>
        <p className="text-lg text-accent/90 mt-2">
          أهلاً {user?.email ?? 'بك'}! يمكنك إدارة التطبيق من هنا.
        </p>
      </header>

      <nav className="bg-white rounded-3xl shadow-md border border-yellow-200 p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-primary bg-primary text-white shadow-lg'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/60 hover:text-primary'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span>{tab.label}</span>
                  <span className="text-[11px] font-normal opacity-80">
                    {tab.description}
                  </span>
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {renderActiveTab()}
    </div>
  )
}
