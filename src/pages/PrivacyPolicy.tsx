// src/pages/PrivacyPolicy.tsx
import React from "react";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 px-6 py-10 leading-relaxed">
      <div className="max-w-3xl mx-auto bg-white shadow-lg rounded-2xl p-8">
        <h1 className="text-2xl font-bold text-red-600 mb-4 text-center">
          سياسة الخصوصية - 🍗 سفرة البيت
        </h1>

        <p className="mb-4">
          نُقدّر ثقتك بتطبيق <strong>سفرة البيت</strong> ونسعى لحماية خصوصيتك
          وبياناتك الشخصية وفقًا لأفضل الممارسات ومعايير الأمان.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-gray-900">
          1. جمع المعلومات
        </h2>
        <p className="mb-4">
          نقوم بجمع المعلومات التي تقدمها عند إنشاء حسابك أو عند استخدام خدماتنا،
          مثل الاسم، رقم الجوال، الموقع، وطلباتك داخل التطبيق. كما قد نجمع بيانات
          فنية مثل نوع الجهاز ونظام التشغيل لتحسين الأداء.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-gray-900">
          2. استخدام المعلومات
        </h2>
        <p className="mb-4">
          تُستخدم المعلومات لتقديم الخدمات وتحسين تجربة المستخدم، وإرسال
          الإشعارات المتعلقة بالطلبات، والدعم الفني، وتطوير مميزات جديدة.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-gray-900">
          3. حماية البيانات
        </h2>
        <p className="mb-4">
          نستخدم أنظمة حماية حديثة لتأمين بياناتك من الوصول غير المصرّح به أو
          التعديل أو الإفشاء. ولن نشارك معلوماتك مع أي جهة خارجية إلا بموافقتك
          أو وفقًا للأنظمة السارية في المملكة العربية السعودية.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-gray-900">
          4. مشاركة المعلومات
        </h2>
        <p className="mb-4">
          قد نشارك بعض المعلومات مع مقدّمي الخدمات (مثل شركات التوصيل أو الدفع)
          فقط بالقدر اللازم لإتمام الطلبات، وبما يضمن سرية بياناتك.
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-gray-900">
          5. حقوق المستخدم
        </h2>
        <p className="mb-4">
          يمكنك في أي وقت تحديث معلوماتك الشخصية أو حذف حسابك نهائيًا من خلال
          إعدادات التطبيق. كما يمكنك التواصل معنا لأي استفسار يخص الخصوصية عبر:
          <strong> mymwalknany976@gmail.com </strong>
        </p>

        <h2 className="text-xl font-semibold mt-6 mb-2 text-gray-900">
          6. التعديلات على السياسة
        </h2>
        <p className="mb-4">
          قد نقوم بتحديث هذه السياسة من وقت لآخر، وسيتم إشعار المستخدمين بأي تغيير
          جوهري عبر التطبيق أو البريد الإلكتروني.
        </p>

        <p className="mt-6 text-sm text-gray-600 text-center">
          تم آخر تحديث لهذه السياسة بتاريخ {new Date().toLocaleDateString("ar-SA")}.
        </p>

        <div className="mt-8 text-center">
          <Link
            to="/"
            className="text-white bg-red-500 hover:bg-red-600 px-6 py-2 rounded-lg"
          >
            الرجوع إلى الصفحة الرئيسية
          </Link>
        </div>
      </div>
    </div>
  );
}
