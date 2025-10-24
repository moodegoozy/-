// src/pages/DebugOrders.tsx
import React, { useEffect, useState } from "react"
import { collection, getDocs, limit, orderBy, query } from "firebase/firestore"
import { db, app } from "@/firebase"

export const DebugOrders: React.FC = () => {
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      try {
        setError(null)
        // نجيب أي 10 طلبات بدون فلترة على الهوية — ما يحتاج فهارس
        const qy = query(
          collection(db, "orders"),
          orderBy("createdAt", "desc"),
          limit(10)
        )
        const snap = await getDocs(qy)
        const list = snap.docs.map(d => {
          const x: any = d.data()
          return {
            id: d.id,
            restaurantId: x.restaurantId ?? null,
            firstItemOwnerId: x?.items?.[0]?.ownerId ?? null,
            customerId: x.customerId ?? null,
            createdAtISO: x.createdAt?.toDate?.()?.toISOString?.() ?? null,
          }
        })
        setRows(list)
      } catch (e: any) {
        // لو ما فيه فهرس، جرّب بدون orderBy
        if (String(e?.message || "").includes("index")) {
          try {
            const snap = await getDocs(collection(db, "orders"))
            const list = snap.docs.map(d => {
              const x: any = d.data()
              return {
                id: d.id,
                restaurantId: x.restaurantId ?? null,
                firstItemOwnerId: x?.items?.[0]?.ownerId ?? null,
                customerId: x.customerId ?? null,
                createdAtISO: x.createdAt?.toDate?.()?.toISOString?.() ?? null,
              }
            })
            setRows(list)
            setError("⚠️ ما فيه فهرس لـ createdAt — عرضنا البيانات بدون ترتيب.")
          } catch (e2: any) {
            setError("❌ فشل الجلب حتى بدون ترتيب: " + (e2?.message || e2))
          }
        } else {
          setError("❌ خطأ الجلب: " + (e?.message || e))
        }
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  const projectId = (app.options as any)?.projectId

  return (
    <div className="p-4 space-y-3">
      <h1 className="text-xl font-bold">DEBUG: Orders Snapshot</h1>
      <div className="text-sm">
        ProjectId: <b>{String(projectId)}</b>
      </div>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {loading && <div>⏳ Loading…</div>}

      {!loading && rows.length === 0 && (
        <div className="text-gray-600">لا توجد أي مستندات في collection: <code>orders</code> في هذا المشروع.</div>
      )}

      {rows.map(r => (
        <div key={r.id} className="bg-white rounded-xl shadow p-3 text-sm">
          <div className="font-mono text-xs text-gray-500">#{r.id}</div>
          <div>restaurantId: <b>{String(r.restaurantId)}</b></div>
          <div>items[0].ownerId: <b>{String(r.firstItemOwnerId)}</b></div>
          <div>customerId: <b>{String(r.customerId)}</b></div>
          <div>createdAt: <b>{r.createdAtISO || "—"}</b></div>
        </div>
      ))}
    </div>
  )
}
