import React, { useState, useEffect } from 'react'
import { addDoc, collection, doc, getDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '@/firebase'
import { useCart } from '@/hooks/useCart'
import { useAuth } from '@/auth'
import { useNavigate } from 'react-router-dom'
import { RoleGate } from '@/routes/RoleGate'

export const CheckoutPage: React.FC = () => {
  const { items, subtotal, clear } = useCart()
  const { user } = useAuth()
  const nav = useNavigate()
  const [address, setAddress] = useState('')
  const [saving, setSaving] = useState(false)
  const [restaurant, setRestaurant] = useState<{ id: string; name: string } | null>(null)
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null)

  const deliveryFee = 7
  const commissionRate = 0.15
  const commissionAmount = +(subtotal * commissionRate).toFixed(2)
  const totalBeforeDelivery = subtotal + commissionAmount
  const total = totalBeforeDelivery + deliveryFee

  // ✅ تحميل بيانات المطعم
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
    loadRestaurant()
  }, [items])

  // ✅ تحديد موقعي عبر GPS
  const getMyLocation = () => {
    if (!navigator.geolocation) return alert('المتصفح لا يدعم تحديد الموقع')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        console.log('📍 موقعك الحالي:', pos.coords)
        setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude })
      },
      (err) => {
        console.error('خطأ في تحديد الموقع:', err)
        alert('تعذر تحديد الموقع. تأكد من منح إذن الوصول للموقع.')
      },
      { enableHighAccuracy: true }
    )
  }

  // ✅ إرسال الطلب
  const placeOrder = async () => {
    if (!user) return
    if (items.length === 0) return alert('السلة فارغة')
    if (!address) return alert('أدخل العنوان')
    if (!location) return alert('حدّد موقعك على الخريطة')

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
      items: items.map(i => ({
        id: i.id,
        name: i.name,
        price: i.price,
        qty: i.qty,
        ownerId: i.ownerId ?? restId,
      })),
      subtotal,
      deliveryFee,
      total,
      commissionRate,
      commissionAmount,
      totalBeforeDelivery,
      restaurantPayout: subtotal,
      applicationShare: commissionAmount,
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
      <div className="max-w-xl mx-auto bg-white rounded-2xl shadow p-6 text-gray-900">
        <h1 className="text-xl font-bold mb-4">إتمام الطلب</h1>

        {/* 🧾 تفاصيل الطلب */}
        <div className="border rounded-xl p-3 text-gray-800">
          {items.map(i => (
            <div key={i.id} className="flex items-center justify-between py-2 border-b last:border-b-0">
              <span className="text-sm">{i.name} × {i.qty}</span>
              <span className="font-semibold">{(i.price * i.qty).toFixed(2)} ر.س</span>
            </div>
          ))}
        </div>

        {/* 🏠 العنوان */}
        <input
          className="w-full border rounded-xl p-3 text-gray-900 placeholder-gray-500 mt-3"
          placeholder="العنوان التفصيلي"
          value={address}
          onChange={e => setAddress(e.target.value)}
        />

        {/* 📍 تحديد الموقع */}
        <button
          onClick={getMyLocation}
          className="w-full mt-3 rounded-xl p-3 bg-blue-600 text-white font-semibold hover:bg-blue-700"
        >
          📍 تحديد موقعي الحالي
        </button>

        {/* 🗺️ الخريطة */}
        {location && (
          <iframe
            title="خريطة الموقع"
            width="100%"
            height="250"
            style={{ borderRadius: '12px', marginTop: '10px' }}
            loading="lazy"
            allowFullScreen
            src={`https://maps.google.com/maps?hl=ar&q=${location.lat},${location.lng}&z=15&output=embed`}
          />
        )}

        {/* 💰 الملخص */}
        <div className="bg-gray-50 rounded-xl p-3 text-gray-800 mt-3">
          <div className="flex items-center justify-between text-sm">
            <span>المجموع الأساسي</span>
            <span>{subtotal.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>ضريبة التطبيق (15٪)</span>
            <span>{commissionAmount.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span>رسوم التوصيل</span>
            <span>{deliveryFee.toFixed(2)} ر.س</span>
          </div>
          <div className="flex items-center justify-between font-bold text-lg mt-1 text-gray-900">
            <span>الإجمالي</span>
            <span>{total.toFixed(2)} ر.س</span>
          </div>
          <p className="text-[11px] text-gray-500 mt-2">
            يصل للمطعم <span className="font-semibold text-gray-700">{subtotal.toFixed(2)} ر.س</span>، وتُضاف ضريبة التطبيق آلياً
            بقيمة <span className="font-semibold text-gray-700">{commissionAmount.toFixed(2)} ر.س</span> لحساب المنصة.
          </p>
        </div>

        {/* ✅ زر تأكيد الطلب */}
        <button
          disabled={saving}
          onClick={placeOrder}
          className="w-full rounded-xl p-3 bg-green-600 hover:bg-green-700 text-white font-bold mt-3"
        >
          {saving ? '...' : 'تأكيد الطلب (دفع عند الاستلام)'}
        </button>
      </div>
    </RoleGate>
  )
}
