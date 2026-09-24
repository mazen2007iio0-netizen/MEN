/* ============================================================
   ✨ MEN Store — Auth v4 (Premium + Full Account Page)
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
    console.error('%c ضع مفاتيح Supabase في js/auth.js', 'background:#d90429;color:#fff;padding:6px 12px;border-radius:6px;font-weight:bold');
    window.MEN_AUTH = { CASHBACK_RATE: 0.02, open: () => alert(' أضف مفاتيح Supabase'), openAccount: () => alert(' أضف مفاتيح Supabase'), logout: () => {}, getCurrentUser: () => null, addCashback: async () => {}, deductCashback: async () => {}, addOrder: async () => {} };
    return;
  }

  if (!window.supabase?.createClient) { console.error('[MEN_AUTH] SDK غير محمّل'); return; }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'men-auth-token', storage: window.localStorage, flowType: 'pkce' }
  });
  window.MEN_SUPABASE = sb;

  console.log('%c✨ MEN AUTH v4', 'background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;letter-spacing:1px');

  const CASHBACK_RATE = 0.02;
  let currentUser = null;
  let authMode = 'login';
  let rememberMe = true;
  const $ = id => document.getElementById(id);

  // ═══════════════════════════════════════════════════════════
  // 🎨 CSS كامل
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if ($('menAuthStyles')) return;
    const s = document.createElement('style');
    s.id = 'menAuthStyles';
    s.textContent = `
      /* ═══ MODAL ═══ */
      .men-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;font-family:'Cairo','Outfit',sans-serif}
      .men-modal.active{display:flex}
      .men-backdrop{position:absolute;inset:0;background:rgba(2,4,12,.88);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);animation:menFade .4s ease}
      @keyframes menFade{from{opacity:0}to{opacity:1}}
      .men-modal::before,.men-modal::after{content:'';position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;pointer-events:none;z-index:1}
      .men-modal::before{width:400px;height:400px;background:radial-gradient(circle,#4a7aff,transparent 70%);top:-100px;left:-100px;animation:menOrb1 12s ease-in-out infinite}
      .men-modal::after{width:350px;height:350px;background:radial-gradient(circle,#f5b342,transparent 70%);bottom:-100px;right:-100px;animation:menOrb2 14s ease-in-out infinite}
      @keyframes menOrb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(80px,60px) scale(1.2)}}
      @keyframes menOrb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-60px,-40px) scale(1.15)}}
      .men-card{position:relative;z-index:5;width:100%;max-width:460px;background:linear-gradient(145deg,rgba(14,20,38,.96),rgba(8,12,24,.98));border:1px solid rgba(74,122,255,.2);border-radius:32px;padding:44px 38px 36px;box-shadow:0 40px 120px rgba(0,0,0,.8),0 0 80px rgba(74,122,255,.15);animation:menCardIn .55s cubic-bezier(.16,1,.3,1);overflow:hidden}
      .men-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#4a7aff,#f5b342,#4a7aff,transparent);background-size:200% 100%;animation:menShimmer 3s linear infinite}
      @keyframes menShimmer{to{background-position:-200% 0}}
      @keyframes menCardIn{from{opacity:0;transform:translateY(30px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
      .men-card.men-shake{animation:menShake .5s cubic-bezier(.36,.07,.19,.97)}
      @keyframes menShake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}
      .men-close{position:absolute;top:20px;left:22px;width:38px;height:38px;border-radius:50%;background:rgba(74,122,255,.08);border:1px solid rgba(74,122,255,.15);color:#8a92b0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .35s cubic-bezier(.16,1,.3,1);z-index:10}
      .men-close:hover{background:rgba(217,4,41,.15);border-color:rgba(217,4,41,.3);color:#ff6b6b;transform:rotate(180deg) scale(1.1)}
      .men-badge{width:72px;height:72px;margin:0 auto 18px;border-radius:24px;background:linear-gradient(135deg,#021ca4 0%,#4a7aff 100%);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;box-shadow:0 20px 50px -10px rgba(74,122,255,.7),inset 0 2px 0 rgba(255,255,255,.2);position:relative;animation:menBadgeFloat 3s ease-in-out infinite}
      @keyframes menBadgeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      .men-badge::after{content:'';position:absolute;inset:-4px;border-radius:26px;background:linear-gradient(135deg,#4a7aff,#f5b342,#4a7aff);background-size:200% 200%;z-index:-1;opacity:.4;animation:menBadgeGlow 4s ease infinite}
      @keyframes menBadgeGlow{0%,100%{background-position:0% 50%;opacity:.4}50%{background-position:100% 50%;opacity:.8}}
      .men-title{text-align:center;font-size:1.65rem;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-.5px;background:linear-gradient(135deg,#fff 30%,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.3}
      .men-subtitle{text-align:center;color:#8a92b0;font-size:.88rem;margin-bottom:30px;font-weight:600}
      .men-field{position:relative;margin-bottom:16px}
      .men-field input{width:100%;padding:22px 52px 8px 18px;height:60px;background:rgba(0,0,0,.3);border:1.5px solid rgba(74,122,255,.12);border-radius:16px;color:#fff;font-size:.95rem;outline:none;font-family:'Cairo',sans-serif;transition:all .35s cubic-bezier(.16,1,.3,1);font-weight:600}
      .men-field input:focus{border-color:#4a7aff;background:rgba(74,122,255,.06);box-shadow:0 0 0 4px rgba(74,122,255,.12);transform:translateY(-1px)}
      .men-field input:not(:placeholder-shown),.men-field input:focus{padding-top:24px;padding-bottom:6px}
      .men-field label{position:absolute;right:52px;top:50%;transform:translateY(-50%);color:#6a7290;font-size:.92rem;font-weight:600;pointer-events:none;transition:all .3s cubic-bezier(.16,1,.3,1);padding:0 6px}
      .men-field input:focus + label,.men-field input:not(:placeholder-shown) + label{top:15px;font-size:.7rem;color:#6a9aff;font-weight:800;transform:translateY(-50%)}
      .men-field .men-icon{position:absolute;right:18px;top:50%;transform:translateY(-50%);color:#4a7aff;font-size:1rem;transition:all .3s}
      .men-field input:focus ~ .men-icon{color:#6a9aff;transform:translateY(-50%) scale(1.15)}
      .men-field .men-eye{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#5a607a;font-size:.95rem;cursor:pointer;padding:8px;transition:all .3s;border-radius:50%;background:transparent;border:none}
      .men-field .men-eye:hover{color:#4a7aff;background:rgba(74,122,255,.1)}
      .men-strength{margin:-4px 0 14px;height:22px;display:flex;align-items:center;gap:10px;opacity:0;max-height:0;overflow:hidden;transition:all .4s cubic-bezier(.16,1,.3,1)}
      .men-strength.show{opacity:1;max-height:40px;margin-top:8px}
      .men-strength-bars{flex:1;display:flex;gap:4px}
      .men-strength-bar{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
      .men-strength-bar::after{content:'';position:absolute;inset:0;border-radius:4px;transform:scaleX(0);transform-origin:right;transition:transform .5s cubic-bezier(.16,1,.3,1)}
      .men-strength.s1 .men-strength-bar:nth-child(1)::after{transform:scaleX(1);background:linear-gradient(90deg,#d90429,#ff4d4d)}
      .men-strength.s2 .men-strength-bar:nth-child(-n+2)::after{transform:scaleX(1);background:linear-gradient(90deg,#f5b342,#ffb700)}
      .men-strength.s3 .men-strength-bar:nth-child(-n+3)::after{transform:scaleX(1);background:linear-gradient(90deg,#4a7aff,#6a9aff)}
      .men-strength.s4 .men-strength-bar::after{transform:scaleX(1);background:linear-gradient(90deg,#4caf50,#66bb6a)}
      .men-strength-label{font-size:.72rem;font-weight:800;white-space:nowrap;min-width:60px;text-align:left}
      .men-strength.s1 .men-strength-label{color:#ff4d4d}.men-strength.s2 .men-strength-label{color:#ffb700}
      .men-strength.s3 .men-strength-label{color:#6a9aff}.men-strength.s4 .men-strength-label{color:#4caf50}
      .men-error{margin:8px 0;padding:0 16px;max-height:0;overflow:hidden;background:rgba(217,4,41,.08);border:1px solid rgba(217,4,41,.2);border-radius:14px;color:#ff8a8a;font-size:.82rem;font-weight:700;text-align:center;transition:all .4s cubic-bezier(.16,1,.3,1);display:flex;align-items:center;justify-content:center;gap:8px}
      .men-error.show{max-height:80px;padding:12px 16px;margin:8px 0 14px}
      .men-row{display:flex;align-items:center;justify-content:space-between;margin:6px 0 18px;font-size:.82rem}
      .men-remember{display:flex;align-items:center;gap:8px;color:#8a92b0;font-weight:600;cursor:pointer;user-select:none}
      .men-remember input{display:none}
      .men-check{width:18px;height:18px;border-radius:6px;border:1.5px solid rgba(74,122,255,.3);background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:all .3s;position:relative}
      .men-remember input:checked ~ .men-check{background:linear-gradient(135deg,#021ca4,#4a7aff);border-color:transparent;box-shadow:0 0 0 3px rgba(74,122,255,.15)}
      .men-check::after{content:'\\f00c';font-family:'Font Awesome 6 Free';font-weight:900;font-size:.6rem;color:#fff;opacity:0;transform:scale(0);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
      .men-remember input:checked ~ .men-check::after{opacity:1;transform:scale(1)}
      .men-forgot{color:#6a9aff;font-weight:700;cursor:pointer;text-decoration:none;transition:all .3s}
      .men-forgot:hover{color:#4a7aff;text-shadow:0 0 20px rgba(74,122,255,.6)}
      .men-submit{position:relative;width:100%;height:56px;border:none;border-radius:16px;background:linear-gradient(135deg,#021ca4 0%,#4a7aff 100%);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:1rem;cursor:pointer;overflow:hidden;transition:all .4s cubic-bezier(.16,1,.3,1);box-shadow:0 12px 36px -10px rgba(74,122,255,.7);display:flex;align-items:center;justify-content:center;gap:10px}
      .men-submit::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,#4a7aff,#021ca4);opacity:0;transition:opacity .4s}
      .men-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 20px 50px -10px rgba(74,122,255,.9)}
      .men-submit:hover:not(:disabled)::before{opacity:1}
      .men-submit:active:not(:disabled){transform:translateY(0) scale(.98)}
      .men-submit:disabled{cursor:not-allowed;opacity:.85}
      .men-submit .men-submit-inner{position:relative;z-index:2;display:flex;align-items:center;gap:10px}
      .men-submit .men-spinner{width:20px;height:20px;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:menSpin .7s linear infinite;display:none}
      .men-submit.loading .men-spinner{display:block}
      .men-submit.loading .men-submit-icon{display:none}
      @keyframes menSpin{to{transform:rotate(360deg)}}
      .men-switch{text-align:center;margin-top:20px;color:#8a92b0;font-size:.85rem;font-weight:600}
      .men-switch a{color:#6a9aff;font-weight:800;cursor:pointer;margin-right:6px;position:relative;text-decoration:none;transition:all .3s}
      .men-switch a::after{content:'';position:absolute;bottom:-3px;right:0;width:0;height:1.5px;background:#4a7aff;transition:width .35s cubic-bezier(.16,1,.3,1)}
      .men-switch a:hover{color:#4a7aff}
      .men-switch a:hover::after{width:100%}
      .men-success-overlay{position:absolute;inset:0;background:linear-gradient(145deg,rgba(14,20,38,.98),rgba(8,12,24,.99));z-index:100;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;border-radius:32px;opacity:0;transition:opacity .4s}
      .men-success-overlay.show{display:flex;opacity:1}
      .men-check-circle{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#66bb6a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:38px;animation:menCheckPop .6s cubic-bezier(.34,1.56,.64,1)}
      @keyframes menCheckPop{0%{transform:scale(0) rotate(-45deg);opacity:0}60%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      .men-success-overlay p{color:#4caf50;font-weight:800;font-size:1.1rem}
      .men-confetti{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000}
      .men-confetti-piece{position:absolute;width:10px;height:10px;border-radius:2px;animation:menConfettiFall 3s linear forwards}
      @keyframes menConfettiFall{0%{transform:translateY(-100vh) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}

      /* ═══════════════════════════════════════════════════════
         ACCOUNT PAGE — الصفحة الكاملة
         ═══════════════════════════════════════════════════════ */
      #menAccountPage{display:none}
      #menAccountPage.active{display:block;animation:menPageIn .55s cubic-bezier(.16,1,.3,1)}
      @keyframes menPageIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}

      .men-acc-wrap{padding:22px 0 80px}

      /* ═══ Breadcrumb ═══ */
      .men-acc-bread{display:flex;align-items:center;gap:10px;padding:14px 0 8px;font-size:.88rem;color:#8a92b0;flex-wrap:wrap}
      .men-acc-bread a{color:#a8b0cc;text-decoration:none;cursor:pointer;font-weight:600}
      .men-acc-bread a:hover{color:#6a9aff}
      .men-acc-bread .sep{color:#4a5070;font-size:.7rem}
      .men-acc-bread .cur{color:#fff;font-weight:700}

      /* ═══ Back Button ═══ */
      .men-acc-back{display:inline-flex;align-items:center;gap:10px;background:rgba(74,122,255,.08);border:1px solid rgba(74,122,255,.15);border-radius:60px;padding:10px 22px;color:#6a9aff;font-weight:700;cursor:pointer;transition:all .3s;font-family:'Cairo',sans-serif;font-size:.9rem;margin:12px 0 26px}
      .men-acc-back:hover{background:rgba(74,122,255,.18);transform:translateX(4px)}

      /* ═══ Hero Cover ═══ */
      .men-acc-cover{position:relative;border-radius:36px;overflow:hidden;background:linear-gradient(135deg,rgba(2,28,164,.6) 0%,rgba(74,122,255,.25) 50%,rgba(6,8,18,.95) 100%);border:1px solid rgba(74,122,255,.22);box-shadow:0 40px 100px -30px rgba(2,28,164,.8),inset 0 1px 0 rgba(255,255,255,.08);margin-bottom:26px;isolation:isolate}
      .men-acc-cover::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 20%,rgba(74,122,255,.4),transparent 45%),radial-gradient(circle at 88% 85%,rgba(245,179,66,.2),transparent 45%);pointer-events:none;z-index:0}
      .men-acc-cover::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(74,122,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(74,122,255,.05) 1px,transparent 1px);background-size:40px 40px;mask-image:radial-gradient(circle at center,black 30%,transparent 75%);pointer-events:none;z-index:0;opacity:.6}
      .men-acc-cover-inner{position:relative;z-index:2;padding:50px 44px 40px;display:flex;align-items:center;gap:30px;flex-wrap:wrap}
      .men-acc-cover-avatar-wrap{position:relative;flex-shrink:0}
      .men-acc-cover-avatar{width:130px;height:130px;border-radius:50%;border:4px solid #4a7aff;object-fit:cover;background:#0a0e1a;box-shadow:0 0 0 10px rgba(74,122,255,.12),0 25px 60px -15px rgba(74,122,255,.8);transition:transform .5s cubic-bezier(.16,1,.3,1);position:relative;z-index:2}
      .men-acc-cover-avatar:hover{transform:scale(1.05) rotate(-4deg)}
      .men-acc-avatar-ring{position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(from 0deg,#4a7aff,#f5b342,#4caf50,#4a7aff);animation:menRingSpin 6s linear infinite;z-index:1;filter:blur(1px);opacity:.7}
      @keyframes menRingSpin{to{transform:rotate(360deg)}}
      .men-acc-verified{position:absolute;bottom:6px;left:6px;width:34px;height:34px;border-radius:50%;background:linear-gradient(135deg,#4a7aff,#6a9aff);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.85rem;border:3px solid #0a0e1a;z-index:3;box-shadow:0 6px 20px rgba(74,122,255,.6)}
      .men-acc-cover-info{flex:1;min-width:240px}
      .men-acc-cover-name{font-size:clamp(1.6rem,3vw,2.4rem);font-weight:900;color:#fff;letter-spacing:-1px;line-height:1.2;margin-bottom:8px;text-shadow:0 4px 30px rgba(0,0,0,.5)}
      .men-acc-cover-name span{background:linear-gradient(135deg,#fff 30%,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent}
      .men-acc-cover-email{color:#cdd6ea;font-size:1rem;font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:16px;flex-wrap:wrap}
      .men-acc-cover-email i{color:#4a7aff}
      .men-acc-cover-tags{display:flex;gap:8px;flex-wrap:wrap}
      .men-acc-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);backdrop-filter:blur(10px);border:1px solid rgba(255,255,255,.12);border-radius:60px;padding:6px 14px;font-size:.78rem;font-weight:700;color:#e0e6f4}
      .men-acc-tag i{font-size:.75rem}
      .men-acc-tag.blue{color:#6a9aff;border-color:rgba(74,122,255,.3);background:rgba(74,122,255,.12)}
      .men-acc-tag.gold{color:#f5b342;border-color:rgba(245,179,66,.3);background:rgba(245,179,66,.12)}
      .men-acc-tag.green{color:#66bb6a;border-color:rgba(76,175,80,.3);background:rgba(76,175,80,.12)}
      .men-acc-cover-actions{margin-top:20px;display:flex;gap:10px;flex-wrap:wrap}
      .men-acc-cover-btn{padding:11px 22px;border-radius:60px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .35s cubic-bezier(.16,1,.3,1)}
      .men-acc-cover-btn.primary{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 10px 30px -8px rgba(74,122,255,.7)}
      .men-acc-cover-btn.primary:hover{transform:translateY(-3px);box-shadow:0 16px 40px -8px rgba(74,122,255,.9)}
      .men-acc-cover-btn.ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#e0e6f4;backdrop-filter:blur(10px)}
      .men-acc-cover-btn.ghost:hover{background:rgba(255,255,255,.12);transform:translateY(-3px)}

      /* ═══ Stats Grid ═══ */
      .men-acc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:26px}
      .men-acc-stat{position:relative;background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.12);border-radius:22px;padding:22px 20px;overflow:hidden;transition:all .45s cubic-bezier(.16,1,.3,1)}
      .men-acc-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#4a7aff);opacity:.8;transition:opacity .3s}
      .men-acc-stat:hover{transform:translateY(-6px);border-color:rgba(74,122,255,.35);box-shadow:0 22px 50px -15px rgba(2,28,164,.6)}
      .men-acc-stat:hover::before{opacity:1}
      .men-acc-stat .men-acc-stat-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;margin-bottom:14px;background:var(--icon-bg);color:var(--accent)}
      .men-acc-stat .men-acc-stat-val{font-size:1.75rem;font-weight:900;color:#fff;line-height:1.1;margin-bottom:4px;letter-spacing:-1px}
      .men-acc-stat .men-acc-stat-lbl{font-size:.78rem;color:#8a92b0;font-weight:700;letter-spacing:.3px}

      /* ═══ Tabs ═══ */
      .men-acc-tabs{display:flex;gap:6px;background:rgba(10,16,32,.6);border:1px solid rgba(74,122,255,.1);border-radius:60px;padding:6px;margin-bottom:28px;overflow-x:auto;backdrop-filter:blur(12px);scrollbar-width:none}
      .men-acc-tabs::-webkit-scrollbar{display:none}
      .men-acc-tab{flex:1;min-width:130px;padding:13px 20px;border-radius:60px;background:transparent;border:none;color:#8a92b0;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;transition:all .35s cubic-bezier(.16,1,.3,1);white-space:nowrap}
      .men-acc-tab:hover:not(.active){background:rgba(74,122,255,.08);color:#fff}
      .men-acc-tab.active{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 8px 24px -6px rgba(74,122,255,.6)}

      /* ═══ Tab Panels ═══ */
      .men-acc-panel{display:none}
      .men-acc-panel.active{display:block;animation:menPanelIn .5s cubic-bezier(.16,1,.3,1)}
      @keyframes menPanelIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}

      /* ═══ Overview Grid ═══ */
      .men-acc-overview{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}
      .men-acc-card{background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.12);border-radius:26px;padding:26px 28px;backdrop-filter:blur(12px);transition:all .35s}
      .men-acc-card:hover{border-color:rgba(74,122,255,.25)}
      .men-acc-card-title{font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:20px;display:flex;align-items:center;gap:12px}
      .men-acc-card-title .icn{width:38px;height:38px;border-radius:12px;background:rgba(74,122,255,.12);color:#6a9aff;border:1px solid rgba(74,122,255,.2);display:flex;align-items:center;justify-content:center;font-size:.95rem;flex-shrink:0}

      /* ═══ Cashback Card ═══ */
      .men-acc-cashback{position:relative;background:linear-gradient(135deg,#021ca4 0%,#041580 55%,#021ca4 100%);border-radius:26px;padding:32px 30px;color:#fff;overflow:hidden;box-shadow:0 30px 70px -20px rgba(2,28,164,.9);border:1px solid rgba(74,122,255,.35)}
      .men-acc-cashback::before{content:'';position:absolute;top:-80px;right:-80px;width:260px;height:260px;background:radial-gradient(circle,rgba(74,122,255,.5),transparent 70%);border-radius:50%;animation:menBalanceGlow 4s ease-in-out infinite}
      .men-acc-cashback::after{content:'';position:absolute;bottom:-60px;left:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(245,179,66,.25),transparent 70%);border-radius:50%;animation:menBalanceGlow 5s ease-in-out infinite reverse}
      @keyframes menBalanceGlow{0%,100%{transform:scale(1);opacity:.7}50%{transform:scale(1.2);opacity:1}}
      .men-acc-cashback .cc-chip{position:relative;z-index:2;width:52px;height:40px;border-radius:8px;background:linear-gradient(135deg,#f5b342,#c98a1e);margin-bottom:22px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.3),0 6px 18px rgba(245,179,66,.4);display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:rgba(0,0,0,.4)}
      .men-acc-cashback .cc-label{position:relative;z-index:2;font-size:.82rem;opacity:.92;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-weight:800;letter-spacing:.5px}
      .men-acc-cashback .cc-amount{position:relative;z-index:2;font-size:clamp(2.2rem,5vw,3rem);font-weight:900;letter-spacing:-2px;line-height:1;display:flex;align-items:baseline;gap:12px}
      .men-acc-cashback .cc-amount small{font-size:1.1rem;font-weight:700;opacity:.9}
      .men-acc-cashback .cc-note{position:relative;z-index:2;margin-top:18px;display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);padding:8px 16px;border-radius:20px;font-size:.78rem;font-weight:700;border:1px solid rgba(74,122,255,.3)}
      .men-acc-cashback .cc-num{position:absolute;bottom:24px;left:28px;z-index:2;font-size:.78rem;letter-spacing:3px;font-family:monospace;opacity:.55;font-weight:800}

      /* ═══ Info List ═══ */
      .men-acc-info-list{display:flex;flex-direction:column;gap:12px}
      .men-acc-info-row{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(74,122,255,.05);border:1px solid rgba(74,122,255,.1);border-radius:16px;transition:all .3s}
      .men-acc-info-row:hover{background:rgba(74,122,255,.1);border-color:rgba(74,122,255,.25);transform:translateX(-4px)}
      .men-acc-info-row .ic{width:38px;height:38px;border-radius:12px;background:rgba(74,122,255,.12);color:#6a9aff;display:flex;align-items:center;justify-content:center;font-size:.9rem;flex-shrink:0}
      .men-acc-info-row .txt{flex:1;min-width:0}
      .men-acc-info-row .lbl{font-size:.7rem;color:#8a92b0;text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:2px}
      .men-acc-info-row .val{color:#fff;font-weight:700;font-size:.92rem;word-break:break-all}

      /* ═══ Orders ═══ */
      .men-acc-orders-list{display:flex;flex-direction:column;gap:14px}
      .men-acc-order{background:linear-gradient(145deg,rgba(14,20,38,.6),rgba(8,12,24,.8));border:1px solid rgba(74,122,255,.12);border-radius:20px;padding:20px 22px;transition:all .35s cubic-bezier(.16,1,.3,1);position:relative;overflow:hidden}
      .men-acc-order:hover{transform:translateY(-3px);border-color:rgba(74,122,255,.3);box-shadow:0 15px 40px -12px rgba(2,28,164,.5)}
      .men-acc-order-header{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}
      .men-acc-order-id{font-weight:800;color:#fff;font-size:.95rem;display:flex;align-items:center;gap:10px}
      .men-acc-order-id .dot{width:8px;height:8px;border-radius:50%;background:#4caf50;box-shadow:0 0 12px rgba(76,175,80,.8);animation:menDotPulse 1.8s ease-in-out infinite}
      @keyframes menDotPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.3);opacity:.6}}
      .men-acc-order-date{color:#8a92b0;font-size:.78rem;display:flex;align-items:center;gap:6px;font-weight:600}
      .men-acc-order-body{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
      .men-acc-order-items{flex:1;min-width:200px;color:#a8b0cc;font-size:.85rem;line-height:1.7}
      .men-acc-order-total{font-size:1.3rem;font-weight:900;background:linear-gradient(135deg,#fff,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent;letter-spacing:-.5px}
      .men-acc-order-badge{position:absolute;top:12px;left:12px;background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;font-size:.62rem;font-weight:800;padding:4px 10px;border-radius:20px}

      /* ═══ Empty State ═══ */
      .men-acc-empty{text-align:center;padding:60px 24px;background:rgba(74,122,255,.04);border:1.5px dashed rgba(74,122,255,.2);border-radius:24px}
      .men-acc-empty-icon{width:90px;height:90px;margin:0 auto 20px;border-radius:50%;background:rgba(74,122,255,.1);display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#4a7aff}
      .men-acc-empty h3{color:#fff;font-size:1.2rem;margin-bottom:8px;font-weight:800}
      .men-acc-empty p{color:#8a92b0;font-size:.88rem;margin-bottom:20px}
      .men-acc-empty button{padding:12px 26px;border-radius:60px;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .3s}
      .men-acc-empty button:hover{transform:translateY(-2px);box-shadow:0 12px 36px -8px rgba(74,122,255,.7)}

      /* ═══ Settings Form ═══ */
      .men-acc-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
      .men-acc-form-field{margin-bottom:0}
      .men-acc-form-field label{display:block;font-size:.75rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
      .men-acc-form-field input{width:100%;padding:14px 20px;border-radius:14px;background:rgba(0,0,0,.3);border:1.5px solid rgba(74,122,255,.12);color:#fff;font-family:'Cairo',sans-serif;font-size:.92rem;font-weight:600;outline:none;transition:all .3s}
      .men-acc-form-field input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.12);background:rgba(74,122,255,.06)}
      .men-acc-form-field input:disabled{opacity:.5;cursor:not-allowed}
      .men-acc-settings-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
      .men-acc-settings-actions button{padding:13px 26px;border-radius:60px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .35s cubic-bezier(.16,1,.3,1)}
      .men-acc-settings-actions .save{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 10px 30px -8px rgba(74,122,255,.6)}
      .men-acc-settings-actions .save:hover{transform:translateY(-3px);box-shadow:0 16px 40px -8px rgba(74,122,255,.9)}
      .men-acc-settings-actions .danger{background:rgba(217,4,41,.12);border:1px solid rgba(217,4,41,.3);color:#ff6b6b}
      .men-acc-settings-actions .danger:hover{background:rgba(217,4,41,.22);transform:translateY(-3px)}

      /* ═══ Danger Zone ═══ */
      .men-acc-danger{margin-top:20px;padding:22px 24px;background:rgba(217,4,41,.06);border:1px solid rgba(217,4,41,.2);border-radius:20px}
      .men-acc-danger h4{color:#ff6b6b;font-size:1rem;margin-bottom:8px;font-weight:800;display:flex;align-items:center;gap:10px}
      .men-acc-danger p{color:#d0a8a8;font-size:.85rem;margin-bottom:14px;line-height:1.7}

      /* ═══ Responsive ═══ */
      @media (max-width:992px){
        .men-acc-stats{grid-template-columns:repeat(2,1fr)}
        .men-acc-overview{grid-template-columns:1fr}
        .men-acc-settings-grid{grid-template-columns:1fr}
      }
      @media (max-width:768px){
        .men-acc-cover-inner{padding:34px 24px 28px;flex-direction:column;text-align:center;gap:22px}
        .men-acc-cover-avatar{width:110px;height:110px}
        .men-acc-cover-email{justify-content:center}
        .men-acc-cover-tags{justify-content:center}
        .men-acc-cover-actions{justify-content:center}
        .men-acc-tab{min-width:auto;padding:11px 14px;font-size:.8rem}
        .men-acc-tab span{display:none}
        .men-acc-card{padding:22px 20px}
        .men-acc-cashback{padding:26px 22px}
        .men-acc-stat{padding:18px 16px}
        .men-acc-stat .men-acc-stat-val{font-size:1.4rem}
        .men-acc-stat .men-acc-stat-icon{width:38px;height:38px;font-size:1rem;margin-bottom:10px}
      }
      @media (max-width:480px){
        .men-acc-stats{grid-template-columns:1fr 1fr;gap:10px}
        .men-acc-cover-name{font-size:1.5rem}
        .men-acc-cover-btn{padding:9px 16px;font-size:.78rem}
        .men-acc-order{padding:16px 18px}
        .men-acc-order-total{font-size:1.1rem}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════
  // 🎊 Confetti
  // ═══════════════════════════════════════════════════════════
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
  // 🖼️ بناء عناصر DOM
  // ═══════════════════════════════════════════════════════════
  function injectModals() {
    if ($('menAuthModal')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="menAuthModal" class="men-modal">
        <div class="men-backdrop" data-close></div>
        <div class="men-card" id="menAuthCard">
          <button class="men-close" data-close type="button"><i class="fas fa-times"></i></button>
          <div class="men-badge"><i class="fas fa-fingerprint" id="menAuthBadgeIcon"></i></div>
          <h2 class="men-title" id="menAuthTitle">تسجيل الدخول</h2>
          <p class="men-subtitle" id="menAuthSubtitle">أهلاً بعودتك 👋</p>
          <div class="men-field"><input type="email" id="menAuthEmail" placeholder=" " autocomplete="email" dir="ltr"><label for="menAuthEmail">البريد الإلكتروني</label><i class="fas fa-envelope men-icon"></i></div>
          <div class="men-field"><input type="password" id="menAuthPassword" placeholder=" " autocomplete="current-password" dir="ltr"><label for="menAuthPassword">كلمة المرور</label><i class="fas fa-lock men-icon"></i><button class="men-eye" id="menTogglePass" type="button"><i class="fas fa-eye"></i></button></div>
          <div class="men-strength" id="menStrength"><div class="men-strength-bars"><div class="men-strength-bar"></div><div class="men-strength-bar"></div><div class="men-strength-bar"></div><div class="men-strength-bar"></div></div><span class="men-strength-label" id="menStrengthLabel"></span></div>
          <div class="men-field" id="menNameField" style="display:none"><input type="text" id="menAuthName" placeholder=" " autocomplete="name"><label for="menAuthName">الاسم الكامل</label><i class="fas fa-user men-icon"></i></div>
          <div class="men-field" id="menPhoneField" style="display:none"><input type="tel" id="menAuthPhone" placeholder=" " autocomplete="tel" dir="ltr"><label for="menAuthPhone">رقم الجوال</label><i class="fas fa-phone men-icon"></i></div>
          <div class="men-row" id="menRowOptions">
            <label class="men-remember"><input type="checkbox" id="menRemember" checked><span class="men-check"></span><span>تذكرني</span></label>
            <a class="men-forgot" id="menForgotBtn">نسيت كلمة المرور؟</a>
          </div>
          <div class="men-error" id="menError"><i class="fas fa-circle-exclamation"></i><span id="menErrorText"></span></div>
          <button class="men-submit" id="menSubmit" type="button"><span class="men-submit-inner"><i class="fas fa-arrow-left men-submit-icon"></i><span class="men-spinner"></span><span id="menSubmitText">دخول</span></span></button>
          <div class="men-switch"><span id="menSwitchText">ليس لديك حساب؟</span><a id="menSwitchBtn">إنشاء حساب جديد</a></div>
          <div class="men-success-overlay" id="menSuccessOverlay"><div class="men-check-circle"><i class="fas fa-check"></i></div><p>تم بنجاح!</p></div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeAuth));
    $('menTogglePass').addEventListener('click', () => {
      const inp = $('menAuthPassword'), ico = $('menTogglePass').querySelector('i');
      if (inp.type === 'password') { inp.type = 'text'; ico.className = 'fas fa-eye-slash'; }
      else { inp.type = 'password'; ico.className = 'fas fa-eye'; }
    });
    $('menAuthPassword').addEventListener('input', updateStrength);
    $('menAuthPassword').addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    $('menAuthEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPassword').focus(); });
    $('menRemember').addEventListener('change', function () { rememberMe = this.checked; });
    $('menSwitchBtn').addEventListener('click', switchMode);
    $('menSubmit').addEventListener('click', handleSubmit);
    $('menForgotBtn').addEventListener('click', handleForgot);
  }

  // ═══ Inject Account Page ═══
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
          <!-- ═══ COVER ═══ -->
          <div class="men-acc-cover">
            <div class="men-acc-cover-inner">
              <div class="men-acc-cover-avatar-wrap">
                <div class="men-acc-avatar-ring"></div>
                <img class="men-acc-cover-avatar" id="menAccCoverAvatar" src="" alt="">
                <div class="men-acc-verified"><i class="fas fa-check"></i></div>
              </div>
              <div class="men-acc-cover-info">
                <h1 class="men-acc-cover-name"><span id="menAccCoverName">—</span></h1>
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

          <!-- ═══ STATS ═══ -->
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
              <div class="men-acc-stat-val" id="menAccStatSince" style="font-size:1.1rem">—</div>
              <div class="men-acc-stat-lbl">عضو منذ</div>
            </div>
          </div>

          <!-- ═══ TABS ═══ -->
          <div class="men-acc-tabs">
            <button class="men-acc-tab active" data-macc-tab="overview" type="button"><i class="fas fa-house"></i> <span>نظرة عامة</span></button>
            <button class="men-acc-tab" data-macc-tab="orders" type="button"><i class="fas fa-box"></i> <span>طلباتي</span></button>
            <button class="men-acc-tab" data-macc-tab="settings" type="button"><i class="fas fa-gear"></i> <span>الإعدادات</span></button>
          </div>

          <!-- ═══ PANEL: OVERVIEW ═══ -->
          <div class="men-acc-panel active" data-macc-panel="overview">
            <div class="men-acc-overview">
              <div class="men-acc-cashback">
                <div class="cc-chip"><i class="fas fa-microchip"></i></div>
                <div class="cc-label"><i class="fas fa-wallet"></i> رصيد الكاش باك</div>
                <div class="cc-amount"><span id="menAccCashbackBig">0.00</span> <small>ر.س</small></div>
                <div class="cc-note"><i class="fas fa-gift"></i> تكسب 2% على كل طلب</div>
                <div class="cc-num">•••• •••• •••• <span id="menAccCardNum">2024</span></div>
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

          <!-- ═══ PANEL: ORDERS ═══ -->
          <div class="men-acc-panel" data-macc-panel="orders">
            <div class="men-acc-card">
              <div class="men-acc-card-title"><span class="icn"><i class="fas fa-receipt"></i></span> سجل الطلبات</div>
              <div class="men-acc-orders-list" id="menAccOrdersList"></div>
            </div>
          </div>

          <!-- ═══ PANEL: SETTINGS ═══ -->
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
              <p>حذف الحساب سيؤدي إلى فقدان جميع بياناتك، رصيد الكاش باك، وسجل الطلبات نهائياً. هذا الإجراء لا يمكن التراجع عنه.</p>
              <button class="men-acc-settings-actions danger" id="menAccDeleteBtn" type="button" style="padding:12px 24px;border-radius:60px;border:1px solid rgba(217,4,41,.3);background:rgba(217,4,41,.12);color:#ff6b6b;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px"><i class="fas fa-trash"></i> حذف الحساب</button>
            </div>
          </div>
        </div>
      </div>
    `;
    main.appendChild(page);

    // ═══ Bind Account Page Events ═══
    $('menAccBackBtn').addEventListener('click', closeAccount);
    $('menAccShopNow').addEventListener('click', closeAccount);
    page.querySelectorAll('[data-macc-nav]').forEach(a =>
      a.addEventListener('click', closeAccount));

    page.querySelectorAll('[data-macc-tab]').forEach(btn =>
      btn.addEventListener('click', () => switchTab(btn.dataset.maccTab)));

    $('menAccSaveBtn').addEventListener('click', saveProfile);
    $('menAccLogoutBtn').addEventListener('click', logout);
    $('menAccDeleteBtn').addEventListener('click', deleteAccount);
    $('menAccShareBtn').addEventListener('click', shareAccount);
  }

  function switchTab(tab) {
    document.querySelectorAll('[data-macc-tab]').forEach(b =>
      b.classList.toggle('active', b.dataset.maccTab === tab));
    document.querySelectorAll('[data-macc-panel]').forEach(p =>
      p.classList.toggle('active', p.dataset.maccPanel === tab));
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 تعبئة الصفحة
  // ═══════════════════════════════════════════════════════════
  function fillAccountPage(user) {
    const meta = user.user_metadata || {};
    const orders = Array.isArray(meta.orders) ? meta.orders : [];
    const cashback = Number(meta.cashback || 0);
    const totalSpent = orders.reduce((s, o) => s + Number(o.total || 0), 0);

    const avatar = meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email || 'M')}&background=021ca4&color=fff&bold=true&size=300`;
    const name = meta.name || user.email?.split('@')[0] || 'مستخدم';
    const since = user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : '—';

    // Cover
    $('menAccCoverAvatar').src = avatar;
    $('menAccCoverName').textContent = name;
    $('menAccCoverEmail').textContent = user.email || '—';

    // Member level
    let level = 'برونزي', lvlIcon = '🥉';
    if (orders.length >= 20 || totalSpent >= 1000) { level = 'ذهبي'; lvlIcon = '🥇'; }
    else if (orders.length >= 5 || totalSpent >= 300) { level = 'فضي'; lvlIcon = '🥈'; }
    $('menAccMemberLevel').textContent = `${lvlIcon} ${level}`;

    // Stats
    $('menAccStatOrders').textContent = orders.length;
    $('menAccStatCashback').textContent = cashback.toFixed(2);
    $('menAccStatSpent').textContent = totalSpent.toFixed(2);
    $('menAccStatSince').textContent = since;

    // Cashback card
    $('menAccCashbackBig').textContent = cashback.toFixed(2);
    $('menAccCardNum').textContent = String(user.id || '').slice(-4).padStart(4, '0') || '2024';

    // Info
    $('menAccInfoName').textContent = name;
    $('menAccInfoEmail').textContent = user.email || '—';
    $('menAccInfoPhone').textContent = meta.phone || '—';
    $('menAccInfoId').textContent = '#' + String(user.id || '').slice(0, 8).toUpperCase();

    // Settings
    $('menAccSetName').value = meta.name || '';
    $('menAccSetPhone').value = meta.phone || '';
    $('menAccSetEmail').value = user.email || '';

    // Orders
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

  // ═══════════════════════════════════════════════════════════
  // 🔧 Operations
  // ═══════════════════════════════════════════════════════════
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

  async function deleteAccount() {
    if (!confirm('⚠️ هل أنت متأكد من حذف حسابك نهائياً؟\nهذا الإجراء لا يمكن التراجع عنه.')) return;
    if (!confirm('تأكيد أخير: سيتم فقدان كل بياناتك.')) return;
    if (window.showToast) window.showToast('تواصل مع الدعم لحذف الحساب: clan.men.ts@gmail.com', 'info');
  }

  function shareAccount() {
    const user = currentUser;
    if (!user) return;
    const text = `🎮 أنا عضو في MEN Store!\nانضم إلينا واحصل على كاش باك 2%\n${location.origin}`;
    if (navigator.share) {
      navigator.share({ title: 'MEN Store', text, url: location.origin }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text).then(() => {
        if (window.showToast) window.showToast('📋 تم نسخ الرابط', 'success');
      });
    }
  }

  // ═══ Password Strength ═══
  function updateStrength() {
    const p = $('menAuthPassword').value;
    const el = $('menStrength');
    if (!p) { el.classList.remove('show','s1','s2','s3','s4'); return; }
    el.classList.add('show');
    let score = 0;
    if (p.length >= 6) score++;
    if (p.length >= 10) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    el.classList.remove('s1','s2','s3','s4');
    el.classList.add('s' + Math.max(1, score));
    const labels = ['', 'ضعيفة', 'مقبولة', 'قوية', 'ممتازة'];
    $('menStrengthLabel').textContent = labels[Math.max(1, score)];
  }

  // ═══ Switch Mode ═══
  function switchMode() { authMode = authMode === 'login' ? 'signup' : 'login'; renderMode(); }
  function renderMode() {
    const login = authMode === 'login';
    const card = $('menAuthCard');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'menCardIn .55s cubic-bezier(.16,1,.3,1)';
    $('menAuthBadgeIcon').className = login ? 'fas fa-fingerprint' : 'fas fa-user-plus';
    $('menAuthTitle').textContent = login ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    $('menAuthSubtitle').textContent = login ? 'أهلاً بعودتك 👋' : 'انضم إلينا واحصل على كاش باك 2% 🎁';
    $('menSubmitText').textContent = login ? 'دخول' : 'إنشاء الحساب';
    $('menSwitchText').textContent = login ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
    $('menSwitchBtn').textContent = login ? 'إنشاء حساب جديد' : 'سجّل دخولك';
    $('menNameField').style.display = login ? 'none' : 'block';
    $('menPhoneField').style.display = login ? 'none' : 'block';
    $('menRowOptions').style.display = login ? 'flex' : 'none';
    $('menStrength').classList.remove('show');
    clearError();
  }

  function showError(msg) {
    $('menErrorText').textContent = msg;
    $('menError').classList.add('show');
    const card = $('menAuthCard');
    card.classList.remove('men-shake');
    void card.offsetWidth;
    card.classList.add('men-shake');
  }
  function clearError() { $('menError').classList.remove('show'); }

  // ═══ Open/Close ═══
  function open(mode) {
    injectCSS();
    injectModals();
    authMode = mode === 'signup' ? 'signup' : 'login';
    renderMode();
    $('menAuthModal').classList.add('active');
    setTimeout(() => $('menAuthEmail')?.focus(), 250);
  }
  function closeAuth() { $('menAuthModal')?.classList.remove('active'); clearError(); }

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

  // ═══ Submit ═══
  async function handleSubmit() {
    const email = $('menAuthEmail').value.trim().toLowerCase();
    const password = $('menAuthPassword').value;
    const name = $('menAuthName').value.trim();
    const phone = $('menAuthPhone').value.trim();
    clearError();
    if (!email || !password) return showError('الرجاء إدخال البريد وكلمة المرور');
    if (!email.includes('@')) return showError('صيغة البريد غير صحيحة');
    if (authMode === 'signup') {
      if (password.length < 6) return showError('كلمة المرور 6 أحرف على الأقل');
      if (!name) return showError('الرجاء إدخال الاسم');
    }
    const btn = $('menSubmit');
    btn.disabled = true;
    btn.classList.add('loading');
    try {
      if (authMode === 'login') {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await showSuccessThen('مرحباً بك! 👋');
        launchConfetti();
      } else {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, phone, cashback: 0, orders: [] } }
        });
        if (error) throw error;
        if (!data.session) { showError('📧 تم التسجيل! افتح بريدك وأكّد الحساب.'); return; }
        await showSuccessThen('تم إنشاء حسابك 🎉');
        launchConfetti();
      }
    } catch (err) {
      console.error('[AUTH ERROR]', err);
      const m = (err.message || '').toLowerCase();
      if (m.includes('email not confirmed')) showError('⚠️ بريدك غير مؤكد — افتح بريدك');
      else if (m.includes('invalid login')) showError('❌ البريد أو كلمة المرور خطأ');
      else if (m.includes('already registered')) showError('📧 البريد مسجل — جرّب الدخول');
      else if (m.includes('too many')) showError('⏳ محاولات كثيرة — انتظر دقيقة');
      else showError(err.message || 'حدث خطأ');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  function showSuccessThen(msg) {
    return new Promise(r => {
      $('menSuccessOverlay').classList.add('show');
      if (window.showToast) setTimeout(() => window.showToast(msg, 'success'), 400);
      setTimeout(() => { $('menSuccessOverlay').classList.remove('show'); closeAuth(); r(); }, 1300);
    });
  }

  async function handleForgot() {
    const email = $('menAuthEmail').value.trim().toLowerCase();
    if (!email || !email.includes('@')) { showError('اكتب بريدك أولاً'); $('menAuthEmail').focus(); return; }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      if (window.showToast) window.showToast('📧 أرسلنا رابط الاستعادة', 'success');
      clearError();
    } catch (err) { showError(err.message || 'فشل الإرسال'); }
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
      if ($('menAccountPage')?.classList.contains('active') && session?.user) {
        fillAccountPage(session.user);
      }
    });

    // ═══ ربط زر الأفاتار بفتح الحساب ═══
    const av = $('menHeaderAvatar');
    if (av && !av.dataset.bound) {
      av.dataset.bound = '1';
      av.addEventListener('click', openAccount);
    }

    // ═══ دعم هاش #account ═══
    if (location.hash === '#account') {
      setTimeout(() => { if (currentUser) openAccount(); }, 500);
    }

    console.log('%c🔐 Auth جاهز', 'color:#4a7aff;font-weight:bold');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }

  // ═══ Debug ═══
  window.MEN_DEBUG = async () => {
    const { data } = await sb.auth.getSession();
    console.log('Session:', data.session);
    console.log('User:', data.session?.user);
  };
})();
