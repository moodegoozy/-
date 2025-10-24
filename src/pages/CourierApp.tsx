import React, { useEffect, useState } from 'react'
import { collection, doc, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore'
import { db } from '@/firebase'
import { useAuth } from '@/auth'

export const CourierApp: React.FC = () => {
  const { user } = useAuth()
  const [ready, setReady] = useState<any[]>([])
  const [mine, setMine] = useState<any[]>([])

  useEffect(() => {
    const q1 = query(collection(db, 'orders'), where('status','in',['ready']), orderBy('createdAt','desc'))
    const u1 = onSnapshot(q1, (snap) => setReady(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))))
    const q2 = query(collection(db, 'orders'), where('courierId','==', user?.uid || ''), orderBy('createdAt','desc'))
    const u2 = onSnapshot(q2, (snap) => setMine(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) }))))
    return () => { u1(); u2(); }
  }, [user?.uid])

  const take = async (id: string) => {
    if (!user) return
    await updateDoc(doc(db, 'orders', id), { courierId: user.uid, status: 'out_for_delivery', updatedAt: new Date() as any })
  }

  const delivered = async (id: string) => {
    await updateDoc(doc(db, 'orders', id), { status: 'delivered', updatedAt: new Date() as any })
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <div>
        <h2 className="font-bold mb-3">طلبات جاهزة للتسليم</h2>
        <div className="space-y-3">
          {ready.map(o => (
            <div key={o.id} className="bg-white rounded-2xl shadow p-4">
              <div className="font-bold">#{o.id.slice(-6)} • {o.total?.toFixed?.(2)} ر.س</div>
              <div className="text-sm text-gray-600">العنوان: {o.address}</div>
              <button onClick={()=>take(o.id)} className="mt-2 px-3 py-2 rounded-xl bg-gray-900 text-white text-sm">استلام الطلب</button>
            </div>
          ))}
          {ready.length === 0 && <div className="text-gray-600">لا توجد طلبات جاهزة الآن.</div>}
        </div>
      </div>
      <div>
        <h2 className="font-bold mb-3">طلباتي</h2>
        <div className="space-y-3">
          {mine.map(o => (
            <div key={o.id} className="bg-white rounded-2xl shadow p-4">
              <div className="font-bold">#{o.id.slice(-6)} • {o.total?.toFixed?.(2)} ر.س</div>
              <div className="text-sm text-gray-600">العنوان: {o.address}</div>
              <button onClick={()=>delivered(o.id)} className="mt-2 px-3 py-2 rounded-xl bg-green-600 text-white text-sm">تم التسليم</button>
            </div>
          ))}
          {mine.length === 0 && <div className="text-gray-600">لا يوجد لديك طلبات حالياً.</div>}
        </div>
      </div>
    </div>
  )
}
