import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth'

type Props = {
  allow: Array<'owner' | 'courier' | 'customer' | 'admin'>,
  children: React.ReactNode
}

export const RoleGate: React.FC<Props> = ({ allow, children }) => {
  const { role, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">جارِ التحميل...</div>
  if (!role || !allow.includes(role)) return <Navigate to="/" replace />
  return <>{children}</>
}
