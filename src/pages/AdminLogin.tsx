import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase'

const AdminLogin: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      const profile = await getDoc(doc(db, 'users', credentials.user.uid))

      if (!profile.exists() || profile.data()?.role !== 'admin') {
        await signOut(auth)
        setError('هذا الحساب غير مخوّل للوصول إلى لوحة المشرفات.')
        return
      }

      navigate('/admin/panel', { replace: true })
    } catch (err: any) {
      const message =
        err?.code === 'auth/wrong-password'
          ? 'بيانات الدخول غير صحيحة.'
          : err?.message ?? 'تعذّر تسجيل الدخول. يرجى المحاولة لاحقاً.'
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8 bg-white/10 border border-white/15 backdrop-blur-xl rounded-3xl p-10 text-white shadow-2xl">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-yellow-400">لوحة تحكم سفرة البيت</h1>
          <p className="text-sm text-slate-200">الدخول متاح للمشرفات المصرّح لهن فقط</p>
        </div>

        {error && (
          <div className="rounded-2xl bg-rose-500/10 border border-rose-400/40 text-rose-100 text-sm p-3 text-center">
            {error}
          </div>
        )}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-2">
            <label htmlFor="admin-email" className="block text-sm font-medium text-slate-200">
              البريد الإلكتروني
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-200">
              كلمة المرور
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/70"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-yellow-400 py-3 font-semibold text-slate-950 transition hover:bg-yellow-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <div className="text-center text-xs text-slate-300">
          <p>في حال واجهتِ مشكلة في الدخول يرجى التواصل مع فريق الدعم.</p>
          <Link to="/" className="text-yellow-300 hover:text-yellow-200">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
