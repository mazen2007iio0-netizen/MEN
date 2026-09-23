// ===========================================================
//  js/auth.js
//  ─────────────────────────────────────────────────────────
//  الملف المركزي الموحد لنظام المصادقة في MEN
//  ─────────────────────────────────────────────────────────
//  يعمل على: index.html + store/index.html + ai/index.html
//            وأي صفحة مستقبلية داخل نطاق MEN
//
//  يتولى:
//   • تحميل مكتبة Supabase من CDN
//   • جلب الإعدادات من /api/config (Vercel Env Vars)
//   • إنشاء عميل Supabase الموحد
//   • حقن CSS و HTML تلقائياً (لا تحتاج تعديل الصفحة)
//   • إدارة تسجيل الدخول/إنشاء الحساب/الخروج/الاستعادة
//   • مراقبة الجلسة الموحدة عبر كل الصفحات
// ============================================================

(function () {
  'use strict';

  // ════════════════════════════════════════════════════════
  //  الإعدادات العامة
  // ════════════════════════════════════════════════════════
  const CONFIG_ENDPOINT = '/api/config';
  const SUPABASE_CDN    = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
  const STORAGE_KEY     = 'men-auth-session';

  // ════════════════════════════════════════════════════════
  //  الحالة
  // ════════════════════════════════════════════════════════
  let supabase = null;
  let currentUser = null;
  let currentSession = null;
  let authMode = 'login';
  let initialized = false;

  // ════════════════════════════════════════════════════════
  //  ترجمة رسائل الأخطاء
  // ════════════════════════════════════════════════════════
  const ERROR_MAP = {
    'Invalid login credentials': 'البريد الإلكتروني أو كلمة المرور غير صحيحة',
    'Email not confirmed': 'يرجى تأكيد بريدك الإلكتروني أولاً',
    'User already registered': 'هذا البريد مستخدم بالفعل',
    'User already exists': 'هذا البريد مستخدم بالفعل',
    'Password should be at least': 'كلمة المرور قصيرة جداً',
    'Unable to validate email address': 'البريد الإلكتروني غير صحيح',
    'Signup requires a valid password': 'كلمة المرور غير صالحة',
    'Email rate limit exceeded': 'تم تجاوز الحد، حاول لاحقاً',
    'For security purposes': 'لأسباب أمنية، حاول بعد قليل',
    'New password should be different': 'كلمة المرور الجديدة يجب أن تختلف عن القديمة',
    'Auth session missing': 'انتهت الجلسة، سجّل الدخول من جديد',
    'Token has expired': 'الرابط منتهي الصلاحية',
    'Email link is invalid': 'رابط البريد غير صالح',
    'Password is too weak': 'كلمة المرور ضعيفة جداً',
    'Failed to fetch': 'خطأ في الاتصال، تحقق من الإنترنت',
    'User not found': 'الحساب غير موجود'
  };

  function toArabicError(err) {
    if (!err) return 'حدث خطأ غير متوقع';
    const msg = err.message || String(err);
    for (const [en, ar] of Object.entries(ERROR_MAP)) {
      if (msg.toLowerCase().includes(en.toLowerCase())) return ar;
    }
    if (msg.includes('at least 6')) return 'كلمة المرور يجب أن تكون 6 أحرف على الأقل';
    if (msg.includes('at least 8')) return 'كلمة المرور يجب أن تكون 8 أحرف على الأقل';
    return 'حدث خطأ: ' + msg;
  }

  // ════════════════════════════════════════════════════════
  //  حقن CSS
  // ════════════════════════════════════════════════════════
  function injectStyles() {
    if (document.getElementById('menAuthStyles')) return;
    const style = document.createElement('style');
    style.id = 'menAuthStyles';
    style.textContent = `
      .men-modal-overlay{position:fixed;inset:0;background:rgba(2,4,12,.88);backdrop-filter:blur(24px);-webkit-backdrop-filter:blur(24px);z-index:10000;display:none;align-items:center;justify-content:center;padding:20px;animation:menModalFade .35s ease}
      .men-modal-overlay.active{display:flex}
      @keyframes menModalFade{from{opacity:0}to{opacity:1}}
      .men-auth-box,.men-account-box{background:linear-gradient(145deg,rgba(14,20,38,.98),rgba(8,12,24,.99));border:1px solid rgba(74,122,255,.18);border-radius:32px;width:100%;max-width:440px;padding:38px 34px 32px;position:relative;box-shadow:0 40px 100px rgba(0,0,0,.7),inset 0 1px 0 rgba(74,122,255,.1),0 0 80px rgba(74,122,255,.05);animation:menModalSlide .45s cubic-bezier(.16,1,.3,1);max-height:92vh;overflow-y:auto;direction:rtl;font-family:'Cairo','Outfit',sans-serif}
      .men-auth-box::-webkit-scrollbar,.men-account-box::-webkit-scrollbar{width:4px}
      .men-auth-box::-webkit-scrollbar-thumb,.men-account-box::-webkit-scrollbar-thumb{background:#021ca4;border-radius:12px}
      @keyframes menModalSlide{from{opacity:0;transform:scale(.94) translateY(24px)}to{opacity:1;transform:scale(1) translateY(0)}}
      .men-modal-close{position:absolute;top:18px;left:20px;width:38px;height:38px;border-radius:50%;background:rgba(74,122,255,.08);border:1px solid rgba(74,122,255,.15);color:#8a92b0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:.95rem;transition:all .3s cubic-bezier(.16,1,.3,1);z-index:5}
      .men-modal-close:hover{background:rgba(217,4,41,.15);color:#ff6b6b;transform:rotate(90deg)}
      .men-auth-header{text-align:center;margin-bottom:24px}
      .men-auth-header h3{font-size:1.55rem;font-weight:800;color:#fff;display:flex;align-items:center;justify-content:center;gap:12px;margin-bottom:6px;letter-spacing:-.3px}
      .men-auth-header h3 i{color:#4a7aff;font-size:1.35rem;filter:drop-shadow(0 0 20px rgba(74,122,255,.5))}
      .men-auth-header p{color:#8a92b0;font-size:.9rem}
      .men-auth-field{margin-bottom:18px}
      .men-auth-field label{display:flex;align-items:center;gap:8px;color:#b0b8d0;font-size:.86rem;font-weight:600;margin-bottom:8px}
      .men-auth-field label i{color:#4a7aff;font-size:.85rem;opacity:.85}
      .men-auth-field input{width:100%;padding:13px 18px;background:rgba(0,0,0,.3);border:1.5px solid rgba(74,122,255,.12);border-radius:16px;color:#f0f4ff;font-size:.95rem;font-family:'Cairo',sans-serif;outline:none;transition:all .3s;direction:rtl}
      .men-auth-field input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.1);background:rgba(0,0,0,.4)}
      .men-auth-field input::placeholder{color:#5a607a}
      .men-password-wrapper{position:relative}
      .men-password-wrapper input{padding-left:48px}
      .men-toggle-pass{position:absolute;left:12px;top:50%;transform:translateY(-50%);background:transparent;border:none;color:#6a708a;cursor:pointer;font-size:1rem;padding:6px;transition:color .3s;display:flex;align-items:center;justify-content:center}
      .men-toggle-pass:hover{color:#4a7aff}
      .men-password-strength{margin-top:8px}
      .men-strength-bar{display:flex;gap:4px;margin-bottom:5px}
      .men-strength-bar span{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.1);transition:background .3s}
      .men-strength-text{font-size:.75rem;color:#6a708a;font-weight:600}
      .men-auth-submit{width:100%;padding:14px;background:linear-gradient(135deg,#021ca4,#1a3a9e);border:none;border-radius:16px;color:#fff;font-size:1rem;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .4s cubic-bezier(.16,1,.3,1);box-shadow:0 4px 30px rgba(2,28,164,.35);margin-top:6px}
      .men-auth-submit:hover:not(:disabled){transform:translateY(-3px);box-shadow:0 10px 45px rgba(74,122,255,.55)}
      .men-auth-submit:active:not(:disabled){transform:translateY(0) scale(.98)}
      .men-auth-submit:disabled{opacity:.6;cursor:not-allowed}
      .men-auth-links{text-align:center;margin-top:16px}
      .men-auth-links a{color:#4a7aff;font-size:.85rem;text-decoration:none;display:inline-flex;align-items:center;gap:6px;transition:color .3s;cursor:pointer}
      .men-auth-links a:hover{color:#6a9aff;text-decoration:underline}
      .men-auth-switch{text-align:center;margin-top:20px;color:#8a92b0;font-size:.88rem}
      .men-auth-switch a{color:#4a7aff;font-weight:700;text-decoration:none;cursor:pointer}
      .men-auth-switch a:hover{text-decoration:underline}
      .men-auth-message{padding:12px 18px;border-radius:14px;font-size:.88rem;font-weight:600;margin-bottom:16px;text-align:center;display:none;animation:menMsgSlide .3s ease;line-height:1.6}
      @keyframes menMsgSlide{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      .men-auth-message.error{background:rgba(217,4,41,.12);border:1px solid rgba(217,4,41,.3);color:#ff8a8a}
      .men-auth-message.success{background:rgba(76,175,80,.12);border:1px solid rgba(76,175,80,.3);color:#6ee07a}
      .men-auth-message.info{background:rgba(74,122,255,.12);border:1px solid rgba(74,122,255,.3);color:#6a9aff}
      #menAuthLoader{position:fixed;inset:0;background:rgba(2,4,12,.7);backdrop-filter:blur(8px);z-index:10001;display:none;align-items:center;justify-content:center}
      #menAuthLoader.active{display:flex}
      .men-loader-spinner{width:48px;height:48px;border:3px solid rgba(74,122,255,.15);border-top-color:#4a7aff;border-radius:50%;animation:menSpin .8s linear infinite}
      @keyframes menSpin{to{transform:rotate(360deg)}}
      .men-account-header{text-align:center;margin-bottom:22px}
      .men-account-avatar{width:80px;height:80px;border-radius:50%;background:linear-gradient(135deg,#021ca4,#4a7aff);display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#fff;margin:0 auto 14px;box-shadow:0 0 40px rgba(74,122,255,.35)}
      .men-account-header h3{font-size:1.35rem;font-weight:800;color:#fff;margin-bottom:4px}
      .men-account-header p{color:#8a92b0;font-size:.88rem;direction:ltr;word-break:break-all}
      .men-account-details{background:rgba(0,0,0,.2);border-radius:18px;padding:8px 20px;margin-bottom:20px;border:1px solid rgba(74,122,255,.08)}
      .men-account-row{display:flex;justify-content:space-between;align-items:center;gap:12px;padding:12px 0;border-bottom:1px solid rgba(74,122,255,.06);font-size:.88rem}
      .men-account-row:last-child{border-bottom:none}
      .men-account-row span{color:#8a92b0;display:flex;align-items:center;gap:8px;white-space:nowrap}
      .men-account-row span i{color:#4a7aff;width:16px;font-size:.85rem}
      .men-account-row strong{color:#fff;font-weight:700;text-align:left;word-break:break-all}
      .men-status-active{color:#4caf50!important;display:flex;align-items:center;gap:8px}
      .men-status-active::before{content:'';width:8px;height:8px;border-radius:50%;background:#4caf50;box-shadow:0 0 12px rgba(76,175,80,.8);animation:menPulse 2s ease-in-out infinite}
      @keyframes menPulse{0%,100%{opacity:.6;transform:scale(.9)}50%{opacity:1;transform:scale(1.15)}}
      .men-logout-btn{width:100%;padding:13px;background:rgba(217,4,41,.08);border:1px solid rgba(217,4,41,.2);border-radius:16px;color:#ff6b6b;font-size:.95rem;font-weight:700;font-family:'Cairo',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .3s}
      .men-logout-btn:hover{background:rgba(217,4,41,.2);transform:translateY(-2px);box-shadow:0 8px 30px rgba(217,4,41,.15)}
      .men-header-auth-btn{display:inline-flex;align-items:center;gap:8px;padding:10px 24px;border-radius:60px;font-weight:700;font-size:.9rem;font-family:'Cairo',sans-serif;cursor:pointer;transition:all .4s cubic-bezier(.16,1,.3,1);border:none;white-space:nowrap;text-decoration:none;line-height:1}
      .men-header-auth-btn.login{background:linear-gradient(135deg,#021ca4,#1a3a9e);color:#fff;box-shadow:0 4px 20px rgba(2,28,164,.35)}
      .men-header-auth-btn.login:hover{transform:translateY(-3px);box-shadow:0 8px 36px rgba(74,122,255,.55)}
      .men-header-auth-btn.account{background:rgba(74,122,255,.08);border:1.5px solid rgba(74,122,255,.3);color:#4a7aff;display:none}
      .men-header-auth-btn.account:hover{background:rgba(74,122,255,.16);transform:translateY(-3px);box-shadow:0 8px 30px rgba(74,122,255,.15)}
      .men-header-avatar{width:34px;height:34px;border-radius:50%;object-fit:cover;display:none;border:2px solid #4a7aff;cursor:pointer;transition:all .3s;margin-left:4px}
      .men-header-avatar:hover{transform:scale(1.08);box-shadow:0 0 20px rgba(74,122,255,.5)}
      .men-toast{position:fixed;top:24px;left:50%;transform:translateX(-50%);background:rgba(10,16,32,.95);backdrop-filter:blur(20px);border:1px solid rgba(74,122,255,.2);border-radius:60px;padding:13px 26px;color:#f0f4ff;z-index:10002;display:flex;align-items:center;gap:10px;font-weight:700;box-shadow:0 12px 44px rgba(0,0,0,.5);animation:menToast .5s cubic-bezier(.16,1,.3,1);font-size:.9rem;direction:rtl;max-width:92vw;font-family:'Cairo',sans-serif}
      .men-toast i{color:#4a7aff;font-size:1.1rem}
      .men-toast.error{border-color:rgba(217,4,41,.3)}
      .men-toast.error i{color:#ff6b6b}
      .men-toast.success{border-color:rgba(76,175,80,.3)}
      .men-toast.success i{color:#4caf50}
      @keyframes menToast{from{opacity:0;transform:translateX(-50%) translateY(-20px) scale(.95)}to{opacity:1;transform:translateX(-50%) translateY(0) scale(1)}}
      @media (max-width:768px){
        .men-auth-box,.men-account-box{padding:30px 24px 26px;border-radius:24px;max-width:100%;margin:10px}
        .men-auth-header h3{font-size:1.25rem}
        .men-header-auth-btn{padding:8px 16px;font-size:.8rem;gap:6px}
        .men-header-avatar{width:30px;height:30px}
      }
      @media (max-width:480px){
        .men-auth-box,.men-account-box{padding:26px 18px 22px;border-radius:20px}
        .men-auth-header h3{font-size:1.1rem}
        .men-account-avatar{width:64px;height:64px;font-size:1.8rem}
        .men-account-header h3{font-size:1.15rem}
        .men-account-row{font-size:.8rem;padding:10px 0}
        .men-header-auth-btn{padding:7px 14px;font-size:.75rem}
      }
    `;
    document.head.appendChild(style);
  }

  // ════════════════════════════════════════════════════════
  //  حقن HTML للنوافذ
  // ════════════════════════════════════════════════════════
  function injectModals() {
    if (document.getElementById('menAuthModal')) return;

    const authModal = document.createElement('div');
    authModal.id = 'menAuthModal';
    authModal.className = 'men-modal-overlay';
    authModal.innerHTML = `
      <div class="men-auth-box">
        <button class="men-modal-close" id="menAuthClose" aria-label="إغلاق">
          <i class="fas fa-times"></i>
        </button>
        <div id="menAuthFormContainer"></div>
      </div>
    `;
    document.body.appendChild(authModal);

    const loader = document.createElement('div');
    loader.id = 'menAuthLoader';
    loader.innerHTML = '<div class="men-loader-spinner"></div>';
    document.body.appendChild(loader);

    authModal.addEventListener('click', e => {
      if (e.target === authModal) closeAuth();
    });
    document.getElementById('menAuthClose').addEventListener('click', closeAuth);

    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') {
        closeAuth();
        closeAccount();
      }
    });
  }

  // ════════════════════════════════════════════════════════
  //  أدوات UI
  // ════════════════════════════════════════════════════════
  function setLoading(on) {
    const loader = document.getElementById('menAuthLoader');
    if (loader) loader.classList.toggle('active', !!on);

    document.querySelectorAll('.men-auth-submit').forEach(b => {
      b.disabled = !!on;
      if (on) {
        b.dataset.originalText = b.innerHTML;
        b.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i> جاري المعالجة...';
      } else if (b.dataset.originalText) {
        b.innerHTML = b.dataset.originalText;
        delete b.dataset.originalText;
      }
    });
  }

  function showMsg(msg, type) {
    const el = document.getElementById('menAuthMessage');
    if (!el) return;
    el.textContent = msg;
    el.className = 'men-auth-message ' + (type || 'info');
    el.style.display = 'block';
    if (type === 'success') {
      clearTimeout(el._timeout);
      el._timeout = setTimeout(() => { el.style.display = 'none'; }, 4000);
    }
  }

  function clearMsg() {
    const el = document.getElementById('menAuthMessage');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
  }

  function lockScroll(on) {
    document.body.style.overflow = on ? 'hidden' : '';
  }

  function toast(msg, type) {
    const old = document.querySelector('.men-toast');
    if (old) old.remove();
    const t = document.createElement('div');
    t.className = 'men-toast ' + (type || '');
    const icon = type === 'success' ? 'fa-circle-check'
              : type === 'error' ? 'fa-circle-xmark'
              : 'fa-circle-info';
    t.innerHTML = `<i class="fas ${icon}"></i> <span>${msg}</span>`;
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 4000);
  }

  // ════════════════════════════════════════════════════════
  //  تحديث الهيدر
  // ════════════════════════════════════════════════════════
  function updateHeader(user) {
    const loginBtn = document.getElementById('menLoginBtn');
    const accountBtn = document.getElementById('menAccountBtn');
    const avatar = document.getElementById('menHeaderAvatar');

    if (loginBtn) loginBtn.style.display = user ? 'none' : 'inline-flex';
    if (accountBtn) accountBtn.style.display = user ? 'inline-flex' : 'none';

    if (avatar) {
      const url = user?.user_metadata?.avatar_url;
      if (user && url) {
        avatar.src = url;
        avatar.style.display = 'block';
      } else {
        avatar.style.display = 'none';
      }
    }

    if (user && document.getElementById('menAccountModal')?.classList.contains('active')) {
      fillAccount();
    }
  }

  // ════════════════════════════════════════════════════════
  //  فتح / إغلاق نوافذ المصادقة
  // ════════════════════════════════════════════════════════
  function openAuth(mode) {
    authMode = mode || 'login';
    const modal = document.getElementById('menAuthModal');
    if (!modal) return;
    renderForm();
    modal.classList.add('active');
    lockScroll(true);
    clearMsg();
    setTimeout(() => {
      const first = modal.querySelector('input');
      if (first) first.focus();
    }, 150);
  }

  function closeAuth() {
    const modal = document.getElementById('menAuthModal');
    if (modal) modal.classList.remove('active');
    lockScroll(false);
    clearMsg();
  }

  // ════════════════════════════════════════════════════════
  //  رسم النموذج
  // ════════════════════════════════════════════════════════
  function renderForm() {
    const box = document.getElementById('menAuthFormContainer');
    if (!box) return;

    if (authMode === 'login') {
      box.innerHTML = `
        <div class="men-auth-header">
          <h3><i class="fas fa-fingerprint"></i> تسجيل الدخول</h3>
          <p>مرحباً بك في MEN</p>
        </div>
        <div id="menAuthMessage" class="men-auth-message"></div>
        <div class="men-auth-field">
          <label><i class="fas fa-envelope"></i> البريد الإلكتروني</label>
          <input type="email" id="menLoginEmail" placeholder="example@email.com" autocomplete="email">
        </div>
        <div class="men-auth-field">
          <label><i class="fas fa-lock"></i> كلمة المرور</label>
          <div class="men-password-wrapper">
            <input type="password" id="menLoginPassword" placeholder="••••••••" autocomplete="current-password">
            <button type="button" class="men-toggle-pass" data-target="menLoginPassword"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <button type="button" class="men-auth-submit" id="menDoLogin"><i class="fas fa-arrow-left"></i> تسجيل الدخول</button>
        <div class="men-auth-links"><a id="menForgotPassword"><i class="fas fa-key"></i> نسيت كلمة المرور؟</a></div>
        <div class="men-auth-switch">ليس لديك حساب؟ <a id="menGoSignup">إنشاء حساب</a></div>
      `;
      bindLogin();
    } else if (authMode === 'signup') {
      box.innerHTML = `
        <div class="men-auth-header">
          <h3><i class="fas fa-user-plus"></i> إنشاء حساب</h3>
          <p>انضم إلى مجتمع MEN</p>
        </div>
        <div id="menAuthMessage" class="men-auth-message"></div>
        <div class="men-auth-field">
          <label><i class="fas fa-user"></i> الاسم الكامل</label>
          <input type="text" id="menSignupName" placeholder="اسمك الكامل" autocomplete="name">
        </div>
        <div class="men-auth-field">
          <label><i class="fas fa-envelope"></i> البريد الإلكتروني</label>
          <input type="email" id="menSignupEmail" placeholder="example@email.com" autocomplete="email">
        </div>
        <div class="men-auth-field">
          <label><i class="fas fa-lock"></i> كلمة المرور</label>
          <div class="men-password-wrapper">
            <input type="password" id="menSignupPassword" placeholder="••••••••" autocomplete="new-password">
            <button type="button" class="men-toggle-pass" data-target="menSignupPassword"><i class="fas fa-eye"></i></button>
          </div>
          <div class="men-password-strength" id="menPasswordStrength">
            <div class="men-strength-bar"><span></span><span></span><span></span><span></span></div>
            <span class="men-strength-text">قوة كلمة المرور</span>
          </div>
        </div>
        <div class="men-auth-field">
          <label><i class="fas fa-lock"></i> تأكيد كلمة المرور</label>
          <div class="men-password-wrapper">
            <input type="password" id="menSignupConfirm" placeholder="••••••••" autocomplete="new-password">
            <button type="button" class="men-toggle-pass" data-target="menSignupConfirm"><i class="fas fa-eye"></i></button>
          </div>
        </div>
        <button type="button" class="men-auth-submit" id="menDoSignup"><i class="fas fa-user-plus"></i> إنشاء الحساب</button>
        <div class="men-auth-switch">لديك حساب؟ <a id="menGoLogin">تسجيل الدخول</a></div>
      `;
      bindSignup();
    } else if (authMode === 'forgot') {
      box.innerHTML = `
        <div class="men-auth-header">
          <h3><i class="fas fa-key"></i> استعادة كلمة المرور</h3>
          <p>سنرسل رابط الإعادة إلى بريدك</p>
        </div>
        <div id="menAuthMessage" class="men-auth-message"></div>
        <div class="men-auth-field">
          <label><i class="fas fa-envelope"></i> البريد الإلكتروني</label>
          <input type="email" id="menResetEmail" placeholder="example@email.com" autocomplete="email">
        </div>
        <button type="button" class="men-auth-submit" id="menDoReset"><i class="fas fa-paper-plane"></i> إرسال رابط الإعادة</button>
        <div class="men-auth-switch"><a id="menBackToLogin"><i class="fas fa-arrow-right"></i> العودة لتسجيل الدخول</a></div>
      `;
      bindForgot();
    }
  }

  // ════════════════════════════════════════════════════════
  //  ربط الأحداث
  // ════════════════════════════════════════════════════════
  function bindToggles() {
    document.querySelectorAll('.men-toggle-pass').forEach(btn => {
      btn.addEventListener('click', function () {
        const input = document.getElementById(this.dataset.target);
        if (!input) return;
        const show = input.type === 'password';
        input.type = show ? 'text' : 'password';
        const icon = this.querySelector('i');
        if (icon) icon.className = show ? 'fas fa-eye-slash' : 'fas fa-eye';
      });
    });
  }

  function bindLogin() {
    bindToggles();
    document.getElementById('menDoLogin')?.addEventListener('click', doLogin);
    ['menLoginEmail', 'menLoginPassword'].forEach(id => {
      document.getElementById(id)?.addEventListener('keydown', e => {
        if (e.key === 'Enter') doLogin();
      });
    });
    document.getElementById('menForgotPassword')?.addEventListener('click', () => {
      authMode = 'forgot'; renderForm();
    });
    document.getElementById('menGoSignup')?.addEventListener('click', () => {
      authMode = 'signup'; renderForm();
    });
  }

  function bindSignup() {
    bindToggles();
    const passInput = document.getElementById('menSignupPassword');
    if (passInput) passInput.addEventListener('input', e => updateStrength(e.target.value));
    document.getElementById('menDoSignup')?.addEventListener('click', doSignup);
    document.getElementById('menGoLogin')?.addEventListener('click', () => {
      authMode = 'login'; renderForm();
    });
  }

  function bindForgot() {
    document.getElementById('menDoReset')?.addEventListener('click', doForgot);
    document.getElementById('menResetEmail')?.addEventListener('keydown', e => {
      if (e.key === 'Enter') doForgot();
    });
    document.getElementById('menBackToLogin')?.addEventListener('click', () => {
      authMode = 'login'; renderForm();
    });
  }

  // ════════════════════════════════════════════════════════
  //  قوة كلمة المرور
  // ════════════════════════════════════════════════════════
  function updateStrength(pass) {
    const bars = document.querySelectorAll('#menPasswordStrength .men-strength-bar span');
    const text = document.querySelector('#menPasswordStrength .men-strength-text');
    if (!bars.length || !text) return;

    let score = 0;
    if (pass.length >= 6) score++;
    if (pass.length >= 10) score++;
    if (/[A-Z]/.test(pass) && /[a-z]/.test(pass)) score++;
    if (/\d/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;

    const level = Math.min(4, Math.max(0, score));
    const labels = ['', 'ضعيفة', 'متوسطة', 'قوية', 'قوية جداً'];
    const colors = ['', '#ff4444', '#ffaa00', '#4caf50', '#00c853'];

    bars.forEach((b, i) => {
      b.style.background = i < level ? colors[level] : 'rgba(255,255,255,0.1)';
    });

    if (pass.length === 0) {
      text.textContent = 'قوة كلمة المرور';
      text.style.color = '#6a708a';
    } else {
      text.textContent = labels[level];
      text.style.color = colors[level];
    }
  }

  // ════════════════════════════════════════════════════════
  //  تنفيذ العمليات
  // ════════════════════════════════════════════════════════
  async function doLogin() {
    clearMsg();
    const email = document.getElementById('menLoginEmail')?.value.trim();
    const password = document.getElementById('menLoginPassword')?.value;
    if (!email) return showMsg('يرجى إدخال البريد الإلكتروني', 'error');
    if (!password) return showMsg('يرجى إدخال كلمة المرور', 'error');

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      showMsg('تم تسجيل الدخول بنجاح', 'success');
      setTimeout(() => { closeAuth(); updateHeader(data.user); }, 700);
    } catch (err) {
      showMsg(' ' + toArabicError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function doSignup() {
    clearMsg();
    const name = document.getElementById('menSignupName')?.value.trim();
    const email = document.getElementById('menSignupEmail')?.value.trim();
    const password = document.getElementById('menSignupPassword')?.value;
    const confirm = document.getElementById('menSignupConfirm')?.value;

    if (!name) return showMsg('يرجى إدخال الاسم', 'error');
    if (!email) return showMsg('يرجى إدخال البريد الإلكتروني', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMsg('البريد الإلكتروني غير صحيح', 'error');
    if (!password) return showMsg('يرجى إدخال كلمة المرور', 'error');
    if (password.length < 6) return showMsg('كلمة المرور يجب أن تكون 6 أحرف على الأقل', 'error');
    if (password !== confirm) return showMsg('كلمتا المرور غير متطابقتين', 'error');

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: name },
          emailRedirectTo: window.location.origin + window.location.pathname
        }
      });
      if (error) throw error;

      if (data.user && !data.session) {
        showMsg('تم إنشاء الحساب! تحقق من بريدك لتأكيد الحساب', 'success');
      } else {
        showMsg('تم إنشاء الحساب وتسجيل الدخول بنجاح', 'success');
        setTimeout(() => { closeAuth(); updateHeader(data.user); }, 1000);
      }
    } catch (err) {
      showMsg(' ' + toArabicError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  async function doForgot() {
    clearMsg();
    const email = document.getElementById('menResetEmail')?.value.trim();
    if (!email) return showMsg('يرجى إدخال البريد الإلكتروني', 'error');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return showMsg('البريد الإلكتروني غير صحيح', 'error');

    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + window.location.pathname + '?reset=1'
      });
      if (error) throw error;
      showMsg('تم إرسال رابط الإعادة إلى بريدك', 'success');
    } catch (err) {
      showMsg(' ' + toArabicError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  // ════════════════════════════════════════════════════════
  //  نافذة الحساب
  // ════════════════════════════════════════════════════════
  function openAccount() {
    if (!currentUser) return openAuth('login');
    let modal = document.getElementById('menAccountModal');
    if (!modal) { createAccountModal(); modal = document.getElementById('menAccountModal'); }
    fillAccount();
    modal.classList.add('active');
    lockScroll(true);
  }

  function closeAccount() {
    const m = document.getElementById('menAccountModal');
    if (m) m.classList.remove('active');
    lockScroll(false);
  }

  function createAccountModal() {
    const modal = document.createElement('div');
    modal.id = 'menAccountModal';
    modal.className = 'men-modal-overlay';
    modal.innerHTML = `
      <div class="men-account-box">
        <button class="men-modal-close" id="menAccountClose" aria-label="إغلاق"><i class="fas fa-times"></i></button>
        <div class="men-account-header">
          <div class="men-account-avatar"><i class="fas fa-user"></i></div>
          <h3 id="menAccountName">—</h3>
          <p id="menAccountEmail">—</p>
        </div>
        <div class="men-account-details">
          <div class="men-account-row">
            <span><i class="fas fa-calendar-check"></i> تاريخ إنشاء الحساب</span>
            <strong id="menAccountCreated">—</strong>
          </div>
          <div class="men-account-row">
            <span><i class="fas fa-shield-halved"></i> حالة الحساب</span>
            <strong class="men-status-active">نشط</strong>
          </div>
          <div class="men-account-row">
            <span><i class="fas fa-id-badge"></i> معرّف المستخدم</span>
            <strong id="menAccountId" style="font-size:.72rem;direction:ltr;">—</strong>
          </div>
        </div>
        <button class="men-logout-btn" id="menDoLogout"><i class="fas fa-sign-out-alt"></i> تسجيل الخروج</button>
      </div>
    `;
    document.body.appendChild(modal);

    modal.addEventListener('click', e => { if (e.target === modal) closeAccount(); });
    document.getElementById('menAccountClose')?.addEventListener('click', closeAccount);
    document.getElementById('menDoLogout')?.addEventListener('click', doLogout);
  }

  function fillAccount() {
    if (!currentUser) return;
    const name = currentUser.user_metadata?.full_name
      || currentUser.email?.split('@')[0] || 'مستخدم MEN';
    const email = currentUser.email || '—';
    const created = currentUser.created_at
      ? new Date(currentUser.created_at).toLocaleDateString('ar-SA', {
          year: 'numeric', month: 'long', day: 'numeric'
        })
      : '—';
    const id = currentUser.id ? currentUser.id.slice(0, 12) + '…' : '—';

    const n = document.getElementById('menAccountName');
    const e = document.getElementById('menAccountEmail');
    const c = document.getElementById('menAccountCreated');
    const i = document.getElementById('menAccountId');
    if (n) n.textContent = name;
    if (e) e.textContent = email;
    if (c) c.textContent = created;
    if (i) i.textContent = id;
  }

  // ════════════════════════════════════════════════════════
  //  تسجيل الخروج
  // ════════════════════════════════════════════════════════
  async function doLogout() {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      closeAccount();
      updateHeader(null);
      toast('تم تسجيل الخروج بنجاح', 'success');
    } catch (err) {
      toast('فشل تسجيل الخروج: ' + toArabicError(err), 'error');
    } finally {
      setLoading(false);
    }
  }

  // ════════════════════════════════════════════════════════
  //  استعادة كلمة المرور عبر الرابط
  // ════════════════════════════════════════════════════════
  function handlePasswordRecovery() {
    const newPass = prompt('أدخل كلمة المرور الجديدة (6 أحرف على الأقل):');
    if (newPass === null) return;
    if (newPass.length < 6) return alert('كلمة المرور يجب أن تكون 6 أحرف على الأقل');
    const confirmPass = prompt('تأكيد كلمة المرور الجديدة:');
    if (confirmPass === null) return;
    if (newPass !== confirmPass) return alert('كلمتا المرور غير متطابقتين');

    setLoading(true);
    supabase.auth.updateUser({ password: newPass }).then(({ error }) => {
      setLoading(false);
      if (error) return alert('خطأ: ' + toArabicError(error));
      alert('تم تحديث كلمة المرور بنجاح');
      if (window.history.replaceState) {
        window.history.replaceState(null, '', window.location.pathname);
      }
    });
  }

  // ════════════════════════════════════════════════════════
  //  تحميل مكتبة Supabase من CDN
  // ════════════════════════════════════════════════════════
  function loadSupabaseLib() {
    return new Promise((resolve, reject) => {
      if (window.supabase && typeof window.supabase.createClient === 'function') {
        return resolve(window.supabase);
      }
      const existing = document.querySelector('script[data-supabase-lib]');
      if (existing) {
        existing.addEventListener('load', () => resolve(window.supabase));
        existing.addEventListener('error', () => reject(new Error('فشل تحميل مكتبة Supabase')));
        return;
      }
      const script = document.createElement('script');
      script.src = SUPABASE_CDN;
      script.async = true;
      script.dataset.supabaseLib = '1';
      script.onload = () => {
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          resolve(window.supabase);
        } else {
          reject(new Error('مكتبة Supabase لم تُحمّل بشكل صحيح'));
        }
      };
      script.onerror = () => reject(new Error('فشل تحميل مكتبة Supabase من CDN'));
      document.head.appendChild(script);
    });
  }

  // ════════════════════════════════════════════════════════
  //  جلب الإعدادات من /api/config (Vercel Env Vars)
  // ════════════════════════════════════════════════════════
  async function fetchConfig() {
    const res = await fetch(CONFIG_ENDPOINT, {
      method: 'GET',
      cache: 'no-store',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.message || 'فشل جلب إعدادات Supabase من /api/config');
    }
    const data = await res.json();
    if (!data.url || !data.key) {
      throw new Error('إعدادات Supabase غير مكتملة من الخادم');
    }
    return data;
  }

  // ════════════════════════════════════════════════════════
  //  ربط أزرار الهيدر
  // ════════════════════════════════════════════════════════
  function bindHeaderButtons() {
    const loginBtn = document.getElementById('menLoginBtn');
    const accountBtn = document.getElementById('menAccountBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => openAuth('login'));
    if (accountBtn) accountBtn.addEventListener('click', () => openAccount());
  }

  // ════════════════════════════════════════════════════════
  //  فحص الجلسة الحالية
  // ════════════════════════════════════════════════════════
  async function checkSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) console.warn('[MEN Auth] getSession:', error);
      currentSession = session;
      currentUser = session?.user || null;
      updateHeader(currentUser);
    } catch (e) {
      console.warn('[MEN Auth] فشل جلب الجلسة:', e);
      updateHeader(null);
    }
  }

  // ════════════════════════════════════════════════════════
  //  مراقبة حالة المصادقة (الجلسة الموحدة)
  // ════════════════════════════════════════════════════════
  function watchAuthState() {
    supabase.auth.onAuthStateChange((event, session) => {
      console.log('[MEN Auth] حالة:', event);
      currentSession = session;
      currentUser = session?.user || null;
      updateHeader(currentUser);

      if (event === 'SIGNED_IN') console.log('[MEN Auth]  signed in:', currentUser?.email);
      if (event === 'SIGNED_OUT') console.log('[MEN Auth]  signed out');
      if (event === 'PASSWORD_RECOVERY') handlePasswordRecovery();
    });
  }

  // ════════════════════════════════════════════════════════
  //  التهيئة الرئيسية
  // ════════════════════════════════════════════════════════
  async function init() {
    if (initialized) return;
    initialized = true;

    injectStyles();
    injectModals();

    try {
      const [_, config] = await Promise.all([loadSupabaseLib(), fetchConfig()]);

      supabase = window.supabase.createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: window.localStorage,
          storageKey: STORAGE_KEY,
          flowType: 'pkce'
        }
      });

      // اكسبورت عالمي
      window.MEN_SUPABASE = supabase;
      window.MEN_AUTH = {
        open: openAuth,
        close: closeAuth,
        openAccount,
        closeAccount,
        logout: doLogout,
        getUser: () => currentUser,
        getSession: () => currentSession,
        supabase
      };

      await checkSession();
      watchAuthState();
      bindHeaderButtons();

      console.log('[MEN Auth] النظام جاهز — جلسة موحدة عبر MEN');
    } catch (err) {
      console.error('[MEN Auth] فشل التهيئة:', err);
      setTimeout(() => {
        toast('فشل تهيئة الحساب', 'error');
      }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
