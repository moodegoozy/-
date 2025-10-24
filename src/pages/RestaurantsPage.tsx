// src/pages/RestaurantsPage.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, getDocs } from 'firebase/firestore'
import { Link } from 'react-router-dom'

type Restaurant = {
  id: string
  name: string
  logoUrl?: string
  city?: string
}

export const RestaurantsPage: React.FC = () => {
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const snap = await getDocs(collection(db, 'restaurants'))
      setRestaurants(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false)
    })()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 text-lg text-gray-300">
        ⏳ جارِ تحميل المطاعم...
      </div>
    )
  }

  return (
    <div className="py-10">
      <h1 className="text-3xl font-extrabold text-center mb-8 text-yellow-400">
        🍴 قائمة المطاعم
      </h1>

      {restaurants.length === 0 && (
        <div className="text-center text-gray-400">
          😔 لا توجد مطاعم حالياً
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map(r => (
          <Link
            key={r.id}
            to={`/menu?restaurant=${r.id}`}
            className="bg-gray-800 text-white rounded-2xl shadow-lg hover:shadow-2xl hover:-translate-y-1 transform transition p-6 flex flex-col items-center text-center"
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
            {r.city && (
              <p className="text-sm text-gray-400 mt-1">{r.city}</p>
            )}
          </Link>
        ))}
      </div>
    </div>
  )
}
