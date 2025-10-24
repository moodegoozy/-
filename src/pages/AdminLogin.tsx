import React, { useState } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

export const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const nav = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const snap = await getDoc(doc(db, 'users', cred.user.uid))

      if (!snap.exists() || snap.data().role !== 'admin') {
        await signOut(auth)
        setError('هذا الحساب غير مخوّل للوصول إلى لوحة المشرفات.')
        return
      }

      nav('/admin/panel')
    } catch (err: any) {
      setError(err.message ?? 'تعذّر تسجيل الدخول. يرجى المحاولة من جديد.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-md bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 text-white">
        <h1 className="text-3xl font-extrabold text-center text-yellow-400 mb-2">لوحة المشرفات</h1>
        <p className="text-center text-gray-300 mb-8">تسجيل الدخول للمشرفات فقط</p>

        {error && (
          <div className="mb-4 rounded-xl bg-red-500/20 border border-red-500/50 text-red-100 p-3 text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="البريد الإلكتروني"
            className="w-full rounded-xl p-3 bg-slate-900/70 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="كلمة المرور"
            className="w-full rounded-xl p-3 bg-slate-900/70 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold p-3 rounded-xl shadow-lg transition transform hover:scale-105 disabled:opacity-60"
          >
            {loading ? 'جارٍ التحقق...' : 'دخول المشرفة'}
          </button>
        </form>
      </div>
    </div>
  )
}
