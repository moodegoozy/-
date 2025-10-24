// src/pages/Developer.tsx
import React from 'react'

export const Developer: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white">
      <h1 className="text-3xl font-bold text-yellow-400 mb-4">👨‍💻 المطور</h1>
      <p className="text-lg text-gray-300 mb-6">
        هذا الموقع تم تطويره بواسطة: <span className="font-semibold">مريم الكناني</span>
      </p>
      <p className="text-gray-400">📧 ايميل: memwalknany976@gmail.com</p>
      <p className="text-gray-400">📱 واتساب: 0555047703</p>
    </div>
  )
}
