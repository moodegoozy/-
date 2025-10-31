// src/components/TopBar.tsx
import React from 'react'
import { Link } from 'react-router-dom'

export const TopBar: React.FC = () => {
  return (
    <div className="w-full bg-slate-900 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="font-semibold tracking-wide text-yellow-300">
          🍗 سفرة البيت – منصتك لإدارة الطلبات والمطاعم في مكان واحد
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2">
          <Link
            to="/developer/login"
            className="rounded-full border border-yellow-400/40 px-3 py-1 text-xs font-semibold text-yellow-200 transition hover:bg-yellow-400/10"
          >
            المطور
          </Link>
          <Link
            to="/admin/login"
            className="rounded-full bg-yellow-400 px-3 py-1 text-xs font-semibold text-slate-900 transition hover:bg-yellow-300"
          >
            تسجيل دخول المشرفين
          </Link>
        </div>
      </div>
    </div>
  )
}
