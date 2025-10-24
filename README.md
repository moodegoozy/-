# برست القرية — تطبيق ويب (React + Firebase)

تطبيق جاهز لإدارة مطعم برست القريّة:
- **أدوار**: عميل، مندوب، صاحب المطعم
- **ميزات**: قائمة أصناف، سلة، إنشاء طلب، تتبع الطلب، إدارة الطلبات، واجهة المندوب، إدارة القائمة
- **التقنية**: React + Vite + TypeScript + TailwindCSS + Firebase (Auth/Firestore/Storage)

## كيف أشغّل المشروع محلياً؟
1) نزّل الملف المضغوط وافتحه
2) افتح التيرمنال داخل المجلد وشغّل:
```bash
npm i
```
3) انسخ ملف البيئة:
```bash
cp .env.example .env.local
```
4) افتح Firebase Console وأنشئ مشروعاً، فعِّل Auth (Email/Password) وFirestore وStorage. ثم عبّئ القيم في `.env.local`.
5) شغّل:
```bash
npm run dev
```
6) افتح المتصفح على العنوان الذي يظهر لك (غالباً `http://localhost:5173`).

## بنية قواعد البيانات (Firestore)
- `users/{uid}` → `{ name, email, role: 'owner'|'courier'|'customer' }`
- `menuItems/{id}` → `{ name, desc, price, imageUrl, available }`
- `orders/{id}` → `{ customerId, items[], subtotal, deliveryFee, total, status, address, courierId? }`
- `settings/{doc}` (اختياري) → تكاليف التوصيل، أوقات الدوام ..إلخ

## حالات الطلب
`pending → accepted → preparing → ready → out_for_delivery → delivered`
ويمكن الإلغاء `cancelled`.

## الصلاحيات (ملف rules)
مرفق ملف `firestore.rules` جاهز للنشر من Firebase Hosting أو عبر Firebase CLI.

## ملاحظات
- الدفع حالياً (عند الاستلام). يمكن لاحقاً إضافة دفع إلكتروني (مدى/Apple Pay/STC Pay) عبر بوابة طرف ثالث.
- الموقع يدعم العربية RTL ويعمل كتطبيق ويب متجاوب.

موفّق 🌟
