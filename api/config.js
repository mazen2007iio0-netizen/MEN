// ============================================================
//  api/config.js
//  Serverless Function على Vercel — يعيد إعدادات Supabase العامة
//  يقرأ من متغيرات البيئة التي أعددتها في Vercel
//  لا يكشف أي Secret — فقط URL والمفتاح العام
// ============================================================

export default function handler(req, res) {
  // السماح بالطلبات من المتصفح
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  // تخزين مؤقت قصير للأداء
  res.setHeader('Cache-Control', 'public, max-age=300, s-maxage=300');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ✅ اقرأ من متغيرات Vercel (ليست في الكود، ولا في GitHub)
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;

  // فحص الإعداد
  if (!url || !key) {
    console.error('[MEN/api/config] ❌ متغيرات البيئة مفقودة');
    return res.status(500).json({
      error: 'Configuration missing',
      message: 'SUPABASE_URL و SUPABASE_PUBLISHABLE_KEY يجب ضبطهما في Vercel'
    });
  }

  // ✅ أعد فقط القيم العامة — لا شيء حساس
  return res.status(200).json({ url, key });
}
