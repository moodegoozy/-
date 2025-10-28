// src/pages/AdsPage.tsx
import React from 'react'

type Campaign = {
  id: string
  title: string
  description: string
  budget: string
  status: 'active' | 'scheduled' | 'completed'
  duration: string
  audience: string
}

const campaigns: Campaign[] = [
  {
    id: 'cmp-1',
    title: 'أسبوع الأسر المنتجة',
    description: 'ترويج خاص لمنتجات الأسر المنتجة المضافة حديثاً مع خصم 15% على أول طلب.',
    budget: '4,500 ر.س',
    status: 'active',
    duration: '12 - 18 مارس',
    audience: 'العملاء الجدد في جدة والمدينة',
  },
  {
    id: 'cmp-2',
    title: 'وجبات الغداء للمكاتب',
    description: 'حزمة إعلانية تستهدف الشركات الصغيرة مع خيار اشتراك أسبوعي في الوجبات.',
    budget: '6,200 ر.س',
    status: 'scheduled',
    duration: '22 - 30 مارس',
    audience: 'أحياء المال والأعمال في الرياض',
  },
  {
    id: 'cmp-3',
    title: 'تعويض تكاليف التوصيل',
    description: 'إعلان موسمي يوضح تحمل التطبيق لرسوم التوصيل عن العملاء في عطلة نهاية الأسبوع.',
    budget: '3,000 ر.س',
    status: 'completed',
    duration: '1 - 4 مارس',
    audience: 'العملاء النشطون خلال آخر 30 يوم',
  },
]

const statusBadges: Record<Campaign['status'], string> = {
  active: 'bg-green-500/20 text-green-200 border border-green-400/50',
  scheduled: 'bg-amber-500/20 text-amber-200 border border-amber-400/50',
  completed: 'bg-slate-500/20 text-slate-200 border border-slate-400/50',
}

export const AdsPage: React.FC = () => {
  const active = campaigns.filter(c => c.status === 'active')
  const scheduled = campaigns.filter(c => c.status === 'scheduled')
  const completed = campaigns.filter(c => c.status === 'completed')

  return (
    <div className="py-12 space-y-10">
      <header className="bg-gradient-to-r from-primary/80 to-accent/30 border border-accent/40 shadow-2xl rounded-3xl p-8 text-white">
        <h1 className="text-3xl font-extrabold mb-4">📣 مركز الإعلانات</h1>
        <p className="text-lg text-secondary">
          راقب الحملات النشطة وجدول الإعلانات القادمة وشارك النتائج مع فريق التسويق في مكان واحد. تم تصميم هذه الصفحة
          للمطوّرات والمشرفات حتى يسهل عليهن ضبط الرسائل التسويقية داخل التطبيق.
        </p>
        <div className="mt-6 grid sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-dark/30 border border-white/10">
            <p className="text-sm text-secondary/80">الحملات النشطة</p>
            <p className="text-2xl font-bold">{active.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark/30 border border-white/10">
            <p className="text-sm text-secondary/80">حملات مجدولة</p>
            <p className="text-2xl font-bold">{scheduled.length}</p>
          </div>
          <div className="p-4 rounded-2xl bg-dark/30 border border-white/10">
            <p className="text-sm text-secondary/80">ميزانية الشهر</p>
            <p className="text-2xl font-bold">13,700 ر.س</p>
          </div>
        </div>
      </header>

      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">لوحة الحملات</h2>
          <button className="px-5 py-2 rounded-2xl bg-accent text-primary font-semibold shadow-lg hover:shadow-xl transition">
            ➕ إنشاء إعلان جديد
          </button>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {[{ label: 'نشط الآن', data: active }, { label: 'مجدول', data: scheduled }, { label: 'انتهى مؤخراً', data: completed }].map(
            column => (
              <div key={column.label} className="bg-dark/60 border border-white/5 rounded-3xl p-6 space-y-4 shadow-inner">
                <h3 className="text-xl font-semibold text-accent flex items-center gap-2">
                  <span>📆</span>
                  {column.label}
                </h3>
                {column.data.length === 0 ? (
                  <p className="text-sm text-gray-400">لا توجد حملات في هذا القسم حالياً.</p>
                ) : (
                  <ul className="space-y-4">
                    {column.data.map(campaign => (
                      <li key={campaign.id} className="p-4 rounded-2xl bg-primary/30 border border-primary/40">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="text-lg font-bold text-white">{campaign.title}</h4>
                            <p className="text-sm text-gray-200 mt-1">{campaign.description}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusBadges[campaign.status]}`}>
                            {campaign.status === 'active'
                              ? 'نشطة'
                              : campaign.status === 'scheduled'
                              ? 'مجدولة'
                              : 'منتهية'}
                          </span>
                        </div>
                        <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-gray-200">
                          <div>
                            <dt className="text-gray-400">المدة</dt>
                            <dd className="font-semibold text-white">{campaign.duration}</dd>
                          </div>
                          <div>
                            <dt className="text-gray-400">الميزانية</dt>
                            <dd className="font-semibold text-white">{campaign.budget}</dd>
                          </div>
                          <div className="col-span-2">
                            <dt className="text-gray-400">الجمهور</dt>
                            <dd className="font-semibold text-white">{campaign.audience}</dd>
                          </div>
                        </dl>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )
          )}
        </div>
      </section>

      <section className="grid lg:grid-cols-2 gap-6">
        <div className="rounded-3xl bg-primary/20 border border-primary/40 p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">🎯 قنوات الإعلان</h3>
          <ul className="space-y-3 text-sm text-gray-200">
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              إعلانات الدفع داخل التطبيق تظهر بعد مراجعة المشرفات.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              تنبيهات فورية للمستخدمين المخلصين عند توفر عرض خاص من مطعم مفضل.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              مساحة بانر في الصفحة الرئيسية مع تتبع لنقرات المستخدمين.
            </li>
            <li className="flex items-start gap-2">
              <span className="text-accent">•</span>
              حزم ترويجية مشتركة مع الأسر المنتجة أبرزهم في قسم المنتجات المميزة.
            </li>
          </ul>
        </div>

        <div className="rounded-3xl bg-dark/70 border border-white/10 p-6 space-y-4">
          <h3 className="text-xl font-semibold text-white">📊 مؤشرات الأداء</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-200">
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <p className="text-gray-400">متوسط النقرات اليومي</p>
              <p className="text-2xl font-bold text-accent">1,240</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <p className="text-gray-400">التحويل إلى طلب</p>
              <p className="text-2xl font-bold text-accent">17%</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <p className="text-gray-400">قيمة الطلب المتوسطة</p>
              <p className="text-2xl font-bold text-accent">68 ر.س</p>
            </div>
            <div className="p-4 rounded-2xl bg-black/30 border border-white/5">
              <p className="text-gray-400">إجمالي مرات الظهور</p>
              <p className="text-2xl font-bold text-accent">482K</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-yellow-500/40 bg-yellow-500/10 p-6 space-y-4">
        <h3 className="text-xl font-semibold text-yellow-300">📝 إرشادات إنشاء إعلان</h3>
        <ol className="list-decimal list-inside text-sm text-gray-100 space-y-2">
          <li>تأكد من وضوح الرسالة التسويقية والمدة الزمنية للعرض.</li>
          <li>راجع الميزانية واقترانها بمؤشرات الأداء المطلوبة قبل النشر.</li>
          <li>اربط الإعلان بالمنتجات المميزة لزيادة فرصة التحويل.</li>
          <li>تابع التعليقات وتقييم العملاء خلال فترة الحملة لتحديث المحتوى.</li>
        </ol>
      </section>
    </div>
  )
}

export default AdsPage
