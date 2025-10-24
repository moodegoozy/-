// src/pages/CourierRequests.tsx
import React, { useEffect, useState } from 'react'
import { db } from '@/firebase'
import { collection, query, where, getDocs, updateDoc, doc } from 'firebase/firestore'
import { useAuth } from '@/auth'

export const CourierRequests: React.FC = () => {
  const { user } = useAuth()
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    (async () => {
      const q = query(collection(db, 'hiringRequests'), where('restaurantId', '==', user.uid))
      const snap = await getDocs(q)
      setRequests(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
      setLoading(false)
    })()
  }, [user])

  const handleAction = async (id: string, status: 'accepted' | 'rejected') => {
    await updateDoc(doc(db, 'hiringRequests', id), { status })
    setRequests(reqs => reqs.map(r => r.id === id ? { ...r, status } : r))
  }

  if (loading) return <div className="text-center py-10">⏳ تحميل...</div>

  return (
    <div className="py-6">
      <h1 className="text-2xl font-bold text-yellow-400 text-center mb-6">طلبات المندوبين</h1>
      {requests.length === 0 ? (
        <div className="text-gray-400 text-center">لا توجد طلبات</div>
      ) : (
        <div className="space-y-3">
          {requests.map(r => (
            <div key={r.id} className="bg-white rounded-2xl shadow p-4 flex items-center justify-between">
              <div>
                <div className="font-bold">{r.courierName}</div>
                <div className="text-sm text-gray-600">{r.status === 'pending' ? 'بانتظار الرد' : r.status}</div>
              </div>
              {r.status === 'pending' && (
                <div className="flex gap-2">
                  <button onClick={() => handleAction(r.id, 'accepted')} className="px-3 py-1 rounded bg-green-500 text-white">قبول</button>
                  <button onClick={() => handleAction(r.id, 'rejected')} className="px-3 py-1 rounded bg-red-500 text-white">رفض</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
