// src/pages/CourierHiring.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, getDocs, addDoc, query, where, getDocs as getDocsQ, serverTimestamp } from 'firebase/firestore'
import { useAuth } from '@/auth'
import { Briefcase, CheckCircle2, XCircle, Clock } from 'lucide-react'

type Restaurant = {
  id: string
  name: string
  logoUrl?: string
}

type HiringRequest = {
  restaurantId: string
  status: string
}

export const CourierHiring: React.FC = () => {
  const { user } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [requests, setRequests] = useState<Record<string, HiringRequest>>({})
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState<string | null>(null)

  useEffect(() => {
    if (!user) return

    const load = async () => {
      // ✅ تحميل المطاعم
      const snap = await getDocs(collection(db, 'restaurants'))
      const data = snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))
      setRestaurants(data)

      // ✅ تحميل طلبات التوظيف الخاصة بالمندوب
      const qy = query(collection(db, 'hiringRequests'), where('courierId', '==', user.uid))
      const reqSnap = await getDocsQ(qy)
      const reqs: Record<string, HiringRequest> = {}
      reqSnap.docs.forEach(d => {
        const rd = d.data() as any
        reqs[rd.restaurantId] = { restaurantId: rd.restaurantId, status: rd.status }
      })
      setRequests(reqs)

      setLoading(false)
    }

    load()
  }, [user])

  const sendRequest = async (r: Restaurant) => {
    if (!user) return alert('سجل دخول أولاً')
    setSending(r.id)

    await addDoc(collection(db, 'hiringRequests'), {
      courierId: user.uid,
      courierName: user.displayName || 'مندوب',
      restaurantId: r.id,
      restaurantName: r.name,
      status: 'pending',
      createdAt: serverTimestamp(),
    })

    setRequests(prev => ({
      ...prev,
      [r.id]: { restaurantId: r.id, status: 'pending' },
    }))

    setSending(null)
  }

  if (loading) return <div className="text-center py-10 text-gray-300">⏳ تحميل المطاعم...</div>

  return (
    <div className="py-8">
      <h1 className="text-3xl font-extrabold text-yellow-400 text-center mb-8 flex items-center justify-center gap-2">
        <Briefcase className="w-7 h-7 text-yellow-400" />
        طلبات التوظيف
      </h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {restaurants.map(r => {
          const req = requests[r.id]
          return (
            <div
              key={r.id}
              className="bg-gradient-to-br from-gray-800 to-gray-900 text-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 flex flex-col items-center"
            >
              {r.logoUrl ? (
                <img
                  src={r.logoUrl}
                  className="w-24 h-24 rounded-full mb-4 object-cover border-4 border-yellow-500 shadow"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-600 flex items-center justify-center text-3xl mb-4">
                  🍴
                </div>
              )}
              <h3 className="font-bold text-lg mb-2">{r.name}</h3>

              {req ? (
                <span
                  className={`mt-3 px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${
                    req.status === 'pending'
                      ? 'bg-gray-500 text-white'
                      : req.status === 'accepted'
                      ? 'bg-green-500 text-white'
                      : 'bg-red-500 text-white'
                  }`}
                >
                  {req.status === 'pending' && <Clock className="w-4 h-4" />}
                  {req.status === 'accepted' && <CheckCircle2 className="w-4 h-4" />}
                  {req.status === 'rejected' && <XCircle className="w-4 h-4" />}
                  {req.status === 'pending'
                    ? 'قيد المراجعة'
                    : req.status === 'accepted'
                    ? '✅ تم القبول'
                    : '❌ مرفوض'}
                </span>
              ) : (
                <button
                  disabled={sending === r.id}
                  onClick={() => sendRequest(r)}
                  className="mt-4 w-full px-4 py-2 rounded-xl bg-yellow-500 text-black font-bold shadow hover:bg-yellow-600 hover:scale-105 transition disabled:opacity-50"
                >
                  {sending === r.id ? '⏳ جاري الإرسال...' : '📩 طلب توظيف'}
                </button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
