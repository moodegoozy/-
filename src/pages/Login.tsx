import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase'
import { DEVELOPER_ACCESS_SESSION_KEY, developerAccessCode } from '@/config'

const AUTH_ERROR_MESSAGES: Record<string, string> = {
  'auth/invalid-credential': 'بيانات الدخول غير صحيحة. تأكد من البريد أو كلمة المرور.',
  'auth/user-not-found': 'لا يوجد حساب بهذه البيانات.',
  'auth/too-many-requests': 'تم إيقاف المحاولات مؤقتًا بسبب محاولات فاشلة متتالية. حاول لاحقًا.',
}

type LoginAudience = 'customer' | 'courier' | 'restaurant'

type ModeContent = {
  title: string
  description: string
  cta: string
  panelClass: string
}

const MODE_CONTENT: Record<LoginAudience, ModeContent> = {
  customer: {
    title: 'دخول العملاء',
    description: 'اطلب وجباتك المفضلة، تابع السلة، وراقب حالة طلباتك لحظة بلحظة.',
    cta: 'دخول العميل',
    panelClass: 'border-accent/30 bg-[rgba(43,26,22,0.85)] text-secondary',
  },
  courier: {
    title: 'دخول المندوبين',
    description: 'استلم المهام الموكلة إليك وحدّث حالة الطلب من الاستلام حتى التسليم.',
    cta: 'دخول المندوب',
    panelClass: 'border-emerald-200/40 bg-[rgba(18,39,33,0.9)] text-emerald-50',
  },
  restaurant: {
    title: 'دخول أصحاب المطاعم',
    description: 'إدارة الطلبات، تحديث القائمة، ومتابعة فريق التوصيل من لوحة المطعم.',
    cta: 'دخول صاحب المطعم',
    panelClass: 'border-sky-200/30 bg-[rgba(12,24,30,0.9)] text-sky-50',
  },
}

const toAudience = (raw: string | null): LoginAudience => {
  if (raw === 'courier') return 'courier'
  if (raw === 'restaurant') return 'restaurant'
  return 'customer'
}

const formatAuthError = (error: unknown): string => {
  if (error && typeof error === 'object' && 'code' in error) {
    const code = String((error as { code?: string }).code)
    if (AUTH_ERROR_MESSAGES[code]) {
      return AUTH_ERROR_MESSAGES[code]
    }
  }

  if (error instanceof Error && error.message) {
    return error.message
  }

  return 'حدث خطأ غير متوقع. حاول مرة أخرى.'
}

type UserRecord = {
  role?: string
}

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [audience, setAudience] = useState<LoginAudience>(() => toAudience(params.get('mode')))

  useEffect(() => {
    setAudience(toAudience(params.get('mode')))
  }, [params])

  const content = useMemo(() => MODE_CONTENT[audience], [audience])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [developerCode, setDeveloperCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      const snapshot = await getDoc(doc(db, 'users', credentials.user.uid))

      if (!snapshot.exists()) {
        await signOut(auth)
        throw new Error('الحساب موجود في Firebase لكن لا توجد بيانات ملف مستخدم مرتبطة به.')
      }

      const data = snapshot.data() as UserRecord
      const role = data.role ?? 'customer'

      if (role === 'developer') {
        const trimmed = developerCode.trim()
        if (developerAccessCode) {
          if (!trimmed) {
            await signOut(auth)
            throw new Error('يرجى إدخال الرمز السري للوصول إلى لوحة المطور.')
          }
          if (trimmed !== developerAccessCode) {
            await signOut(auth)
            throw new Error('الرمز السري للمطور غير صحيح.')
          }
        }
        try {
          window.sessionStorage.setItem(DEVELOPER_ACCESS_SESSION_KEY, 'granted')
        } catch (storageError) {
          console.warn('تعذّر حفظ جلسة المطور:', storageError)
        }
      } else {
        try {
          window.sessionStorage.removeItem(DEVELOPER_ACCESS_SESSION_KEY)
        } catch (storageError) {
          console.warn('تعذّر تحديث جلسة المطور:', storageError)
        }
      }

      switch (role) {
        case 'owner':
          navigate('/owner', { replace: true })
          break
        case 'courier':
          navigate('/courier', { replace: true })
          break
        case 'admin':
          navigate('/admin/panel', { replace: true })
          break
        case 'developer':
          navigate('/developer', { replace: true })
          break
        case 'customer':
          navigate('/restaurants', { replace: true })
          break
        default:
          navigate('/', { replace: true })
          break
      }
    } catch (err) {
      setError(formatAuthError(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-8 rounded-3xl bg-white/90 p-8 text-slate-900 shadow-xl">
      <header className="flex flex-col gap-3 text-right">
        <div className="flex flex-wrap justify-center gap-3 text-sm font-semibold">
          {(
            [
              { id: 'customer', label: 'العملاء' },
              { id: 'courier', label: 'المندوبون' },
              { id: 'restaurant', label: 'أصحاب المطاعم' },
            ] as Array<{ id: LoginAudience; label: string }>
          ).map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setAudience(id)}
              className={`rounded-full px-4 py-2 transition ${
                audience === id ? 'bg-yellow-400 text-slate-900 shadow' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        <h1 className="text-2xl font-bold text-slate-900 text-center">{content.title}</h1>
        <p className="text-sm text-slate-600 text-center">{content.description}</p>
      </header>

      <div className={`w-full max-w-xl rounded-3xl border p-8 shadow-2xl backdrop-blur-xl ${content.panelClass}`}>
        {error && (
          <div className="mb-4 rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100 text-right">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 text-right">
            <label htmlFor="login-email" className="block text-xs font-medium opacity-80">
              البريد الإلكتروني
            </label>
            <input
              id="login-email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-xl border border-white/25 bg-black/10 p-3 text-base text-current shadow-inner focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2 text-right">
            <label htmlFor="login-password" className="block text-xs font-medium opacity-80">
              كلمة المرور
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              className="w-full rounded-xl border border-white/25 bg-black/10 p-3 text-base text-current shadow-inner focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
          </div>

          {developerAccessCode && (
            <div className="space-y-2 text-right">
              <label htmlFor="developer-code" className="block text-xs font-medium opacity-80">
                رمز لوحة المطور (للحسابات المصرّح لها فقط)
              </label>
              <input
                id="developer-code"
                type="password"
                autoComplete="one-time-code"
                className="w-full rounded-xl border border-white/25 bg-black/10 p-3 text-base text-current shadow-inner focus:border-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                value={developerCode}
                onChange={(event) => setDeveloperCode(event.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-yellow-400 p-3 font-bold text-slate-900 shadow-lg transition hover:scale-105 hover:bg-yellow-300 disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'جارٍ التحقق...' : content.cta}
          </button>
        </form>

        <p className="mt-6 text-center text-sm opacity-80">
          ليس لديك حساب؟{' '}
          <Link className="font-semibold text-yellow-200 hover:text-yellow-100" to="/register">
            سجّل الآن
          </Link>
        </p>
      </div>
    </div>
  )
}

export default Login
