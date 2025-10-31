// src/pages/ManageMenu.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { db, app } from '@/firebase'
import { addDoc, collection, deleteDoc, doc, getDocs, query, where, updateDoc } from 'firebase/firestore'
import { getDownloadURL, getStorage, ref, uploadBytes } from 'firebase/storage'
import { useAuth } from '@/auth'
import { usePlatformSettings } from '@/context/PlatformSettingsContext'

type Item = {
  id?: string,
  name: string,
  desc?: string,
  price: number,
  imageUrl?: string,
  available: boolean,
  categoryId?: string,
  basePrice?: number,
  file?: File
}

export const ManageMenu: React.FC = () => {
  const { user } = useAuth()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState<Item>({ name: '', desc: '', price: 0, available: true })
  const { commissionRate } = usePlatformSettings()
  const multiplier = useMemo(() => 1 + commissionRate, [commissionRate])

  const storage = getStorage(app, "gs://albayt-sofra.firebasestorage.app")

  // ✅ تحميل الأصناف الخاصة بالمطعم فقط
  const load = async () => {
    if (!user) return
    const q = query(collection(db, 'menuItems'), where('ownerId', '==', user.uid))
    const snap = await getDocs(q)
    setItems(
      snap.docs.map((d) => {
        const data = d.data() as any
        const basePrice = typeof data.basePrice === 'number'
          ? Number(data.basePrice.toFixed?.(2) ?? data.basePrice)
          : Number(((Number(data.price ?? 0)) / multiplier).toFixed(2))
        return { id: d.id, ...data, basePrice }
      }),
    )
    setLoading(false)
  }

  useEffect(() => { load() }, [user])

  const save = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return alert("⚠️ لازم تسجل دخول أول")

    const basePrice = Number(form.price)
    if (!form.name?.trim()) {
      return alert('⚠️ اكتب اسم الصنف')
    }
    if (!Number.isFinite(basePrice) || basePrice <= 0) {
      return alert('⚠️ أدخل سعر أساسي صالح (أكبر من صفر)')
    }
    const priceWithFee = Number((basePrice * 1.15).toFixed(2))

    let payload: any = {
      ...form,
      price: priceWithFee,
      basePrice,
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

  const customerPricePreview = Number.isFinite(form.price)
    ? Number((Number(form.price || 0) * 1.15).toFixed(2))
    : 0

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
        <div className="space-y-1">
          <input
            className="w-full border rounded-xl p-3"
            placeholder="السعر قبل النسبة"
            type="number"
            min={0}
            step={0.5}
            value={form.price}
            onChange={e=>setForm({...form, price: Number(e.target.value)})}
          />
          <p className="text-xs text-gray-500">
            يتم إضافة 15% تلقائيًا. السعر المعروض للعميل سيكون تقريبًا {customerPricePreview.toFixed(2)} ر.س
          </p>
        </div>
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
        {items.map(it => {
          const base = typeof (it as any).basePrice === 'number'
            ? Number((it as any).basePrice)
            : typeof it.price === 'number'
              ? Number((it.price / 1.15).toFixed(2))
              : undefined

          return (
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
              {typeof base === 'number' && !Number.isNaN(base) && (
                <div className="text-xs text-gray-500">
                  (السعر قبل إضافة نسبة التطبيق {base.toFixed(2)} ر.س)
                </div>
              )}
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
          )
        })}
        {items.length === 0 && <div className="text-gray-600">لا توجد أصناف بعد.</div>}
      </div>
    </div>
  )
}
