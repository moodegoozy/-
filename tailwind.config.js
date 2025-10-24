/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx,js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['system-ui', 'Tahoma', 'Arial', 'ui-sans-serif', 'sans-serif'],
      },
      colors: {
        primary: '#7B0000',      // ❤️ الأحمر العنّابي (اللون الرئيسي)
        secondary: '#F8DEB0',    // 🤍 البيج الفاتح (الخلفية)
        accent: '#C89B3C',       // ✨ الذهبي
        dark: '#2B1A16',         // 🖤 الأسود الفاتح للنصوص
      },
    },
  },
  plugins: [],
}
