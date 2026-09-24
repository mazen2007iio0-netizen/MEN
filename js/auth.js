/* ============================================================
   MEN Store — Auth + Account System (js/auth.js)
   ============================================================ */
(function () {
  'use strict';

  // ════════ 1) إعدادات Supabase ════════
  const SUPABASE_URL      = 'https://xoqwzluyxynqpdpmidts.supabase.co';   // ← ضع رابط مشروعك
  const SUPABASE_ANON_KEY = 'sb_publishable_rQvBPw08M9Q3bWTDfFseTQ_6SU3aN96';          // ← ضع الـ anon key

  // ════════ 2) إنشاء العميل ════════
  let sb = null;
  if (window.supabase && window.supabase.createClient) {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
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
  } else {
    console.error('[MEN_AUTH] Supabase SDK غير محمّل!');
  }

  // ════════ 3) ثوابت ════════
  const CASHBACK_RATE = 0.02;
  let currentUser = null;
  let authMode = 'login';

  const $ = id => document.getElementById(id);

  // ════════ 4) الأفاتار ════════
  function avatarFor(user) {
    return user?.user_metadata?.avatar_url
        || user?.user_metadata?.picture
        || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.email || 'MEN')}&background=021ca4&color=fff&bold=true`;
  }

  // ════════ 5) مزامنة الواجهة ════════
  function syncUI(user) {
    currentUser = user;

    // الهيدر
    const loginBtn = $('menLoginBtn');
    const avatar   = $('menHeaderAvatar');
    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (avatar) { avatar.src = avatarFor(user); avatar.style.display = 'block'; }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (avatar) avatar.style.display = 'none';
    }

    // قائمة الجوال
    const mLogin   = $('menMobileLogin');
    const mAccount = $('menMobileAccount');
    if (mLogin)   mLogin.style.display   = user ? 'none' : 'flex';
    if (mAccount) mAccount.style.display = user ? 'flex' : 'none';

    // تحديث السلة
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
  }

  // ════════ 6) بناء المودالات ════════
  function injectModals() {
    if ($('menAuthModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="menAuthModal" class="modal-overlay">
        <div class="modal-box auth-modal-box">
          <div class="modal-close" data-close-auth><i class="fas fa-times"></i></div>
          <h3><i class="fas fa-fingerprint"></i> <span id="menAuthTitle">تسجيل الدخول</span></h3>
          <p class="auth-subtitle" id="menAuthSubtitle">سجل الان و اكسب كاش باك 2%</p>
          <div class="auth-input-group">
            <i class="fas fa-envelope"></i>
            <input type="email" id="menAuthEmail" placeholder="البريد الإلكتروني" autocomplete="email">
          </div>
          <div class="auth-input-group">
            <i class="fas fa-lock"></i>
            <input type="password" id="menAuthPassword" placeholder="كلمة المرور" autocomplete="current-password">
          </div>
          <div class="auth-input-group" id="menNameGroup" style="display:none;">
            <i class="fas fa-user"></i>
            <input type="text" id="menAuthName" placeholder="الاسم الكامل" autocomplete="name">
          </div>
          <div class="auth-input-group" id="menPhoneGroup" style="display:none;">
            <i class="fas fa-phone"></i>
            <input type="tel" id="menAuthPhone" placeholder="رقم الجوال" autocomplete="tel">
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

    $('menAccountLogout').addEventListener('click', logout);
    $('menAccountShop').addEventListener('click', () => {
      $('menAccountModal').classList.remove('active');
    });

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

  // ════════ 7) فتح المودالات ════════
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
    if (sb) {
      const { data } = await sb.auth.getUser();
      if (data?.user) fillAccountUI(data.user);
    }
  }

  function fillAccountUI(user) {
    const meta = user.user_metadata || {};
    $('menAccountAvatar').src   = avatarFor(user);
    $('menAccountName').textContent  = meta.name || meta.full_name || user.email?.split('@')[0] || 'مستخدم';
    $('menAccountEmail').textContent = user.email || '—';
    $('menAccountPhone').textContent = meta.phone || '—';
    $('menAccountCashback').textContent = Number(meta.cashback || 0).toFixed(2);
    $('menAccountOrders').textContent   = (meta.orders || []).length;
  }

  // ════════ 8) تسجيل الدخول / التسجيل ════════
  async function handleSubmit() {
    if (!sb) return showErr('خدمة المصادقة غير مفعّلة');

    const email    = $('menAuthEmail').value.trim();
    const password = $('menAuthPassword').value;
    const name     = $('menAuthName').value.trim();
    const phone    = $('menAuthPhone').value.trim();

    if (!email || !password) return showErr('الرجاء إدخال البريد وكلمة المرور');
    if (authMode === 'signup' && password.length < 6) return showErr('كلمة المرور 6 أحرف على الأقل');

    const btn = $('menAuthSubmit');
    btn.disabled = true;

    try {
      if (authMode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('✅ تسجيل دخول ناجح:', data.user?.email);
      } else {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, phone, cashback: 0, orders: [] } }
        });
        if (error) throw error;
        if (!data.session) {
          showErr('تم إنشاء الحساب! تحقق من بريدك لتأكيد التسجيل.');
          btn.disabled = false;
          return;
        }
        console.log('✅ تم إنشاء الحساب:', data.user?.email);
      }

      $('menAuthModal').classList.remove('active');
      if (typeof window.showToast === 'function')
        window.showToast(authMode === 'login' ? 'مرحباً بك! 👋' : 'تم إنشاء حسابك بنجاح 🎉', 'success');

    } catch (err) {
      console.error('[MEN_AUTH] Error:', err);
      const msg = (err.message || '').toLowerCase();
      if (msg.includes('invalid login'))          showErr('البريد أو كلمة المرور غير صحيحة');
      else if (msg.includes('already registered')) showErr('البريد مسجل بالفعل، جرّب تسجيل الدخول');
      else if (msg.includes('password'))           showErr('كلمة المرور ضعيفة');
      else                                          showErr(err.message || 'حدث خطأ، حاول مجدداً');
    } finally {
      btn.disabled = false;
    }
  }

  function showErr(msg) {
    const el = $('menAuthError');
    if (el) el.textContent = msg;
  }

  // ════════ 9) تسجيل الخروج ════════
  async function logout() {
    if (!sb) return;
    await sb.auth.signOut();
    $('menAccountModal').classList.remove('active');
    if (typeof window.showToast === 'function')
      window.showToast('تم تسجيل الخروج', 'info');
  }

  // ════════ 10) الواجهة العامة ════════
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

  // ════════ 11) الاسترجاع عند التحميل ════════
  async function bootstrap() {
    injectModals();
    if (!sb) { syncUI(null); return; }

    const { data: { session }, error } = await sb.auth.getSession();
    if (error) console.warn('[MEN_AUTH] getSession:', error.message);
    syncUI(session?.user || null);
    console.log(session ? '🔐 الجلسة محفوظة: ' + session.user.email : '🔓 لا جلسة محفوظة');

    sb.auth.onAuthStateChange((event, session) => {
      console.log('[MEN_AUTH] event:', event);
      syncUI(session?.user || null);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
