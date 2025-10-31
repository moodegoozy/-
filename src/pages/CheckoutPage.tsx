import React, { useState, useEffect } from 'react'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/auth'
import { useNavigate } from 'react-router-dom'
import { RoleGate } from '@/routes/RoleGate'

export const CheckoutPage: React.FC = () => {
  const {
    items,
    subtotal,
    clear,
    applicationFeeTotal,
    getItemTotalWithFees,
    getBasePrice,
    getMarkupPerUnit,
    totalWithFees,
    commissionRate,
  } = useCart()
  const { user } = useAuth()
  const nav = useNavigate()
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const deliveryFee = 7
  const commissionAmount = applicationFeeTotal
  const supervisorShare = Number((commissionAmount / 2).toFixed(2))
  const platformShare = Number((commissionAmount - supervisorShare).toFixed(2))
  const totalBeforeDelivery = totalWithFees
  const total = totalBeforeDelivery + deliveryFee

  useEffect(() => {
    const loadRestaurant = async () => {
      if (items.length === 0) return
      let ownerId = items[0]?.ownerId

      if (!ownerId && items[0]?.id) {
        try {
          const menuSnap = await getDoc(doc(db, 'menuItems', items[0].id))
          const menuData = menuSnap.exists() ? (menuSnap.data() as any) : null
          ownerId = menuData?.ownerId || null
        } catch (err) {
          console.error('خطأ في جلب بيانات الصنف:', err)
        }
      }

      if (!ownerId) {
        setRestaurant(null)
        return
      }

      const rSnap = await getDoc(doc(db, 'restaurants', ownerId))
      const rData = rSnap.exists() ? (rSnap.data() as any) : null
      setRestaurant({ id: ownerId, name: rData?.name || 'مطعم' })
    }

    void loadRestaurant()
  }, [items])

  const getMyLocation = () => {
    if (!navigator.geolocation) {
      alert('المتصفح لا يدعم تحديد الموقع')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        console.error('خطأ في تحديد الموقع:', err)
        alert('تعذر تحديد الموقع. تأكد من منح إذن الوصول للموقع.')
      },
      { enableHighAccuracy: true },
    )
  }

  const placeOrder = async () => {
    if (!user) return
    if (items.length === 0) {
      alert('السلة فارغة')
      return
    }
    if (!address.trim()) {
      alert('أدخل العنوان')
      return
    }
    if (!location) {
      alert('حدّد موقعك على الخريطة')
      return
    }

    let restId = restaurant?.id
    if (!restId && items[0]?.id) {
      const menuSnap = await getDoc(doc(db, 'menuItems', items[0].id))
      const menuData = menuSnap.exists() ? (menuSnap.data() as any) : null
      restId = menuData?.ownerId || null
    }

    if (!restId) {
      alert('تعذر تحديد المطعم للطلب. أعد الإضافة من القائمة.')
      return
    }

    setSaving(true)
    await addDoc(collection(db, 'orders'), {
      customerId: user.uid,
      restaurantId: restId,
      restaurantName: restaurant?.name || 'مطعم',
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        basePrice: Number(getBasePrice(item).toFixed(2)),
        priceWithFee: Number(item.price.toFixed(2)),
        markupPerUnit: Number(getMarkupPerUnit(item).toFixed(2)),
        qty: item.qty,
        ownerId: item.ownerId ?? restId,
      })),
      subtotal,
      deliveryFee,
      total,
      commissionRate,
      commissionAmount,
      totalBeforeDelivery,
      applicationFeeTotal,
      restaurantPayout: subtotal,
      supervisorShare,
      platformShare,
      status: 'pending',
      address,
      location,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      paymentMethod: 'cod',
    })

    clear()
    setSaving(false)
    nav('/orders')
  }

  return (
    <RoleGate allow={['customer']}>
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 text-gray-900 space-y-3">
        <header className="space-y-1">
          <h1 className="text-xl font-bold">إتمام الطلب</h1>
          {restaurant && (
            <p className="text-sm text-gray-600">
              سيتم تنفيذ الطلب عبر مطعم <span className="font-semibold text-gray-800">{restaurant.name}</span>
            </p>
          )}
        </header>

        <section className="border rounded-xl p-3 text-gray-800 space-y-2">
          <h2 className="text-sm font-semibold text-gray-700">🧾 تفاصيل الطلب</h2>
          {items.map((item) => (
            <div key={item.id} className="flex flex-col gap-1 py-2 border-b last:border-none">
              <div className="flex items-center justify-between text-sm">
                <span>{item.name} × {item.qty}</span>
                <span className="font-semibold">{getItemTotalWithFees(item).toFixed(2)} ر.س</span>
              </div>
              <div className="flex items-center justify-between text-[11px] text-gray-500">
                <span>تفاصيل التسعير</span>
                <span>
                  {item.price.toFixed(2)} ر.س = {getBasePrice(item).toFixed(2)} ر.س + {getMarkupPerUnit(item).toFixed(2)} ر.س نسبة التطبيق
                </span>
              </div>
            </div>
          ))}
        </section>

        <input
          className="w-full border rounded-xl p-3 text-gray-900 placeholder-gray-500"
          placeholder="العنوان التفصيلي"
          value={address}
          onChange={(event) => setAddress(event.target.value)}
        />

        <div className="space-y-2">
          <button
            onClick={getMyLocation}
            className="w-full rounded-xl p-3 bg-blue-600 text-white font-semibold hover:bg-blue-700"
            type="button"
          >
            📍 تحديد موقعي الحالي
          </button>

          {location && (
            <iframe
              title="خريطة الموقع"
              width="100%"
              height="250"
              style={{ borderRadius: '12px' }}
              loading="lazy"
              allowFullScreen
              src={`https://maps.google.com/maps?hl=ar&q=${location.lat},${location.lng}&z=15&output=embed`}
            />
          )}
        </div>

        <section className="bg-gray-50 rounded-xl p-3 text-gray-800 space-y-1 text-sm">
          <h2 className="text-sm font-semibold text-gray-700 mb-1">💰 ملخص الفاتورة</h2>
          <div className="flex items-center justify-between">
            <span>إجمالي المنتجات (السعر الأساسي)</span>
            <span>{subtotal.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between">
            <span>نسبة التطبيق ({(commissionRate * 100).toFixed(0)}%)</span>
            <span>{applicationFeeTotal.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>حصة المشرف</span>
            <span>{supervisorShare.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>حصة التطبيق</span>
            <span>{platformShare.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between">
            <span>الإجمالي قبل التوصيل</span>
            <span>{totalBeforeDelivery.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between">
            <span>رسوم التوصيل</span>
            <span>{deliveryFee.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between text-lg font-bold text-gray-900 pt-1">
            <span>الإجمالي المستحق</span>
            <span>{total.toFixed(2)} ر.س</span>
          </div>
          <p className="text-[11px] text-gray-500 leading-5">
            يصل للمطعم <span className="font-semibold text-gray-700">{subtotal.toFixed(2)} ر.س</span> بينما تُوزَّع نسبة التطبيق بالتساوي بين المشرف والمنصة.
          </p>
        </section>

        <button
          disabled={saving}
          onClick={placeOrder}
          className="w-full rounded-xl p-3 bg-green-600 hover:bg-green-700 text-white font-bold"
          type="button"
        >
          {saving ? 'جارٍ تأكيد الطلب...' : 'تأكيد الطلب (دفع عند الاستلام)'}
        </button>
      </div>
    </RoleGate>
  )
}
