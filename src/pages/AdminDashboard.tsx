import React from 'react'
import { useAuth } from '@/auth'

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <header className="bg-primary text-white p-6 rounded-3xl shadow-lg text-center">
        <h1 className="text-3xl font-bold">لوحة تحكم المشرفات</h1>
        <p className="text-lg text-accent/90 mt-2">أهلاً {user?.email ?? 'بك'}! يمكنك إدارة التطبيق من هنا.</p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
          <h2 className="text-xl font-semibold text-primary mb-2">مراقبة الطلبات</h2>
          <p className="text-sm text-gray-600">راجعي حالة الطلبات النشطة وتابعي عمليات التسليم.</p>
        </div>
        <div className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
          <h2 className="text-xl font-semibold text-primary mb-2">إدارة المستخدمين</h2>
          <p className="text-sm text-gray-600">تأكدي من صلاحيات أصحاب المطاعم والمندوبين والعملاء.</p>
        </div>
        <div className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
          <h2 className="text-xl font-semibold text-primary mb-2">التقارير</h2>
          <p className="text-sm text-gray-600">اطلعي على أحدث الأرقام وأداء المنصة لتطوير الخدمة.</p>
        </div>
      </section>

      <p className="text-sm text-gray-500 text-center">
        * يمكن ربط هذه الواجهة لاحقاً ببيانات Firestore لعرض إحصاءات حية وإجراءات تحكم متقدمة.
      </p>
    </div>
  )
}
