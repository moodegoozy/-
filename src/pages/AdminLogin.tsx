import React, { useCallback, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from 'firebase/auth'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase'

type Mode = 'login' | 'register'

type FirebaseErrorLike = {
  code?: string
  message?: string
}

const getErrorMessage = (error: unknown) => {
  if (error && typeof error === 'object') {
    const firebaseError = error as FirebaseErrorLike

    switch (firebaseError.code) {
      case 'auth/invalid-credential':
      case 'auth/wrong-password':
        return 'بيانات الدخول غير صحيحة.'
      case 'auth/user-not-found':
        return 'لا يوجد حساب مشرفة مرتبط بهذا البريد الإلكتروني.'
      case 'auth/email-already-in-use':
        return 'هذا البريد الإلكتروني مرتبط بحساب آخر بالفعل.'
      case 'auth/weak-password':
        return 'الرجاء اختيار كلمة مرور أقوى (٦ أحرف على الأقل).'
      default:
        if (firebaseError.message && firebaseError.message.trim().length > 0) {
          return firebaseError.message
        }
    }
  }

  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message
  }

  return 'حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.'
}

export const AdminLogin: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  const resetForm = useCallback(() => {
    setName('')
    setEmail('')
    setPassword('')
    setError(null)
    setLoading(false)
  }, [])

  const attemptLogin = async () => {
    const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
    const profile = await getDoc(doc(db, 'users', credentials.user.uid))

    if (!profile.exists() || profile.data()?.role !== 'admin') {
      await signOut(auth)
      throw new Error('هذا الحساب غير مخوّل للوصول إلى لوحة المشرفات.')
    }

    navigate('/admin/panel', { replace: true })
  }

  const attemptRegister = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      throw new Error('أدخلي اسم المشرفة.')
    }

    const normalizedEmail = email.trim().toLowerCase()
    const credentials = await createUserWithEmailAndPassword(auth, normalizedEmail, password)

    await updateProfile(credentials.user, { displayName: trimmedName })
    await setDoc(doc(db, 'users', credentials.user.uid), {
      role: 'admin',
      email: normalizedEmail,
      name: trimmedName,
      createdAt: serverTimestamp(),
    })

    navigate('/admin/panel', { replace: true })
  }

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (mode === 'login') {
        await attemptLogin()
      } else {
        await attemptRegister()
      }
    } catch (err) {
      setError(getErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-4 py-12">
      <div className="mx-auto flex min-h-[75vh] max-w-2xl flex-col justify-center space-y-8 rounded-3xl border border-white/15 bg-white/10 p-10 text-white shadow-2xl backdrop-blur-xl">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-yellow-400">لوحة المشرفات</h1>
          <p className="text-sm text-slate-200">الدخول متاح للمشرفات المصرّح لهن فقط</p>
        </header>

        <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/10 p-1">
          <button
            type="button"
            onClick={() => {
              setMode('login')
              resetForm()
            }}
            className={`rounded-2xl py-2 font-semibold transition ${
              mode === 'login'
                ? 'bg-yellow-400 text-slate-950 shadow-lg'
                : 'text-slate-200 hover:text-white'
            }`}
            disabled={loading}
          >
            دخول المشرفة
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register')
              resetForm()
            }}
            className={`rounded-2xl py-2 font-semibold transition ${
              mode === 'register'
                ? 'bg-yellow-400 text-slate-950 shadow-lg'
                : 'text-slate-200 hover:text-white'
            }`}
            disabled={loading}
          >
            تسجيل مشرفة جديدة
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-center text-sm text-rose-100">
            {error}
          </div>
        )}

        <form className="space-y-5" onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="space-y-2">
              <label htmlFor="admin-name" className="block text-sm font-medium text-slate-200">
                اسم المشرفة
              </label>
              <input
                id="admin-name"
                type="text"
                autoComplete="name"
                className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                placeholder="مثال: سارة القحطاني"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={loading}
              />
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="admin-email" className="block text-sm font-medium text-slate-200">
              البريد الإلكتروني
            </label>
            <input
              id="admin-email"
              type="email"
              required
              autoComplete="email"
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              placeholder="name@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="admin-password" className="block text-sm font-medium text-slate-200">
              {mode === 'login' ? 'كلمة المرور' : 'كلمة مرور المشرفة الجديدة'}
            </label>
            <input
              id="admin-password"
              type="password"
              required
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              className="w-full rounded-2xl border border-white/20 bg-slate-900/70 px-4 py-3 text-base shadow-inner focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              disabled={loading}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-yellow-400 py-3 text-base font-semibold text-slate-950 transition hover:bg-yellow-500 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? 'جارٍ المعالجة...' : mode === 'login' ? 'دخول المشرفة' : 'إنشاء حساب مشرفة'}
          </button>
        </form>

        <div className="space-y-2 text-center text-xs text-slate-300">
          <p>في حال واجهتِ مشكلة في الدخول يرجى التواصل مع فريق الدعم.</p>
          <Link to="/" className="text-yellow-300 transition hover:text-yellow-200">
            العودة إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  )
}

export default AdminLogin
