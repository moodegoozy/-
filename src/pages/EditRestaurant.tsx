// src/pages/EditRestaurant.tsx
import React, { useState, useEffect } from 'react'
import { db, storage } from '@/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { useAuth } from '@/auth'
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage'

export const EditRestaurant: React.FC = () => {
  const { user } = useAuth()
  const [form, setForm] = useState({ name: '', phone: '', city: '', location: '', logoUrl: '' })
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (!user) return
    const fetchData = async () => {
      const refDoc = doc(db, 'restaurants', user.uid)
      const snap = await getDoc(refDoc)
      if (snap.exists()) {
        setForm(snap.data() as any)
      }
      setLoading(false)
    }
    fetchData()
  }, [user])

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const storageRef = ref(storage, `restaurants/${user.uid}/logo.jpg`)
      await uploadBytes(storageRef, file)
      const url = await getDownloadURL(storageRef)
      setForm(prev => ({ ...prev, logoUrl: url }))
      alert('✅ تم رفع الشعار بنجاح')
    } catch (err) {
      console.error(err)
      alert('❌ حدث خطأ أثناء رفع الشعار')
    }
    setUploading(false)
  }

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return
    const refDoc = doc(db, 'restaurants', user.uid)

    // ✅ يحفظ أو يعدل المستند
    await setDoc(refDoc, form, { merge: true })

    alert('✅ تم حفظ التغييرات')
  }

  if (loading) return <div>جارِ التحميل...</div>

  return (
    <div className="max-w-md mx-auto bg-white rounded-2xl shadow p-6 space-y-3 text-gray-900">
      <h1 className="text-xl font-bold mb-4">تعديل بيانات المطعم</h1>
      <form onSubmit={save} className="space-y-3">
        {/* حقل رفع الشعار */}
        <div className="space-y-2">
          <label className="block font-semibold">شعار المطعم</label>
          {form.logoUrl && (
            <img src={form.logoUrl} alt="شعار المطعم" className="w-20 h-20 rounded-full object-cover border" />
          )}
          <input type="file" accept="image/*" onChange={handleLogoUpload} />
          {uploading && <p className="text-sm text-gray-500">⏳ جاري رفع الشعار...</p>}
        </div>

        <input 
          className="w-full border rounded-xl p-3" 
          placeholder="اسم المطعم" 
          value={form.name} 
          onChange={e=>setForm({...form, name: e.target.value})} 
        />
        <input 
          className="w-full border rounded-xl p-3" 
          placeholder="رقم الجوال" 
          value={form.phone} 
          onChange={e=>setForm({...form, phone: e.target.value})} 
        />
        <input 
          className="w-full border rounded-xl p-3" 
          placeholder="المدينة" 
          value={form.city} 
          onChange={e=>setForm({...form, city: e.target.value})} 
        />
        <input 
          className="w-full border rounded-xl p-3" 
          placeholder="الموقع" 
          value={form.location} 
          onChange={e=>setForm({...form, location: e.target.value})} 
        />

        <button 
          className="w-full bg-gray-900 text-white rounded-xl p-3 hover:bg-gray-800 transition"
          disabled={uploading}
        >
          {uploading ? 'جاري رفع الشعار...' : 'حفظ'}
        </button>
      </form>
    </div>
  )
}
