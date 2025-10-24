import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '@/auth'
import {
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signOut } from 'firebase/auth'
import { db, getAdminProvisioningAuth } from '@/firebase'

type Tab = 'overview' | 'restaurants' | 'commission'

type Restaurant = {
  id: string
  name?: string
  ownerEmail?: string
  managerName?: string
  city?: string
  createdAt?: any
}

type Order = {
  id: string
  total?: number
  status?: string
  createdAt?: any
  customerName?: string
  address?: string
  items?: { name: string; qty: number }[]
}

type MenuItem = {
  id: string
  name: string
  price: number
  available?: boolean
}

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<Tab>('restaurants')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loadingRestaurants, setLoadingRestaurants] = useState(true)
  const [detailsLoading, setDetailsLoading] = useState(false)
  const [detailsError, setDetailsError] = useState<string | null>(null)
  const [ordersByRestaurant, setOrdersByRestaurant] = useState<Record<string, Order[]>>({})
  const [menusByRestaurant, setMenusByRestaurant] = useState<Record<string, MenuItem[]>>({})
  const [form, setForm] = useState({
    restaurantName: '',
    ownerName: '',
    ownerEmail: '',
    ownerPassword: '',
  })
  const [creating, setCreating] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [recentCredentials, setRecentCredentials] = useState<{ restaurant: string; email: string; password: string } | null>(null)

  useEffect(() => {
    if (!user) return

    setLoadingRestaurants(true)
    const q = query(collection(db, 'restaurants'), where('createdByAdmin', '==', user.uid))
    const unsub = onSnapshot(q, (snap) => {
      const data: Restaurant[] = snap.docs.map((docSnap) => {
        const payload = docSnap.data() as Restaurant
        return { ...payload, id: docSnap.id }
      })
      setRestaurants(data)
      setLoadingRestaurants(false)
    })

    return () => unsub()
  }, [user])

  useEffect(() => {
    let active = true
    const fetchDetails = async () => {
      if (!restaurants.length) {
        setOrdersByRestaurant({})
        setMenusByRestaurant({})
        setDetailsError(null)
        return
      }
      setDetailsLoading(true)
      setDetailsError(null)
      try {
        const ordersEntries = await Promise.all(
          restaurants.map(async (rest) => {
            const ordersSnap = await getDocs(
              query(
                collection(db, 'orders'),
                where('restaurantId', '==', rest.id),
                orderBy('createdAt', 'desc'),
                limit(10)
              )
            )
            const orders: Order[] = ordersSnap.docs.map((d) => {
              const payload = d.data() as Order
              return { ...payload, id: d.id }
            })
            return [rest.id, orders] as const
          })
        )

        const menusEntries = await Promise.all(
          restaurants.map(async (rest) => {
            const menuSnap = await getDocs(
              query(collection(db, 'menuItems'), where('ownerId', '==', rest.id), orderBy('name', 'asc'))
            )
            const menu: MenuItem[] = menuSnap.docs.map((d) => {
              const payload = d.data() as MenuItem
              return { ...payload, id: d.id }
            })
            return [rest.id, menu] as const
          })
        )

        if (!active) return
        setOrdersByRestaurant(Object.fromEntries(ordersEntries))
        setMenusByRestaurant(Object.fromEntries(menusEntries))
      } catch (error) {
        if (!active) return
        console.error('Failed to load restaurant insights', error)
        setDetailsError('تعذّر تحديث بيانات الطلبات أو القوائم في الوقت الحالي. يرجى المحاولة لاحقاً.')
      } finally {
        if (active) setDetailsLoading(false)
      }
    }

    fetchDetails()
    return () => {
      active = false
    }
  }, [restaurants])

  const totalRestaurants = restaurants.length
  const totalOrders = useMemo(
    () => Object.values(ordersByRestaurant).reduce((sum, list) => sum + list.length, 0),
    [ordersByRestaurant]
  )

  const formatDate = (value?: any) => {
    if (!value) return '—'
    try {
      const date = 'toDate' in value ? value.toDate() : new Date(value)
      return new Intl.DateTimeFormat('ar-SA', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(date)
    } catch (err) {
      return '—'
    }
  }

  const resetForm = () => {
    setForm({ restaurantName: '', ownerName: '', ownerEmail: '', ownerPassword: '' })
    setFormError(null)
  }

  const handleCreateRestaurant = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      setFormError('يجب تسجيل الدخول كمشرفة.')
      return
    }

    if (!form.restaurantName.trim() || !form.ownerEmail.trim() || !form.ownerPassword.trim()) {
      setFormError('يرجى تعبئة اسم المطعم، البريد الإلكتروني وكلمة المرور.')
      return
    }

    if (form.ownerPassword.trim().length < 6) {
      setFormError('كلمة المرور يجب أن تكون 6 أحرف على الأقل.')
      return
    }

    setCreating(true)
    setFormError(null)

    const provisioningAuth = getAdminProvisioningAuth()
    const sanitizedEmail = form.ownerEmail.trim().toLowerCase()
    const trimmedRestaurantName = form.restaurantName.trim()
    const trimmedOwnerName = form.ownerName.trim()

    try {
      const existingOwner = await getDocs(
        query(collection(db, 'users'), where('email', '==', sanitizedEmail), limit(1))
      )

      if (!existingOwner.empty) {
        setFormError('يوجد حساب مُسبق بهذا البريد الإلكتروني. يرجى استخدام بريد آخر أو تحديث الحساب الحالي.')
        return
      }

      const credential = await createUserWithEmailAndPassword(
        provisioningAuth,
        sanitizedEmail,
        form.ownerPassword.trim()
      )

      const ownerId = credential.user.uid

      await setDoc(doc(db, 'users', ownerId), {
        role: 'owner',
        email: sanitizedEmail,
        name: trimmedOwnerName,
        restaurantName: trimmedRestaurantName,
        createdByAdmin: user.uid,
        createdAt: serverTimestamp(),
      })

      await setDoc(
        doc(db, 'restaurants', ownerId),
        {
          name: trimmedRestaurantName,
          ownerEmail: sanitizedEmail,
          managerName: trimmedOwnerName,
          ownerId,
          createdByAdmin: user.uid,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      )

      setRecentCredentials({
        restaurant: trimmedRestaurantName,
        email: sanitizedEmail,
        password: form.ownerPassword.trim(),
      })

      resetForm()
    } catch (err: any) {
      setFormError(err.message ?? 'تعذّر إنشاء حساب المطعم. يرجى المحاولة من جديد.')
    } finally {
      await signOut(provisioningAuth).catch(() => undefined)
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <header className="bg-primary text-white p-6 rounded-3xl shadow-lg text-center">
        <h1 className="text-3xl font-bold">لوحة تحكم المشرفات</h1>
        <p className="text-lg text-accent/90 mt-2">أهلاً {user?.email ?? 'بك'}! يمكنك إدارة المنصة من هنا.</p>
      </header>

      <div className="flex flex-wrap gap-3 justify-center">
        {[
          { key: 'overview' as Tab, label: 'نظرة عامة' },
          { key: 'restaurants' as Tab, label: 'إدارة المطاعم' },
          { key: 'commission' as Tab, label: 'عمولتي' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-full font-semibold transition border ${
              activeTab === tab.key
                ? 'bg-yellow-400 text-slate-900 border-yellow-500 shadow-lg'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-yellow-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'overview' && (
        <section className="grid gap-4 md:grid-cols-3">
          <article className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
            <h2 className="text-xl font-semibold text-primary mb-2">عدد المطاعم المرتبطة</h2>
            <p className="text-4xl font-extrabold text-gray-900">{totalRestaurants}</p>
          </article>
          <article className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
            <h2 className="text-xl font-semibold text-primary mb-2">إجمالي الطلبات</h2>
            <p className="text-4xl font-extrabold text-gray-900">{totalOrders}</p>
          </article>
          <article className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
            <h2 className="text-xl font-semibold text-primary mb-2">آخر تحديث للبيانات</h2>
            <p className="text-sm text-gray-600">{formatDate(new Date())}</p>
          </article>
        </section>
      )}

      {activeTab === 'restaurants' && (
        <section className="space-y-6">
          <div className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
            <h2 className="text-2xl font-bold text-primary mb-4">تسجيل مطعم جديد</h2>
            <p className="text-sm text-gray-600 mb-6">
              أدخلي بيانات صاحب المطعم، وسيتم إنشاء حساب جاهز له مع ربطه بلوحة التحكم الخاصة به.
            </p>

            {formError && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-600 p-3 text-sm">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateRestaurant} className="grid gap-4 md:grid-cols-2">
              <input
                type="text"
                value={form.restaurantName}
                onChange={(e) => setForm((prev) => ({ ...prev, restaurantName: e.target.value }))}
                placeholder="اسم المطعم"
                className="rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <input
                type="text"
                value={form.ownerName}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerName: e.target.value }))}
                placeholder="اسم صاحب المطعم (اختياري)"
                className="rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <input
                type="email"
                value={form.ownerEmail}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerEmail: e.target.value }))}
                placeholder="البريد الإلكتروني لصاحب المطعم"
                className="rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <input
                type="password"
                value={form.ownerPassword}
                onChange={(e) => setForm((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                placeholder="كلمة المرور المخصصة لصاحب المطعم"
                className="rounded-xl border border-gray-200 p-3 focus:outline-none focus:ring-2 focus:ring-yellow-400"
              />
              <div className="md:col-span-2 flex justify-end">
                <button
                  type="submit"
                  disabled={creating}
                  className="px-6 py-3 rounded-2xl bg-yellow-500 hover:bg-yellow-600 text-black font-bold shadow-md transition disabled:opacity-60"
                >
                  {creating ? 'جارٍ إنشاء الحساب...' : 'حفظ الحساب الجديد'}
                </button>
              </div>
            </form>

            {recentCredentials && (
              <div className="mt-6 rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-700 text-sm space-y-1">
                <p className="font-semibold">تم إنشاء الحساب بنجاح 🎉</p>
                <p>المطعم: {recentCredentials.restaurant}</p>
                <p>البريد: {recentCredentials.email}</p>
                <p>كلمة المرور: {recentCredentials.password}</p>
                <p className="text-xs text-emerald-600/70">رجاءً شاركي هذه البيانات مع صاحب المطعم لتفعيل دخوله.</p>
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-primary">المطاعم التابعة لك</h3>

            {loadingRestaurants && <div className="text-gray-600">جارٍ تحميل قائمة المطاعم...</div>}

            {detailsError && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-600">
                {detailsError}
              </div>
            )}

            {!loadingRestaurants && restaurants.length === 0 && (
              <div className="text-gray-600 bg-white rounded-3xl border border-dashed border-gray-300 p-6 text-center">
                لم تقومي بإضافة أي مطعم بعد.
              </div>
            )}

            {restaurants.map((rest) => {
              const orders = ordersByRestaurant[rest.id] ?? []
              const menu = menusByRestaurant[rest.id] ?? []

              return (
                <article key={rest.id} className="bg-white rounded-3xl shadow-md border border-yellow-100 p-6 space-y-4">
                  <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                    <div>
                      <h4 className="text-xl font-bold text-primary">{rest.name ?? 'مطعم بدون اسم'}</h4>
                      <p className="text-sm text-gray-600">صاحبة الحساب: {rest.ownerEmail ?? '—'}</p>
                      {rest.city && <p className="text-sm text-gray-500">المدينة: {rest.city}</p>}
                    </div>
                    <div className="text-sm text-gray-500">
                      تم الإضافة: {formatDate(rest.createdAt)}
                    </div>
                  </header>

                  <div className="grid gap-4 md:grid-cols-2">
                    <section className="bg-yellow-50 rounded-2xl p-4 border border-yellow-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-lg font-semibold text-primary">الطلبات ({orders.length})</h5>
                        {detailsLoading && <span className="text-xs text-yellow-600">تحديث...</span>}
                      </div>
                      {orders.length === 0 && <p className="text-sm text-gray-600">لا توجد طلبات مسجلة لهذا المطعم حالياً.</p>}
                      {orders.map((order) => (
                        <div key={order.id} className="rounded-xl bg-white p-3 shadow-sm border border-yellow-100 text-sm space-y-1">
                          <div className="font-semibold">#{order.id.slice(-6)} — {order.total?.toFixed?.(2) ?? '0.00'} ر.س</div>
                          <div className="text-gray-600">الحالة: {order.status ?? 'غير محددة'}</div>
                          {order.items && order.items.length > 0 && (
                            <div className="text-gray-500">
                              {order.items.map((item) => `${item.name} × ${item.qty}`).join('، ')}
                            </div>
                          )}
                          {order.address && <div className="text-gray-400">العنوان: {order.address}</div>}
                          <div className="text-xs text-gray-400">أضيف في {formatDate(order.createdAt)}</div>
                        </div>
                      ))}
                    </section>

                    <section className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <h5 className="text-lg font-semibold text-slate-800">قائمة المطعم ({menu.length})</h5>
                        {detailsLoading && <span className="text-xs text-slate-500">تحديث...</span>}
                      </div>
                      {menu.length === 0 && <p className="text-sm text-gray-600">لم تتم إضافة أصناف حتى الآن.</p>}
                      {menu.map((item) => (
                        <div key={item.id} className="rounded-xl bg-white p-3 shadow-sm border border-slate-100 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-semibold text-slate-800">{item.name}</div>
                            <div className="text-xs text-gray-500">{item.available === false ? 'غير متاح' : 'متاح'}</div>
                          </div>
                          <div className="font-bold text-slate-900">{item.price?.toFixed?.(2) ?? '0.00'} ر.س</div>
                        </div>
                      ))}
                    </section>
                  </div>
                </article>
              )
            })}
          </div>
        </section>
      )}

      {activeTab === 'commission' && (
        <section className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200 space-y-4">
          <h2 className="text-2xl font-bold text-primary">عمولتي</h2>
          <p className="text-gray-600">
            سيتم إضافة حاسبة العمولة هنا قريباً لتتبع أرباحك من كل مطعم. في الوقت الحالي يمكنك الاستعانة بقائمة الطلبات
            لمعرفة حجم المبيعات لكل مطعم، وسنقوم لاحقاً بتفعيل خيار تحديد نسبة العمولة آلياً.
          </p>
          <div className="rounded-2xl bg-yellow-50 border border-yellow-200 p-4 text-sm text-yellow-700">
            نصيحة: احتفظي ببيانات المطاعم المضافة وقيمة طلباتهم لتسهيل ضبط العمولة فور تفعيلها.
          </div>
        </section>
      )}
    </div>
  )
}
