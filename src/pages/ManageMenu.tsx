// src/pages/ManageMenu.tsx
import React, { useEffect, useState } from 'react'
import { db, app } from '@/firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, updateDoc } from 'firebase/firestore'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '@/auth'

type Item = { 
  id?: string, 
  name: string, 
  desc?: string, 
  price: number, 
  imageUrl?: string, 
  available: boolean, 
  categoryId?: string,
  file?: File
}

export const ManageMenu: React.FC = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Item>({ name: '', desc: '', price: 0, available: true })

  const storage = getStorage(app, "gs://albayt-sofra.firebasestorage.app")

  // ✅ تحميل الأصناف الخاصة بالمطعم فقط
  const load = async () => {
    if (!user) return
    const q = query(collection(db, 'menuItems'), where('ownerId', '==', user.uid))
    const snap = await getDocs(q)
    setItems(snap.docs.map(d => ({ id: d.id, ...(d.data() as any) })))
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return alert("⚠️ لازم تسجل دخول أول")

    let payload: any = { 
      ...form, 
      price: Number(form.price),
      ownerId: user.uid  // ✅ ربط الصنف بصاحب المطعم
    }

    if (form.file) {
      const file = form.file
      const r = ref(storage, 'menuImages/' + Date.now() + '_' + file.name)
      await uploadBytes(r, file)
      payload.imageUrl = await getDownloadURL(r)
    }

    delete payload.file

    await addDoc(collection(db, 'menuItems'), payload)
    setForm({ name: '', desc: '', price: 0, available: true })
    load()
  }

  const toggle = async (id?: string, avail?: boolean) => {
    if (!id) return
    await updateDoc(doc(db, 'menuItems', id), { available: !avail })
    load()
  }

  const remove = async (id?: string) => {
    if (!id) return
    if (confirm('حذف الصنف نهائيًا؟')) {
      await deleteDoc(doc(db, 'menuItems', id))
      load()
    }
  }

  if (loading) return <div>جارِ تحميل الأصناف...</div>

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* 📝 فورم الإضافة */}
      <form onSubmit={save} className="bg-white rounded-2xl shadow p-6 space-y-3">
        <h2 className="text-lg font-bold">إضافة صنف</h2>
        <input 
          className="w-full border rounded-xl p-3" 
          placeholder="اسم الصنف" 
          value={form.name} 
          onChange={e=>setForm({...form, name: e.target.value})} 
        />
        <textarea 
          className="w-full border rounded-xl p-3" 
          placeholder="الوصف (اختياري)" 
          value={form.desc} 
          onChange={e=>setForm({...form, desc: e.target.value})} 
        />
        <input 
          className="w-full border rounded-xl p-3" 
          placeholder="السعر" 
          type="number" 
          value={form.price} 
          onChange={e=>setForm({...form, price: Number(e.target.value)})} 
        />
        <input 
          className="w-full border rounded-xl p-3" 
          type="file" 
          accept="image/*" 
          onChange={e=>setForm({...form, file: e.target.files?.[0]})} 
        />
        <label className="flex items-center gap-2 text-sm">
          <input 
            type="checkbox" 
            checked={form.available} 
            onChange={e=>setForm({...form, available: e.target.checked})} 
          />
          متاح
        </label>
        <button className="px-4 py-2 rounded-xl bg-gray-900 text-white">حفظ</button>
      </form>

      {/* 🛒 عرض الأصناف */}
      <div className="space-y-3">
        {items.map(it => (
          <div key={it.id} className="bg-white rounded-2xl shadow p-4 flex items-center gap-4">
            <img 
              src={it.imageUrl || ''} 
              className="w-20 h-20 object-cover rounded-xl bg-gray-100" 
              onError={(e:any)=>{e.currentTarget.style.display='none'}} 
            />
            <div className="flex-1">
              <div className="font-bold">{it.name}</div>
              <div className="text-sm text-gray-600">{it.desc}</div>
              <div className="font-semibold mt-1">{it.price?.toFixed?.(2)} ر.س</div>
            </div>
            <button 
              onClick={()=>toggle(it.id, it.available)} 
              className="px-3 py-2 rounded-xl text-sm bg-blue-600 text-white"
            >
              {it.available ? 'تعطيل' : 'تفعيل'}
            </button>
            <button 
              onClick={()=>remove(it.id)} 
              className="px-3 py-2 rounded-xl text-sm bg-red-600 text-white"
            >
              حذف
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="text-gray-600">لا توجد أصناف بعد.</div>}
      </div>
    </div>
  )
}
