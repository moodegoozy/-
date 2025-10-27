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
        } else if (userData.role === "courier") {
          nav("/courier") // المندوب
        } else if (userData.role === "admin") {
          nav("/admin/panel") // المشرفات
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary via-dark to-[#3a1a1a]">
      <div className="bg-[rgba(43,26,22,0.85)] backdrop-blur-xl border border-accent/30 rounded-3xl shadow-2xl w-full max-w-md p-8 text-secondary">

        {/* شعار / اسم الموقع */}
        <h1 className="text-3xl font-extrabold text-center text-accent mb-2">
          🍽️ سفرة البيت
        </h1>
        <p className="text-center text-secondary/80 mb-8">تسجيل الدخول</p>

        {/* نموذج تسجيل الدخول */}
        <form onSubmit={submit} className="space-y-4">
          <input
            type="email"
            placeholder="الإيميل"
            className="w-full rounded-xl p-3 bg-[#3c211c] text-secondary placeholder-[#f8deb0b3] border border-accent/30
                       focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            placeholder="كلمة المرور"
            className="w-full rounded-xl p-3 bg-[#3c211c] text-secondary placeholder-[#f8deb0b3] border border-accent/30
                       focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            disabled={loading}
            className="w-full bg-accent hover:bg-[#d3a442] text-primary font-bold p-3 rounded-xl
                       shadow-lg transition transform hover:scale-105 disabled:opacity-70"
          >
            {loading ? 'جارٍ الدخول...' : 'دخول'}
          </button>
        </form>

        {/* رابط التسجيل */}
        <p className="mt-6 text-center text-sm text-secondary/80">
          ليس لديك حساب؟{' '}
          <Link
            className="text-accent hover:text-[#e0b861] font-semibold"
            to="/register"
          >
            سجّل الآن
          </Link>
        </p>
      </div>
    </div>
  )
}
