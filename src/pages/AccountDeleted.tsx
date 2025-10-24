// src/pages/AccountDeleted.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function AccountDeleted() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 text-center">
      <h1 className="text-2xl font-bold text-red-600 mb-4">
        تم حذف حسابك بنجاح
      </h1>
      <p className="text-gray-600 mb-6">
        نأسف لمغادرتك 🍗 يمكنك العودة في أي وقت وإنشاء حساب جديد.
      </p>
      <Link
        to="/"
        className="text-white bg-red-500 px-6 py-2 rounded-lg hover:bg-red-600"
      >
        الرجوع إلى الصفحة الرئيسية
      </Link>
    </div>
  );
}
