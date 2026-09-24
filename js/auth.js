/* ============================================================
   MEN Store — Auth + Account System (js/auth.js) — v2
   ============================================================ */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // ⚠️⚠️⚠️  ضع مفاتيح مشروعك هنا  ⚠️⚠️⚠️
  // ═══════════════════════════════════════════════════════════
  //   1) ادخل: https://supabase.com/dashboard
  //   2) اختر مشروعك → Settings → API
  //   3) انسخ "Project URL"     → الصقه في SUPABASE_URL
  //   4) انسخ "anon public"     → الصقه في SUPABASE_ANON_KEY
  // ═══════════════════════════════════════════════════════════

  const SUPABASE_URL      = 'https://xoqwzluyxynqpdpmidts.supabase.co';
  const SUPABASE_ANON_KEY = 'sb_publishable_rQvBPw08M9Q3bWTDfFseTQ_6SU3aN96';

  // ═══════════════════════════════════════════════════════════

  // ═══ فحص المفاتيح ═══
  const isPlaceholder = (val) =>
      !val
   || val.includes('YOUR-PROJECT')
   || val.includes('YOUR-ANON-KEY')
   || val.includes('...')
   || !val.startsWith('http') && !val.startsWith('eyJ');

  const credsReady = SUPABASE_URL.startsWith('https://')
                  && SUPABASE_URL.includes('.supabase.co')
                  && SUPABASE_ANON_KEY.startsWith('eyJ')
                  && SUPABASE_ANON_KEY.length > 100;

  if (!credsReady) {
    console.error(
      '%c⛔ MEN AUTH — لم يتم إعداد مفاتيح Supabase!',
      'background:#d90429;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold;font-size:14px'
    );
    console.error('رجاءً افتح js/auth.js وبدّل السطرين:');
    console.error("  const SUPABASE_URL      = '...' ← رابط مشروعك");
    console.error("  const SUPABASE_ANON_KEY = '...' ← المفتاح العام");
    console.error('من: Supabase Dashboard → Settings → API');
    // نستمر لكن بوضع معطّل — يظهر تنبيه في الواجهة
    window.MEN_AUTH = {
      CASHBACK_RATE: 0.02,
      open: () => alert('⚠️ لم يتم إعداد Supabase بعد.\nافتح js/auth.js وضع مفاتيح مشروعك.'),
      openAccount: () => alert('⚠️ لم يتم إعداد Supabase بعد.'),
      logout: () => {},
      getCurrentUser: () => null,
      addCashback: async () => {},
      deductCashback: async () => {},
      addOrder: async () => {}
    };
    return;
  }

  // ═══ إنشاء العميل ═══
  if (!window.supabase || !window.supabase.createClient) {
    console.error('[MEN_AUTH] ⛔ Supabase SDK غير محمّل! تأكد من وجود <script src=".../supabase-js@2"> قبل auth.js');
    return;
  }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'men-auth-token',
      storage: window.localStorage,
      flowType: 'pkce'
    }
  });
  window.MEN_SUPABASE = sb;

  console.log('%c✅ MEN AUTH — متصل بـ Supabase',
    'background:#4caf50;color:#fff;padding:4px 10px;border-radius:4px;font-weight:bold');
  console.log('   URL:', SUPABASE_URL);

  const CASHBACK_RATE = 0.02;
  let currentUser = null;
  let authMode = 'login';
  const $ = id => document.getElementById(id);

  // ═══ الأفاتار ═══
  function avatarFor(user) {
    return user?.user_metadata?.avatar_url
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'MEN')}&background=021ca4&color=fff&bold=true`;
  }

  // ═══ مزامنة الواجهة ═══
  function syncUI(user) {
    currentUser = user;

    const loginBtn = $('menLoginBtn');
    const avatar   = $('menHeaderAvatar');

    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (avatar) { avatar.src = avatarFor(user); avatar.style.display = 'block'; }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (avatar) avatar.style.display = 'none';
    }

    const mLogin   = $('menMobileLogin');
    const mAccount = $('menMobileAccount');
    if (mLogin)   mLogin.style.display   = user ? 'none' : 'flex';
    if (mAccount) mAccount.style.display = user ? 'flex' : 'none';

    if (typeof window.updateCartUI === 'function') window.updateCartUI();

    console.log(user ? '🔐 مسجل دخول: ' + user.email : '🔓 غير مسجل');
  }

  // ═══ بناء المودالات ═══
  function injectModals() {
    if ($('menAuthModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="menAuthModal" class="modal-overlay">
        <div class="modal-box auth-modal-box">
          <div class="modal-close" data-close-auth><i class="fas fa-times"></i></div>
          <h3><i class="fas fa-fingerprint"></i> <span id="menAuthTitle">تسجيل الدخول</span></h3>
          <p class="auth-subtitle" id="menAuthSubtitle">أدخل بياناتك للمتابعة</p>
          <div class="auth-input-group">
            <i class="fas fa-envelope"></i>
            <input type="email" id="menAuthEmail" placeholder="البريد الإلكتروني" autocomplete="email" dir="ltr">
          </div>
          <div class="auth-input-group">
            <i class="fas fa-lock"></i>
            <input type="password" id="menAuthPassword" placeholder="كلمة المرور" autocomplete="current-password" dir="ltr">
          </div>
          <div class="auth-input-group" id="menNameGroup" style="display:none;">
            <i class="fas fa-user"></i>
            <input type="text" id="menAuthName" placeholder="الاسم الكامل" autocomplete="name">
          </div>
          <div class="auth-input-group" id="menPhoneGroup" style="display:none;">
            <i class="fas fa-phone"></i>
            <input type="tel" id="menAuthPhone" placeholder="رقم الجوال" autocomplete="tel" dir="ltr">
          </div>
          <div class="auth-error" id="menAuthError"></div>
          <button class="auth-submit-btn" id="menAuthSubmit" type="button">
            <i class="fas fa-arrow-left"></i> <span id="menAuthSubmitText">دخول</span>
          </button>
          <div class="auth-switch">
            <span id="menAuthSwitchText">ليس لديك حساب؟</span>
            <a id="menAuthSwitchBtn">إنشاء حساب</a>
          </div>
        </div>
      </div>

      <div id="menAccountModal" class="modal-overlay">
        <div class="modal-box account-modal-box">
          <div class="modal-close" data-close-account><i class="fas fa-times"></i></div>
          <div class="account-hero">
            <img class="account-avatar" id="menAccountAvatar" src="" alt="">
            <div class="account-name" id="menAccountName">—</div>
            <div class="account-email" id="menAccountEmail">—</div>
          </div>
          <div class="account-body">
            <div class="cashback-card">
              <div class="cash-label"><i class="fas fa-wallet"></i> رصيد الكاش باك</div>
              <div class="cash-amount"><span id="menAccountCashback">0.00</span><small>ر.س</small></div>
              <div class="cash-note"><i class="fas fa-info-circle"></i> تكسب 2% على كل طلب</div>
            </div>
            <div class="account-info-grid">
              <div class="account-info-item">
                <div class="lbl"><i class="fas fa-phone"></i> الجوال</div>
                <div class="val" id="menAccountPhone">—</div>
              </div>
              <div class="account-info-item">
                <div class="lbl"><i class="fas fa-box"></i> عدد الطلبات</div>
                <div class="val" id="menAccountOrders">0</div>
              </div>
            </div>
            <div class="account-actions">
              <button class="account-btn primary" id="menAccountShop" type="button">
                <i class="fas fa-shopping-bag"></i> تسوق الآن
              </button>
              <button class="account-btn danger" id="menAccountLogout" type="button">
                <i class="fas fa-sign-out-alt"></i> تسجيل الخروج
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelectorAll('[data-close-auth]').forEach(b =>
      b.addEventListener('click', () => $('menAuthModal').classList.remove('active')));
    wrap.querySelectorAll('[data-close-account]').forEach(b =>
      b.addEventListener('click', () => $('menAccountModal').classList.remove('active')));
    $('menAuthModal').addEventListener('click', e => {
      if (e.target === $('menAuthModal')) $('menAuthModal').classList.remove('active');
    });
    $('menAccountModal').addEventListener('click', e => {
      if (e.target === $('menAccountModal')) $('menAccountModal').classList.remove('active');
    });

    $('menAuthSwitchBtn').addEventListener('click', () => {
      authMode = (authMode === 'login') ? 'signup' : 'login';
      renderAuthMode();
    });
    $('menAuthSubmit').addEventListener('click', handleSubmit);
    $('menAuthPassword').addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    $('menAuthEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPassword').focus(); });

    $('menAccountLogout').addEventListener('click', logout);
    $('menAccountShop').addEventListener('click', () => $('menAccountModal').classList.remove('active'));

    const av = $('menHeaderAvatar');
    if (av) av.addEventListener('click', openAccount);
  }

  function renderAuthMode() {
    const login = authMode === 'login';
    $('menAuthTitle').textContent    = login ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    $('menAuthSubtitle').textContent = login ? 'أدخل بياناتك للمتابعة' : 'سجل حسابك واحصل على كاش باك 2%';
    $('menAuthSubmitText').textContent = login ? 'دخول' : 'إنشاء الحساب';
    $('menAuthSwitchText').textContent = login ? 'ليس لديك حساب؟' : 'لديك حساب؟';
    $('menAuthSwitchBtn').textContent  = login ? 'إنشاء حساب' : 'دخول';
    $('menNameGroup').style.display  = login ? 'none' : 'block';
    $('menPhoneGroup').style.display = login ? 'none' : 'block';
    $('menAuthError').textContent = '';
  }

  function open(mode) {
    injectModals();
    authMode = mode === 'signup' ? 'signup' : 'login';
    renderAuthMode();
    $('menAuthModal').classList.add('active');
    setTimeout(() => $('menAuthEmail')?.focus(), 200);
  }

  async function openAccount() {
    if (!currentUser) return open('login');
    injectModals();
    fillAccountUI(currentUser);
    $('menAccountModal').classList.add('active');
    const { data } = await sb.auth.getUser();
    if (data?.user) { currentUser = data.user; fillAccountUI(data.user); }
  }

  function fillAccountUI(user) {
    const meta = user.user_metadata || {};
    $('menAccountAvatar').src   = avatarFor(user);
    $('menAccountName').textContent  = meta.name || meta.full_name || user.email?.split('@')[0] || 'مستخدم';
    $('menAccountEmail').textContent = user.email || '—';
    $('menAccountPhone').textContent = meta.phone || '—';
    $('menAccountCashback').textContent = Number(meta.cashback || 0).toFixed(2);
    $('menAccountOrders').textContent   = Array.isArray(meta.orders) ? meta.orders.length : 0;
  }

  // ═══ تسجيل الدخول / التسجيل ═══
  async function handleSubmit() {
    const email    = $('menAuthEmail').value.trim().toLowerCase();
    const password = $('menAuthPassword').value;
    const name     = $('menAuthName').value.trim();
    const phone    = $('menAuthPhone').value.trim();

    showErr('');

    if (!email || !password) return showErr('الرجاء إدخال البريد وكلمة المرور');
    if (!email.includes('@')) return showErr('صيغة البريد الإلكتروني غير صحيحة');
    if (authMode === 'signup' && password.length < 6) return showErr('كلمة المرور 6 أحرف على الأقل');

    const btn = $('menAuthSubmit');
    btn.disabled = true;
    const origText = $('menAuthSubmitText').textContent;
    $('menAuthSubmitText').textContent = 'جاري...';

    try {
      if (authMode === 'login') {
        console.log('🔐 محاولة دخول:', email);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
          console.error('❌ فشل الدخول:', error);
          const m = (error.message || '').toLowerCase();

          if (m.includes('email not confirmed'))
            showErr('⚠️ بريدك غير مؤكد. افتح بريدك واضغط رابط التأكيد.');
          else if (m.includes('invalid login'))
            showErr('❌ البريد أو كلمة المرور خطأ. تأكد جيداً أو استخدم "نسيت كلمة المرور".');
          else if (m.includes('too many requests'))
            showErr('⏳ محاولات كثيرة. انتظر دقيقة.');
          else
            showErr(error.message);
          return;
        }

        console.log('✅ نجح الدخول:', data.user?.email);

      } else {
        console.log('📝 محاولة تسجيل:', email);
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, phone, cashback: 0, orders: [] } }
        });
        if (error) throw error;

        if (!data.session) {
          showErr('📧 تم إنشاء الحساب! افتح بريدك واضغط رابط التأكيد ثم سجّل دخول.');
          return;
        }
        console.log('✅ تم التسجيل والدخول:', data.user?.email);
      }

      $('menAuthModal').classList.remove('active');
      if (typeof window.showToast === 'function')
        window.showToast(authMode === 'login' ? 'مرحباً بك! 👋' : 'تم إنشاء حسابك 🎉', 'success');

    } catch (err) {
      console.error('[MEN_AUTH]', err);
      showErr(err.message || 'حدث خطأ');
    } finally {
      btn.disabled = false;
      $('menAuthSubmitText').textContent = origText;
    }
  }

  function showErr(msg) { const el = $('menAuthError'); if (el) el.textContent = msg; }

  async function logout() {
    await sb.auth.signOut();
    $('menAccountModal').classList.remove('active');
    if (typeof window.showToast === 'function') window.showToast('تم تسجيل الخروج', 'info');
  }

  // ═══ API عام ═══
  window.MEN_AUTH = {
    CASHBACK_RATE,
    open,
    openAccount,
    logout,
    getCurrentUser: () => currentUser,
    addCashback: async (amount) => {
      if (!currentUser || amount <= 0) return;
      const cashback = Number(currentUser.user_metadata?.cashback || 0) + Number(amount);
      await sb.auth.updateUser({ data: { cashback: Math.round(cashback * 100) / 100 } });
    },
    deductCashback: async (amount) => {
      if (!currentUser || amount <= 0) return;
      const cashback = Math.max(0, Number(currentUser.user_metadata?.cashback || 0) - Number(amount));
      await sb.auth.updateUser({ data: { cashback: Math.round(cashback * 100) / 100 } });
    },
    addOrder: async (order) => {
      if (!currentUser) return;
      const orders = currentUser.user_metadata?.orders || [];
      orders.push({ ...order, date: new Date().toISOString() });
      await sb.auth.updateUser({ data: { orders } });
    }
  };

  // ═══ بدء التشغيل ═══
  async function bootstrap() {
    injectModals();

    // ═══ استرجاع الجلسة المحفوظة ═══
    const { data: { session }, error } = await sb.auth.getSession();
    if (error) console.warn('[MEN_AUTH] getSession:', error.message);

    syncUI(session?.user || null);

    // ═══ الاستماع للتغييرات ═══
    sb.auth.onAuthStateChange((event, session) => {
      console.log('[MEN_AUTH] حدث:', event);
      syncUI(session?.user || null);
      if (event === 'SIGNED_OUT') {
        // امسح أي بيانات قديمة
        Object.keys(localStorage)
          .filter(k => k.startsWith('sb-') && k.includes('auth'))
          .forEach(k => { /* نترك Supabase يتصرف بنفسه */ });
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // ═══ أداة تشخيص — اكتب في Console: MEN_DEBUG()
  window.MEN_DEBUG = async () => {
    console.log('%c═══ MEN AUTH DEBUG ═══', 'font-weight:bold;color:#4a7aff;font-size:14px');
    console.log('URL:', SUPABASE_URL);
    console.log('Key starts:', SUPABASE_ANON_KEY.substring(0, 20) + '...');
    const { data } = await sb.auth.getSession();
    console.log('Session:', data.session);
    console.log('User:', data.session?.user);
  };
  window.MEN_TEST_LOGIN = async (email, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    console.log('DATA:', data);
    console.log('ERROR:', error);
    return { data, error };
  };
})();
