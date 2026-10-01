/* ============================================================
   ✨ MEN Ai — Auth System (Standalone) — xain.js
   ملف مستقل كامل: تسجيل دخول + تسجيل حساب + بروفايل
   ============================================================ */
(function () {
  'use strict';

  // ════════ 🔑 مفاتيح Supabase ════════
  const SUPABASE_URL = 'https://xoqwzluyxynqpdpmidts.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXd6bHV5eHlucXBkcG1pZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTI2NDAsImV4cCI6MjEwNTY4ODY0MH0.xIpvxJyAMAoLqkSR9RJk2ZcgN7rsfOg2OfbelraMWvs';

  const $ = (id) => document.getElementById(id);
  let currentUser = null;
  let listeners = [];
  let sb = null;

  // ════════ تهيئة Supabase ════════
  function initSupabase() {
    if (!window.supabase?.createClient) {
      console.error('[MEN_AUTH] Supabase SDK غير محمّل — أضف <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>');
      return false;
    }
    try {
      sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storageKey: 'men-ai-auth-token',
          storage: window.localStorage,
          flowType: 'pkce'
        }
      });
      window.MEN_SUPABASE = sb;
      return true;
    } catch (e) {
      console.error('[MEN_AUTH] فشل إنشاء client:', e);
      return false;
    }
  }

  // ════════ Helpers ════════
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
  }

  function makeInitialsAvatar(name, size = 200) {
    const clean = String(name || '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    let initials = '?';
    if (parts.length === 0) initials = '?';
    else if (parts.length === 1) initials = parts[0].substring(0, 2);
    else initials = (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
    initials = initials.toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0a1a5c"/><stop offset="100%" stop-color="#4a7aff"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Cairo,Tajawal,Arial,sans-serif" font-size="${Math.round(size * 0.44)}" font-weight="900" fill="#ffffff">${initials}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ════════ حقن CSS للـ Auth Gate ════════
  function injectCSS() {
    if ($('menAuthStyles')) return;
    const s = document.createElement('style');
    s.id = 'menAuthStyles';
    s.textContent = `
      .men-auth-gate{position:fixed;inset:0;z-index:99999;display:none;font-family:'Cairo',sans-serif;background:#04060f;overflow-y:auto;animation:menGIn .35s ease}
      .men-auth-gate.active{display:block}
      @keyframes menGIn{from{opacity:0}to{opacity:1}}
      .men-gate-bg{position:fixed;inset:0;pointer-events:none;background:
        radial-gradient(ellipse 60% 50% at 15% 15%,rgba(10,26,92,.5),transparent 60%),
        radial-gradient(ellipse 55% 45% at 85% 85%,rgba(30,64,175,.3),transparent 55%),
        radial-gradient(ellipse at 50% 50%,#04060f,#020408)}
      .men-gate-orb{position:fixed;border-radius:50%;filter:blur(110px);pointer-events:none;opacity:.5}
      .men-gate-orb.o1{width:500px;height:500px;background:radial-gradient(circle,#1e3a8a,transparent 70%);top:-150px;left:-150px}
      .men-gate-orb.o2{width:450px;height:450px;background:radial-gradient(circle,#2563eb,transparent 70%);bottom:-150px;right:-150px}
      .men-gate-layout{position:relative;z-index:10;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:center}
      .men-gate-show{display:flex;flex-direction:column;padding:60px 70px;justify-content:center;gap:24px}
      .men-gate-show h1{font-size:clamp(2rem,3.5vw,3rem);font-weight:900;color:#fff;letter-spacing:-1.5px;line-height:1.15}
      .men-gate-show h1 span{background:linear-gradient(135deg,#60a5fa,#3b82f6);-webkit-background-clip:text;background-clip:text;color:transparent}
      .men-gate-show p{color:#a8b0cc;font-size:1rem;line-height:1.9;max-width:480px}
      .men-gate-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(37,99,235,.15);border:1px solid rgba(59,130,246,.3);border-radius:60px;padding:8px 18px;font-size:.8rem;color:#60a5fa;font-weight:800;width:fit-content}
      .men-gate-form-wrap{display:flex;flex-direction:column;padding:50px 60px;justify-content:center}
      .men-gate-box{max-width:440px;width:100%;margin:0 auto;background:rgba(10,16,32,.6);border:1px solid rgba(37,99,235,.15);border-radius:28px;padding:36px 32px;backdrop-filter:blur(20px);box-shadow:0 30px 80px -30px rgba(10,26,92,.8);position:relative}
      .men-gate-close{position:absolute;top:14px;left:14px;width:36px;height:36px;border-radius:50%;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.2);color:#8a92b0;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .3s;font-size:.85rem}
      .men-gate-close:hover{background:rgba(220,38,38,.15);color:#f87171;transform:rotate(180deg)}
      .men-gate-tabs{display:grid;grid-template-columns:1fr 1fr;gap:4px;background:rgba(0,0,0,.4);border:1px solid rgba(37,99,235,.12);border-radius:14px;padding:4px;margin-bottom:22px;position:relative}
      .men-gate-tab{padding:12px;border-radius:10px;background:transparent;border:none;color:#8a92b0;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;transition:all .3s;z-index:2}
      .men-gate-tab.active{color:#fff}
      .men-gate-tabs-ind{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);background:linear-gradient(135deg,#0a1a5c,#1e40af);border-radius:10px;transition:transform .4s cubic-bezier(.34,1.4,.64,1);z-index:1}
      .men-gate-tabs[data-mode="signup"] .men-gate-tabs-ind{transform:translateX(calc(100% + 4px))}
      .men-gate-field{margin-bottom:14px}
      .men-gate-label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-right:4px}
      .men-gate-input-wrap{position:relative;display:flex;align-items:center}
      .men-gate-input-wrap input{width:100%;height:52px;padding:0 46px 0 14px;background:rgba(4,6,15,.5);border:1.5px solid rgba(37,99,235,.15);border-radius:12px;color:#fff;font-size:.92rem;outline:none;font-family:'Cairo',sans-serif;font-weight:600;transition:all .3s}
      .men-gate-input-wrap input:focus{border-color:#2563eb;background:rgba(37,99,235,.06);box-shadow:0 0 0 4px rgba(37,99,235,.12)}
      .men-gate-input-wrap .men-g-icon{position:absolute;right:14px;color:#3b82f6;font-size:.9rem;pointer-events:none}
      .men-gate-input-wrap .men-g-eye{position:absolute;left:10px;color:#5a607a;cursor:pointer;padding:6px;background:transparent;border:none;font-size:.85rem}
      .men-gate-error{max-height:0;overflow:hidden;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);border-radius:10px;color:#f87171;font-size:.82rem;font-weight:700;text-align:center;transition:all .3s;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 14px;margin-top:12px}
      .men-gate-error.show{max-height:80px;padding:10px 14px}
      .men-gate-submit{width:100%;height:54px;margin-top:18px;border:none;border-radius:12px;background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:1rem;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid rgba(59,130,246,.15)}
      .men-gate-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 30px -8px rgba(37,99,235,.7)}
      .men-gate-submit:disabled{opacity:.7;cursor:not-allowed}
      .men-gate-spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:menGSpin .7s linear infinite;display:none}
      .men-gate-submit.loading .men-gate-spinner{display:block}
      .men-gate-submit.loading .men-g-btn-icon{display:none}
      @keyframes menGSpin{to{transform:rotate(360deg)}}
      @media (max-width:900px){.men-gate-layout{grid-template-columns:1fr}.men-gate-show{display:none}.men-gate-form-wrap{padding:30px 20px}}
    `;
    document.head.appendChild(s);
  }

  // ════════ حقن HTML للـ Auth Gate ════════
  function injectGate() {
    if ($('menAuthGate')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div class="men-auth-gate" id="menAuthGate">
        <div class="men-gate-bg"></div>
        <div class="men-gate-orb o1"></div>
        <div class="men-gate-orb o2"></div>
        <div class="men-gate-layout">
          <div class="men-gate-show">
            <div class="men-gate-badge"><i class="fas fa-bolt"></i> MEN Ai v12</div>
            <h1>مرحباً بك في<br><span>مساعدك الذكي</span></h1>
            <p>سجّل دخولك للوصول إلى جميع ميزات MEN Ai، واحفظ محادثاتك بأمان.</p>
          </div>
          <div class="men-gate-form-wrap">
            <div class="men-gate-box">
              <button class="men-gate-close" id="menGateClose" type="button"><i class="fas fa-times"></i></button>
              <h2 style="font-size:1.5rem;font-weight:900;color:#fff;text-align:center;margin-bottom:6px" id="menGateTitle">أهلاً بعودتك 👋</h2>
              <p style="color:#8a92b0;font-size:.85rem;text-align:center;margin-bottom:24px;font-weight:600" id="menGateSub">سجّل دخولك للمتابعة</p>
              <div class="men-gate-tabs" id="menGateTabs" data-mode="login">
                <div class="men-gate-tabs-ind"></div>
                <button class="men-gate-tab active" data-atab="login" type="button">دخول</button>
                <button class="men-gate-tab" data-atab="signup" type="button">حساب جديد</button>
              </div>
              <div id="menGateNameField" style="display:none">
                <div class="men-gate-field">
                  <label class="men-gate-label">الاسم الكامل</label>
                  <div class="men-gate-input-wrap">
                    <input type="text" id="menGateName" placeholder="محمد أحمد" dir="rtl">
                    <i class="fas fa-user men-g-icon"></i>
                  </div>
                </div>
              </div>
              <div class="men-gate-field">
                <label class="men-gate-label">البريد الإلكتروني</label>
                <div class="men-gate-input-wrap">
                  <input type="email" id="menGateEmail" placeholder="you@example.com" dir="ltr" style="text-align:right">
                  <i class="fas fa-envelope men-g-icon"></i>
                </div>
              </div>
              <div class="men-gate-field">
                <label class="men-gate-label">كلمة المرور</label>
                <div class="men-gate-input-wrap">
                  <input type="password" id="menGatePassword" placeholder="••••••••" dir="ltr" style="text-align:right">
                  <i class="fas fa-lock men-g-icon"></i>
                  <button class="men-g-eye" id="menGateTogglePass" type="button"><i class="fas fa-eye"></i></button>
                </div>
              </div>
              <div class="men-gate-error" id="menGateError">
                <i class="fas fa-circle-exclamation"></i>
                <span id="menGateErrorText"></span>
              </div>
              <button class="men-gate-submit" id="menGateSubmit">
                <i class="fas fa-arrow-left men-g-btn-icon"></i>
                <span class="men-gate-spinner"></span>
                <span id="menGateSubmitText">تسجيل الدخول</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);
  }

  // ════════ منطق البوابة ════════
  let authMode = 'login';
  let canCloseGate = false;

  function switchMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'login';
    const isLogin = authMode === 'login';
    $('menGateTabs').dataset.mode = authMode;
    document.querySelectorAll('[data-atab]').forEach(b => b.classList.toggle('active', b.dataset.atab === authMode));
    $('menGateTitle').textContent = isLogin ? 'أهلاً بعودتك 👋' : 'انضم إلينا';
    $('menGateSub').textContent = isLogin ? 'سجّل دخولك للمتابعة' : 'أنشئ حسابك في ثوانٍ';
    $('menGateNameField').style.display = isLogin ? 'none' : 'block';
    $('menGateSubmitText').textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء الحساب';
    $('menGateError').classList.remove('show');
  }

  function showError(msg) {
    $('menGateErrorText').textContent = msg;
    $('menGateError').classList.add('show');
  }
  function clearError() {
    $('menGateError').classList.remove('show');
  }

  function openGate(mode) {
    injectCSS();
    injectGate();
    switchMode(mode || 'login');
    $('menAuthGate').classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function closeGate() {
    if (!currentUser && !canCloseGate) return; // لا يمكن الإغلاق بدون تسجيل
    $('menAuthGate')?.classList.remove('active');
    document.body.style.overflow = '';
  }

  // ════════ إرسال ════════
  async function doSubmit() {
    const mode = authMode;
    const email = $('menGateEmail').value.trim().toLowerCase();
    const password = $('menGatePassword').value;
    const name = $('menGateName').value.trim();
    const btn = $('menGateSubmit');
    clearError();

    if (!email || !password) return showError('الرجاء إدخال البريد وكلمة المرور');
    if (mode === 'signup' && !name) return showError('الرجاء إدخال الاسم');
    if (!isValidEmail(email)) return showError('صيغة البريد الإلكتروني غير صحيحة');
    if (password.length < 6) return showError('كلمة المرور 6 أحرف على الأقل');

    btn.disabled = true;
    btn.classList.add('loading');
    try {
      if (mode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name } }
        });
        if (error) throw error;
        if (!data.session) {
          showError('تم إنشاء حسابك! تحقق من بريدك للتفعيل.');
          btn.disabled = false;
          btn.classList.remove('loading');
          return;
        }
      } else {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      closeGate();
    } catch (err) {
      const m = (err.message || '').toLowerCase();
      if (m.includes('invalid login') || m.includes('invalid credentials')) showError('بيانات الدخول غير صحيحة');
      else if (m.includes('already registered') || m.includes('user already exists')) showError('البريد مسجّل بالفعل — سجّل دخولك');
      else if (m.includes('rate')) showError('محاولات كثيرة — انتظر دقيقة');
      else if (m.includes('password')) showError('كلمة المرور ضعيفة');
      else showError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  // ════════ تسجيل الخروج ════════
  async function logout() {
    try {
      await sb.auth.signOut();
      notify();
      openGate('login');
    } catch (e) { console.warn(e); }
  }

  // ════════ مراقبة تغيّر الحالة ════════
  function notify() {
    listeners.forEach(cb => {
      try { cb(currentUser); } catch (e) { console.warn(e); }
    });
  }

  function attachGateListeners() {
    $('menGateClose').addEventListener('click', closeGate);
    document.querySelectorAll('[data-atab]').forEach(b => b.addEventListener('click', () => switchMode(b.dataset.atab)));
    $('menGateSubmit').addEventListener('click', doSubmit);
    $('menGatePassword').addEventListener('keydown', e => { if (e.key === 'Enter') doSubmit(); });
    $('menGateTogglePass').addEventListener('click', () => {
      const inp = $('menGatePassword');
      const i = $('menGateTogglePass').querySelector('i');
      if (inp.type === 'password') { inp.type = 'text'; i.className = 'fas fa-eye-slash'; }
      else { inp.type = 'password'; i.className = 'fas fa-eye'; }
    });
  }

  // ════════ API عام ════════
  window.MEN_AUTH = {
    isLoggedIn: () => !!currentUser,
    getUser: () => currentUser,
    open: (mode) => openGate(mode || 'login'),
    logout: logout,
    makeAvatar: makeInitialsAvatar,
    onAuthChange: (cb) => {
      if (typeof cb === 'function') {
        listeners.push(cb);
        // شغّل callback فوراً بالحالة الحالية
        try { cb(currentUser); } catch (e) {}
      }
    }
  };

  // ════════ التشغيل ════════
  async function bootstrap() {
    if (!initSupabase()) return;
    injectCSS();
    injectGate();
    attachGateListeners();

    const { data: { session } } = await sb.auth.getSession();
    currentUser = session?.user || null;
    if (!currentUser) {
      openGate('login');
    } else {
      canCloseGate = true;
      notify();
    }

    sb.auth.onAuthStateChange((evt, session) => {
      const prev = currentUser;
      currentUser = session?.user || null;
      if (currentUser) {
        canCloseGate = true;
        closeGate();
      } else {
        canCloseGate = false;
        openGate('login');
      }
      if (prev?.id !== currentUser?.id) notify();
      else notify();
    });

    console.log('%c✨ MEN Auth Ready (xain.js)', 'background:linear-gradient(135deg,#0a1a5c,#2563eb);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900');
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootstrap);
  else bootstrap();
})();
