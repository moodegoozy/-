import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "@/firebase";
import { deleteUser } from "firebase/auth";
import { doc, deleteDoc } from "firebase/firestore";
import { useAuth } from "@/auth"; // hook يرجع { user }

export const Footer: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleDeleteAccount = async () => {
    if (!user) return;

    const confirmDelete = window.confirm("هل أنت متأكد أنك تريد حذف حسابك نهائيًا؟");
    if (!confirmDelete) return;

    try {
      await deleteDoc(doc(db, "users", user.uid));
      await deleteUser(auth.currentUser!);

      alert("تم حذف حسابك بنجاح ✅");
      navigate("/account-deleted");
    } catch (error: any) {
      console.error("Error deleting account:", error);
      alert("حدث خطأ أثناء حذف الحساب. يرجى المحاولة لاحقًا.");
    }
  };

  return (
    <footer className="bg-[#7b0000] text-yellow-100 text-center py-8 mt-20 border-t-4 border-yellow-500 shadow-[0_-4px_12px_rgba(0,0,0,0.4)]">
      <div className="flex flex-col items-center gap-4 px-3">
        {/* النص الرئيسي */}
        <p className="text-sm md:text-base font-medium tracking-wide">
          جميع الحقوق محفوظة © {new Date().getFullYear()} 🍗{" "}
          <span className="font-bold text-yellow-400">سفرة البيت</span> |
          <Link
            to="/developer"
            className="text-yellow-300 hover:text-yellow-200 font-semibold ml-1 transition-all duration-300"
          >
            المطور
          </Link>
        </p>

        {/* ✅ الأزرار جنب بعض ومتناسقة مع الجوال */}
        <div className="flex flex-wrap justify-center items-center gap-3 w-full">
          {/* زر سياسة الخصوصية */}
          <Link
            to="/privacy-policy"
            className="flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-[#4a0000] font-bold px-5 py-2 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-transform duration-300 whitespace-nowrap w-[170px]"
          >
            📜 سياسة الخصوصية
          </Link>

          {/* فاصل بسيط */}
          <span className="hidden sm:inline text-yellow-400 text-xl font-bold">|</span>

          {/* زر حذف الحساب */}
          {user && (
            <button
              onClick={handleDeleteAccount}
              className="flex items-center justify-center gap-2 bg-gradient-to-r from-red-700 to-red-500 text-white font-semibold px-5 py-2 rounded-full shadow-md hover:scale-105 hover:shadow-lg transition-transform duration-300 whitespace-nowrap w-[170px]"
            >
              🗑️ حذف حسابي
            </button>
          )}
        </div>
      </div>
    </footer>
  );
};
