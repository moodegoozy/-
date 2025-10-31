import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth'

type Props = {
  children: React.ReactNode,
  redirectTo?: string
}

export const ProtectedRoute: React.FC<Props> = ({ children, redirectTo = '/login' }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">جارِ التحميل...</div>
  if (!user) return <Navigate to={redirectTo} replace />
  return <>{children}</>
}
