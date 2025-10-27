// src/pages/MenuPage.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, getDocs, query, where, doc, getDoc } from 'firebase/firestore'
import { useCart } from '@/hooks/useCart'
import { Link } from 'react-router-dom'
import { useAuth } from '@/auth'   // ✅ عشان نجيب الدور

type Item = { 
  id: string, 
  name: string, 
  desc?: string, 
  price: number, 
  imageUrl?: string, 
  available: boolean, 
  categoryId?: string,
  ownerId?: string
}

type Restaurant = {
  name: string
  logoUrl?: string
}

export const MenuPage: React.FC = () => {
  const [items, setItems] = useState<(Item & { restaurant?: Restaurant })[]>([])
  const [loading, setLoading] = useState(true)
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

  useEffect(() => {
    (async () => {
      const qy = query(collection(db, 'menuItems'), where('available', '==', true))
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
  }, [])

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
      <h1 className="text-3xl font-extrabold text-center mb-8 text-yellow-400">
        🍗 قائمة الأصناف
      </h1>

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
