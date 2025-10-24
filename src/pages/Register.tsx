// src/pages/Register.tsx
import React, { useState } from 'react'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

export const Register: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [restaurantName, setRestaurantName] = useState('') // 👈 اسم المطعم
  const [role, setRole] = useState<'customer'|'courier'|'owner'|''>('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!role) return alert('اختر نوع الحساب')
    if (role === 'owner' && !restaurantName) return alert('أدخل اسم المطعم')

    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await setDoc(doc(db, 'users', cred.user.uid), {
        name,
        email,
        role,
        restaurantName: role === 'owner' ? restaurantName : null // 👈 نخزن اسم المطعم فقط للـ Owner
      })
      nav('/')
    } catch (e: any) {
      alert(e.message)
    } finally { setLoading(false) }
  }

  return (
    <div className="max-w-md mx-auto bg-gradient-to-br from-gray-700 via-gray-800 to-gray-900 rounded-2xl shadow-xl p-6 text-white">
      <h1 className="text-xl font-bold mb-4 text-center">إنشاء حساب</h1>
      <form onSubmit={submit} className="space-y-3">
        <input 
          className="w-full border rounded-xl p-3 text-black" 
          placeholder="الاسم" 
          value={name} 
          onChange={e=>setName(e.target.value)} 
        />
        <input 
          className="w-full border rounded-xl p-3 text-black" 
          placeholder="الإيميل" 
          value={email} 
          onChange={e=>setEmail(e.target.value)} 
        />
        <input 
          className="w-full border rounded-xl p-3 text-black" 
          placeholder="كلمة المرور" 
          type="password" 
          value={password} 
          onChange={e=>setPassword(e.target.value)} 
        />

        {/* اختيار نوع الحساب */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <label className={"border rounded-xl p-3 text-center cursor-pointer " + (role==='customer'?'bg-yellow-500 text-black':'bg-gray-100 text-gray-800')}>
            <input type="radio" name="role" value="customer" className="hidden" onChange={()=>setRole('customer')} /> عميل
          </label>
          <label className={"border rounded-xl p-3 text-center cursor-pointer " + (role==='courier'?'bg-yellow-500 text-black':'bg-gray-100 text-gray-800')}>
            <input type="radio" name="role" value="courier" className="hidden" onChange={()=>setRole('courier')} /> مندوب
          </label>
          <label className={"border rounded-xl p-3 text-center cursor-pointer " + (role==='owner'?'bg-yellow-500 text-black':'bg-gray-100 text-gray-800')}>
            <input type="radio" name="role" value="owner" className="hidden" onChange={()=>setRole('owner')} /> صاحب المطعم
          </label>
        </div>

        {/* حقل اسم المطعم يظهر فقط لو الدور Owner */}
        {role === 'owner' && (
          <input 
            className="w-full border rounded-xl p-3 text-black" 
            placeholder="اسم المطعم" 
            value={restaurantName} 
            onChange={e=>setRestaurantName(e.target.value)} 
          />
        )}

        <button 
          disabled={loading} 
          className="w-full rounded-xl p-3 bg-yellow-500 text-black font-bold hover:bg-yellow-600 transition"
        >
          {loading ? '...' : 'تسجيل'}
        </button>
      </form>
    </div>
  )
}
