/* ============================================================
   ✨ MEN Store — Auth v12
   (Deep Blue Theme + Orders + Users + Customer Chat + Cashback)
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
    console.error('⛔ ضع مفاتيح Supabase');
    window.MEN_AUTH = { CASHBACK_RATE: 0.02, open: () => alert('⚠️ أضف المفاتيح'), openAccount: () => {}, logout: () => {}, getCurrentUser: () => null, getCashbackBalance: async () => 0, addOrder: async () => null };
    return;
  }

  if (!window.supabase?.createClient) { console.error('[MEN_AUTH] SDK غير محمّل'); return; }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, storageKey: 'men-auth-token', storage: window.localStorage, flowType: 'pkce' }
  });
  window.MEN_SUPABASE = sb;

  console.log('%c✨ MEN AUTH v12 · Deep Blue', 'background:linear-gradient(135deg,#0a1a5c,#2563eb);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;letter-spacing:1px');

  const CASHBACK_RATE = 0.02;
  const PHONE_DOMAIN  = 'men-store.local';
  const ADMIN_EMAILS  = ['mkmkmkl24666606@gmail.com'];
  const SUPPORT_NAME  = 'فريق الدعم';   // ← اسم ثابت بدل اسم المشرف
  const SUPPORT_INITIAL = 'M';         // ← أول حرف للأفاتار

  let currentUser = null;
  let authMode = 'login';
  let rememberMe = true;
  let chatPollTimer = null;
  let chatLastCount = 0;
  let chatLastId = null;
  let chatUnreadLocal = 0;
  const $ = id => document.getElementById(id);
  const isAdmin = () => !!currentUser && ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());

  // ═══ Helpers ═══
  function normalizePhone(raw) {
    const digits = String(raw || '').replace(/\D/g, '');
    if (!digits) return null;
    if (/^05\d{8}$/.test(digits)) return digits;
    if (/^9665\d{8}$/.test(digits)) return '0' + digits.slice(3);
    if (/^5\d{8}$/.test(digits)) return '0' + digits;
    if (/^\d{8,15}$/.test(digits)) return digits;
    return null;
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function fmtChatTime(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      const now = new Date();
      const diffMs = now - date;
      const diffMin = Math.floor(diffMs / 60000);
      const diffHr = Math.floor(diffMs / 3600000);
      const diffDay = Math.floor(diffMs / 86400000);

      if (diffMin < 1) return 'الآن';
      if (diffMin < 60) return `قبل ${diffMin} د`;
      if (diffHr < 24) return `قبل ${diffHr} س`;
      if (diffDay < 7) return `قبل ${diffDay} ي`;
      return date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'short' });
    } catch { return '—'; }
  }

  function fmtMsgTime(d) {
    if (!d) return '';
    try {
      return new Date(d).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  }

  function makeInitialsAvatar(name, size = 200) {
    const clean = String(name || '').trim();
    const parts = clean.split(/\s+/).filter(Boolean);
    let initials = '?';
    if (parts.length === 0) initials = '?';
    else if (parts.length === 1) initials = parts[0].substring(0, 2);
    else initials = (parts[0][0] || '') + (parts[parts.length - 1][0] || '');
    initials = initials.toUpperCase();

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#0a1a5c"/><stop offset="100%" stop-color="#2563eb"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Cairo,Tajawal,Arial,sans-serif" font-size="${Math.round(size * 0.44)}" font-weight="900" fill="#ffffff">${initials}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ═══ Sound notification (Web Audio API) ═══
  function playPing() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880;
      o.type = 'sine';
      g.gain.setValueAtTime(0, ctx.currentTime);
      g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
      o.start(ctx.currentTime);
      o.stop(ctx.currentTime + 0.4);
      setTimeout(() => ctx.close(), 600);
    } catch (e) { /* ignore */ }
  }

  // ═══════════════════════════════════════════════════════════
  // 🎨 CSS — Deep Blue Theme
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if ($('menAuthStyles')) return;
    const s = document.createElement('style');
    s.id = 'menAuthStyles';
    s.textContent = `
      /* ═══ AUTH SCREEN ═══ */
      .men-screen{position:fixed;inset:0;z-index:9999;display:none;font-family:'Cairo','Outfit',sans-serif;background:#04060f;overflow-y:auto;overflow-x:hidden}
      .men-screen.active{display:block;animation:menFadeIn .35s ease}
      @keyframes menFadeIn{from{opacity:0}to{opacity:1}}
      .men-screen-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background:
        radial-gradient(ellipse 60% 50% at 15% 15%,rgba(10,26,92,.4) 0%,transparent 60%),
        radial-gradient(ellipse 55% 45% at 85% 85%,rgba(30,64,175,.2) 0%,transparent 55%),
        radial-gradient(ellipse at 50% 50%,#04060f 0%,#020408 100%)}
      .men-screen-bg::after{content:'';position:absolute;inset:0;background-image:
        linear-gradient(rgba(37,99,235,.03) 1px,transparent 1px),
        linear-gradient(90deg,rgba(37,99,235,.03) 1px,transparent 1px);
        background-size:64px 64px;
        mask-image:radial-gradient(ellipse at center,black 15%,transparent 70%);
        -webkit-mask-image:radial-gradient(ellipse at center,black 15%,transparent 70%)}
      .men-orb{position:fixed;border-radius:50%;filter:blur(110px);pointer-events:none;z-index:1;opacity:.5}
      .men-orb.o1{width:500px;height:500px;background:radial-gradient(circle,#1e3a8a,transparent 70%);top:-150px;left:-150px;animation:menOrb1 15s ease-in-out infinite}
      .men-orb.o2{width:450px;height:450px;background:radial-gradient(circle,#2563eb,transparent 70%);bottom:-150px;right:-150px;animation:menOrb2 18s ease-in-out infinite}
      .men-orb.o3{width:350px;height:350px;background:radial-gradient(circle,#0ea5e9,transparent 70%);top:40%;right:10%;animation:menOrb1 20s ease-in-out infinite reverse;opacity:.25}
      @keyframes menOrb1{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(100px,80px) scale(1.2)}}
      @keyframes menOrb2{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(-80px,-60px) scale(1.15)}}
      .men-layout{position:relative;z-index:10;min-height:100vh;display:grid;grid-template-columns:1fr 1fr;align-items:stretch}
      .men-showcase{position:relative;display:flex;flex-direction:column;justify-content:space-between;padding:60px 70px;background:linear-gradient(160deg,rgba(10,26,92,.4) 0%,rgba(4,6,15,.9) 100%);border-left:1px solid rgba(37,99,235,.1);overflow:hidden}
      .men-showcase::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 30% 30%,rgba(37,99,235,.22),transparent 55%);pointer-events:none}
      .men-showcase-top{position:relative;z-index:2}
      .men-logo-row{display:flex;align-items:center;gap:14px}
      .men-showcase-center{position:relative;z-index:2;flex:1;display:flex;flex-direction:column;justify-content:center;padding:50px 0}
      .men-showcase-badge{display:inline-flex;align-items:center;gap:8px;background:rgba(37,99,235,.15);border:1px solid rgba(59,130,246,.3);border-radius:60px;padding:8px 18px;font-size:.8rem;color:#60a5fa;font-weight:800;margin-bottom:24px;width:fit-content}
      .men-showcase-title{font-size:clamp(2rem,3.5vw,3rem);font-weight:900;color:#fff;letter-spacing:-1.5px;line-height:1.15;margin-bottom:18px}
      .men-showcase-title span{background:linear-gradient(135deg,#60a5fa,#3b82f6);-webkit-background-clip:text;background-clip:text;color:transparent}
      .men-showcase-desc{color:#a8b0cc;font-size:1rem;line-height:1.9;max-width:480px;margin-bottom:32px;font-weight:500}
      .men-features{display:flex;flex-direction:column;gap:14px}
      .men-feature{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(10,16,32,.6);border:1px solid rgba(37,99,235,.12);border-radius:16px;backdrop-filter:blur(10px);width:fit-content}
      .men-feature-icon{width:40px;height:40px;border-radius:12px;background:linear-gradient(135deg,rgba(37,99,235,.25),rgba(37,99,235,.08));border:1px solid rgba(59,130,246,.25);display:flex;align-items:center;justify-content:center;color:#60a5fa;font-size:1rem;flex-shrink:0}
      .men-feature-text .t{color:#fff;font-weight:800;font-size:.9rem}
      .men-feature-text .s{color:#8a92b0;font-size:.78rem;font-weight:500;margin-top:2px}
      .men-showcase-bottom{position:relative;z-index:2;color:#6a7290;font-size:.8rem;font-weight:600}
      .men-showcase-bottom .stats{display:flex;gap:30px;margin-bottom:20px}
      .men-showcase-bottom .stat .n{color:#fff;font-size:1.5rem;font-weight:900}
      .men-showcase-bottom .stat .l{color:#8a92b0;font-size:.75rem;font-weight:600;margin-top:2px}
      .men-form-panel{position:relative;display:flex;flex-direction:column;padding:50px 60px;background:linear-gradient(180deg,rgba(4,6,15,.6),rgba(4,6,15,.95));backdrop-filter:blur(20px)}
      .men-panel-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:auto}
      .men-close{width:42px;height:42px;border-radius:50%;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.18);color:#8a92b0;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:14px;transition:all .35s}
      .men-close:hover{background:rgba(220,38,38,.15);border-color:rgba(220,38,38,.3);color:#f87171;transform:rotate(180deg) scale(1.08)}
      .men-form-inner{max-width:440px;width:100%;margin:auto;padding:30px 0}
      .men-welcome{margin-bottom:32px;text-align:right}
      .men-welcome h2{font-size:1.9rem;font-weight:900;color:#fff;letter-spacing:-1px;margin-bottom:8px}
      .men-welcome p{color:#8a92b0;font-size:.92rem;font-weight:600;line-height:1.7}
      .men-tabs{position:relative;display:grid;grid-template-columns:1fr 1fr;gap:4px;background:rgba(0,0,0,.35);border:1px solid rgba(37,99,235,.12);border-radius:16px;padding:4px;margin-bottom:26px}
      .men-tab{position:relative;padding:13px 16px;border-radius:12px;background:transparent;border:none;color:#8a92b0;font-family:'Cairo',sans-serif;font-weight:800;font-size:.9rem;cursor:pointer;transition:all .3s;z-index:2;display:flex;align-items:center;justify-content:center;gap:8px}
      .men-tab.active{color:#fff}
      .men-tabs-indicator{position:absolute;top:4px;bottom:4px;left:4px;width:calc(50% - 4px);background:linear-gradient(135deg,#0a1a5c,#1e40af);border-radius:12px;box-shadow:0 6px 18px -4px rgba(30,58,138,.7);transition:transform .4s cubic-bezier(.34,1.4,.64,1);z-index:1}
      .men-tabs[data-mode="signup"] .men-tabs-indicator{transform:translateX(calc(100% + 4px))}
      .men-form{display:flex;flex-direction:column;gap:16px}
      .men-field{position:relative}
      .men-label{display:block;font-size:.74rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:9px;padding-right:4px}
      .men-input-wrap{position:relative;display:flex;align-items:center}
      .men-input-wrap input{width:100%;height:54px;padding:0 48px 0 16px;background:rgba(4,6,15,.5);border:1.5px solid rgba(37,99,235,.15);border-radius:14px;color:#fff;font-size:.94rem;outline:none;font-family:'Cairo',sans-serif;font-weight:600;transition:all .3s}
      .men-input-wrap input::placeholder{color:#4a5070;font-weight:500}
      .men-input-wrap input:focus{border-color:#2563eb;background:rgba(37,99,235,.06);box-shadow:0 0 0 4px rgba(37,99,235,.12)}
      .men-input-wrap .men-icon{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#3b82f6;font-size:.95rem;pointer-events:none}
      .men-input-wrap .men-eye{position:absolute;left:12px;top:50%;transform:translateY(-50%);color:#5a607a;font-size:.9rem;cursor:pointer;padding:8px;border-radius:50%;background:transparent;border:none}
      .men-input-wrap .men-eye:hover{color:#3b82f6;background:rgba(37,99,235,.1)}
      .men-hint{font-size:.72rem;color:#6a7290;font-weight:600;margin-top:7px;padding-right:4px;display:flex;align-items:center;gap:6px}
      .men-hint i{color:#3b82f6;font-size:.75rem}
      .men-strength{height:0;overflow:hidden;transition:all .35s;padding-right:4px}
      .men-strength.show{height:28px;margin-top:6px}
      .men-strength-row{display:flex;align-items:center;gap:10px}
      .men-strength-bars{flex:1;display:flex;gap:4px}
      .men-strength-bar{flex:1;height:4px;border-radius:4px;background:rgba(255,255,255,.08);overflow:hidden;position:relative}
      .men-strength-bar::after{content:'';position:absolute;inset:0;border-radius:4px;transform:scaleX(0);transform-origin:right;transition:transform .45s}
      .men-strength.s1 .men-strength-bar:nth-child(1)::after{transform:scaleX(1);background:linear-gradient(90deg,#dc2626,#ff4d4d)}
      .men-strength.s2 .men-strength-bar:nth-child(-n+2)::after{transform:scaleX(1);background:linear-gradient(90deg,#d4a548,#f5b342)}
      .men-strength.s3 .men-strength-bar:nth-child(-n+3)::after{transform:scaleX(1);background:linear-gradient(90deg,#1e40af,#3b82f6)}
      .men-strength.s4 .men-strength-bar::after{transform:scaleX(1);background:linear-gradient(90deg,#16a34a,#4caf50)}
      .men-strength-label{font-size:.72rem;font-weight:800;white-space:nowrap;min-width:56px;text-align:left}
      .men-opts{display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:.84rem;flex-wrap:wrap}
      .men-remember{display:inline-flex;align-items:center;gap:9px;color:#8a92b0;font-weight:600;cursor:pointer;user-select:none}
      .men-remember input{display:none}
      .men-check{width:18px;height:18px;border-radius:6px;border:1.5px solid rgba(37,99,235,.3);background:rgba(0,0,0,.3);display:flex;align-items:center;justify-content:center;position:relative;flex-shrink:0}
      .men-remember input:checked ~ .men-check{background:linear-gradient(135deg,#0a1a5c,#1e40af);border-color:transparent}
      .men-check::after{content:'\\f00c';font-family:'Font Awesome 6 Free';font-weight:900;font-size:.58rem;color:#fff;opacity:0;transform:scale(0);transition:all .3s}
      .men-remember input:checked ~ .men-check::after{opacity:1;transform:scale(1)}
      .men-forgot{color:#60a5fa;font-weight:700;cursor:pointer;font-size:.84rem;white-space:nowrap}
      .men-forgot:hover{color:#3b82f6}
      .men-error{max-height:0;overflow:hidden;background:rgba(220,38,38,.08);border:1px solid rgba(220,38,38,.2);border-radius:12px;color:#f87171;font-size:.84rem;font-weight:700;text-align:center;transition:all .35s;display:flex;align-items:center;justify-content:center;gap:8px;padding:0 16px}
      .men-error.show{max-height:90px;padding:12px 16px}
      .men-submit{position:relative;width:100%;height:56px;border:none;border-radius:14px;background:linear-gradient(135deg,#0a1a5c 0%,#1e40af 100%);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:1rem;cursor:pointer;transition:all .35s;box-shadow:0 14px 34px -12px rgba(30,58,138,.8);display:flex;align-items:center;justify-content:center;gap:10px;border:1px solid rgba(59,130,246,.15)}
      .men-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 18px 44px -12px rgba(37,99,235,.9)}
      .men-submit:disabled{opacity:.85;cursor:not-allowed}
      .men-spinner{width:18px;height:18px;border:2.5px solid rgba(255,255,255,.25);border-top-color:#fff;border-radius:50%;animation:menSpin .7s linear infinite;display:none}
      .men-submit.loading .men-spinner{display:block}
      .men-submit.loading .men-btn-icon{display:none}
      @keyframes menSpin{to{transform:rotate(360deg)}}
      .men-terms{font-size:.75rem;color:#6a7290;text-align:center;line-height:1.7;font-weight:500}
      .men-terms a{color:#60a5fa;font-weight:700;cursor:pointer}
      .men-success-overlay{position:fixed;inset:0;background:linear-gradient(160deg,rgba(4,6,15,.99),rgba(2,4,10,1));z-index:10000;display:none;flex-direction:column;align-items:center;justify-content:center;gap:20px;opacity:0;transition:opacity .35s}
      .men-success-overlay.show{display:flex;opacity:1}
      .men-check-circle{width:100px;height:100px;border-radius:50%;background:linear-gradient(135deg,#16a34a,#4caf50);display:flex;align-items:center;justify-content:center;color:#fff;font-size:44px;animation:menCheckPop .6s cubic-bezier(.34,1.56,.64,1);box-shadow:0 25px 60px -15px rgba(22,163,74,.8)}
      @keyframes menCheckPop{0%{transform:scale(0) rotate(-45deg);opacity:0}60%{transform:scale(1.15) rotate(8deg)}100%{transform:scale(1) rotate(0);opacity:1}}
      .men-success-overlay p{color:#4caf50;font-weight:800;font-size:1.3rem}
      .men-confetti{position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:10001}
      .men-confetti-piece{position:absolute;width:10px;height:10px;border-radius:2px;animation:menConfettiFall 3s linear forwards}
      @keyframes menConfettiFall{0%{transform:translateY(-100vh) rotate(0);opacity:1}100%{transform:translateY(100vh) rotate(720deg);opacity:0}}
      @media (max-width:992px){.men-layout{grid-template-columns:1fr}.men-showcase{display:none}.men-form-panel{padding:30px 24px;min-height:100vh}}
      @media (max-width:480px){.men-form-panel{padding:24px 18px}.men-welcome h2{font-size:1.5rem}.men-input-wrap input{height:52px}.men-submit{height:54px}.men-tab{font-size:.84rem;padding:12px}}

      /* ═══ ACCOUNT PAGE ═══ */
      #menAccountPage{display:none}
      #menAccountPage.active{display:block;animation:menPageIn .5s}
      @keyframes menPageIn{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
      .men-acc-wrap{padding:22px 0 80px}
      .men-acc-bread{display:flex;align-items:center;gap:10px;padding:14px 0 8px;font-size:.88rem;color:#8a92b0;flex-wrap:wrap}
      .men-acc-bread a{color:#a8b0cc;cursor:pointer;font-weight:600}
      .men-acc-bread a:hover{color:#60a5fa}
      .men-acc-bread .cur{color:#fff;font-weight:700}
      .men-acc-back{display:inline-flex;align-items:center;gap:10px;background:rgba(37,99,235,.08);border:1px solid rgba(37,99,235,.18);border-radius:60px;padding:10px 22px;color:#60a5fa;font-weight:700;cursor:pointer;font-family:'Cairo',sans-serif;font-size:.9rem;margin:12px 0 26px;transition:all .25s}
      .men-acc-back:hover{background:rgba(37,99,235,.15);transform:translateX(-3px)}
      .men-acc-cover{position:relative;border-radius:32px;overflow:hidden;background:linear-gradient(135deg,rgba(10,26,92,.55) 0%,rgba(30,64,175,.22) 50%,rgba(4,6,15,.95) 100%);border:1px solid rgba(37,99,235,.2);box-shadow:0 40px 100px -30px rgba(10,26,92,.8);margin-bottom:24px}
      .men-acc-cover::before{content:'';position:absolute;inset:0;background:radial-gradient(circle at 15% 20%,rgba(37,99,235,.4),transparent 45%),radial-gradient(circle at 88% 85%,rgba(212,165,72,.15),transparent 45%);pointer-events:none}
      .men-acc-cover-inner{position:relative;z-index:2;padding:44px 40px 36px;display:flex;align-items:center;gap:28px;flex-wrap:wrap}
      .men-acc-cover-avatar-wrap{position:relative;flex-shrink:0}
      .men-acc-cover-avatar{width:120px;height:120px;border-radius:50%;border:4px solid #2563eb;object-fit:cover;background:#0a0e1a;box-shadow:0 0 0 10px rgba(37,99,235,.12),0 25px 60px -15px rgba(37,99,235,.8);position:relative;z-index:2}
      .men-acc-avatar-ring{position:absolute;inset:-8px;border-radius:50%;background:conic-gradient(from 0deg,#3b82f6,#d4a548,#4caf50,#3b82f6);animation:menRingSpin 6s linear infinite;z-index:1;filter:blur(1px);opacity:.7}
      @keyframes menRingSpin{to{transform:rotate(360deg)}}
      .men-acc-verified{position:absolute;bottom:6px;left:6px;width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#3b82f6);display:flex;align-items:center;justify-content:center;color:#fff;font-size:.8rem;border:3px solid #0a0e1a;z-index:3}
      .men-acc-cover-info{flex:1;min-width:240px}
      .men-acc-cover-name{font-size:clamp(1.5rem,3vw,2.2rem);font-weight:900;color:#fff;letter-spacing:-1px;margin-bottom:8px}
      .men-acc-cover-email{color:#cdd6ea;font-size:.95rem;font-weight:600;display:flex;align-items:center;gap:8px;margin-bottom:14px;flex-wrap:wrap}
      .men-acc-cover-email i{color:#3b82f6}
      .men-acc-cover-tags{display:flex;gap:8px;flex-wrap:wrap}
      .men-acc-tag{display:inline-flex;align-items:center;gap:6px;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);border-radius:60px;padding:6px 14px;font-size:.78rem;font-weight:700;color:#e0e6f4}
      .men-acc-tag.blue{color:#60a5fa;border-color:rgba(37,99,235,.3);background:rgba(37,99,235,.12)}
      .men-acc-tag.gold{color:#d4a548;border-color:rgba(212,165,72,.3);background:rgba(212,165,72,.12)}
      .men-acc-tag.green{color:#4caf50;border-color:rgba(76,175,80,.3);background:rgba(76,175,80,.12)}
      .men-acc-cover-actions{margin-top:18px;display:flex;gap:10px;flex-wrap:wrap}
      .men-acc-cover-btn{padding:11px 22px;border-radius:60px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .35s}
      .men-acc-cover-btn.primary{background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;box-shadow:0 10px 30px -8px rgba(30,58,138,.7);border:1px solid rgba(59,130,246,.15)}
      .men-acc-cover-btn.primary:hover{transform:translateY(-3px);box-shadow:0 14px 38px -8px rgba(37,99,235,.8)}
      .men-acc-cover-btn.ghost{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#e0e6f4}
      .men-acc-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
      .men-acc-stat{background:linear-gradient(160deg,rgba(12,18,38,.7),rgba(6,10,24,.85));border:1px solid rgba(37,99,235,.12);border-radius:22px;padding:22px 20px;position:relative;overflow:hidden}
      .men-acc-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#2563eb);opacity:.85}
      .men-acc-stat-icon{width:44px;height:44px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.15rem;margin-bottom:14px;background:var(--icon-bg);color:var(--accent)}
      .men-acc-stat-val{font-size:1.75rem;font-weight:900;color:#fff;margin-bottom:4px}
      .men-acc-stat-lbl{font-size:.78rem;color:#8a92b0;font-weight:700}
      .men-acc-tabs{display:flex;gap:6px;background:rgba(6,10,24,.7);border:1px solid rgba(37,99,235,.12);border-radius:60px;padding:6px;margin-bottom:24px;overflow-x:auto;backdrop-filter:blur(12px);scrollbar-width:none}
      .men-acc-tabs::-webkit-scrollbar{display:none}
      .men-acc-tab{flex:1;min-width:120px;padding:13px 18px;border-radius:60px;background:transparent;border:none;color:#8a92b0;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:8px;white-space:nowrap;position:relative;transition:all .3s}
      .men-acc-tab.active{background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;box-shadow:0 8px 24px -6px rgba(30,58,138,.7);border:1px solid rgba(59,130,246,.15)}
      .men-acc-tab .men-chat-badge{position:absolute;top:2px;right:8px;min-width:20px;height:20px;padding:0 6px;border-radius:10px;background:linear-gradient(135deg,#dc2626,#991b1b);color:#fff;font-size:.66rem;font-weight:900;display:flex;align-items:center;justify-content:center;box-shadow:0 0 0 2px rgba(4,6,15,.9);animation:menPulseBadge 2s ease-in-out infinite}
      @keyframes menPulseBadge{0%,100%{transform:scale(1)}50%{transform:scale(1.1)}}
      .men-acc-panel{display:none}
      .men-acc-panel.active{display:block;animation:menPanelIn .5s}
      @keyframes menPanelIn{from{opacity:0;transform:translateY(15px)}to{opacity:1;transform:translateY(0)}}
      .men-acc-overview{display:grid;grid-template-columns:1.2fr 1fr;gap:20px}
      .men-acc-card{background:linear-gradient(160deg,rgba(12,18,38,.7),rgba(6,10,24,.85));border:1px solid rgba(37,99,235,.12);border-radius:26px;padding:26px 28px;backdrop-filter:blur(12px)}
      .men-acc-card-title{font-size:1.1rem;font-weight:800;color:#fff;margin-bottom:20px;display:flex;align-items:center;gap:12px}
      .men-acc-card-title .icn{width:38px;height:38px;border-radius:12px;background:rgba(37,99,235,.12);color:#60a5fa;border:1px solid rgba(37,99,235,.2);display:flex;align-items:center;justify-content:center;font-size:.95rem}
      .men-acc-cashback{position:relative;background:linear-gradient(135deg,#0a1a5c 0%,#132a7a 55%,#0a1a5c 100%);border-radius:26px;padding:32px 30px;color:#fff;overflow:hidden;box-shadow:0 30px 70px -20px rgba(10,26,92,.9);border:1px solid rgba(37,99,235,.35)}
      .men-acc-cashback::before{content:'';position:absolute;top:-80px;right:-80px;width:260px;height:260px;background:radial-gradient(circle,rgba(37,99,235,.5),transparent 70%);border-radius:50%}
      .men-acc-cashback .cc-chip{position:relative;z-index:2;width:52px;height:40px;border-radius:8px;background:linear-gradient(135deg,#d4a548,#b8860b);margin-bottom:22px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;color:rgba(0,0,0,.4)}
      .men-acc-cashback .cc-label{position:relative;z-index:2;font-size:.82rem;opacity:.92;margin-bottom:10px;display:flex;align-items:center;gap:8px;font-weight:800}
      .men-acc-cashback .cc-amount{position:relative;z-index:2;font-size:clamp(2.2rem,5vw,3rem);font-weight:900;letter-spacing:-2px;line-height:1;display:flex;align-items:baseline;gap:12px}
      .men-acc-cashback .cc-amount small{font-size:1.1rem;font-weight:700;opacity:.9}
      .men-acc-cashback .cc-note{position:relative;z-index:2;margin-top:18px;display:inline-flex;align-items:center;gap:8px;background:rgba(0,0,0,.3);padding:8px 16px;border-radius:20px;font-size:.78rem;font-weight:700;border:1px solid rgba(37,99,235,.3)}
      .men-acc-info-list{display:flex;flex-direction:column;gap:12px}
      .men-acc-info-row{display:flex;align-items:center;gap:14px;padding:14px 18px;background:rgba(37,99,235,.05);border:1px solid rgba(37,99,235,.1);border-radius:16px}
      .men-acc-info-row .ic{width:38px;height:38px;border-radius:12px;background:rgba(37,99,235,.12);color:#60a5fa;display:flex;align-items:center;justify-content:center;font-size:.9rem}
      .men-acc-info-row .txt{flex:1;min-width:0}
      .men-acc-info-row .lbl{font-size:.7rem;color:#8a92b0;text-transform:uppercase;letter-spacing:1px;font-weight:800;margin-bottom:2px}
      .men-acc-info-row .val{color:#fff;font-weight:700;font-size:.92rem;word-break:break-all}
      .men-acc-orders-list{display:flex;flex-direction:column;gap:14px}
      .men-acc-order{background:linear-gradient(160deg,rgba(12,18,38,.6),rgba(6,10,24,.8));border:1px solid rgba(37,99,235,.12);border-radius:20px;padding:20px 22px;position:relative;overflow:hidden}
      .men-acc-order-header{display:flex;justify-content:space-between;align-items:center;gap:14px;margin-bottom:14px;flex-wrap:wrap}
      .men-acc-order-id{font-weight:800;color:#fff;font-size:.95rem;display:flex;align-items:center;gap:10px}
      .men-acc-order-id .dot{width:8px;height:8px;border-radius:50%;background:var(--st-color,#4caf50);box-shadow:0 0 12px var(--st-color,#4caf50)}
      .men-acc-order-date{color:#8a92b0;font-size:.78rem;display:flex;align-items:center;gap:6px;font-weight:600}
      .men-acc-order-body{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
      .men-acc-order-items{flex:1;min-width:200px;color:#a8b0cc;font-size:.85rem;line-height:1.7}
      .men-acc-order-total{font-size:1.3rem;font-weight:900;color:#ffffff;display:inline-flex;align-items:center;gap:4px}
      .men-acc-order-badge{position:absolute;top:12px;left:12px;color:#fff;font-size:.62rem;font-weight:800;padding:4px 10px;border-radius:20px;display:inline-flex;align-items:center;gap:5px}
      .men-acc-order-cb{display:inline-flex;align-items:center;gap:6px;background:rgba(212,165,72,.12);border:1px solid rgba(212,165,72,.3);color:#d4a548;font-size:.72rem;font-weight:800;padding:5px 12px;border-radius:20px;margin-top:8px}
      .men-acc-empty{text-align:center;padding:60px 24px;background:rgba(37,99,235,.04);border:1.5px dashed rgba(37,99,235,.2);border-radius:24px}
      .men-acc-empty-icon{width:90px;height:90px;margin:0 auto 20px;border-radius:50%;background:rgba(37,99,235,.1);display:flex;align-items:center;justify-content:center;font-size:2.2rem;color:#2563eb}
      .men-acc-empty h3{color:#fff;font-size:1.2rem;margin-bottom:8px;font-weight:800}
      .men-acc-empty p{color:#8a92b0;font-size:.88rem;margin-bottom:20px}
      .men-acc-empty button{padding:12px 26px;border-radius:60px;background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
      .men-acc-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:18px}
      .men-acc-form-field label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
      .men-acc-form-field input{width:100%;padding:14px 20px;border-radius:14px;background:rgba(0,0,0,.3);border:1.5px solid rgba(37,99,235,.12);color:#fff;font-family:'Cairo',sans-serif;font-size:.92rem;font-weight:600;outline:none;transition:all .3s}
      .men-acc-form-field input:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.12)}
      .men-acc-form-field input:disabled{opacity:.5;cursor:not-allowed}
      .men-acc-settings-actions{grid-column:1/-1;display:flex;gap:10px;flex-wrap:wrap;margin-top:6px}
      .men-acc-settings-actions button{padding:13px 26px;border-radius:60px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.88rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px}
      .men-acc-settings-actions .save{background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;box-shadow:0 10px 30px -8px rgba(30,58,138,.6);border:1px solid rgba(59,130,246,.15)}
      .men-acc-settings-actions .danger{background:rgba(220,38,38,.12);border:1px solid rgba(220,38,38,.3);color:#f87171}
      .men-acc-danger{margin-top:20px;padding:22px 24px;background:rgba(220,38,38,.06);border:1px solid rgba(220,38,38,.2);border-radius:20px}
      .men-acc-danger h4{color:#f87171;font-size:1rem;margin-bottom:8px;font-weight:800;display:flex;align-items:center;gap:10px}
      .men-acc-danger p{color:#d0a8a8;font-size:.85rem;margin-bottom:14px;line-height:1.7}

      /* ═══ CHAT (Deep Blue + Admin Name Hidden) ═══ */
      .men-acc-chat-wrap{background:linear-gradient(160deg,rgba(12,18,38,.85),rgba(6,10,24,.95));border:1px solid rgba(37,99,235,.18);border-radius:26px;overflow:hidden;height:min(640px,75vh);display:flex;flex-direction:column;box-shadow:0 20px 60px -20px rgba(0,0,0,.7)}
      .men-acc-chat-head{padding:18px 22px;border-bottom:1px solid rgba(37,99,235,.15);display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(30,64,175,.15),transparent);position:relative}
      .men-acc-chat-head::after{content:'';position:absolute;bottom:-1px;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(59,130,246,.3),transparent)}
      .men-acc-chat-head .avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#0a1a5c,#2563eb);display:flex;align-items:center;justify-content:center;font-weight:900;color:#fff;font-size:1rem;flex-shrink:0;box-shadow:0 6px 18px -6px rgba(37,99,235,.8);border:1.5px solid rgba(59,130,246,.25);position:relative}
      .men-acc-chat-head .avatar::after{content:'';position:absolute;bottom:2px;right:2px;width:12px;height:12px;border-radius:50%;background:#4ade80;border:2px solid #0a0f24;box-shadow:0 0 8px rgba(74,222,128,.6)}
      .men-acc-chat-head .info{flex:1;min-width:0}
      .men-acc-chat-head .name{font-weight:900;color:#fff;font-size:1rem;line-height:1.2;display:flex;align-items:center;gap:8px}
      .men-acc-chat-head .name .verified-badge{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;border-radius:50%;background:linear-gradient(135deg,#2563eb,#3b82f6);color:#fff;font-size:.55rem;flex-shrink:0}
      .men-acc-chat-head .status{font-size:.72rem;color:#4ade80;font-weight:700;display:flex;align-items:center;gap:5px;margin-top:3px}
      .men-acc-chat-head .status i{font-size:.5rem;animation:menPulse 1.8s ease-in-out infinite}
      @keyframes menPulse{0%,100%{opacity:1}50%{opacity:.35}}
      .men-acc-chat-head .refresh{width:40px;height:40px;border-radius:12px;background:rgba(37,99,235,.1);border:1px solid rgba(37,99,235,.2);color:#60a5fa;cursor:pointer;transition:all .3s;display:flex;align-items:center;justify-content:center;font-size:.9rem}
      .men-acc-chat-head .refresh:hover{background:rgba(37,99,235,.2);transform:rotate(180deg)}
      .men-acc-chat-body{flex:1;overflow-y:auto;padding:22px 20px;display:flex;flex-direction:column;gap:14px;background:
        radial-gradient(circle at 20% 10%,rgba(30,64,175,.08),transparent 40%),
        radial-gradient(circle at 80% 90%,rgba(37,99,235,.06),transparent 40%),
        rgba(4,6,15,.3)}
      .men-acc-chat-body::-webkit-scrollbar{width:6px}
      .men-acc-chat-body::-webkit-scrollbar-thumb{background:rgba(37,99,235,.3);border-radius:6px}
      .men-acc-chat-body::-webkit-scrollbar-track{background:transparent}

      .men-chat-day-sep{text-align:center;margin:8px 0;position:relative}
      .men-chat-day-sep span{display:inline-block;background:rgba(10,26,92,.6);border:1px solid rgba(37,99,235,.2);color:#60a5fa;font-size:.7rem;font-weight:700;padding:5px 14px;border-radius:20px;position:relative;z-index:1}

      .men-acc-msg{max-width:78%;padding:12px 16px;border-radius:18px;font-size:.9rem;line-height:1.7;word-wrap:break-word;animation:menMsgIn .3s cubic-bezier(.4,0,.2,1);position:relative}
      @keyframes menMsgIn{from{opacity:0;transform:translateY(8px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}
      .men-acc-msg .meta{font-size:.62rem;font-weight:800;opacity:.85;margin-bottom:5px;letter-spacing:.5px;text-transform:uppercase}
      .men-acc-msg .time{font-size:.6rem;font-weight:700;opacity:.7;margin-top:6px;text-align:left;direction:ltr;display:flex;align-items:center;gap:4px}
      .men-acc-msg .time i{font-size:.55rem}

      /* رسالة العميل — يمين، أزرق غامق */
      .men-acc-msg.customer{align-self:flex-end;background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;border-bottom-left-radius:6px;border:1px solid rgba(59,130,246,.2);box-shadow:0 8px 22px -12px rgba(10,26,92,.7)}
      .men-acc-msg.customer .meta{color:#93c5fd}
      .men-acc-msg.customer .time{color:#93c5fd}

      /* رسالة الدعم — يسار، رمادي شفاف + اسم مخفي */
      .men-acc-msg.admin{align-self:flex-start;background:linear-gradient(135deg,rgba(16,22,44,.9),rgba(10,14,30,.95));border:1px solid rgba(37,99,235,.15);color:#e0e6f4;border-bottom-right-radius:6px}
      .men-acc-msg.admin .meta{color:#60a5fa;display:flex;align-items:center;gap:6px}
      .men-acc-msg.admin .meta::before{content:'\\f4ce';font-family:'Font Awesome 6 Free';font-weight:900;font-size:.62rem;color:#3b82f6}
      .men-acc-msg.admin .time{color:#8a92b0}

      /* ملاحظة إدارية — بالوسط، بنفسجي */
      .men-acc-msg.note{align-self:center;background:linear-gradient(135deg,rgba(147,51,234,.18),rgba(107,33,168,.18));border:1.5px dashed rgba(147,51,234,.5);color:#e9d5ff;max-width:88%;text-align:center}
      .men-acc-msg.note .meta{color:#c084fc;justify-content:center;display:flex}
      .men-acc-msg.note .time{color:#c084fc;justify-content:center;display:flex}

      /* مؤشر الكتابة */
      .men-typing-indicator{display:flex;align-items:center;gap:6px;padding:12px 16px;background:rgba(16,22,44,.9);border:1px solid rgba(37,99,235,.15);border-radius:18px;border-bottom-right-radius:6px;align-self:flex-start;max-width:fit-content;margin-top:4px}
      .men-typing-indicator .dot{width:6px;height:6px;border-radius:50%;background:#60a5fa;animation:menTypingBounce 1.4s infinite ease-in-out}
      .men-typing-indicator .dot:nth-child(2){animation-delay:.2s}
      .men-typing-indicator .dot:nth-child(3){animation-delay:.4s}
      @keyframes menTypingBounce{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-6px);opacity:1}}

      /* حالة فارغة */
      .men-acc-chat-empty{text-align:center;padding:50px 20px;color:#8a92b0;font-weight:700;font-size:.88rem;margin:auto}
      .men-acc-chat-empty i{font-size:2.8rem;color:#2563eb;opacity:.5;display:block;margin-bottom:16px}
      .men-acc-chat-empty h4{color:#e0e6f4;font-size:1rem;font-weight:800;margin-bottom:6px}
      .men-acc-chat-empty p{font-size:.78rem;font-weight:500;color:#6a7290;margin-bottom:16px}
      .men-acc-chat-empty .quick-ask{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;max-width:400px;margin:0 auto}
      .men-acc-chat-empty .quick-ask button{padding:8px 16px;border-radius:20px;border:1px solid rgba(37,99,235,.25);background:rgba(37,99,235,.08);color:#60a5fa;font-family:'Cairo',sans-serif;font-weight:700;font-size:.78rem;cursor:pointer;transition:all .25s}
      .men-acc-chat-empty .quick-ask button:hover{background:linear-gradient(135deg,#0a1a5c,#1e40af);border-color:transparent;color:#fff;transform:translateY(-2px)}

      /* صندوق الإدخال */
      .men-acc-chat-foot{padding:14px 18px;border-top:1px solid rgba(37,99,235,.15);background:rgba(4,6,15,.5);display:flex;gap:10px;align-items:flex-end}
      .men-acc-chat-foot textarea{flex:1;padding:13px 18px;border-radius:16px;background:rgba(4,6,15,.6);border:1.5px solid rgba(37,99,235,.2);color:#fff;font-family:'Cairo',sans-serif;font-weight:600;font-size:.9rem;outline:none;transition:all .3s;resize:none;min-height:46px;max-height:120px;line-height:1.5}
      .men-acc-chat-foot textarea::placeholder{color:#5a607a}
      .men-acc-chat-foot textarea:focus{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.12);background:rgba(4,6,15,.8)}
      .men-acc-chat-send{width:46px;height:46px;border-radius:14px;border:none;background:linear-gradient(135deg,#0a1a5c,#1e40af);color:#fff;cursor:pointer;font-size:1rem;transition:all .3s;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 22px -8px rgba(30,58,138,.9);border:1px solid rgba(59,130,246,.2)}
      .men-acc-chat-send:hover:not(:disabled){transform:translateY(-2px) scale(1.03);box-shadow:0 10px 28px -8px rgba(37,99,235,1)}
      .men-acc-chat-send:active:not(:disabled){transform:translateY(0) scale(.98)}
      .men-acc-chat-send:disabled{opacity:.5;cursor:not-allowed;transform:none}

      @media (max-width:992px){.men-acc-stats{grid-template-columns:repeat(2,1fr)}.men-acc-overview{grid-template-columns:1fr}.men-acc-settings-grid{grid-template-columns:1fr}}
      @media (max-width:768px){
        .men-acc-cover-inner{padding:32px 24px 26px;flex-direction:column;text-align:center;gap:22px}
        .men-acc-cover-avatar{width:100px;height:100px}
        .men-acc-cover-email,.men-acc-cover-tags,.men-acc-cover-actions{justify-content:center}
        .men-acc-tab{min-width:auto;padding:11px 12px;font-size:.8rem}
        .men-acc-tab span{display:none}
        .men-acc-card{padding:22px 20px}
        .men-acc-cashback{padding:26px 22px}
        .men-acc-stat{padding:18px 16px}
        .men-acc-chat-wrap{height:min(560px,72vh)}
        .men-acc-msg{max-width:85%}
      }

      /* ═══ Cashback Box (Deep Blue) ═══ */
      .men-cb-box{margin:14px 0;background:linear-gradient(160deg,rgba(10,26,92,.3),rgba(30,58,138,.15));border:1px solid rgba(59,130,246,.25);border-radius:20px;padding:18px 20px;font-family:'Cairo',sans-serif;color:#fff;box-shadow:0 12px 40px -14px rgba(10,26,92,.6)}
      .men-cb-head{display:flex;align-items:center;gap:14px}
      .men-cb-icon{width:48px;height:48px;border-radius:14px;background:linear-gradient(135deg,#1e40af,#2563eb);display:flex;align-items:center;justify-content:center;font-size:1.15rem;color:#fff;box-shadow:0 8px 22px -8px rgba(37,99,235,.8);flex-shrink:0;border:1px solid rgba(147,197,253,.2)}
      .men-cb-info{flex:1;min-width:0}
      .men-cb-title{font-weight:800;font-size:.95rem;color:#fff}
      .men-cb-bal{font-size:.78rem;color:#8a92b0;font-weight:700;margin-top:3px}
      .men-cb-bal b{color:#60a5fa;font-weight:900}
      .men-cb-switch-wrap{cursor:pointer;display:inline-flex;flex-shrink:0}
      .men-cb-switch-wrap input{display:none}
      .men-cb-switch{width:52px;height:28px;border-radius:60px;background:rgba(255,255,255,.06);border:1.5px solid rgba(59,130,246,.3);position:relative;transition:all .3s}
      .men-cb-switch::after{content:'';position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:#6a7290;transition:all .3s}
      .men-cb-switch-wrap input:checked ~ .men-cb-switch{background:linear-gradient(135deg,#1e40af,#2563eb);border-color:transparent;box-shadow:0 0 22px -6px rgba(37,99,235,.9)}
      .men-cb-switch-wrap input:checked ~ .men-cb-switch::after{right:calc(100% - 23px);background:#fff;box-shadow:0 2px 6px rgba(0,0,0,.3)}
      .men-cb-body{margin-top:18px;padding-top:18px;border-top:1px dashed rgba(59,130,246,.25);animation:menCbIn .35s ease}
      @keyframes menCbIn{from{opacity:0;transform:translateY(-8px)}to{opacity:1;transform:translateY(0)}}
      .men-cb-row{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px;flex-wrap:wrap}
      .men-cb-row label{font-size:.78rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1px}
      .men-cb-input{position:relative;display:flex;align-items:center;background:rgba(4,6,15,.5);border:1.5px solid rgba(59,130,246,.2);border-radius:12px;padding:0 14px;height:46px;min-width:180px;transition:all .3s}
      .men-cb-input:focus-within{border-color:#2563eb;box-shadow:0 0 0 4px rgba(37,99,235,.15)}
      .men-cb-input input{flex:1;background:transparent;border:none;outline:none;color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:1.05rem;text-align:right;direction:ltr;padding:0 6px}
      .men-cb-input input::-webkit-outer-spin-button,.men-cb-input input::-webkit-inner-spin-button{-webkit-appearance:none;margin:0}
      .men-cb-input input[type=number]{-moz-appearance:textfield}
      .men-cb-input span{color:#60a5fa;font-weight:800;font-size:.8rem;flex-shrink:0}
      .men-cb-quick{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      .men-cb-quick button{flex:1;min-width:70px;padding:9px 12px;border-radius:10px;border:1.5px solid rgba(59,130,246,.25);background:rgba(37,99,235,.08);color:#60a5fa;font-family:'Cairo',sans-serif;font-weight:800;font-size:.78rem;cursor:pointer;transition:all .25s}
      .men-cb-quick button:hover{background:linear-gradient(135deg,#0a1a5c,#1e40af);border-color:transparent;color:#fff;transform:translateY(-2px);box-shadow:0 6px 16px -6px rgba(37,99,235,.6)}
      .men-cb-summary{background:rgba(4,6,15,.35);border-radius:14px;padding:14px 16px;display:flex;flex-direction:column;gap:10px;border:1px solid rgba(59,130,246,.1)}
      .men-cb-summary > div{display:flex;justify-content:space-between;align-items:center;font-size:.85rem;font-weight:700;color:#a8b0cc}
      .men-cb-summary > div b{color:#fff;font-weight:900;direction:ltr}
      .men-cb-summary .discount b{color:#4ade80}
      .men-cb-summary .total{padding-top:10px;border-top:1px dashed rgba(59,130,246,.25);font-size:.95rem}
      .men-cb-summary .total b{font-size:1.15rem;color:#ffffff}
    `;
    document.head.appendChild(s);
  }

  function launchConfetti() {
    const colors = ['#2563eb','#3b82f6','#60a5fa','#4caf50','#fff','#0a1a5c'];
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
  // 🖼️ Auth Screen
  // ═══════════════════════════════════════════════════════════
  function injectModals() {
    if ($('menAuthScreen')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="menAuthScreen" class="men-screen">
        <div class="men-screen-bg"></div>
        <div class="men-orb o1"></div>
        <div class="men-orb o2"></div>
        <div class="men-orb o3"></div>

        <div class="men-layout">
          <div class="men-showcase">
            <div class="men-showcase-top">
              <div class="men-logo-row">
                <img src="https://www.socialcreator.com/srv/imgs/ti_imgs/200176_309202.png" alt="MEN Store" style="height:70px;width:auto;object-fit:contain;filter:brightness(0) invert(1) drop-shadow(0 8px 24px rgba(37,99,235,.5))">
              </div>
            </div>
            <div class="men-showcase-center">
              <div class="men-showcase-badge"><i class="fas fa-star"></i> متجرك الأول للألعاب</div>
              <h1 class="men-showcase-title">كل ما تحتاجه<br>في <span>عالم الجيمنق</span></h1>
              <p class="men-showcase-desc">انضم إلى أكثر من 5000 لاعب يستمتعون بأفضل الأسعار، التسليم الفوري، والكاش باك على كل طلب.</p>
              <div class="men-features">
                <div class="men-feature"><div class="men-feature-icon"><i class="fas fa-bolt"></i></div><div class="men-feature-text"><div class="t">تسليم فوري</div><div class="s">استلم طلبك خلال 5 دقائق</div></div></div>
                <div class="men-feature"><div class="men-feature-icon"><i class="fas fa-gift"></i></div><div class="men-feature-text"><div class="t">كاش باك 2%</div><div class="s">على كل عملية شراء</div></div></div>
                <div class="men-feature"><div class="men-feature-icon"><i class="fas fa-shield-halved"></i></div><div class="men-feature-text"><div class="t">منتجات أصلية 100%</div><div class="s">ضمان الجودة والأصالة</div></div></div>
              </div>
            </div>
            <div class="men-showcase-bottom">
              <div class="stats">
                <div class="stat"><div class="n">+5000</div><div class="l">عميل سعيد</div></div>
                <div class="stat"><div class="n">24/7</div><div class="l">دعم فني</div></div>
                <div class="stat"><div class="n">7 سنوات</div><div class="l">خبرة</div></div>
              </div>
              <div>© 2020 MEN Store — جميع الحقوق محفوظة</div>
            </div>
          </div>

          <div class="men-form-panel">
            <div class="men-panel-top">
              <div></div>
              <button class="men-close" data-close type="button"><i class="fas fa-times"></i></button>
            </div>

            <div class="men-form-inner">
              <div class="men-welcome">
                <h2 id="menHeadTitle">أهلاً بعودتك 👋</h2>
                <p id="menHeadSub">سجّل دخولك للمتابعة والاستمتاع بالعروض الحصرية</p>
              </div>

              <div class="men-tabs" id="menTabs" data-mode="login">
                <div class="men-tabs-indicator"></div>
                <button class="men-tab active" data-tab="login" type="button"><i class="fas fa-right-to-bracket"></i> دخول</button>
                <button class="men-tab" data-tab="signup" type="button"><i class="fas fa-user-plus"></i> حساب جديد</button>
              </div>

              <form class="men-form" id="menForm" onsubmit="return false;">
                <div class="men-field" id="menNameField" style="display:none">
                  <label class="men-label" for="menAuthName">الاسم الكامل</label>
                  <div class="men-input-wrap">
                    <input type="text" id="menAuthName" placeholder="محمد أحمد" autocomplete="name" dir="rtl">
                    <i class="fas fa-user men-icon"></i>
                  </div>
                </div>

                <div class="men-field" id="menEmailField" style="display:none">
                  <label class="men-label" for="menAuthEmail">البريد الإلكتروني</label>
                  <div class="men-input-wrap">
                    <input type="email" id="menAuthEmail" placeholder="you@example.com" autocomplete="email" dir="ltr" style="text-align:right">
                    <i class="fas fa-envelope men-icon"></i>
                  </div>
                </div>

                <div class="men-field" id="menPhoneField" style="display:none">
                  <label class="men-label" for="menAuthPhone">رقم الجوال</label>
                  <div class="men-input-wrap">
                    <input type="tel" id="menAuthPhone" placeholder="05xxxxxxxx" autocomplete="tel" dir="ltr" style="text-align:right">
                    <i class="fas fa-phone men-icon"></i>
                  </div>
                </div>

                <div class="men-field" id="menIdentifierField">
                  <label class="men-label" for="menAuthIdentifier">رقم الجوال أو البريد الإلكتروني</label>
                  <div class="men-input-wrap">
                    <input type="text" id="menAuthIdentifier" placeholder="05xxxxxxxx  أو  you@example.com" autocomplete="username" dir="ltr" style="text-align:right">
                    <i class="fas fa-user-circle men-icon"></i>
                  </div>
                  <div class="men-hint"><i class="fas fa-circle-info"></i> يمكنك الدخول بالجوال أو بالبريد الإلكتروني</div>
                </div>

                <div class="men-field">
                  <label class="men-label" for="menAuthPassword">كلمة المرور</label>
                  <div class="men-input-wrap">
                    <input type="password" id="menAuthPassword" placeholder="••••••••" autocomplete="current-password" dir="ltr" style="text-align:right">
                    <i class="fas fa-lock men-icon"></i>
                    <button class="men-eye" id="menTogglePass" type="button"><i class="fas fa-eye"></i></button>
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

                <div class="men-opts" id="menOptsRow">
                  <label class="men-remember">
                    <input type="checkbox" id="menRemember" checked>
                    <span class="men-check"></span>
                    <span>تذكرني</span>
                  </label>
                  <a class="men-forgot" id="menForgotBtn">نسيت كلمة المرور؟</a>
                </div>

                <div class="men-terms" id="menTermsText" style="display:none">
                  بإنشاء حساب، أنت توافق على <a>الشروط والأحكام</a> و <a>سياسة الخصوصية</a>
                </div>

                <div class="men-error" id="menError">
                  <i class="fas fa-circle-exclamation"></i>
                  <span id="menErrorText"></span>
                </div>

                <button class="men-submit" id="menSubmit" type="button">
                  <i class="fas fa-arrow-left men-btn-icon"></i>
                  <span class="men-spinner"></span>
                  <span id="menSubmitText">تسجيل الدخول</span>
                </button>
              </form>
            </div>
          </div>
        </div>

        <div class="men-success-overlay" id="menSuccessOverlay">
          <div class="men-check-circle"><i class="fas fa-check"></i></div>
          <p id="menSuccessText">تم بنجاح!</p>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeAuth));
    wrap.querySelectorAll('[data-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => { e.preventDefault(); switchMode(btn.dataset.tab); });
    });

    $('menTogglePass').addEventListener('click', togglePassword);
    $('menAuthPassword').addEventListener('input', updateStrength);
    $('menAuthPassword').addEventListener('keydown', e => { if (e.key === 'Enter') handleSubmit(); });
    $('menAuthIdentifier').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPassword').focus(); });
    $('menAuthName').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthEmail').focus(); });
    $('menAuthEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPhone').focus(); });
    $('menAuthPhone').addEventListener('keydown', e => { if (e.key === 'Enter') $('menAuthPassword').focus(); });
    $('menRemember').addEventListener('change', function () { rememberMe = this.checked; });
    $('menSubmit').addEventListener('click', handleSubmit);
    $('menForgotBtn').addEventListener('click', handleForgot);
  }

  function switchMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'login';
    renderMode();
  }

  function renderMode() {
    const login = authMode === 'login';
    $('menTabs').dataset.mode = authMode;
    document.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('active', b.dataset.tab === authMode));
    $('menHeadTitle').textContent = login ? 'أهلاً بعودتك 👋' : 'انضم إلينا';
    $('menHeadSub').textContent = login ? 'سجّل دخولك بالجوال أو البريد الإلكتروني' : 'أنشئ حسابك في ثوانٍ — البريد والجوال مطلوبان';
    $('menNameField').style.display       = login ? 'none' : 'block';
    $('menEmailField').style.display      = login ? 'none' : 'block';
    $('menPhoneField').style.display      = login ? 'none' : 'block';
    $('menIdentifierField').style.display = login ? 'block' : 'none';
    $('menOptsRow').style.display         = login ? 'flex' : 'none';
    $('menTermsText').style.display       = login ? 'none' : 'block';
    $('menSubmitText').textContent = login ? 'تسجيل الدخول' : 'إنشاء الحساب';
    $('menAuthPassword').autocomplete = login ? 'current-password' : 'new-password';
    $('menStrength').classList.remove('show', 's1', 's2', 's3', 's4');
    clearError();
    setTimeout(() => {
      if (!login && $('menAuthName')) $('menAuthName').focus();
      else if ($('menAuthIdentifier')) $('menAuthIdentifier').focus();
    }, 100);
  }

  function togglePassword() {
    const inp = $('menAuthPassword');
    const ico = $('menTogglePass').querySelector('i');
    if (inp.type === 'password') { inp.type = 'text'; ico.className = 'fas fa-eye-slash'; }
    else { inp.type = 'password'; ico.className = 'fas fa-eye'; }
  }

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

  function showError(msg) { $('menErrorText').textContent = msg; $('menError').classList.add('show'); }
  function clearError() { $('menError').classList.remove('show'); }

  function open(mode) {
    injectCSS(); injectModals(); injectAccountPage();
    authMode = mode === 'signup' ? 'signup' : 'login';
    renderMode();
    $('menAuthScreen').classList.add('active');
    document.body.style.overflow = 'hidden';
  }
  function closeAuth() {
    $('menAuthScreen')?.classList.remove('active');
    document.body.style.overflow = '';
    clearError();
  }

  async function handleSubmit() {
    const password = $('menAuthPassword').value;
    clearError();
    const btn = $('menSubmit');
    btn.disabled = true;
    btn.classList.add('loading');

    try {
      if (authMode === 'login') {
        const rawId = $('menAuthIdentifier').value.trim();
        if (!rawId) throw new Error('الرجاء إدخال رقم الجوال أو البريد الإلكتروني');
        if (!password) throw new Error('الرجاء إدخال كلمة المرور');

        let email;
        if (rawId.includes('@')) {
          email = rawId.toLowerCase();
          if (!isValidEmail(email)) throw new Error('صيغة البريد الإلكتروني غير صحيحة');
        } else {
          const phone = normalizePhone(rawId);
          if (!phone) throw new Error('رقم الجوال غير صحيح (مثال: 05xxxxxxxx)');
          const { data, error: lookupErr } = await sb.from('men_phone_email').select('email').eq('phone', phone).maybeSingle();
          if (lookupErr) throw lookupErr;
          if (!data?.email) throw new Error('لا يوجد حساب مرتبط بهذا الرقم');
          email = data.email;
        }

        const { data, error } = await sb.auth.signInWithPassword({ email, password });
        if (error) throw error;
        console.log('✅ دخول:', data.user?.email);
        await showSuccess('مرحباً بك! 👋');
        launchConfetti();
      } else {
        const name  = $('menAuthName').value.trim();
        const email = $('menAuthEmail').value.trim().toLowerCase();
        const phone = normalizePhone($('menAuthPhone').value);

        if (!name) throw new Error('الرجاء إدخال الاسم الكامل');
        if (!email) throw new Error('الرجاء إدخال البريد الإلكتروني');
        if (!isValidEmail(email)) throw new Error('صيغة البريد الإلكتروني غير صحيحة');
        if (!phone) throw new Error('رقم الجوال غير صحيح (مثال: 05xxxxxxxx)');
        if (!password) throw new Error('الرجاء إدخال كلمة المرور');
        if (password.length < 6) throw new Error('كلمة المرور 6 أحرف على الأقل');

        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, phone, email, cashback: 0, orders: [] } }
        });
        if (error) throw error;

        try { await sb.from('men_phone_email').insert({ phone, email }); } catch (e) { console.warn(e); }

        if (data.user) {
          try {
            await sb.from('men_users').upsert({
              id: data.user.id, email, name, phone, cashback: 0,
              updated_at: new Date().toISOString()
            }, { onConflict: 'id' });
            console.log('✅ User saved in men_users');
          } catch (e) { console.warn('save user failed:', e); }
        }

        if (!data.session) { showError('✅ تم إنشاء حسابك! يمكنك الآن تسجيل الدخول.'); return; }
        console.log('✅ حساب جديد:', data.user?.email);
        await showSuccess('تم إنشاء حسابك');
        launchConfetti();
      }
    } catch (err) {
      console.error('[AUTH ERROR]', err);
      const m = (err.message || '').toLowerCase();
      if (m.includes('invalid login') || m.includes('invalid credentials')) showError('البيانات غير صحيحة — تحقق من الجوال/البريد وكلمة المرور');
      else if (m.includes('already registered') || m.includes('already been registered') || m.includes('user already exists')) showError('هذا البريد مسجل بالفعل — انتقل لتسجيل الدخول');
      else if (m.includes('duplicate key')) showError('هذا الرقم مستخدم بحساب آخر');
      else if (m.includes('password')) showError('كلمة المرور ضعيفة');
      else if (m.includes('too many') || m.includes('rate limit')) showError('محاولات كثيرة — انتظر دقيقة');
      else showError(err.message || 'حدث خطأ غير متوقع');
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
      setTimeout(() => { $('menSuccessOverlay').classList.remove('show'); closeAuth(); r(); }, 1300);
    });
  }

  async function handleForgot() {
    const rawId = $('menAuthIdentifier').value.trim();
    if (!rawId) { showError('اكتب بريدك الإلكتروني أولاً'); $('menAuthIdentifier').focus(); return; }
    if (!rawId.includes('@')) { showError('لاستعادة كلمة المرور، أدخل بريدك الإلكتروني. للدعم: clan.men.ts@gmail.com'); return; }
    if (!isValidEmail(rawId)) return showError('صيغة البريد غير صحيحة');
    try {
      const { error } = await sb.auth.resetPasswordForEmail(rawId.toLowerCase(), { redirectTo: location.origin + location.pathname });
      if (error) throw error;
      if (window.showToast) window.showToast('أرسلنا رابط استعادة كلمة المرور', 'success');
      clearError();
    } catch (err) { showError(err.message || 'فشل الإرسال'); }
  }

  // ═══════════════════════════════════════════════════════════
  // 👤 Account Page
  // ═══════════════════════════════════════════════════════════
  function injectAccountPage() {
    if ($('menAccountPage')) return;
    const main = document.querySelector('main') || document.body;
    const page = document.createElement('div');
    page.id = 'menAccountPage';
    page.className = 'page-view';
    page.innerHTML = `
      <div class="container">
        <div class="men-acc-bread"><a data-macc-nav="home">الرئيسية</a><span class="sep"><i class="fas fa-chevron-left"></i></span><span class="cur">حسابي</span></div>
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
            <div class="men-acc-stat" style="--accent:#3b82f6;--icon-bg:rgba(37,99,235,.12)"><div class="men-acc-stat-icon"><i class="fas fa-box"></i></div><div class="men-acc-stat-val" id="menAccStatOrders">0</div><div class="men-acc-stat-lbl">الطلبات</div></div>
            <div class="men-acc-stat" style="--accent:#4caf50;--icon-bg:rgba(76,175,80,.12)"><div class="men-acc-stat-icon"><i class="fas fa-wallet"></i></div><div class="men-acc-stat-val"><span id="menAccStatCashback">0</span> <small style="font-size:.9rem;color:#8a92b0">ر.س</small></div><div class="men-acc-stat-lbl">الكاش باك</div></div>
            <div class="men-acc-stat" style="--accent:#d4a548;--icon-bg:rgba(212,165,72,.12)"><div class="men-acc-stat-icon"><i class="fas fa-coins"></i></div><div class="men-acc-stat-val"><span id="menAccStatSpent">0</span> <small style="font-size:.9rem;color:#8a92b0">ر.س</small></div><div class="men-acc-stat-lbl">إجمالي المشتريات</div></div>
            <div class="men-acc-stat" style="--accent:#60a5fa;--icon-bg:rgba(96,165,250,.12)"><div class="men-acc-stat-icon"><i class="fas fa-calendar"></i></div><div class="men-acc-stat-val" id="menAccStatSince" style="font-size:1.05rem">—</div><div class="men-acc-stat-lbl">عضو منذ</div></div>
          </div>

          <div class="men-acc-tabs">
            <button class="men-acc-tab active" data-macc-tab="overview" type="button"><i class="fas fa-house"></i> <span>نظرة عامة</span></button>
            <button class="men-acc-tab" data-macc-tab="orders" type="button"><i class="fas fa-box"></i> <span>طلباتي</span></button>
            <button class="men-acc-tab" data-macc-tab="chat" type="button" id="menAccChatTab"><i class="fas fa-comments"></i> <span>المحادثة</span><span class="men-chat-badge" id="menChatBadge" style="display:none">0</span></button>
            <button class="men-acc-tab" data-macc-tab="settings" type="button"><i class="fas fa-gear"></i> <span>الإعدادات</span></button>
          </div>

          <div class="men-acc-panel active" data-macc-panel="overview">
            <div class="men-acc-overview">
              <div class="men-acc-cashback">
                <div class="cc-chip"><i class="fas fa-microchip"></i></div>
                <div class="cc-label"><i class="fas fa-wallet"></i> رصيد الكاش باك</div>
                <div class="cc-amount"><span id="menAccCashbackBig">0.00</span> <small>ر.س</small></div>
                <div class="cc-note"><i class="fas fa-gift"></i> تكسب 2% على كل طلب مستلم</div>
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

          <div class="men-acc-panel" data-macc-panel="chat">
            <div class="men-acc-chat-wrap">
              <div class="men-acc-chat-head">
                <div class="avatar"><i class="fas fa-headset"></i></div>
                <div class="info">
                  <div class="name">
                    <span>${SUPPORT_NAME}</span>
                    <span class="verified-badge" title="موثّق"><i class="fas fa-check"></i></span>
                  </div>
                  <div class="status"><i class="fas fa-circle"></i> متصل الآن · عادةً يرد خلال دقائق</div>
                </div>
                <button class="refresh" id="menChatRefresh" type="button" title="تحديث"><i class="fas fa-rotate"></i></button>
              </div>
              <div class="men-acc-chat-body" id="menChatBody">
                <div class="men-acc-chat-empty"><i class="fas fa-comments"></i> جاري تحميل المحادثة...</div>
              </div>
              <div class="men-acc-chat-foot">
                <textarea id="menChatInput" placeholder="اكتب رسالتك لفريق الدعم..." rows="1"></textarea>
                <button class="men-acc-chat-send" id="menChatSend" type="button"><i class="fas fa-paper-plane"></i></button>
              </div>
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
              <button id="menAccDeleteBtn" type="button" style="padding:12px 24px;border-radius:60px;border:1px solid rgba(220,38,38,.3);background:rgba(220,38,38,.12);color:#f87171;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px"><i class="fas fa-trash"></i> حذف الحساب</button>
            </div>
          </div>
        </div>
      </div>
    `;
    main.appendChild(page);

    $('menAccBackBtn').addEventListener('click', closeAccount);
    $('menAccShopNow').addEventListener('click', closeAccount);
    page.querySelectorAll('[data-macc-nav]').forEach(a => a.addEventListener('click', closeAccount));
    page.querySelectorAll('[data-macc-tab]').forEach(btn => btn.addEventListener('click', () => switchAccountTab(btn.dataset.maccTab)));
    $('menAccSaveBtn').addEventListener('click', saveProfile);
    $('menAccLogoutBtn').addEventListener('click', logout);
    $('menAccDeleteBtn').addEventListener('click', deleteAccount);
    $('menAccShareBtn').addEventListener('click', shareAccount);

    $('menChatSend').addEventListener('click', sendCustomerChat);
    $('menChatRefresh').addEventListener('click', () => loadCustomerChat(true));
    const chatInp = $('menChatInput');
    chatInp.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendCustomerChat(); }
    });
    chatInp.addEventListener('input', () => {
      chatInp.style.height = 'auto';
      chatInp.style.height = Math.min(chatInp.scrollHeight, 120) + 'px';
    });
  }

  function switchAccountTab(tab) {
    document.querySelectorAll('[data-macc-tab]').forEach(b => b.classList.toggle('active', b.dataset.maccTab === tab));
    document.querySelectorAll('[data-macc-panel]').forEach(p => p.classList.toggle('active', p.dataset.maccPanel === tab));

    if (tab === 'chat') {
      loadCustomerChat();
      startChatPolling();
      const badge = $('menChatBadge');
      if (badge) badge.style.display = 'none';
      chatUnreadLocal = 0;
    } else {
      stopChatPolling();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💬 Chat — Enhanced
  // ═══════════════════════════════════════════════════════════
  const QUICK_ASKS = [
    'متى يوصل طلبي؟',
    'طرق الدفع المتاحة؟',
    'كيف أستخدم الكاش باك؟',
    'أريد إلغاء طلب'
  ];

  async function loadCustomerChat(showLoader = false) {
    if (!currentUser) return;
    const body = $('menChatBody');
    if (!body) return;

    if (showLoader) {
      body.innerHTML = '<div class="men-acc-chat-empty"><i class="fas fa-spinner fa-spin"></i> جاري التحديث...</div>';
    }

    try {
      const { data, error } = await sb.from('men_messages')
        .select('*')
        .eq('user_id', currentUser.id)
        .order('created_at', { ascending: true })
        .limit(300);
      if (error) throw error;
      renderCustomerChat(data || []);
    } catch (err) {
      console.error('loadCustomerChat error:', err);
      body.innerHTML = `<div class="men-acc-chat-empty"><i class="fas fa-triangle-exclamation" style="color:#dc2626"></i> فشل التحميل<br><span style="font-size:.74rem;opacity:.8;margin-top:8px;display:block">${escapeHtml(err.message || '')}</span></div>`;
    }
  }

  function renderCustomerChat(msgs) {
    const body = $('menChatBody');
    if (!body) return;

    // هل كان المستخدم في الأسفل؟ (لعرض زر "جديد")
    const wasAtBottom = body.scrollHeight - body.scrollTop - body.clientHeight < 80;

    if (!msgs.length) {
      body.innerHTML = `
        <div class="men-acc-chat-empty">
          <i class="fas fa-headset"></i>
          <h4>كيف نقدر نساعدك اليوم؟</h4>
          <p>فريق الدعم جاهز للإجابة على استفساراتك</p>
          <div class="quick-ask">
            ${QUICK_ASKS.map(q => `<button type="button" data-quick="${escapeHtml(q)}">${escapeHtml(q)}</button>`).join('')}
          </div>
        </div>`;
      chatLastCount = 0;
      chatLastId = null;

      // ربط الأزرار السريعة
      body.querySelectorAll('[data-quick]').forEach(btn => {
        btn.addEventListener('click', () => {
          const inp = $('menChatInput');
          if (inp) { inp.value = btn.dataset.quick; inp.focus(); sendCustomerChat(); }
        });
      });
      return;
    }

    // لا تُعِد الرسم لو ما تغير شي
    const lastMsg = msgs[msgs.length - 1];
    if (msgs.length === chatLastCount && lastMsg.id === chatLastId && body.querySelector('.men-acc-msg')) {
      return;
    }

    // كشف رسالة جديدة من الدعم
    const hasNewFromSupport = chatLastId && lastMsg.id !== chatLastId && lastMsg.sender === 'admin';

    chatLastCount = msgs.length;
    chatLastId = lastMsg.id;

    // تجميع حسب اليوم
    let currentDay = null;
    let html = '';
    msgs.forEach((m, idx) => {
      const date = new Date(m.created_at);
      const dayKey = date.toDateString();
      if (dayKey !== currentDay) {
        currentDay = dayKey;
        const today = new Date();
        const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
        let dayLabel;
        if (dayKey === today.toDateString()) dayLabel = 'اليوم';
        else if (dayKey === yesterday.toDateString()) dayLabel = 'أمس';
        else dayLabel = date.toLocaleDateString('ar-SA', { day: 'numeric', month: 'long' });
        html += `<div class="men-chat-day-sep"><span>${dayLabel}</span></div>`;
      }

      const msgTime = fmtMsgTime(m.created_at);

      if (m.type === 'note') {
        html += `<div class="men-acc-msg note">
          <div class="meta"><i class="fas fa-comment-dots"></i> ملاحظة من الإدارة</div>
          <div>${escapeHtml(m.message)}</div>
          <div class="time"><i class="fas fa-clock"></i> ${msgTime}</div>
        </div>`;
      } else {
        const isCustomer = m.sender === 'customer';
        const cls = isCustomer ? 'customer' : 'admin';
        // ⭐ لا نظهر اسم المشرف أبداً — دائماً "الدعم"
        const label = isCustomer ? 'أنت' : 'الدعم';

        const readIcon = isCustomer
          ? (m.is_read ? '<i class="fas fa-check-double" style="color:#60a5fa"></i>' : '<i class="fas fa-check"></i>')
          : '';

        html += `<div class="men-acc-msg ${cls}">
          <div class="meta">${escapeHtml(label)}</div>
          <div>${escapeHtml(m.message)}</div>
          <div class="time">${readIcon}<span>${msgTime}</span></div>
        </div>`;
      }
    });

    body.innerHTML = html;

    // تمرير للأسفل
    if (wasAtBottom || showLoader !== undefined) {
      body.scrollTop = body.scrollHeight;
    }

    // صوت لو في رسالة جديدة من الدعم
    if (hasNewFromSupport) {
      playPing();
      // وميض خفيف
      body.classList.add('has-new');
      setTimeout(() => body.classList.remove('has-new'), 800);
    }

    // تحديث شارة التبويب
    const unreadFromSupport = msgs.filter(m => m.sender === 'admin' && !m.is_read).length;
    updateChatBadge(unreadFromSupport);
  }

  function updateChatBadge(count) {
    const badge = $('menChatBadge');
    if (!badge) return;
    const isChatActive = document.querySelector('[data-macc-panel="chat"]')?.classList.contains('active');
    if (count > 0 && !isChatActive) {
      badge.textContent = count > 9 ? '9+' : count;
      badge.style.display = 'flex';
    } else if (count === 0) {
      badge.style.display = 'none';
    }
  }

  async function sendCustomerChat() {
    if (!currentUser) return;
    const input = $('menChatInput');
    const btn = $('menChatSend');
    const text = input?.value?.trim();
    if (!text) return;

    // إرسال متفائل (Optimistic UI)
    const tempMsg = {
      id: 'temp-' + Date.now(),
      sender: 'customer',
      message: text,
      type: 'chat',
      created_at: new Date().toISOString(),
      is_read: false
    };

    const body = $('menChatBody');
    if (body && body.querySelector('.men-acc-chat-empty')) {
      body.innerHTML = '';
    }
    if (body) {
      const el = document.createElement('div');
      el.className = 'men-acc-msg customer';
      el.innerHTML = `
        <div class="meta">أنت</div>
        <div>${escapeHtml(text)}</div>
        <div class="time"><i class="fas fa-check"></i><span>${fmtMsgTime(tempMsg.created_at)}</span></div>`;
      body.appendChild(el);
      body.scrollTop = body.scrollHeight;
    }

    input.value = '';
    input.style.height = 'auto';
    btn.disabled = true;

    try {
      const { error } = await sb.from('men_messages').insert({
        user_id: currentUser.id,
        user_email: currentUser.email,
        sender: 'customer',
        sender_name: currentUser.user_metadata?.name || 'العميل',
        sender_email: currentUser.email,
        message: text,
        type: 'chat',
        is_read: false
      });
      if (error) throw error;
      chatLastCount = 0;
      chatLastId = null;
      await loadCustomerChat();
    } catch (err) {
      console.error('sendCustomerChat error:', err);
      if (window.showToast) window.showToast('فشل الإرسال: ' + err.message, 'error');
      // أزل الرسالة المؤقتة
      if (body) body.removeChild(body.lastElementChild);
      input.value = text;
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  function startChatPolling() {
    stopChatPolling();
    chatPollTimer = setInterval(() => {
      if (!currentUser) return;
      if (!document.querySelector('[data-macc-panel="chat"]')?.classList.contains('active')) return;
      loadCustomerChat();
    }, 4000);
  }

  function stopChatPolling() {
    if (chatPollTimer) { clearInterval(chatPollTimer); chatPollTimer = null; }
  }

  async function checkUnreadMessages() {
    if (!currentUser) return;
    try {
      const { count, error } = await sb.from('men_messages')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', currentUser.id)
        .eq('is_read', false)
        .eq('sender', 'admin');
      if (error) return;
      updateChatBadge(count || 0);
    } catch (e) { /* ignore */ }
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 Fill Account Page
  // ═══════════════════════════════════════════════════════════
  async function fillAccountPage(user) {
    const meta = user.user_metadata || {};
    const name = meta.name || user.email?.split('@')[0] || 'مستخدم';

    let orders = [];
    try {
      const { data } = await sb.from('men_orders').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      orders = data || [];
    } catch (e) { console.warn('orders fetch failed', e); }

    let cashback = 0;
    try {
      const { data } = await sb.from('men_users').select('cashback').eq('id', user.id).maybeSingle();
      cashback = Number(data?.cashback || 0);
    } catch (e) { console.warn('cashback fetch failed', e); }

    const totalSpent = orders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total || 0), 0);
    const avatar = meta.avatar_url || makeInitialsAvatar(name, 300);
    const since = user.created_at ? new Date(user.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'long' }) : '—';

    $('menAccCoverAvatar').src = avatar;
    $('menAccCoverName').textContent = name;
    $('menAccCoverEmail').textContent = meta.email || user.email || '—';

    let level = 'برونزي';
    if (orders.length >= 20 || totalSpent >= 1000) level = 'ذهبي';
    else if (orders.length >= 5 || totalSpent >= 300) level = 'فضي';
    $('menAccMemberLevel').textContent = level;

    $('menAccStatOrders').textContent = orders.length;
    $('menAccStatCashback').textContent = cashback.toFixed(2);
    $('menAccStatSpent').textContent = totalSpent.toFixed(2);
    $('menAccStatSince').textContent = since;

    $('menAccCashbackBig').textContent = cashback.toFixed(2);
    $('menAccInfoName').textContent = name;
    $('menAccInfoEmail').textContent = meta.email || user.email || '—';
    $('menAccInfoPhone').textContent = meta.phone || '—';
    $('menAccInfoId').textContent = '#' + String(user.id || '').slice(0, 8).toUpperCase();

    $('menAccSetName').value = meta.name || '';
    $('menAccSetPhone').value = meta.phone || '';
    $('menAccSetEmail').value = meta.email || user.email || '';

    renderOrders(orders);
    checkUnreadMessages();
  }

  function renderOrders(orders) {
    const list = $('menAccOrdersList');
    if (!list) return;
    if (!orders.length) {
      list.innerHTML = `<div class="men-acc-empty"><div class="men-acc-empty-icon"><i class="fas fa-shopping-basket"></i></div><h3>لا يوجد طلبات بعد</h3><p>ابدأ رحلتك التسوقية واكسب كاش باك 2% على كل عملية</p><button type="button" id="menAccEmptyShop"><i class="fas fa-shopping-bag"></i> تسوق الآن</button></div>`;
      const b = $('menAccEmptyShop');
      if (b) b.addEventListener('click', closeAccount);
      return;
    }
    const STATUS_MAP = {
      pending:   { label: 'قيد الانتظار', color: '#d4a548', bg: 'linear-gradient(135deg,#d4a548,#b8860b)', icon: 'fa-hourglass-half' },
      preparing: { label: 'جاري التجهيز', color: '#3b82f6', bg: 'linear-gradient(135deg,#1e40af,#2563eb)', icon: 'fa-gears' },
      review:    { label: 'تحت المراجعة', color: '#60a5fa', bg: 'linear-gradient(135deg,#60a5fa,#3b82f6)', icon: 'fa-magnifying-glass' },
      delivered: { label: 'تم الاستلام',  color: '#4caf50', bg: 'linear-gradient(135deg,#16a34a,#4caf50)', icon: 'fa-circle-check' },
      cancelled: { label: 'ملغي',         color: '#dc2626', bg: 'linear-gradient(135deg,#dc2626,#991b1b)', icon: 'fa-circle-xmark' }
    };
    const sorted = [...orders].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    list.innerHTML = sorted.map((o) => {
      const st = STATUS_MAP[o.status] || STATUS_MAP.pending;
      const items = Array.isArray(o.items) ? o.items : [];
      const itemsTxt = items.slice(0, 3).map(it => `${it.name || 'منتج'} ×${it.qty || 1}`).join(' • ') + (items.length > 3 ? ` +${items.length - 3}` : '');
      const date = o.created_at ? new Date(o.created_at).toLocaleDateString('ar-SA', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
      const usedCb = Number(o.cashback_used || 0);
      const cbLine = usedCb > 0
        ? `<div class="men-acc-order-cb"><i class="fas fa-wallet"></i> استخدمت ${usedCb.toFixed(2)} ر.س كاش باك</div>`
        : '';
      return `
        <div class="men-acc-order">
          <div class="men-acc-order-badge" style="background:${st.bg};color:#fff">
            <i class="fas ${st.icon}"></i> ${st.label}
          </div>
          <div class="men-acc-order-header">
            <div class="men-acc-order-id" style="--st-color:${st.color}"><span class="dot"></span> طلب #${String(o.id || '').slice(-6).toUpperCase()}</div>
            <div class="men-acc-order-date"><i class="fas fa-clock"></i> ${date}</div>
          </div>
          <div class="men-acc-order-body">
            <div class="men-acc-order-items">${itemsTxt || 'تفاصيل الطلب'}${cbLine}</div>
            <div class="men-acc-order-total">${Number(o.total || 0).toFixed(2)} <span style="font-size:.85rem;opacity:.8">ر.س</span></div>
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
      await sb.from('men_users').update({ name, phone, updated_at: new Date().toISOString() }).eq('id', data.user.id);
      await fillAccountPage(data.user);
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
    if (!confirm('⚠️ هل أنت متأكد من حذف حسابك نهائياً؟')) return;
    if (window.showToast) window.showToast('تواصل مع الدعم: clan.men.ts@gmail.com', 'info');
  }

  function shareAccount() {
    if (!currentUser) return;
    const text = `🎮 أنا عضو في MEN Store!\nانضم إلينا واحصل على كاش باك 2%\n${location.origin}`;
    if (navigator.share) navigator.share({ title: 'MEN Store', text, url: location.origin }).catch(() => {});
    else navigator.clipboard.writeText(text).then(() => window.showToast?.('✅ تم نسخ الرابط', 'success'));
  }

  async function openAccount() {
    if (!currentUser) return open('login');
    injectCSS(); injectModals(); injectAccountPage();
    await fillAccountPage(currentUser);
    hideAllPages();
    $('menAccountPage').classList.add('active');
    history.replaceState(null, '', '#account');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const { data } = await sb.auth.getUser();
    if (data?.user) { currentUser = data.user; await fillAccountPage(data.user); }
  }

  function closeAccount() {
    stopChatPolling();
    hideAllPages();
    const store = $('storePage');
    if (store) store.classList.add('active');
    if (location.hash === '#account') history.replaceState(null, '', location.pathname);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function hideAllPages() { document.querySelectorAll('.page-view').forEach(p => p.classList.remove('active')); }

  async function logout() {
    stopChatPolling();
    await sb.auth.signOut();
    closeAccount();
    if (window.showToast) window.showToast('تم تسجيل الخروج', 'info');
  }

  function syncUI(user) {
    currentUser = user;
    const loginBtn = $('menLoginBtn');
    const avatar = $('menHeaderAvatar');
    if (user) {
      if (loginBtn) loginBtn.style.display = 'none';
      if (avatar) {
        const name = user.user_metadata?.name || user.email?.split('@')[0] || 'M';
        avatar.src = user.user_metadata?.avatar_url || makeInitialsAvatar(name, 100);
        avatar.style.display = 'block';
      }
      setTimeout(checkUnreadMessages, 800);
      setTimeout(() => window.MEN_CASHBACK?.refresh?.(), 600);
    } else {
      if (loginBtn) loginBtn.style.display = 'inline-flex';
      if (avatar) avatar.style.display = 'none';
      if ($('menAccountPage')?.classList.contains('active')) closeAccount();
      window.MEN_CASHBACK?.hide?.();
    }
    const mLogin = $('menMobileLogin');
    const mAccount = $('menMobileAccount');
    if (mLogin) mLogin.style.display = user ? 'none' : 'flex';
    if (mAccount) mAccount.style.display = user ? 'flex' : 'none';
    if (typeof window.updateCartUI === 'function') window.updateCartUI();
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 Cashback on Cart
  // ═══════════════════════════════════════════════════════════
  const CASHBACK_UI_HTML = `
    <div class="men-cb-box" id="menCbBox" style="display:none">
      <div class="men-cb-head">
        <div class="men-cb-icon"><i class="fas fa-wallet"></i></div>
        <div class="men-cb-info">
          <div class="men-cb-title">استخدم رصيد الكاش باك</div>
          <div class="men-cb-bal">رصيدك المتاح: <b id="menCbBalance">0.00</b> ر.س</div>
        </div>
        <label class="men-cb-switch-wrap">
          <input type="checkbox" id="menCbToggle">
          <span class="men-cb-switch"></span>
        </label>
      </div>
      <div class="men-cb-body" id="menCbBody" style="display:none">
        <div class="men-cb-row">
          <label>المبلغ المستخدم</label>
          <div class="men-cb-input">
            <input type="number" id="menCbInput" min="0" step="0.01" placeholder="0.00">
            <span>ر.س</span>
          </div>
        </div>
        <div class="men-cb-quick">
          <button type="button" data-pct="25">25%</button>
          <button type="button" data-pct="50">50%</button>
          <button type="button" data-pct="75">75%</button>
          <button type="button" data-pct="100">استخدم الكل</button>
        </div>
        <div class="men-cb-summary">
          <div><span>الإجمالي الأصلي</span><b id="menCbOrig">0.00</b></div>
          <div class="discount"><span>خصم الكاش باك</span><b id="menCbDiscount">− 0.00</b></div>
          <div class="total"><span>المطلوب دفعه</span><b id="menCbFinal">0.00 ر.س</b></div>
        </div>
      </div>
    </div>
  `;

  let cbBalance = 0;
  let cbTotal = 0;

  function findCartTotal() {
    const ids = ['cartTotalFinal','grandTotal','totalAmount','cartTotal','subtotal','checkoutTotal','orderTotal'];
    for (const id of ids) {
      const el = $(id);
      if (el) {
        const num = parseFloat(String(el.textContent).replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    const classes = ['.cart-total-value','.grand-total-value','.checkout-total-value','[data-cart-total]'];
    for (const sel of classes) {
      const el = document.querySelector(sel);
      if (el) {
        const num = parseFloat(String(el.textContent || el.dataset.cartTotal).replace(/[^\d.]/g, ''));
        if (!isNaN(num) && num > 0) return num;
      }
    }
    return 0;
  }

  function updateCbSummary() {
    const box = $('menCbBox');
    if (!box) return;
    const useToggle = $('menCbToggle').checked;
    const input = $('menCbInput');
    let useCb = 0;

    if (useToggle && input.value) {
      useCb = Math.max(0, Number(input.value) || 0);
      useCb = Math.min(useCb, cbBalance, cbTotal);
      useCb = Math.round(useCb * 100) / 100;
      input.value = useCb ? useCb.toFixed(2) : '';
    }

    $('menCbOrig').textContent = cbTotal.toFixed(2);
    $('menCbDiscount').textContent = '− ' + useCb.toFixed(2);
    $('menCbFinal').textContent = Math.max(0, cbTotal - useCb).toFixed(2) + ' ر.س';
  }

  async function refreshCbUI() {
    const box = $('menCbBox');
    if (!box) return;
    if (!currentUser) { box.style.display = 'none'; return; }

    try {
      const { data } = await sb.from('men_users').select('cashback').eq('id', currentUser.id).maybeSingle();
      cbBalance = Number(data?.cashback || 0);
    } catch { cbBalance = 0; }

    $('menCbBalance').textContent = cbBalance.toFixed(2);

    if (cbBalance <= 0) {
      box.style.display = 'none';
      return;
    }

    box.style.display = 'block';
    cbTotal = findCartTotal();
    updateCbSummary();
  }

  function hideCbUI() {
    const box = $('menCbBox');
    if (box) box.style.display = 'none';
  }

  function injectCbIntoCart() {
    const targets = [
      '#cartDrawer .cart-footer',
      '#cartDrawer .cart-summary',
      '#cartModal .cart-footer',
      '.cart-drawer .cart-footer',
      '.cart-sidebar .cart-footer',
      '.cart-summary',
      '.cart-footer',
      '#checkoutSummary',
      '#cartSummary'
    ];
    let anchor = null;
    for (const sel of targets) {
      const el = document.querySelector(sel);
      if (el) { anchor = el; break; }
    }
    if (!anchor) return false;
    if ($('menCbBox')) return true;

    const wrap = document.createElement('div');
    wrap.innerHTML = CASHBACK_UI_HTML;
    const box = wrap.firstElementChild;
    anchor.insertBefore(box, anchor.firstChild);

    $('menCbToggle').addEventListener('change', () => {
      const checked = $('menCbToggle').checked;
      $('menCbBody').style.display = checked ? 'block' : 'none';
      if (checked) {
        cbTotal = findCartTotal();
        const maxUse = Math.min(cbBalance, cbTotal);
        $('menCbInput').value = maxUse.toFixed(2);
      } else {
        $('menCbInput').value = '';
      }
      updateCbSummary();
    });

    $('menCbInput').addEventListener('input', () => {
      const v = Number($('menCbInput').value) || 0;
      if (v > cbBalance) $('menCbInput').value = cbBalance.toFixed(2);
      if (v > cbTotal) $('menCbInput').value = cbTotal.toFixed(2);
      updateCbSummary();
    });

    box.querySelectorAll('[data-pct]').forEach(btn => {
      btn.addEventListener('click', () => {
        const pct = Number(btn.dataset.pct) / 100;
        const maxUse = Math.min(cbBalance, cbTotal);
        const use = Math.round(maxUse * pct * 100) / 100;
        $('menCbInput').value = use.toFixed(2);
        updateCbSummary();
      });
    });

    setInterval(() => {
      const t = findCartTotal();
      if (t !== cbTotal) { cbTotal = t; updateCbSummary(); }
    }, 1200);

    return true;
  }

  function watchCartOpen() {
    setInterval(() => {
      if (!currentUser) return;
      const opened = document.querySelector('#cartDrawer.open, #cartDrawer.active, .cart-drawer.open, .cart-drawer.active, #cartModal.show, #cartModal.active, .cart-modal.show');
      if (opened) {
        if (injectCbIntoCart()) refreshCbUI();
      }
    }, 500);
  }

  // ═══ Public API ═══
  window.MEN_AUTH = {
    CASHBACK_RATE, open, openAccount, logout,
    getCurrentUser: () => currentUser,
    isAdmin, makeInitialsAvatar,

    getCashbackBalance: async () => {
      if (!currentUser) return 0;
      try {
        const { data } = await sb.from('men_users').select('cashback').eq('id', currentUser.id).maybeSingle();
        return Number(data?.cashback || 0);
      } catch { return 0; }
    },

    addOrder: async (order, cashbackUsed = 0) => {
      if (!currentUser) return null;
      const orderId = 'M' + Date.now().toString().slice(-8);
      const meta = currentUser.user_metadata || {};
      const total = Number(order.total) || 0;

      let cbBalanceVal = 0;
      try {
        const { data } = await sb.from('men_users').select('cashback').eq('id', currentUser.id).maybeSingle();
        cbBalanceVal = Number(data?.cashback || 0);
      } catch (e) { console.warn(e); }

      let useCb = Math.max(0, Number(cashbackUsed) || 0);
      useCb = Math.min(useCb, cbBalanceVal, total);
      useCb = Math.round(useCb * 100) / 100;
      const finalTotal = Math.max(0, Math.round((total - useCb) * 100) / 100);

      try {
        const { error } = await sb.from('men_orders').insert({
          id: orderId,
          user_id: currentUser.id,
          user_email: meta.email || currentUser.email,
          user_name: meta.name || '',
          user_phone: meta.phone || '',
          items: order.items || [],
          total: finalTotal,
          cashback_used: useCb,
          status: 'pending',
          cashback: 0,
          cashback_applied: false
        });
        if (error) throw error;

        if (useCb > 0) {
          const newCb = Math.max(0, Math.round((cbBalanceVal - useCb) * 100) / 100);
          await sb.from('men_users').update({
            cashback: newCb,
            updated_at: new Date().toISOString()
          }).eq('id', currentUser.id);

          await sb.from('men_cashback_log').insert({
            user_id: currentUser.id,
            user_email: meta.email || currentUser.email,
            amount: -useCb,
            reason: `استخدام كاش باك على الطلب #${orderId}`,
            order_id: orderId,
            type: 'used_on_order',
            created_by: currentUser.email
          });
        }

        await sb.from('men_users').upsert({
          id: currentUser.id,
          email: meta.email || currentUser.email,
          name: meta.name || '',
          phone: meta.phone || '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        console.log('✅ Order created:', orderId, '| Used CB:', useCb, '| Final:', finalTotal);
        refreshCbUI();

        return { orderId, cashbackUsed: useCb, finalTotal };
      } catch (err) {
        console.error('addOrder failed:', err);
        throw err;
      }
    },

    addCashback: async (a) => {
      if (!currentUser || a <= 0) return;
      await sb.from('men_cashback_log').insert({
        user_id: currentUser.id, user_email: currentUser.email, amount: Number(a),
        reason: 'كاش باك يدوي', type: 'manual', created_by: currentUser.email
      });
      const { data } = await sb.from('men_users').select('cashback').eq('id', currentUser.id).maybeSingle();
      const newCb = Math.round((Number(data?.cashback || 0) + Number(a)) * 100) / 100;
      await sb.from('men_users').update({ cashback: newCb, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
      refreshCbUI();
    },

    deductCashback: async (a) => {
      if (!currentUser || a <= 0) return;
      await sb.from('men_cashback_log').insert({
        user_id: currentUser.id, user_email: currentUser.email, amount: -Number(a),
        reason: 'خصم', type: 'manual', created_by: currentUser.email
      });
      const { data } = await sb.from('men_users').select('cashback').eq('id', currentUser.id).maybeSingle();
      const newCb = Math.max(0, Math.round((Number(data?.cashback || 0) - Number(a)) * 100) / 100);
      await sb.from('men_users').update({ cashback: newCb, updated_at: new Date().toISOString() }).eq('id', currentUser.id);
      refreshCbUI();
    },

    getUsedCashback: () => {
      if (!$('menCbToggle')?.checked) return 0;
      return Number($('menCbInput')?.value) || 0;
    },
    hideCashbackBox: hideCbUI,
    refreshCashbackBox: refreshCbUI
  };

  window.MEN_CASHBACK = {
    getUsed: () => window.MEN_AUTH.getUsedCashback(),
    refresh: () => refreshCbUI(),
    hide: hideCbUI
  };

  // ═══ Bootstrap ═══
  async function bootstrap() {
    injectCSS();
    injectModals();
    const { data: { session } } = await sb.auth.getSession();
    syncUI(session?.user || null);
    sb.auth.onAuthStateChange(async (event, session) => {
      console.log('[MEN_AUTH]', event);
      syncUI(session?.user || null);
      if ($('menAccountPage')?.classList.contains('active') && session?.user) await fillAccountPage(session.user);
    });
    const av = $('menHeaderAvatar');
    if (av && !av.dataset.bound) {
      av.dataset.bound = '1';
      av.addEventListener('click', openAccount);
    }
    if (location.hash === '#account') {
      setTimeout(() => { if (currentUser) openAccount(); }, 500);
    }
    setInterval(checkUnreadMessages, 60000);
    watchCartOpen();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
