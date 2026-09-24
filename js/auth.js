/* ============================================================
   ✨ MEN Store — Auth v3 (Premium Edition)
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
    window.MEN_AUTH = {
      CASHBACK_RATE: 0.02,
      open: () => alert(' أضف مفاتيح Supabase في js/auth.js'),
      openAccount: () => alert(' أضف مفاتيح Supabase'),
      logout: () => {},
      getCurrentUser: () => null,
      addCashback: async () => {},
      deductCashback: async () => {},
      addOrder: async () => {}
    };
    return;
  }

  if (!window.supabase?.createClient) {
    console.error('[MEN_AUTH] Supabase SDK غير محمّل');
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

  console.log('%c MEN AUTH v3', 'background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;letter-spacing:1px');

  const CASHBACK_RATE = 0.02;
  let currentUser = null;
  let authMode = 'login';
  let rememberMe = true;
  const $ = id => document.getElementById(id);

  // ═══════════════════════════════════════════════════════════
  // 🎨 حقن CSS الفخم
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if ($('menAuthStyles')) return;
    const style = document.createElement('style');
    style.id = 'menAuthStyles';
    style.textContent = `
      /* ═══ Modal Shell ═══ */
      .men-modal{position:fixed;inset:0;z-index:9999;display:none;align-items:center;justify-content:center;padding:20px;font-family:'Cairo','Outfit',sans-serif}
      .men-modal.active{display:flex}
      .men-backdrop{position:absolute;inset:0;background:rgba(2,4,12,.88);backdrop-filter:blur(24px) saturate(180%);-webkit-backdrop-filter:blur(24px) saturate(180%);animation:menFade .4s ease}
      @keyframes menFade{from{opacity:0}to{opacity:1}}

      /* ═══ Animated Background Orbs ═══ */
      .men-modal::before,.men-modal::after{content:'';position:absolute;border-radius:50%;filter:blur(80px);opacity:.5;pointer-events:none;z-index:1}
      .men-modal::before{width:400px;height:400px;background:radial-gradient(circle,#4a7aff,transparent 70%);top:-100px;left:-100px;animation:menOrb1 12s ease-in-out infinite}
      .men-modal::after{width:350px;height:350px;background:radial-gradient(circle,#f5b342,transparent 70%);bottom:-100px;right:-100px;animation:menOrb2 14s ease-in-out infinite}
      @keyframes menOrb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(80px,60px) scale(1.2)}}
      @keyframes menOrb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-60px,-40px) scale(1.15)}}

      /* ═══ Card Shell ═══ */
      .men-card{position:relative;z-index:5;width:100%;max-width:460px;background:linear-gradient(145deg,rgba(14,20,38,.96),rgba(8,12,24,.98));border:1px solid rgba(74,122,255,.2);border-radius:32px;padding:44px 38px 36px;box-shadow:0 40px 120px rgba(0,0,0,.8),0 0 0 1px rgba(74,122,255,.08) inset,0 0 80px rgba(74,122,255,.15);animation:menCardIn .55s cubic-bezier(.16,1,.3,1);overflow:hidden}
      .men-card::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,#4a7aff,#f5b342,#4a7aff,transparent);background-size:200% 100%;animation:menShimmer 3s linear infinite}
      @keyframes menShimmer{to{background-position:-200% 0}}
      @keyframes menCardIn{from{opacity:0;transform:translateY(30px) scale(.94)}to{opacity:1;transform:translateY(0) scale(1)}}
      .men-card.men-shake{animation:menShake .5s cubic-bezier(.36,.07,.19,.97)}
      @keyframes menShake{10%,90%{transform:translateX(-2px)}20%,80%{transform:translateX(4px)}30%,50%,70%{transform:translateX(-8px)}40%,60%{transform:translateX(8px)}}

      /* ═══ Close Button ═══ */
      .men-close{position:absolute;top:20px;left:22px;width:38px;height:38px;border-radius:50%;background:rgba(74,122,255,.08);border:1px solid rgba(74,122,255,.15);color:#8a92b0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .35s cubic-bezier(.16,1,.3,1);z-index:10}
      .men-close:hover{background:rgba(217,4,41,.15);border-color:rgba(217,4,41,.3);color:#ff6b6b;transform:rotate(180deg) scale(1.1)}

      /* ═══ Icon Badge ═══ */
      .men-badge{width:72px;height:72px;margin:0 auto 18px;border-radius:24px;background:linear-gradient(135deg,#021ca4 0%,#4a7aff 100%);display:flex;align-items:center;justify-content:center;font-size:28px;color:#fff;box-shadow:0 20px 50px -10px rgba(74,122,255,.7),inset 0 2px 0 rgba(255,255,255,.2);position:relative;transition:all .5s cubic-bezier(.16,1,.3,1);animation:menBadgeFloat 3s ease-in-out infinite}
      @keyframes menBadgeFloat{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
      .men-badge::after{content:'';position:absolute;inset:-4px;border-radius:26px;background:linear-gradient(135deg,#4a7aff,#f5b342,#4a7aff);background-size:200% 200%;z-index:-1;opacity:.4;animation:menBadgeGlow 4s ease infinite}
      @keyframes menBadgeGlow{0%,100%{background-position:0% 50%;opacity:.4}50%{background-position:100% 50%;opacity:.8}}

      /* ═══ Titles ═══ */
      .men-title{text-align:center;font-size:1.65rem;font-weight:900;color:#fff;margin-bottom:8px;letter-spacing:-.5px;background:linear-gradient(135deg,#fff 30%,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.3}
      .men-subtitle{text-align:center;color:#8a92b0;font-size:.88rem;margin-bottom:30px;font-weight:600}

      /* ═══ Floating Input ═══ */
      .men-field{position:relative;margin-bottom:16px}
      .men-field input{width:100%;padding:22px 52px 8px 18px;height:60px;background:rgba(0,0,0,.3);border:1.5px solid rgba(74,122,255,.12);border-radius:16px;color:#fff;font-size:.95rem;outline:none;font-family:'Cairo',sans-serif;transition:all .35s cubic-bezier(.16,1,.3,1);font-weight:600}
      .men-field input:focus{border-color:#4a7aff;background:rgba(74,122,255,.06);box-shadow:0 0 0 4px rgba(74,122,255,.12),0 8px 24px -8px rgba(74,122,255,.4);transform:translateY(-1px)}
      .men-field input:not(:placeholder-shown),
      .men-field input:focus{padding-top:24px;padding-bottom:6px}
      .men-field label{position:absolute;right:52px;top:50%;transform:translateY(-50%);color:#6a7290;font-size:.92rem;font-weight:600;pointer-events:none;transition:all .3s cubic-bezier(.16,1,.3,1);background:linear-gradient(180deg,transparent 45%,rgba(14,20,38,.95) 45%,rgba(14,20,38,.95) 55%,transparent 55%);padding:0 6px}
      .men-field input:focus + label,
      .men-field input:not(:placeholder-shown) + label{top:15px;font-size:.7rem;color:#6a9aff;font-weight:800;letter-spacing:.5px;transform:translateY(-50%)}
      .men-field .men-icon{position:absolute;right:18px;top:50%;transform:translateY(-50%);color:#4a7aff;font-size:1rem;transition:all .3s}
      .men-field input:focus ~ .men-icon{color:#6a9aff;transform:translateY(-50%) scale(1.15)}
      .men-field .men-eye{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:#5a607a;font-size:.95rem;cursor:pointer;padding:8px;transition:all .3s;border-radius:50%;background:transparent;border:none}
      .men-field .men-eye:hover{color:#4a7aff;background:rgba(74,122,255,.1)}

      /* ═══ Password Strength ═══ */
      .men-strength{margin:-4px 0 14px;height:22px;display:flex;align-items:center;gap:10px;opacity:0;max-height:0;overflow:hidden;transition:all .4s cubic-bezier(.16,1,.3,1)}
      .men-strength.show{opacity:1;max-height:40px;margin-top:8px}
      .men-strength-bars{flex:1;display:flex;gap:4px}
      .men-strength-bar{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
      .men-strength-bar::after{content:'';position:absolute;inset:0;border-radius:4px;transform:scaleX(0);transform-origin:right;transition:transform .5s cubic-bezier(.16,1,.3,1)}
      .men-strength.s1 .men-strength-bar:nth-child(1)::after{transform:scaleX(1);background:linear-gradient(90deg,#d90429,#ff4d4d)}
      .men-strength.s2 .men-strength-bar:nth-child(-n+2)::after{transform:scaleX(1);background:linear-gradient(90deg,#f5b342,#ffb700)}
      .men-strength.s3 .men-strength-bar:nth-child(-n+3)::after{transform:scaleX(1);background:linear-gradient(90deg,#4a7aff,#6a9aff)}
      .men-strength.s4 .men-strength-bar::after{transform:scaleX(1);background:linear-gradient(90deg,#4caf50,#66bb6a)}
      .men-strength-label{font-size:.72rem;font-weight:800;letter-spacing:.5px;white-space:nowrap;min-width:60px;text-align:left}
      .men-strength.s1 .men-strength-label{color:#ff4d4d}
      .men-strength.s2 .men-strength-label{color:#ffb700}
      .men-strength.s3 .men-strength-label{color:#6a9aff}
      .men-strength.s4 .men-strength-label{color:#4caf50}

      /* ═══ Error Box ═══ */
      .men-error{margin:8px 0;padding:0 16px;max-height:0;overflow:hidden;background:rgba(217,4,41,.08);border:1px solid rgba(217,4,41,.2);border-radius:14px;color:#ff8a8a;font-size:.82rem;font-weight:700;text-align:center;transition:all .4s cubic-bezier(.16,1,.3,1);display:flex;align-items:center;justify-content:center;gap:8px}
      .men-error.show{max-height:80px;padding:12px 16px;margin:8px 0 14px}

      /* ═══ Remember + Forgot ═══ */
      .men-row{display:flex;align-items:center;justify-content:space-between;margin:6px 0 18px;font-size:.82rem}
      .men-remember{display:flex;align-items:center;gap:8px;color:#8a92b0;font-weight:600;cursor:pointer;user-select:none}
      .men-remember input{display:none}
      .men-check{width:18px;height:18px;border-radius:6px;border:1.5px solid rgba(74,122,255,.3);background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;transition:all .3s;position:relative}
      .men-remember input:checked ~ .men-check{background:linear-gradient(135deg,#021ca4,#4a7aff);border-color:transparent;box-shadow:0 0 0 3px rgba(74,122,255,.15)}
      .men-check::after{content:'\\f00c';font-family:'Font Awesome 6 Free';font-weight:900;font-size:.6rem;color:#fff;opacity:0;transform:scale(0);transition:all .3s cubic-bezier(.34,1.56,.64,1)}
      .men-remember input:checked ~ .men-check::after{opacity:1;transform:scale(1)}
      .men-forgot{color:#6a9aff;font-weight:700;cursor:pointer;text-decoration:none;transition:all .3s}
      .men-forgot:hover{color:#4a7aff;text-shadow:0 0 20px rgba(74,122,255,.6)}

      /* ═══ Submit Button ═══ */
      .men-submit{position:relative;width:100%;height:56px;border:none;border-radius:16px;background:linear-gradient(135deg,#021ca4 0%,#4a7aff 100%);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:1rem;cursor:pointer;overflow:hidden;transition:all .4s cubic-bezier(.16,1,.3,1);box-shadow:0 12px 36px -10px rgba(74,122,255,.7);display:flex;align-items:center;justify-content:center;gap:10px;letter-spacing:.3px}
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

      /* ═══ Switch ═══ */
      .men-switch{text-align:center;margin-top:20px;color:#8a92b0;font-size:.85rem;font-weight:600}
      .men-switch a{color:#6a9aff;font-weight:800;cursor:pointer;margin-right:6px;position:relative;text-decoration:none;transition:all .3s}
      .men-switch a::after{content:'';position:absolute;bottom:-3px;right:0;width:0;height:1.5px;background:#4a7aff;transition:width .35s cubic-bezier(.16,1,.3,1);box-shadow:0 0 10px rgba(74,122,255,.8)}
      .men-switch a:hover{color:#4a7aff}
      .men-switch a:hover::after{width:100%}

      /* ═══ Success Animation ═══ */
      .men-success-overlay{position:absolute;inset:0;background:linear-gradient(145deg,rgba(14,20,38,.98),rgba(8,12,24,.99));z-index:100;display:none;flex-direction:column;align-items:center;justify-content:center;gap:18px;border-radius:32px;opacity:0;transition:opacity .4s}
      .men-success-overlay.show{display:flex;opacity:1}
      .men-check-circle{width:88px;height:88px;border-radius:50%;background:linear-gradient(135deg,#4caf50,#66bb6a);display:flex;align-items:center;justify-content:center;color:#fff;font-size:38px;box-shadow:0 0 0 0 rgba(76,175,80,.5);animation:menCheckPop .6s cubic-bezier(.34,1.56,.64,1),menCheckPulse 1.5s ease-out .6s}
      @keyframes menCheckPop{0%{transform:scale(0) rotate(-45deg);opacity:0}60%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      @keyframes menCheckPulse{0%{box-shadow:0 0 0 0 rgba(76,175,80,.6)}100%{box-shadow:0 0 0 30px rgba(76,175,80,0)}}
      .men-success-overlay p{color:#4caf50;font-weight:800;font-size:1.1rem;letter-spacing:.5px}

      /* ═══ Account Modal ═══ */
      .men-account-card{max-width:520px;padding:0;overflow:hidden;border-radius:32px}
      .men-account-hero{position:relative;padding:48px 32px 30px;background:linear-gradient(135deg,rgba(2,28,164,.6),rgba(74,122,255,.2));text-align:center;overflow:hidden;border-radius:32px 32px 0 0}
      .men-account-hero::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 50% 0%,rgba(74,122,255,.5),transparent 65%);pointer-events:none}
      .men-account-hero::after{content:'';position:absolute;bottom:-50%;left:-50%;width:200%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,.05),transparent);transform:rotate(-12deg);animation:menHeroShine 5s linear infinite}
      @keyframes menHeroShine{0%{transform:translateX(-100%) rotate(-12deg)}100%{transform:translateX(100%) rotate(-12deg)}}
      .men-acc-avatar{position:relative;z-index:2;width:104px;height:104px;border-radius:50%;border:4px solid #4a7aff;object-fit:cover;background:#0a0e1a;box-shadow:0 0 0 8px rgba(74,122,255,.15),0 20px 50px -10px rgba(74,122,255,.7);margin-bottom:16px;transition:all .5s cubic-bezier(.16,1,.3,1)}
      .men-acc-avatar:hover{transform:scale(1.05) rotate(-3deg)}
      .men-acc-name{position:relative;z-index:2;font-size:1.5rem;font-weight:900;color:#fff;margin-bottom:6px;letter-spacing:-.5px}
      .men-acc-email{position:relative;z-index:2;color:#a8b0cc;font-size:.88rem;font-weight:600}
      .men-acc-body{padding:28px 30px 32px}
      .men-acc-balance{position:relative;background:linear-gradient(135deg,#021ca4 0%,#041580 55%,#021ca4 100%);border-radius:22px;padding:24px 28px;color:#fff;margin-bottom:18px;overflow:hidden;box-shadow:0 20px 50px -15px rgba(2,28,164,.9);border:1px solid rgba(74,122,255,.3)}
      .men-acc-balance::before{content:'';position:absolute;top:-60px;right:-60px;width:200px;height:200px;background:radial-gradient(circle,rgba(74,122,255,.4),transparent 70%);border-radius:50%;animation:menBalanceGlow 3s ease-in-out infinite}
      @keyframes menBalanceGlow{0%,100%{transform:scale(1);opacity:.6}50%{transform:scale(1.2);opacity:1}}
      .men-acc-balance .lbl{position:relative;z-index:2;font-size:.82rem;opacity:.92;margin-bottom:8px;display:flex;align-items:center;gap:8px;font-weight:700}
      .men-acc-balance .val{position:relative;z-index:2;font-size:2.6rem;font-weight:900;letter-spacing:-2px;display:flex;align-items:baseline;gap:10px;line-height:1}
      .men-acc-balance .val small{font-size:1rem;font-weight:600;opacity:.9}
      .men-acc-balance .note{position:relative;z-index:2;font-size:.74rem;opacity:.92;margin-top:12px;display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);padding:7px 14px;border-radius:20px;border:1px solid rgba(74,122,255,.25);font-weight:700}
      .men-acc-stats{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:22px}
      .men-acc-stat{background:rgba(74,122,255,.05);border:1px solid rgba(74,122,255,.12);border-radius:16px;padding:16px 18px;transition:all .35s cubic-bezier(.16,1,.3,1)}
      .men-acc-stat:hover{background:rgba(74,122,255,.1);border-color:rgba(74,122,255,.3);transform:translateY(-3px)}
      .men-acc-stat .lbl{font-size:.68rem;color:#8a92b0;text-transform:uppercase;letter-spacing:1.5px;font-weight:800;margin-bottom:6px;display:flex;align-items:center;gap:6px}
      .men-acc-stat .lbl i{color:#4a7aff;font-size:.8rem}
      .men-acc-stat .val{color:#fff;font-weight:800;font-size:1rem;word-break:break-all}
      .men-acc-actions{display:flex;gap:10px}
      .men-acc-btn{flex:1;padding:14px 16px;border-radius:16px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;transition:all .35s cubic-bezier(.16,1,.3,1)}
      .men-acc-btn.primary{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 10px 30px -8px rgba(74,122,255,.6)}
      .men-acc-btn.primary:hover{transform:translateY(-3px);box-shadow:0 16px 40px -8px rgba(74,122,255,.9)}
      .men-acc-btn.danger{background:rgba(217,4,41,.1);border:1px solid rgba(217,4,41,.3);color:#ff6b6b}
      .men-acc-btn.danger:hover{background:rgba(217,4,41,.2);transform:translateY(-3px)}

      /* ═══ Confetti ═══ */
      .men-confetti{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10000}
      .men-confetti-piece{position:absolute;width:10px;height:10px;border-radius:2px;animation:menConfettiFall 3s linear forwards}
      @keyframes menConfettiFall{0%{transform:translateY(-100vh) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}

      /* ═══ Mobile ═══ */
      @media (max-width:480px){
        .men-card{padding:36px 24px 28px;border-radius:26px}
        .men-badge{width:60px;height:60px;font-size:24px;border-radius:20px}
        .men-title{font-size:1.35rem}
        .men-subtitle{font-size:.8rem;margin-bottom:24px}
        .men-field input{height:56px;padding:20px 48px 6px 16px}
        .men-acc-balance .val{font-size:2rem}
        .men-acc-stats{grid-template-columns:1fr}
      }
    `;
    document.head.appendChild(style);
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
  // 🖼️ بناء المودالات
  // ═══════════════════════════════════════════════════════════
  function injectModals() {
    if ($('menAuthModal')) return;

    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <!-- ═══ AUTH MODAL ═══ -->
      <div id="menAuthModal" class="men-modal">
        <div class="men-backdrop" data-close></div>
        <div class="men-card" id="menAuthCard">
          <button class="men-close" data-close type="button"><i class="fas fa-times"></i></button>

          <div class="men-badge" id="menAuthBadge">
            <i class="fas fa-fingerprint" id="menAuthBadgeIcon"></i>
          </div>

          <h2 class="men-title" id="menAuthTitle">تسجيل الدخول</h2>
          <p class="men-subtitle" id="menAuthSubtitle">أهلاً بعودتك 👋 سجّل دخولك للمتابعة</p>

          <div class="men-field">
            <input type="email" id="menAuthEmail" placeholder=" " autocomplete="email" dir="ltr">
            <label for="menAuthEmail">البريد الإلكتروني</label>
            <i class="fas fa-envelope men-icon"></i>
          </div>

          <div class="men-field">
            <input type="password" id="menAuthPassword" placeholder=" " autocomplete="current-password" dir="ltr">
            <label for="menAuthPassword">كلمة المرور</label>
            <i class="fas fa-lock men-icon"></i>
            <button class="men-eye" id="menTogglePass" type="button"><i class="fas fa-eye"></i></button>
          </div>

          <div class="men-strength" id="menStrength">
            <div class="men-strength-bars">
              <div class="men-strength-bar"></div>
              <div class="men-strength-bar"></div>
              <div class="men-strength-bar"></div>
              <div class="men-strength-bar"></div>
            </div>
            <span class="men-strength-label" id="menStrengthLabel"></span>
          </div>

          <div class="men-field" id="menNameField" style="display:none">
            <input type="text" id="menAuthName" placeholder=" " autocomplete="name">
            <label for="menAuthName">الاسم الكامل</label>
            <i class="fas fa-user men-icon"></i>
          </div>

          <div class="men-field" id="menPhoneField" style="display:none">
            <input type="tel" id="menAuthPhone" placeholder=" " autocomplete="tel" dir="ltr">
            <label for="menAuthPhone">رقم الجوال</label>
            <i class="fas fa-phone men-icon"></i>
          </div>

          <div class="men-row" id="menRowOptions">
            <label class="men-remember">
              <input type="checkbox" id="menRemember" checked>
              <span class="men-check"></span>
              <span>تذكرني</span>
            </label>
            <a class="men-forgot" id="menForgotBtn">نسيت كلمة المرور؟</a>
          </div>

          <div class="men-error" id="menError">
            <i class="fas fa-circle-exclamation"></i>
            <span id="menErrorText"></span>
          </div>

          <button class="men-submit" id="menSubmit" type="button">
            <span class="men-submit-inner">
              <i class="fas fa-arrow-left men-submit-icon"></i>
              <span class="men-spinner"></span>
              <span id="menSubmitText">دخول</span>
            </span>
          </button>

          <div class="men-switch">
            <span id="menSwitchText">ليس لديك حساب؟</span>
            <a id="menSwitchBtn">إنشاء حساب جديد</a>
          </div>

          <div class="men-success-overlay" id="menSuccessOverlay">
            <div class="men-check-circle"><i class="fas fa-check"></i></div>
            <p>تم بنجاح!</p>
          </div>
        </div>
      </div>

      <!-- ═══ ACCOUNT MODAL ═══ -->
      <div id="menAccountModal" class="men-modal">
        <div class="men-backdrop" data-close-acc></div>
        <div class="men-card men-account-card">
          <button class="men-close" data-close-acc type="button"><i class="fas fa-times"></i></button>

          <div class="men-account-hero">
            <img class="men-acc-avatar" id="menAccAvatar" src="" alt="">
            <div class="men-acc-name" id="menAccName">—</div>
            <div class="men-acc-email" id="menAccEmail">—</div>
          </div>

          <div class="men-acc-body">
            <div class="men-acc-balance">
              <div class="lbl"><i class="fas fa-wallet"></i> رصيد الكاش باك</div>
              <div class="val"><span id="menAccCashback">0.00</span> <small>ر.س</small></div>
              <div class="note"><i class="fas fa-gift"></i> تكسب 2% على كل طلب</div>
            </div>

            <div class="men-acc-stats">
              <div class="men-acc-stat">
                <div class="lbl"><i class="fas fa-phone"></i> الجوال</div>
                <div class="val" id="menAccPhone">—</div>
              </div>
              <div class="men-acc-stat">
                <div class="lbl"><i class="fas fa-box"></i> عدد الطلبات</div>
                <div class="val" id="menAccOrders">0</div>
              </div>
            </div>

            <div class="men-acc-actions">
              <button class="men-acc-btn primary" id="menAccShop" type="button">
                <i class="fas fa-shopping-bag"></i> تسوق الآن
              </button>
              <button class="men-acc-btn danger" id="menAccLogout" type="button">
                <i class="fas fa-sign-out-alt"></i> خروج
              </button>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    // ═══ Bind Events ═══
    wrap.querySelectorAll('[data-close]').forEach(el =>
      el.addEventListener('click', closeAuth));
    wrap.querySelectorAll('[data-close-acc]').forEach(el =>
      el.addEventListener('click', closeAccount));

    $('menTogglePass').addEventListener('click', () => {
      const inp = $('menAuthPassword');
      const ico = $('menTogglePass').querySelector('i');
      if (inp.type === 'password') {
        inp.type = 'text';
        ico.className = 'fas fa-eye-slash';
      } else {
        inp.type = 'password';
        ico.className = 'fas fa-eye';
      }
    });

    $('menAuthPassword').addEventListener('input', updateStrength);
    $('menAuthPassword').addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    $('menAuthEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPassword').focus(); });
    $('menRemember').addEventListener('change', function () { rememberMe = this.checked; });
    $('menSwitchBtn').addEventListener('click', switchMode);
    $('menSubmit').addEventListener('click', handleSubmit);
    $('menForgotBtn').addEventListener('click', handleForgot);

    $('menAccLogout').addEventListener('click', logout);
    $('menAccShop').addEventListener('click', closeAccount);

    const av = $('menHeaderAvatar');
    if (av) av.addEventListener('click', openAccount);
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
  function switchMode() {
    authMode = authMode === 'login' ? 'signup' : 'login';
    renderMode();
  }

  function renderMode() {
    const login = authMode === 'login';
    const card = $('menAuthCard');
    card.style.animation = 'none';
    void card.offsetWidth;
    card.style.animation = 'menCardIn .55s cubic-bezier(.16,1,.3,1)';

    $('menAuthBadgeIcon').className = login ? 'fas fa-fingerprint' : 'fas fa-user-plus';
    $('menAuthTitle').textContent    = login ? 'تسجيل الدخول' : 'إنشاء حساب جديد';
    $('menAuthSubtitle').textContent = login ? 'أهلاً بعودتك 👋 سجّل دخولك للمتابعة' : 'انضم إلينا واحصل على كاش باك 2% 🎁';
    $('menSubmitText').textContent   = login ? 'دخول' : 'إنشاء الحساب';
    $('menSwitchText').textContent   = login ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
    $('menSwitchBtn').textContent    = login ? 'إنشاء حساب جديد' : 'سجّل دخولك';
    $('menNameField').style.display  = login ? 'none' : 'block';
    $('menPhoneField').style.display = login ? 'none' : 'block';
    $('menRowOptions').style.display = login ? 'flex' : 'none';
    $('menStrength').classList.remove('show');
    clearError();
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
  function closeAccount() { $('menAccountModal')?.classList.remove('active'); }

  async function openAccount() {
    if (!currentUser) return open('login');
    injectCSS();
    injectModals();
    fillAccount(currentUser);
    $('menAccountModal').classList.add('active');
    const { data } = await sb.auth.getUser();
    if (data?.user) { currentUser = data.user; fillAccount(data.user); }
  }

  // ═══ Fill Account ═══
  function fillAccount(user) {
    const meta = user.user_metadata || {};
    $('menAccAvatar').src   = meta.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email||'M')}&background=021ca4&color=fff&bold=true&size=200`;
    $('menAccName').textContent  = meta.name || user.email?.split('@')[0] || 'مستخدم';
    $('menAccEmail').textContent = user.email || '—';
    $('menAccPhone').textContent = meta.phone || '—';
    $('menAccCashback').textContent = Number(meta.cashback || 0).toFixed(2);
    $('menAccOrders').textContent   = Array.isArray(meta.orders) ? meta.orders.length : 0;
  }

  // ═══ Submit ═══
  async function handleSubmit() {
    const email    = $('menAuthEmail').value.trim().toLowerCase();
    const password = $('menAuthPassword').value;
    const name     = $('menAuthName').value.trim();
    const phone    = $('menAuthPhone').value.trim();

    clearError();

    if (!email || !password) return showError('الرجاء إدخال البريد وكلمة المرور');
    if (!email.includes('@')) return showError('صيغة البريد الإلكتروني غير صحيحة');
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
        console.log('✅ تسجيل دخول:', data.user?.email);
        await showSuccessThen('مرحباً بك! 👋');
        launchConfetti();
      } else {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, phone, cashback: 0, orders: [] } }
        });
        if (error) throw error;
        if (!data.session) {
          showError('📧 تم التسجيل! افتح بريدك وأكّد الحساب.');
          return;
        }
        console.log('✅ تم التسجيل:', data.user?.email);
        await showSuccessThen('تم إنشاء حسابك 🎉');
        launchConfetti();
      }
    } catch (err) {
      console.error('[AUTH ERROR]', err);
      const m = (err.message || '').toLowerCase();
      if (m.includes('email not confirmed'))
        showError('⚠️ بريدك غير مؤكد — افتح بريدك واضغط رابط التأكيد');
      else if (m.includes('invalid login'))
        showError('❌ البريد أو كلمة المرور غير صحيحة');
      else if (m.includes('already registered'))
        showError('📧 البريد مسجل بالفعل — جرّب تسجيل الدخول');
      else if (m.includes('too many'))
        showError('⏳ محاولات كثيرة — انتظر دقيقة');
      else
        showError(err.message || 'حدث خطأ غير متوقع');
    } finally {
      btn.disabled = false;
      btn.classList.remove('loading');
    }
  }

  function showSuccessThen(msg) {
    return new Promise(resolve => {
      $('menSuccessOverlay').classList.add('show');
      if (typeof window.showToast === 'function')
        setTimeout(() => window.showToast(msg, 'success'), 400);
      setTimeout(() => {
        $('menSuccessOverlay').classList.remove('show');
        closeAuth();
        resolve();
      }, 1300);
    });
  }

  // ═══ Forgot Password ═══
  async function handleForgot() {
    const email = $('menAuthEmail').value.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      showError('اكتب بريدك أولاً لاستعادة كلمة المرور');
      $('menAuthEmail').focus();
      return;
    }
    try {
      const { error } = await sb.auth.resetPasswordForEmail(email, {
        redirectTo: location.origin + location.pathname
      });
      if (error) throw error;
      if (typeof window.showToast === 'function')
        window.showToast('📧 أرسلنا رابط الاستعادة إلى بريدك', 'success');
      clearError();
    } catch (err) {
      showError(err.message || 'فشل الإرسال');
    }
  }

  // ═══ Logout ═══
  async function logout() {
    await sb.auth.signOut();
    closeAccount();
    if (typeof window.showToast === 'function')
      window.showToast('تم تسجيل الخروج 👋', 'info');
  }

  // ═══ Sync UI ═══
  function syncUI(user) {
    currentUser = user;
    const loginBtn = $('menLoginBtn');
    const avatar   = $('menHeaderAvatar');
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
    }
    const mLogin   = $('menMobileLogin');
    const mAccount = $('menMobileAccount');
    if (mLogin)   mLogin.style.display   = user ? 'none' : 'flex';
    if (mAccount) mAccount.style.display = user ? 'flex' : 'none';
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
  }

  // ═══ Public API ═══
  window.MEN_AUTH = {
    CASHBACK_RATE,
    open,
    openAccount,
    logout,
    getCurrentUser: () => currentUser,
    addCashback: async (amount) => {
      if (!currentUser || amount <= 0) return;
      const c = Number(currentUser.user_metadata?.cashback || 0) + Number(amount);
      await sb.auth.updateUser({ data: { cashback: Math.round(c * 100) / 100 } });
    },
    deductCashback: async (amount) => {
      if (!currentUser || amount <= 0) return;
      const c = Math.max(0, Number(currentUser.user_metadata?.cashback || 0) - Number(amount));
      await sb.auth.updateUser({ data: { cashback: Math.round(c * 100) / 100 } });
    },
    addOrder: async (order) => {
      if (!currentUser) return;
      const orders = currentUser.user_metadata?.orders || [];
      orders.push({ ...order, date: new Date().toISOString() });
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
    });

    console.log('%c🔐 Auth جاهز — اضغط "دخول"', 'color:#4a7aff;font-weight:bold');
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
  window.MEN_TEST_LOGIN = async (email, password) => {
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    console.log('DATA:', data); console.log('ERROR:', error);
    return { data, error };
  };
})();
