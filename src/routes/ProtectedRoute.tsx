import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/auth'

export const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading } = useAuth()
  if (loading) return <div className="p-8 text-center">جارِ التحميل...</div>
  if (!user) return <Navigate to="/login" replace />
  return <>{children}</>
}
