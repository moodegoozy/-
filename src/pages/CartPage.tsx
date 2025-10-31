// src/pages/CartPage.tsx
import React from "react"
import { useCart } from "@/hooks/useCart"
import { Link } from "react-router-dom"

export const CartPage: React.FC = () => {
  const {
    items,
    subtotal,
    remove,
    clear,
    applicationFeeTotal,
    getItemTotalWithFees,
    getBasePrice,
    getMarkupPerUnit,
    totalWithFees,
    commissionRate,
  } = useCart()

  if (items.length === 0) {
    return <div className="text-center text-gray-400 mt-20">🛒 السلة فارغة</div>
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      <h1 className="text-2xl font-bold mb-4">🛒 سلة المشتريات</h1>

      {items.map((i) => (
        <div
          key={i.id}
          className="flex justify-between items-center bg-white text-black p-4 rounded-xl shadow"
        >
          <div>
            <div className="font-semibold">{i.name}</div>
            <div className="text-sm text-gray-600">الكمية: {i.qty}</div>
            <div className="space-y-1">
              <div className="font-bold text-lg text-gray-900">
                {getItemTotalWithFees(i).toFixed(2)} ر.س
              </div>
              <div className="text-[11px] text-gray-500">
                السعر الأساسي {getBasePrice(i).toFixed(2)} ر.س + نسبة التطبيق {getMarkupPerUnit(i).toFixed(2)} ر.س
              </div>
            </div>

            {/* ✅ للتأكد أن كل صنف مرتبط بمطعم */}
            <div className="text-xs text-gray-500">
              المطعم: {i.ownerId || "❌ غير محدد"}
            </div>
          </div>
          <button
            onClick={() => remove(i.id)}
            className="px-4 py-2 rounded-xl bg-red-500 text-white hover:bg-red-600"
          >
            حذف
          </button>
        </div>
      ))}

      <div className="bg-white text-gray-800 rounded-xl p-4 shadow space-y-2 text-sm">
        <div className="flex items-center justify-between">
          <span>المجموع الأساسي</span>
          <span className="font-semibold">{subtotal.toFixed(2)} ر.س</span>
        </div>
        <div className="flex items-center justify-between">
          <span>نسبة التطبيق ({(commissionRate * 100).toFixed(0)}%)</span>
          <span className="font-semibold">{applicationFeeTotal.toFixed(2)} ر.س</span>
        </div>
        <div className="flex items-center justify-between text-lg font-bold text-gray-900 border-t pt-2">
          <span>الإجمالي مع الرسوم</span>
          <span>{totalWithFees.toFixed(2)} ر.س</span>
        </div>
      </div>

      <div className="flex gap-3 justify-end">
        <button
          onClick={clear}
          className="px-5 py-2 rounded-xl bg-gray-500 text-white"
        >
          🗑️ تفريغ السلة
        </button>
        <Link
          to="/checkout"
          className="px-5 py-2 rounded-xl bg-yellow-500 text-black font-bold"
        >
          ✅ إتمام الطلب
        </Link>
      </div>
    </div>
  )
}
