import React, { createContext, useContext, useEffect, useState } from 'react'
import { onAuthStateChanged, signOut, User } from 'firebase/auth'
import { auth, db } from './firebase'
import { DEVELOPER_ACCESS_SESSION_KEY } from './config'
import { doc, getDoc } from 'firebase/firestore'

type Role = 'owner' | 'courier' | 'customer' | 'admin' | 'developer'

type AuthContextType = {
  user: User | null,
  role: Role | null,
  loading: boolean,
  logout: () => Promise<void>,
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  role: null,
  loading: true,
  logout: async () => {}
})

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [role, setRole] = useState<Role | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u)
      if (u) {
        const snap = await getDoc(doc(db, 'users', u.uid))
        const r = snap.exists() ? (snap.data().role as Role) : null
        setRole(r)
      } else {
        setRole(null)
      }
      setLoading(false)
    })
    return () => unsub()
  }, [])

  const logout = async () => {
    try {
      window.sessionStorage.removeItem(DEVELOPER_ACCESS_SESSION_KEY)
    } catch (error) {
      console.warn('تعذّر مسح جلسة المطور عند تسجيل الخروج:', error)
    }
    await signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, role, loading, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
