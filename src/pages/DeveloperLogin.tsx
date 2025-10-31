import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase'
import { DEVELOPER_ACCESS_SESSION_KEY, developerAccessCode } from '@/config'

const errorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const code = (error as { code?: string }).code
    if (code === 'auth/user-not-found' || code === 'auth/invalid-credential') {
      return 'بيانات الدخول غير صحيحة.'
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'حدث خطأ غير متوقع. حاول مرة أخرى.'
}

export const DeveloperLogin: React.FC = () => {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accessCode, setAccessCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      const snapshot = await getDoc(doc(db, 'users', credentials.user.uid))

      if (!snapshot.exists() || snapshot.data()?.role !== 'developer') {
        await signOut(auth)
        throw new Error('هذا الحساب غير مخوّل للوصول إلى لوحة المطور.')
      }

      if (developerAccessCode) {
        const trimmed = accessCode.trim()
        if (!trimmed) {
          await signOut(auth)
          throw new Error('يرجى إدخال الرمز السري للوصول إلى لوحة المطور.')
        }
        if (trimmed !== developerAccessCode) {
          await signOut(auth)
          throw new Error('الرمز السري غير صحيح.')
        }
        try {
          window.sessionStorage.setItem(DEVELOPER_ACCESS_SESSION_KEY, 'granted')
        } catch (storageError) {
          console.warn('تعذّر حفظ جلسة المطور:', storageError)
        }
      }

      navigate('/developer', { replace: true })
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur">
        <header className="space-y-2 text-center">
          <p className="text-sm uppercase tracking-[0.4em] text-slate-400">لوحة التحكم</p>
          <h1 className="text-3xl font-bold text-yellow-300">دخول المطور</h1>
          <p className="text-xs text-slate-300">أدخل بيانات الحساب الرسمية الخاصة بفريق التطوير.</p>
        </header>

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100 text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-right">
            <label htmlFor="dev-email" className="text-xs font-medium text-slate-200">
              البريد الإلكتروني
            </label>
            <input
              id="dev-email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              placeholder="dev@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2 text-right">
            <label htmlFor="dev-password" className="text-xs font-medium text-slate-200">
              كلمة المرور
            </label>
            <input
              id="dev-password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
          </div>

          {developerAccessCode && (
            <div className="space-y-2 text-right">
              <label htmlFor="dev-code" className="text-xs font-medium text-slate-200">
                الرمز السري للمطور
              </label>
              <input
                id="dev-code"
                type="password"
                className="w-full rounded-2xl border border-white/15 bg-slate-900/70 px-4 py-3 text-sm shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                placeholder="أدخل الرمز السري"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-yellow-300 py-3 text-sm font-semibold text-slate-950 transition hover:bg-yellow-400 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
          </button>
        </form>

        <footer className="text-center text-xs text-slate-300">
          <p>لأي مشاكل تقنية يرجى التواصل مع فريق التطوير.</p>
          <Link to="/" className="text-yellow-200 hover:text-yellow-100">
            العودة إلى الصفحة الرئيسية
          </Link>
        </footer>
      </div>
    </div>
  )
}

export default DeveloperLogin
