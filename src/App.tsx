// src/App.tsx
import React from 'react'
import { Routes, Route } from 'react-router-dom'
import { Header } from './components/Header'
import { Footer } from './components/Footer'
import { TopBar } from './components/TopBar'
import { MenuPage } from './pages/MenuPage'
import { Login } from './pages/Login'
import { Register } from './pages/Register'
import { CheckoutPage } from './pages/CheckoutPage'
import { TrackOrders } from './pages/TrackOrders'
import { OwnerDashboard } from './pages/OwnerDashboard'
import { ManageMenu } from './pages/ManageMenu'
import { OrdersAdmin } from './pages/OrdersAdmin'
import { CourierApp } from './pages/CourierApp'
import { AdminLogin } from './pages/AdminLogin'
import { AdminDashboard } from './pages/AdminDashboard'
import { ProtectedRoute } from './routes/ProtectedRoute'
import { RoleGate } from './routes/RoleGate'
import { EditRestaurant } from './pages/EditRestaurant'
import { Landing } from './pages/Landing'
import { CartPage } from './pages/CartPage'
import { Developer } from './pages/Developer'
import { RestaurantsPage } from './pages/RestaurantsPage'

// ✅ صفحات إضافية
import { CourierHiring } from './pages/CourierHiring'
import { CourierRequests } from './pages/CourierRequests'

// ✅ صفحة التشخيص
import { DebugOrders } from './pages/DebugOrders'

// ✅ صفحة تم حذف الحساب
import AccountDeleted from './pages/AccountDeleted'

// ✅ صفحة سياسة الخصوصية
import PrivacyPolicy from './pages/PrivacyPolicy'

export default function App() {
  return (
    <div className="min-h-screen flex flex-col bg-secondary text-dark">
      {/* ✅ شريط علوي (اختياري) */}
      <TopBar />
      
      {/* ✅ الهيدر */}
      <Header />

      {/* ✅ المحتوى الرئيسي */}
      <main className="flex-1 max-w-6xl mx-auto px-4 py-8 bg-gradient-to-br from-secondary via-[#FCEBCB] to-[#F7DDA6] rounded-xl shadow-inner">
        <Routes>
          {/* 🏠 صفحة البداية */}
          <Route path="/" element={<Landing />} />

          {/* 👤 صفحات عامة */}
          <Route path="/restaurants" element={<RestaurantsPage />} />
          <Route path="/menu" element={<MenuPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/register" element={<Register />} />
          <Route path="/cart" element={<CartPage />} />
          <Route path="/developer" element={<Developer />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />

          {/* ✅ صفحة تم حذف الحساب */}
          <Route path="/account-deleted" element={<AccountDeleted />} />

          {/* ✅ صفحات العميل فقط */}
          <Route
            path="/checkout"
            element={
              <ProtectedRoute>
                <RoleGate allow={['customer']}>
                  <CheckoutPage />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/orders"
            element={
              <ProtectedRoute>
                <RoleGate allow={['customer']}>
                  <TrackOrders />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* 🍽️ صاحب المطعم */}
          <Route
            path="/owner"
            element={
              <ProtectedRoute>
                <RoleGate allow={['owner']}>
                  <OwnerDashboard />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/menu"
            element={
              <ProtectedRoute>
                <RoleGate allow={['owner']}>
                  <ManageMenu />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/orders"
            element={
              <ProtectedRoute>
                <RoleGate allow={['owner']}>
                  <OrdersAdmin />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/edit"
            element={
              <ProtectedRoute>
                <RoleGate allow={['owner']}>
                  <EditRestaurant />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/owner/courier-requests"
            element={
              <ProtectedRoute>
                <RoleGate allow={['owner']}>
                  <CourierRequests />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* 🚚 المندوب */}
          <Route
            path="/courier"
            element={
              <ProtectedRoute>
                <RoleGate allow={['courier']}>
                  <CourierApp />
                </RoleGate>
              </ProtectedRoute>
            }
          />
          <Route
            path="/courier/hiring"
            element={
              <ProtectedRoute>
                <RoleGate allow={['courier']}>
                  <CourierHiring />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin/panel"
            element={
              <ProtectedRoute redirectTo="/admin/login">
                <RoleGate allow={['admin']}>
                  <AdminDashboard />
                </RoleGate>
              </ProtectedRoute>
            }
          />

          {/* 🧪 صفحة التشخيص */}
          <Route path="/__debug_orders" element={<DebugOrders />} />
        </Routes>
      </main>

      {/* ✅ الفوتر */}
      <Footer />
    </div>
  )
}
