import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore'

import { useAuth } from '@/auth'
import { db } from '@/firebase'
import { DEVELOPER_ACCESS_SESSION_KEY, developerAccessCode } from '@/config'
import { usePlatformSettings } from '@/context/PlatformSettingsContext'

const managedCollections = ['users', 'restaurants', 'menuItems', 'orders', 'supervisors', 'restaurantRequests', 'reports']

type Restaurant = {
  id: string
  name: string
  city?: string
  supervisorId?: string
  supervisorEmail?: string
  status?: string
}

type Supervisor = {
  id: string
  name?: string
  email?: string
}

type Report = {
  id: string
  message: string
  supervisorEmail?: string | null
  status?: string
  createdAt?: Date | null
}

type RestaurantRequest = {
  id: string
  name: string
  city?: string
  location?: string
  status?: string
  supervisorEmail?: string | null
  createdAt?: Date | null
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

export const Developer: React.FC = () => {
  const { user } = useAuth()
  const { commissionRate, updateCommissionRate } = usePlatformSettings()

  const [hasAccess, setHasAccess] = useState<boolean>(() => !developerAccessCode)
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState<string | null>(null)

  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [supervisors, setSupervisors] = useState<Supervisor[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [requests, setRequests] = useState<RestaurantRequest[]>([])
  const [usersByRole, setUsersByRole] = useState<Record<string, number>>({})
  const [explorerCollection, setExplorerCollection] = useState(managedCollections[0])
  const [explorerDocs, setExplorerDocs] = useState<Array<{ id: string; data: Record<string, unknown> }>>([])
  const [explorerLoading, setExplorerLoading] = useState(false)

  const [newRestaurantName, setNewRestaurantName] = useState('')
  const [newRestaurantCity, setNewRestaurantCity] = useState('')
  const [newRestaurantSupervisor, setNewRestaurantSupervisor] = useState('')
  const [savingRestaurant, setSavingRestaurant] = useState(false)
  const [savingRate, setSavingRate] = useState(false)

  useEffect(() => {
    if (!developerAccessCode) {
      setHasAccess(true)
      return
    }
    try {
      if (window.sessionStorage.getItem(DEVELOPER_ACCESS_SESSION_KEY) === 'granted') {
        setHasAccess(true)
      }
    } catch (error) {
      console.warn('تعذّر قراءة جلسة المطور:', error)
    }
  }, [])

  const verifyAccess = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!developerAccessCode) {
        setHasAccess(true)
        return
      }
      if (accessCode.trim() === developerAccessCode) {
        try {
          window.sessionStorage.setItem(DEVELOPER_ACCESS_SESSION_KEY, 'granted')
        } catch (error) {
          console.warn('تعذّر حفظ جلسة المطور:', error)
        }
        setHasAccess(true)
        setAccessError(null)
      } else {
        setAccessError('الرمز المدخل غير صحيح.')
      }
    },
    [accessCode],
  )

  useEffect(() => {
    if (!hasAccess) return
    const unsubscribe = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      setRestaurants(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            name: String(data.name ?? 'مطعم'),
            city: typeof data.city === 'string' ? data.city : undefined,
            status: typeof data.status === 'string' ? data.status : undefined,
            supervisorId: typeof data.supervisorId === 'string' ? data.supervisorId : undefined,
            supervisorEmail: typeof data.supervisorEmail === 'string' ? data.supervisorEmail : undefined,
          }
        }),
      )
    })
    return () => unsubscribe()
  }, [hasAccess])

  useEffect(() => {
    if (!hasAccess) return
    const unsubscribe = onSnapshot(collection(db, 'supervisors'), (snapshot) => {
      setSupervisors(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            name: typeof data.name === 'string' ? data.name : undefined,
            email: typeof data.email === 'string' ? data.email : undefined,
          }
        }),
      )
    })
    return () => unsubscribe()
  }, [hasAccess])

  useEffect(() => {
    if (!hasAccess) return
    const reportsQuery = query(collection(db, 'reports'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(reportsQuery, (snapshot) => {
      setReports(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            message: String(data.message ?? ''),
            supervisorEmail: typeof data.supervisorEmail === 'string' ? data.supervisorEmail : undefined,
            status: typeof data.status === 'string' ? data.status : 'pending',
            createdAt: toDate(data.createdAt),
          }
        }),
      )
    })
    return () => unsubscribe()
  }, [hasAccess])

  useEffect(() => {
    if (!hasAccess) return
    const requestQuery = query(collection(db, 'restaurantRequests'), orderBy('createdAt', 'desc'))
    const unsubscribe = onSnapshot(requestQuery, (snapshot) => {
      setRequests(
        snapshot.docs.map((document) => {
          const data = document.data() as Record<string, unknown>
          return {
            id: document.id,
            name: String(data.name ?? 'طلب جديد'),
            city: typeof data.city === 'string' ? data.city : undefined,
            location: typeof data.location === 'string' ? data.location : undefined,
            status: typeof data.status === 'string' ? data.status : 'pending',
            supervisorEmail: typeof data.supervisorEmail === 'string' ? data.supervisorEmail : undefined,
            createdAt: toDate(data.createdAt),
          }
        }),
      )
    })
    return () => unsubscribe()
  }, [hasAccess])

  useEffect(() => {
    if (!hasAccess) return
    void getDocs(collection(db, 'users')).then((snapshot) => {
      const counts: Record<string, number> = {}
      snapshot.forEach((document) => {
        const role = String((document.data() as Record<string, unknown>).role ?? 'unknown')
        counts[role] = (counts[role] ?? 0) + 1
      })
      setUsersByRole(counts)
    })
  }, [hasAccess])

  const refreshExplorer = useCallback(async () => {
    if (!explorerCollection) return
    setExplorerLoading(true)
    try {
      const snapshot = await getDocs(collection(db, explorerCollection))
      setExplorerDocs(
        snapshot.docs.slice(0, 10).map((document) => ({
          id: document.id,
          data: document.data() as Record<string, unknown>,
        })),
      )
    } catch (error) {
      console.error('فشل في تحميل بيانات المستكشف:', error)
      setExplorerDocs([])
    } finally {
      setExplorerLoading(false)
    }
  }, [explorerCollection])

  useEffect(() => {
    if (hasAccess) {
      void refreshExplorer()
    }
  }, [hasAccess, explorerCollection, refreshExplorer])

  const handleCreateRestaurant = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!newRestaurantName.trim()) return
    setSavingRestaurant(true)
    try {
      const payload: Record<string, unknown> = {
        name: newRestaurantName.trim(),
        city: newRestaurantCity.trim() || null,
        status: 'active',
        createdAt: serverTimestamp(),
      }
      if (newRestaurantSupervisor) {
        payload.supervisorId = newRestaurantSupervisor
        const supervisor = supervisors.find((s) => s.id === newRestaurantSupervisor)
        payload.supervisorEmail = supervisor?.email ?? null
      }
      await addDoc(collection(db, 'restaurants'), payload)
      setNewRestaurantName('')
      setNewRestaurantCity('')
      setNewRestaurantSupervisor('')
    } catch (error) {
      console.error('فشل في إنشاء المطعم:', error)
      alert('تعذر إنشاء المطعم، يرجى المحاولة مرة أخرى.')
    } finally {
      setSavingRestaurant(false)
    }
  }

  const handleDeleteRestaurant = async (id: string) => {
    if (!confirm('هل تريد حذف هذا المطعم مع جميع بياناته؟')) return
    try {
      await deleteDoc(doc(db, 'restaurants', id))
    } catch (error) {
      console.error('فشل في حذف المطعم:', error)
      alert('تعذر حذف المطعم حالياً.')
    }
  }

  const handleAssignSupervisor = async (restaurantId: string, supervisorId: string) => {
    try {
      const supervisor = supervisors.find((s) => s.id === supervisorId)
      await updateDoc(doc(db, 'restaurants', restaurantId), {
        supervisorId,
        supervisorEmail: supervisor?.email ?? null,
        updatedAt: serverTimestamp(),
      })
      if (supervisor) {
        await setDoc(
          doc(db, 'supervisors', supervisorId),
          {
            email: supervisor.email ?? null,
            name: supervisor.name ?? null,
            updatedAt: serverTimestamp(),
          },
          { merge: true },
        )
      }
    } catch (error) {
      console.error('فشل في ربط المطعم بالمشرف:', error)
      alert('تعذر تحديث المشرف للمطعم.')
    }
  }

  const handleResolveReport = async (id: string) => {
    try {
      await updateDoc(doc(db, 'reports', id), {
        status: 'resolved',
        resolvedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('فشل في تحديث التقرير:', error)
      alert('تعذر تحديث حالة التقرير.')
    }
  }

  const handleRequestStatus = async (request: RestaurantRequest, action: 'approve' | 'archive') => {
    try {
      if (action === 'approve') {
        await addDoc(collection(db, 'restaurants'), {
          name: request.name,
          city: request.city ?? null,
          status: 'pending-setup',
          createdAt: serverTimestamp(),
        })
      }
      await updateDoc(doc(db, 'restaurantRequests', request.id), {
        status: action === 'approve' ? 'completed' : 'archived',
        updatedAt: serverTimestamp(),
      })
    } catch (error) {
      console.error('فشل في تحديث طلب المطعم:', error)
      alert('تعذر تحديث حالة الطلب.')
    }
  }

  const saveCommissionRate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSavingRate(true)
    try {
      const formData = new FormData(event.currentTarget)
      const value = Number(formData.get('commission'))
      await updateCommissionRate(value)
    } catch (error) {
      console.error('فشل في تحديث نسبة التطبيق:', error)
      alert('تعذر حفظ النسبة الجديدة.')
    } finally {
      setSavingRate(false)
    }
  }

  const stats = useMemo(() => ({
    restaurants: restaurants.length,
    supervisors: supervisors.length,
    reports: reports.length,
  }), [restaurants.length, supervisors.length, reports.length])

  if (!hasAccess) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md flex-col justify-center gap-4 rounded-3xl bg-white p-8 text-slate-900 shadow-xl">
        <h1 className="text-center text-xl font-bold text-slate-900">الوصول إلى لوحة المطور</h1>
        <p className="text-sm text-slate-600 text-center">أدخل الرمز السري المؤقت للوصول إلى أدوات التطوير.</p>
        {accessError && <div className="rounded-xl bg-rose-100 px-4 py-2 text-center text-sm text-rose-600">{accessError}</div>}
        <form onSubmit={verifyAccess} className="space-y-3 text-right">
          <input
            type="password"
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="الرمز السري"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
          />
          <button type="submit" className="w-full rounded-xl bg-slate-900 py-3 text-sm font-semibold text-white">
            متابعة
          </button>
        </form>
      </div>
    )
  }

  return (
    <div className="space-y-8 text-slate-900">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-bold">لوحة المطور</h1>
        <p className="text-sm text-slate-600">
          إدارة المطاعم والمشرفين والمستخدمين، التحكم بنسبة التطبيق، ومعالجة التقارير الواردة من المشرفين.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">عدد المطاعم</div>
          <div className="text-2xl font-semibold">{stats.restaurants}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">عدد المشرفين</div>
          <div className="text-2xl font-semibold">{stats.supervisors}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">عدد التقارير المفتوحة</div>
          <div className="text-2xl font-semibold">{reports.filter((report) => report.status !== 'resolved').length}</div>
        </div>
        <div className="rounded-2xl bg-white p-4 shadow">
          <div className="text-xs text-slate-500">المستخدمون بحسب الدور</div>
          <div className="text-xs text-slate-600">
            {Object.entries(usersByRole).map(([role, count]) => (
              <div key={role}>{role}: {count}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <form onSubmit={handleCreateRestaurant} className="space-y-3 rounded-2xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold text-slate-900">➕ إضافة مطعم</h2>
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="اسم المطعم"
            value={newRestaurantName}
            onChange={(event) => setNewRestaurantName(event.target.value)}
            required
            disabled={savingRestaurant}
          />
          <input
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            placeholder="المدينة (اختياري)"
            value={newRestaurantCity}
            onChange={(event) => setNewRestaurantCity(event.target.value)}
            disabled={savingRestaurant}
          />
          <select
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
            value={newRestaurantSupervisor}
            onChange={(event) => setNewRestaurantSupervisor(event.target.value)}
            disabled={savingRestaurant}
          >
            <option value="">اختيار مشرف (اختياري)</option>
            {supervisors.map((supervisor) => (
              <option key={supervisor.id} value={supervisor.id}>
                {supervisor.name ?? supervisor.email ?? supervisor.id}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={savingRestaurant}
            className="rounded-xl bg-yellow-400 px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-yellow-500 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {savingRestaurant ? 'جارٍ الحفظ...' : 'حفظ المطعم'}
          </button>
        </form>

        <form onSubmit={saveCommissionRate} className="space-y-3 rounded-2xl bg-white p-5 shadow">
          <h2 className="text-lg font-semibold text-slate-900">⚙️ إعداد نسبة التطبيق</h2>
          <p className="text-sm text-slate-600">النسبة الحالية {commissionRate * 100}%</p>
          <input
            name="commission"
            type="number"
            min={0}
            max={1}
            step={0.01}
            defaultValue={commissionRate}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
          />
          <button
            type="submit"
            disabled={savingRate}
            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {savingRate ? 'جارٍ التحديث...' : 'تحديث النسبة'}
          </button>
        </form>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">🍽️ إدارة المطاعم</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {restaurants.map((restaurant) => (
            <div key={restaurant.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <div>
                <div className="text-lg font-semibold text-slate-900">{restaurant.name}</div>
                <div className="text-xs text-slate-500">
                  {restaurant.city ? `📍 ${restaurant.city}` : 'بدون تحديد مدينة'}
                </div>
                <div className="text-xs text-slate-500">
                  المشرف الحالي: {restaurant.supervisorEmail ?? restaurant.supervisorId ?? 'غير مرتبط'}
                </div>
              </div>
              <select
                className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
                value={restaurant.supervisorId ?? ''}
                onChange={(event) => handleAssignSupervisor(restaurant.id, event.target.value)}
              >
                <option value="">اختر مشرفاً</option>
                {supervisors.map((supervisor) => (
                  <option key={supervisor.id} value={supervisor.id}>
                    {supervisor.name ?? supervisor.email ?? supervisor.id}
                  </option>
                ))}
              </select>
              <button
                onClick={() => handleDeleteRestaurant(restaurant.id)}
                className="rounded-xl bg-rose-500 px-3 py-2 text-xs font-semibold text-white hover:bg-rose-600"
              >
                حذف المطعم
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">📨 طلبات المشرفين</h2>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {requests.map((request) => (
            <div key={request.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <div>
                <div className="text-lg font-semibold text-slate-900">{request.name}</div>
                {request.city && <div className="text-xs text-slate-500">📍 {request.city}</div>}
                {request.location && <div className="text-xs text-slate-500">📌 {request.location}</div>}
                <div className="text-xs text-slate-500">الحالة: {request.status}</div>
                {request.supervisorEmail && (
                  <div className="text-xs text-slate-500">من: {request.supervisorEmail}</div>
                )}
              </div>
              <div className="flex gap-2 text-xs">
                <button
                  onClick={() => handleRequestStatus(request, 'approve')}
                  className="flex-1 rounded-xl bg-emerald-500 px-3 py-2 font-semibold text-white hover:bg-emerald-600"
                >
                  إنشاء مطعم
                </button>
                <button
                  onClick={() => handleRequestStatus(request, 'archive')}
                  className="flex-1 rounded-xl bg-slate-200 px-3 py-2 font-semibold text-slate-700 hover:bg-slate-300"
                >
                  أرشفة
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">📝 تقارير المشرفين</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {reports.map((report) => (
            <div key={report.id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow">
              <div className="text-sm text-slate-800">{report.message}</div>
              <div className="text-xs text-slate-500">
                {report.supervisorEmail && <div>من: {report.supervisorEmail}</div>}
                <div>الحالة: {report.status}</div>
                <div>{report.createdAt ? report.createdAt.toLocaleString('ar-SA') : '—'}</div>
              </div>
              {report.status !== 'resolved' && (
                <button
                  onClick={() => handleResolveReport(report.id)}
                  className="rounded-xl bg-emerald-500 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-600"
                >
                  تمييز كمكتمل
                </button>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">🗂️ مستكشف البيانات</h2>
        <div className="flex flex-wrap items-center gap-2">
          {managedCollections.map((name) => (
            <button
              key={name}
              onClick={() => setExplorerCollection(name)}
              className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
                explorerCollection === name ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {name}
            </button>
          ))}
          <button
            onClick={refreshExplorer}
            className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
          >
            تحديث
          </button>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow text-xs text-slate-700">
          {explorerLoading ? (
            <div>جارِ التحميل...</div>
          ) : explorerDocs.length === 0 ? (
            <div>لا توجد مستندات في هذه المجموعة.</div>
          ) : (
            <pre className="whitespace-pre-wrap break-words text-[11px]">
              {JSON.stringify(explorerDocs, null, 2)}
            </pre>
          )}
        </div>
      </section>
    </div>
  )
}

export default Developer
