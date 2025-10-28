// src/pages/Developer.tsx
import React, { useMemo, useState } from 'react'

type LedgerEntry = {
  id: number
  title: string
  amount: number
  category: 'income' | 'expense'
  note?: string
}

type Employee = {
  id: number
  name: string
  role: string
  email?: string
  commission: number
  active: boolean
}

type TaskReport = {
  id: number
  title: string
  owner: string
  status: 'مكتمل' | 'قيد التنفيذ' | 'متأخر'
  progress: number
  dueDate: string
}

type AdPlacement = {
  id: number
  title: string
  type: 'صورة' | 'رابط' | 'فيديو'
  asset: string
  destination?: string
  status: 'قيد المراجعة' | 'نشط' | 'مجدول'
}

const initialLedger: LedgerEntry[] = [
  { id: 1, title: 'مبيعات التطبيق', amount: 18500, category: 'income', note: 'إجمالي الطلبات المكتملة' },
  { id: 2, title: 'عمولة المتاجر', amount: 4200, category: 'income' },
  { id: 3, title: 'رواتب الموظفات', amount: 6200, category: 'expense' },
  { id: 4, title: 'استضافة المنصة', amount: 950, category: 'expense' },
  { id: 5, title: 'حملات تسويقية', amount: 1800, category: 'expense', note: 'إعلانات ممولة لمدة أسبوعين' },
]

const initialEmployees: Employee[] = [
  { id: 1, name: 'أمل الغامدي', role: 'إدارة عمليات', email: 'amal@example.com', commission: 12.5, active: true },
  { id: 2, name: 'سارة الشهري', role: 'خدمة العملاء', email: 'sarah@example.com', commission: 8, active: true },
  { id: 3, name: 'جود العتيبي', role: 'تسويق رقمي', email: 'jood@example.com', commission: 10, active: false },
]

const taskReports: TaskReport[] = [
  { id: 1, title: 'إطلاق نظام الولاء', owner: 'سارة الشهري', status: 'قيد التنفيذ', progress: 65, dueDate: '25 أبريل 2024' },
  { id: 2, title: 'تحديث قائمة المطاعم', owner: 'أمل الغامدي', status: 'مكتمل', progress: 100, dueDate: '15 أبريل 2024' },
  { id: 3, title: 'حملة إعلانية لشهر رمضان', owner: 'جود العتيبي', status: 'متأخر', progress: 35, dueDate: '10 أبريل 2024' },
]

const initialAds: AdPlacement[] = [
  {
    id: 1,
    title: 'بانر العروض الرمضانية',
    type: 'صورة',
    asset: 'https://images.unsplash.com/photo-1612874470034-62f8ac9e47c3?auto=format&fit=crop&w=600&q=80',
    destination: 'https://example.com/ramadan-offers',
    status: 'نشط',
  },
  {
    id: 2,
    title: 'إعلان مطعم الأسبوع',
    type: 'فيديو',
    asset: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    destination: 'https://example.com/featured-restaurant',
    status: 'مجدول',
  },
  {
    id: 3,
    title: 'رابط تسجيل الأسر المنتجة',
    type: 'رابط',
    asset: 'https://example.com/family-signup',
    status: 'قيد المراجعة',
  },
]

const explanationCards = [
  {
    title: 'الإدارة المالية',
    description:
      'توفر لك الأرقام الأساسية نظرة سريعة على أداء المنصة؛ من خلال مقارنة الدخل والمصروفات ومراقبة صافي الربح لمعرفة أين يجب تعزيز الاستثمار أو ضبط التكاليف.',
    highlights: ['بطاقات ملونة تبين الدخل والمصروفات وصافي الربح', 'جدول تفصيلي لكل بند مع الملاحظات المرتبطة به'],
  },
  {
    title: 'قسم الموظفات',
    description:
      'يمكنك إضافة موظفة جديدة وتحديث بيانات الفريق بسهولة، مع متابعة حالة التوظيف ونسبة العمولة المحققة لكل عضو من خلال شريط التقدم.',
    highlights: ['نموذج تسجيل يضم الاسم، الوظيفة، البريد، ونسبة العمولة', 'بطاقات تعرض حالة كل موظفة ونسبة تحقيق الأهداف'],
  },
  {
    title: 'تقارير المهام',
    description:
      'تعرض البطاقات حالة كل مهمة، والمسؤولة عنها، وتاريخ التسليم المتوقع، مع مؤشرات لونية لتوضيح مستوى التقدم ودرجة الأولوية.',
    highlights: ['وسوم الحالة بالألوان تبين المهام المكتملة والمتأخرة', 'شريط تقدم مرئي يساعد على قراءة نسبة الإنجاز مباشرة'],
  },
]

const currencyFormatter = new Intl.NumberFormat('ar-SA', {
  style: 'currency',
  currency: 'SAR',
  maximumFractionDigits: 0,
})

export const Developer: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>(initialEmployees)
  const [form, setForm] = useState({ name: '', role: '', email: '', commission: '' })
  const [formError, setFormError] = useState<string | null>(null)
  const [ads, setAds] = useState<AdPlacement[]>(initialAds)
  const [adForm, setAdForm] = useState({
    title: '',
    type: 'صورة' as AdPlacement['type'],
    asset: '',
    destination: '',
  })
  const [adFormError, setAdFormError] = useState<string | null>(null)

  const { income, expense, net } = useMemo(() => {
    const incomeTotal = initialLedger
      .filter((entry) => entry.category === 'income')
      .reduce((sum, entry) => sum + entry.amount, 0)
    const expenseTotal = initialLedger
      .filter((entry) => entry.category === 'expense')
      .reduce((sum, entry) => sum + entry.amount, 0)
    return {
      income: incomeTotal,
      expense: expenseTotal,
      net: incomeTotal - expenseTotal,
    }
  }, [])

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleAddEmployee = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const trimmedName = form.name.trim()
    const trimmedRole = form.role.trim()
    const trimmedEmail = form.email.trim()
    const commissionValue = Number(form.commission)

    if (!trimmedName || !trimmedRole || Number.isNaN(commissionValue)) {
      setFormError('الرجاء تعبئة الاسم، الوظيفة، ونسبة العمولة بشكل صحيح.')
      return
    }

    if (commissionValue < 0 || commissionValue > 100) {
      setFormError('نسبة العمولة يجب أن تكون بين 0% و 100%.')
      return
    }

    const newEmployee: Employee = {
      id: Date.now(),
      name: trimmedName,
      role: trimmedRole,
      email: trimmedEmail || undefined,
      commission: commissionValue,
      active: true,
    }

    setEmployees((prev) => [newEmployee, ...prev])
    setForm({ name: '', role: '', email: '', commission: '' })
    setFormError(null)
  }

  const handleAdInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = event.target
    setAdForm(prev => ({ ...prev, [name]: value }))
  }

  const handleAddAd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const trimmedTitle = adForm.title.trim()
    const trimmedAsset = adForm.asset.trim()
    const trimmedDestination = adForm.destination.trim()

    if (!trimmedTitle || !trimmedAsset) {
      setAdFormError('الرجاء إدخال عنوان واضح ورابط الوسائط أو الصفحة.')
      return
    }

    if (adForm.type === 'رابط' && !trimmedDestination) {
      setAdFormError('روابط الحملات تحتاج إلى تحديد الوجهة التي سيتجه لها المستخدم.')
      return
    }

    const newAd: AdPlacement = {
      id: Date.now(),
      title: trimmedTitle,
      type: adForm.type,
      asset: trimmedAsset,
      destination: trimmedDestination || undefined,
      status: 'قيد المراجعة',
    }

    setAds(prev => [newAd, ...prev])
    setAdForm({ title: '', type: adForm.type, asset: '', destination: '' })
    setAdFormError(null)
  }

  return (
    <section className="space-y-10">
      <header className="rounded-2xl bg-gradient-to-r from-[#1e293b] via-[#334155] to-[#1e293b] px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-slate-300">لوحة المطور</p>
            <h1 className="text-3xl font-bold md:text-4xl">إدارة المنصة والعمليات</h1>
          </div>
          <div className="text-right text-sm text-slate-200">
            <p>المطور المسؤول: مريم الكناني</p>
            <p>📧 memwalknany976@gmail.com</p>
            <p>📱 0555047703</p>
          </div>
        </div>
        <p className="mt-6 max-w-3xl text-sm text-slate-200">
          توفر هذه اللوحة نظرة شاملة على الوضع المالي، حالة الموظفات، والتقدم في المهام التشغيلية لتسهيل متابعة عمل المنصة بشكل يومي.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {explanationCards.map((card) => (
          <article key={card.title} className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-6 shadow-md backdrop-blur">
            <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{card.description}</p>
            <ul className="mt-4 space-y-2 text-sm text-slate-500">
              {card.highlights.map((highlight) => (
                <li key={highlight} className="flex items-start gap-2">
                  <span className="mt-1 inline-block h-2 w-2 flex-shrink-0 rounded-full bg-primary" aria-hidden />
                  <span>{highlight}</span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>

      <section className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-semibold text-slate-900">نظام إدارة الإعلانات</h2>
            <p className="text-sm text-slate-500">نظّم إعلانات التطبيق حسب النوع وحدّد الروابط أو الوسائط المرتبطة</p>
          </div>
          <span className="rounded-full bg-primary/10 px-4 py-1 text-xs font-medium text-primary">
            {ads.filter(ad => ad.status === 'نشط').length} إعلان نشط الآن
          </span>
        </div>

        <form onSubmit={handleAddAd} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-5">
          <input
            name="title"
            value={adForm.title}
            onChange={handleAdInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="عنوان الإعلان"
          />
          <select
            name="type"
            value={adForm.type}
            onChange={handleAdInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="صورة">إعلان صورة</option>
            <option value="رابط">تنبيه رابط</option>
            <option value="فيديو">مقطع فيديو</option>
          </select>
          <input
            name="asset"
            value={adForm.asset}
            onChange={handleAdInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder={adForm.type === 'فيديو' ? 'رابط الفيديو أو البث' : 'رابط الصورة أو المحتوى'}
          />
          <input
            name="destination"
            value={adForm.destination}
            onChange={handleAdInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="صفحة التوجيه (اختياري)"
          />
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            إضافة إعلان
          </button>
          {adFormError && (
            <p className="md:col-span-5 text-sm font-medium text-rose-600">{adFormError}</p>
          )}
        </form>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {ads.map(ad => (
            <article
              key={ad.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{ad.title}</h3>
                  <p className="text-xs text-slate-500">نوع الإعلان: {ad.type}</p>
                  {ad.destination && (
                    <p className="mt-1 text-xs text-primary break-all">
                      <span className="font-medium text-slate-600">وجهة الإعلان:</span> {ad.destination}
                    </p>
                  )}
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    ad.status === 'نشط'
                      ? 'bg-emerald-100 text-emerald-700'
                      : ad.status === 'مجدول'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {ad.status}
                </span>
              </div>
              <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 p-4 text-xs text-slate-500">
                <p className="mb-2 font-semibold text-slate-600">معاينة الرابط أو الوسائط:</p>
                <a href={ad.asset} target="_blank" rel="noreferrer" className="break-all text-primary underline-offset-2 hover:underline">
                  {ad.asset}
                </a>
                <p className="mt-3 text-[11px] text-slate-400">تأكد من رفع المحتوى في مكتبة موثوقة أو منصة فيديو قبل التفعيل.</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">الإدارة المالية</h2>
          <span className="rounded-full bg-emerald-100 px-4 py-1 text-sm font-medium text-emerald-700">
            آخر تحديث: اليوم
          </span>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-5">
            <p className="text-sm text-emerald-700">إجمالي الدخل</p>
            <p className="mt-3 text-3xl font-bold text-emerald-900">{currencyFormatter.format(income)}</p>
            <p className="mt-2 text-xs text-emerald-800/80">يشمل المبيعات، عمولات المتاجر، وخدمات إضافية</p>
          </div>
          <div className="rounded-xl border border-rose-100 bg-rose-50/60 p-5">
            <p className="text-sm text-rose-700">إجمالي المصروفات</p>
            <p className="mt-3 text-3xl font-bold text-rose-900">{currencyFormatter.format(expense)}</p>
            <p className="mt-2 text-xs text-rose-800/80">رواتب، استضافة، وحملات تسويقية</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-700">صافي الربح</p>
            <p className={`mt-3 text-3xl font-bold ${net >= 0 ? 'text-emerald-900' : 'text-rose-900'}`}>
              {currencyFormatter.format(net)}
            </p>
            <p className="mt-2 text-xs text-slate-500">متابعة التدفقات المالية لتحديد أولويات الاستثمار</p>
          </div>
        </div>

        <div className="mt-8 overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-right">
            <thead className="bg-slate-100 text-slate-600">
              <tr>
                <th className="px-4 py-3 text-sm font-semibold">البند</th>
                <th className="px-4 py-3 text-sm font-semibold">النوع</th>
                <th className="px-4 py-3 text-sm font-semibold">المبلغ</th>
                <th className="px-4 py-3 text-sm font-semibold">ملاحظات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 bg-white text-slate-700">
              {initialLedger.map((entry) => (
                <tr key={entry.id} className="transition hover:bg-slate-50">
                  <td className="px-4 py-3 text-sm font-medium">{entry.title}</td>
                  <td className="px-4 py-3 text-sm">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        entry.category === 'income'
                          ? 'bg-emerald-100 text-emerald-700'
                          : 'bg-rose-100 text-rose-700'
                      }`}
                    >
                      {entry.category === 'income' ? 'دخل' : 'مصروف'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                    {currencyFormatter.format(entry.amount)}
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{entry.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-6 flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <h2 className="text-2xl font-semibold text-slate-900">قسم الموظفات</h2>
          <p className="text-sm text-slate-500">سجل وحدث بيانات الفريق، وتابع نسب العمولات لكل موظفة</p>
        </div>

        <form onSubmit={handleAddEmployee} className="grid gap-4 rounded-xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-5">
          <input
            name="name"
            value={form.name}
            onChange={handleInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="اسم الموظفة"
          />
          <input
            name="role"
            value={form.role}
            onChange={handleInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="المسمى الوظيفي"
          />
          <input
            name="email"
            value={form.email}
            onChange={handleInputChange}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
            placeholder="البريد الإلكتروني (اختياري)"
            type="email"
          />
          <div className="flex items-center gap-2">
            <input
              name="commission"
              value={form.commission}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="نسبة العمولة %"
              type="number"
              step="0.1"
              min="0"
              max="100"
            />
          </div>
          <button
            type="submit"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90"
          >
            إضافة موظفة
          </button>
          {formError && (
            <p className="md:col-span-5 text-sm font-medium text-rose-600">{formError}</p>
          )}
        </form>

        <div className="mt-6 grid gap-4">
          {employees.map((employee) => (
            <div
              key={employee.id}
              className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">{employee.name}</h3>
                  <p className="text-sm text-slate-500">{employee.role}</p>
                  {employee.email && <p className="text-xs text-slate-400">{employee.email}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      employee.active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {employee.active ? 'على رأس العمل' : 'موقفة مؤقتًا'}
                  </span>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">نسبة العمولة</p>
                    <p className="text-lg font-semibold text-primary">{employee.commission}%</p>
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>تحقيق الأهداف</span>
                  <span>{Math.min(100, Math.round(employee.commission * 4))}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full bg-primary transition-all"
                    style={{ width: `${Math.min(100, Math.round(employee.commission * 4))}%` }}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl bg-white/80 p-6 shadow-lg backdrop-blur">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-2xl font-semibold text-slate-900">تقارير المهام</h2>
          <span className="text-sm text-slate-400">3 مهام نشطة هذا الأسبوع</span>
        </div>
        <div className="grid gap-5 md:grid-cols-3">
          {taskReports.map((task) => (
            <article
              key={task.id}
              className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-primary/40 hover:shadow"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-slate-900">{task.title}</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    task.status === 'مكتمل'
                      ? 'bg-emerald-100 text-emerald-700'
                      : task.status === 'قيد التنفيذ'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-rose-100 text-rose-700'
                  }`}
                >
                  {task.status}
                </span>
              </div>
              <p className="mt-2 text-sm text-slate-500">المسؤولة: {task.owner}</p>
              <p className="mt-1 text-xs text-slate-400">موعد التسليم: {task.dueDate}</p>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>التقدم</span>
                  <span>{task.progress}%</span>
                </div>
                <div className="mt-2 h-2 w-full rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${
                      task.status === 'مكتمل'
                        ? 'bg-emerald-500'
                        : task.status === 'قيد التنفيذ'
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  )
}
