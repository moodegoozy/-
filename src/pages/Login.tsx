// src/pages/Login.tsx
import React, { useEffect, useMemo, useState } from 'react'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { Link, useNavigate } from 'react-router-dom'
import { Megaphone } from 'lucide-react'

export type LoginMode = 'general' | 'family' | 'restaurant'

export interface LoginProps {
  defaultMode?: LoginMode
}

type UserData = {
  role?: string
  [key: string]: unknown
}

type OwnerProfile = UserData & {
  accountType?: string
  ownerType?: string
  freelancerCertificate?: string
  freelanceCertificate?: string
  commercialRegistration?: string
  crNumber?: string
}

const normalizeAccountType = (profile: OwnerProfile) => {
  const possible = [profile.accountType, profile.ownerType].find((value) => typeof value === 'string')
  return possible ? possible.trim().toLowerCase() : ''
}

const normalizeCertificate = (profile: OwnerProfile) => {
  const possible =
    [profile.freelancerCertificate, profile.freelanceCertificate].find((value) => typeof value === 'string') || ''
  return possible.trim()
}

const normalizeCommercialRegistration = (profile: OwnerProfile) => {
  const possible = [profile.commercialRegistration, profile.crNumber].find((value) => typeof value === 'string') || ''
  return possible.trim()
}

const familiesAccountTypes = ['family', 'productive-family', 'productive_family', 'productive']
const restaurantAccountTypes = ['restaurant', 'resturant', 'commercial']

export const Login: React.FC<LoginProps> = ({ defaultMode = 'general' }) => {
  const navigate = useNavigate()

  const [mode, setMode] = useState<LoginMode>(defaultMode)

  const [generalEmail, setGeneralEmail] = useState('')
  const [generalPassword, setGeneralPassword] = useState('')
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
    setMode(defaultMode)
  }, [defaultMode])

  const options = useMemo(
    () => [
      {
        id: 'general' as LoginMode,
        title: 'العملاء والمندوبين',
        subtitle: 'دخولك المعتاد لحساب العميل أو المندوب.'
      },
      {
        id: 'family' as LoginMode,
        title: 'الأسر المنتجة',
        subtitle: 'دخول خاص بالأسر المنتجة مع التحقق من شهادة العمل الحر.'
      },
      {
        id: 'restaurant' as LoginMode,
        title: 'المطاعم',
        subtitle: 'دخول أصحاب المطاعم مع التحقق من السجل التجاري.'
      }
    ],
    [],
  )

  const clearErrors = () => {
    setGeneralError(null)
    setFamilyError(null)
    setRestaurantError(null)
  }

  const submitGeneral = async (event: React.FormEvent) => {
    event.preventDefault()
    setGeneralError(null)
    setGeneralLoading(true)

    try {
      const userCred = await signInWithEmailAndPassword(auth, generalEmail.trim(), generalPassword)
      const uid = userCred.user.uid
      const snap = await getDoc(doc(db, 'users', uid))

      if (!snap.exists()) {
        await signOut(auth)
        throw new Error('⚠️ الحساب موجود في النظام ولكن لا توجد له بيانات في السجلات الداخلية.')
      }

      const userData = snap.data() as UserData

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
        throw new Error('تعذّر العثور على بيانات الحساب. يرجى التواصل مع الدعم.')
      }

      const data = snapshot.data() as OwnerProfile

      if (data.role !== 'owner') {
        await signOut(auth)
        throw new Error('هذا الحساب غير مسجل كحساب أسرة منتجة.')
      }

      const type = normalizeAccountType(data)
      if (type && !familiesAccountTypes.includes(type)) {
        await signOut(auth)
        throw new Error('هذا الحساب مسجل كنوع مختلف. استخدمي الوضع المناسب للحساب.')
      }

      const storedCertificate = normalizeCertificate(data)
      if (storedCertificate && storedCertificate !== trimmedCertificate) {
        await signOut(auth)
        throw new Error('رقم شهادة العمل الحر غير مطابق للسجل لدينا.')
      }

      if (!storedCertificate) {
        await setDoc(
          userDoc,
          {
            accountType: 'family',
            freelancerCertificate: trimmedCertificate,
          },
          { merge: true },
        )
      }

      navigate('/owner', { replace: true })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.'
      setFamilyError(message)
    } finally {
      setFamilyLoading(false)
    }
  }

  const submitRestaurant = async (event: React.FormEvent) => {
    event.preventDefault()

    const trimmedRegistration = restaurantCR.trim()
    if (!trimmedRegistration) {
      setRestaurantError('الرجاء إدخال رقم السجل التجاري المرتبط بالحساب.')
      return
    }

    setRestaurantError(null)
    setRestaurantLoading(true)

    try {
      const credentials = await signInWithEmailAndPassword(auth, restaurantEmail.trim(), restaurantPassword)
      const userDoc = doc(db, 'users', credentials.user.uid)
      const snapshot = await getDoc(userDoc)

      if (!snapshot.exists()) {
        await signOut(auth)
        throw new Error('تعذّر العثور على بيانات الحساب. يرجى التواصل مع الدعم.')
      }

      const data = snapshot.data() as OwnerProfile

      if (data.role !== 'owner') {
        await signOut(auth)
        throw new Error('هذا الحساب غير مسجل كحساب مطعم.')
      }

      const type = normalizeAccountType(data)
      if (type && !restaurantAccountTypes.includes(type)) {
        await signOut(auth)
        throw new Error('هذا الحساب مسجل كنوع مختلف. استخدم الوضع المناسب للحساب.')
      }

      const storedRegistration = normalizeCommercialRegistration(data)
      if (storedRegistration && storedRegistration !== trimmedRegistration) {
        await signOut(auth)
        throw new Error('رقم السجل التجاري غير مطابق للسجل لدينا.')
      }

      if (!storedRegistration) {
        await setDoc(
          userDoc,
          {
            accountType: 'restaurant',
            commercialRegistration: trimmedRegistration,
          },
          { merge: true },
        )
      }

      navigate('/owner', { replace: true })
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.'
      setRestaurantError(message)
    } finally {
      setRestaurantLoading(false)
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
    <div className="min-h-screen flex flex-col items-center justify-center gap-10 bg-gradient-to-br from-primary via-dark to-[#3a1a1a] px-4 py-16">
      <section className="w-full max-w-4xl space-y-6">
        <Link
          to="/ads"
          className="flex flex-col gap-4 rounded-3xl border border-accent/30 bg-[rgba(43,26,22,0.88)] p-5 text-secondary shadow-2xl transition hover:border-accent hover:shadow-amber-400/30"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-row-reverse items-center gap-3 text-right sm:gap-4">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent">
                <Megaphone className="h-6 w-6" />
              </span>
              <div className="space-y-1">
                <p className="text-sm text-accent/70">مساحة إعلانية رمزية</p>
                <h2 className="text-xl font-bold text-accent">أبرز إعلانك لكل مستخدم</h2>
              </div>
            </div>
            <span className="self-start rounded-2xl bg-accent px-4 py-2 text-sm font-semibold text-primary shadow sm:self-auto">
              اكتشف التفاصيل
            </span>
          </div>
          <p className="text-sm text-secondary/80">
            وفرنا خانة مخصّصة للإعلانات داخل التطبيق برسوم رمزية مع علامة مكبر النداء حتى يظهر إعلانك لجميع العملاء والأسر المنتجة والمطاعم فوراً بعد اعتماده.
          </p>
        </Link>

        <div className="grid gap-3 md:grid-cols-3">
          {options.map((option) => {
            const isActive = mode === option.id
            const baseColors =
              option.id === 'family'
                ? 'border-amber-200/30 bg-[rgba(39,22,19,0.88)] text-amber-50 hover:border-amber-300 hover:shadow-amber-500/30'
                : option.id === 'restaurant'
                ? 'border-sky-200/30 bg-[rgba(12,24,30,0.9)] text-sky-50 hover:border-sky-300 hover:shadow-sky-500/30'
                : 'border-accent/30 bg-[rgba(43,26,22,0.85)] text-secondary hover:border-accent hover:shadow-amber-400/30'

            return (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  clearErrors()
                  setMode(option.id)
                }}
                className={`group flex flex-col justify-between rounded-3xl border p-5 text-right shadow-xl transition focus:outline-none focus:ring-2 focus:ring-accent/60 ${
                  baseColors
                } ${isActive ? 'ring-2 ring-accent/60' : 'opacity-80 hover:opacity-100'}`}
              >
                <div className="space-y-2">
                  <h3 className="text-xl font-bold">{option.title}</h3>
                  <p className="text-sm opacity-80">{option.subtitle}</p>
                </div>
                <span
                  className={`mt-4 inline-flex items-center justify-center rounded-2xl px-5 py-2 text-sm font-semibold transition ${
                    option.id === 'family'
                      ? 'bg-amber-300/90 text-[#2c1b17]'
                      : option.id === 'restaurant'
                      ? 'bg-sky-300/90 text-[#102026]'
                      : 'bg-accent text-primary'
                  } ${isActive ? '' : 'group-hover:scale-105 group-hover:brightness-110'}`}
                >
                  {isActive ? 'الوضع الحالي' : 'اختيار'}
                </span>
              </button>
            )
          })}
        </div>
      </section>

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
