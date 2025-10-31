// src/pages/RestaurantsPage.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, getDocs, query, where } from 'firebase/firestore'

type Restaurant = {
  id: string
  name: string
  logoUrl?: string
  city?: string
}

type MenuItem = {
  id: string
  name: string
  price?: number
  imageUrl?: string
  restaurantId?: string
}

export const RestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null)
  const [loading, setLoading] = useState(true)
  const [loadingMenu, setLoadingMenu] = useState(false)

  // تحميل كل المطاعم
  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'restaurants'))
      setRestaurants(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false)
    })()
  }, [])

  // تحميل الأصناف لمطعم محدد
  const handleSelectRestaurant = async (restaurant: Restaurant) => {
    setSelectedRestaurant(restaurant)
    setLoadingMenu(true)
    const q = query(collection(db, 'menuItems'), where('restaurantId', '==', restaurant.id))
    const snap = await getDocs(q)
    setMenuItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    setLoadingMenu(false)
  }

  // رجوع إلى قائمة المطاعم
  const handleBack = () => {
    setSelectedRestaurant(null)
    setMenuItems([])
  }

  // 🔄 تحميل المطاعم
  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-lg text-gray-300">
        ⏳ جارِ تحميل المطاعم...
      </div>
    )
  }

  // 👇 عرض الأصناف إذا تم اختيار مطعم
  if (selectedRestaurant) {
    return (
      <div className="py-10">
        <button
          onClick={handleBack}
          className="bg-gray-700 text-white px-4 py-2 rounded-lg mb-6 hover:bg-gray-600 transition"
        >
          ← رجوع إلى قائمة المطاعم
        </button>

        <div className="text-center mb-8">
          <img
            src={selectedRestaurant.logoUrl}
            alt={selectedRestaurant.name}
            className="w-32 h-32 object-cover rounded-full border-4 border-gray-700 mx-auto mb-4"
          />
          <h1 className="text-3xl font-extrabold text-yellow-400">{selectedRestaurant.name}</h1>
          {selectedRestaurant.city && (
            <p className="text-gray-400 text-sm mt-1">{selectedRestaurant.city}</p>
          )}
        </div>

        {loadingMenu ? (
          <div className="flex items-center justify-center h-40 text-gray-400">
            ⏳ جارِ تحميل الأصناف...
          </div>
        ) : menuItems.length === 0 ? (
          <div className="text-center text-gray-500">🍽 لا توجد أصناف حالياً</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {menuItems.map(item => (
              <div
                key={item.id}
                className="bg-gray-800 text-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transform transition p-6 flex flex-col items-center text-center"
              >
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className="w-28 h-28 object-cover rounded-full border-4 border-gray-700 mb-4"
                  />
                ) : (
                  <div className="w-28 h-28 flex items-center justify-center bg-gray-600 rounded-full text-3xl mb-4">
                    🍽
                  </div>
                )}
                <h3 className="font-bold text-xl">{item.name}</h3>
                {item.price && (
                  <p className="text-sm text-yellow-400 mt-1">{item.price} ريال</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // 👇 عرض قائمة المطاعم
  return (
    <div className="py-10">
      <h1 className="text-3xl font-extrabold text-center mb-8 text-yellow-400">
        🍴 قائمة المطاعم
      </h1>

      {restaurants.length === 0 && (
        <div className="text-center text-gray-400">😔 لا توجد مطاعم حالياً</div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map(r => (
          <div
            key={r.id}
            onClick={() => handleSelectRestaurant(r)}
            className="bg-gray-800 text-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transform transition p-6 flex flex-col items-center text-center cursor-pointer"
          >
            {r.logoUrl ? (
              <img
                src={r.logoUrl}
                alt={r.name}
                className="w-28 h-28 object-cover rounded-full border-4 border-gray-700 mb-4"
              />
            ) : (
              <div className="w-28 h-28 flex items-center justify-center bg-gray-600 rounded-full text-3xl mb-4">
                🍴
              </div>
            )}
            <h3 className="font-bold text-xl">{r.name}</h3>
            {r.city && <p className="text-sm text-gray-400 mt-1">{r.city}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}
