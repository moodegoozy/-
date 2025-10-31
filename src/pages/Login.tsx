import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase'

type Mode = 'customer' | 'courier'

type UserRecord = {
  role?: string
  fullName?: string
}

const messages: Record<Mode, { title: string; description: string; cta: string }> = {
  customer: {
    title: 'دخول العملاء',
    description: 'اطلب وجباتك، تابع السلة، وتحقق من حالة طلباتك الحالية.',
    cta: 'دخول العميل',
  },
  courier: {
    title: 'دخول المندوبين',
    description: 'استلم الطلبات المسندة إليك وتتبعها حتى التسليم.',
    cta: 'دخول المندوب',
  },
}

const roleRequired: Record<Mode, string> = {
  customer: 'customer',
  courier: 'courier',
}

const toMode = (raw: string | null): Mode => (raw === 'courier' ? 'courier' : 'customer')

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => toMode(params.get('mode')))

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setMode(toMode(params.get('mode')))
  }, [params])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password)
      const snapshot = await getDoc(doc(db, 'users', credential.user.uid))

      if (!snapshot.exists()) {
        await signOut(auth)
        throw new Error('الحساب غير مسجل في قاعدة بيانات المستخدمين.')
      }

      const data = snapshot.data() as UserRecord
      if (data.role !== roleRequired[mode]) {
        await signOut(auth)
        throw new Error('نوع الحساب لا يطابق خيار الدخول المختار.')
      }

      navigate(mode === 'customer' ? '/restaurants' : '/courier', { replace: true })
    } catch (err) {
      if (err instanceof Error && err.message) {
        setError(err.message)
      } else {
        setError('تعذر تسجيل الدخول. حاول مرة أخرى.')
      }
    } finally {
      setLoading(false)
    }
  }

  const content = messages[mode]

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl bg-white/90 p-8 text-slate-900 shadow-xl">
      <header className="flex flex-col gap-3 text-right">
        <div className="flex justify-center gap-3 text-sm font-semibold">
          <button
            onClick={() => setMode('customer')}
            className={`rounded-full px-4 py-2 transition ${mode === 'customer' ? 'bg-yellow-400 text-slate-900 shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            type="button"
          >
            العملاء
          </button>
          <button
            onClick={() => setMode('courier')}
            className={`rounded-full px-4 py-2 transition ${mode === 'courier' ? 'bg-yellow-400 text-slate-900 shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            type="button"
          >
            المندوبون
          </button>
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center">{content.title}</h1>
        <p className="text-sm text-slate-600 text-center">{content.description}</p>
      </header>

      {error && (
        <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-600 text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid gap-4 text-right">
        <div className="space-y-2">
          <label htmlFor="login-email" className="text-xs font-medium text-slate-600">
            البريد الإلكتروني
          </label>
          <input
            id="login-email"
            type="email"
            required
            autoComplete="email"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
            placeholder="name@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="login-password" className="text-xs font-medium text-slate-600">
            كلمة المرور
          </label>
          <input
            id="login-password"
            type="password"
            required
            autoComplete="current-password"
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
            placeholder="••••••••"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-2xl bg-yellow-400 py-3 text-sm font-semibold text-slate-900 transition hover:bg-yellow-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
        >
          {loading ? 'جارٍ التحقق...' : content.cta}
        </button>
      </form>

      {mode === 'customer' && (
        <p className="text-xs text-center text-slate-500">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="font-semibold text-yellow-600 hover:text-yellow-500">
            أنشئ حساب عميل جديد
          </Link>
        </p>
      )}
    </div>
  )
}

export default Login
