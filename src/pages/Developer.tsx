// src/pages/Developer.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { db } from '@/firebase'
import { DEVELOPER_ACCESS_SESSION_KEY, developerAccessCode } from '@/config'
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getCountFromServer,
  getDocs,
  setDoc,
  type DocumentData,
} from 'firebase/firestore'
import { Database, Loader2, PlusCircle, RefreshCcw, Save, Trash2, Wand2 } from 'lucide-react'
import { useAuth } from '@/auth'

const EMPTY_JSON = '{\n  \n}'

type CollectionDefinition = {
  id: string
  label: string
  description: string
  summaryFields?: string[]
  sample?: () => DocumentData
}

type FirestoreDocument = {
  id: string
  data: DocumentData
}

const MANAGED_COLLECTIONS: CollectionDefinition[] = [
  {
    id: 'users',
    label: 'المستخدمون',
    description: 'حسابات الدخول والأدوار المخزنة في users/{uid}',
    summaryFields: ['email', 'role'],
    sample: () => ({
      email: 'example@domain.com',
      role: 'customer',
      phone: '+966500000000',
      createdAt: new Date().toISOString(),
    }),
  },
  {
    id: 'restaurants',
    label: 'المطاعم',
    description: 'ملفات تعريف المطاعم بما في ذلك المدينة ووسائل التواصل والمالك المرتبط.',
    summaryFields: ['name', 'city', 'phone'],
    sample: () => ({
      name: 'مطعم برست القرية',
      city: 'جدة',
      phone: '0555000000',
      ownerUid: 'REPLACE_WITH_OWNER_UID',
      logoUrl: '',
      status: 'active',
      createdAt: new Date().toISOString(),
    }),
  },
  {
    id: 'menuItems',
    label: 'الأصناف',
    description: 'الأطباق والأسعار المتاحة في كل مطعم، مع ربطها بمعرف صاحب المطعم.',
    summaryFields: ['name', 'ownerId', 'price'],
    sample: () => ({
      name: 'برست عائلي',
      desc: 'وجبة عائلية تكفي 4 أشخاص مع صوصات جانبية.',
      price: 48,
      available: true,
      featured: false,
      ownerId: 'REPLACE_WITH_OWNER_UID',
      imageUrl: '',
      createdAt: new Date().toISOString(),
    }),
  },
  {
    id: 'orders',
    label: 'الطلبات',
    description: 'سجل الطلبات وحالاتها والربط بين العملاء والمطاعم.',
    summaryFields: ['status', 'customerName', 'total'],
    sample: () => ({
      status: 'pending',
      customerName: 'زائر المنصة',
      total: 120,
      subtotal: 100,
      deliveryFee: 20,
      restaurantId: 'REPLACE_WITH_OWNER_UID',
      createdAt: new Date().toISOString(),
      items: [
        {
          id: 'REPLACE_WITH_MENU_ITEM_ID',
          name: 'برست عائلي',
          qty: 1,
          ownerId: 'REPLACE_WITH_OWNER_UID',
          price: 48,
        },
      ],
    }),
  },
]

const formatFieldValue = (value: unknown, field?: string): string => {
  if (value === null) return 'null'
  if (typeof value === 'string') return value || '—'
  if (typeof value === 'number') {
    const fieldName = field?.toLowerCase() ?? ''
    const formatted = value.toLocaleString('ar-SA', {
      maximumFractionDigits: 2,
    })
    if (['price', 'total', 'amount', 'fee', 'payout'].some((key) => fieldName.includes(key))) {
      return `${formatted} ر.س`
    }
    return formatted
  }
  if (typeof value === 'boolean') return value ? 'نعم' : 'لا'
  if (Array.isArray(value)) return `مصفوفة (${value.length})`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    if ('seconds' in record && 'nanoseconds' in record) {
      const seconds = Number(record.seconds)
      const nanoseconds = Number(record.nanoseconds)
      if (!Number.isNaN(seconds)) {
        const date = new Date(seconds * 1000 + Math.floor(nanoseconds / 1_000_000))
        return date.toLocaleString('ar-SA')
      }
    }
    return `كائن (${Object.keys(record).length} حقل)`
  }
  return '—'
}

const summarizeDocument = (definition: CollectionDefinition, doc: FirestoreDocument) => {
  const data = (doc.data ?? {}) as Record<string, unknown>
  if (definition.summaryFields?.length) {
    const values = definition.summaryFields
      .map((field) => {
        const value = data[field]
        if (value === undefined) return null
        return formatFieldValue(value, field)
      })
      .filter(Boolean) as string[]

    if (values.length > 0) {
      return values.join(' • ')
    }
  }

  const entries = Object.entries(data)
    .slice(0, 3)
    .map(([key, value]) => `${key}: ${formatFieldValue(value, key)}`)

  return entries.length > 0 ? entries.join(' • ') : 'لا توجد حقول بعد لهذا المستند'
}

const stringifyDocument = (data: DocumentData) => {
  try {
    return JSON.stringify(data, null, 2)
  } catch (error) {
    try {
      return JSON.stringify(JSON.parse(JSON.stringify(data)), null, 2)
    } catch {
      return EMPTY_JSON
    }
  }
}

export const Developer: React.FC = () => {
  const { user } = useAuth()
  const [accessCode, setAccessCode] = useState('')
  const [accessError, setAccessError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)

  useEffect(() => {
    if (!developerAccessCode) {
      setHasAccess(true)
      return
    }

    try {
      const stored = window.sessionStorage.getItem(DEVELOPER_ACCESS_SESSION_KEY)
      if (stored === 'granted') {
        setHasAccess(true)
      }
    } catch (error) {
      console.warn('تعذّر قراءة جلسة المطور:', error)
    }
  }, [developerAccessCode])

  const verifyAccess = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      if (!developerAccessCode) {
        setHasAccess(true)
        return
      }

      const trimmed = accessCode.trim()
      if (!trimmed) {
        setAccessError('الرجاء إدخال الرمز السري للوصول إلى لوحة المطور.')
        return
      }

      if (trimmed !== developerAccessCode) {
        setAccessError('الرمز المدخل غير صحيح.')
        return
      }

      try {
        window.sessionStorage.setItem(DEVELOPER_ACCESS_SESSION_KEY, 'granted')
      } catch (error) {
        console.warn('تعذّر حفظ جلسة المطور:', error)
      }
      setAccessError(null)
      setAccessCode('')
      setHasAccess(true)
    },
    [accessCode, developerAccessCode],
  )
  const [stats, setStats] = useState<Record<string, number>>({})
  const [statsError, setStatsError] = useState<string | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)

  const [activeCollectionId, setActiveCollectionId] = useState<string>(MANAGED_COLLECTIONS[0].id)
  const activeDefinition = useMemo(
    () => MANAGED_COLLECTIONS.find((definition) => definition.id === activeCollectionId) ?? MANAGED_COLLECTIONS[0],
    [activeCollectionId],
  )

  const [documents, setDocuments] = useState<FirestoreDocument[]>([])
  const [docsLoading, setDocsLoading] = useState(false)
  const [listError, setListError] = useState<string | null>(null)
  const [filterTerm, setFilterTerm] = useState('')

  const [editorMode, setEditorMode] = useState<'create' | 'edit'>('create')
  const [editorId, setEditorId] = useState('')
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [editorValue, setEditorValue] = useState(EMPTY_JSON)

  const [actionMessage, setActionMessage] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [working, setWorking] = useState(false)

  if (!hasAccess) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#0b1620] px-4 py-16 text-right text-slate-100">
        <div className="w-full max-w-md space-y-6 rounded-3xl border border-slate-700/60 bg-[#111f2d] p-8 shadow-2xl">
          <header className="space-y-2">
            <h1 className="text-2xl font-bold text-sky-200">حماية لوحة المطور</h1>
            <p className="text-sm text-slate-300/80">
              للوصول إلى أدوات المطور المتقدمة، أدخل الرمز السري المخصص لك من الإدارة التقنية.
            </p>
          </header>

          {accessError && (
            <div className="rounded-2xl border border-rose-400/40 bg-rose-500/10 p-3 text-sm text-rose-100">{accessError}</div>
          )}

          <form onSubmit={verifyAccess} className="space-y-4">
            <input
              type="password"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="أدخل الرمز السري"
              className="w-full rounded-2xl border border-sky-500/30 bg-[#0c1a27] p-3 text-base text-slate-100 placeholder-slate-300/60 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500/40"
              value={accessCode}
              onChange={(event) => {
                setAccessCode(event.target.value)
                setAccessError(null)
              }}
            />
            <button
              type="submit"
              className="w-full rounded-2xl bg-sky-400/90 py-3 text-base font-semibold text-[#041320] shadow-lg transition hover:bg-sky-300"
            >
              دخول لوحة المطور
            </button>
          </form>
        </div>
      </div>
    )
  }

  const fetchStats = useCallback(async () => {
    setStatsLoading(true)
    setStatsError(null)
    try {
      const results = await Promise.all(
        MANAGED_COLLECTIONS.map(async (definition) => {
          try {
            const snapshot = await getCountFromServer(collection(db, definition.id))
            return { id: definition.id, count: snapshot.data().count }
          } catch (error) {
            console.error('Failed to load stats for collection', definition.id, error)
            return { id: definition.id, count: 0, failed: true }
          }
        }),
      )

      const nextStats: Record<string, number> = {}
      const hasFailures = results.some((result) => result.failed)
      results.forEach((result) => {
        nextStats[result.id] = result.count
      })
      setStats(nextStats)
      if (hasFailures) {
        setStatsError('بعض الإحصائيات لم يتم تحميلها. تأكد من الصلاحيات أو حاول مجددًا.')
      }
    } catch (error) {
      console.error('Failed to load global stats', error)
      setStatsError('تعذر تحميل الإحصائيات. تحقق من الاتصال أو من إعدادات أمان Firestore.')
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadDocuments = useCallback(async (collectionId: string) => {
    setDocsLoading(true)
    setListError(null)
    try {
      const snapshot = await getDocs(collection(db, collectionId))
      const mapped: FirestoreDocument[] = snapshot.docs.map((docSnapshot) => ({
        id: docSnapshot.id,
        data: docSnapshot.data(),
      }))

      mapped.sort((a, b) => a.id.localeCompare(b.id))
      setDocuments(mapped)
    } catch (error) {
      console.error('Failed to load documents for collection', collectionId, error)
      setDocuments([])
      setListError('تعذر تحميل المستندات. تأكد من اسم المجموعة والصلاحيات.')
    } finally {
      setDocsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  useEffect(() => {
    loadDocuments(activeDefinition.id)
  }, [activeDefinition.id, loadDocuments])

  useEffect(() => {
    setEditorMode('create')
    setEditorId('')
    setSelectedDocId(null)
    setActionError(null)
    setActionMessage(null)
    const template = activeDefinition.sample?.() ?? {}
    setEditorValue(Object.keys(template).length > 0 ? JSON.stringify(template, null, 2) : EMPTY_JSON)
  }, [activeDefinition])

  const filteredDocuments = useMemo(() => {
    const term = filterTerm.trim().toLowerCase()
    if (!term) return documents
    return documents.filter((document) => {
      if (document.id.toLowerCase().includes(term)) return true
      try {
        return JSON.stringify(document.data).toLowerCase().includes(term)
      } catch {
        return false
      }
    })
  }, [documents, filterTerm])

  const parseEditorValue = (): DocumentData | null => {
    try {
      if (!editorValue.trim()) {
        return {}
      }
      const parsed = JSON.parse(editorValue) as unknown
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        setActionError('يجب أن يكون الجذر في JSON كائنًا (Object) وليس مصفوفة.')
        return null
      }
      return parsed as DocumentData
    } catch (error) {
      const message = error instanceof Error ? error.message : 'صيغة JSON غير صحيحة.'
      setActionError(`تعذر قراءة JSON: ${message}`)
      return null
    }
  }

  const handleSelectDocument = (document: FirestoreDocument) => {
    setEditorMode('edit')
    setSelectedDocId(document.id)
    setEditorId(document.id)
    setActionMessage(null)
    setActionError(null)
    setEditorValue(stringifyDocument(document.data))
  }

  const resetEditorToTemplate = () => {
    setEditorMode('create')
    setSelectedDocId(null)
    setEditorId('')
    setActionMessage(null)
    setActionError(null)
    const template = activeDefinition.sample?.() ?? {}
    setEditorValue(Object.keys(template).length > 0 ? JSON.stringify(template, null, 2) : EMPTY_JSON)
  }

  const handleApplyTemplate = () => {
    const template = activeDefinition.sample?.()
    if (template) {
      setEditorValue(JSON.stringify(template, null, 2))
      setActionMessage('تم تحميل القالب الافتراضي للمجموعة الحالية.')
      setActionError(null)
      setEditorMode('create')
      setSelectedDocId(null)
      setEditorId('')
    }
  }

  const handleCreateDocument = async () => {
    if (editorMode !== 'create') {
      resetEditorToTemplate()
      return
    }

    const payload = parseEditorValue()
    if (!payload) return

    setWorking(true)
    setActionMessage(null)
    setActionError(null)
    try {
      const colRef = collection(db, activeDefinition.id)
      const trimmedId = editorId.trim()
      let createdId = trimmedId

      if (trimmedId) {
        await setDoc(doc(colRef, trimmedId), payload)
      } else {
        const newDoc = await addDoc(colRef, payload)
        createdId = newDoc.id
      }

      setActionMessage(`تم إنشاء المستند بنجاح (المعرف: ${createdId}).`)
      setEditorMode('edit')
      setEditorId(createdId)
      setSelectedDocId(createdId)
      await loadDocuments(activeDefinition.id)
      await fetchStats()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'حدث خطأ غير متوقع أثناء إنشاء المستند.'
      setActionError(message)
    } finally {
      setWorking(false)
    }
  }

  const handleReplaceDocument = async () => {
    if (editorMode !== 'edit' || !editorId) {
      setActionError('اختر مستندًا أولًا قبل محاولة الحفظ.')
      return
    }

    const payload = parseEditorValue()
    if (!payload) return

    setWorking(true)
    setActionMessage(null)
    setActionError(null)
    try {
      await setDoc(doc(db, activeDefinition.id, editorId), payload)
      setActionMessage('تم استبدال المستند بالكامل بنجاح.')
      await loadDocuments(activeDefinition.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل حفظ المستند. تحقق من الصلاحيات.'
      setActionError(message)
    } finally {
      setWorking(false)
    }
  }

  const handleMergeDocument = async () => {
    if (editorMode !== 'edit' || !editorId) {
      setActionError('اختر مستندًا أولًا قبل تنفيذ الدمج.')
      return
    }

    const payload = parseEditorValue()
    if (!payload) return

    setWorking(true)
    setActionMessage(null)
    setActionError(null)
    try {
      await setDoc(doc(db, activeDefinition.id, editorId), payload, { merge: true })
      setActionMessage('تم دمج الحقول المحددة مع المستند الحالي.')
      await loadDocuments(activeDefinition.id)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'فشل دمج الحقول. تحقق من الصلاحيات.'
      setActionError(message)
    } finally {
      setWorking(false)
    }
  }

  const handleDeleteDocument = async () => {
    if (editorMode !== 'edit' || !editorId) {
      setActionError('اختر مستندًا أولًا قبل محاولة الحذف.')
      return
    }

    const confirmDelete = window.confirm('هل أنت متأكد من حذف المستند؟ لا يمكن التراجع عن هذه العملية.')
    if (!confirmDelete) return

    setWorking(true)
    setActionMessage(null)
    setActionError(null)
    try {
      await deleteDoc(doc(db, activeDefinition.id, editorId))
      setActionMessage('تم حذف المستند بنجاح.')
      resetEditorToTemplate()
      await loadDocuments(activeDefinition.id)
      await fetchStats()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'تعذر حذف المستند. تحقق من الصلاحيات.'
      setActionError(message)
    } finally {
      setWorking(false)
    }
  }

  return (
    <section className="space-y-10">
      <header className="rounded-3xl bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 px-8 py-10 text-white shadow-xl">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.4em] text-slate-300">
              <Database className="h-4 w-4" />
              وحدة المطور
            </span>
            <h1 className="text-3xl font-extrabold md:text-4xl">لوحة التحكم الشاملة لبيانات Firebase</h1>
            <p className="max-w-2xl text-sm text-slate-200">
              تحكم كامل ببيانات Firestore من خلال واجهة واحدة: تصفح المستندات، إنشاء أو تعديل أي سجل، والقيام بعمليات الدمج أو الحذف
              بسرعة دون الحاجة إلى الرجوع إلى وحدة Firebase الأصلية.
            </p>
          </div>
          {user && (
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <p className="font-semibold text-white">المستخدم الحالي</p>
              <p className="text-xs text-slate-200/80">{user.email ?? user.uid}</p>
            </div>
          )}
        </div>
      </header>

      <section className="rounded-3xl bg-white/90 p-6 shadow-xl backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-slate-900">نظرة سريعة على البيانات</h2>
            <p className="text-sm text-slate-500">تعداد المستندات في أهم مجموعات Firestore.</p>
          </div>
          <button
            onClick={fetchStats}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800"
            disabled={statsLoading}
          >
            {statsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
            تحديث الأرقام
          </button>
        </div>

        {statsError && (
          <p className="mt-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800">{statsError}</p>
        )}

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {MANAGED_COLLECTIONS.map((definition) => (
            <article
              key={definition.id}
              className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5 shadow-sm"
            >
              <h3 className="text-sm font-semibold text-slate-600">{definition.label}</h3>
              <p className="mt-4 text-3xl font-extrabold text-slate-900">
                {statsLoading ? '...' : stats[definition.id]?.toLocaleString('ar-SA') ?? '0'}
              </p>
              <p className="mt-2 text-xs text-slate-500">{definition.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <aside className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-semibold text-slate-600">اختر المجموعة</label>
              <select
                value={activeCollectionId}
                onChange={(event) => setActiveCollectionId(event.target.value)}
                className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                {MANAGED_COLLECTIONS.map((definition) => (
                  <option key={definition.id} value={definition.id}>
                    {definition.label}
                  </option>
                ))}
              </select>
              <p className="text-xs leading-relaxed text-slate-500">{activeDefinition.description}</p>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <div className="relative flex-1">
                <input
                  type="search"
                  value={filterTerm}
                  onChange={(event) => setFilterTerm(event.target.value)}
                  placeholder="بحث بالمعرف أو المحتوى"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <button
                onClick={() => loadDocuments(activeDefinition.id)}
                className="inline-flex items-center gap-1 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                title="تحديث القائمة"
              >
                <RefreshCcw className="h-4 w-4" />
                تحديث
              </button>
            </div>

            {listError && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-600">{listError}</p>
            )}

            <div className="mt-4 max-h-[420px] space-y-2 overflow-y-auto pr-1">
              {docsLoading && (
                <div className="flex items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 py-6 text-sm text-slate-500">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  جارِ تحميل المستندات...
                </div>
              )}

              {!docsLoading && filteredDocuments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
                  لا توجد مستندات مطابقة حالياً.
                </div>
              )}

              {filteredDocuments.map((document) => {
                const summary = summarizeDocument(activeDefinition, document)
                const isActive = document.id === selectedDocId
                return (
                  <button
                    key={document.id}
                    onClick={() => handleSelectDocument(document)}
                    className={`w-full rounded-2xl border px-4 py-3 text-right transition shadow-sm ${
                      isActive
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-slate-200 bg-white text-slate-700 hover:border-primary/40 hover:bg-primary/5'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-sm">{document.id}</span>
                      {isActive && <span className="text-xs font-semibold">محدد</span>}
                    </div>
                    <p className="mt-2 text-xs leading-relaxed text-slate-500 line-clamp-2">
                      {summary}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </aside>

        <div className="space-y-4">
          <div className="rounded-3xl border border-slate-200 bg-white/95 p-6 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {editorMode === 'edit' ? 'تعديل المستند المحدد' : 'إنشاء مستند جديد'}
                </h2>
                <p className="text-sm text-slate-500">
                  حرر JSON مباشرة لضبط الحقول. استخدم زر الدمج لتعديل جزء من المستند فقط أو الاستبدال لإعادة الكتابة بالكامل.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={resetEditorToTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-100"
                >
                  <PlusCircle className="h-4 w-4" />
                  مستند جديد فارغ
                </button>
                <button
                  onClick={handleApplyTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 transition hover:bg-amber-100 disabled:opacity-60"
                  disabled={!activeDefinition.sample}
                >
                  <Wand2 className="h-4 w-4" />
                  تعبئة بالقالب
                </button>
              </div>
            </div>

            {actionMessage && (
              <p className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm text-emerald-700">{actionMessage}</p>
            )}
            {actionError && (
              <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm text-rose-700">{actionError}</p>
            )}

            <div className="mt-4 grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
              <div className="space-y-3">
                <label className="block text-xs font-semibold text-slate-500">
                  {editorMode === 'edit' ? 'معرّف المستند (غير قابل للتعديل)' : 'معرّف المستند (اختياري)'}
                </label>
                <input
                  value={editorId}
                  onChange={(event) => setEditorId(event.target.value)}
                  disabled={editorMode === 'edit'}
                  placeholder="اتركه فارغًا لإنشاء معرف تلقائي"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:bg-slate-100"
                />
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  <p className="font-semibold text-slate-600">ملاحظات مهمة:</p>
                  <ul className="mt-2 space-y-1 list-disc pr-4">
                    <li>استخدم زر «الدمج» للحفاظ على الحقول الأخرى كما هي.</li>
                    <li>لإضافة طابع زمني من الخادم استخدم التحديث من الواجهة الأخرى أو احفظ حقلًا placeholder ثم حدثه لاحقًا.</li>
                    <li>لا تترك JSON فارغًا عند الحفظ.</li>
                  </ul>
                </div>
              </div>

              <textarea
                dir="ltr"
                spellCheck={false}
                value={editorValue}
                onChange={(event) => setEditorValue(event.target.value)}
                className="h-[420px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm font-mono text-slate-800 shadow-inner focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              {editorMode === 'create' ? (
                <button
                  onClick={handleCreateDocument}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-4 py-2 text-sm font-semibold text-white shadow hover:bg-primary/90 disabled:opacity-60"
                  disabled={working}
                >
                  {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  إنشاء المستند
                </button>
              ) : (
                <>
                  <button
                    onClick={handleReplaceDocument}
                    className="inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-800 disabled:opacity-60"
                    disabled={working}
                  >
                    {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    حفظ (استبدال كامل)
                  </button>
                  <button
                    onClick={handleMergeDocument}
                    className="inline-flex items-center gap-2 rounded-2xl border border-primary bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow hover:bg-primary/20 disabled:opacity-60"
                    disabled={working}
                  >
                    {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
                    حفظ (دمج فقط)
                  </button>
                  <button
                    onClick={handleDeleteDocument}
                    className="inline-flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-semibold text-rose-600 shadow hover:bg-rose-100 disabled:opacity-60"
                    disabled={working}
                  >
                    {working ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    حذف المستند
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </section>
  )
}
