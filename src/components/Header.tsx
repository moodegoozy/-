// src/components/Header.tsx
import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "@/auth";
import { Menu } from "lucide-react";

const NavLink: React.FC<{ to: string; label: string; onClick?: () => void }> = ({
  to,
  label,
  onClick,
}) => {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={
        "px-3 py-2 rounded-xl text-sm font-semibold transition-all duration-300 " +
        (active
          ? "bg-accent text-primary shadow-md scale-105"
          : "text-secondary hover:text-yellow-300 hover:bg-primary/60")
      }
    >
      {label}
    </Link>
  );
};

export const Header: React.FC = () => {
  const { user, role, logout } = useAuth();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 bg-gradient-to-r from-primary via-primary/90 to-dark shadow-lg border-b-4 border-accent z-30">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        {/* شعار */}
        <Link
          to="/"
          className="text-2xl font-extrabold text-accent flex items-center gap-2 hover:scale-105 transition-transform"
        >
          🍗 سفرة البيت
        </Link>

        {/* أزرار الديسكتوب */}
        <nav className="hidden md:flex items-center gap-3">
          <NavLink to="/restaurants" label="المطاعم" />

          {/* 👤 العميل فقط */}
          {role === "customer" && (
            <>
              <NavLink to="/cart" label="🛒 السلة" />
              <NavLink to="/orders" label="طلباتي" />
            </>
          )}

          {/* 👨‍🍳 صاحب المطعم */}
          {role === "owner" && (
            <>
              <NavLink to="/owner" label="لوحة المطعم" />
              <NavLink to="/owner/orders" label="طلبات المطعم" />
              <NavLink
                to="/owner/courier-requests"
                label="طلبات المندوبين"
              />{" "}
              {/* ✅ جديد */}
            </>
          )}

          {/* 🚚 المندوب */}
          {role === "courier" && (
            <>
              <NavLink to="/courier" label="واجهة المندوب" />
              <NavLink to="/courier/hiring" label="طلبات التوظيف" /> {/* ✅ جديد */}
            </>
          )}

          {/* دخول/خروج */}
          {user ? (
            <button
              onClick={logout}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-700 to-red-500 hover:scale-105 hover:shadow-md transition-all duration-300"
            >
              خروج
            </button>
          ) : (
            <NavLink to="/login" label="دخول" />
          )}
        </nav>

        {/* زر المينيو للجوال */}
        <button
          className="md:hidden p-2 rounded-xl hover:bg-primary/40 transition"
          onClick={() => setOpen(!open)}
        >
          <Menu className="w-6 h-6 text-accent" />
        </button>
      </div>

      {/* قائمة الجوال */}
      {open && (
        <div className="md:hidden bg-primary border-t-2 border-accent px-4 py-3 flex flex-col gap-2 text-secondary shadow-inner">
          <NavLink
            to="/restaurants"
            label="المطاعم"
            onClick={() => setOpen(false)}
          />

          {/* 👤 العميل فقط */}
          {role === "customer" && (
            <>
              <NavLink
                to="/cart"
                label="🛒 السلة"
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/orders"
                label="طلباتي"
                onClick={() => setOpen(false)}
              />
            </>
          )}

          {/* 👨‍🍳 صاحب المطعم */}
          {role === "owner" && (
            <>
              <NavLink
                to="/owner"
                label="لوحة المطعم"
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/owner/orders"
                label="طلبات المطعم"
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/owner/courier-requests"
                label="طلبات المندوبين"
                onClick={() => setOpen(false)}
              />
            </>
          )}

          {/* 🚚 المندوب */}
          {role === "courier" && (
            <>
              <NavLink
                to="/courier"
                label="واجهة المندوب"
                onClick={() => setOpen(false)}
              />
              <NavLink
                to="/courier/hiring"
                label="طلبات التوظيف"
                onClick={() => setOpen(false)}
              />
            </>
          )}

          {user ? (
            <button
              onClick={() => {
                logout();
                setOpen(false);
              }}
              className="mt-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-red-700 to-red-500 hover:scale-105 transition-all duration-300"
            >
              خروج
            </button>
          ) : (
            <NavLink
              to="/login"
              label="دخول"
              onClick={() => setOpen(false)}
            />
          )}
        </div>
      )}
    </header>
  );
};
