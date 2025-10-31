// src/pages/MenuPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { db } from '@/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'
import { useCart } from '@/hooks/useCart'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth'

type Item = {
  id: string
  name: string
  desc?: string
  price: number
  imageUrl?: string
  available: boolean
  categoryId?: string
  ownerId?: string
  featured?: boolean
}

type RestaurantRecord = {
  id: string
  name: string
  logoUrl?: string
  city?: string
  description?: string
  bannerUrl?: string
}

type GroupedMenu = {
  ownerId: string
  restaurant?: RestaurantRecord
  items: Item[]
}

const UNASSIGNED_KEY = '__unassigned__'

export const MenuPage: React.FC = () => {
  const [items, setItems] = useState<Item[]>([])
  const [restaurantsMap, setRestaurantsMap] = useState<Record<string, RestaurantRecord>>({})
  const [restaurantsLoaded, setRestaurantsLoaded] = useState(false)
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const {
    add,
    subtotal,
    items: cartItems,
    applicationFeePerItem,
    getUnitPriceWithFees,
    totalWithFees,
  } = useCart()
  const { role } = useAuth()

  const selectedRestaurantId = useMemo(
    () => searchParams.get('restaurant') || undefined,
    [searchParams]
  )

  useEffect(() => {
    let active = true
    const loadRestaurants = async () => {
      try {
        const snap = await getDocs(collection(db, 'restaurants'))
        if (!active) return
        const map: Record<string, RestaurantRecord> = {}
        snap.docs.forEach((docSnap) => {
          const data = docSnap.data() as any
          map[docSnap.id] = {
            id: docSnap.id,
            name: data?.name ?? 'مطعم بدون اسم',
            logoUrl: data?.logoUrl,
            city: data?.city,
            description: data?.description,
            bannerUrl: data?.bannerUrl,
          }
        })
        setRestaurantsMap(map)
      } catch (error) {
        console.error('فشل في جلب بيانات المطاعم', error)
      } finally {
        if (active) {
          setRestaurantsLoaded(true)
        }
      }
    }

    void loadRestaurants()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const loadItems = async () => {
      setLoading(true)
      try {
        const baseCollection = collection(db, 'menuItems')
        const qy = selectedRestaurantId
          ? query(baseCollection, where('ownerId', '==', selectedRestaurantId))
          : query(baseCollection, where('available', '==', true))
        const snap = await getDocs(qy)
        if (!active) return
        const itemsData: Item[] = snap.docs
          .map((d) => ({
            id: d.id,
            ...(d.data() as any),
          }))
          .filter((item) => item.available ?? true)
        setItems(itemsData)
      } catch (error) {
        console.error('فشل في جلب أصناف القائمة', error)
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void loadItems()

    return () => {
      active = false
    }
  }, [selectedRestaurantId])

  const allRestaurants = useMemo(
    () =>
      Object.values(restaurantsMap).sort((a, b) =>
        a.name.localeCompare(b.name, 'ar')
      ),
    [restaurantsMap]
  )

  const groupedMenu = useMemo<GroupedMenu[]>(() => {
    if (items.length === 0) return []

    const groups = new Map<string, Item[]>()
    items.forEach((item) => {
      const key = item.ownerId ?? UNASSIGNED_KEY
      if (!groups.has(key)) {
        groups.set(key, [])
      }
      groups.get(key)!.push(item)
    })

    return Array.from(groups.entries())
      .map(([ownerId, ownerItems]) => ({
        ownerId,
        restaurant: ownerId !== UNASSIGNED_KEY ? restaurantsMap[ownerId] : undefined,
        items: [...ownerItems].sort((a, b) => a.name.localeCompare(b.name, 'ar')),
      }))
      .sort((a, b) => {
        const nameA = a.restaurant?.name ?? 'أصناف غير منسوبة'
        const nameB = b.restaurant?.name ?? 'أصناف غير منسوبة'
        return nameA.localeCompare(nameB, 'ar')
      })
  }, [items, restaurantsMap])

  const activeRestaurant = selectedRestaurantId
    ? restaurantsMap[selectedRestaurantId]
    : undefined

  const handleAdd = (item: Item) => {
    if (!item.ownerId) {
      alert('⚠️ الصنف غير مرتبط بمطعم (ownerId مفقود)')
      return
    }

    const currentRestaurantId = cartItems[0]?.ownerId
    if (currentRestaurantId && currentRestaurantId !== item.ownerId) {
      alert('⚠️ لا يمكن إضافة منتجات من أكثر من مطعم في نفس الطلب')
      return
    }

    add({
      id: item.id,
      name: item.name,
      price: item.price,
      ownerId: item.ownerId,
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-lg text-gray-300">
        ⏳ جارِ تحميل القائمة...
      </div>
    )
  }

  return (
    <div className="py-10 space-y-10">
      <header className="text-center space-y-3">
        <h1 className="text-3xl font-extrabold text-yellow-400">🍗 قائمة الأصناف</h1>
        <p className="text-gray-300">
          اختر المطعم لاستعراض قائمته الخاصة أو اطّلع على جميع الأصناف مرتبة بحسب
          المطعم.
        </p>
      </header>

      <nav className="flex flex-wrap justify-center gap-3">
        <Link
          to="/menu"
          className={`px-4 py-2 rounded-full border transition text-sm font-semibold ${
            selectedRestaurantId
              ? 'border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-200'
              : 'border-yellow-500 bg-yellow-500/10 text-yellow-200 shadow'
          }`}
        >
          جميع المطاعم
        </Link>
        {allRestaurants.map((restaurant) => (
          <Link
            key={restaurant.id}
            to={`/menu?restaurant=${restaurant.id}`}
            className={`px-4 py-2 rounded-full border transition text-sm font-semibold flex items-center gap-2 ${
              selectedRestaurantId === restaurant.id
                ? 'border-yellow-500 bg-yellow-500/10 text-yellow-200 shadow'
                : 'border-gray-600 text-gray-300 hover:border-yellow-400 hover:text-yellow-200'
            }`}
          >
            {restaurant.logoUrl ? (
              <img
                src={restaurant.logoUrl}
                alt={restaurant.name}
                className="w-6 h-6 rounded-full object-cover"
              />
            ) : (
              <span className="w-6 h-6 rounded-full bg-gray-700 flex items-center justify-center text-xs">
                🍴
              </span>
            )}
            <span>{restaurant.name}</span>
          </Link>
        ))}
      </nav>

      {activeRestaurant && (
        <section className="max-w-3xl mx-auto w-full overflow-hidden rounded-3xl border border-yellow-400/30 bg-gradient-to-r from-gray-900 via-gray-800 to-gray-900">
          {activeRestaurant.bannerUrl && (
            <div className="h-40 w-full overflow-hidden">
              <img
                src={activeRestaurant.bannerUrl}
                alt={`صورة ${activeRestaurant.name}`}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="p-6 flex flex-col md:flex-row md:items-center gap-6">
            {activeRestaurant.logoUrl ? (
              <img
                src={activeRestaurant.logoUrl}
                alt={activeRestaurant.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-yellow-400/50"
              />
            ) : (
              <div className="w-24 h-24 rounded-full bg-gray-700 flex items-center justify-center text-4xl">
                🍴
              </div>
            )}
            <div className="text-right md:text-start space-y-2">
              <h2 className="text-2xl font-bold text-white">{activeRestaurant.name}</h2>
              {activeRestaurant.city && (
                <p className="text-sm text-gray-300">{activeRestaurant.city}</p>
              )}
              {activeRestaurant.description && (
                <p className="text-sm text-gray-300 leading-relaxed">
                  {activeRestaurant.description}
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      {selectedRestaurantId && restaurantsLoaded && !activeRestaurant && (
        <div className="max-w-2xl mx-auto w-full rounded-2xl border border-red-500/30 bg-red-500/10 p-6 text-center text-sm text-red-100">
          لم نعثر على بيانات المطعم المحدد. يمكنك{' '}
          <Link
            to="/menu"
            className="underline underline-offset-4 font-semibold text-yellow-200"
          >
            العودة لعرض جميع المطاعم
          </Link>
          .
        </div>
      )}

      {groupedMenu.length === 0 && (
        <div className="text-center text-gray-400">😔 لا توجد أصناف حالياً</div>
      )}

      {groupedMenu.map((section) => {
        const isUnassigned = section.ownerId === UNASSIGNED_KEY
        const restaurantName = section.restaurant?.name ?? 'أصناف غير منسوبة'

        return (
          <section key={section.ownerId} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex items-center gap-4">
                {section.restaurant?.logoUrl ? (
                  <img
                    src={section.restaurant.logoUrl}
                    alt={restaurantName}
                    className="w-16 h-16 rounded-full object-cover border-2 border-yellow-400/50"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-2xl">
                    🍴
                  </div>
                )}
                <div className="space-y-1">
                  <h2 className="text-2xl font-bold text-white">{restaurantName}</h2>
                  {section.restaurant?.city && (
                    <p className="text-sm text-gray-300">{section.restaurant.city}</p>
                  )}
                  {!selectedRestaurantId && section.restaurant?.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 md:line-clamp-3">
                      {section.restaurant.description}
                    </p>
                  )}
                  {isUnassigned && (
                    <p className="text-xs text-red-200">
                      ⚠️ أصناف تحتاج لربطها بمطعم محدد في لوحة التحكم.
                    </p>
                  )}
                </div>
              </div>

              {section.restaurant && selectedRestaurantId !== section.restaurant.id && (
                <Link
                  to={`/menu?restaurant=${section.restaurant.id}`}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-yellow-400/40 text-yellow-200 text-sm font-semibold hover:bg-yellow-500/10 transition"
                >
                  عرض هذا المطعم فقط
                </Link>
              )}
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {section.items.map((item) => (
                <article
                  key={item.id}
                  className="bg-gray-800 text-white rounded-2xl shadow-lg hover:shadow-2xl transition overflow-hidden flex flex-col"
                >
                  <div className="h-48 bg-gray-700 flex items-center justify-center overflow-hidden">
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-gray-400">بدون صورة</span>
                    )}
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-4">
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="font-bold text-lg">{item.name}</h3>
                        {item.featured && (
                          <span className="px-3 py-1 text-xs font-semibold rounded-full bg-yellow-500/20 text-yellow-200 border border-yellow-400/40">
                            مميز
                          </span>
                        )}
                      </div>
                      {item.desc && (
                        <p className="text-sm text-gray-300 line-clamp-3">{item.desc}</p>
                      )}
                    </div>

                    <div className="mt-auto flex items-end justify-between gap-4">
                      <div className="space-y-1 text-sm">
                        <span className="block font-bold text-xl text-yellow-400">
                          {getUnitPriceWithFees(item.price).toFixed(2)} ر.س
                        </span>
                        <span className="text-xs text-gray-300">
                          السعر الأصلي {item.price.toFixed(2)} ر.س + رسوم التشغيل {applicationFeePerItem.toFixed(2)} ر.س
                        </span>
                      </div>

                      {role === 'customer' && (
                        <button
                          onClick={() => handleAdd(item)}
                          disabled={!item.ownerId}
                          className={`px-4 py-2 rounded-xl font-semibold transition ${
                            item.ownerId
                              ? 'bg-yellow-500 hover:bg-yellow-600 text-black'
                              : 'bg-gray-500 text-white cursor-not-allowed'
                          }`}
                        >
                          🛒 أضف للسلة
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        )
      })}

      {subtotal > 0 && role === 'customer' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
          <Link
            to="/checkout"
            className="px-6 py-3 rounded-full bg-yellow-500 text-black shadow-xl font-bold hover:bg-yellow-600 transition"
          >
            إتمام الطلب • المجموع: {totalWithFees.toFixed(2)} ر.س
          </Link>
          <div className="mt-1 text-center text-xs text-gray-200">
            يشمل رسوم تشغيل التطبيق ({applicationFeePerItem.toFixed(2)} ر.س لكل منتج)
          </div>
        </div>
      )}
    </div>
  )
}
