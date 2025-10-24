// src/pages/ProfileEdit.tsx
import React, { useEffect, useState } from "react"
import { db } from "@/firebase"
import { useAuth } from "@/auth"
import { doc, getDoc, updateDoc } from "firebase/firestore"

export const ProfileEdit: React.FC = () => {
  const { user } = useAuth()
  const [form, setForm] = useState({
    restaurantName: "",
    phone: "",
    city: "",
    address: ""
  })
  const [loading, setLoading] = useState(true)

  // تحميل البيانات الحالية
  useEffect(() => {
    if (!user) return
    const load = async () => {
      const snap = await getDoc(doc(db, "users", user.uid))
      if (snap.exists()) {
        setForm({
          restaurantName: snap.data().restaurantName || "",
          phone: snap.data().phone || "",
          city: snap.data().city || "",
          address: snap.data().address || ""
        })
      }
      setLoading(false)
    }
    load()
  }, [user])

  // حفظ التعديلات
  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    await updateDoc(doc(db, "users", user.uid), form)
    alert("✅ تم تحديث بيانات المطعم")
  }

  if (loading) return <div>جارِ تحميل البيانات...</div>

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6">
      <h1 className="text-xl font-bold mb-4">تعديل بيانات المطعم</h1>
      <form onSubmit={save} className="space-y-3">
        <input
          className="w-full border rounded-xl p-3"
          placeholder="اسم المطعم"
          value={form.restaurantName}
          onChange={(e) => setForm({ ...form, restaurantName: e.target.value })}
        />
        <input
          className="w-full border rounded-xl p-3"
          placeholder="رقم الجوال"
          value={form.phone}
          onChange={(e) => setForm({ ...form, phone: e.target.value })}
        />
        <input
          className="w-full border rounded-xl p-3"
          placeholder="المدينة"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
        />
        <textarea
          className="w-full border rounded-xl p-3"
          placeholder="العنوان / الموقع"
          value={form.address}
          onChange={(e) => setForm({ ...form, address: e.target.value })}
        />
        <button className="w-full bg-yellow-500 text-black font-bold p-3 rounded-xl shadow">
          حفظ التعديلات
        </button>
      </form>
    </div>
  )
}
