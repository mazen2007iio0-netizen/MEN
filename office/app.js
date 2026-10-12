/* ============================================================
   ✨ MEN Office — App v1
   (Business Management + Email + Tasks + Projects + AI)
   ============================================================ */
(function () {
  'use strict';

  // ════════ 🔑 المفاتيح ════════
  const SUPABASE_URL      = 'https://wziuzllafxjpiwcputwn.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aXV6bGxhZnhqcGl3Y3B1dHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTI0MDksImV4cCI6MjEwNTc2ODQwOX0.YfdTdXNydRI1olcQKAeLHn0-rOrbY-_P1gzndwhfIeU';

  const credsReady = SUPABASE_URL.startsWith('https://')
                  && SUPABASE_URL.includes('.supabase.co')
                  && SUPABASE_ANON_KEY.startsWith('eyJ')
                  && SUPABASE_ANON_KEY.length > 100;

  if (!credsReady) {
    console.error('❌ ضع مفاتيح Supabase الصحيحة');
    window.MEN_OFFICE = { open: () => alert('❌ أضف المفاتيح'), navigate: () => {}, logout: () => {} };
    return;
  }

  if (!window.supabase?.createClient) { console.error('[MEN_OFFICE] SDK غير محمّل'); return; }

  const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storageKey: 'menoffice-auth',
      storage: window.localStorage
    }
  });
  window.MEN_SUPABASE = sb;

  console.log('%c✨ MEN OFFICE v1', 'background:linear-gradient(135deg,#000,#333);color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;font-size:13px;letter-spacing:1px');

  // ════════ 📋 الثوابت ════════
  const APP_NAME = 'MEN Office';
  const APP_TAGLINE = 'منصة إدارة الأعمال المتكاملة';
  const SUPPORT_EMAIL = 'info@menoffice.com';
  const ADMIN_EMAILS = ['mkmkmkl24666606@gmail.com'];

  let currentUser = null;
  let currentProfile = null;
  let authMode = 'login';
  let currentPage = 'dashboard';
  let currentEmailIdx = 0;
  let currentChatIdx = 0;
  let searchTerm = '';

  const $ = id => document.getElementById(id);
  const $$ = sel => document.querySelectorAll(sel);
  const isAdmin = () => !!currentUser && ADMIN_EMAILS.includes((currentUser.email || '').toLowerCase());

  // ═══════ Helpers ═══════
  function initials(name) {
    if (!name) return '؟';
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '؟';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || '').trim().toLowerCase());
  }

  function formatDate(s) {
    if (!s) return '—';
    try { return new Date(s).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' }); }
    catch { return s; }
  }

  function formatTimeAgo(d) {
    if (!d) return '—';
    try {
      const date = new Date(d);
      const diffMs = new Date() - date;
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

  function makeInitialsAvatar(name, size = 200) {
    const ini = initials(name);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}"><defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#262626"/><stop offset="100%" stop-color="#000"/></linearGradient></defs><rect width="${size}" height="${size}" fill="url(#g)"/><text x="50%" y="52%" text-anchor="middle" dominant-baseline="central" font-family="Tajawal,Arial,sans-serif" font-size="${Math.round(size * 0.44)}" font-weight="900" fill="#ffffff">${ini}</text></svg>`;
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }

  // ═══════ Icons ═══════
  const ICONS = {
    check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>',
    close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
    send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
    plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
    folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
    users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>',
    msg:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
    file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
    chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>',
    ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3-3 3 3 0 0 0 3-3 3 3 0 0 0 0-6 3 3 0 0 0-3-3 3 3 0 0 0-3-3 3 3 0 0 0-3-3z"/><circle cx="12" cy="12" r="2"/></svg>',
    shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
    bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
    more:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
    arrowR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>',
    arrowL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
    trendUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>',
    trendDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></svg>',
    logout:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>',
    logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>'
  };

  // ═══════ الصور ═══════
  const LOGO_URL = 'https://www.socialcreator.com/srv/imgs/ti_imgs/202842_332160.png';

  // ═══════════════════════════════════════════════════════════
  // 🎨 CSS Injection
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if ($('menOfficeStyles')) return;
    const s = document.createElement('style');
    s.id = 'menOfficeStyles';
    s.textContent = `
      /* ═══ BASE ═══ */
      .mo-screen{position:fixed;inset:0;z-index:9999;display:none;font-family:'Tajawal',system-ui,-apple-system,sans-serif;background:#fafafa;overflow-y:auto;overflow-x:hidden}
      .mo-screen.active{display:block;animation:moFade .3s ease}
      @keyframes moFade{from{opacity:0}to{opacity:1}}

      /* ═══ AUTH ═══ */
      .mo-auth-grid{display:grid;grid-template-columns:1fr 1fr;min-height:100vh;background:#000}
      .mo-auth-brand{position:relative;overflow:hidden;background:linear-gradient(135deg,#000 0%,#0f0f0f 50%,#000 100%);display:flex;flex-direction:column;padding:60px;color:#fff}
      .mo-auth-brand::before{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(255,255,255,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.025) 1px,transparent 1px);background-size:48px 48px;mask-image:radial-gradient(ellipse at center,#000 10%,transparent 75%);-webkit-mask-image:radial-gradient(ellipse at center,#000 10%,transparent 75%)}
      .mo-auth-brand::after{content:'';position:absolute;top:-40%;left:-40%;width:80%;height:80%;background:radial-gradient(circle,rgba(255,255,255,.05),transparent 65%);border-radius:50%;pointer-events:none;animation:moGlow 20s ease-in-out infinite}
      @keyframes moGlow{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(20%,20%) scale(1.15)}}
      .mo-auth-brand-inner{position:relative;z-index:2;display:flex;flex-direction:column;height:100%}
      .mo-auth-logo{display:flex;align-items:center;gap:16px;margin-bottom:auto}
      .mo-auth-logo img{height:60px;width:auto;object-fit:contain;filter:brightness(0) invert(1)}
      .mo-auth-logo-txt{display:flex;flex-direction:column;line-height:1}
      .mo-auth-logo-txt b{font-size:24px;font-weight:900;letter-spacing:-.5px;color:#fff}
      .mo-auth-logo-txt span{font-size:11px;font-weight:700;color:rgba(255,255,255,.4);letter-spacing:4px;margin-top:6px}
      .mo-auth-hero{padding:60px 0}
      .mo-auth-kicker{display:inline-flex;align-items:center;gap:10px;font-size:11px;font-weight:800;letter-spacing:4px;color:rgba(255,255,255,.5);text-transform:uppercase;margin-bottom:26px;padding:8px 16px;border-radius:50px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);backdrop-filter:blur(10px);width:fit-content}
      .mo-auth-kicker::before{content:'';width:6px;height:6px;border-radius:50%;background:#fff;box-shadow:0 0 12px #fff;animation:moPulseDot 2s ease-in-out infinite}
      @keyframes moPulseDot{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.4;transform:scale(1.4)}}
      .mo-auth-hero h1{font-size:clamp(36px,4vw,54px);font-weight:900;letter-spacing:-2px;line-height:1.05;margin-bottom:24px;color:#fff}
      .mo-auth-hero h1 em{font-style:normal;background:linear-gradient(120deg,#fff 30%,rgba(255,255,255,.4) 90%);-webkit-background-clip:text;background-clip:text;-webkit-text-fill-color:transparent}
      .mo-auth-hero p{font-size:15px;color:rgba(255,255,255,.5);font-weight:500;line-height:1.9;max-width:420px}
      .mo-auth-features{display:flex;flex-direction:column;gap:14px;margin-top:34px}
      .mo-auth-feature{display:flex;align-items:center;gap:14px;padding:14px 18px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);backdrop-filter:blur(10px);width:fit-content;min-width:280px;transition:all .3s}
      .mo-auth-feature:hover{background:rgba(255,255,255,.06);transform:translateX(-6px)}
      .mo-auth-feature-ico{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0}
      .mo-auth-feature-ico svg{width:17px;height:17px}
      .mo-auth-feature-txt b{font-size:13px;font-weight:800;color:#fff;display:block;line-height:1.2}
      .mo-auth-feature-txt span{font-size:11.5px;color:rgba(255,255,255,.4);font-weight:500}
      .mo-auth-brand-foot{margin-top:auto;display:flex;justify-content:space-between;align-items:center;font-size:12px;color:rgba(255,255,255,.3);font-weight:600;padding-top:30px;border-top:1px solid rgba(255,255,255,.06)}
      .mo-auth-brand-foot .stats{display:flex;gap:30px}
      .mo-auth-brand-foot .stat b{color:#fff;font-size:16px;font-weight:900;display:block;line-height:1}
      .mo-auth-brand-foot .stat span{font-size:10.5px;color:rgba(255,255,255,.35);font-weight:600;margin-top:3px;display:block}
      .mo-auth-form-side{background:#fff;display:flex;align-items:center;justify-content:center;padding:60px;overflow-y:auto}
      .mo-auth-form-side::-webkit-scrollbar{width:0}
      .mo-auth-form-wrap{width:100%;max-width:400px;animation:moFormIn .7s cubic-bezier(.2,.8,.2,1)}
      @keyframes moFormIn{from{opacity:0;transform:translateY(30px)}to{opacity:1;transform:translateY(0)}}
      .mo-auth-head{margin-bottom:34px}
      .mo-auth-head .kicker{font-size:10.5px;font-weight:800;letter-spacing:4px;text-transform:uppercase;color:#a3a3a3;margin-bottom:14px;display:block}
      .mo-auth-head h2{font-size:30px;font-weight:900;letter-spacing:-1px;margin-bottom:10px;line-height:1.15;color:#0a0a0a}
      .mo-auth-head p{font-size:14px;color:#525252;font-weight:500;line-height:1.7}
      .mo-auth-mode{display:inline-flex;gap:0;background:#f5f5f5;border-radius:60px;padding:5px;margin-bottom:28px}
      .mo-auth-mode button{padding:10px 24px;border-radius:60px;font-weight:800;font-size:13px;color:#a3a3a3;transition:all .3s;position:relative;z-index:2;border:none;background:none;cursor:pointer;font-family:inherit}
      .mo-auth-mode button.active{background:#000;color:#fff;box-shadow:0 6px 18px rgba(0,0,0,.18)}
      .mo-auth-form{display:flex;flex-direction:column;gap:18px}
      .mo-form-field{display:flex;flex-direction:column;gap:8px}
      .mo-form-field label{font-size:12.5px;font-weight:800;color:#525252;letter-spacing:.2px}
      .mo-form-field input{padding:15px 18px;border-radius:14px;border:1.5px solid #e8e8e8;background:#fff;color:#0a0a0a;font-size:14.5px;font-weight:600;transition:all .25s;outline:none;font-family:inherit}
      .mo-form-field input:hover{border-color:#d4d4d4}
      .mo-form-field input:focus{border-color:#000;box-shadow:0 0 0 4px rgba(0,0,0,.06)}
      .mo-form-field input::placeholder{color:#a3a3a3;font-weight:500}
      .mo-auth-error{color:#dc2626;font-size:12.5px;font-weight:700;text-align:center;min-height:18px;padding:0;transition:all .3s}
      .mo-auth-error.show{padding:10px 16px;background:#fef2f2;border-radius:10px;border:1px solid #fee2e2}
      .mo-auth-error.success{color:#15803d;background:#f0fdf4;border-color:#bbf7d0}
      .mo-auth-submit{padding:16px;border-radius:14px;background:#000;color:#fff;font-weight:900;font-size:15px;letter-spacing:.3px;transition:all .3s;display:flex;align-items:center;justify-content:center;gap:10px;margin-top:6px;position:relative;overflow:hidden;border:none;cursor:pointer;font-family:inherit}
      .mo-auth-submit:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 14px 30px rgba(0,0,0,.25)}
      .mo-auth-submit:disabled{opacity:.6;cursor:not-allowed}
      .mo-auth-submit svg{width:16px;height:16px}
      .mo-auth-foot{margin-top:24px;padding-top:20px;border-top:1px solid #ebebeb;font-size:11.5px;color:#a3a3a3;text-align:center;font-weight:600;line-height:1.8}
      .mo-auth-foot b{color:#0a0a0a;font-weight:800}

      /* ═══ APP LAYOUT ═══ */
      .mo-app{display:none;height:100vh;overflow:hidden;font-family:'Tajawal',system-ui,-apple-system,sans-serif;background:#fafafa;color:#0a0a0a;line-height:1.55;font-size:14.5px}
      .mo-app.active{display:flex}
      .mo-sidebar{width:264px;flex-shrink:0;background:#0a0a0a;display:flex;flex-direction:column;position:relative;z-index:50;border-left:1px solid #1a1a1a;transition:transform .4s cubic-bezier(.4,0,.2,1)}
      .mo-sidebar::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent)}
      .mo-sb-brand{display:flex;align-items:center;gap:13px;padding:24px 22px;border-bottom:1px solid #1a1a1a}
      .mo-sb-logo{width:42px;height:42px;flex-shrink:0;display:flex;align-items:center;justify-content:center;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08)}
      .mo-sb-logo img{width:26px;height:26px;object-fit:contain;filter:brightness(0) invert(1)}
      .mo-sb-brand-txt{display:flex;flex-direction:column;line-height:1;min-width:0}
      .mo-sb-brand-txt b{font-size:15px;font-weight:900;color:#fff;letter-spacing:-.3px}
      .mo-sb-brand-txt span{font-size:10px;color:rgba(255,255,255,.35);font-weight:700;letter-spacing:2px;margin-top:5px}
      .mo-sb-nav{flex:1;overflow-y:auto;padding:18px 14px}
      .mo-sb-nav::-webkit-scrollbar{width:0}
      .mo-sb-group{margin-bottom:20px}
      .mo-sb-group-label{display:block;padding:6px 12px 10px;font-size:10px;font-weight:800;color:rgba(255,255,255,.28);letter-spacing:2.5px;text-transform:uppercase}
      .mo-sb-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:11px;color:rgba(255,255,255,.55);font-weight:700;font-size:13.5px;transition:all .25s;cursor:pointer;position:relative;margin-bottom:2px;white-space:nowrap}
      .mo-sb-item svg{width:18px;height:18px;flex-shrink:0;stroke-width:2.2}
      .mo-sb-item:hover{background:rgba(255,255,255,.05);color:rgba(255,255,255,.95)}
      .mo-sb-item.active{background:rgba(255,255,255,.09);color:#fff}
      .mo-sb-item.active::before{content:'';position:absolute;right:0;top:14px;bottom:14px;width:3px;background:#fff;border-radius:3px}
      .mo-sb-badge{margin-inline-start:auto;background:rgba(255,255,255,.09);color:#fff;font-size:10.5px;font-weight:900;padding:2px 8px;border-radius:20px;min-width:22px;text-align:center}
      .mo-sb-tag{margin-inline-start:auto;background:#fff;color:#000;font-size:9.5px;font-weight:900;padding:2px 7px;border-radius:20px;letter-spacing:.5px}
      .mo-sb-item.special{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.08)}
      .mo-sb-user{display:flex;align-items:center;gap:11px;padding:16px 18px;border-top:1px solid #1a1a1a;background:rgba(255,255,255,.02)}
      .mo-sb-user-av{width:38px;height:38px;border-radius:11px;background:#fff;color:#000;display:flex;align-items:center;justify-content:center;font-weight:900;font-size:13.5px;flex-shrink:0}
      .mo-sb-user-info{flex:1;min-width:0}
      .mo-sb-user-info b{font-size:13px;font-weight:800;color:#fff;display:block;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mo-sb-user-info span{font-size:10.5px;color:rgba(255,255,255,.4);font-weight:700;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mo-sb-logout{width:32px;height:32px;border-radius:9px;background:rgba(255,255,255,.05);display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,.7);transition:all .25s;flex-shrink:0;border:none;cursor:pointer}
      .mo-sb-logout:hover{background:rgba(220,38,38,.15);color:#f87171}
      .mo-sb-logout svg{width:15px;height:15px}

      /* ═══ MAIN ═══ */
      .mo-main{flex:1;display:flex;flex-direction:column;overflow:hidden;min-width:0}
      .mo-topbar{display:flex;align-items:center;gap:16px;padding:16px 28px;background:#fff;border-bottom:1px solid #ebebeb;flex-shrink:0;z-index:20}
      .mo-mobile-menu{display:none;width:42px;height:42px;border-radius:12px;background:#fff;border:1.5px solid #ebebeb;align-items:center;justify-content:center;color:#525252;cursor:pointer}
      .mo-mobile-menu svg{width:18px;height:18px}
      .mo-page-title{min-width:0;flex-shrink:0}
      .mo-page-title h1{font-size:19px;font-weight:900;letter-spacing:-.5px;line-height:1.2}
      .mo-page-title p{font-size:12px;color:#a3a3a3;font-weight:600;margin-top:3px}
      .mo-search{flex:1;max-width:420px;margin-inline-start:auto;position:relative;display:flex;align-items:center;background:#f5f5f5;border:1.5px solid transparent;border-radius:12px;padding:0 16px;height:42px;transition:all .25s}
      .mo-search:focus-within{background:#fff;border-color:#000;box-shadow:0 0 0 4px rgba(0,0,0,.05)}
      .mo-search svg{width:15px;height:15px;color:#a3a3a3;flex-shrink:0}
      .mo-search input{flex:1;background:transparent;border:none;color:#0a0a0a;font-size:13.5px;font-weight:600;padding:0 10px;min-width:0;outline:none;font-family:inherit}
      .mo-search input::placeholder{color:#a3a3a3;font-weight:500}
      .mo-top-actions{display:flex;align-items:center;gap:8px;flex-shrink:0}
      .mo-icon-btn{width:42px;height:42px;border-radius:12px;background:#fff;border:1.5px solid #ebebeb;display:flex;align-items:center;justify-content:center;color:#525252;transition:all .25s;position:relative;cursor:pointer}
      .mo-icon-btn svg{width:18px;height:18px}
      .mo-icon-btn:hover{border-color:#000;color:#000;transform:translateY(-1px)}
      .mo-icon-btn.has-dot::after{content:'';position:absolute;top:9px;left:9px;width:8px;height:8px;background:#000;border-radius:50%;border:2px solid #fff}
      .mo-btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;padding:11px 20px;border-radius:12px;font-weight:800;font-size:13.5px;transition:all .25s;white-space:nowrap;border:1.5px solid transparent;cursor:pointer;font-family:inherit}
      .mo-btn svg{width:15px;height:15px;flex-shrink:0}
      .mo-btn-primary{background:#000;color:#fff;box-shadow:0 6px 16px rgba(0,0,0,.15)}
      .mo-btn-primary:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(0,0,0,.25)}
      .mo-btn-ghost{background:#f5f5f5;border-color:#ebebeb;color:#525252}
      .mo-btn-ghost:hover{color:#000;border-color:#000}
      .mo-content{flex:1;overflow-y:auto;padding:28px;background:#fafafa}
      .mo-content::-webkit-scrollbar{width:8px}
      .mo-content::-webkit-scrollbar-thumb{background:#d4d4d4;border-radius:8px}

      /* ═══ GRID / CARDS ═══ */
      .mo-grid{display:grid;gap:20px}
      .mo-g2{grid-template-columns:repeat(2,1fr)}
      .mo-g3{grid-template-columns:repeat(3,1fr)}
      .mo-g4{grid-template-columns:repeat(4,1fr)}
      .mo-g21{grid-template-columns:2fr 1fr}
      .mo-g12{grid-template-columns:1fr 2fr}
      .mo-card{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:24px;transition:all .3s;position:relative}
      .mo-card:hover{border-color:#d4d4d4;box-shadow:0 12px 32px rgba(0,0,0,.08)}
      .mo-card-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;gap:12px}
      .mo-card-hd h3{font-size:15.5px;font-weight:900;letter-spacing:-.3px;display:flex;align-items:center;gap:9px}
      .mo-card-hd h3 svg{width:17px;height:17px;color:#000}
      .mo-card-hd p{font-size:12px;color:#a3a3a3;font-weight:600;margin-top:3px}
      .mo-stat{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:22px;position:relative;overflow:hidden;transition:all .3s}
      .mo-stat:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(0,0,0,.08);border-color:#d4d4d4}
      .mo-stat-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px}
      .mo-stat-ico{width:44px;height:44px;border-radius:12px;background:#f5f5f5;color:#000;display:flex;align-items:center;justify-content:center}
      .mo-stat-ico svg{width:20px;height:20px;stroke-width:2.2}
      .mo-stat-trend{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:900;padding:4px 10px;border-radius:20px}
      .mo-stat-trend.up{background:#000;color:#fff}
      .mo-stat-trend.down{background:#f5f5f5;color:#525252}
      .mo-stat-trend svg{width:11px;height:11px}
      .mo-stat-val{font-size:32px;font-weight:900;letter-spacing:-1.5px;line-height:1;margin-bottom:6px}
      .mo-stat-lbl{font-size:12.5px;color:#a3a3a3;font-weight:700}
      .mo-badge{display:inline-flex;align-items:center;gap:5px;padding:4px 11px;border-radius:20px;font-size:11px;font-weight:900;background:#f5f5f5;color:#525252}
      .mo-badge.dark{background:#000;color:#fff}
      .mo-av{width:38px;height:38px;border-radius:11px;display:flex;align-items:center;justify-content:center;color:#fff;font-weight:900;font-size:13.5px;flex-shrink:0;background:linear-gradient(135deg,#262626,#000)}
      .mo-av.sm{width:30px;height:30px;font-size:11.5px;border-radius:9px}
      .mo-av.lg{width:52px;height:52px;font-size:17px;border-radius:14px}
      .mo-av-stack{display:flex;align-items:center}
      .mo-av-stack .mo-av{margin-inline-start:-10px;border:2.5px solid #fff}
      .mo-av-stack .mo-av:first-child{margin-inline-start:0}
      .mo-progress{height:6px;background:#f5f5f5;border-radius:10px;overflow:hidden}
      .mo-progress > span{display:block;height:100%;border-radius:10px;background:#000;transition:width 1s cubic-bezier(.2,.8,.2,1)}
      .mo-list-item{display:flex;align-items:center;gap:14px;padding:14px 0;border-bottom:1px solid #f4f4f4}
      .mo-list-item:last-child{border-bottom:none;padding-bottom:0}
      .mo-list-body{flex:1;min-width:0}
      .mo-list-body b{font-size:13.5px;font-weight:800;display:block;line-height:1.3;margin-bottom:3px}
      .mo-list-body span{font-size:11.5px;color:#a3a3a3;font-weight:600}
      .mo-empty{text-align:center;padding:60px 20px;color:#a3a3a3}
      .mo-empty h3{color:#525252;font-size:15px;font-weight:900;margin-bottom:8px}
      .mo-empty p{font-size:13px;margin-bottom:18px}

      /* ═══ TABLE ═══ */
      .mo-table-wrap{overflow-x:auto;border-radius:12px;border:1px solid #ebebeb}
      .mo-table{width:100%;border-collapse:collapse;min-width:640px}
      .mo-table thead{background:#fafafa}
      .mo-table th{text-align:right;padding:14px 18px;font-size:11px;font-weight:900;color:#a3a3a3;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #ebebeb}
      .mo-table td{padding:16px 18px;border-bottom:1px solid #f4f4f4;font-size:13.5px;font-weight:600}
      .mo-table tbody tr:last-child td{border-bottom:none}
      .mo-table tbody tr:hover{background:#fafafa}

      /* ═══ KANBAN ═══ */
      .mo-kanban{display:grid;grid-template-columns:repeat(4,1fr);gap:18px;align-items:start}
      .mo-kanban-col{background:#f5f5f5;border-radius:18px;padding:18px;min-height:240px;border:1px solid #f4f4f4}
      .mo-kb-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;padding-bottom:14px;border-bottom:1px solid #ebebeb}
      .mo-kb-hd b{font-size:13.5px;font-weight:900;display:flex;align-items:center;gap:8px}
      .mo-kb-hd .count{background:#fff;border:1px solid #ebebeb;padding:3px 9px;border-radius:20px;font-size:11px;font-weight:900;color:#525252}
      .mo-kb-dot{width:8px;height:8px;border-radius:50%}
      .mo-kb-card{background:#fff;border:1px solid #ebebeb;border-radius:14px;padding:16px;margin-bottom:10px;cursor:pointer;transition:all .25s}
      .mo-kb-card:hover{border-color:#000;transform:translateY(-2px);box-shadow:0 4px 16px rgba(0,0,0,.05)}
      .mo-kb-card b{font-size:13.5px;font-weight:800;display:block;margin-bottom:12px;line-height:1.4}
      .mo-kb-meta{display:flex;align-items:center;justify-content:space-between;gap:8px}
      .mo-kb-tags{display:flex;gap:5px;flex-wrap:wrap}
      .mo-kb-tag{padding:3px 9px;border-radius:6px;font-size:10px;font-weight:900;background:#f5f5f5;color:#525252}

      /* ═══ EMAIL ═══ */
      .mo-email-layout{display:grid;grid-template-columns:340px 1fr;gap:20px;height:calc(100vh - 135px)}
      .mo-email-list{background:#fff;border:1px solid #ebebeb;border-radius:18px;overflow:hidden;display:flex;flex-direction:column}
      .mo-email-list-hd{padding:18px 20px;border-bottom:1px solid #ebebeb;display:flex;align-items:center;justify-content:space-between}
      .mo-email-list-hd b{font-size:14.5px;font-weight:900}
      .mo-email-items{flex:1;overflow-y:auto}
      .mo-email-item{padding:16px 20px;border-bottom:1px solid #f4f4f4;cursor:pointer;transition:all .2s;position:relative}
      .mo-email-item:hover{background:#fafafa}
      .mo-email-item.active{background:#f5f5f5;border-right:3px solid #000}
      .mo-email-item.unread::before{content:'';position:absolute;top:22px;right:20px;width:7px;height:7px;background:#000;border-radius:50%}
      .mo-email-item-hd{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:6px}
      .mo-email-item-hd b{font-size:13.5px;font-weight:800;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mo-email-item-hd span{font-size:11px;color:#a3a3a3;font-weight:700;flex-shrink:0}
      .mo-email-item .subj{font-size:12.5px;font-weight:800;color:#525252;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mo-email-item .preview{font-size:11.5px;color:#a3a3a3;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
      .mo-email-view{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:30px;overflow-y:auto}
      .mo-email-view h2{font-size:20px;font-weight:900;margin-bottom:16px;letter-spacing:-.5px}
      .mo-email-view-hd{display:flex;align-items:center;gap:14px;padding-bottom:20px;border-bottom:1px solid #ebebeb;margin-bottom:22px}
      .mo-email-view-body{font-size:14px;line-height:1.95;color:#525252;white-space:pre-wrap}

      /* ═══ MESSAGES ═══ */
      .mo-msg-layout{display:grid;grid-template-columns:300px 1fr;gap:20px;height:calc(100vh - 135px)}
      .mo-msg-side{background:#fff;border:1px solid #ebebeb;border-radius:18px;overflow:hidden;display:flex;flex-direction:column}
      .mo-msg-side-hd{padding:18px 20px;border-bottom:1px solid #ebebeb}
      .mo-msg-side-hd b{font-size:14.5px;font-weight:900}
      .mo-msg-contacts{flex:1;overflow-y:auto;padding:10px}
      .mo-msg-contact{display:flex;align-items:center;gap:12px;padding:12px;border-radius:12px;cursor:pointer;transition:all .2s;position:relative}
      .mo-msg-contact:hover{background:#fafafa}
      .mo-msg-contact.active{background:#f5f5f5;border:1px solid #ebebeb}
      .mo-msg-contact .mc-info{flex:1;min-width:0}
      .mo-msg-contact .mc-info b{font-size:13px;font-weight:800;display:block;line-height:1.2;margin-bottom:3px}
      .mo-msg-contact .mc-info span{font-size:11.5px;color:#a3a3a3;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;display:block}
      .mo-msg-chat{background:#fff;border:1px solid #ebebeb;border-radius:18px;display:flex;flex-direction:column;overflow:hidden}
      .mo-msg-chat-hd{padding:18px 22px;border-bottom:1px solid #ebebeb;display:flex;align-items:center;gap:14px}
      .mo-msg-chat-hd .info b{font-size:14.5px;font-weight:900;display:block;line-height:1.2}
      .mo-msg-chat-hd .info span{font-size:11.5px;color:#525252;font-weight:700}
      .mo-msg-body{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:14px;background:#fafafa}
      .mo-bubble{max-width:65%;padding:12px 16px;border-radius:16px;font-size:13.5px;line-height:1.7;word-wrap:break-word}
      .mo-bubble.them{background:#fff;border:1px solid #ebebeb;border-bottom-left-radius:5px;align-self:flex-start}
      .mo-bubble.me{background:#000;color:#fff;border-bottom-right-radius:5px;align-self:flex-end}
      .mo-bubble .time{font-size:10px;opacity:.65;margin-top:6px;text-align:left}
      .mo-msg-foot{padding:16px 20px;border-top:1px solid #ebebeb;display:flex;gap:10px;align-items:flex-end}
      .mo-msg-foot textarea{flex:1;padding:13px 18px;border-radius:14px;background:#f5f5f5;border:1.5px solid transparent;color:#0a0a0a;font-size:13.5px;font-weight:600;resize:none;max-height:110px;min-height:46px;transition:all .25s;outline:none;font-family:inherit}
      .mo-msg-foot textarea:focus{background:#fff;border-color:#000;box-shadow:0 0 0 4px rgba(0,0,0,.05)}
      .mo-msg-send{width:46px;height:46px;border-radius:14px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .25s;border:none;cursor:pointer}
      .mo-msg-send:hover{transform:translateY(-2px);box-shadow:0 12px 32px rgba(0,0,0,.15)}
      .mo-msg-send svg{width:18px;height:18px}

      /* ═══ CALENDAR ═══ */
      .mo-cal-wrap{display:grid;grid-template-columns:1.6fr 1fr;gap:20px}
      .mo-calendar{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:24px}
      .mo-cal-hd{display:flex;align-items:center;justify-content:space-between;margin-bottom:22px}
      .mo-cal-hd b{font-size:17px;font-weight:900;letter-spacing:-.3px}
      .mo-cal-nav{display:flex;gap:6px}
      .mo-cal-nav button{width:34px;height:34px;border-radius:10px;background:#f5f5f5;display:flex;align-items:center;justify-content:center;color:#525252;transition:all .2s;border:none;cursor:pointer}
      .mo-cal-nav button:hover{background:#000;color:#fff}
      .mo-cal-nav button svg{width:15px;height:15px}
      .mo-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px}
      .mo-cal-dow{text-align:center;padding:10px 0;font-size:11px;font-weight:900;color:#a3a3a3}
      .mo-cal-day{aspect-ratio:1;border-radius:11px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;cursor:pointer;transition:all .2s;position:relative;border:1.5px solid transparent}
      .mo-cal-day:hover{background:#f5f5f5}
      .mo-cal-day.muted{color:#a3a3a3;opacity:.35}
      .mo-cal-day.today{background:#000;color:#fff}
      .mo-cal-day.has-event::after{content:'';position:absolute;bottom:6px;width:5px;height:5px;border-radius:50%;background:#0a0a0a}
      .mo-cal-day.today.has-event::after{background:#fff}
      .mo-events-list{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:22px}
      .mo-event{display:flex;gap:14px;padding:14px;border-radius:14px;background:#fafafa;margin-bottom:12px;transition:all .25s;border-inline-start:3px solid #000}
      .mo-event:hover{transform:translateX(-4px);box-shadow:0 4px 16px rgba(0,0,0,.05)}
      .mo-event-time{font-size:12px;font-weight:900;color:#a3a3a3;min-width:56px}
      .mo-event-body{flex:1;min-width:0}
      .mo-event-body b{font-size:13.5px;font-weight:900;display:block;margin-bottom:4px}
      .mo-event-body span{font-size:11.5px;color:#a3a3a3;font-weight:600}

      /* ═══ FILES ═══ */
      .mo-file-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:18px}
      .mo-file-card{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:20px;transition:all .3s;cursor:pointer}
      .mo-file-card:hover{border-color:#000;transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.08)}
      .mo-file-ico{width:52px;height:52px;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:16px;background:#f5f5f5;color:#000}
      .mo-file-ico svg{width:24px;height:24px}
      .mo-file-card b{font-size:13.5px;font-weight:800;display:block;margin-bottom:6px;word-break:break-word}
      .mo-file-card span{font-size:11.5px;color:#a3a3a3;font-weight:700;display:block}

      /* ═══ EMPLOYEES ═══ */
      .mo-emp-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:18px}
      .mo-emp-card{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:26px;text-align:center;transition:all .3s}
      .mo-emp-card:hover{border-color:#000;transform:translateY(-4px);box-shadow:0 12px 32px rgba(0,0,0,.08)}
      .mo-emp-card .mo-av{margin:0 auto 16px;width:66px;height:66px;font-size:22px;border-radius:18px}
      .mo-emp-card b{font-size:15px;font-weight:900;display:block;margin-bottom:5px;letter-spacing:-.3px}
      .mo-emp-card .role{font-size:12px;color:#a3a3a3;font-weight:700;margin-bottom:16px;display:block}
      .mo-emp-stats{display:flex;justify-content:space-around;padding-top:16px;border-top:1px solid #f4f4f4;gap:12px}
      .mo-emp-stat{text-align:center}
      .mo-emp-stat b{font-size:17px;font-weight:900;color:#000;display:block;margin-bottom:3px}
      .mo-emp-stat span{font-size:10.5px;color:#a3a3a3;font-weight:700}

      /* ═══ AI ═══ */
      .mo-ai-layout{display:grid;grid-template-columns:1fr 320px;gap:20px;height:calc(100vh - 135px)}
      .mo-ai-chat{background:#fff;border:1px solid #ebebeb;border-radius:18px;display:flex;flex-direction:column;overflow:hidden}
      .mo-ai-hd{padding:20px 24px;border-bottom:1px solid #ebebeb;display:flex;align-items:center;gap:14px;background:#fafafa}
      .mo-ai-av{width:42px;height:42px;border-radius:13px;background:#000;color:#fff;display:flex;align-items:center;justify-content:center}
      .mo-ai-av svg{width:22px;height:22px}
      .mo-ai-hd .ai-info b{font-size:15px;font-weight:900;display:block}
      .mo-ai-hd .ai-info span{font-size:11.5px;color:#525252;font-weight:700;display:flex;align-items:center;gap:5px}
      .mo-ai-body{flex:1;overflow-y:auto;padding:24px;display:flex;flex-direction:column;gap:18px}
      .mo-ai-msg{display:flex;gap:12px;max-width:88%}
      .mo-ai-msg.user{margin-inline-start:auto;flex-direction:row-reverse}
      .mo-ai-bubble{padding:14px 18px;border-radius:16px;font-size:13.5px;line-height:1.8;background:#f5f5f5}
      .mo-ai-msg.user .mo-ai-bubble{background:#000;color:#fff;border-bottom-right-radius:5px}
      .mo-ai-suggest{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:22px}
      .mo-ai-suggest h4{font-size:11px;font-weight:900;color:#a3a3a3;text-transform:uppercase;letter-spacing:2px;margin-bottom:16px}
      .mo-ai-suggest button{display:block;width:100%;text-align:right;padding:13px 16px;border-radius:12px;background:#f5f5f5;font-size:12.5px;font-weight:700;color:#525252;margin-bottom:8px;transition:all .25s;border:none;cursor:pointer;font-family:inherit}
      .mo-ai-suggest button:hover{background:#000;color:#fff;transform:translateX(-3px)}

      /* ═══ SETTINGS ═══ */
      .mo-settings-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px}
      .mo-setting-card{background:#fff;border:1px solid #ebebeb;border-radius:18px;padding:24px}
      .mo-setting-card h3{font-size:15px;font-weight:900;margin-bottom:20px;display:flex;align-items:center;gap:10px}
      .mo-setting-card h3 svg{width:17px;height:17px}
      .mo-setting-row{display:flex;align-items:center;justify-content:space-between;padding:14px 0;border-bottom:1px solid #f4f4f4;gap:14px}
      .mo-setting-row:last-child{border-bottom:none}
      .mo-setting-row .sr-info b{font-size:13.5px;font-weight:800;display:block;margin-bottom:3px}
      .mo-setting-row .sr-info span{font-size:11.5px;color:#a3a3a3;font-weight:600}
      .mo-switch{width:46px;height:26px;border-radius:20px;background:#e8e8e8;position:relative;cursor:pointer;transition:all .3s;flex-shrink:0}
      .mo-switch::after{content:'';position:absolute;top:3px;right:3px;width:20px;height:20px;border-radius:50%;background:#fff;transition:all .3s;box-shadow:0 2px 6px rgba(0,0,0,.15)}
      .mo-switch.on{background:#000}
      .mo-switch.on::after{right:calc(100% - 23px)}

      /* ═══ MODAL ═══ */
      .mo-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);backdrop-filter:blur(8px);z-index:1000;display:none;align-items:center;justify-content:center;padding:20px}
      .mo-modal-overlay.on{display:flex;animation:moFade .25s}
      .mo-modal{background:#fff;border-radius:24px;max-width:520px;width:100%;max-height:90vh;overflow-y:auto;padding:32px;position:relative;animation:moSlideUp .4s cubic-bezier(.2,.8,.2,1);box-shadow:0 40px 100px rgba(0,0,0,.25);font-family:'Tajawal',system-ui,sans-serif;color:#0a0a0a}
      @keyframes moSlideUp{from{transform:translateY(30px);opacity:.5}to{transform:translateY(0);opacity:1}}
      .mo-modal h2{font-size:22px;font-weight:900;margin-bottom:8px;letter-spacing:-.5px}
      .mo-modal .sub{font-size:13px;color:#a3a3a3;font-weight:600;margin-bottom:26px}
      .mo-field{margin-bottom:18px}
      .mo-field label{display:block;font-size:12.5px;font-weight:800;color:#525252;margin-bottom:8px}
      .mo-field input,.mo-field select,.mo-field textarea{width:100%;padding:14px 16px;border-radius:12px;border:1.5px solid #e8e8e8;background:#fff;color:#0a0a0a;font-size:14px;font-weight:600;transition:all .25s;outline:none;font-family:inherit}
      .mo-field input:focus,.mo-field select:focus,.mo-field textarea:focus{border-color:#000;box-shadow:0 0 0 4px rgba(0,0,0,.05)}
      .mo-field textarea{resize:vertical;min-height:100px}
      .mo-modal-close{position:absolute;top:18px;left:18px;width:38px;height:38px;border-radius:12px;background:#f5f5f5;border:1px solid #ebebeb;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;color:#525252}
      .mo-modal-close:hover{background:#000;color:#fff;border-color:#000}
      .mo-modal-close svg{width:15px;height:15px}

      /* ═══ TOAST ═══ */
      #mo-toast{position:fixed;bottom:30px;left:50%;transform:translateX(-50%) translateY(30px);background:#000;color:#fff;padding:14px 26px;border-radius:14px;font-weight:800;font-size:13.5px;z-index:3000;opacity:0;pointer-events:none;transition:all .35s;box-shadow:0 32px 80px rgba(0,0,0,.15);max-width:88vw;display:flex;align-items:center;gap:10px;font-family:'Tajawal',system-ui,sans-serif}
      #mo-toast.show{opacity:1;transform:translateX(-50%) translateY(0)}
      #mo-toast svg{width:18px;height:18px;flex-shrink:0}
      #mo-toast.error{background:#dc2626}

      /* ═══ LOADING ═══ */
      #mo-loading{position:fixed;inset:0;background:rgba(255,255,255,.9);backdrop-filter:blur(6px);z-index:9999;display:none;align-items:center;justify-content:center}
      #mo-loading.on{display:flex}
      .mo-spinner{width:44px;height:44px;border-radius:50%;border:3px solid #e8e8e8;border-top-color:#000;animation:moSpin .8s linear infinite}
      @keyframes moSpin{to{transform:rotate(360deg)}}

      /* ═══ SIDEBAR OVERLAY ═══ */
      .mo-sidebar-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);backdrop-filter:blur(4px);z-index:40;display:none}
      .mo-sidebar-overlay.on{display:block}

      /* ═══ RESPONSIVE ═══ */
      @media (max-width:1024px){
        .mo-auth-grid{grid-template-columns:1fr}
        .mo-auth-brand{display:none}
        .mo-auth-form-side{padding:40px 24px}
      }
      @media (max-width:1200px){
        .mo-search{max-width:260px}
        .mo-g4{grid-template-columns:repeat(2,1fr)}
        .mo-email-layout,.mo-msg-layout,.mo-ai-layout{grid-template-columns:1fr;height:auto;min-height:calc(100vh - 135px)}
        .mo-email-list,.mo-msg-side{max-height:300px}
        .mo-settings-grid{grid-template-columns:1fr}
        .mo-kanban{grid-template-columns:repeat(2,1fr)}
        .mo-cal-wrap{grid-template-columns:1fr}
      }
      @media (max-width:768px){
        .mo-sidebar{position:fixed;inset-block:0;inset-inline-start:0;transform:translateX(100%);z-index:60;box-shadow:-20px 0 60px rgba(0,0,0,.4)}
        .mo-sidebar.open{transform:translateX(0)}
        .mo-mobile-menu{display:flex}
        .mo-search{display:none}
        .mo-topbar{padding:14px 16px;gap:10px}
        .mo-page-title{flex:1;min-width:0}
        .mo-page-title h1{font-size:16px}
        .mo-page-title p{display:none}
        .mo-top-actions .mo-btn span{display:none}
        .mo-top-actions .mo-btn{padding:10px 12px}
        .mo-content{padding:16px}
        .mo-g2,.mo-g3,.mo-g4,.mo-g21,.mo-g12{grid-template-columns:1fr}
        .mo-kanban{grid-template-columns:1fr}
        .mo-card{padding:20px}
        .mo-icon-btn{width:38px;height:38px}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════
  // 🖼️ AUTH SCREEN
  // ═══════════════════════════════════════════════════════════
  function injectAuthScreen() {
    if ($('mo-auth-screen')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="mo-auth-screen" class="mo-screen active">
        <div class="mo-auth-grid">
          <div class="mo-auth-brand">
            <div class="mo-auth-brand-inner">
              <div class="mo-auth-logo">
                <img src="${LOGO_URL}" alt="MEN Office">
                <div class="mo-auth-logo-txt">
                  <b>MEN Office</b>
                  <span>OFFICE</span>
                </div>
              </div>

              <div class="mo-auth-hero">
                <div class="mo-auth-kicker">منصة إدارة الأعمال المتكاملة</div>
                <h1>أدر فريقك<br><em>بكل احترافية</em></h1>
                <p>منصة رقمية متكاملة تجمع إدارة الأعمال والبريد الإلكتروني والرسائل في مكان واحد — بواجهة أنيقة وأداء استثنائي.</p>
                <div class="mo-auth-features">
                  <div class="mo-auth-feature">
                    <div class="mo-auth-feature-ico">${ICONS.mail}</div>
                    <div class="mo-auth-feature-txt">
                      <b>البريد الإلكتروني</b>
                      <span>إرسال واستقبال باحترافية</span>
                    </div>
                  </div>
                  <div class="mo-auth-feature">
                    <div class="mo-auth-feature-ico">${ICONS.users}</div>
                    <div class="mo-auth-feature-txt">
                      <b>إدارة الفريق</b>
                      <span>توزيع المهام ومتابعة الأداء</span>
                    </div>
                  </div>
                  <div class="mo-auth-feature">
                    <div class="mo-auth-feature-ico">${ICONS.ai}</div>
                    <div class="mo-auth-feature-txt">
                      <b>ذكاء اصطناعي</b>
                      <span>مساعد ذكي لإدارة المهام</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mo-auth-brand-foot">
                <div class="stats">
                  <div class="stat"><b>+5000</b><span>شركة</span></div>
                  <div class="stat"><b>24/7</b><span>دعم</span></div>
                  <div class="stat"><b>99.9%</b><span>استقرار</span></div>
                </div>
                <div>© 2025 MEN Office</div>
              </div>
            </div>
          </div>

          <div class="mo-auth-form-side">
            <div class="mo-auth-form-wrap">
              <div class="mo-auth-head">
                <span class="kicker" id="moAuthKicker">WELCOME BACK</span>
                <h2 id="moAuthTitle">أهلاً بعودتك</h2>
                <p id="moAuthSub">سجّل دخولك للمتابعة إلى مساحة العمل الخاصة بك</p>
              </div>

              <div class="mo-auth-mode">
                <button class="active" data-tab="login" type="button">تسجيل الدخول</button>
                <button data-tab="signup" type="button">حساب جديد</button>
              </div>

              <form class="mo-auth-form" id="moAuthForm" onsubmit="return false;">
                <div class="mo-form-field" id="moNameField" style="display:none">
                  <label>الاسم الكامل</label>
                  <input type="text" id="moAuthName" placeholder="مثال: محمد العتيبي" autocomplete="name">
                </div>

                <div class="mo-form-field">
                  <label>البريد الإلكتروني</label>
                  <input type="email" id="moAuthEmail" placeholder="you@example.com" dir="ltr" style="text-align:right" autocomplete="email">
                </div>

                <div class="mo-form-field">
                  <label>كلمة المرور</label>
                  <input type="password" id="moAuthPassword" placeholder="••••••••" dir="ltr" style="text-align:right" autocomplete="current-password">
                </div>

                <div class="mo-auth-error" id="moAuthError"></div>

                <button class="mo-auth-submit" id="moAuthSubmit" type="button">
                  <span id="moAuthSubmitText">دخول إلى المنصة</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
                </button>
              </form>

              <div class="mo-auth-foot">
                بالدخول أنت توافق على <b>شروط الاستخدام</b> و <b>سياسة الخصوصية</b>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(wrap);

    wrap.querySelectorAll('.mo-auth-mode button').forEach(b => {
      b.addEventListener('click', () => switchAuthMode(b.dataset.tab));
    });
    $('moAuthSubmit').addEventListener('click', handleAuthSubmit);
    $('moAuthPassword').addEventListener('keydown', e => { if (e.key === 'Enter') handleAuthSubmit(); });
    $('moAuthEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('moAuthPassword').focus(); });
  }

  function switchAuthMode(mode) {
    authMode = mode === 'signup' ? 'signup' : 'login';
    const isSignup = authMode === 'signup';
    $$('.mo-auth-mode button').forEach(b => b.classList.toggle('active', b.dataset.tab === authMode));
    $('moNameField').style.display = isSignup ? 'flex' : 'none';
    $('moAuthKicker').textContent = isSignup ? 'CREATE ACCOUNT' : 'WELCOME BACK';
    $('moAuthTitle').textContent = isSignup ? 'ابدأ رحلتك' : 'أهلاً بعودتك';
    $('moAuthSub').textContent = isSignup ? 'أنشئ حسابك المجاني وابدأ بإدارة فريقك' : 'سجّل دخولك للمتابعة إلى مساحة العمل الخاصة بك';
    $('moAuthSubmitText').textContent = isSignup ? 'إنشاء الحساب' : 'دخول إلى المنصة';
    clearAuthMsg();
  }

  function showAuthMsg(msg, isSuccess = false) {
    const el = $('moAuthError');
    if (!msg) { el.textContent = ''; el.classList.remove('show', 'success'); return; }
    el.innerHTML = msg;
    el.classList.add('show');
    el.classList.toggle('success', isSuccess);
  }
  function clearAuthMsg() {
    const el = $('moAuthError');
    el.textContent = '';
    el.innerHTML = '';
    el.classList.remove('show', 'success');
  }

  async function handleAuthSubmit() {
    const email = $('moAuthEmail').value.trim().toLowerCase();
    const password = $('moAuthPassword').value;
    const name = $('moAuthName').value.trim();
    const btn = $('moAuthSubmit');

    clearAuthMsg();

    if (!email || !password) { showAuthMsg('⚠️ أكمل جميع الحقول'); return; }
    if (!isValidEmail(email)) { showAuthMsg('⚠️ صيغة البريد الإلكتروني غير صحيحة'); return; }
    if (password.length < 6) { showAuthMsg('⚠️ كلمة المرور يجب أن تكون 6 أحرف على الأقل'); return; }
    if (authMode === 'signup' && !name) { showAuthMsg('⚠️ الرجاء إدخال الاسم الكامل'); return; }

    btn.disabled = true;
    const orig = $('moAuthSubmitText').textContent;
    $('moAuthSubmitText').textContent = 'جارٍ...';

    try {
      if (authMode === 'signup') {
        const { data, error } = await sb.auth.signUp({
          email, password,
          options: { data: { name, full_name: name } }
        });

        if (error) {
          const m = (error.message || '').toLowerCase();
          if (m.includes('already') || m.includes('registered')) showAuthMsg('📧 هذا البريد مسجّل بالفعل — جرّب تسجيل الدخول');
          else if (m.includes('password')) showAuthMsg('🔒 كلمة المرور ضعيفة');
          else if (m.includes('rate') || m.includes('many')) showAuthMsg('⏱️ محاولات كثيرة — انتظر دقيقة');
          else showAuthMsg('❌ ' + error.message);
          return;
        }

        // إنشاء البروفايل يدوياً (احتياطي)
        if (data.user) {
          try {
            await sb.from('profiles').upsert({
              id: data.user.id, name, email, role: 'مدير عام'
            }, { onConflict: 'id' });
          } catch (e) { console.warn('[Profile create]', e); }
        }

        // حالة: تأكيد بريد مطلوب
        if (data.user && !data.session) {
          showAuthMsg(`
            <div style="text-align:right;line-height:1.7">
              ✅ <b>تم إنشاء حسابك بنجاح!</b><br>
              📧 أرسلنا رابط التفعيل إلى:<br>
              <span style="direction:ltr;display:inline-block;color:#000;font-weight:800;margin-top:4px">${escapeHtml(email)}</span><br>
              <span style="font-size:11.5px;color:#166534;font-weight:600;display:block;margin-top:6px">افتح بريدك واضغط على رابط التفعيل ثم عُد وسجّل الدخول</span>
            </div>
            <button id="moResendBtn" type="button" style="margin-top:10px;width:100%;padding:11px;border-radius:10px;background:#000;color:#fff;font-weight:800;font-size:12.5px;cursor:pointer;font-family:inherit;border:none">
              🔄 إعادة إرسال رابط التفعيل
            </button>
          `, true);

          setTimeout(() => {
            const rb = $('moResendBtn');
            if (rb) rb.addEventListener('click', async () => {
              rb.disabled = true;
              rb.textContent = 'جارٍ الإرسال...';
              try {
                const { error: rErr } = await sb.auth.resend({ type: 'signup', email });
                if (rErr) throw rErr;
                toast('تم إرسال رابط التفعيل ✓');
              } catch { toast('تعذّر الإرسال — انتظر قليلاً', 'error'); }
              finally { rb.disabled = false; rb.textContent = '🔄 إعادة إرسال رابط التفعيل'; }
            });
          }, 50);

          setTimeout(() => {
            switchAuthMode('login');
            $('moAuthEmail').value = email;
            showAuthMsg('✅ تم إنشاء الحساب — تحقق من بريدك ثم سجّل الدخول', true);
          }, 6000);

          return;
        }

        if (data.session) {
          toast('🎉 مرحباً بك في MEN Office!');
          await handleSession(data.session);
        }
      } else {
        const { data, error } = await sb.auth.signInWithPassword({ email, password });

        if (error) {
          const m = (error.message || '').toLowerCase();
          if (m.includes('invalid') || m.includes('credentials')) showAuthMsg('❌ البريد أو كلمة المرور غير صحيحة');
          else if (m.includes('confirm')) showAuthMsg('📧 يرجى تأكيد بريدك الإلكتروني أولاً');
          else if (m.includes('rate') || m.includes('many')) showAuthMsg('⏱️ محاولات كثيرة — انتظر قليلاً');
          else showAuthMsg('❌ ' + error.message);
          return;
        }

        toast('🎉 مرحباً بعودتك!');
        await handleSession(data.session);
      }
    } catch (err) {
      console.error('[Auth Error]', err);
      showAuthMsg('❌ خطأ في الاتصال — تحقق من اتصالك');
    } finally {
      btn.disabled = false;
      $('moAuthSubmitText').textContent = orig;
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🏢 APP SHELL
  // ═══════════════════════════════════════════════════════════
  function injectAppShell() {
    if ($('mo-app')) return;
    const wrap = document.createElement('div');
    wrap.innerHTML = `
      <div id="mo-app" class="mo-app">
        <aside class="mo-sidebar" id="moSidebar">
          <div class="mo-sb-brand">
            <div class="mo-sb-logo">
              <img src="${LOGO_URL}" alt="MEN Office">
            </div>
            <div class="mo-sb-brand-txt">
              <b>MEN Office</b>
              <span>OFFICE</span>
            </div>
          </div>

          <nav class="mo-sb-nav" id="moNav">
            <div class="mo-sb-group">
              <span class="mo-sb-group-label">الرئيسية</span>
              <a data-page="dashboard" class="mo-sb-item active">
                ${ICONS.logo}
                <span>لوحة التحكم</span>
              </a>
              <a data-page="projects" class="mo-sb-item">
                ${ICONS.folder}
                <span>المشاريع</span>
                <span class="mo-sb-badge" id="moNavProjects">0</span>
              </a>
              <a data-page="tasks" class="mo-sb-item">
                ${ICONS.check}
                <span>المهام</span>
                <span class="mo-sb-badge" id="moNavTasks">0</span>
              </a>
            </div>

            <div class="mo-sb-group">
              <span class="mo-sb-group-label">التواصل</span>
              <a data-page="email" class="mo-sb-item">
                ${ICONS.mail}
                <span>البريد الإلكتروني</span>
                <span class="mo-sb-badge" id="moNavEmails">0</span>
              </a>
              <a data-page="messages" class="mo-sb-item">
                ${ICONS.msg}
                <span>الرسائل</span>
              </a>
              <a data-page="calendar" class="mo-sb-item">
                ${ICONS.cal}
                <span>التقويم</span>
              </a>
            </div>

            <div class="mo-sb-group">
              <span class="mo-sb-group-label">الموارد</span>
              <a data-page="employees" class="mo-sb-item">
                ${ICONS.users}
                <span>الموظفون</span>
              </a>
              <a data-page="files" class="mo-sb-item">
                ${ICONS.file}
                <span>الملفات</span>
              </a>
              <a data-page="reports" class="mo-sb-item">
                ${ICONS.chart}
                <span>التقارير</span>
              </a>
            </div>

            <div class="mo-sb-group">
              <span class="mo-sb-group-label">ذكي</span>
              <a data-page="ai" class="mo-sb-item special">
                ${ICONS.ai}
                <span>الذكاء الاصطناعي</span>
                <span class="mo-sb-tag">AI</span>
              </a>
              <a data-page="settings" class="mo-sb-item">
                ${ICONS.shield}
                <span>الإعدادات</span>
              </a>
            </div>
          </nav>

          <div class="mo-sb-user">
            <div class="mo-sb-user-av" id="moSbUserAv">؟</div>
            <div class="mo-sb-user-info">
              <b id="moSbUserName">مستخدم</b>
              <span id="moSbUserRole">مدير عام</span>
            </div>
            <button class="mo-sb-logout" id="moLogoutBtn" title="تسجيل الخروج" type="button">${ICONS.logout}</button>
          </div>
        </aside>

        <div class="mo-main">
          <header class="mo-topbar">
            <button class="mo-mobile-menu" id="moMenuBtn" type="button">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
            </button>

            <div class="mo-page-title">
              <h1 id="moPageTitle">لوحة التحكم</h1>
              <p id="moPageSub">نظرة عامة على أداء فريقك</p>
            </div>

            <div class="mo-search">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>
              <input type="text" placeholder="ابحث..." id="moGlobalSearch">
            </div>

            <div class="mo-top-actions">
              <button class="mo-icon-btn has-dot" title="الإشعارات" type="button">
                ${ICONS.bell}
              </button>
              <button class="mo-btn mo-btn-primary" id="moNewTaskBtn" type="button">
                ${ICONS.plus}
                <span>إضافة</span>
              </button>
            </div>
          </header>

          <main class="mo-content" id="moContent"></main>
        </div>

        <div class="mo-sidebar-overlay" id="moSidebarOverlay"></div>
      </div>
    `;
    document.body.appendChild(wrap);

    // Bind
    $$('.mo-sb-item').forEach(el => el.addEventListener('click', () => navigate(el.dataset.page)));
    $('moMenuBtn').addEventListener('click', openSidebar);
    $('moSidebarOverlay').addEventListener('click', closeSidebar);
    $('moLogoutBtn').addEventListener('click', logout);
    $('moNewTaskBtn').addEventListener('click', () => openModal('task'));
    $('moGlobalSearch').addEventListener('input', e => {
      searchTerm = e.target.value.trim().toLowerCase();
      if (currentPage === 'email' || currentPage === 'tasks' || currentPage === 'projects') renderCurrentPage();
    });
  }

  function injectToastAndLoading() {
    if (!$('mo-toast')) {
      const t = document.createElement('div');
      t.id = 'mo-toast';
      document.body.appendChild(t);
    }
    if (!$('mo-loading')) {
      const l = document.createElement('div');
      l.id = 'mo-loading';
      l.innerHTML = '<div class="mo-spinner"></div>';
      document.body.appendChild(l);
    }
    if (!$('mo-modal-overlay')) {
      const m = document.createElement('div');
      m.id = 'mo-modal-overlay';
      m.className = 'mo-modal-overlay';
      m.innerHTML = '<div class="mo-modal" id="mo-modal"></div>';
      document.body.appendChild(m);
      m.addEventListener('click', e => { if (e.target === m) closeModal(); });
    }
  }

  let toastTimer;
  function toast(msg, type = 'success') {
    const t = $('mo-toast');
    if (!t) return;
    t.innerHTML = (type === 'error' ? ICONS.close : ICONS.check) + '<span>' + msg + '</span>';
    t.classList.toggle('error', type === 'error');
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 3000);
  }

  const showLoading = () => $('mo-loading')?.classList.add('on');
  const hideLoading = () => $('mo-loading')?.classList.remove('on');

  // ═══════════════════════════════════════════════════════════
  // 🔐 SESSION
  // ═══════════════════════════════════════════════════════════
  async function handleSession(session) {
    if (session?.user) {
      currentUser = session.user;
      $('mo-auth-screen').classList.remove('active');
      $('mo-app').classList.add('active');
      await loadProfile();
      await loadAllData();
      syncUserUI();
      const hash = location.hash.replace('#', '');
      navigate(['dashboard','projects','tasks','email','messages','calendar','employees','files','reports','ai','settings'].includes(hash) ? hash : 'dashboard');
    } else {
      currentUser = null;
      currentProfile = null;
      $('mo-auth-screen').classList.add('active');
      $('mo-app').classList.remove('active');
    }
  }

  async function logout() {
    if (!confirm('هل تريد تسجيل الخروج؟')) return;
    await sb.auth.signOut();
    currentUser = null;
    currentProfile = null;
    $('mo-app').classList.remove('active');
    $('mo-auth-screen').classList.add('active');
    $('moAuthEmail').value = '';
    $('moAuthPassword').value = '';
    clearAuthMsg();
    switchAuthMode('login');
    toast('تم تسجيل الخروج');
  }

  async function loadProfile() {
    if (!currentUser) return;
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
      currentProfile = data || {
        id: currentUser.id,
        name: currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'مستخدم',
        email: currentUser.email,
        role: 'مدير عام'
      };
    } catch (e) { console.warn('[loadProfile]', e); }
  }

  function syncUserUI() {
    if (!currentUser) return;
    const name = currentProfile?.name || currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'مستخدم';
    const ini = initials(name);
    if ($('moSbUserName')) $('moSbUserName').textContent = name;
    if ($('moSbUserAv')) $('moSbUserAv').textContent = ini;
    if ($('moSbUserRole')) $('moSbUserRole').textContent = currentProfile?.role || 'مدير عام';
  }

  // ═══════════════════════════════════════════════════════════
  // 📊 DATA STORE
  // ═══════════════════════════════════════════════════════════
  const store = {
    projects: [],
    tasks: [],
    emails: [],
    employees: [],
    files: [],
    events: [],
    chats: [],
    loaded: false
  };

  async function loadAllData() {
    if (!currentUser) return;
    showLoading();
    try {
      const uid = currentUser.id;

      const [profilesRes, projectsRes, tasksRes, emailsRes, filesRes, eventsRes, chatsRes] = await Promise.all([
        sb.from('profiles').select('*').limit(100),
        sb.from('projects').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
        sb.from('tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100),
        sb.from('emails').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(100),
        sb.from('files').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50),
        sb.from('events').select('*').eq('user_id', uid).order('event_time').limit(50),
        sb.from('chats').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
      ]);

      store.employees = (profilesRes.data || []).map(p => ({
        id: p.id,
        name: p.name || 'مستخدم',
        role: p.role || 'موظف',
        email: p.email,
        tasks: 0,
        projects: 0
      }));

      store.projects = (projectsRes.data || []).map(p => ({
        id: p.id,
        name: p.name,
        progress: p.progress || 0,
        team: Array.isArray(p.team) ? p.team : [],
        deadline: p.deadline,
        tasks: p.tasks_count || 0,
        done: p.done_count || 0,
        status: p.status || 'نشط'
      }));

      store.tasks = (tasksRes.data || []).map(t => ({
        id: t.id,
        title: t.title,
        project: t.project || 'عام',
        status: t.status || 'todo',
        priority: t.priority || 'عادي',
        assignee: t.assignee || 'غير محدد',
        due: t.due_date,
        tags: Array.isArray(t.tags) ? t.tags : []
      }));

      store.emails = (emailsRes.data || []).map(e => ({
        id: e.id,
        from: e.from_name || e.to_name || 'مستخدم',
        email: e.from_email || e.to_email || '',
        subject: e.subject || '',
        preview: (e.body || '').slice(0, 60),
        body: e.body || '',
        time: formatTimeAgo(e.created_at),
        unread: !e.is_read
      }));

      store.files = (filesRes.data || []).map(f => ({
        id: f.id,
        name: f.name,
        size: f.size || '0 KB',
        date: formatTimeAgo(f.created_at)
      }));

      store.events = (eventsRes.data || []).map(e => ({
        id: e.id,
        time: (e.event_time || '00:00').toString().slice(0, 5),
        title: e.title,
        desc: e.description || ''
      }));

      // رسائل المحادثات
      if (chatsRes.data?.length) {
        store.chats = await Promise.all(chatsRes.data.map(async c => {
          const { data: msgs } = await sb.from('messages')
            .select('*').eq('chat_id', c.id).order('created_at').limit(200);
          const messages = (msgs || []).map(m => ({
            from: m.from_user === uid ? 'me' : 'them',
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
          }));
          return {
            id: c.id,
            name: c.name,
            av: initials(c.name),
            online: c.online || false,
            last: messages[messages.length - 1]?.text || 'لا توجد رسائل',
            time: formatTimeAgo(c.created_at),
            messages
          };
        }));
      } else {
        store.chats = [];
      }

      // Nav badges
      if ($('moNavProjects')) $('moNavProjects').textContent = store.projects.length;
      if ($('moNavTasks')) $('moNavTasks').textContent = store.tasks.length;
      if ($('moNavEmails')) $('moNavEmails').textContent = store.emails.filter(e => e.unread).length;

      store.loaded = true;
    } catch (e) {
      console.error('[loadAllData]', e);
      toast('فشل تحميل البيانات', 'error');
    } finally {
      hideLoading();
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🧭 ROUTER
  // ═══════════════════════════════════════════════════════════
  const PAGES = {
    dashboard: { title: 'لوحة التحكم', sub: 'نظرة عامة على أداء فريقك ومشاريعك' },
    projects: { title: 'المشاريع', sub: 'إدارة جميع مشاريع الشركة' },
    tasks: { title: 'المهام', sub: 'متابعة المهام وتوزيعها على الفريق' },
    email: { title: 'البريد', sub: 'إرسال واستقبال الرسائل' },
    messages: { title: 'الرسائل', sub: 'محادثات فردية وجماعية' },
    calendar: { title: 'التقويم', sub: 'تنظيم مواعيدك واجتماعاتك' },
    employees: { title: 'الموظفون', sub: 'إدارة الفريق والأدوار والصلاحيات' },
    files: { title: 'الملفات', sub: 'رفع المستندات وتخزينها ومشاركتها' },
    reports: { title: 'التقارير', sub: 'متابعة أداء المشاريع والموظفين' },
    ai: { title: 'الذكاء الاصطناعي', sub: 'مساعدك الذكي لإدارة المهام' },
    settings: { title: 'الإعدادات', sub: 'تخصيص المنصة والأمان' }
  };

  function navigate(page) {
    if (!PAGES[page]) return;
    currentPage = page;
    $$('.mo-sb-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
    $('moPageTitle').textContent = PAGES[page].title;
    $('moPageSub').textContent = PAGES[page].sub;
    renderCurrentPage();
    closeSidebar();
    history.replaceState(null, '', '#' + page);
  }

  function renderCurrentPage() {
    const c = $('moContent');
    if (!c) return;
    const renderers = {
      dashboard: renderDashboard,
      projects: renderProjects,
      tasks: renderTasks,
      email: renderEmail,
      messages: renderMessages,
      calendar: renderCalendar,
      employees: renderEmployees,
      files: renderFiles,
      reports: renderReports,
      ai: renderAI,
      settings: renderSettings
    };
    const fn = renderers[currentPage] || renderDashboard;
    c.innerHTML = '<div style="animation:moFade .4s">' + fn() + '</div>';
    c.scrollTop = 0;
    bindPageEvents();
  }

  function bindPageEvents() {
    if (currentPage === 'email') bindEmailEvents();
    if (currentPage === 'messages') bindMessagesEvents();
    if (currentPage === 'ai') bindAIEvents();
    if (currentPage === 'settings') bindSettingsEvents();
  }

  // ═══════════════════════════════════════════════════════════
  // 📄 PAGE RENDERERS
  // ═══════════════════════════════════════════════════════════
  function renderDashboard() {
    const P = store.projects;
    const T = store.tasks;
    const E = store.emails;

    const stats = [
      { label: 'المشاريع', value: P.length, trend: '+12%', up: true, ico: 'folder' },
      { label: 'المهام', value: T.length, trend: '+8%', up: true, ico: 'check' },
      { label: 'الرسائل', value: E.length, trend: '+3', up: true, ico: 'mail' },
      { label: 'الموظفون', value: store.employees.length, trend: '—', up: true, ico: 'users' }
    ];

    const statCards = stats.map(s => `
      <div class="mo-stat">
        <div class="mo-stat-top">
          <div class="mo-stat-ico">${ICONS[s.ico]}</div>
          <div class="mo-stat-trend ${s.up ? 'up' : 'down'}">
            ${s.up ? ICONS.trendUp : ICONS.trendDown} ${s.trend}
          </div>
        </div>
        <div class="mo-stat-val">${s.value}</div>
        <div class="mo-stat-lbl">${s.label}</div>
      </div>`).join('');

    const recentTasks = T.slice(0, 5).map(t => `
      <div class="mo-list-item">
        <div class="mo-av">${initials(t.assignee)}</div>
        <div class="mo-list-body">
          <b>${escapeHtml(t.title)}</b>
          <span>${escapeHtml(t.project)} · ${escapeHtml(t.assignee)}</span>
        </div>
        <span class="mo-badge ${t.priority.includes('عالي') ? 'dark' : ''}">${escapeHtml(t.priority)}</span>
      </div>`).join('') || '<div class="mo-empty" style="padding:30px"><p>لا توجد مهام بعد</p></div>';

    const projectRows = P.slice(0, 5).map(p => `
      <tr>
        <td><b>${escapeHtml(p.name)}</b></td>
        <td>${p.team.length} أعضاء</td>
        <td>
          <div style="min-width:100px">
            <div class="mo-progress"><span style="width:${p.progress}%"></span></div>
            <div style="font-size:11px;font-weight:800;color:#a3a3a3;margin-top:5px">${p.progress}%</div>
          </div>
        </td>
        <td><span class="mo-badge ${p.status === 'نشط' ? 'dark' : ''}">${escapeHtml(p.status)}</span></td>
        <td style="color:#525252;font-size:12px;font-weight:700">${formatDate(p.deadline)}</td>
      </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:#a3a3a3;padding:30px">لا توجد مشاريع</td></tr>';

    const eventsList = store.events.slice(0, 5).map(e => `
      <div class="mo-event">
        <div class="mo-event-time">${e.time}</div>
        <div class="mo-event-body"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.desc)}</span></div>
      </div>`).join('') || '<div class="mo-empty" style="padding:20px"><p>لا توجد مواعيد</p></div>';

    const days = ['السبت', 'الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة'];
    const bars = days.map((d, i) => {
      const h = [45, 68, 52, 80, 62, 88, 54][i];
      return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;height:100%;justify-content:flex-end">
        <div style="width:100%;max-width:38px;border-radius:8px 8px 3px 3px;background:${i % 2 ? '#d4d4d4' : '#000'};height:${h}%;transition:height 1s"></div>
        <div style="font-size:11px;color:#a3a3a3;font-weight:800">${d}</div>
      </div>`;
    }).join('');

    return `
      <div class="mo-grid mo-g4" style="margin-bottom:20px">${statCards}</div>

      <div class="mo-grid mo-g21" style="margin-bottom:20px">
        <div class="mo-card">
          <div class="mo-card-hd">
            <div><h3>${ICONS.chart} أداء الأسبوع</h3><p>مقارنة الإنجاز اليومي</p></div>
            <span class="mo-badge dark">+18%</span>
          </div>
          <div style="display:flex;align-items:flex-end;justify-content:space-around;gap:10px;height:180px;padding:10px 0">${bars}</div>
        </div>

        <div class="mo-card">
          <div class="mo-card-hd"><h3>${ICONS.cal} اجتماعات اليوم</h3></div>
          ${eventsList}
        </div>
      </div>

      <div class="mo-grid mo-g12">
        <div class="mo-card">
          <div class="mo-card-hd"><h3>${ICONS.check} مهام قادمة</h3></div>
          ${recentTasks}
        </div>

        <div class="mo-card">
          <div class="mo-card-hd">
            <div><h3>${ICONS.folder} المشاريع النشطة</h3></div>
            <button class="mo-btn mo-btn-ghost" data-goto="projects" style="padding:8px 14px;font-size:12.5px" type="button">عرض الكل</button>
          </div>
          <div class="mo-table-wrap">
            <table class="mo-table">
              <thead><tr><th>المشروع</th><th>الفريق</th><th>التقدم</th><th>الحالة</th><th>الموعد</th></tr></thead>
              <tbody>${projectRows}</tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderProjects() {
    const filtered = searchTerm
      ? store.projects.filter(p => p.name.toLowerCase().includes(searchTerm))
      : store.projects;

    const cards = filtered.map(p => `
      <div class="mo-card">
        <div class="mo-card-hd" style="margin-bottom:16px">
          <div style="display:flex;align-items:center;gap:12px">
            <div class="mo-av lg">${initials(p.name)}</div>
            <div>
              <h3 style="font-size:15px">${escapeHtml(p.name)}</h3>
              <p>${p.tasks} مهمة · ${p.done} مكتملة</p>
            </div>
          </div>
          <span class="mo-badge ${p.status === 'نشط' ? 'dark' : ''}">${escapeHtml(p.status)}</span>
        </div>
        <div style="margin:18px 0">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12px;font-weight:800">التقدم</span>
            <span style="font-size:12px;font-weight:800">${p.progress}%</span>
          </div>
          <div class="mo-progress"><span style="width:${p.progress}%"></span></div>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;padding-top:16px;border-top:1px solid #f4f4f4">
          <div class="mo-av-stack">${p.team.slice(0, 4).map(m => `<div class="mo-av sm">${initials(m)}</div>`).join('')}</div>
          <div style="text-align:left">
            <div style="font-size:11px;color:#a3a3a3;font-weight:700">الموعد النهائي</div>
            <b style="font-size:13px">${formatDate(p.deadline)}</b>
          </div>
        </div>
      </div>`).join('') || '<div class="mo-card mo-empty" style="grid-column:1/-1"><h3>لا توجد مشاريع بعد</h3><p>ابدأ بإنشاء أول مشروع</p></div>';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <button class="mo-btn mo-btn-primary" id="moNewProjBtn" type="button">${ICONS.plus} مشروع جديد</button>
        <span class="mo-badge dark">${store.projects.length} مشروع</span>
      </div>
      <div class="mo-grid mo-g3">${cards}</div>
    `;
  }

  function renderTasks() {
    const filtered = searchTerm
      ? store.tasks.filter(t => t.title.toLowerCase().includes(searchTerm))
      : store.tasks;

    const cols = {
      todo: { name: 'بانتظار البدء', color: '#d4d4d4', items: filtered.filter(t => t.status === 'todo') },
      progress: { name: 'قيد التنفيذ', color: '#000', items: filtered.filter(t => t.status === 'progress') },
      review: { name: 'قيد المراجعة', color: '#737373', items: filtered.filter(t => t.status === 'review') },
      done: { name: 'مكتملة', color: '#262626', items: filtered.filter(t => t.status === 'done') }
    };

    const kanban = Object.keys(cols).map(k => {
      const c = cols[k];
      return `
        <div class="mo-kanban-col">
          <div class="mo-kb-hd">
            <b><span class="mo-kb-dot" style="background:${c.color}"></span> ${c.name}</b>
            <span class="count">${c.items.length}</span>
          </div>
          ${c.items.map(t => `
            <div class="mo-kb-card">
              <b>${escapeHtml(t.title)}</b>
              <div style="font-size:11.5px;color:#a3a3a3;font-weight:700;margin-bottom:12px">${escapeHtml(t.project)}</div>
              <div class="mo-kb-meta">
                <div class="mo-kb-tags">${t.tags.slice(0, 2).map(tg => `<span class="mo-kb-tag">${escapeHtml(tg)}</span>`).join('')}</div>
                <div class="mo-av sm">${initials(t.assignee)}</div>
              </div>
            </div>`).join('') || '<div style="text-align:center;padding:24px;font-size:12px;color:#a3a3a3">لا مهام</div>'}
        </div>`;
    }).join('');

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <button class="mo-btn mo-btn-primary" id="moNewTaskBtn2" type="button">${ICONS.plus} مهمة جديدة</button>
        <span class="mo-badge dark">${store.tasks.length} مهمة</span>
      </div>
      <div class="mo-kanban">${kanban}</div>
    `;
  }

  function renderEmail() {
    const filtered = searchTerm
      ? store.emails.filter(e => (e.subject || '').toLowerCase().includes(searchTerm) || (e.from || '').toLowerCase().includes(searchTerm))
      : store.emails;

    const items = filtered.map((e, i) => `
      <div class="mo-email-item ${i === currentEmailIdx ? 'active' : ''} ${e.unread ? 'unread' : ''}" data-email-idx="${i}">
        <div class="mo-email-item-hd">
          <b>${escapeHtml(e.from)}</b>
          <span>${e.time}</span>
        </div>
        <div class="subj">${escapeHtml(e.subject)}</div>
        <div class="preview">${escapeHtml(e.preview)}</div>
      </div>`).join('') || '<div style="padding:50px;text-align:center;color:#a3a3a3;font-size:13px">لا توجد رسائل بعد</div>';

    const viewEmail = filtered[currentEmailIdx];

    return `
      <div style="margin-bottom:18px">
        <button class="mo-btn mo-btn-primary" id="moComposeBtn" type="button">${ICONS.plus} رسالة جديدة</button>
      </div>
      <div class="mo-email-layout">
        <div class="mo-email-list">
          <div class="mo-email-list-hd">
            <b>البريد الوارد</b>
            <span class="mo-badge dark">${store.emails.filter(e => e.unread).length} غير مقروء</span>
          </div>
          <div class="mo-email-items">${items}</div>
        </div>
        <div class="mo-email-view" id="moEmailView">${emailViewContent(viewEmail)}</div>
      </div>
    `;
  }

  function emailViewContent(e) {
    if (!e) return '<div style="text-align:center;color:#a3a3a3;padding:80px 20px;font-size:13px">اختر رسالة لعرضها</div>';
    return `
      <div class="mo-email-view-hd">
        <div class="mo-av lg">${initials(e.from)}</div>
        <div style="flex:1">
          <b style="font-size:15px;font-weight:900;display:block">${escapeHtml(e.from)}</b>
          <span style="font-size:12px;color:#a3a3a3">${escapeHtml(e.email)}</span>
        </div>
        <span style="font-size:12px;color:#a3a3a3">${e.time}</span>
      </div>
      <h2>${escapeHtml(e.subject)}</h2>
      <div class="mo-email-view-body">${escapeHtml(e.body)}</div>
      <div style="margin-top:26px;display:flex;gap:10px">
        <button class="mo-btn mo-btn-primary" type="button">${ICONS.send} رد</button>
        <button class="mo-btn mo-btn-ghost" type="button">${ICONS.arrowR} تحويل</button>
      </div>
    `;
  }

  function renderMessages() {
    if (!store.chats.length) {
      return '<div class="mo-card mo-empty" style="padding:100px 20px"><h3>لا توجد محادثات بعد</h3><p>ابدأ محادثة جديدة مع فريقك</p></div>';
    }

    const contacts = store.chats.map((c, i) => `
      <div class="mo-msg-contact ${i === currentChatIdx ? 'active' : ''}" data-chat-idx="${i}">
        <div class="mo-av">${c.av}</div>
        <div class="mc-info">
          <b>${escapeHtml(c.name)}</b>
          <span>${escapeHtml(c.last)}</span>
        </div>
      </div>`).join('');

    const chat = store.chats[currentChatIdx];
    const bubbles = chat.messages.map(m => `
      <div class="mo-bubble ${m.from === 'me' ? 'me' : 'them'}">
        ${escapeHtml(m.text)}
        <div class="time">${m.time}</div>
      </div>`).join('') || '<div style="text-align:center;color:#a3a3a3;font-size:13px;margin:auto">لا توجد رسائل</div>';

    return `
      <div class="mo-msg-layout">
        <div class="mo-msg-side">
          <div class="mo-msg-side-hd"><b>المحادثات</b></div>
          <div class="mo-msg-contacts" id="moMsgContacts">${contacts}</div>
        </div>
        <div class="mo-msg-chat">
          <div class="mo-msg-chat-hd">
            <div class="mo-av">${chat.av}</div>
            <div class="info" style="flex:1">
              <b>${escapeHtml(chat.name)}</b>
              <span>${chat.online ? '● متصل الآن' : 'آخر ظهور مؤخراً'}</span>
            </div>
            <button class="mo-icon-btn" type="button">${ICONS.more}</button>
          </div>
          <div class="mo-msg-body" id="moMsgBody">${bubbles}</div>
          <div class="mo-msg-foot">
            <textarea placeholder="اكتب رسالتك..." id="moMsgInput" rows="1"></textarea>
            <button class="mo-msg-send" id="moMsgSend" type="button">${ICONS.send}</button>
          </div>
        </div>
      </div>
    `;
  }

  function renderCalendar() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const today = now.getDate();
    const monthNames = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];
    const dows = ['ح', 'ن', 'ث', 'ر', 'خ', 'ج', 'س'];

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevDays = new Date(year, month, 0).getDate();

    let days = [];
    for (let i = firstDay - 1; i >= 0; i--) days.push({ d: prevDays - i, muted: true });
    for (let i = 1; i <= daysInMonth; i++) days.push({ d: i, muted: false, today: i === today, event: [3, 7, 12, 15, 18, 22, 25].includes(i) });
    for (let i = 1; i <= 6; i++) days.push({ d: i, muted: true });

    const calDays = days.map(d => `
      <div class="mo-cal-day ${d.muted ? 'muted' : ''} ${d.today ? 'today' : ''} ${d.event ? 'has-event' : ''}">${d.d}</div>
    `).join('');

    const eventsList = store.events.map(e => `
      <div class="mo-event">
        <div class="mo-event-time">${e.time}</div>
        <div class="mo-event-body"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.desc)}</span></div>
      </div>`).join('') || '<div style="text-align:center;color:#a3a3a3;padding:20px;font-size:13px">لا توجد مواعيد</div>';

    return `
      <div class="mo-cal-wrap">
        <div class="mo-calendar">
          <div class="mo-cal-hd">
            <b>${monthNames[month]} ${year}</b>
            <div class="mo-cal-nav">
              <button type="button">${ICONS.arrowR}</button>
              <button type="button">${ICONS.arrowL}</button>
            </div>
          </div>
          <div class="mo-cal-grid">
            ${dows.map(d => `<div class="mo-cal-dow">${d}</div>`).join('')}
            ${calDays}
          </div>
        </div>
        <div class="mo-events-list">
          <div class="mo-card-hd"><h3>${ICONS.cal} مواعيد اليوم</h3></div>
          ${eventsList}
        </div>
      </div>
    `;
  }

  function renderEmployees() {
    const cards = store.employees.map(e => `
      <div class="mo-emp-card">
        <div class="mo-av">${initials(e.name)}</div>
        <b>${escapeHtml(e.name)}</b>
        <span class="role">${escapeHtml(e.role)}</span>
        <div class="mo-emp-stats">
          <div class="mo-emp-stat"><b>${e.tasks}</b><span>مهام</span></div>
          <div class="mo-emp-stat"><b>${e.projects}</b><span>مشاريع</span></div>
        </div>
      </div>`).join('') || '<div class="mo-card mo-empty" style="grid-column:1/-1"><h3>لا يوجد موظفون</h3></div>';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <span class="mo-badge dark">${store.employees.length} موظف مسجّل</span>
      </div>
      <div class="mo-emp-grid">${cards}</div>
    `;
  }

  function renderFiles() {
    const cards = store.files.map(f => `
      <div class="mo-file-card">
        <div class="mo-file-ico">${ICONS.file}</div>
        <b>${escapeHtml(f.name)}</b>
        <span>${f.size} · ${f.date}</span>
      </div>`).join('') || '<div class="mo-card mo-empty" style="grid-column:1/-1"><h3>لا توجد ملفات</h3></div>';

    return `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
        <span class="mo-badge dark">${store.files.length} ملف</span>
      </div>
      <div class="mo-file-grid">${cards}</div>
    `;
  }

  function renderReports() {
    const P = store.projects;
    const T = store.tasks;

    const stats = [
      { label: 'المشاريع', value: P.length, trend: '+12%', up: true, ico: 'folder' },
      { label: 'مكتملة', value: T.filter(t => t.status === 'done').length, trend: '+8%', up: true, ico: 'check' },
      { label: 'الرسائل', value: store.emails.length, trend: '+3', up: true, ico: 'mail' },
      { label: 'الموظفون', value: store.employees.length, trend: '—', up: true, ico: 'users' }
    ];

    const teamBars = store.employees.slice(0, 6).map(e => {
      const pct = Math.min(100, (e.tasks || 0) * 4 || 55);
      return `
        <div style="margin-bottom:22px">
          <div style="display:flex;justify-content:space-between;margin-bottom:8px">
            <span style="font-size:12.5px;font-weight:800">${escapeHtml(e.name)}</span>
            <span style="font-size:12.5px;font-weight:800;color:#a3a3a3">${pct}%</span>
          </div>
          <div class="mo-progress"><span style="width:${pct}%"></span></div>
        </div>`;
    }).join('') || '<div style="text-align:center;color:#a3a3a3;padding:20px;font-size:13px">لا توجد بيانات</div>';

    return `
      <div class="mo-grid mo-g4" style="margin-bottom:20px">
        ${stats.map(s => `
          <div class="mo-stat">
            <div class="mo-stat-top">
              <div class="mo-stat-ico">${ICONS[s.ico]}</div>
              <div class="mo-stat-trend ${s.up ? 'up' : 'down'}">${s.up ? ICONS.trendUp : ICONS.trendDown} ${s.trend}</div>
            </div>
            <div class="mo-stat-val">${s.value}</div>
            <div class="mo-stat-lbl">${s.label}</div>
          </div>`).join('')}
      </div>

      <div class="mo-grid mo-g2">
        <div class="mo-card">
          <div class="mo-card-hd"><h3>${ICONS.chart} أداء الفريق</h3></div>
          ${teamBars}
        </div>
        <div class="mo-card">
          <div class="mo-card-hd"><h3>${ICONS.folder} تقرير المشاريع</h3></div>
          <div class="mo-table-wrap">
            <table class="mo-table">
              <thead><tr><th>المشروع</th><th>التقدم</th><th>الحالة</th></tr></thead>
              <tbody>${P.map(p => `
                <tr>
                  <td><b>${escapeHtml(p.name)}</b></td>
                  <td>
                    <div style="min-width:80px">
                      <div class="mo-progress"><span style="width:${p.progress}%"></span></div>
                      <div style="font-size:11px;font-weight:800;color:#a3a3a3;margin-top:5px">${p.progress}%</div>
                    </div>
                  </td>
                  <td><span class="mo-badge ${p.status === 'نشط' ? 'dark' : ''}">${escapeHtml(p.status)}</span></td>
                </tr>`).join('') || '<tr><td colspan="3" style="text-align:center;color:#a3a3a3;padding:30px">لا توجد بيانات</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;
  }

  function renderAI() {
    const name = currentProfile?.name || 'مستخدم';
    return `
      <div class="mo-ai-layout">
        <div class="mo-ai-chat">
          <div class="mo-ai-hd">
            <div class="mo-ai-av">${ICONS.ai}</div>
            <div class="ai-info">
              <b>مساعد MEN Office الذكي</b>
              <span>● متاح دائماً</span>
            </div>
          </div>
          <div class="mo-ai-body" id="moAiBody">
            <div class="mo-ai-msg">
              <div class="mo-av">AI</div>
              <div class="mo-ai-bubble">مرحباً ${escapeHtml(name)}! 👋<br>يمكنني مساعدتك في:<br>• كتابة الرسائل والإيميلات<br>• تلخيص المستندات والتقارير<br>• إدارة المهام وتنظيمها<br>• اقتراح أفكار إبداعية<br><br>كيف يمكنني مساعدتك اليوم؟</div>
            </div>
          </div>
          <div class="mo-msg-foot">
            <textarea placeholder="اسألني أي شيء..." id="moAiInput" rows="1"></textarea>
            <button class="mo-msg-send" id="moAiSend" type="button">${ICONS.send}</button>
          </div>
        </div>
        <div class="mo-ai-suggest">
          <h4>اقتراحات سريعة</h4>
          <button data-prompt="اكتب لي إيميل احترافي لطلب اجتماع مع عميل جديد" type="button">📧 اكتب إيميل احترافي</button>
          <button data-prompt="لخّص لي اجتماع فريق التطوير الأخير في 5 نقاط" type="button">📝 لخّص اجتماعاً</button>
          <button data-prompt="اقترح عليّ خطة تسويقية لحملة جديدة" type="button">💡 خطة تسويقية</button>
          <button data-prompt="أنشئ لي جدول مهام أسبوعي لفريق من 5 أشخاص" type="button">📅 نظّم مهام الفريق</button>
          <button data-prompt="اكتب رسالة شكر احترافية لعميل قديم" type="button">💌 رسالة شكر</button>
        </div>
      </div>
    `;
  }

  function renderSettings() {
    const p = currentProfile || {};
    const u = currentUser;
    return `
      <div class="mo-settings-grid">
        <div class="mo-setting-card">
          <h3>${ICONS.users} حسابي</h3>
          <div class="mo-setting-row">
            <div class="sr-info"><b>الاسم</b><span>${escapeHtml(p.name || '—')}</span></div>
          </div>
          <div class="mo-setting-row">
            <div class="sr-info"><b>البريد</b><span>${escapeHtml(u?.email || '—')}</span></div>
          </div>
          <div class="mo-setting-row">
            <div class="sr-info"><b>رقم العضوية</b><span>#${String(u?.id || '').slice(0, 8).toUpperCase()}</span></div>
          </div>
        </div>

        <div class="mo-setting-card">
          <h3>${ICONS.bell} الإشعارات</h3>
          <div class="mo-setting-row">
            <div class="sr-info"><b>إشعارات البريد</b><span>عند وصول رسالة</span></div>
            <div class="mo-switch on"></div>
          </div>
          <div class="mo-setting-row">
            <div class="sr-info"><b>إشعارات المهام</b><span>عند إسناد مهمة</span></div>
            <div class="mo-switch on"></div>
          </div>
          <div class="mo-setting-row">
            <div class="sr-info"><b>الاجتماعات</b><span>قبل الموعد بـ 15 دقيقة</span></div>
            <div class="mo-switch on"></div>
          </div>
        </div>

        <div class="mo-setting-card">
          <h3>${ICONS.shield} الأمان</h3>
          <div class="mo-setting-row">
            <div class="sr-info"><b>الجلسة الحالية</b><span>جهازك الحالي</span></div>
            <span class="mo-badge dark">نشط</span>
          </div>
          <div class="mo-setting-row">
            <div class="sr-info"><b>آخر تسجيل دخول</b><span>${new Date().toLocaleDateString('ar-EG')}</span></div>
          </div>
        </div>

        <div class="mo-setting-card">
          <h3>${ICONS.check} عن المنصة</h3>
          <div class="mo-setting-row">
            <div class="sr-info"><b>الإصدار</b><span>1.0.0</span></div>
          </div>
          <div class="mo-setting-row">
            <div class="sr-info"><b>اللغة</b><span>العربية (RTL)</span></div>
            <span class="mo-badge">عربي</span>
          </div>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // 🎯 PAGE EVENT BINDINGS
  // ═══════════════════════════════════════════════════════════
  function bindEmailEvents() {
    $$('.mo-email-item').forEach(item => {
      item.addEventListener('click', () => {
        currentEmailIdx = +item.dataset.emailIdx;
        const filtered = searchTerm
          ? store.emails.filter(e => (e.subject || '').toLowerCase().includes(searchTerm) || (e.from || '').toLowerCase().includes(searchTerm))
          : store.emails;
        $$('.mo-email-item').forEach(el => el.classList.toggle('active', +el.dataset.emailIdx === currentEmailIdx));
        $('moEmailView').innerHTML = emailViewContent(filtered[currentEmailIdx]);
      });
    });
    $('moComposeBtn')?.addEventListener('click', () => openModal('compose'));
  }

  function bindMessagesEvents() {
    $$('.mo-msg-contact').forEach(c => {
      c.addEventListener('click', () => {
        currentChatIdx = +c.dataset.chatIdx;
        renderCurrentPage();
      });
    });
    const body = $('moMsgBody');
    if (body) body.scrollTop = body.scrollHeight;
    $('moMsgSend')?.addEventListener('click', sendMsg);
    $('moMsgInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
    });
  }

  async function sendMsg() {
    const inp = $('moMsgInput');
    const text = inp.value.trim();
    if (!text || !currentUser) return;
    const chat = store.chats[currentChatIdx];
    try {
      await sb.from('messages').insert({ chat_id: chat.id, from_user: currentUser.id, text });
      const time = new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' });
      chat.messages.push({ from: 'me', text, time });
      chat.last = text;
      inp.value = '';
      renderCurrentPage();
    } catch (e) { toast('فشل الإرسال', 'error'); }
  }

  function bindAIEvents() {
    const body = $('moAiBody');
    if (body) body.scrollTop = body.scrollHeight;
    $('moAiSend')?.addEventListener('click', sendAI);
    $('moAiInput')?.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAI(); }
    });
    $$('.mo-ai-suggest button').forEach(b => {
      b.addEventListener('click', () => {
        $('moAiInput').value = b.dataset.prompt;
        sendAI();
      });
    });
  }

  function sendAI() {
    const inp = $('moAiInput');
    const text = inp.value.trim();
    if (!text) return;
    const body = $('moAiBody');
    const name = currentProfile?.name || 'أنا';

    body.insertAdjacentHTML('beforeend', `
      <div class="mo-ai-msg user">
        <div class="mo-av">${initials(name)}</div>
        <div class="mo-ai-bubble">${escapeHtml(text)}</div>
      </div>
    `);
    inp.value = '';
    body.scrollTop = body.scrollHeight;

    setTimeout(() => {
      const reply = getAIResponse(text);
      body.insertAdjacentHTML('beforeend', `
        <div class="mo-ai-msg">
          <div class="mo-av">AI</div>
          <div class="mo-ai-bubble">${reply}</div>
        </div>
      `);
      body.scrollTop = body.scrollHeight;
    }, 700);
  }

  function getAIResponse(q) {
    const l = q.toLowerCase();
    if (l.includes('إيميل') || l.includes('ايميل') || l.includes('بريد'))
      return 'إليك مسودة إيميل احترافي:<br><br><b>الموضوع:</b> طلب اجتماع لمناقشة فرص التعاون<br><br>السلام عليكم،<br><br>أتمنى أن تكون بخير. أود أن أقترح عقد اجتماع لمناقشة سبل التعاون المستقبلية بيننا.<br><br>هل يناسبك يوم [التاريخ] الساعة [الوقت]؟<br><br>مع التقدير.';
    if (l.includes('لخّص') || l.includes('ملخص'))
      return '📝 <b>ملخص الاجتماع:</b><br>1. تمت مراجعة الإنجازات الأسبوعية<br>2. مناقشة تحديات الأداء وحلولها<br>3. إقرار خطة الأسبوع القادم<br>4. تحديد KPIs جديدة<br>5. الاتفاق على موعد الاجتماع القادم';
    if (l.includes('تسويق') || l.includes('حملة'))
      return '💡 <b>خطة تسويقية مقترحة:</b><br>1. <b>الوعي:</b> حملات السوشيال ميديا (40%)<br>2. <b>التفاعل:</b> محتوى تعليمي (25%)<br>3. <b>التحويل:</b> إعلانات مدفوعة (25%)<br>4. <b>الاحتفاظ:</b> برنامج ولاء (10%)';
    if (l.includes('جدول') || l.includes('مهام'))
      return '📅 <b>جدول مهام أسبوعي:</b><br>• <b>الأحد:</b> اجتماع تخطيط<br>• <b>الاثنين-الثلاثاء:</b> تنفيذ المهام<br>• <b>الأربعاء:</b> مراجعة منتصف الأسبوع<br>• <b>الخميس:</b> إكمال وتسليم<br>• <b>الجمعة:</b> تقرير أسبوعي';
    if (l.includes('شكر'))
      return '💌 <b>رسالة شكر احترافية:</b><br><br>عزيزي [العميل]،<br><br>أتقدم إليكم بجزيل الشكر على ثقتكم الغالية وتعاونكم المثمر معنا. نتطلع لمواصلة تقديم أفضل الخدمات لكم.<br><br>مع خالص التقدير.';
    return 'شكراً لك! يمكنني مساعدتك في:<br>• ✍️ كتابة الإيميلات<br>• 📝 تلخيص الاجتماعات<br>• 📊 إنشاء التقارير<br>• 💡 اقتراح الأفكار<br>• 📅 تنظيم المهام<br><br>اكتب طلبك بوضوح.';
  }

  function bindSettingsEvents() {
    $$('.mo-switch').forEach(el => el.addEventListener('click', () => el.classList.toggle('on')));
  }

  // ═══════════════════════════════════════════════════════════
  // 🪟 MODAL
  // ═══════════════════════════════════════════════════════════
  function openModal(type) {
    const m = $('mo-modal');
    if (!m) return;

    if (type === 'task') {
      m.innerHTML = `
        <button class="mo-modal-close" type="button" onclick="MEN_OFFICE.closeModal()">${ICONS.close}</button>
        <h2>مهمة جديدة</h2>
        <p class="sub">أضف مهمة جديدة وحدّد تفاصيلها</p>
        <div class="mo-field"><label>عنوان المهمة</label><input type="text" id="moMTaskTitle" placeholder="مثال: تصميم صفحة الهبوط"></div>
        <div class="mo-field"><label>المشروع</label><input type="text" id="moMTaskProject" placeholder="عام"></div>
        <div class="mo-field"><label>المسؤول</label>
          <select id="moMTaskAssignee">${store.employees.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)}</option>`).join('') || '<option>غير محدد</option>'}</select>
        </div>
        <div class="mo-field"><label>الأولوية</label>
          <select id="moMTaskPriority"><option>عالية</option><option>متوسطة</option><option>عادية</option></select>
        </div>
        <button class="mo-btn mo-btn-primary" id="moMSaveTask" type="button" style="width:100%;padding:15px;margin-top:8px">${ICONS.check} حفظ المهمة</button>
      `;
      setTimeout(() => $('moMSaveTask')?.addEventListener('click', saveTask), 30);
    } else if (type === 'compose') {
      m.innerHTML = `
        <button class="mo-modal-close" type="button" onclick="MEN_OFFICE.closeModal()">${ICONS.close}</button>
        <h2>رسالة جديدة</h2>
        <p class="sub">أرسل رسالة بريد إلكتروني</p>
        <div class="mo-field"><label>إلى</label><input type="email" id="moMEmailTo" placeholder="name@example.com" dir="ltr" style="text-align:right"></div>
        <div class="mo-field"><label>الاسم</label><input type="text" id="moMEmailName" placeholder="الاسم"></div>
        <div class="mo-field"><label>الموضوع</label><input type="text" id="moMEmailSubject" placeholder="الموضوع"></div>
        <div class="mo-field"><label>الرسالة</label><textarea id="moMEmailBody" rows="6" placeholder="اكتب رسالتك..."></textarea></div>
        <button class="mo-btn mo-btn-primary" id="moMSendEmail" type="button" style="width:100%;padding:15px;margin-top:8px">${ICONS.send} إرسال</button>
      `;
      setTimeout(() => $('moMSendEmail')?.addEventListener('click', sendEmail), 30);
    }
    $('mo-modal-overlay').classList.add('on');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    $('mo-modal-overlay')?.classList.remove('on');
    document.body.style.overflow = '';
  }

  async function saveTask() {
    const title = $('moMTaskTitle').value.trim();
    const project = $('moMTaskProject').value.trim() || 'عام';
    const assignee = $('moMTaskAssignee').value;
    const priority = $('moMTaskPriority').value;
    if (!title) { toast('أدخل عنوان المهمة', 'error'); return; }
    try {
      const { error } = await sb.from('tasks').insert({
        user_id: currentUser.id, title, project, assignee, priority, status: 'todo'
      });
      if (error) throw error;
      closeModal();
      toast('تمت إضافة المهمة ✓');
      await loadAllData();
      navigate('tasks');
    } catch (e) {
      console.error(e);
      toast('فشل الحفظ — تحقق من إعدادات قاعدة البيانات', 'error');
    }
  }

  async function sendEmail() {
    const to = $('moMEmailTo').value.trim();
    const toName = $('moMEmailName').value.trim();
    const subject = $('moMEmailSubject').value.trim();
    const body = $('moMEmailBody').value.trim();
    if (!to || !subject || !body) { toast('أكمل الحقول', 'error'); return; }
    if (!isValidEmail(to)) { toast('البريد غير صحيح', 'error'); return; }
    try {
      const { error } = await sb.from('emails').insert({
        user_id: currentUser.id, to_email: to, to_name: toName,
        from_name: currentProfile?.name || currentUser.email,
        from_email: currentUser.email,
        subject, body, is_read: true
      });
      if (error) throw error;
      closeModal();
      toast('تم الإرسال ✓');
      window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      await loadAllData();
      navigate('email');
    } catch (e) { toast('فشل الإرسال', 'error'); }
  }

  // ═══════════════════════════════════════════════════════════
  // 🎛 UI
  // ═══════════════════════════════════════════════════════════
  function openSidebar() {
    $('moSidebar')?.classList.add('open');
    $('moSidebarOverlay')?.classList.add('on');
  }
  function closeSidebar() {
    $('moSidebar')?.classList.remove('open');
    $('moSidebarOverlay')?.classList.remove('on');
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 BOOTSTRAP
  // ═══════════════════════════════════════════════════════════
  async function bootstrap() {
    injectCSS();
    injectToastAndLoading();
    injectAuthScreen();
    injectAppShell();

    // Global page links
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-goto]');
      if (btn) navigate(btn.dataset.goto);
      if (e.target.id === 'moNewTaskBtn2') openModal('task');
      if (e.target.id === 'moNewProjBtn') toast('قريباً');
    });

    // Keyboard
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') closeModal();
    });

    // Auth listener
    sb.auth.onAuthStateChange(async (event, session) => {
      console.log('[MEN_OFFICE]', event);
      if (event === 'SIGNED_OUT') {
        currentUser = null; currentProfile = null;
        $('mo-auth-screen')?.classList.add('active');
        $('mo-app')?.classList.remove('active');
      } else if (event === 'SIGNED_IN' && session?.user) {
        if (currentUser?.id !== session.user.id) await handleSession(session);
      } else if (event === 'TOKEN_REFRESHED' && session?.user) {
        currentUser = session.user;
      }
    });

    // Current session
    const { data: { session } } = await sb.auth.getSession();
    await handleSession(session);

    // Handle hash
    if (location.hash === '#account' && currentUser) navigate('settings');
  }

  // ═══════════════════════════════════════════════════════════
  // 🌐 PUBLIC API
  // ═══════════════════════════════════════════════════════════
  window.MEN_OFFICE = {
    open: (mode) => { $('mo-auth-screen').classList.add('active'); switchAuthMode(mode || 'login'); },
    openModal,
    closeModal,
    navigate,
    logout,
    getCurrentUser: () => currentUser,
    isAdmin,
    makeInitialsAvatar,
    supabase: sb
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootstrap);
  } else {
    bootstrap();
  }
})();
