// src/components/TopBar.tsx
import React from 'react'

export const TopBar: React.FC = () => {
  return (
    <div className="w-full bg-red-600 text-white py-2 overflow-hidden">
      <div className="marquee whitespace-nowrap font-bold text-sm">
        "جوعان؟ 🤤 اطلب أكلك من سفرة البيت ونوصل أكلك لين باب بيتك!"
      </div>
    </div>
  )
}
