import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { DEVELOPER_ACCESS_SESSION_KEY, developerAccessCode } from '@/config'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'

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

  const [mode, setMode] = useState<LoginMode>(defaultMode)

  const [generalEmail, setGeneralEmail] = useState('')
  const [generalPassword, setGeneralPassword] = useState('')
  const [generalDeveloperCode, setGeneralDeveloperCode] = useState('')
  const [generalLoading, setGeneralLoading] = useState(false)
  const [generalError, setGeneralError] = useState<string | null>(null)

  const [familyEmail, setFamilyEmail] = useState('')
  const [familyPassword, setFamilyPassword] = useState('')
  const [familyCertificate, setFamilyCertificate] = useState('')
  const [familyLoading, setFamilyLoading] = useState(false)
  const [familyError, setFamilyError] = useState<string | null>(null)

  const [restaurantEmail, setRestaurantEmail] = useState('')
  const [restaurantPassword, setRestaurantPassword] = useState('')
  const [restaurantCR, setRestaurantCR] = useState('')
  const [restaurantLoading, setRestaurantLoading] = useState(false)
  const [restaurantError, setRestaurantError] = useState<string | null>(null)

  useEffect(() => {
    setMode(toMode(params.get('mode')))
  }, [params])

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const userCred = await signInWithEmailAndPassword(auth, generalEmail.trim(), generalPassword)
      const uid = userCred.user.uid
      const snap = await getDoc(doc(db, 'users', uid))

      if (!snap.exists()) {
        await signOut(auth)
        throw new Error('⚠️ الحساب موجود في النظام ولكن لا توجد له بيانات في السجلات الداخلية.')
      }

      const userData = snap.data() as UserData

      const trimmedDeveloperCode = generalDeveloperCode.trim()

      try {
        window.sessionStorage.removeItem(DEVELOPER_ACCESS_SESSION_KEY)
      } catch (storageError) {
        console.warn('تعذّر تحديث جلسة المطور:', storageError)
      }

      switch (userData.role) {
        case 'owner':
          navigate('/owner')
          break
        case 'courier':
          navigate('/courier')
          break
        case 'admin':
          navigate('/admin/panel')
          break
        case 'developer':
          navigate('/developer')
          break
        default:
          navigate('/')
      }
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.'
      setGeneralError(message)
    } finally {
      setGeneralLoading(false)
    }
  }

  const submitFamily = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedCertificate = familyCertificate.trim()
    if (!trimmedCertificate) {
      setFamilyError('الرجاء إدخال رقم شهادة العمل الحر المعتمدة.')
      return
    }

    setFamilyError(null)
    setFamilyLoading(true)

    try {
      const credentials = await signInWithEmailAndPassword(auth, familyEmail.trim(), familyPassword)
      const userDoc = doc(db, 'users', credentials.user.uid)
      const snapshot = await getDoc(userDoc)

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

  const renderForm = () => {
    switch (mode) {
      case 'family':
        return (
          <>
            <header className="space-y-2 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-amber-300/70">برنامج الأسر المنتجة</p>
              <h2 className="text-3xl font-extrabold text-amber-200">تسجيل دخول الأسر المنتجة</h2>
              <p className="text-sm text-amber-100/80">استخدمي بيانات الدخول الخاصة بك وأدخلي رقم شهادة العمل الحر للتحقق.</p>
            </header>

            {familyError && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-center text-sm text-rose-100">
                {familyError}
              </div>
            )}

            <form onSubmit={submitFamily} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="family-email" className="block text-sm font-medium text-amber-100/90">
                  البريد الإلكتروني المسجل
                </label>
                <input
                  id="family-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={familyEmail}
                  onChange={(event) => setFamilyEmail(event.target.value)}
                  className="w-full rounded-2xl border border-amber-200/30 bg-[#3a211c] px-4 py-3 text-base text-amber-50 shadow-inner placeholder:text-amber-200/50 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  disabled={familyLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="family-password" className="block text-sm font-medium text-amber-100/90">
                  كلمة المرور
                </label>
                <input
                  id="family-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={familyPassword}
                  onChange={(event) => setFamilyPassword(event.target.value)}
                  className="w-full rounded-2xl border border-amber-200/30 bg-[#3a211c] px-4 py-3 text-base text-amber-50 shadow-inner placeholder:text-amber-200/50 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  disabled={familyLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="family-certificate" className="block text-sm font-medium text-amber-100/90">
                  رقم شهادة العمل الحر
                </label>
                <input
                  id="family-certificate"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={familyCertificate}
                  onChange={(event) => setFamilyCertificate(event.target.value)}
                  className="w-full rounded-2xl border border-amber-200/30 bg-[#3a211c] px-4 py-3 text-base text-amber-50 shadow-inner placeholder:text-amber-200/50 focus:border-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-400/60"
                  disabled={familyLoading}
                />
                <p className="text-xs text-amber-100/70">يمكنك العثور على الرقم في شهادة العمل الحر الصادرة من منصة العمل الحر.</p>
              </div>

              <button
                type="submit"
                disabled={familyLoading}
                className="w-full rounded-2xl bg-amber-300/90 py-3 text-base font-semibold text-[#2c1b17] shadow-lg transition hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-amber-400/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {familyLoading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
              </button>
            </form>
          </>
        )
      case 'restaurant':
        return (
          <>
            <header className="space-y-2 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-sky-300/70">منصة المطاعم</p>
              <h2 className="text-3xl font-extrabold text-sky-200">تسجيل دخول المطاعم</h2>
              <p className="text-sm text-sky-100/80">أدخل بيانات حساب المطعم مع رقم السجل التجاري للتحقق من الهوية.</p>
            </header>

            {restaurantError && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-center text-sm text-rose-100">
                {restaurantError}
              </div>
            )}

            <form onSubmit={submitRestaurant} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="restaurant-email" className="block text-sm font-medium text-sky-100/90">
                  البريد الإلكتروني للمطعم
                </label>
                <input
                  id="restaurant-email"
                  type="email"
                  autoComplete="email"
                  required
                  value={restaurantEmail}
                  onChange={(event) => setRestaurantEmail(event.target.value)}
                  className="w-full rounded-2xl border border-sky-200/30 bg-[#13252f] px-4 py-3 text-base text-sky-50 shadow-inner placeholder:text-sky-200/50 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  disabled={restaurantLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="restaurant-password" className="block text-sm font-medium text-sky-100/90">
                  كلمة المرور
                </label>
                <input
                  id="restaurant-password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={restaurantPassword}
                  onChange={(event) => setRestaurantPassword(event.target.value)}
                  className="w-full rounded-2xl border border-sky-200/30 bg-[#13252f] px-4 py-3 text-base text-sky-50 shadow-inner placeholder:text-sky-200/50 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  disabled={restaurantLoading}
                />
              </div>

              <div className="space-y-2">
                <label htmlFor="restaurant-cr" className="block text-sm font-medium text-sky-100/90">
                  رقم السجل التجاري
                </label>
                <input
                  id="restaurant-cr"
                  type="text"
                  inputMode="numeric"
                  autoComplete="off"
                  value={restaurantCR}
                  onChange={(event) => setRestaurantCR(event.target.value)}
                  className="w-full rounded-2xl border border-sky-200/30 bg-[#13252f] px-4 py-3 text-base text-sky-50 shadow-inner placeholder:text-sky-200/50 focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-400/60"
                  disabled={restaurantLoading}
                />
                <p className="text-xs text-sky-100/70">أدخل الرقم كما هو مسجل في وزارة التجارة.</p>
              </div>

              <button
                type="submit"
                disabled={restaurantLoading}
                className="w-full rounded-2xl bg-sky-300/90 py-3 text-base font-semibold text-[#102026] shadow-lg transition hover:bg-sky-200 focus:outline-none focus:ring-2 focus:ring-sky-400/70 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {restaurantLoading ? 'جارٍ التحقق...' : 'تسجيل الدخول'}
              </button>
            </form>
          </>
        )
      default:
        return (
          <>
            <header className="space-y-2 text-center">
              <h2 className="text-3xl font-extrabold text-accent">دخول العملاء والمندوبين</h2>
              <p className="text-sm text-secondary/80">سجّل دخولك باستخدام البريد الإلكتروني وكلمة المرور لاستكمال طلباتك.</p>
            </header>

            {generalError && (
              <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-center text-sm text-rose-100">
                {generalError}
              </div>
            )}

            <form onSubmit={submitGeneral} className="space-y-4">
              <input
                type="email"
                placeholder="الإيميل"
                className="w-full rounded-xl border border-accent/30 bg-[#3c211c] p-3 text-secondary placeholder-[#f8deb0b3] focus:outline-none focus:ring-2 focus:ring-accent"
                value={generalEmail}
                onChange={(event) => setGeneralEmail(event.target.value)}
                disabled={generalLoading}
                required
                autoComplete="email"
              />
              <input
                type="password"
                placeholder="كلمة المرور"
                className="w-full rounded-xl border border-accent/30 bg-[#3c211c] p-3 text-secondary placeholder-[#f8deb0b3] focus:outline-none focus:ring-2 focus:ring-accent"
                value={generalPassword}
                onChange={(event) => setGeneralPassword(event.target.value)}
                disabled={generalLoading}
                required
                autoComplete="current-password"
              />

              {developerAccessCode && (
                <div className="space-y-2 rounded-2xl border border-accent/30 bg-[#2b1a16] p-3">
                  <label className="flex flex-col gap-2 text-right text-sm text-secondary/80">
                    <span className="font-semibold text-accent">رمز لوحة المطور</span>
                    <input
                      type="password"
                      inputMode="numeric"
                      placeholder="أدخل الرمز السري للوصول إلى لوحة المطور"
                      className="w-full rounded-xl border border-accent/30 bg-[#3c211c] p-3 text-secondary placeholder-[#f8deb0b3] focus:outline-none focus:ring-2 focus:ring-accent"
                      value={generalDeveloperCode}
                      onChange={(event) => setGeneralDeveloperCode(event.target.value)}
                      disabled={generalLoading}
                      autoComplete="one-time-code"
                    />
                    <span className="text-xs text-secondary/70">لن تحتاج إليه إلا إذا كان دور حسابك مطور.</span>
                  </label>
                </div>
              )}

              <button
                disabled={generalLoading}
                className="w-full rounded-xl bg-accent p-3 font-bold text-primary shadow-lg transition hover:scale-105 hover:bg-[#d3a442] disabled:cursor-not-allowed disabled:opacity-70"
              >
                {generalLoading ? 'جارٍ الدخول...' : 'دخول'}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-secondary/80">
              ليس لديك حساب؟{' '}
              <Link className="font-semibold text-accent hover:text-[#e0b861]" to="/register">
                سجّل الآن
              </Link>
            </p>
          </>
        )
    }
  }

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

      <div
        className={`w-full max-w-xl rounded-3xl border p-8 shadow-2xl backdrop-blur-xl ${
          mode === 'family'
            ? 'border-amber-200/30 bg-[rgba(39,22,19,0.88)] text-amber-50'
            : mode === 'restaurant'
            ? 'border-sky-200/30 bg-[rgba(12,24,30,0.9)] text-sky-50'
            : 'border-accent/30 bg-[rgba(43,26,22,0.85)] text-secondary'
        }`}
      >
        {renderForm()}
      </div>
    </div>
  )
}

export default Login
