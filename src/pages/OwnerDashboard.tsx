// src/pages/OwnerDashboard.tsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Utensils, ClipboardList, Settings } from 'lucide-react'

export const OwnerDashboard: React.FC = () => {
  const cards = [
    {
      to: "/owner/menu",
      title: "إدارة القائمة",
      desc: "إضافة، تعديل أو إخفاء الأصناف والوجبات.",
      icon: <Utensils className="w-8 h-8 text-yellow-500" />,
      color: "from-yellow-50 to-white",
    },
    {
      to: "/owner/orders",
      title: "إدارة الطلبات",
      desc: "قبول الطلبات، تحديث الحالة، وتعيين المندوب.",
      icon: <ClipboardList className="w-8 h-8 text-green-500" />,
      color: "from-green-50 to-white",
    },
    {
      to: "/owner/edit",
      title: "تعديل بيانات المطعم",
      desc: "تغيير الاسم، رقم الجوال، المدينة والموقع.",
      icon: <Settings className="w-8 h-8 text-blue-500" />,
      color: "from-blue-50 to-white",
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
      {cards.map((card, idx) => (
        <Link
          key={idx}
          to={card.to}
          className={`rounded-2xl shadow-lg hover:shadow-2xl transition transform hover:-translate-y-1 bg-gradient-to-br ${card.color} p-6 flex flex-col`}
        >
          <div className="flex items-center gap-3 mb-3">
            {card.icon}
            <h3 className="text-lg font-extrabold text-gray-900">{card.title}</h3>
          </div>
          <p className="text-sm text-gray-600 flex-1">{card.desc}</p>
        </Link>
      ))}
    </div>
  )
}
