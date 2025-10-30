// src/pages/MenuPage.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { db } from '@/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { useCart } from '@/hooks/useCart'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/auth'   // ✅ عشان نجيب الدور

type Item = {
  id: string,
  name: string,
  desc?: string,
  price: number,
  imageUrl?: string,
  available: boolean,
  categoryId?: string,
  ownerId?: string,
  featured?: boolean
}

type Restaurant = {
  name: string
  logoUrl?: string
}

export const MenuPage: React.FC = () => {
  const [items, setItems] = useState<(Item & { restaurant?: Restaurant })[]>([])
  const [loading, setLoading] = useState(true)
  const [searchParams] = useSearchParams()
  const {
    add,
    subtotal,
    items: cartItems,
    applicationFeeTotal,
    applicationFeePerItem,
    getUnitPriceWithFees,
    totalWithFees,
  } = useCart()
  const { role } = useAuth()   // ✅ نجيب الدور

  const selectedRestaurantId = useMemo(() => searchParams.get('restaurant') || undefined, [searchParams])

  useEffect(() => {
    (async () => {
      setLoading(true)
      const constraints = [where('available', '==', true)]
      if (selectedRestaurantId) {
        constraints.push(where('ownerId', '==', selectedRestaurantId))
      }

      const qy = query(collection(db, 'menuItems'), ...constraints)
      const snap = await getDocs(qy)
      const itemsData: Item[] = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))

      const enriched = await Promise.all(
        itemsData.map(async (it) => {
          if (!it.ownerId) return it
          const rSnap = await getDoc(doc(db, 'restaurants', it.ownerId))
          if (rSnap.exists()) {
            return { ...it, restaurant: rSnap.data() as Restaurant }
          }
          return it
        })
      )

      setItems(enriched)
      setLoading(false)
    })()
  }, [selectedRestaurantId])

  const featuredItems = items.filter(it => it.featured)
  const spotlight = featuredItems.length > 0 ? featuredItems : items.slice(0, 4)

  const handleAdd = (it: Item) => {
    if (!it.ownerId) {
      alert('⚠️ الصنف غير مرتبط بمطعم (ownerId مفقود)')
      return
    }

    const currentRestaurantId = cartItems[0]?.ownerId
    if (currentRestaurantId && currentRestaurantId !== it.ownerId) {
      alert('⚠️ لا يمكن إضافة منتجات من أكثر من مطعم في نفس الطلب')
      return
    }

    add({ 
      id: it.id, 
      name: it.name, 
      price: it.price, 
      ownerId: it.ownerId 
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
    <div className="py-10">
      <h1 className="text-3xl font-extrabold text-center mb-4 text-yellow-400">
        🍗 قائمة الأصناف
      </h1>
      {selectedRestaurantId && (
        <p className="text-center text-gray-200 mb-8">
          يتم عرض أصناف المطعم المحدد فقط.
        </p>
      )}

      {spotlight.length > 0 && (
        <section className="mb-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-white">⭐ المنتجات المميزة</h2>
            <span className="text-sm text-gray-300">
              يتم تحديث هذه القائمة بناءً على اختيارات المشرفات وأداء الطلبات
            </span>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {spotlight.map(it => (
              <article
                key={`featured-${it.id}`}
                className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-yellow-500/20 via-accent/20 to-yellow-500/10 border border-yellow-400/40 shadow-lg"
              >
                <div className="absolute top-3 left-3 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full shadow">
                  مميز
                </div>
                <div className="h-40 w-full overflow-hidden">
                  {it.imageUrl ? (
                    <img
                      src={it.imageUrl}
                      alt={it.name}
                      className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-yellow-200 text-4xl">
                      🍽️
                    </div>
                  )}
                </div>
                <div className="p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-white line-clamp-1">{it.name}</h3>
                    <span className="text-sm text-yellow-300 font-semibold">
                      {getUnitPriceWithFees(it.price).toFixed(2)} ر.س
                    </span>
                  </div>
                  {it.desc && <p className="text-sm text-gray-200 line-clamp-2">{it.desc}</p>}
                  {it.restaurant && (
                    <div className="flex items-center gap-2 text-xs text-gray-300">
                      {it.restaurant.logoUrl ? (
                        <img
                          src={it.restaurant.logoUrl}
                          alt={it.restaurant.name}
                          className="w-6 h-6 rounded-full border border-yellow-300/60 object-cover"
                        />
                      ) : (
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-yellow-400/20 text-yellow-200 text-base">
                          🍴
                        </span>
                      )}
                      <span>{it.restaurant.name}</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {items.length === 0 && (
        <div className="text-center text-gray-400">😔 لا توجد أصناف حالياً</div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map(it => (
          <div 
            key={it.id} 
            className="bg-gray-800 text-white rounded-2xl shadow hover:shadow-xl transition p-4 flex flex-col"
          >
            {/* بيانات المطعم */}
            {it.restaurant && (
              <div className="flex items-center gap-3 mb-3">
                {it.restaurant.logoUrl ? (
                  <img 
                    src={it.restaurant.logoUrl} 
                    alt={it.restaurant.name} 
                    className="w-10 h-10 rounded-full object-cover border border-gray-700"
                  />
                ) : (
                  <div className="w-10 h-10 flex items-center justify-center rounded-full bg-gray-600 text-xl">
                    🍴
                  </div>
                )}
                <span className="font-semibold">{it.restaurant.name}</span>
              </div>
            )}

            {/* صورة الطبق */}
            <div className="h-48 bg-gray-700 rounded-xl mb-3 flex items-center justify-center overflow-hidden">
              {it.imageUrl ? (
                <img 
                  src={it.imageUrl} 
                  alt={it.name} 
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <span className="text-gray-400">بدون صورة</span>
              )}
            </div>

            {/* تفاصيل */}
            <div className="flex-1">
              <h3 className="font-bold text-lg">{it.name}</h3>
              {it.desc && <p className="text-sm text-gray-300 mt-1">{it.desc}</p>}
            </div>

            {/* السعر + زر الإضافة */}
            <div className="mt-3 flex items-center justify-between">
              <div className="flex flex-col">
                <span className="font-bold text-xl text-yellow-400">
                  {getUnitPriceWithFees(it.price).toFixed(2)} ر.س
                </span>
                <span className="text-xs text-gray-300">
                  السعر الأصلي {it.price.toFixed(2)} ر.س + رسوم التشغيل {applicationFeePerItem.toFixed(2)} ر.س
                </span>
              </div>
              
              {/* ✅ زر الإضافة يظهر فقط للعميل */}
              {role === 'customer' && (
                <button 
                  onClick={() => handleAdd(it)}
                  disabled={!it.ownerId}
                  className={`px-4 py-2 rounded-xl font-semibold transition ${
                    it.ownerId 
                      ? 'bg-yellow-500 hover:bg-yellow-600 text-black' 
                      : 'bg-gray-500 text-white cursor-not-allowed'
                  }`}
                >
                  🛒 أضف للسلة
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ✅ السلة تظهر فقط للعميل */}
      {subtotal > 0 && role === 'customer' && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2">
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
