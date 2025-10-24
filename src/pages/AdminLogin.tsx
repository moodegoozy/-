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
