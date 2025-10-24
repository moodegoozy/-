// src/pages/Login.tsx
import React, { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'

export const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const nav = useNavigate()

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      // تسجيل الدخول
      const userCred = await signInWithEmailAndPassword(auth, email, password)
      const uid = userCred.user.uid

      // جلب بيانات المستخدم من Firestore
      const snap = await getDoc(doc(db, "users", uid))
      if (snap.exists()) {
        const userData = snap.data()
        console.log("✅ بيانات المستخدم:", userData)

        // ✅ توجيه حسب نوع الحساب
        if (userData.role === "owner") {
          nav("/owner") // لوحة المطعم
        } else {
          nav("/") // الصفحة الرئيسية للعميل
        }
      } else {
        alert("⚠️ الحساب موجود في Auth لكن لا توجد له بيانات في Firestore")
      }
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-gray-800 to-black">
      <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl w-full max-w-md p-8">
        
        {/* شعار / اسم الموقع */}
        <h1 className="text-3xl font-extrabold text-center text-yellow-400 mb-2">
          🍽️ سفرة البيت
        </h1>
        <p className="text-center text-gray-300 mb-8">تسجيل الدخول</p>

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="الإيميل"
            className="w-full rounded-xl p-3 bg-gray-900/70 text-white border border-white/20 
                       focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            className="w-full rounded-xl p-3 bg-gray-900/70 text-white border border-white/20 
                       focus:outline-none focus:ring-2 focus:ring-yellow-400"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold p-3 rounded-xl 
                       shadow-lg transition transform hover:scale-105"
          >
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </form>

        {/* رابط التسجيل */}
        <p className="mt-6 text-center text-sm text-gray-300">
          ليس لديك حساب؟{' '}
          <Link 
            className="text-yellow-400 hover:text-yellow-300 font-semibold" 
            to="/register"
          >
            سجّل الآن
          </Link>
        </p>
      </div>
    </div>
  )
}
