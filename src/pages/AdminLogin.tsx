import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'

import { auth, db } from '@/firebase'

export const AdminLogin: React.FC = () => {
import React, { useMemo, useState } from 'react'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updateProfile } from 'firebase/auth'
import { auth, db } from '@/firebase'
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore'
import { useNavigate } from 'react-router-dom'

type Mode = 'login' | 'register'

export const AdminLogin: React.FC = () => {
  const [mode, setMode] = useState<Mode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const navigate = useNavigate()

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
  const nav = useNavigate()

  const resetForm = useMemo(
    () => () => {
      setName('')
      setEmail('')
      setPassword('')
      setError(null)
    },
    []
  )

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const credentials = await signInWithEmailAndPassword(auth, email.trim(), password)
      const profile = await getDoc(doc(db, 'users', credentials.user.uid))

      if (!profile.exists() || profile.data()?.role !== 'admin') {
      const cred = await signInWithEmailAndPassword(auth, email, password)
      const snap = await getDoc(doc(db, 'users', cred.user.uid))

      if (!snap.exists() || snap.data().role !== 'admin') {
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
      nav('/admin/panel')
    } catch (err: any) {
      setError(err.message ?? 'تعذّر تسجيل الدخول. يرجى المحاولة من جديد.')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    if (!name.trim()) {
      setError('أدخلي اسم المشرفة.')
      setLoading(false)
      return
    }

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password)
      await updateProfile(cred.user, { displayName: name })
      await setDoc(doc(db, 'users', cred.user.uid), {
        role: 'admin',
        email,
        name,
        createdAt: serverTimestamp(),
      })
      nav('/admin/panel')
    } catch (err: any) {
      setError(err.message ?? 'تعذّر إنشاء الحساب. يرجى المحاولة مجدداً.')
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
  const submitHandler = mode === 'login' ? handleLogin : handleRegister

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      <div className="w-full max-w-2xl bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl shadow-2xl p-8 text-white space-y-6">
        <header className="text-center space-y-2">
          <h1 className="text-3xl font-extrabold text-yellow-400">لوحة المشرفات</h1>
          <p className="text-gray-300">إدارة الوصول الخاص بالمشرفات</p>
        </header>

        <div className="grid grid-cols-2 gap-2 bg-white/10 rounded-2xl p-1">
          <button
            onClick={() => { setMode('login'); resetForm() }}
            className={`py-2 rounded-2xl font-semibold transition ${mode === 'login' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-gray-200 hover:text-white'}`}
          >
            دخول المشرفة
          </button>
          <button
            onClick={() => { setMode('register'); resetForm() }}
            className={`py-2 rounded-2xl font-semibold transition ${mode === 'register' ? 'bg-yellow-400 text-slate-900 shadow-lg' : 'text-gray-200 hover:text-white'}`}
          >
            تسجيل مشرفة جديدة
          </button>
        </div>

        {error && (
          <div className="rounded-xl bg-red-500/20 border border-red-500/50 text-red-100 p-3 text-sm text-center">
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
        <form onSubmit={submitHandler} className="space-y-4">
          {mode === 'register' && (
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="اسم المشرفة"
              className="w-full rounded-xl p-3 bg-slate-900/70 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
            />
          )}

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
            placeholder={mode === 'login' ? 'كلمة المرور' : 'كلمة المرور للمشرفة الجديدة'}
            className="w-full rounded-xl p-3 bg-slate-900/70 text-white border border-white/20 focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />

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
            className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold p-3 rounded-xl shadow-lg transition transform hover:scale-105 disabled:opacity-60"
          >
            {loading ? 'جارٍ المعالجة...' : mode === 'login' ? 'دخول المشرفة' : 'إنشاء حساب مشرفة'}
          </button>
        </form>

        <p className="text-xs text-gray-300 text-center">
          هذه الصفحة مخصّصة للمشرفات لإدارة صلاحياتهن فقط، ولا يمكن للعملاء أو أصحاب المطاعم إنشاء حسابات منها.
        </p>
      </div>
    </div>
  )
}

export default AdminLogin
