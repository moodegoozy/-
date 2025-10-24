// src/pages/Landing.tsx
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/auth";

export const Landing: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary via-dark to-[#3a1a1a] text-center px-6 text-secondary relative overflow-hidden">
      {/* خلفية زخرفية ناعمة */}
      <div className="absolute top-0 left-0 w-80 h-80 bg-accent/10 rounded-full blur-3xl animate-pulse"></div>
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/30 rounded-full blur-3xl animate-pulse"></div>

      {/* المحتوى */}
      <div className="relative z-10 flex flex-col items-center">
        {/* عنوان الموقع */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-accent mb-4 drop-shadow-[0_4px_10px_rgba(0,0,0,0.4)]">
          🍗 سفرة البيت
        </h1>

        {/* وصف الموقع */}
        <p className="text-lg sm:text-xl md:text-2xl text-secondary/90 max-w-2xl mb-8 leading-relaxed font-medium">
          استمتع بأشهى الأكلات البيتية والبرست الطازج 😋  
          اطلب وجبتك بكل سهولة، وخليها توصلك لين باب بيتك 🚗💨
        </p>

        {/* صورة الواجهة */}
        <img
          src="/landing.png" // ✅ تأكد أن الصورة داخل مجلد public
          alt="طبق سفرة البيت"
          className="w-64 sm:w-80 md:w-96 mb-10 rounded-3xl shadow-2xl border-4 border-accent/40 object-cover hover:scale-105 transition-transform duration-300"
        />

        {/* الأزرار */}
        {user ? (
          <Link
            to="/restaurants"
            className="px-10 py-4 rounded-full text-lg font-semibold text-primary bg-accent shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:scale-105 hover:shadow-lg transition-transform duration-300"
          >
            🍴 تصفح المطاعم
          </Link>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <Link
              to="/login"
              className="px-10 py-4 rounded-full text-lg font-semibold text-primary bg-accent shadow-[0_4px_10px_rgba(0,0,0,0.3)] hover:scale-105 hover:shadow-lg transition-transform duration-300"
            >
              تسجيل الدخول
            </Link>

            <p className="text-secondary/80">
              ماعندك حساب؟{" "}
              <Link
                to="/register"
                className="text-accent font-semibold hover:underline hover:text-yellow-300 transition"
              >
                أنشئ حساب الآن
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
