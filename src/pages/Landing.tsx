import React from 'react'
import { Link } from 'react-router-dom'

export const Landing: React.FC = () => {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center gap-10 text-center text-slate-900">
      <div className="space-y-3">
        <h1 className="text-4xl md:text-5xl font-extrabold text-yellow-600 drop-shadow">🍗 سفرة البيت</h1>
        <p className="text-base md:text-lg text-slate-600 max-w-2xl">
          اختر نوع الدخول المناسب لك للانطلاق في النظام. العملاء يطلبون مباشرة، والمندوبون يتابعون الطلبات الموكلة لهم.
        </p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 w-full max-w-3xl">
        <Link
          to="/login?mode=customer"
          className="group rounded-3xl border border-yellow-400/40 bg-white/90 px-8 py-10 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
        >
          <div className="text-3xl mb-4">👥</div>
          <h2 className="text-xl font-semibold text-slate-900">تسجيل دخول العملاء</h2>
          <p className="mt-2 text-sm text-slate-600">
            دخول سريع لاستعراض المطاعم، إضافة الطلبات للسلة، وتتبع حالة التوصيل لحظة بلحظة.
          </p>
          <span className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-yellow-600 group-hover:text-yellow-500">
            أدخل لحسابك الآن →
          </span>
        </Link>

        <Link
          to="/login?mode=courier"
          className="group rounded-3xl border border-slate-300 bg-white/80 px-8 py-10 shadow-lg transition hover:-translate-y-1 hover:shadow-2xl"
        >
          <div className="text-3xl mb-4">🚚</div>
          <h2 className="text-xl font-semibold text-slate-900">تسجيل دخول المندوبين</h2>
          <p className="mt-2 text-sm text-slate-600">
            اطلع على الطلبات الجديدة، استلم المهام الموكلة إليك، وحدّث الحالة من الاستلام حتى التسليم.
          </p>
          <span className="mt-6 inline-flex items-center justify-center gap-2 text-sm font-semibold text-slate-600 group-hover:text-slate-800">
            إدارة الطلبات الموكلة →
          </span>
        </Link>
      </div>
    </div>
  )
}

export default Landing
