# دليل رفع النظام على الاستضافات المجانية (Free Deployment Guide)

النظام عبارة عن تطبيق كامل مقسم إلى:
1. **Frontend (واجهة المستخدم)**: مبنية بـ React + Vite. (أفضل استضافة مجانية: **Vercel** أو **Netlify**).
2. **Backend (الـ API وقاعدة البيانات)**: مبنية بـ Node.js + Express + Prisma. (أفضل استضافة مجانية: **Render** أو **Railway**).

---

## الخطوة 1: رفع المشروع على GitHub
1. أنشئ مستودعاً جديداً (New Repository) على حسابك في GitHub (مثلاً: `helper-erp`).
2. ارفع كود المشروع إليه:
```bash
git add .
git commit -m "Prepare production deployment"
git push origin main
```

---

## الخطوة 2: رفع الـ Backend (على Render.com مجاناً)
1. سجل دخولك على [Render.com](https://render.com) بحساب GitHub.
2. اضغط **New +** ثم اختر **Web Service**.
3. اختر مستودع الـ GitHub الخاص بالمشروع (`helper-erp`).
4. أدخل الإعدادات التالية:
   - **Name**: `helper-erp-api`
   - **Environment**: `Node`
   - **Build Command**:
     ```bash
     pnpm install && pnpm --filter @erp/database db:generate && pnpm --filter @erp/shared build && pnpm --filter @erp/api build
     ```
   - **Start Command**:
     ```bash
     pnpm --filter @erp/database db:push && pnpm --filter @erp/api start
     ```
5. في قسم **Environment Variables (المتغيرات)**، أضف الآتي:
   - `NODE_ENV`: `production`
   - `PORT`: `3000`
   - `API_HOST`: `0.0.0.0`
   - `CORS_ORIGIN`: `*` (أو رابط الـ Frontend لاحقاً)
   - `DATABASE_URL`: `file:./prod.db`
   - `JWT_ACCESS_SECRET`: اكتب أي نص عشوائي قوي
   - `JWT_REFRESH_SECRET`: اكتب أي نص عشوائي قوي
6. اضغط **Create Web Service**.
7. بعد انتهاء الرفع، ستعطيك Render رابطاً للـ API مثل:
   `https://helper-erp-api.onrender.com`

---

## الخطوة 3: زرع البيانات الأولية وحساب الأدمن (Seed)
في Render، ادخل على الـ Service واضغط على تبويب **Shell** واكتب:
```bash
pnpm --filter @erp/database db:seed
```
وسيقوم بإنشاء حساب المدير الافتراضي (`admin@erp.local` / `admin123`).

---

## الخطوة 4: رفع الـ Frontend (على Vercel مجاناً)
1. سجل دخولك على [Vercel.com](https://vercel.com) بحساب GitHub.
2. اضغط **Add New Project** واختر مستودع `helper-erp`.
3. اضبط الإعدادات التالية:
   - **Root Directory**: اختر `apps/web`
   - **Framework Preset**: `Vite`
   - **Build Command**: `pnpm run build`
   - **Output Directory**: `dist`
4. في قسم **Environment Variables**:
   - `VITE_API_URL`: ضع رابط الـ Backend متبوعاً بـ `/api` (مثال: `https://helper-erp-api.onrender.com/api`)
5. اضغط **Deploy**.

---

## الملفات المجهزة داخل المشروع للتشغيل الفوري:
- [`vercel.json`](file:///d:/helper/apps/web/vercel.json): يدعم التوجيه السليم (SPA routing) في Vercel.
- [`_redirects`](file:///d:/helper/apps/web/public/_redirects): يدعم التوجيه في Netlify بدون أخطاء 404 عند تحديث الصفحة.
- [`Dockerfile.api`](file:///d:/helper/Dockerfile.api): ملف Docker جاهز للتشغيل على أي سيرفر سحابي أو VPS.
- [`render.yaml`](file:///d:/helper/render.yaml): إعدادات Blueprint جاهزة لتشغيل Render بنقرة واحدة.
- [`apps/api/src/config/index.ts`](file:///d:/helper/apps/api/src/config/index.ts): تم ضبطه ليقرأ منفذ `PORT` ديناميكياً من السيرفر والاستماع لـ `0.0.0.0`.
