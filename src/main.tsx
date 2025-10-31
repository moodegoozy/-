// src/main.tsx أو src/index.tsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { AuthProvider } from './auth'
import { CartProvider } from './context/CartContext'   // ✅ استيراد مزود السلة
import { PlatformSettingsProvider } from './context/PlatformSettingsContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <PlatformSettingsProvider>
          <CartProvider>   {/* ✅ لف التطبيق بالسلة */}
            <App />
          </CartProvider>
        </PlatformSettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
