import React, { useMemo, useState } from 'react'
import { useAuth } from '@/auth'

type TabKey = 'overview' | 'commission' | 'restaurants' | 'reports'

const tabs: Array<{ id: TabKey; label: string; description: string }> = [
  {
    id: 'overview',
    label: 'نظرة عامة',
    description: 'ملخص سريع لحالة المنصة والمهام اليومية',
  },
  {
    id: 'commission',
    label: 'العمولة',
    description: 'متابعة عمولات المنصة وحساباتها الشهرية',
  },
  {
    id: 'restaurants',
    label: 'إدارة المطاعم',
    description: 'إضافة مطعم جديد ومتابعة حالة التفعيل',
  },
  {
    id: 'reports',
    label: 'التقارير',
    description: 'إحصاءات موسعة عن الأداء والنمو',
  },
]

export const AdminDashboard: React.FC = () => {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState<TabKey>('overview')

  const overviewHighlights = useMemo(
    () => [
      {
        title: 'الطلبات النشطة',
        value: '24 طلباً',
        note: 'قيد التسليم خلال الساعة القادمة',
      },
      {
        title: 'المطاعم الجديدة',
        value: '5 مطاعم',
        note: 'بانتظار موافقة المشرفة هذا الأسبوع',
      },
      {
        title: 'التقييم العام',
        value: '4.8 / 5',
        note: 'متوسط تقييم العملاء خلال آخر 30 يوماً',
      },
    ],
    []
  )

  const commissionSummary = useMemo(
    () => [
      {
        period: 'الشهر الحالي',
        amount: '12,450 ر.س',
        change: '+8% عن الشهر الماضي',
      },
      {
        period: 'الشهر الماضي',
        amount: '11,520 ر.س',
        change: '+5% عن المتوسط الفصلي',
      },
      {
        period: 'الربع الحالي',
        amount: '35,870 ر.س',
        change: '+14% منذ بداية الربع',
      },
    ],
    []
  )

  const pendingRestaurants = useMemo(
    () => [
      {
        name: 'مطعم التاج الشرقي',
        owner: 'أمل السبيعي',
        status: 'بانتظار رفع السجل التجاري',
      },
      {
        name: 'مخبوزات الدار',
        owner: 'جواهر المطيري',
        status: 'تم القبول - بانتظار التفعيل',
      },
      {
        name: 'برجر كيتشن',
        owner: 'سارة الشهراني',
        status: 'جاري التحقق من قائمة الأسعار',
      },
    ],
    []
  )

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'commission':
        return (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border border-yellow-200 p-6">
              <h2 className="text-2xl font-semibold text-primary mb-4">متابعة العمولة</h2>
              <p className="text-sm text-gray-600 mb-6">
                تابعي أداء العمولة وتوزيعها بين المشرفات، مع تحديث الأرقام شهرياً لضمان الدقة.
              </p>
              <div className="grid gap-4 md:grid-cols-3">
                {commissionSummary.map((item) => (
                  <div key={item.period} className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4">
                    <p className="text-sm text-gray-600">{item.period}</p>
                    <p className="text-2xl font-bold text-primary mt-2">{item.amount}</p>
                    <p className="text-xs text-emerald-600 mt-1">{item.change}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">ملاحظات التوزيع</h3>
              <ul className="list-disc pr-6 space-y-2 text-sm text-gray-700">
                <li>يتم احتساب عمولة المنصة بنسبة 15٪ من صافي المبيعات بعد خصم العروض وتضاف تلقائياً على قيمة الطلب.</li>
                <li>يُحوّل نصيب كل مشرفة بشكل آلي يوم 5 من كل شهر ميلادي.</li>
                <li>يمكن تحميل تقرير تفصيلي عبر زر «تحميل تقرير العمولة» أدناه.</li>
              </ul>
              <button className="mt-6 inline-flex items-center justify-center rounded-full bg-primary px-6 py-2 text-white font-medium shadow-md transition hover:bg-primary/90">
                تحميل تقرير العمولة (PDF)
              </button>
            </div>
          </section>
        )
      case 'restaurants':
        return (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border border-yellow-200 p-6">
              <h2 className="text-2xl font-semibold text-primary mb-4">إضافة مطعم جديد</h2>
              <p className="text-sm text-gray-600 mb-6">
                أدخلي بيانات المطعم للتواصل مع فريق الاعتماد. بعد الإرسال ستظهر الحالة في قائمة المتابعة أدناه.
              </p>
              <form className="grid gap-4 md:grid-cols-2">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-primary mb-1" htmlFor="restaurant-name">
                    اسم المطعم
                  </label>
                  <input
                    id="restaurant-name"
                    type="text"
                    placeholder="مثال: سفرة البيت - فرع العليا"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-primary mb-1" htmlFor="restaurant-owner">
                    اسم المالك/المسؤول
                  </label>
                  <input
                    id="restaurant-owner"
                    type="text"
                    placeholder="اسم ممثل المطعم"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="flex flex-col md:col-span-2">
                  <label className="text-sm font-medium text-primary mb-1" htmlFor="restaurant-notes">
                    ملاحظات إضافية
                  </label>
                  <textarea
                    id="restaurant-notes"
                    rows={3}
                    placeholder="روابط المنيو، حسابات التواصل، أو معلومات التواصل"
                    className="rounded-2xl border border-gray-200 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div className="md:col-span-2 flex justify-end">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-white text-sm font-semibold shadow-md transition hover:bg-primary/90"
                  >
                    حفظ الطلب ومتابعته لاحقاً
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">طلبات المطاعم قيد المتابعة</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 text-sm">
                  <thead className="bg-gray-50 text-gray-600">
                    <tr>
                      <th className="px-4 py-3 text-right font-semibold">المطعم</th>
                      <th className="px-4 py-3 text-right font-semibold">المالكة</th>
                      <th className="px-4 py-3 text-right font-semibold">الحالة</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingRestaurants.map((restaurant) => (
                      <tr key={restaurant.name} className="hover:bg-yellow-50/60">
                        <td className="px-4 py-3 font-medium text-gray-900">{restaurant.name}</td>
                        <td className="px-4 py-3 text-gray-700">{restaurant.owner}</td>
                        <td className="px-4 py-3 text-emerald-600">{restaurant.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        )
      case 'reports':
        return (
          <section className="space-y-6">
            <div className="bg-white rounded-3xl shadow-md border border-yellow-200 p-6">
              <h2 className="text-2xl font-semibold text-primary mb-4">التقارير التفصيلية</h2>
              <p className="text-sm text-gray-600">
                حمّلي التقارير الشهرية أو صدّري بيانات الأداء بصيغة CSV للتحليل المتقدم مع الفريق المالي.
              </p>
              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <button className="rounded-2xl border border-primary px-5 py-3 text-primary font-semibold transition hover:bg-primary hover:text-white">
                  تحميل تقرير الأداء الشهري
                </button>
                <button className="rounded-2xl border border-primary px-5 py-3 text-primary font-semibold transition hover:bg-primary hover:text-white">
                  تصدير بيانات الطلبات (CSV)
                </button>
                <button className="rounded-2xl border border-primary px-5 py-3 text-primary font-semibold transition hover:bg-primary hover:text-white">
                  تقارير رضا العملاء
                </button>
                <button className="rounded-2xl border border-primary px-5 py-3 text-primary font-semibold transition hover:bg-primary hover:text-white">
                  تقرير نمو الشركاء
                </button>
              </div>
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-4">مؤشرات رئيسية</h3>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  { title: 'نسبة إكمال الطلبات', value: '96٪', note: '+2٪ خلال آخر أسبوع' },
                  { title: 'متوسط زمن التوصيل', value: '32 دقيقة', note: '-5 دقائق عن المتوسط' },
                  { title: 'دعم العملاء', value: '12 تذكرة مفتوحة', note: 'يُغلق عادةً خلال 6 ساعات' },
                ].map((metric) => (
                  <div key={metric.title} className="rounded-2xl border border-gray-200 p-4 bg-gray-50">
                    <p className="text-sm text-gray-500">{metric.title}</p>
                    <p className="text-2xl font-bold text-primary mt-2">{metric.value}</p>
                    <p className="text-xs text-emerald-600 mt-1">{metric.note}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )
      default:
        return (
          <section className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
              {overviewHighlights.map((highlight) => (
                <div key={highlight.title} className="bg-white rounded-3xl shadow-md p-6 border border-yellow-200">
                  <h2 className="text-xl font-semibold text-primary mb-2">{highlight.title}</h2>
                  <p className="text-3xl font-bold text-primary/90">{highlight.value}</p>
                  <p className="text-sm text-gray-600 mt-2">{highlight.note}</p>
                </div>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-md border border-gray-100 p-6">
              <h3 className="text-xl font-semibold text-primary mb-3">مهام اليوم</h3>
              <ul className="space-y-2 text-sm text-gray-700">
                <li>• مراجعة الطلبات المتأخرة والتواصل مع المندوبين.</li>
                <li>• التأكد من تحديث قوائم الأسعار للمطاعم الجديدة.</li>
                <li>• اعتماد عروض نهاية الأسبوع وإرسالها للتسويق.</li>
              </ul>
            </div>

            <p className="text-sm text-gray-500 text-center">
              * يمكن ربط هذه الواجهة لاحقاً ببيانات Firestore لعرض إحصاءات حية وإجراءات تحكم متقدمة.
            </p>
          </section>
        )
    }
  }

  return (
    <div className="space-y-6">
      <header className="bg-primary text-white p-6 rounded-3xl shadow-lg text-center">
        <h1 className="text-3xl font-bold">لوحة تحكم المشرفات</h1>
        <p className="text-lg text-accent/90 mt-2">أهلاً {user?.email ?? 'بك'}! يمكنك إدارة التطبيق من هنا.</p>
      </header>

      <nav className="bg-white rounded-3xl shadow-md border border-yellow-200 p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTab
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-full border px-5 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-primary bg-primary text-white shadow-lg'
                    : 'border-gray-200 bg-gray-50 text-gray-700 hover:border-primary/60 hover:text-primary'
                }`}
              >
                <div className="flex flex-col items-center">
                  <span>{tab.label}</span>
                  <span className="text-[11px] font-normal opacity-80">{tab.description}</span>
                </div>
              </button>
            )
          })}
        </div>
      </nav>

      {renderActiveTab()}
    </div>
  )
}
