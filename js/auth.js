/* ============================================================
   ✨ MEN Store — Auth v5 (Clean & Organized)
   ============================================================ */
(function () {
  'use strict';

  // ════════ 🔑 المفاتيح ════════
  const SUPABASE_URL      = 'https://xoqwzluyxynqpdpmidts.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXd6bHV5eHlucXBkcG1pZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTI2NDAsImV4cCI6MjEwNTY4ODY0MH0.xIpvxJyAMAoLqkSR9RJk2ZcgN7rsfOg2OfbelraMWvs';

  const credsReady = SUPABASE_URL.startsWith('https://')
                  && SUPABASE_URL.includes('.supabase.co')
                  && SUPABASE_ANON_KEY.startsWith('eyJ')
                  && SUPABASE_ANON_KEY.length > 100;

  if (!credsReady) {
    console.error('%c⛔ ضع مفاتيح Supabase في js/auth.js', 'background:#d90429;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold');
    window.MEN_AUTH = { CASHBACK_RATE: 0.02, open: () => alert('⚠️ أضف مفاتيح Supabase'), openAccount: () => alert('⚠️ أضف مفاتيح Supabase'), logout: () => {}, getCurrentUser: () => null, addCashback: async () => {}, deductCashback: async () => {}, addOrder: async () => {} };
    return;
  }

  if (!window.supabase?.createClient) { console.error('[MEN_AUTH] SDK غير محمّل'); return; }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'men-auth-token', storage: window.localStorage, flowType: 'pkce' }
  });
  window.MEN_SUPABASE = sb;

  console.log('%c✨ MEN AUTH v5', 'background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;letter-spacing:1px');

  const CASHBACK_RATE = 0.02;
  let currentUser = null;
  let authMode = 'login';
  let rememberMe = true;
  const $ = id => document.getElementById(id);

  // ═══════════════════════════════════════════════════════════
  // 🎨 CSS
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if ($('menAuthStyles')) return;
    const s = document.createElement('style');
    s.id = 'menAuthStyles';
    s.textContent = `
      /* ═══════════════ MODAL SHELL ═══════════════ */
      .men-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;font-family:'Cairo','Outfit',sans-serif;overflow-y:auto}
      .men-modal.active{display:flex}
      .men-backdrop{position:absolute;inset:0;background:rgba(2,4,12,.9);backdrop-filter:blur(26px) saturate(180%);-webkit-backdrop-filter:blur(26px) saturate(180%);animation:menFade .35s ease}
      @keyframes menFade{from{opacity:0}to{opacity:1}}
      .men-modal::before,.men-modal::after{content:'';position:absolute;border-radius:50%;filter:blur(90px);pointer-events:none;z-index:1}
      .men-modal::before{width:420px;height:420px;background:radial-gradient(circle,rgba(74,122,255,.55),transparent 70%);top:-120px;left:-120px;animation:menOrb1 14s ease-in-out infinite}
      .men-modal::after{width:380px;height:380px;background:radial-gradient(circle,rgba(245,179,66,.35),transparent 70%);bottom:-120px;right:-120px;animation:menOrb2 16s ease-in-out infinite}
      @keyframes menOrb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(80px,60px) scale(1.2)}}
      @keyframes menOrb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-60px,-40px) scale(1.15)}}

      /* ═══════════════ CARD ═══════════════ */
      .men-card{position:relative;z-index:5;width:100%;max-width:440px;background:linear-gradient(160deg,rgba(16,22,42,.98),rgba(8,12,24,1));border:1px solid rgba(74,122,255,.16);border-radius:28px;padding:0;box-shadow:0 40px 120px rgba(0,0,0,.85),0 0 80px rgba(74,122,255,.12);animation:menCardIn .5s cubic-bezier(.16,1,.3,1);overflow:hidden;margin:auto}
      .men-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#4a7aff,#f5b342,#4a7aff,transparent);background-size:200% 100%;animation:menShimmer 3.5s linear infinite}
      @keyframes menShimmer{to{background-position:-200% 0}}
      @keyframes menCardIn{from{opacity:0;transform:translateY(30px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
      .men-card.men-shake{animation:menShake .5s cubic-bezier(.36,.07,.19,.97)}
      @keyframes menShake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}

      /* ═══════════════ HEADER SECTION ═══════════════ */
      .men-head{position:relative;padding:34px 34px 22px;text-align:center;background:linear-gradient(180deg,rgba(74,122,255,.08),transparent);border-bottom:1px solid rgba(74,122,255,.08)}
      .men-close{position:absolute;top:18px;left:20px;width:36px;height:36px;border-radius:50%;background:rgba(74,122,255,.08);border:1px solid rgba(74,122,255,.15);color:#8a92b0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:13px;transition:all .3s cubic-bezier(.16,1,.3,1);z-index:10}
      .men-close:hover{background:rgba(217,4,41,.15);border-color:rgba(217,4,41,.3);color:#ff6b6b;transform:rotate(180deg) scale(1.08)}
      .men-brand{display:inline-flex;align-items:center;justify-content:center;gap:12px;margin-bottom:16px}
      .men-brand-icon{width:52px;height:52px;border-radius:16px;background:linear-gradient(135deg,#021ca4,#4a7aff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:22px;box-shadow:0 12px 32px -8px rgba(74,122,255,.8),inset 0 1px 0 rgba(255,255,255,.2)}
      .men-brand-text{text-align:right}
      .men-brand-text .main{font-size:1.15rem;font-weight:900;color:#fff;letter-spacing:-.3px;line-height:1.1}
      .men-brand-text .sub{font-size:.68rem;color:#6a7290;letter-spacing:2px;text-transform:uppercase;font-weight:700}
      .men-head-title{font-size:1.4rem;font-weight:900;color:#fff;margin-bottom:6px;letter-spacing:-.5px;line-height:1.3}
      .men-head-sub{color:#8a92b0;font-size:.85rem;font-weight:600;line-height:1.6}

      /* ═══════════════ TABS (Segmented) ═══════════════ */
      .men-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:4px;background:rgba(0,0,0,.28);border:1px solid rgba(74,122,255,.1);border-radius:16px;padding:4px;margin:20px 24px 4px}
      .men-tab{position:relative;padding:12px 16px;border-radius:12px;background:transparent;border:none;color:#8a92b0;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;transition:all .3s cubic-bezier(.16,1,.3,1);z-index:2;display:flex;align-items:center;justify-content:center;gap:8px}
      .men-tab:hover:not(.active){color:#c3cbe4}
      .men-tab.active{color:#fff}
      .men-tabs-indicator{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);background:linear-gradient(135deg,#021ca4,#4a7aff);border-radius:12px;box-shadow:0 6px 18px -4px rgba(74,122,255,.7),inset 0 1px 0 rgba(255,255,255,.2);transition:transform .4s cubic-bezier(.34,1.4,.64,1);z-index:1}
      .men-tabs[data-mode="signup"] .men-tabs-indicator{transform:translateX(calc(-100% - 4px))}

      /* ═══════════════ FORM ═══════════════ */
      .men-body{padding:24px 30px 30px}
      .men-form{display:flex;flex-direction:column;gap:14px}
      .men-row2{display:grid;grid-template-columns:1fr 1fr;gap:12px}

      .men-field{position:relative}
      .men-field .men-label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px;padding-right:4px}
      .men-input-wrap{position:relative;display:flex;align-items:center}
      .men-input-wrap input{width:100%;height:52px;padding:0 46px 0 16px;background:rgba(0,0,0,.32);border:1.5px solid rgba(74,122,255,.1);border-radius:14px;color:#fff;font-size:.92rem;outline:none;font-family:'Cairo',sans-serif;font-weight:600;transition:all .3s cubic-bezier(.16,1,.3,1)}
      .men-input-wrap input::placeholder{color:#4a5070;font-weight:500}
      .men-input-wrap input:hover{border-color:rgba(74,122,255,.2)}
      .men-input-wrap input:focus{border-color:#4a7aff;background:rgba(74,122,255,.06);box-shadow:0 0 0 4px rgba(74,122,255,.12)}
      .men-input-wrap .men-icon{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#4a7aff;font-size:.95rem;pointer-events:none;transition:all .3s}
      .men-input-wrap input:focus ~ .men-icon{color:#6a9aff;transform:translateY(-50%) scale(1.1)}
      .men-input-wrap .men-eye{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#5a607a;font-size:.9rem;cursor:pointer;padding:8px;border-radius:50%;background:transparent;border:none;transition:all .3s}
      .men-input-wrap .men-eye:hover{color:#4a7aff;background:rgba(74,122,255,.1)}

      /* ═══════════════ STRENGTH ═══════════════ */
      .men-strength{height:0;overflow:hidden;transition:all .35s cubic-bezier(.16,1,.3,1);margin-top:0;padding-right:4px}
      .men-strength.show{height:28px;margin-top:4px}
      .men-strength-row{display:flex;align-items:center;gap:10px}
      .men-strength-bars{flex:1;display:flex;gap:4px}
      .men-strength-bar{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
      .men-strength-bar::after{content:'';position:absolute;inset:0;border-radius:4px;transform:scaleX(0);transform-origin:right;transition:transform .45s cubic-bezier(.16,1,.3,1)}
      .men-strength.s1 .men-strength-bar:nth-child(1)::after{transform:scaleX(1);background:linear-gradient(90deg,#d90429,#ff4d4d)}
      .men-strength.s2 .men-strength-bar:nth-child(-n+2)::after{transform:scaleX(1);background:linear-gradient(90deg,#f5b342,#ffb700)}
      .men-strength.s3 .men-strength-bar:nth-child(-n+3)::after{transform:scaleX(1);background:linear-gradient(90deg,#4a7aff,#6a9aff)}
      .men-strength.s4 .men-strength-bar::after{transform:scaleX(1);background:linear-gradient(90deg,#4caf50,#66bb6a)}
      .men-strength-label{font-size:.7rem;font-weight:800;white-space:nowrap;min-width:56px;text-align:left;letter-spacing:.3px}
      .men-strength.s1 .men-strength-label{color:#ff4d4d}
      .men-strength.s2 .men-strength-label{color:#ffb700}
      .men-strength.s3 .men-strength-label{color:#6a9aff}
      .men-strength.s4 .men-strength-label{color:#4caf50}

      /* ═══════════════ OPTIONS ═══════════════ */
      .men-opts{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:2px;font-size:.82rem;flex-wrap:wrap}
      .men-remember{display:inline-flex;align-items:center;gap:9px;color:#8a92b0;font-weight:600;cursor:pointer;user-select:none;transition:color .3s}
      .men-remember:hover{color:#c3cbe4}
      .men-remember input{display:none}
      .men-check{width:18px;height:18px;border-radius:6px;border:1.5px solid rgba(74,122,255,.3);background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:all .3s;position:relative;flex-shrink:0}
      .men-remember input:checked ~ .men-check{background:linear-gradient(135deg,#021ca4,#4a7aff);border-color:transparent;box-shadow:0 0 0 3px rgba(74,122,255,.15)}
      .men-check::after{content:'\\f00c';font-family:'Font Awesome 6 Free';font-weight:900;font-size:.58rem;color:#fff;opacity:0;transform:scale(0);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
      .men-remember input:checked ~ .men-check::after{opacity:1;transform:scale(1)}
      .men-forgot{color:#6a9aff;font-weight:700;cursor:pointer;text-decoration:none;font-size:.82rem;transition:all .3s;white-space:nowrap}
      .men-forgot:hover{color:#4a7aff;text-shadow:0 0 16px rgba(74,122,255,.6)}

      /* ═══════════════ ERROR ═══════════════ */
      .men-error{max-height:0;overflow:hidden;background:rgba(217,4,41,.08);border:1px solid rgba(217,4,41,.2);border-radius:12px;color:#ff8a8a;font-size:.82rem;font-weight:700;text-align:center;transition:all .35s cubic-bezier(.16,1,.3,1);display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px}
      .men-error.show{max-height:70px;padding:11px 16px;margin-top:4px}

      /* ═══════════════ SUBMIT ═══════════════ */
      .men-submit{position:relative;width:100%;height:54px;border:none;border-radius:14px;background:linear-gradient(135deg,#021ca4 0%,#4a7aff 100%);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:.98rem;cursor:pointer;overflow:hidden;transition:all .35s cubic-bezier(.16,1,.3,1);box-shadow:0 14px 34px -12px rgba(74,122,255,.8);display:flex;align-items:center;justify-content:center;gap:10px;letter-spacing:.3px;margin-top:6px}
      .men-submit::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#4a7aff,#021ca4);opacity:0;transition:opacity .35s}
      .men-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 20px 44px -12px rgba(74,122,255,1)}
      .men-submit:hover:not(:disabled)::before{opacity:1}
      .men-submit:active:not(:disabled){transform:translateY(0) scale(.98)}
      .men-submit:disabled{cursor:not-allowed;opacity:.85}
      .men-submit > *{position:relative;z-index:2;display:flex;align-items:center;gap:10px}
      .men-spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:menSpin .7s linear infinite;display:none}
      .men-submit.loading .men-spinner{display:block}
      .men-submit.loading .men-btn-icon{display:none}
      @keyframes menSpin{to{transform:rotate(360deg)}}

      /* ═══════════════ TERMS ═══════════════ */
      .men-terms{font-size:.72rem;color:#6a7290;text-align:center;line-height:1.7;margin-top:4px;font-weight:500}
      .men-terms a{color:#6a9aff;text-decoration:none;font-weight:700;cursor:pointer}
      .men-terms a:hover{color:#4a7aff;text-decoration:underline}

      /* ═══════════════ DIVIDER ═══════════════ */
      .men-divider{display:flex;align-items:center;gap:12px;margin:6px 0;color:#4a5070;font-size:.72rem;font-weight:700;text-transform:uppercase;letter-spacing:1px}
      .men-divider::before,.men-divider::after{content:'';flex:1;height:1px;background:linear-gradient(90deg,transparent,rgba(74,122,255,.15),transparent)}

      /* ═══════════════ SOCIALS ═══════════════ */
      .men-socials{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .men-social-btn{height:48px;border-radius:14px;background:rgba(74,122,255,.06);border:1.5px solid rgba(74,122,255,.12);color:#c3cbe4;font-family:'Cairo',sans-serif;font-weight:700;font-size:.85rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:10px;transition:all .3s cubic-bezier(.16,1,.3,1)}
      .men-social-btn:hover{background:rgba(74,122,255,.12);border-color:rgba(74,122,255,.3);transform:translateY(-2px);color:#fff}
      .men-social-btn i{font-size:1rem}
      .men-social-btn.disabled{opacity:.45;cursor:not-allowed}
      .men-social-btn.disabled:hover{transform:none;background:rgba(74,122,255,.06);border-color:rgba(74,122,255,.12)}

      /* ═══════════════ SUCCESS ═══════════════ */
      .men-success-overlay{position:absolute;inset:0;background:linear-gradient(160deg,rgba(16,22,42,.99),rgba(8,12,24,1));z-index:100;display:none;flex-direction:column;align-items:center;justify-content:center;gap:16px;opacity:0;transition:opacity .35s;border-radius:28px}
      .men-success-overlay.show{display:flex;opacity:1}
      .men-check-circle{width:84px;height:84px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#66bb6a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:36px;animation:menCheckPop .6s cubic-bezier(.34,1.56,.64,1);box-shadow:0 20px 50px -10px rgba(76,175,80,.7)}
      @keyframes menCheckPop{0%{transform:scale(0) rotate(-45deg);opacity:0}60%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      .men-success-overlay p{color:#4caf50;font-weight:800;font-size:1.05rem;letter-spacing:.3px}

      /* ═══════════════ CONFETTI ═══════════════ */
      .men-confetti{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000}
      .men-confetti-piece{position:absolute;width:10px;height:10px;border-radius:2px;animation:menConfettiFall 3s linear forwards}
      @keyframes menConfettiFall{0%{transform:translateY(-100vh) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}

      /* ═══════════════ MOBILE ═══════════════ */
      @media (max-width:480px){
        .men-card{max-width:100%;border-radius:22px}
        .men-head{padding:26px 22px 18px}
        .men-brand-icon{width:46px;height:46px;font-size:19px;border-radius:14px}
        .men-brand-text .main{font-size:1rem}
        .men-head-title{font-size:1.2rem}
        .men-head-sub{font-size:.8rem}
        .men-tabs{margin:16px 18px 2px}
        .men-tab{padding:11px 12px;font-size:.82rem}
        .men-body{padding:20px 22px 24px}
        .men-row2{grid-template-columns:1fr;gap:14px}
        .men-input-wrap input{height:50px;font-size:.88rem}
        .men-submit{height:52px;font-size:.92rem}
      }

      /* ═══════════════ ACCOUNT PAGE (نفس نسخة v4) ═══════════════ */
      #menAccountPage{display:none}
      #menAccountPage.active{display:block;animation:menPageIn .5s cubic-bezier(.16,1,.3,1)}
      @keyframes menPageIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      .men-acc-wrap{padding:22px 0 80px}
      .men-acc-bread{display:flex;align-items:center;gap:10px;padding:14px 0 8px;font-size:.88rem;color:#8a92b0;flex-wrap:wrap}
      .men-acc-bread a{color:#a8b0cc;text-decoration:none;cursor:pointer;font-weight:600}
      .men-acc-bread a:hover{color:#6a9aff}
      .men-acc-bread .sep{color:#4a5070;font-size:.7rem}
      .men-acc-bread .cur{color:#fff;font-weight:700}
      .men-acc-back{display:inline-flex;align-items:center;gap:10px;background:rgba(74,122,255,.08);border:1px solid rgba(74,122,255,.15);border-radius:60px;padding:10px 22px;color:#6a9aff;font-weight:700;cursor:pointer;transition:all .3s;font-family:'Cairo',sans-serif;font-size:.9rem;margin:12px 0 26px}
      .men-acc-back:hover{background:rgba(74,122,255,.18);transform:translateX(4px)}
      .men-acc-cover{position:relative;border-radius:32px;overflow:hidden;background:linear-gradient(135deg,rgba(2,28,164,.55) 0%,rgba(74,122,255,.22) 50%,rgba(6,8,18,.95) 100%);border:1px solid rgba(74,122,255,.2);box-shadow:0 40px 100px -30px rgba(2,28,164,.8);margin-bottom:24px}
      .men-acc-cover::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 20%,rgba(74,122,255,.4),transparent 45%),radial-gradient(circle at 88% 85%,rgba(245,179,66,.2),transparent 45%);pointer-events:none}
      .men-acc-cover-inner{position:relative;z-index:2;padding:44px 40px 36px;display:flex;align-items:center;gap:28px;flex-wrap:wrap}
      .men-acc-cover-avatar-wrap{position:relative;flex-shrink:0}
      .men-acc-cover-avatar{width:120px;height:120px;border-radius:50%;border:4px solid #4a7aff;object-fit:cover;background:#0a0e1a;box-shadow:0 0 0 10px rgba(74,122,255,.12),0 25px 60px -15px rgba(74,122,255,.8);position:relative;z-index:2}
      .men-acc-avatar-ring{position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(from 0deg,#4a7aff,#f5b342,#4caf50,#4a7aff);animation:menRingSpin 6s linear infinite;z-index:1;filter:blur(1px);opacity:.7}
      @keyframes menRingSpin{to{transform:rotate(360deg)}}
      .men-acc-verified{position:absolute;bottom:6px;left:6px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#4a7aff,#6a9aff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.8rem;border:3px solid #0a0e1a;z-index:3}
      .men-acc-cover-info{flex:1;min-width:240px}
      .men-acc-cover-name{font-size:clamp(1.5rem,3vw,2.2rem);font-weight:900;color:#fff;letter-spacing:-1px;line-height:1.2;margin-bottom:8px}
      .men-acc-cover-email{color:#cdd6ea;font-size:.95rem;font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
      .men-acc-cover-email i{color:#4a7aff}
      .men-acc-cover-tags{display:flex;gap:8px;flex-wrap:wrap}
      .men-acc-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:60px;padding:6px 14px;font-size:.78rem;font-weight:700;color:#e0e6f4}
      .men-acc-tag.blue{color:#6a9aff;border-color:rgba(74,122,255,.3);background:rgba(74,122,255,.12)}
      .men-acc-tag.gold{color:#f5b342;border-color:rgba(245,179,66,.3);background:rgba(245,179,66,.12)}
      .men-acc-tag.green{color:#66bb6a;border-color:rgba(76,175,80,.3);background:rgba(76,175,80,.12)}
      .men-acc-cover-actions{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
      .men-acc-cover-btn{padding:11px 22px;border-radius:60px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .35s cubic-bezier(.16,1,.3,1)}
      .men-acc-cover-btn.primary{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 10px 30px -8px rgba(74,122,255,.7)}
      .men-acc-cover-btn.primary:hover{transform:translateY(-3px)}
      .men-acc-cover-btn.ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#e0e6f4}
      .men-acc-cover-btn.ghost:hover{background:rgba(255,255,255,.12);transform:translateY(-3px)}
      .men-acc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
      .men-acc-stat{background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.12);border-radius:22px;padding:22px 20px;transition:all .4s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}
      .men-acc-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#4a7aff);opacity:.8}
      .men-acc-stat:hover{transform:translateY(-6px);border-color:rgba(74,122,255,.35);box-shadow:0 22px 50px -15px rgba(2,28,164,.6)}
      .men-acc-stat-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;margin-bottom:14px;background:var(--icon-bg);color:var(--accent)}
      .men-acc-stat-val{font-size:1.75rem;font-weight:900;color:#fff;line-height:1.1;margin-bottom:4px;letter-spacing:-1px}
      .men-acc-stat-lbl{font-size:.78rem;color:#8a92b0;font-weight:700}
      .men-acc-tabs{display:flex;gap:6px;background:rgba(10,16,32,.6);border:1px solid rgba(74,122,255,.1);border-radius:60px;padding:6px;margin-bottom:24px;overflow-x:auto;backdrop-filter:blur(12px);scrollbar-width:none}
      .men-acc-tabs::-webkit-scrollbar{display:none}
      .men-acc-tab{flex:1;min-width:130px;padding:13px 20px;border-radius:60px;background:transparent;border:none;color:#8a92b0;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .35s cubic-bezier(.16,1,.3,1);white-space:nowrap}
      .men-acc-tab:hover:not(.active){background:rgba(74,122,255,.08);color:#fff}
      .men-acc-tab.active{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 8px 24px -6px rgba(74,122,255,.6)}
      .men-acc-panel{display:none}
      .men-acc-panel.active{display:block;animation:menPanelIn .5s cubic-bezier(.16,1,.3,1)}
      @keyframes menPanelIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
      .men-acc-overview{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}
      .men-acc-card{background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.12);border-radius:26px;padding:26px 28px;backdrop-filter:blur(12px);transition:all .35s}
      .men-acc-card:hover{border-color:rgba(74,122,255,.25)}
      .men-acc-card-title{font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:20px;display:flex;align-items:center;gap:12px}
      .men-acc-card-title .icn{width:38px;height:38px;border-radius:12px;background:rgba(74,122,255,.12);color:#6a9aff;border:1px solid rgba(74,122,255,.2);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0}
      .men-acc-cashback{position:relative;background:linear-gradient(135deg,#021ca4 0%,#041580 55%,#021ca4 100%);border-radius:26px;padding:32px 30px;color:#fff;overflow:hidden;box-shadow:0 30px 70px -20px rgba(2,28,164,.9);border:1px solid rgba(74,122,255,.35)}
      .men-acc-cashback::before{content:'';position:absolute;top:-80px;right:-80px;width:260px;height:260px;background:radial-gradient(circle,rgba(74,122,255,.5),transparent 70%);border-radius:50%}
      .men-acc-cashback .cc-chip{position:relative;z-index:2;width:52px;height:40px;border-radius:8px;background:linear-gradient(135deg,#f5b342,#c98a1e);margin-bottom:22px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:rgba(0,0,0,.4)}
      .men-acc-cashback .cc-label{position:relative;z-index:2;font-size:.82rem;opacity:.92;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.5px}
      .men-acc-cashback .cc-amount{position:relative;z-index:2;font-size:clamp(2.2rem,5vw,3rem);font-weight:900;letter-spacing:-2px;line-height:1;display:flex;align-items:baseline;gap:12px}
      .men-acc-cashback .cc-amount small{font-size:1.1rem;font-weight:700;opacity:.9}
      .men-acc-cashback .cc-note{position:relative;z-index:2;margin-top:18px;display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);padding:8px 16px;border-radius:20px;font-size:.78rem;font-weight:700;border:1px solid rgba(74,122,255,.3)}
      .men-acc-info-list{display:flex;flex-direction:column;gap:12px}
      .men-acc-info-row{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(74,122,255,.05);border:1px solid rgba(74,122,255,.1);border-radius:16px;transition:all .3s}
      .men-acc-info-row:hover{background:rgba(74,122,255,.1);border-color:rgba(74,122,255,.25);transform:translateX(-4px)}
      .men-acc-info-row .ic{width:38px;height:38px;border-radius:12px;background:rgba(74,122,255,.12);color:#6a9aff;display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0}
      .men-acc-info-row .txt{flex:1;min-width:0}
      .men-acc-info-row .lbl{font-size:.7rem;color:#8a92b0;text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:2px}
      .men-acc-info-row .val{color:#fff;font-weight:700;font-size:.92rem;word-break:break-all}
      .men-acc-orders-list{display:flex;flex-direction:column;gap:14px}
      .men-acc-order{background:linear-gradient(145deg,rgba(14,20,38,.6),rgba(8,12,24,.8));border:1px solid rgba(74,122,255,.12);border-radius:20px;padding:20px 22px;transition:all .35s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}
      .men-acc-order:hover{transform:translateY(-3px);border-color:rgba(74,122,255,.3);box-shadow:0 15px 40px -12px rgba(2,28,164,.5)}
      .men-acc-order-header{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}
      .men-acc-order-id{font-weight:800;color:#fff;font-size:.95rem;display:flex;align-items:center;gap:10px}
      .men-acc-order-id .dot{width:8px;height:8px;border-radius:50%;background:#4caf50;box-shadow:0 0 12px rgba(76,175,80,.8)}
      .men-acc-order-date{color:#8a92b0;font-size:.78rem;display:flex;align-items:center;gap:6px;font-weight:600}
      .men-acc-order-body{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
      .men-acc-order-items{flex:1;min-width:200px;color:#a8b0cc;font-size:.85rem;line-height:1.7}
      .men-acc-order-total{font-size:1.3rem;font-weight:900;background:linear-gradient(135deg,#fff,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent}
      .men-acc-order-badge{position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;font-size:.62rem;font-weight:800;padding:4px 10px;border-radius:20px}
      .men-acc-empty{text-align:center;padding:60px 24px;background:rgba(74,122,255,.04);border:1.5px dashed rgba(74,122,255,.2);border-radius:24px}
      .men-acc-empty-icon{width:90px;height:90px;margin:0 auto 20px;border-radius:50%;background:rgba(74,122,255,.1);display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#4a7aff}
      .men-acc-empty h3{color:#fff;font-size:1.2rem;margin-bottom:8px;font-weight:800}
      .men-acc-empty p{color:#8a92b0;font-size:.88rem;margin-bottom:20px}
      .men-acc-empty button{padding:12px 26px;border-radius:60px;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
      .men-acc-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
      .men-acc-form-field label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
      .men-acc-form-field input{width:100%;padding:14px 20px;border-radius:14px;background:rgba(0,0,0,.3);border:1.5px solid rgba(74,122,255,.12);color:#fff;font-family:'Cairo',sans-serif;font-size:.92rem;font-weight:600;outline:none;transition:all .3s}
      .men-acc-form-field input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.12);background:rgba(74,122,255,.06)}
      .men-acc-form-field input:disabled{opacity:.5;cursor:not-allowed}
      .men-acc-settings-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
      .men-acc-settings-actions button{padding:13px 26px;border-radius:60px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .35s}
      .men-acc-settings-actions .save{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 10px 30px -8px rgba(74,122,255,.6)}
      .men-acc-settings-actions .save:hover{transform:translateY(-3px)}
      .men-acc-settings-actions .danger{background:rgba(217,4,41,.12);border:1px solid rgba(217,4,41,.3);color:#ff6b6b}
      .men-acc-settings-actions .danger:hover{background:rgba(217,4,41,.22);transform:translateY(-3px)}
      .men-acc-danger{margin-top:20px;padding:22px 24px;background:rgba(217,4,41,.06);border:1px solid rgba(217,4,41,.2);border-radius:20px}
      .men-acc-danger h4{color:#ff6b6b;font-size:1rem;margin-bottom:8px;font-weight:800;display:flex;align-items:center;gap:10px}
      .men-acc-danger p{color:#d0a8a8;font-size:.85rem;margin-bottom:14px;line-height:1.7}
      @media (max-width:992px){
        .men-acc-stats{grid-template-columns:repeat(2,1fr)}
        .men-acc-overview{grid-template-columns:1fr}
        .men-acc-settings-grid{grid-template-columns:1fr}
      }
      @media (max-width:768px){
        .men-acc-cover-inner{padding:32px 24px 26px;flex-direction:column;text-align:center;gap:22px}
        .men-acc-cover-avatar{width:100px;height:100px}
        .men-acc-cover-email{justify-content:center}
        .men-acc-cover-tags{justify-content:center}
        .men-acc-cover-actions{justify-content:center}
        .men-acc-tab{min-width:auto;padding:11px 14px;font-size:.8rem}
        .men-acc-tab span{display:none}
        .men-acc-card{padding:22px 20px}
        .men-acc-cashback{padding:26px 22px}
        .men-acc-stat{padding:18px 16px}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══ Confetti ═══
  function launchConfetti() {
    const colors = ['#4a7aff','#6a9aff','#f5b342','#4caf50','#fff','#021ca4'];
    const c = document.createElement('div');
    c.className = 'men-confetti';
    for (let i = 0; i < 60; i++) {
      const p = document.createElement('div');
      p.className = 'men-confetti-piece';
      p.style.left = Math.random() * 100 + '%';
      p.style.background = colors[Math.floor(Math.random() * colors.length)];
      p.style.animationDelay = Math.random() * 0.4 + 's';
      p.style.animationDuration = (2 + Math.random() * 1.5) + 's';
      p.style.width = p.style.height = (6 + Math.random() * 8) + 'px';
      c.appendChild(p);
    }
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 3500);
  }

  // ═══════════════════════════════════════════════════════════
  // 🖼️ بناء الـ Modal
  // ═══════════════════════════════════════════════════════════
  function injectModals() {
    if ($('menAuthModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="menAuthModal" class="men-modal">
        <div class="men-backdrop" data-close></div>
        <div class="men-card" id="menAuthCard">

          <!-- ═══ HEADER ═══ -->
          <div class="men-head">
            <button class="men-close" data-close type="button"><i class="fas fa-times"></i></button>
            <div class="men-brand">
              <div class="men-brand-icon"><i class="fas fa-gamepad"></i></div>
              <div class="men-brand-text">
                <div class="main">MEN Store</div>
                <div class="sub">Premium Gaming</div>
              </div>
            </div>
            <h2 class="men-head-title" id="menHeadTitle">أهلاً بعودتك 👋</h2>
            <p class="men-head-sub" id="menHeadSub">سجّل دخولك للمتابعة والاستمتاع بالعروض</p>
          </div>

          <!-- ═══ TABS ═══ -->
          <div class="men-tabs" id="menTabs" data-mode="login">
            <div class="men-tabs-indicator"></div>
            <button class="men-tab active" data-tab="login" type="button"><i class="fas fa-right-to-bracket"></i> دخول</button>
            <button class="men-tab" data-tab="signup" type="button"><i class="fas fa-user-plus"></i> حساب جديد</button>
          </div>

          <!-- ═══ BODY ═══ -->
          <div class="men-body">
            <form class="men-form" id="menForm" onsubmit="return false;">

              <!-- Fields for signup only -->
              <div class="men-row2" id="menRow2Fields" style="display:none">
                <div class="men-field">
                  <label class="men-label" for="menAuthName">الاسم الكامل</label>
                  <div class="men-input-wrap">
                    <input type="text" id="menAuthName" placeholder="محمد أحمد" autocomplete="name" dir="rtl">
                    <i class="fas fa-user men-icon"></i>
                  </div>
                </div>
                <div class="men-field">
                  <label class="men-label" for="menAuthPhone">رقم الجوال</label>
                  <div class="men-input-wrap">
                    <input type="tel" id="menAuthPhone" placeholder="05xxxxxxxx" autocomplete="tel" dir="ltr" style="text-align:right">
                    <i class="fas fa-phone men-icon"></i>
                  </div>
                </div>
              </div>

              <!-- Email -->
              <div class="men-field">
                <label class="men-label" for="menAuthEmail">البريد الإلكتروني</label>
                <div class="men-input-wrap">
                  <input type="email" id="menAuthEmail" placeholder="you@example.com" autocomplete="email" dir="ltr" style="text-align:right">
                  <i class="fas fa-envelope men-icon"></i>
                </div>
              </div>

              <!-- Password -->
              <div class="men-field">
                <label class="men-label" for="menAuthPassword">كلمة المرور</label>
                <div class="men-input-wrap">
                  <input type="password" id="menAuthPassword" placeholder="••••••••" autocomplete="current-password" dir="ltr" style="text-align:right">
                  <i class="fas fa-lock men-icon"></i>
                  <button class="men-eye" id="menTogglePass" type="button" title="إظهار/إخفاء"><i class="fas fa-eye"></i></button>
                </div>
                <div class="men-strength" id="menStrength">
                  <div class="men-strength-row">
                    <div class="men-strength-bars">
                      <div class="men-strength-bar"></div>
                      <div class="men-strength-bar"></div>
                      <div class="men-strength-bar"></div>
                      <div class="men-strength-bar"></div>
                    </div>
                    <span class="men-strength-label" id="menStrengthLabel"></span>
                  </div>
                </div>
              </div>

              <!-- Options (login only) -->
              <div class="men-opts" id="menOptsRow">
                <label class="men-remember">
                  <input type="checkbox" id="menRemember" checked>
                  <span class="men-check"></span>
                  <span>تذكرني</span>
                </label>
                <a class="men-forgot" id="menForgotBtn">نسيت كلمة المرور؟</a>
              </div>

              <!-- Terms (signup only) -->
              <div class="men-terms" id="menTermsText" style="display:none">
                بإنشاء حساب، أنت توافق على <a>الشروط والأحكام</a> و <a>سياسة الخصوصية</a>
              </div>

              <!-- Error -->
              <div class="men-error" id="menError">
                <i class="fas fa-circle-exclamation"></i>
                <span id="menErrorText"></span>
              </div>

              <!-- Submit -->
              <button class="men-submit" id="menSubmit" type="button">
                <i class="fas fa-arrow-left men-btn-icon"></i>
                <span class="men-spinner"></span>
                <span id="menSubmitText">تسجيل الدخول</span>
              </button>

            </form>

            <!-- Divider -->
            <div class="men-divider" id="menDivider">أو</div>

            <!-- Socials -->
            <div class="men-socials">
              <button class="men-social-btn disabled" type="button" data-social="google" title="قريباً">
                <i class="fab fa-google"></i> Google
              </button>
              <button class="men-social-btn disabled" type="button" data-social="discord" title="قريباً">
                <i class="fab fa-discord"></i> Discord
              </button>
            </div>
          </div>

          <!-- Success overlay -->
          <div class="men-success-overlay" id="menSuccessOverlay">
            <div class="men-check-circle"><i class="fas fa-check"></i></div>
            <p id="menSuccessText">تم بنجاح!</p>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // Bind events
    wrap.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeAuth));

    wrap.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', () => switchMode(btn.dataset.tab));
    });

    $('menTogglePass').addEventListener('click', togglePassword);
    $('menAuthPassword').addEventListener('input', updateStrength);
    $('menAuthPassword').addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    $('menAuthEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPassword').focus(); });
    $('menAuthName').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPhone').focus(); });
    $('menAuthPhone').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthEmail').focus(); });
    $('menRemember').addEventListener('change', function () { rememberMe = this.checked; });
    $('menSubmit').addEventListener('click', handleSubmit);
    $('menForgotBtn').addEventListener('click', handleForgot);

    wrap.querySelectorAll('[data-social]').forEach(b => {
      b.addEventListener('click', () => {
        if (window.showToast) window.showToast('🔜 قريباً — قيد التطوير', 'info');
      });
    });
  }

  // ═══ Mode Switch ═══
  function switchMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'login';
    renderMode();
  }

  function renderMode() {
    const login = authMode === 'login';

    // Tab indicator
    $('menTabs').dataset.mode = authMode;
    document.querySelectorAll('[data-tab]').forEach(b =>
      b.classList.toggle('active', b.dataset.tab === authMode));

    // Header
    $('menHeadTitle').textContent = login ? 'أهلاً بعودتك 👋' : 'انضم إلينا 🎉';
    $('menHeadSub').textContent = login
      ? 'سجّل دخولك للمتابعة والاستمتاع بالعروض'
      : 'أنشئ حسابك واحصل على كاش باك 2% على كل طلب';

    // Fields
    $('menRow2Fields').style.display = login ? 'none' : 'grid';
    $('menOptsRow').style.display = login ? 'flex' : 'none';
    $('menTermsText').style.display = login ? 'none' : 'block';
    $('menDivider').style.display = login ? 'flex' : 'none';

    // Submit text
    $('menSubmitText').textContent = login ? 'تسجيل الدخول' : 'إنشاء الحساب';

    // Strength bar
    $('menStrength').classList.remove('show', 's1', 's2', 's3', 's4');

    // Autocomplete
    $('menAuthPassword').autocomplete = login ? 'current-password' : 'new-password';

    // Reset form animations
    const card = $('menAuthCard');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'menCardIn .5s cubic-bezier(.16,1,.3,1)';

    clearError();
  }

  function togglePassword() {
    const inp = $('menAuthPassword');
    const ico = $('menTogglePass').querySelector('i');
    if (inp.type === 'password') { inp.type = 'text'; ico.className = 'fas fa-eye-slash'; }
    else { inp.type = 'password'; ico.className = 'fas fa-eye'; }
  }

  // ═══ Strength ═══
  function updateStrength() {
    const p = $('menAuthPassword').value;
    const el = $('menStrength');
    if (!p) { el.classList.remove('show', 's1', 's2', 's3', 's4'); return; }
    el.classList.add('show');
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    el.classList.remove('s1', 's2', 's3', 's4');
    el.classList.add('s' + Math.max(1, score));
    const labels = ['', 'ضعيفة', 'مقبولة', 'قوية', 'ممتازة'];
    $('menStrengthLabel').textContent = labels[Math.max(1, score)];
  }

  // ═══ Error ═══
  function showError(msg) {
    $('menErrorText').textContent = msg;
    $('menError').classList.add('show');
    const card = $('menAuthCard');
    card.classList.remove('men-shake');
    void card.offsetWidth;
    card.classList.add('men-shake');
  }
  function clearError() { $('menError').classList.remove('show'); }

  // ═══ Open / Close ═══
  function open(mode) {
    injectCSS();
    injectModals();
    injectAccountPage();
    authMode = mode === 'signup' ? 'signup' : 'login';
    renderMode();
    $('menAuthModal').classList.add('active');
    setTimeout(() => $('menAuthEmail')?.focus(), 250);
  }
  function closeAuth() {
    $('menAuthModal')?.classList.remove('active');
    clearError();
  }

  // ═══ Submit ═══
  async function handleSubmit() {
    const email = $('menAuthEmail').value.trim().toLowerCase();
    const password = $('menAuthPassword').value;
    const name = $('menAuthName').value.trim();
    const phone = $('menAuthPhone').value.trim();

    clearError();

    if (authMode === 'signup') {
      if (!name) return showError('الرجاء إدخال الاسم الكامل');
      if (!phone) return showError('الرجاء إدخال رقم الجوال');
      if (!/^05\d{8}$/.test(phone) && !/^\+?\d{8,15}$/.test(phone))
        return showError('رقم الجوال غير صحيح (مثال: 05xxxxxxxx)');
    }
    if (!email) return showError('الرجاء إدخال البريد الإلكتروني');
    if (!email.includes('@') || !email.includes('.')) return showError('صيغة البريد الإلكتروني غير صحيحة');
    if (!password) return showError('الرجاء إدخال كلمة المرور');
    if (authMode === 'signup' && password.length < 6) return showError('كلمة المرور 6 أحرف على الأقل');

    const btn = $('menSubmit');
    const originalText = $('menSubmitText').textContent;
    btn.disabled = true;
    btn.classList.add('loading');

    try {
      if (authMode === 'login') {
        console.log('🔐 محاولة دخول:', email);
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('✅ دخول ناجح:', data.user?.email);
        await showSuccess('مرحباً بك! 👋');
        launchConfetti();
      } else {
        console.log('📝 إنشاء حساب:', email);
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, phone, cashback: 0, orders: [] } }
        });
        if (error) throw error;
        if (!data.session) {
          showError('📧 تم إنشاء حسابك! افتح بريدك واضغط رابط التأكيد ثم سجّل الدخول.');
          return;
        }
        console.log('✅ حساب جديد:', data.user?.email);
        await showSuccess('تم إنشاء حسابك 🎉');
        launchConfetti();
      }
    } catch (err) {
      console.error('[AUTH ERROR]', err);
      const m = (err.message || '').toLowerCase();
      if (m.includes('email not confirmed'))
        showError('⚠️ بريدك غير مؤكد — افتح بريدك واضغط رابط التأكيد');
      else if (m.includes('invalid login'))
        showError('❌ البريد أو كلمة المرور غير صحيحة');
      else if (m.includes('already registered') || m.includes('already been registered'))
        showError('📧 البريد مسجل بالفعل — انتقل لتسجيل الدخول');
      else if (m.includes('password'))
        showError('🔒 كلمة المرور ضعيفة — استخدم 6 أحرف على الأقل');
      else if (m.includes('too many'))
        showError('⏳ محاولات كثيرة — انتظر دقيقة وحاول مجدداً');
      else
        showError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  function showSuccess(msg) {
    return new Promise(r => {
      $('menSuccessText').textContent = msg;
      $('menSuccessOverlay').classList.add('show');
      if (window.showToast) setTimeout(() => window.showToast(msg, 'success'), 300);
      setTimeout(() => {
        $('menSuccessOverlay').classList.remove('show');
        closeAuth();
        r();
      }, 1300);
    });
  }

  // ═══ Forgot ═══
  async function handleForgot() {
    const email = $('menAuthEmail').value.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showError('اكتب بريدك الإلكتروني أولاً');
      $('menAuthEmail').focus();
      return;
    }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname
      });
      if (error) throw error;
      if (window.showToast) window.showToast('📧 أرسلنا رابط استعادة كلمة المرور', 'success');
      clearError();
    } catch (err) {
      showError(err.message || 'فشل إرسال الرابط');
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 👤 ACCOUNT PAGE (نفس نسخة v4)
  // ═══════════════════════════════════════════════════════════
  function injectAccountPage() {
    if ($('menAccountPage')) return;
    const main = document.querySelector('main') || document.body;
    const page = document.createElement('div');
    page.id = 'menAccountPage';
    page.className = 'page-view';
    page.innerHTML = `
      <div class="container">
        <div class="men-acc-bread">
          <a data-macc-nav="home">الرئيسية</a><span class="sep"><i class="fas fa-chevron-left"></i></span>
          <span class="cur">حسابي</span>
        </div>
        <button class="men-acc-back" id="menAccBackBtn" type="button"><i class="fas fa-arrow-right"></i> العودة للمتجر</button>
        <div class="men-acc-wrap">
          <div class="men-acc-cover">
            <div class="men-acc-cover-inner">
              <div class="men-acc-cover-avatar-wrap">
                <div class="men-acc-avatar-ring"></div>
                <img class="men-acc-cover-avatar" id="menAccCoverAvatar" src="" alt="">
                <div class="men-acc-verified"><i class="fas fa-check"></i></div>
              </div>
              <div class="men-acc-cover-info">
                <h1 class="men-acc-cover-name" id="menAccCoverName">—</h1>
                <div class="men-acc-cover-email"><i class="fas fa-envelope"></i> <span id="menAccCoverEmail">—</span></div>
                <div class="men-acc-cover-tags">
                  <span class="men-acc-tag blue"><i class="fas fa-crown"></i> عضو مميز</span>
                  <span class="men-acc-tag gold"><i class="fas fa-star"></i> <span id="menAccMemberLevel">برونزي</span></span>
                  <span class="men-acc-tag green"><i class="fas fa-circle-check"></i> موثّق</span>
                </div>
                <div class="men-acc-cover-actions">
                  <button class="men-acc-cover-btn primary" id="menAccShopNow" type="button"><i class="fas fa-shopping-bag"></i> تسوق الآن</button>
                  <button class="men-acc-cover-btn ghost" id="menAccShareBtn" type="button"><i class="fas fa-share-nodes"></i> شارك</button>
                </div>
              </div>
            </div>
          </div>

          <div class="men-acc-stats">
            <div class="men-acc-stat" style="--accent:#4a7aff;--icon-bg:rgba(74,122,255,.12)">
              <div class="men-acc-stat-icon"><i class="fas fa-box"></i></div>
              <div class="men-acc-stat-val" id="menAccStatOrders">0</div>
              <div class="men-acc-stat-lbl">الطلبات</div>
            </div>
            <div class="men-acc-stat" style="--accent:#4caf50;--icon-bg:rgba(76,175,80,.12)">
              <div class="men-acc-stat-icon"><i class="fas fa-wallet"></i></div>
              <div class="men-acc-stat-val"><span id="menAccStatCashback">0</span> <small style="font-size:.9rem;color:#8a92b0">ر.س</small></div>
              <div class="men-acc-stat-lbl">الكاش باك</div>
            </div>
            <div class="men-acc-stat" style="--accent:#f5b342;--icon-bg:rgba(245,179,66,.12)">
              <div class="men-acc-stat-icon"><i class="fas fa-coins"></i></div>
              <div class="men-acc-stat-val"><span id="menAccStatSpent">0</span> <small style="font-size:.9rem;color:#8a92b0">ر.س</small></div>
              <div class="men-acc-stat-lbl">إجمالي المشتريات</div>
            </div>
            <div class="men-acc-stat" style="--accent:#6a9aff;--icon-bg:rgba(106,154,255,.12)">
              <div class="men-acc-stat-icon"><i class="fas fa-calendar"></i></div>
              <div class="men-acc-stat-val" id="menAccStatSince" style="font-size:1.05rem">—</div>
              <div class="men-acc-stat-lbl">عضو منذ</div>
            </div>
          </div>

          <div class="men-acc-tabs">
            <button class="men-acc-tab active" data-macc-tab="overview" type="button"><i class="fas fa-house"></i> <span>نظرة عامة</span></button>
            <button class="men-acc-tab" data-macc-tab="orders" type="button"><i class="fas fa-box"></i> <span>طلباتي</span></button>
            <button class="men-acc-tab" data-macc-tab="settings" type="button"><i class="fas fa-gear"></i> <span>الإعدادات</span></button>
          </div>

          <div class="men-acc-panel active" data-macc-panel="overview">
            <div class="men-acc-overview">
              <div class="men-acc-cashback">
                <div class="cc-chip"><i class="fas fa-microchip"></i></div>
                <div class="cc-label"><i class="fas fa-wallet"></i> رصيد الكاش باك</div>
                <div class="cc-amount"><span id="menAccCashbackBig">0.00</span> <small>ر.س</small></div>
                <div class="cc-note"><i class="fas fa-gift"></i> تكسب 2% على كل طلب</div>
              </div>
              <div class="men-acc-card">
                <div class="men-acc-card-title"><span class="icn"><i class="fas fa-user"></i></span> معلوماتي</div>
                <div class="men-acc-info-list">
                  <div class="men-acc-info-row"><div class="ic"><i class="fas fa-user"></i></div><div class="txt"><div class="lbl">الاسم</div><div class="val" id="menAccInfoName">—</div></div></div>
                  <div class="men-acc-info-row"><div class="ic"><i class="fas fa-envelope"></i></div><div class="txt"><div class="lbl">البريد</div><div class="val" id="menAccInfoEmail">—</div></div></div>
                  <div class="men-acc-info-row"><div class="ic"><i class="fas fa-phone"></i></div><div class="txt"><div class="lbl">الجوال</div><div class="val" id="menAccInfoPhone">—</div></div></div>
                  <div class="men-acc-info-row"><div class="ic"><i class="fas fa-id-card"></i></div><div class="txt"><div class="lbl">رقم العضوية</div><div class="val" id="menAccInfoId">—</div></div></div>
                </div>
              </div>
            </div>
          </div>

          <div class="men-acc-panel" data-macc-panel="orders">
            <div class="men-acc-card">
              <div class="men-acc-card-title"><span class="icn"><i class="fas fa-receipt"></i></span> سجل الطلبات</div>
              <div class="men-acc-orders-list" id="menAccOrdersList"></div>
            </div>
          </div>

          <div class="men-acc-panel" data-macc-panel="settings">
            <div class="men-acc-card">
              <div class="men-acc-card-title"><span class="icn"><i class="fas fa-pen"></i></span> تعديل البيانات</div>
              <div class="men-acc-settings-grid">
                <div class="men-acc-form-field"><label>الاسم الكامل</label><input type="text" id="menAccSetName" placeholder="اسمك"></div>
                <div class="men-acc-form-field"><label>رقم الجوال</label><input type="tel" id="menAccSetPhone" placeholder="05xxxxxxxx" dir="ltr"></div>
                <div class="men-acc-form-field" style="grid-column:1/-1"><label>البريد الإلكتروني (لا يمكن تغييره)</label><input type="email" id="menAccSetEmail" disabled dir="ltr"></div>
                <div class="men-acc-settings-actions">
                  <button class="save" id="menAccSaveBtn" type="button"><i class="fas fa-check"></i> حفظ التغييرات</button>
                  <button class="danger" id="menAccLogoutBtn" type="button"><i class="fas fa-sign-out-alt"></i> تسجيل الخروج</button>
                </div>
              </div>
            </div>
            <div class="men-acc-danger">
              <h4><i class="fas fa-triangle-exclamation"></i> منطقة الخطر</h4>
              <p>حذف الحساب سيؤدي إلى فقدان جميع بياناتك ورصيد الكاش باك وسجل الطلبات نهائياً.</p>
              <button id="menAccDeleteBtn" type="button" style="padding:12px 24px;border-radius:60px;border:1px solid rgba(217,4,41,.3);background:rgba(217,4,41,.12);color:#ff6b6b;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px"><i class="fas fa-trash"></i> حذف الحساب</button>
            </div>
          </div>
        </div>
      </div>
    `;
    main.appendChild(page);

    $('menAccBackBtn').addEventListener('click', closeAccount);
    $('menAccShopNow').addEventListener('click', closeAccount);
    page.querySelectorAll('[data-macc-nav]').forEach(a => a.addEventListener('click', closeAccount));
    page.querySelectorAll('[data-macc-tab]').forEach(btn =>
      btn.addEventListener('click', () => switchAccountTab(btn.dataset.maccTab)));
    $('menAccSaveBtn').addEventListener('click', saveProfile);
    $('menAccLogoutBtn').addEventListener('click', logout);
    $('menAccDeleteBtn').addEventListener('click', deleteAccount);
    $('menAccShareBtn').addEventListener('click', shareAccount);
  }

  function switchAccountTab(tab) {
    document.querySelectorAll('[data-macc-tab]').forEach(b =>
      b.classList.toggle('active', b.dataset.maccTab === tab));
    document.querySelectorAll('[data-macc-panel]').forEach(p =>
      p.classList.toggle('active', p.dataset.maccPanel === tab));
  }

  function fillAccountPage(user) {
    const meta = user.user_metadata || {};
    const orders = Array.isArray(meta.orders) ? meta.orders : [];
    const cashback = Number(meta.cashback || 0);
    const totalSpent = orders.reduce((s, o) => s + Number(o.total || 0), 0);

    const avatar = meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'M')}&background=021ca4&color=fff&bold=true&size=300`;
    const name = meta.name || user.email?.split('@')[0] || 'مستخدم';
    const since = user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : '—';

    $('menAccCoverAvatar').src = avatar;
    $('menAccCoverName').textContent = name;
    $('menAccCoverEmail').textContent = user.email || '—';

    let level = 'برونزي', lvlIcon = '🥉';
    if (orders.length >= 20 || totalSpent >= 1000) { level = 'ذهبي'; lvlIcon = '🥇'; }
    else if (orders.length >= 5 || totalSpent >= 300) { level = 'فضي'; lvlIcon = '🥈'; }
    $('menAccMemberLevel').textContent = `${lvlIcon} ${level}`;

    $('menAccStatOrders').textContent = orders.length;
    $('menAccStatCashback').textContent = cashback.toFixed(2);
    $('menAccStatSpent').textContent = totalSpent.toFixed(2);
    $('menAccStatSince').textContent = since;

    $('menAccCashbackBig').textContent = cashback.toFixed(2);
    $('menAccInfoName').textContent = name;
    $('menAccInfoEmail').textContent = user.email || '—';
    $('menAccInfoPhone').textContent = meta.phone || '—';
    $('menAccInfoId').textContent = '#' + String(user.id || '').slice(0, 8).toUpperCase();

    $('menAccSetName').value = meta.name || '';
    $('menAccSetPhone').value = meta.phone || '';
    $('menAccSetEmail').value = user.email || '';

    renderOrders(orders);
  }

  function renderOrders(orders) {
    const list = $('menAccOrdersList');
    if (!list) return;
    if (!orders.length) {
      list.innerHTML = `
        <div class="men-acc-empty">
          <div class="men-acc-empty-icon"><i class="fas fa-shopping-basket"></i></div>
          <h3>لا يوجد طلبات بعد</h3>
          <p>ابدأ رحلتك التسوقية واكسب كاش باك 2% على كل عملية</p>
          <button type="button" id="menAccEmptyShop"><i class="fas fa-shopping-bag"></i> تسوق الآن</button>
        </div>`;
      const b = $('menAccEmptyShop');
      if (b) b.addEventListener('click', closeAccount);
      return;
    }
    const sorted = [...orders].sort((a, b) => new Date(b.date) - new Date(a.date));
    list.innerHTML = sorted.map((o, i) => {
      const items = Array.isArray(o.items) ? o.items : [];
      const itemsTxt = items.slice(0, 3).map(it => `${it.name || 'منتج'} ×${it.qty || 1}`).join(' • ') + (items.length > 3 ? ` +${items.length - 3}` : '');
      const date = o.date ? new Date(o.date).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';
      return `
        <div class="men-acc-order">
          <div class="men-acc-order-badge"><i class="fas fa-check"></i> مكتمل</div>
          <div class="men-acc-order-header">
            <div class="men-acc-order-id"><span class="dot"></span> طلب #${String(o.id || (sorted.length - i)).slice(-6).toUpperCase()}</div>
            <div class="men-acc-order-date"><i class="fas fa-clock"></i> ${date}</div>
          </div>
          <div class="men-acc-order-body">
            <div class="men-acc-order-items">${itemsTxt || 'تفاصيل الطلب'}</div>
            <div class="men-acc-order-total">${Number(o.total || 0).toFixed(2)} ر.س</div>
          </div>
        </div>`;
    }).join('');
  }

  async function saveProfile() {
    const name = $('menAccSetName').value.trim();
    const phone = $('menAccSetPhone').value.trim();
    if (!name) { if (window.showToast) window.showToast('الرجاء إدخال الاسم', 'error'); return; }
    const btn = $('menAccSaveBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الحفظ...';
    try {
      const { data, error } = await sb.auth.updateUser({ data: { name, phone } });
      if (error) throw error;
      currentUser = data.user;
      fillAccountPage(data.user);
      syncUI(data.user);
      if (window.showToast) window.showToast('✅ تم حفظ التغييرات', 'success');
    } catch (err) {
      if (window.showToast) window.showToast('فشل الحفظ: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> حفظ التغييرات';
    }
  }

  function deleteAccount() {
    if (!confirm('⚠️ هل أنت متأكد من حذف حسابك نهائياً؟\nهذا الإجراء لا يمكن التراجع عنه.')) return;
    if (window.showToast) window.showToast('تواصل مع الدعم: clan.men.ts@gmail.com', 'info');
  }

  function shareAccount() {
    if (!currentUser) return;
    const text = `🎮 أنا عضو في MEN Store!\nانضم إلينا واحصل على كاش باك 2%\n${location.origin}`;
    if (navigator.share) {
      navigator.share({ title: 'MEN Store', text, url: location.origin }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast('📋 تم نسخ الرابط', 'success');
      });
    }
  }

  function openAccount() {
    if (!currentUser) return open('login');
    injectCSS();
    injectModals();
    injectAccountPage();
    fillAccountPage(currentUser);
    hideAllPages();
    $('menAccountPage').classList.add('active');
    history.replaceState(null, '', '#account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    sb.auth.getUser().then(({ data }) => {
      if (data?.user) { currentUser = data.user; fillAccountPage(data.user); }
    });
  }

  function closeAccount() {
    hideAllPages();
    const store = $('storePage');
    if (store) store.classList.add('active');
    if (location.hash === '#account') history.replaceState(null, '', location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideAllPages() {
    document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active'));
  }

  async function logout() {
    await sb.auth.signOut();
    closeAccount();
    if (window.showToast) window.showToast('تم تسجيل الخروج 👋', 'info');
  }

  // ═══ Sync UI ═══
  function syncUI(user) {
    currentUser = user;
    const loginBtn = $('menLoginBtn');
    const avatar = $('menHeaderAvatar');
    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (avatar) {
        avatar.src = user.user_metadata?.avatar_url
          || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email||'M')}&background=021ca4&color=fff&bold=true&size=100`;
        avatar.style.display = 'block';
      }
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (avatar) avatar.style.display = 'none';
      if ($('menAccountPage')?.classList.contains('active')) closeAccount();
    }
    const mLogin = $('menMobileLogin');
    const mAccount = $('menMobileAccount');
    if (mLogin) mLogin.style.display = user ? 'none' : 'flex';
    if (mAccount) mAccount.style.display = user ? 'flex' : 'none';
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
  }

  // ═══ Public API ═══
  window.MEN_AUTH = {
    CASHBACK_RATE, open, openAccount, logout,
    getCurrentUser: () => currentUser,
    addCashback: async (a) => {
      if (!currentUser || a <= 0) return;
      const c = Number(currentUser.user_metadata?.cashback || 0) + Number(a);
      await sb.auth.updateUser({ data: { cashback: Math.round(c * 100) / 100 } });
    },
    deductCashback: async (a) => {
      if (!currentUser || a <= 0) return;
      const c = Math.max(0, Number(currentUser.user_metadata?.cashback || 0) - Number(a));
      await sb.auth.updateUser({ data: { cashback: Math.round(c * 100) / 100 } });
    },
    addOrder: async (order) => {
      if (!currentUser) return;
      const orders = currentUser.user_metadata?.orders || [];
      orders.push({ ...order, id: 'M' + Date.now().toString().slice(-6), date: new Date().toISOString() });
      await sb.auth.updateUser({ data: { orders } });
    }
  };

  // ═══ Bootstrap ═══
  async function bootstrap() {
    injectCSS();
    injectModals();
    const { data: { session } } = await sb.auth.getSession();
    syncUI(session?.user || null);
    sb.auth.onAuthStateChange((event, session) => {
      console.log('[MEN_AUTH]', event);
      syncUI(session?.user || null);
      if ($('menAccountPage')?.classList.contains('active') && session?.user) fillAccountPage(session.user);
    });
    const av = $('menHeaderAvatar');
    if (av && !av.dataset.bound) {
      av.dataset.bound = '1';
      av.addEventListener('click', openAccount);
    }
    if (location.hash === '#account') {
      setTimeout(() => { if (currentUser) openAccount(); }, 500);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
