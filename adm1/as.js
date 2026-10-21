/* ============================================================
   🛡️ MEN Store — Admin Orders Panel v2
   لوحة إدارة الطلبات + الكاش باك + التفاصيل + الطباعة + العملاء
   ============================================================ */
(function () {
  'use strict';

  // ═══ الإعدادات ═══
  const SUPABASE_URL = 'https://xoqwzluyxynqpdpmidts.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXd6bHV5eHlucXBkcG1pZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTI2NDAsImV4cCI6MjEwNTY4ODY0MH0.xIpvxJyAMAoLqkSR9RJk2ZcgN7rsfOg2OfbelraMWvs';
  const ADMIN_EMAILS  = ['mkmkmkl24666606@gmail.com'];
  const CASHBACK_RATE = 0.02;
  const LOGO_URL      = 'https://www.socialcreator.com/srv/imgs/ti_imgs/200176_309202.png';

  const ORDER_STATUS = {
    pending:   { label: 'قيد الانتظار', color: '#f5b342', bg: 'linear-gradient(135deg,#f5b342,#c98a1e)', icon: 'fa-hourglass-half', text: '#000' },
    preparing: { label: 'جاري التجهيز', color: '#4a7aff', bg: 'linear-gradient(135deg,#4a7aff,#021ca4)', icon: 'fa-gears', text: '#fff' },
    review:    { label: 'تحت المراجعة', color: '#6a9aff', bg: 'linear-gradient(135deg,#6a9aff,#4a7aff)', icon: 'fa-magnifying-glass', text: '#fff' },
    delivered: { label: 'تم الاستلام',  color: '#4caf50', bg: 'linear-gradient(135deg,#4caf50,#2e7d32)', icon: 'fa-circle-check', text: '#fff' },
    cancelled: { label: 'ملغي',         color: '#d90429', bg: 'linear-gradient(135deg,#d90429,#8b0018)', icon: 'fa-circle-xmark', text: '#fff' }
  };

  let sb = null;
  let currentUser = null;
  let allOrders = [];
  let allUsers = [];
  let usersView = false;
  let selectedOrderForCashback = null;
  let selectedOrderForDelete = null;
  let selectedUserForNote = null;
  let selectedUserForChat = null;
  let currentDetailOrder = null;
  let cbMode = 'add';

  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  const fmtDate = d => { if (!d) return '—'; try { return new Date(d).toLocaleString('ar-SA',{year:'numeric',month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}); } catch { return '—'; } };
  const fmtDateShort = d => { if (!d) return '—'; try { return new Date(d).toLocaleDateString('ar-SA',{year:'numeric',month:'short',day:'numeric'}); } catch { return '—'; } };
  const fmtAgo = d => {
    if (!d) return '—';
    const sec = Math.floor((Date.now()-new Date(d).getTime())/1000);
    if (sec < 60) return 'الآن';
    if (sec < 3600) return `قبل ${Math.floor(sec/60)} د`;
    if (sec < 86400) return `قبل ${Math.floor(sec/3600)} س`;
    if (sec < 2592000) return `قبل ${Math.floor(sec/86400)} يوم`;
    return fmtDate(d);
  };

  // ═══ Boot ═══
  function boot() {
    if (!window.supabase?.createClient) {
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      s.onload = init;
      document.head.appendChild(s);
    } else init();
  }

  function init() {
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'men-auth-token' }
    });
    injectCSS();
    injectHTML();
    bindEvents();
    checkAuth();
  }

  // ═══ CSS ═══
  function injectCSS() {
    if ($('menAdminStyles')) return;
    const s = document.createElement('style');
    s.id = 'menAdminStyles';
    s.textContent = `
      .ma-root{position:fixed;inset:0;z-index:99999;background:#060812;color:#fff;font-family:'Cairo',sans-serif;overflow-y:auto;overflow-x:hidden;display:none}
      .ma-root.active{display:block;animation:maFade .3s}
      @keyframes maFade{from{opacity:0}to{opacity:1}}
      .ma-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background:radial-gradient(ellipse at 15% 20%,rgba(2,28,164,.35) 0%,transparent 55%),radial-gradient(ellipse at 85% 80%,rgba(74,122,255,.25) 0%,transparent 50%),radial-gradient(ellipse at 50% 50%,#060812 0%,#030510 100%)}
      .ma-bg::after{content:'';position:absolute;inset:0;background-image:linear-gradient(rgba(74,122,255,.04) 1px,transparent 1px),linear-gradient(90deg,rgba(74,122,255,.04) 1px,transparent 1px);background-size:60px 60px;mask-image:radial-gradient(ellipse at center,black 20%,transparent 75%)}

      /* Gate */
      .ma-gate{position:relative;z-index:10;display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px}
      .ma-gate-card{background:linear-gradient(145deg,rgba(14,20,38,.85),rgba(8,12,24,.95));border:1px solid rgba(74,122,255,.14);border-radius:28px;padding:44px 40px;max-width:440px;width:100%;text-align:center;box-shadow:0 40px 100px -30px rgba(2,28,164,.8)}
      .ma-gate-icon{width:80px;height:80px;margin:0 auto 20px;border-radius:24px;background:linear-gradient(135deg,#021ca4,#4a7aff);display:flex;align-items:center;justify-content:center;font-size:2rem;box-shadow:0 20px 50px -12px rgba(74,122,255,.8)}
      .ma-gate-card h1{font-size:1.7rem;font-weight:900;margin-bottom:10px;letter-spacing:-.5px}
      .ma-gate-card p{color:#8a92b0;font-weight:600;margin-bottom:26px;line-height:1.7}
      .ma-field{margin-bottom:14px;text-align:right}
      .ma-field label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
      .ma-field input{width:100%;height:52px;padding:0 18px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-size:.94rem;font-weight:600;outline:none;transition:all .3s;direction:ltr;text-align:right;box-sizing:border-box}
      .ma-field input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.15)}
      .ma-gate-btn{width:100%;height:54px;border:none;border-radius:14px;margin-top:8px;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:1rem;cursor:pointer;transition:all .3s;box-shadow:0 14px 34px -12px rgba(74,122,255,.8);display:flex;align-items:center;justify-content:center;gap:10px}
      .ma-gate-btn:hover:not(:disabled){transform:translateY(-2px)}
      .ma-gate-err{display:none;margin-top:14px;padding:12px;border-radius:12px;background:rgba(217,4,41,.1);border:1px solid rgba(217,4,41,.3);color:#ff8a8a;font-size:.85rem;font-weight:700}
      .ma-gate-err.show{display:block}

      /* Dash */
      .ma-dash{position:relative;z-index:10;display:none;padding:24px 0 80px}
      .ma-dash.active{display:block}
      .ma-header{position:sticky;top:0;z-index:100;background:linear-gradient(180deg,rgba(6,8,18,.98),rgba(6,8,18,.9));backdrop-filter:blur(20px);border-bottom:1px solid rgba(74,122,255,.14);padding:16px 0;margin-bottom:28px}
      .ma-header-inner{max-width:1560px;margin:0 auto;padding:0 32px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
      .ma-brand{display:flex;align-items:center;gap:14px}
      .ma-brand img{height:44px;width:auto;filter:brightness(0) invert(1) drop-shadow(0 6px 18px rgba(74,122,255,.5))}
      .ma-brand-text .t{font-size:1.05rem;font-weight:900;letter-spacing:-.3px;line-height:1.2}
      .ma-brand-text .s{font-size:.72rem;color:#8a92b0;font-weight:700;letter-spacing:1px;text-transform:uppercase}
      .ma-user{display:flex;align-items:center;gap:12px}
      .ma-user-info{text-align:left}
      .ma-user-info .n{font-weight:800;font-size:.9rem}
      .ma-user-info .e{font-size:.72rem;color:#8a92b0;font-weight:600}
      .ma-btn-ghost{display:inline-flex;align-items:center;gap:8px;padding:10px 20px;border-radius:60px;background:rgba(217,4,41,.12);border:1px solid rgba(217,4,41,.3);color:#ff6b6b;font-family:'Cairo',sans-serif;font-weight:800;font-size:.84rem;cursor:pointer;transition:all .3s}
      .ma-btn-ghost:hover{background:rgba(217,4,41,.22);transform:translateY(-2px)}
      .ma-btn-users{background:rgba(74,122,255,.12)!important;border-color:rgba(74,122,255,.3)!important;color:#6a9aff!important}
      .ma-btn-users:hover{background:rgba(74,122,255,.22)!important}
      .ma-container{max-width:1560px;margin:0 auto;padding:0 32px}

      /* Stats */
      .ma-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:16px}
      .ma-stat{background:linear-gradient(145deg,rgba(14,20,38,.75),rgba(8,12,24,.9));border:1px solid rgba(74,122,255,.14);border-radius:22px;padding:24px;position:relative;overflow:hidden;transition:all .35s}
      .ma-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#4a7aff);opacity:.9}
      .ma-stat:hover{transform:translateY(-5px);border-color:rgba(74,122,255,.35);box-shadow:0 22px 50px -15px rgba(2,28,164,.6)}
      .ma-stat-icon{width:48px;height:48px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:14px;background:var(--icon-bg);color:var(--accent)}
      .ma-stat-val{font-size:2rem;font-weight:900;line-height:1.1;margin-bottom:4px;letter-spacing:-1px}
      .ma-stat-lbl{font-size:.8rem;color:#8a92b0;font-weight:700}
      .ma-stats-sm{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:28px}
      .ma-stat-sm{background:linear-gradient(145deg,rgba(14,20,38,.6),rgba(8,12,24,.8));border:1px solid rgba(74,122,255,.1);border-radius:18px;padding:18px 20px;display:flex;align-items:center;gap:14px;transition:all .3s}
      .ma-stat-sm:hover{border-color:rgba(74,122,255,.28);transform:translateY(-3px)}
      .ma-stat-sm-icon{width:42px;height:42px;border-radius:12px;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0;background:var(--icon-bg);color:var(--accent)}
      .ma-stat-sm-val{font-size:1.15rem;font-weight:900;line-height:1.2}
      .ma-stat-sm-lbl{font-size:.72rem;color:#8a92b0;font-weight:700;margin-top:2px}

      /* Filters */
      .ma-filters{background:linear-gradient(145deg,rgba(14,20,38,.75),rgba(8,12,24,.9));border:1px solid rgba(74,122,255,.14);border-radius:22px;padding:20px 24px;margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
      .ma-search{flex:1;min-width:260px;position:relative}
      .ma-search input{width:100%;height:48px;padding:0 44px 0 16px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-weight:600;font-size:.9rem;outline:none;transition:all .3s;box-sizing:border-box}
      .ma-search input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.15)}
      .ma-search i{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#4a7aff;pointer-events:none}
      .ma-filters select{height:48px;padding:0 18px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:.88rem;outline:none;cursor:pointer;min-width:180px}
      .ma-filters select:focus{border-color:#4a7aff}
      .ma-refresh{height:48px;padding:0 22px;border-radius:14px;border:none;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .3s;box-shadow:0 10px 26px -10px rgba(74,122,255,.8)}
      .ma-refresh:hover{transform:translateY(-2px)}

      /* Order card */
      .ma-orders{display:flex;flex-direction:column;gap:16px}
      .ma-order{background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.14);border-radius:22px;padding:26px 30px;transition:all .35s;position:relative;overflow:hidden}
      .ma-order:hover{transform:translateY(-3px);border-color:rgba(74,122,255,.35);box-shadow:0 20px 50px -15px rgba(2,28,164,.6)}
      .ma-order-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}
      .ma-order-id{font-weight:900;font-size:1.05rem;display:flex;align-items:center;gap:10px}
      .ma-order-id .dot{width:10px;height:10px;border-radius:50%;background:var(--st-color,#4caf50);box-shadow:0 0 14px var(--st-color,#4caf50)}
      .ma-order-date{color:#8a92b0;font-size:.8rem;font-weight:600;display:flex;align-items:center;gap:6px;margin-top:6px}
      .ma-order-badge{color:#fff;font-size:.74rem;font-weight:800;padding:7px 16px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 18px -6px rgba(0,0,0,.6)}
      .ma-customer{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;padding:16px 18px;background:rgba(74,122,255,.05);border:1px solid rgba(74,122,255,.14);border-radius:16px;margin-bottom:14px}
      .ma-cust-item{display:flex;align-items:center;gap:10px}
      .ma-cust-item i{width:34px;height:34px;border-radius:10px;background:rgba(74,122,255,.15);color:#6a9aff;display:flex;align-items:center;justify-content:center;font-size:.85rem;flex-shrink:0}
      .ma-cust-item .lbl{font-size:.68rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1px}
      .ma-cust-item .val{font-size:.88rem;font-weight:700;color:#fff;word-break:break-all}
      .ma-items{padding:14px 18px;background:rgba(0,0,0,.2);border-radius:14px;margin-bottom:14px;font-size:.87rem;color:#a8b0cc;line-height:1.9}
      .ma-items .name{color:#fff;font-weight:700}
      .ma-bottom{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap;padding:16px 0;border-top:1px solid rgba(74,122,255,.1);border-bottom:1px solid rgba(74,122,255,.1);margin-bottom:16px}
      .ma-total-wrap{display:flex;flex-direction:column;gap:2px}
      .ma-total-lbl{font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1px}
      .ma-total{font-size:1.6rem;font-weight:900;background:linear-gradient(135deg,#fff,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1}
      .ma-cb-info{display:inline-flex;align-items:center;gap:8px;padding:10px 16px;border-radius:20px;font-size:.82rem;font-weight:800}
      .ma-cb-info.pending{background:rgba(245,179,66,.1);border:1px solid rgba(245,179,66,.3);color:#f5b342}
      .ma-cb-info.paid{background:rgba(76,175,80,.18);border:1px solid rgba(76,175,80,.5);color:#66bb6a}
      .ma-cb-info.unpaid{background:rgba(245,179,66,.15);border:1px solid rgba(245,179,66,.5);color:#f5b342}
      .ma-cb-info .cb-date{font-size:.7rem;opacity:.85;font-weight:700;margin-right:4px}

      /* Buttons */
      .ma-actions{display:flex;gap:8px;flex-wrap:wrap}
      .ma-actions select{flex:1;min-width:170px;height:44px;padding:0 14px;border-radius:12px;background:rgba(0,0,0,.4);border:1.5px solid rgba(74,122,255,.25);color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:.85rem;outline:none;cursor:pointer}
      .ma-actions select:focus{border-color:#4a7aff}
      .ma-btn-action{padding:11px 20px;border-radius:12px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.82rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .3s;white-space:nowrap}
      .ma-btn-apply{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 8px 22px -8px rgba(74,122,255,.8)}
      .ma-btn-apply:hover:not(:disabled){transform:translateY(-2px)}
      .ma-btn-detail{background:linear-gradient(135deg,#00c9a7,#008f77);color:#fff;box-shadow:0 8px 22px -8px rgba(0,201,167,.8)}
      .ma-btn-detail:hover{transform:translateY(-2px)}
      .ma-btn-cb{background:linear-gradient(135deg,#f5b342,#c98a1e);color:#000;box-shadow:0 8px 22px -8px rgba(245,179,66,.8)}
      .ma-btn-cb:hover{transform:translateY(-2px)}
      .ma-btn-deduct{background:linear-gradient(135deg,#d90429,#8b0018);color:#fff;box-shadow:0 8px 22px -8px rgba(217,4,41,.8)}
      .ma-btn-deduct:hover{transform:translateY(-2px)}
      .ma-btn-delete{background:linear-gradient(135deg,#8b0018,#5a0010);color:#fff;box-shadow:0 8px 22px -8px rgba(139,0,24,.9)}
      .ma-btn-delete:hover{transform:translateY(-2px)}
      .ma-btn-chat{background:linear-gradient(135deg,#4a7aff,#021ca4);color:#fff;box-shadow:0 8px 22px -8px rgba(74,122,255,.9)}
      .ma-btn-chat:hover{transform:translateY(-2px)}
      .ma-btn-note{background:linear-gradient(135deg,#9333ea,#6b21a8);color:#fff;box-shadow:0 8px 22px -8px rgba(147,51,234,.8)}
      .ma-btn-note:hover{transform:translateY(-2px)}
      .ma-btn-paid{background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;box-shadow:0 8px 22px -8px rgba(76,175,80,.8)}
      .ma-btn-paid:hover{transform:translateY(-2px)}
      .ma-btn-unpaid{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#8a92b0}
      .ma-btn-unpaid:hover{background:rgba(255,255,255,.12)}
      .ma-btn-action:disabled{opacity:.6;cursor:not-allowed;transform:none!important}

      /* User stats */
      .ma-user-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:10px;padding:14px;background:linear-gradient(135deg,rgba(74,122,255,.08),rgba(2,28,164,.05));border:1px solid rgba(74,122,255,.18);border-radius:16px;margin-bottom:14px}
      .ma-us-item{text-align:center;padding:6px 4px;border-left:1px dashed rgba(74,122,255,.2)}
      .ma-us-item:first-child{border-left:none}
      .ma-us-val{font-size:1.1rem;font-weight:900;background:linear-gradient(135deg,#fff,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent;line-height:1.2}
      .ma-us-lbl{font-size:.68rem;color:#8a92b0;font-weight:800;margin-top:4px;text-transform:uppercase;letter-spacing:.6px}

      /* Empty / loader */
      .ma-empty{text-align:center;padding:80px 24px;background:rgba(74,122,255,.04);border:1.5px dashed rgba(74,122,255,.25);border-radius:24px}
      .ma-empty i{font-size:3rem;color:#4a7aff;margin-bottom:16px;opacity:.7}
      .ma-empty h3{font-size:1.2rem;font-weight:900;margin-bottom:8px}
      .ma-empty p{color:#8a92b0;font-weight:600}
      .ma-loader{text-align:center;padding:60px}
      .ma-spin{width:44px;height:44px;margin:0 auto 16px;border-radius:50%;border:3px solid rgba(74,122,255,.2);border-top-color:#4a7aff;animation:maSpin .8s linear infinite}
      @keyframes maSpin{to{transform:rotate(360deg)}}

      /* Modals */
      .ma-modal-back{display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:20px}
      .ma-modal-back.show{display:flex}
      .ma-modal{background:linear-gradient(145deg,rgba(14,20,38,.98),rgba(8,12,24,1));border:1px solid rgba(74,122,255,.14);border-radius:24px;max-width:440px;width:100%;padding:30px 28px;box-shadow:0 40px 100px -30px rgba(2,28,164,.9)}
      .ma-modal.ma-modal-lg{max-width:580px;display:flex;flex-direction:column;max-height:90vh;padding:0;overflow:hidden}
      .ma-modal.ma-modal-xl{max-width:960px;width:100%;max-height:92vh;padding:0;display:flex;flex-direction:column;overflow:hidden}
      .ma-modal-title{display:flex;align-items:center;gap:12px;font-size:1.15rem;font-weight:900;margin-bottom:8px}
      .ma-modal-title i{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#f5b342,#c98a1e);color:#000;display:flex;align-items:center;justify-content:center;font-size:1rem;flex-shrink:0}
      .ma-modal-sub{color:#8a92b0;font-size:.85rem;font-weight:600;margin-bottom:22px;line-height:1.8}
      .ma-modal-field{margin-bottom:14px}
      .ma-modal-field label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
      .ma-modal-field input,.ma-modal-field textarea{width:100%;padding:14px 18px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-weight:600;font-size:.94rem;outline:none;transition:all .3s;resize:none;box-sizing:border-box}
      .ma-modal-field textarea{min-height:120px;line-height:1.7}
      .ma-modal-field input:focus,.ma-modal-field textarea:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.15)}
      .ma-modal-field input[type=number]{direction:ltr;text-align:right;font-size:1.1rem;font-weight:800}
      .ma-quick{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}
      .ma-quick button{padding:8px 16px;border-radius:20px;border:1.5px solid rgba(74,122,255,.14);background:rgba(74,122,255,.08);color:#6a9aff;font-family:'Cairo',sans-serif;font-weight:800;font-size:.8rem;cursor:pointer;transition:all .3s}
      .ma-quick button:hover{background:rgba(74,122,255,.2);border-color:#4a7aff}
      .ma-modal-actions{display:flex;gap:10px;margin-top:22px}
      .ma-modal-actions button{flex:1;height:50px;border-radius:14px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.92rem;cursor:pointer;transition:all .3s;display:inline-flex;align-items:center;justify-content:center;gap:8px}
      .ma-modal-actions .cancel{background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.15);color:#e0e6f4}
      .ma-modal-actions .cancel:hover{background:rgba(255,255,255,.12)}
      .ma-modal-actions .confirm{background:linear-gradient(135deg,#f5b342,#c98a1e);color:#000;box-shadow:0 12px 30px -10px rgba(245,179,66,.9)}
      .ma-modal-actions .confirm:hover:not(:disabled){transform:translateY(-2px)}
      .ma-modal-actions .confirm.deduct{background:linear-gradient(135deg,#d90429,#8b0018);color:#fff}
      .ma-modal-actions .confirm.danger{background:linear-gradient(135deg,#8b0018,#5a0010);color:#fff}
      .ma-modal-actions .confirm.purple{background:linear-gradient(135deg,#9333ea,#6b21a8);color:#fff}
      .ma-modal-actions .confirm:disabled{opacity:.6;cursor:not-allowed;transform:none}
      .ma-warn-box{margin-top:16px;padding:14px 16px;border-radius:14px;background:rgba(217,4,41,.08);border:1px solid rgba(217,4,41,.28);color:#ff9a9a;font-size:.82rem;font-weight:700;line-height:1.8;display:flex;gap:10px;align-items:flex-start}
      .ma-warn-box i{color:#d90429;font-size:1.1rem;flex-shrink:0;margin-top:2px}

      /* Detail modal */
      .ma-detail-head{padding:22px 28px;border-bottom:1px solid rgba(74,122,255,.14);display:flex;align-items:center;justify-content:space-between;gap:16px;background:linear-gradient(180deg,rgba(74,122,255,.06),transparent);flex-shrink:0}
      .ma-detail-head-left{display:flex;align-items:center;gap:14px;min-width:0}
      .ma-detail-icon{width:52px;height:52px;border-radius:14px;background:linear-gradient(135deg,#021ca4,#4a7aff);display:flex;align-items:center;justify-content:center;font-size:1.3rem;color:#fff;flex-shrink:0;box-shadow:0 12px 26px -10px rgba(74,122,255,.8)}
      .ma-detail-title{font-size:1.15rem;font-weight:900;letter-spacing:-.3px}
      .ma-detail-title span{color:#6a9aff;font-family:'Courier New',monospace;font-size:1.05rem}
      .ma-detail-sub{font-size:.78rem;color:#8a92b0;font-weight:700;margin-top:5px;display:flex;align-items:center;gap:6px}
      .ma-detail-head-right{display:flex;align-items:center;gap:10px;flex-shrink:0}
      .ma-btn-print{padding:11px 22px;border-radius:12px;border:none;background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:.86rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;box-shadow:0 10px 24px -10px rgba(76,175,80,.85);transition:all .3s}
      .ma-btn-print:hover{transform:translateY(-2px)}
      .ma-detail-body{flex:1;overflow-y:auto;padding:24px 28px;background:rgba(0,0,0,.1)}
      .ma-detail-body::-webkit-scrollbar{width:6px}
      .ma-detail-body::-webkit-scrollbar-thumb{background:rgba(74,122,255,.25);border-radius:6px}
      .ma-detail-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px}
      .ma-detail-section{background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.14);border-radius:16px;padding:18px 20px;margin-bottom:16px}
      .ma-detail-section:last-child{margin-bottom:0}
      .ma-detail-h3{font-size:.82rem;font-weight:900;color:#6a9aff;margin-bottom:14px;display:flex;align-items:center;gap:8px;text-transform:uppercase;letter-spacing:.8px}
      .ma-detail-row{display:flex;justify-content:space-between;align-items:flex-start;padding:9px 0;border-bottom:1px dashed rgba(74,122,255,.12);gap:12px;font-size:.88rem}
      .ma-detail-row:last-child{border-bottom:none}
      .ma-detail-row .lbl{color:#8a92b0;font-weight:700;font-size:.82rem;flex-shrink:0}
      .ma-detail-row .val{font-weight:800;color:#fff;text-align:left;word-break:break-word;font-size:.9rem}
      .ma-items-table{width:100%;border-collapse:collapse;font-size:.88rem}
      .ma-items-table thead th{padding:12px;text-align:right;font-size:.72rem;text-transform:uppercase;letter-spacing:.8px;color:#8a92b0;font-weight:800;border-bottom:2px solid rgba(74,122,255,.2)}
      .ma-items-table tbody td{padding:13px 12px;border-bottom:1px solid rgba(74,122,255,.08);color:#e0e6f4;font-weight:600}
      .ma-items-table tbody tr:last-child td{border-bottom:none}
      .ma-items-table tbody td:first-child{color:#8a92b0;font-weight:800;text-align:center;width:44px}
      .ma-items-table .price-cell,.ma-items-table .total-cell{font-family:'Courier New',monospace;direction:ltr;text-align:left;font-weight:800;color:#6a9aff}
      .ma-items-table .total-cell{color:#fff;font-size:1rem}
      .ma-summary-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
      .ma-summary-box{background:linear-gradient(145deg,rgba(74,122,255,.08),rgba(2,28,164,.05));border:1px solid rgba(74,122,255,.2);border-radius:16px;padding:18px 20px}
      .ma-summary-box.cashback{background:linear-gradient(145deg,rgba(245,179,66,.08),rgba(201,138,30,.05));border-color:rgba(245,179,66,.25)}
      .ma-summary-row{display:flex;justify-content:space-between;align-items:center;padding:10px 0;font-size:.9rem;border-bottom:1px dashed rgba(74,122,255,.12)}
      .ma-summary-row:last-child{border-bottom:none}
      .ma-summary-row .lbl{color:#8a92b0;font-weight:700}
      .ma-summary-row .val{font-family:'Courier New',monospace;font-weight:800;color:#fff;direction:ltr}
      .ma-summary-row.total{padding-top:16px;margin-top:6px;border-top:2px solid rgba(74,122,255,.3);border-bottom:none}
      .ma-summary-row.total .lbl{color:#fff;font-size:1rem;font-weight:900}
      .ma-summary-row.total .val{color:#4a7aff;font-size:1.35rem;font-weight:900}
      .ma-summary-box.cashback .ma-summary-row.total .val{color:#f5b342}
      .ma-cb-pill{padding:6px 14px;border-radius:20px;font-size:.78rem;font-weight:800;display:inline-flex;align-items:center;gap:6px}
      .ma-cb-pill.paid{background:rgba(76,175,80,.15);border:1px solid rgba(76,175,80,.4);color:#66bb6a}
      .ma-cb-pill.unpaid{background:rgba(245,179,66,.15);border:1px solid rgba(245,179,66,.4);color:#f5b342}
      .ma-cb-pill.pending{background:rgba(74,122,255,.15);border:1px solid rgba(74,122,255,.4);color:#6a9aff}
      .ma-cb-pill.none{background:rgba(217,4,41,.1);border:1px solid rgba(217,4,41,.3);color:#ff6b6b}

      /* Chat modal */
      .ma-chat-header{padding:20px 24px;border-bottom:1px solid rgba(74,122,255,.14);display:flex;align-items:center;gap:14px;background:linear-gradient(180deg,rgba(74,122,255,.06),transparent)}
      .ma-chat-avatar{width:48px;height:48px;border-radius:50%;background:linear-gradient(135deg,#021ca4,#4a7aff);display:flex;align-items:center;justify-content:center;font-weight:900;font-size:1rem;flex-shrink:0}
      .ma-chat-header-info{flex:1;min-width:0}
      .ma-chat-header-name{font-size:1rem;font-weight:900;line-height:1.2}
      .ma-chat-header-status{font-size:.74rem;color:#66bb6a;font-weight:700;display:flex;align-items:center;gap:5px;margin-top:3px}
      .ma-chat-close{width:38px;height:38px;border-radius:12px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#e0e6f4;cursor:pointer;font-size:.95rem;display:flex;align-items:center;justify-content:center;transition:all .3s}
      .ma-chat-close:hover{background:rgba(217,4,41,.2);border-color:rgba(217,4,41,.4);color:#ff6b6b}
      .ma-chat-body{flex:1;overflow-y:auto;padding:20px 22px;display:flex;flex-direction:column;gap:12px;background:rgba(0,0,0,.15);min-height:280px;max-height:420px}
      .ma-chat-body::-webkit-scrollbar{width:6px}
      .ma-chat-body::-webkit-scrollbar-thumb{background:rgba(74,122,255,.25);border-radius:6px}
      .ma-msg{max-width:78%;padding:11px 15px;border-radius:16px;font-size:.88rem;line-height:1.7;word-wrap:break-word;position:relative;animation:msgIn .25s ease}
      @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      .ma-msg-meta{font-size:.62rem;font-weight:800;opacity:.8;margin-bottom:4px;letter-spacing:.5px;text-transform:uppercase}
      .ma-msg-time{font-size:.62rem;font-weight:700;opacity:.75;margin-top:5px;text-align:left;direction:ltr}
      .ma-msg.admin{align-self:flex-end;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;border-bottom-left-radius:4px}
      .ma-msg.customer{align-self:flex-start;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.1);color:#e0e6f4;border-bottom-right-radius:4px}
      .ma-msg.note{align-self:center;background:linear-gradient(135deg,rgba(147,51,234,.25),rgba(107,33,168,.25));border:1px dashed rgba(147,51,234,.5);color:#e9d5ff;max-width:88%}
      .ma-msg.note .ma-msg-meta{color:#c084fc}
      .ma-chat-empty{text-align:center;padding:50px 20px;color:#8a92b0;font-weight:700;font-size:.88rem}
      .ma-chat-empty i{font-size:2.2rem;color:#4a7aff;opacity:.5;display:block;margin-bottom:12px}
      .ma-chat-footer{padding:16px 20px;border-top:1px solid rgba(74,122,255,.14);background:rgba(0,0,0,.2);display:flex;gap:10px;align-items:flex-end}
      .ma-chat-footer textarea{flex:1;padding:12px 16px;border-radius:14px;background:rgba(0,0,0,.4);border:1.5px solid rgba(74,122,255,.2);color:#fff;font-family:'Cairo',sans-serif;font-weight:600;font-size:.9rem;outline:none;transition:all .3s;resize:none;min-height:46px;max-height:120px;line-height:1.5}
      .ma-chat-footer textarea:focus{border-color:#4a7aff;box-shadow:0 0 0 3px rgba(74,122,255,.15)}
      .ma-chat-send{width:46px;height:46px;border-radius:14px;border:none;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;cursor:pointer;font-size:1rem;transition:all .3s;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 8px 22px -8px rgba(74,122,255,.9)}
      .ma-chat-send:hover:not(:disabled){transform:translateY(-2px)}
      .ma-chat-send:disabled{opacity:.5;cursor:not-allowed}

      /* Toast */
      .ma-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);padding:14px 26px;border-radius:60px;font-weight:800;font-size:.9rem;z-index:100001;transition:transform .4s cubic-bezier(.34,1.56,.64,1);display:inline-flex;align-items:center;gap:10px;box-shadow:0 15px 40px -10px rgba(0,0,0,.6);max-width:90vw;font-family:'Cairo',sans-serif}
      .ma-toast.show{transform:translateX(-50%) translateY(0)}
      .ma-toast.success{background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff}
      .ma-toast.error{background:linear-gradient(135deg,#d90429,#8b0018);color:#fff}
      .ma-toast.info{background:linear-gradient(135deg,#4a7aff,#021ca4);color:#fff}

      /* Close */
      .ma-close{position:fixed;top:20px;left:20px;z-index:9999;width:46px;height:46px;border-radius:50%;background:rgba(74,122,255,.1);border:1px solid rgba(74,122,255,.25);color:#6a9aff;font-size:1.1rem;cursor:pointer;display:none;align-items:center;justify-content:center;transition:all .3s;backdrop-filter:blur(10px)}
      .ma-close.show{display:flex}
      .ma-close:hover{background:rgba(217,4,41,.15);border-color:rgba(217,4,41,.3);color:#ff6b6b;transform:rotate(90deg)}

      @media (max-width:900px){
        .ma-stats,.ma-stats-sm{grid-template-columns:repeat(2,1fr)}
        .ma-user-stats{grid-template-columns:repeat(2,1fr)}
        .ma-user-info{display:none}
        .ma-detail-cols,.ma-summary-grid{grid-template-columns:1fr}
      }
      @media (max-width:600px){
        .ma-container{padding:0 14px}
        .ma-header-inner{padding:0 14px}
        .ma-order{padding:18px 16px}
        .ma-bottom{flex-direction:column;align-items:stretch;gap:10px}
        .ma-actions{flex-direction:column}
        .ma-actions select{min-width:100%}
        .ma-btn-action{width:100%;justify-content:center}
        .ma-stat{padding:18px 16px}
        .ma-stat-val{font-size:1.4rem}
        .ma-modal{padding:22px 20px}
        .ma-modal.ma-modal-lg,.ma-modal.ma-modal-xl{padding:0}
        .ma-detail-head{padding:16px 18px}
        .ma-detail-body{padding:16px 18px}
        .ma-chat-body{max-height:340px}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══ HTML ═══
  function injectHTML() {
    if ($('menAdminRoot')) return;
    const root = document.createElement('div');
    root.id = 'menAdminRoot';
    root.className = 'ma-root';
    root.innerHTML = `
      <div class="ma-bg"></div>
      <button class="ma-close" id="maClose" title="إغلاق"><i class="fas fa-times"></i></button>

      <div class="ma-gate" id="maGate">
        <div class="ma-gate-card">
          <div class="ma-gate-icon"><i class="fas fa-shield-halved"></i></div>
          <h1>لوحة إدارة الطلبات</h1>
          <p>سجّل دخولك بحساب المشرف للوصول</p>
          <div class="ma-field"><label>البريد الإلكتروني</label><input type="email" id="maGateEmail" placeholder="admin@example.com" autocomplete="email"></div>
          <div class="ma-field"><label>كلمة المرور</label><input type="password" id="maGatePass" placeholder="••••••••" autocomplete="current-password"></div>
          <button class="ma-gate-btn" id="maGateBtn"><i class="fas fa-right-to-bracket"></i> دخول</button>
          <div class="ma-gate-err" id="maGateErr"></div>
        </div>
      </div>

      <div class="ma-dash" id="maDash">
        <div class="ma-header">
          <div class="ma-header-inner">
            <div class="ma-brand">
              <img src="${LOGO_URL}" alt="MEN Store">
              <div class="ma-brand-text"><div class="t">لوحة الطلبات</div><div class="s">MEN Store Admin</div></div>
            </div>
            <div class="ma-user">
              <div class="ma-user-info"><div class="n" id="maUserName">—</div><div class="e" id="maUserEmail">—</div></div>
              <button class="ma-btn-ghost ma-btn-users" id="maViewUsers"><i class="fas fa-users"></i> <span id="maViewUsersText">العملاء</span></button>
              <button class="ma-btn-ghost" id="maLogout"><i class="fas fa-sign-out-alt"></i> خروج</button>
            </div>
          </div>
        </div>

        <div class="ma-container">
          <div class="ma-stats">
            <div class="ma-stat" style="--accent:#4a7aff;--icon-bg:rgba(74,122,255,.15)"><div class="ma-stat-icon"><i class="fas fa-box"></i></div><div class="ma-stat-val" id="maStatTotal">0</div><div class="ma-stat-lbl">إجمالي الطلبات</div></div>
            <div class="ma-stat" style="--accent:#f5b342;--icon-bg:rgba(245,179,66,.15)"><div class="ma-stat-icon"><i class="fas fa-hourglass-half"></i></div><div class="ma-stat-val" id="maStatPending">0</div><div class="ma-stat-lbl">قيد المعالجة</div></div>
            <div class="ma-stat" style="--accent:#4caf50;--icon-bg:rgba(76,175,80,.15)"><div class="ma-stat-icon"><i class="fas fa-circle-check"></i></div><div class="ma-stat-val" id="maStatDelivered">0</div><div class="ma-stat-lbl">تم الاستلام</div></div>
            <div class="ma-stat" style="--accent:#6a9aff;--icon-bg:rgba(106,154,255,.15)"><div class="ma-stat-icon"><i class="fas fa-coins"></i></div><div class="ma-stat-val" id="maStatRevenue">0</div><div class="ma-stat-lbl">إجمالي المبيعات (ر.س)</div></div>
          </div>

          <div class="ma-stats-sm">
            <div class="ma-stat-sm" style="--accent:#9333ea;--icon-bg:rgba(147,51,234,.15)"><div class="ma-stat-sm-icon"><i class="fas fa-users"></i></div><div><div class="ma-stat-sm-val" id="maStatCustomers">0</div><div class="ma-stat-sm-lbl">إجمالي العملاء</div></div></div>
            <div class="ma-stat-sm" style="--accent:#4a7aff;--icon-bg:rgba(74,122,255,.15)"><div class="ma-stat-sm-icon"><i class="fas fa-chart-line"></i></div><div><div class="ma-stat-sm-val" id="maStatAvg">0</div><div class="ma-stat-sm-lbl">متوسط قيمة الطلب</div></div></div>
            <div class="ma-stat-sm" style="--accent:#f5b342;--icon-bg:rgba(245,179,66,.15)"><div class="ma-stat-sm-icon"><i class="fas fa-gift"></i></div><div><div class="ma-stat-sm-val" id="maStatCashback">0</div><div class="ma-stat-sm-lbl">كاش باك ممنوح (ر.س)</div></div></div>
            <div class="ma-stat-sm" style="--accent:#d90429;--icon-bg:rgba(217,4,41,.15)"><div class="ma-stat-sm-icon"><i class="fas fa-circle-xmark"></i></div><div><div class="ma-stat-sm-val" id="maStatCancelled">0</div><div class="ma-stat-sm-lbl">طلبات ملغاة</div></div></div>
          </div>

          <div class="ma-filters">
            <div class="ma-search"><input type="text" id="maSearch" placeholder="ابحث بالاسم، البريد، الجوال، رقم الطلب..."><i class="fas fa-search"></i></div>
            <select id="maStatusFilter">
              <option value="">كل الحالات</option>
              <option value="pending">⏳ قيد الانتظار</option>
              <option value="preparing">⚙️ جاري التجهيز</option>
              <option value="review">🔍 تحت المراجعة</option>
              <option value="delivered">✅ تم الاستلام</option>
              <option value="cancelled">❌ ملغي</option>
            </select>
            <button class="ma-refresh" id="maRefresh"><i class="fas fa-rotate"></i> تحديث</button>
          </div>

          <div id="maOrders"><div class="ma-loader"><div class="ma-spin"></div><p style="color:#8a92b0;font-weight:700">جاري تحميل الطلبات...</p></div></div>
          <div id="maUsers" style="display:none"><div class="ma-loader"><div class="ma-spin"></div><p style="color:#8a92b0;font-weight:700">جاري تحميل العملاء...</p></div></div>
        </div>
      </div>

      <!-- Detail Modal -->
      <div class="ma-modal-back" id="maDetailModal">
        <div class="ma-modal ma-modal-xl">
          <div class="ma-detail-head">
            <div class="ma-detail-head-left">
              <div class="ma-detail-icon"><i class="fas fa-receipt"></i></div>
              <div>
                <div class="ma-detail-title">تفاصيل الطلب <span id="maDetailOrderId">#—</span></div>
                <div class="ma-detail-sub" id="maDetailDate">—</div>
              </div>
            </div>
            <div class="ma-detail-head-right">
              <button class="ma-btn-print" id="maDetailPrint"><i class="fas fa-print"></i> طباعة</button>
              <button class="ma-chat-close" id="maDetailClose"><i class="fas fa-xmark"></i></button>
            </div>
          </div>
          <div class="ma-detail-body" id="maDetailBody"></div>
        </div>
      </div>

      <!-- Cashback Modal -->
      <div class="ma-modal-back" id="maCbModal">
        <div class="ma-modal">
          <div class="ma-modal-title"><i class="fas fa-gift" id="maCbIcon"></i><span id="maCbTitle">إضافة كاش باك</span></div>
          <div class="ma-modal-sub" id="maCbSub">—</div>
          <div class="ma-modal-field">
            <label>المبلغ (ر.س)</label>
            <input type="number" id="maCbAmount" placeholder="0.00" step="0.01" min="0.01">
            <div class="ma-quick">
              <button type="button" data-amt="5">5 ر.س</button>
              <button type="button" data-amt="10">10 ر.س</button>
              <button type="button" data-amt="20">20 ر.س</button>
              <button type="button" data-amt="50">50 ر.س</button>
              <button type="button" data-amt="100">100 ر.س</button>
            </div>
          </div>
          <div class="ma-modal-field"><label>السبب (اختياري)</label><input type="text" id="maCbReason" placeholder="مثال: تعويض، هدية، تصحيح..."></div>
          <div class="ma-modal-actions">
            <button class="cancel" id="maCbCancel" type="button">إلغاء</button>
            <button class="confirm" id="maCbConfirm" type="button"><i class="fas fa-check"></i> إضافة</button>
          </div>
        </div>
      </div>

      <!-- Delete Modal -->
      <div class="ma-modal-back" id="maDelModal">
        <div class="ma-modal">
          <div class="ma-modal-title"><i class="fas fa-trash" style="background:linear-gradient(135deg,#8b0018,#5a0010);color:#fff"></i>حذف الطلب نهائياً</div>
          <div class="ma-modal-sub" id="maDelSub">—</div>
          <div class="ma-warn-box"><i class="fas fa-triangle-exclamation"></i><div><strong>تحذير:</strong> سيتم حذف الطلب نهائياً. سيُخصم الكاش باك تلقائياً من رصيد العميل.</div></div>
          <div class="ma-modal-actions">
            <button class="cancel" id="maDelCancel" type="button">إلغاء</button>
            <button class="confirm danger" id="maDelConfirm" type="button"><i class="fas fa-trash"></i> حذف نهائي</button>
          </div>
        </div>
      </div>

      <!-- Note Modal -->
      <div class="ma-modal-back" id="maNoteModal">
        <div class="ma-modal">
          <div class="ma-modal-title"><i class="fas fa-comment-dots" style="background:linear-gradient(135deg,#9333ea,#6b21a8);color:#fff"></i>إرسال ملاحظة</div>
          <div class="ma-modal-sub" id="maNoteSub">—</div>
          <div class="ma-modal-field"><label>نص الملاحظة</label><textarea id="maNoteText" placeholder="اكتب ملاحظتك..."></textarea></div>
          <div class="ma-modal-actions">
            <button class="cancel" id="maNoteCancel" type="button">إلغاء</button>
            <button class="confirm purple" id="maNoteConfirm" type="button"><i class="fas fa-paper-plane"></i> إرسال</button>
          </div>
        </div>
      </div>

      <!-- Chat Modal -->
      <div class="ma-modal-back" id="maChatModal">
        <div class="ma-modal ma-modal-lg">
          <div class="ma-chat-header">
            <div class="ma-chat-avatar" id="maChatAvatar">?</div>
            <div class="ma-chat-header-info">
              <div class="ma-chat-header-name" id="maChatName">—</div>
              <div class="ma-chat-header-status"><i class="fas fa-circle" style="font-size:.5rem"></i> <span id="maChatEmail">—</span></div>
            </div>
            <button class="ma-chat-close" id="maChatClose" type="button"><i class="fas fa-xmark"></i></button>
          </div>
          <div class="ma-chat-body" id="maChatBody"><div class="ma-chat-empty"><i class="fas fa-comments"></i> جاري التحميل...</div></div>
          <div class="ma-chat-footer">
            <textarea id="maChatInput" placeholder="اكتب رسالتك..." rows="1"></textarea>
            <button class="ma-chat-send" id="maChatSend" type="button"><i class="fas fa-paper-plane"></i></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);
  }

  // ═══ Open/Close ═══
  function openPanel() {
    injectCSS();
    injectHTML();
    $('menAdminRoot').classList.add('active');
    $('maClose').classList.add('show');
    document.body.style.overflow = 'hidden';
    checkAuth();
  }
  function closePanel() {
    $('menAdminRoot')?.classList.remove('active');
    $('maClose')?.classList.remove('show');
    document.body.style.overflow = '';
  }
  window.MEN_ADMIN = { open: openPanel, close: closePanel };

  // ═══ Events ═══
  function bindEvents() {
    $('maClose').addEventListener('click', closePanel);
    $('maGateBtn').addEventListener('click', doLogin);
    $('maGatePass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('maGateEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('maGatePass').focus(); });
    $('maLogout').addEventListener('click', async () => { await sb.auth.signOut(); currentUser = null; showGate(); toast('تم تسجيل الخروج', 'info'); });

    $('maViewUsers').addEventListener('click', () => {
      usersView = !usersView;
      if (usersView) {
        $('maOrders').style.display = 'none';
        $('maUsers').style.display = 'block';
        $('maViewUsersText').textContent = 'الطلبات';
        $('maViewUsers').querySelector('i').className = 'fas fa-box';
        $('maSearch').placeholder = 'ابحث بالاسم، البريد، الجوال...';
        $('maStatusFilter').style.display = 'none';
        if (!allUsers.length) loadUsers(); else renderUsers();
      } else {
        $('maOrders').style.display = 'block';
        $('maUsers').style.display = 'none';
        $('maViewUsersText').textContent = 'العملاء';
        $('maViewUsers').querySelector('i').className = 'fas fa-users';
        $('maSearch').placeholder = 'ابحث بالاسم، البريد، الجوال، رقم الطلب...';
        $('maStatusFilter').style.display = '';
      }
    });
    $('maSearch').addEventListener('input', () => { if (usersView) renderUsers(); else renderOrders(); });
    $('maStatusFilter').addEventListener('change', renderOrders);
    $('maRefresh').addEventListener('click', () => { if (usersView) loadUsers(); else loadOrders(); toast('تم التحديث', 'info'); });

    $('maCbCancel').addEventListener('click', closeCbModal);
    $('maCbModal').addEventListener('click', e => { if (e.target.id === 'maCbModal') closeCbModal(); });
    $('maCbConfirm').addEventListener('click', confirmCashback);
    document.querySelectorAll('[data-amt]').forEach(b => b.addEventListener('click', () => { $('maCbAmount').value = b.dataset.amt; }));

    $('maDelCancel').addEventListener('click', closeDelModal);
    $('maDelModal').addEventListener('click', e => { if (e.target.id === 'maDelModal') closeDelModal(); });
    $('maDelConfirm').addEventListener('click', confirmDelete);

    $('maNoteCancel').addEventListener('click', closeNoteModal);
    $('maNoteModal').addEventListener('click', e => { if (e.target.id === 'maNoteModal') closeNoteModal(); });
    $('maNoteConfirm').addEventListener('click', confirmNote);

    $('maChatClose').addEventListener('click', closeChatModal);
    $('maChatModal').addEventListener('click', e => { if (e.target.id === 'maChatModal') closeChatModal(); });
    $('maChatSend').addEventListener('click', sendChatMessage);
    $('maChatInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChatMessage(); } });

    $('maDetailClose').addEventListener('click', closeDetailModal);
    $('maDetailModal').addEventListener('click', e => { if (e.target.id === 'maDetailModal') closeDetailModal(); });
    $('maDetailPrint').addEventListener('click', printCurrentOrder);
  }

  // ═══ Auth ═══
  async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user && ADMIN_EMAILS.includes((session.user.email || '').toLowerCase())) {
      currentUser = session.user; showDashboard();
    } else showGate();
  }
  function showGate() { $('maGate').style.display = 'flex'; $('maDash').classList.remove('active'); }
  function showDashboard() {
    $('maGate').style.display = 'none';
    $('maDash').classList.add('active');
    $('maUserName').textContent = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
    $('maUserEmail').textContent = currentUser.email;
    loadOrders();
    loadUsers(true);
  }
  async function doLogin() {
    const email = $('maGateEmail').value.trim().toLowerCase();
    const pass = $('maGatePass').value;
    const err = $('maGateErr');
    err.classList.remove('show');
    if (!email || !pass) { err.textContent = 'أدخل البريد وكلمة المرور'; err.classList.add('show'); return; }
    if (!ADMIN_EMAILS.includes(email)) { err.textContent = 'هذا الحساب ليس مشرفاً'; err.classList.add('show'); return; }
    const btn = $('maGateBtn');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';
    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      currentUser = data.user;
      toast('مرحباً بك 👋', 'success');
      showDashboard();
    } catch (e) {
      err.textContent = e.message || 'فشل تسجيل الدخول'; err.classList.add('show');
    } finally {
      btn.disabled = false; btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> دخول';
    }
  }

  // ═══ Load Orders ═══
  async function loadOrders() {
    const container = $('maOrders');
    container.innerHTML = '<div class="ma-loader"><div class="ma-spin"></div><p style="color:#8a92b0;font-weight:700">جاري تحميل الطلبات...</p></div>';
    try {
      const { data, error } = await sb.from('men_orders').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      allOrders = data || [];
      renderStats(); renderOrders();
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="ma-empty"><i class="fas fa-triangle-exclamation" style="color:#d90429"></i><h3>فشل تحميل الطلبات</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  function renderStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const cancelled = allOrders.filter(o => o.status === 'cancelled').length;
    const revenue = allOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total||0), 0);
    const avg = delivered > 0 ? revenue / delivered : 0;
    const totalCb = allUsers.reduce((s, u) => s + Number(u.cashback||0), 0);
    $('maStatTotal').textContent = total;
    $('maStatPending').textContent = pending;
    $('maStatDelivered').textContent = delivered;
    $('maStatRevenue').textContent = revenue.toFixed(0);
    $('maStatCustomers').textContent = allUsers.length;
    $('maStatAvg').textContent = avg.toFixed(0) + ' ر.س';
    $('maStatCashback').textContent = totalCb.toFixed(0);
    $('maStatCancelled').textContent = cancelled;
  }

  function renderOrders() {
    const container = $('maOrders');
    const q = ($('maSearch').value || '').trim().toLowerCase();
    const sf = $('maStatusFilter').value;
    let filtered = allOrders.filter(o => {
      if (sf && o.status !== sf) return false;
      if (q) {
        const hay = `${o.id} ${o.user_name||''} ${o.user_email||''} ${o.user_phone||''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    if (!filtered.length) {
      container.innerHTML = `<div class="ma-empty"><i class="fas fa-inbox"></i><h3>لا يوجد طلبات</h3><p>${q || sf ? 'جرّب فلتر أو بحث آخر' : 'ستظهر هنا تلقائياً'}</p></div>`;
      return;
    }
    container.innerHTML = '<div class="ma-orders">' + filtered.map(renderOrderCard).join('') + '</div>';
    container.querySelectorAll('[data-apply-status]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const oid = btn.dataset.applyStatus;
        const sel = container.querySelector(`select[data-order-select="${oid}"]`);
        await applyStatus(oid, sel.value, btn);
      });
    });
    container.querySelectorAll('[data-detail-order]').forEach(btn => btn.addEventListener('click', () => openDetailModal(btn.dataset.detailOrder)));
    container.querySelectorAll('[data-add-cashback]').forEach(btn => btn.addEventListener('click', () => openCbModal(btn.dataset.addCashback, 'add')));
    container.querySelectorAll('[data-delete-order]').forEach(btn => btn.addEventListener('click', () => openDelModal(btn.dataset.deleteOrder)));
    container.querySelectorAll('[data-mark-paid]').forEach(btn => btn.addEventListener('click', () => toggleCashbackPaid(btn.dataset.markPaid, true)));
    container.querySelectorAll('[data-unmark-paid]').forEach(btn => btn.addEventListener('click', () => toggleCashbackPaid(btn.dataset.unmarkPaid, false)));
  }

  function renderOrderCard(o) {
    const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsHtml = items.map(it => `<div>• <span class="name">${esc(it.name||'منتج')}</span> × ${it.qty||1} — ${(Number(it.price||0)*Number(it.qty||1)).toFixed(2)} ر.س</div>`).join('') || '<div>—</div>';
    const date = fmtDate(o.created_at);
    let cbHtml = '';
    if (o.status === 'delivered' && o.cashback_applied) {
      const amount = Number(o.cashback||0).toFixed(2);
      if (o.cashback_paid) {
        cbHtml = `<div class="ma-cb-info paid"><i class="fas fa-circle-check"></i> كاش باك مدفوع: ${amount} ر.س <span class="cb-date">— ${o.cashback_paid_at ? fmtDateShort(o.cashback_paid_at) : ''}</span></div>`;
      } else {
        cbHtml = `<div class="ma-cb-info unpaid"><i class="fas fa-hourglass-half"></i> كاش باك غير مدفوع: ${amount} ر.س</div>`;
      }
    } else if (o.status !== 'cancelled' && o.status !== 'delivered') {
      const potential = Number(o.total||0) * CASHBACK_RATE;
      cbHtml = `<div class="ma-cb-info pending"><i class="fas fa-clock"></i> متوقع عند التسليم: ${potential.toFixed(2)} ر.س</div>`;
    }
    const options = Object.entries(ORDER_STATUS).map(([k,v]) => `<option value="${k}" ${k===o.status?'selected':''}>${v.label}</option>`).join('');
    const showMarkPaid = o.status === 'delivered' && o.cashback_applied && !o.cashback_paid;
    const showUnmarkPaid = o.cashback_paid;
    return `
      <div class="ma-order" data-order="${o.id}">
        <div class="ma-order-top">
          <div>
            <div class="ma-order-id" style="--st-color:${st.color}"><span class="dot"></span>طلب #${String(o.id||'').slice(-8).toUpperCase()}</div>
            <div class="ma-order-date"><i class="fas fa-clock"></i> ${date}</div>
          </div>
          <div class="ma-order-badge" style="background:${st.bg};color:${st.text}"><i class="fas ${st.icon}"></i> ${st.label}</div>
        </div>
        <div class="ma-customer">
          <div class="ma-cust-item"><i class="fas fa-user"></i><div><div class="lbl">العميل</div><div class="val">${esc(o.user_name||'—')}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-envelope"></i><div><div class="lbl">البريد</div><div class="val">${esc(o.user_email||'—')}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-phone"></i><div><div class="lbl">الجوال</div><div class="val">${esc(o.user_phone||'—')}</div></div></div>
        </div>
        <div class="ma-items">${itemsHtml}</div>
        <div class="ma-bottom">
          <div class="ma-total-wrap"><div class="ma-total-lbl">المبلغ المدفوع</div><div class="ma-total">${Number(o.total||0).toFixed(2)} ر.س</div></div>
          ${cbHtml}
        </div>
        <div class="ma-actions">
          <button class="ma-btn-action ma-btn-detail" data-detail-order="${o.id}"><i class="fas fa-receipt"></i> التفاصيل والطباعة</button>
          <select data-order-select="${o.id}">${options}</select>
          <button class="ma-btn-action ma-btn-apply" data-apply-status="${o.id}"><i class="fas fa-check"></i> تطبيق</button>
          <button class="ma-btn-action ma-btn-cb" data-add-cashback="${o.id}"><i class="fas fa-gift"></i> كاش باك</button>
          ${showMarkPaid ? `<button class="ma-btn-action ma-btn-paid" data-mark-paid="${o.id}"><i class="fas fa-money-bill-wave"></i> تعليم كمدفوع</button>` : ''}
          ${showUnmarkPaid ? `<button class="ma-btn-action ma-btn-unpaid" data-unmark-paid="${o.id}"><i class="fas fa-rotate-left"></i> إلغاء الدفع</button>` : ''}
          <button class="ma-btn-action ma-btn-delete" data-delete-order="${o.id}"><i class="fas fa-trash"></i> حذف</button>
        </div>
      </div>
    `;
  }

  // ═══ Detail Modal ═══
  function openDetailModal(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    currentDetailOrder = order;
    const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
    const items = Array.isArray(order.items) ? order.items : [];
    $('maDetailOrderId').textContent = '#' + String(order.id).slice(-8).toUpperCase();
    $('maDetailDate').innerHTML = `<i class="fas fa-clock"></i> ${fmtDate(order.created_at)}`;
    let subtotal = 0;
    let itemsRows = items.map((it, i) => {
      const price = Number(it.price||0), qty = Number(it.qty||1), lt = price * qty;
      subtotal += lt;
      return `<tr><td>${i+1}</td><td>${esc(it.name||'منتج')}</td><td>${qty}</td><td class="price-cell">${price.toFixed(2)} ر.س</td><td class="total-cell">${lt.toFixed(2)} ر.س</td></tr>`;
    }).join('') || `<tr><td colspan="5" style="text-align:center;color:#8a92b0;padding:20px">لا توجد منتجات</td></tr>`;
    const total = Number(order.total||0);
    const shipping = Math.max(0, total - subtotal);
    const cbEarned = Number(order.cashback||0);
    const potentialCb = total * CASHBACK_RATE;
    let cbPill = '', cbAmount = '', cbPaidRow = '';
    if (order.status === 'cancelled') {
      cbPill = `<span class="ma-cb-pill none"><i class="fas fa-ban"></i> لا يوجد (ملغي)</span>`;
      cbAmount = '0.00 ر.س';
    } else if (order.status === 'delivered' && order.cashback_applied) {
      cbAmount = `${cbEarned.toFixed(2)} ر.س`;
      if (order.cashback_paid) {
        cbPill = `<span class="ma-cb-pill paid"><i class="fas fa-circle-check"></i> مدفوع للعميل</span>`;
        if (order.cashback_paid_at) cbPaidRow = `<div class="ma-summary-row total"><span class="lbl">تاريخ الصرف</span><span class="val">${fmtDate(order.cashback_paid_at)}</span></div>`;
      } else cbPill = `<span class="ma-cb-pill unpaid"><i class="fas fa-hourglass-half"></i> غير مدفوع</span>`;
    } else {
      cbPill = `<span class="ma-cb-pill pending"><i class="fas fa-clock"></i> متوقع عند التسليم</span>`;
      cbAmount = `${potentialCb.toFixed(2)} ر.س`;
    }
    const html = `
      <div class="ma-detail-cols">
        <div class="ma-detail-section">
          <div class="ma-detail-h3"><i class="fas fa-user"></i> معلومات العميل</div>
          <div class="ma-detail-row"><span class="lbl">الاسم</span><span class="val">${esc(order.user_name||'—')}</span></div>
          <div class="ma-detail-row"><span class="lbl">البريد</span><span class="val" dir="ltr">${esc(order.user_email||'—')}</span></div>
          <div class="ma-detail-row"><span class="lbl">الجوال</span><span class="val" dir="ltr">${esc(order.user_phone||'—')}</span></div>
          ${order.user_address ? `<div class="ma-detail-row"><span class="lbl">العنوان</span><span class="val">${esc(order.user_address)}</span></div>` : ''}
        </div>
        <div class="ma-detail-section">
          <div class="ma-detail-h3"><i class="fas fa-info-circle"></i> معلومات الطلب</div>
          <div class="ma-detail-row"><span class="lbl">الحالة</span><span class="val"><span class="ma-order-badge" style="background:${st.bg};color:${st.text};font-size:.72rem;padding:5px 12px"><i class="fas ${st.icon}"></i> ${st.label}</span></span></div>
          <div class="ma-detail-row"><span class="lbl">تاريخ الطلب</span><span class="val">${fmtDate(order.created_at)}</span></div>
          ${order.updated_at ? `<div class="ma-detail-row"><span class="lbl">آخر تحديث</span><span class="val">${fmtDate(order.updated_at)}</span></div>` : ''}
          ${order.payment_method ? `<div class="ma-detail-row"><span class="lbl">طريقة الدفع</span><span class="val">${esc(order.payment_method)}</span></div>` : ''}
        </div>
      </div>
      <div class="ma-detail-section">
        <div class="ma-detail-h3"><i class="fas fa-box"></i> المنتجات</div>
        <table class="ma-items-table">
          <thead><tr><th>#</th><th>المنتج</th><th>الكمية</th><th>السعر</th><th>الإجمالي</th></tr></thead>
          <tbody>${itemsRows}</tbody>
        </table>
      </div>
      <div class="ma-summary-grid">
        <div class="ma-summary-box">
          <div class="ma-detail-h3"><i class="fas fa-credit-card"></i> ملخص الدفع</div>
          <div class="ma-summary-row"><span class="lbl">المجموع الفرعي</span><span class="val">${subtotal.toFixed(2)} ر.س</span></div>
          <div class="ma-summary-row"><span class="lbl">الشحن</span><span class="val">${shipping.toFixed(2)} ر.س</span></div>
          <div class="ma-summary-row total"><span class="lbl">المبلغ المدفوع</span><span class="val">${total.toFixed(2)} ر.س</span></div>
        </div>
        <div class="ma-summary-box cashback">
          <div class="ma-detail-h3"><i class="fas fa-gift"></i> كاش باك العميل</div>
          <div class="ma-summary-row"><span class="lbl">الكاش باك المكتسب</span><span class="val">${cbAmount}</span></div>
          <div class="ma-summary-row"><span class="lbl">الحالة</span><span class="val">${cbPill}</span></div>
          ${cbPaidRow}
        </div>
      </div>
    `;
    $('maDetailBody').innerHTML = html;
    $('maDetailModal').classList.add('show');
  }
  function closeDetailModal() { $('maDetailModal').classList.remove('show'); currentDetailOrder = null; }

  // ═══ Print ═══
  function printCurrentOrder() {
    if (!currentDetailOrder) return;
    const order = currentDetailOrder;
    const items = Array.isArray(order.items) ? order.items : [];
    let subtotal = 0;
    const itemsRows = items.map((it, i) => {
      const price = Number(it.price||0), qty = Number(it.qty||1), lt = price * qty;
      subtotal += lt;
      return `<tr><td style="text-align:center">${i+1}</td><td>${esc(it.name||'منتج')}</td><td style="text-align:center">${qty}</td><td class="num">${price.toFixed(2)}</td><td class="num">${lt.toFixed(2)}</td></tr>`;
    }).join('') || '<tr><td colspan="5" style="text-align:center">لا توجد منتجات</td></tr>';
    const total = Number(order.total||0);
    const shipping = Math.max(0, total - subtotal);
    const cbEarned = Number(order.cashback||0);
    const potentialCb = total * CASHBACK_RATE;
    const st = ORDER_STATUS[order.status] || ORDER_STATUS.pending;
    let cbAmount = '0.00', cbStatus = '—', cbDate = '—';
    if (order.status === 'cancelled') cbStatus = 'لا يوجد (ملغي)';
    else if (order.status === 'delivered' && order.cashback_applied) {
      cbAmount = cbEarned.toFixed(2);
      cbStatus = order.cashback_paid ? 'مدفوع للعميل ✓' : 'غير مدفوع';
      cbDate = order.cashback_paid && order.cashback_paid_at ? fmtDate(order.cashback_paid_at) : '—';
    } else {
      cbAmount = potentialCb.toFixed(2) + ' (متوقع)';
      cbStatus = 'قيد الانتظار';
    }
    const bodyHtml = `
      <div class="head">
        <div class="brand"><img src="${LOGO_URL}" alt="MEN"><div><div class="brand-name">MEN Store</div><div class="brand-tag">فاتورة طلب رسمية</div></div></div>
        <div class="order-box"><div class="num">#${String(order.id).slice(-8).toUpperCase()}</div><div>التاريخ: ${fmtDate(order.created_at)}</div><div>الحالة: ${st.label}</div></div>
      </div>
      <div class="section"><h2>معلومات العميل</h2>
        <table class="info-table">
          <tr><td class="lbl">الاسم</td><td>${esc(order.user_name||'—')}</td><td class="lbl">البريد</td><td dir="ltr" style="text-align:right">${esc(order.user_email||'—')}</td></tr>
          <tr><td class="lbl">الجوال</td><td dir="ltr" style="text-align:right">${esc(order.user_phone||'—')}</td><td class="lbl">العنوان</td><td>${esc(order.user_address||'—')}</td></tr>
        </table>
      </div>
      <div class="section"><h2>تفاصيل المنتجات</h2>
        <table class="items-table"><thead><tr><th style="width:40px;text-align:center">#</th><th>المنتج</th><th style="width:70px;text-align:center">الكمية</th><th style="width:100px">السعر</th><th style="width:110px">الإجمالي</th></tr></thead><tbody>${itemsRows}</tbody></table>
      </div>
      <div class="bottom">
        <div class="section"><h2>ملخص الدفع</h2>
          <table class="summary-table">
            <tr><td class="lbl">المجموع الفرعي</td><td class="val">${subtotal.toFixed(2)} ر.س</td></tr>
            <tr><td class="lbl">الشحن</td><td class="val">${shipping.toFixed(2)} ر.س</td></tr>
            <tr class="total"><td class="lbl">المبلغ المدفوع</td><td class="val">${total.toFixed(2)} ر.س</td></tr>
          </table>
        </div>
        <div class="section"><h2>كاش باك العميل</h2>
          <table class="summary-table">
            <tr><td class="lbl">الكاش باك المكتسب</td><td class="val">${cbAmount} ر.س</td></tr>
            <tr><td class="lbl">الحالة</td><td class="val">${cbStatus}</td></tr>
            <tr><td class="lbl">تاريخ الصرف</td><td class="val">${cbDate}</td></tr>
          </table>
        </div>
      </div>
      <div class="foot"><div class="thanks">شكراً لتسوقك معنا 🌟</div><div>MEN Store — فاتورة رسمية</div></div>
    `;
    const w = window.open('', '_blank', 'width=900,height=700');
    if (!w) { toast('الرجاء السماح بالنوافذ المنبثقة', 'error'); return; }
    w.document.write(`<!DOCTYPE html><html lang="ar" dir="rtl"><head><meta charset="UTF-8"><title>فاتورة #${String(order.id).slice(-8).toUpperCase()}</title><link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap" rel="stylesheet"><style>
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Cairo',sans-serif;background:#fff;color:#000;padding:14mm;font-size:11pt;line-height:1.6}@page{size:A4;margin:12mm}@media print{body{padding:0}}
.head{display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:14px;border-bottom:2px solid #000;margin-bottom:18px;gap:16px}.brand{display:flex;align-items:center;gap:12px}.brand img{height:50px}.brand-name{font-size:16pt;font-weight:900}.brand-tag{font-size:9pt;color:#333;font-weight:600}.order-box{text-align:left;font-size:10pt;line-height:1.7}.order-box .num{font-size:14pt;font-weight:900;font-family:'Courier New',monospace}
.section{margin-bottom:16px;page-break-inside:avoid}.section h2{font-size:11pt;font-weight:900;background:#f0f0f0;padding:6px 10px;margin-bottom:10px;border-right:4px solid #000}
.info-table{width:100%;border-collapse:collapse;font-size:10pt}.info-table td{padding:6px 10px;border:1px solid #ccc}.info-table td.lbl{background:#f7f7f7;font-weight:800;width:22%}
.items-table{width:100%;border-collapse:collapse;font-size:10pt}.items-table thead th{background:#000;color:#fff;padding:8px 10px;text-align:right;font-weight:800;font-size:9.5pt;border:1px solid #000}.items-table tbody td{padding:8px 10px;border:1px solid #ccc}.items-table tbody tr:nth-child(even) td{background:#fafafa}.items-table .num{font-family:'Courier New',monospace;direction:ltr;text-align:left;font-weight:800}
.bottom{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px;page-break-inside:avoid}.summary-table{width:100%;border-collapse:collapse;font-size:10pt}.summary-table td{padding:7px 10px;border:1px solid #ccc}.summary-table td.lbl{background:#f7f7f7;font-weight:700}.summary-table td.val{font-family:'Courier New',monospace;direction:ltr;text-align:left;font-weight:800}.summary-table tr.total td{background:#000;color:#fff;font-weight:900;font-size:11pt;padding:10px}.summary-table tr.total td.val{color:#fff;font-size:12pt}
.foot{margin-top:24px;padding-top:14px;border-top:2px solid #000;display:flex;justify-content:space-between;align-items:center;font-size:9pt;page-break-inside:avoid}.foot .thanks{font-weight:900;font-size:11pt}
</style></head><body>${bodyHtml}</body></html>`);
    w.document.close();
    w.onload = () => { w.focus(); w.print(); };
  }

  // ═══ Toggle Cashback Paid ═══
  async function toggleCashbackPaid(orderId, paid) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    const updates = { cashback_paid: paid, cashback_paid_at: paid ? new Date().toISOString() : null, updated_at: new Date().toISOString() };
    try {
      const { error } = await sb.from('men_orders').update(updates).eq('id', orderId);
      if (error) throw error;
      Object.assign(order, updates);
      renderOrders();
      toast(paid ? `✅ تم تعليم الكاش باك كمدفوع` : `↩️ تم إلغاء تعليم الدفع`, 'success');
      if (paid) {
        try {
          await sb.from('men_messages').insert({
            user_id: order.user_id, user_email: order.user_email,
            sender: 'admin', sender_name: 'الإدارة', sender_email: currentUser.email,
            message: `تم دفع كاش باك بقيمة ${Number(order.cashback||0).toFixed(2)} ر.س لطلبك #${String(orderId).slice(-8).toUpperCase()} ✅`,
            type: 'note', is_read: false
          });
        } catch (e) { console.warn(e); }
      }
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
    }
  }

  // ═══ Users ═══
  async function loadUsers(silent = false) {
    const container = $('maUsers');
    if (!silent) container.innerHTML = '<div class="ma-loader"><div class="ma-spin"></div><p style="color:#8a92b0;font-weight:700">جاري تحميل العملاء...</p></div>';
    try {
      const { data, error } = await sb.from('men_users').select('*').order('created_at', { ascending: false }).limit(500);
      if (error) throw error;
      allUsers = data || [];
      $('maStatCustomers').textContent = allUsers.length;
      const totalCb = allUsers.reduce((s, u) => s + Number(u.cashback||0), 0);
      $('maStatCashback').textContent = totalCb.toFixed(0);
      if (!silent) renderUsers();
    } catch (err) {
      console.error(err);
      if (!silent) container.innerHTML = `<div class="ma-empty"><i class="fas fa-triangle-exclamation" style="color:#d90429"></i><h3>فشل تحميل العملاء</h3><p>${esc(err.message)}</p></div>`;
    }
  }

  function renderUsers() {
    const container = $('maUsers');
    const q = ($('maSearch').value || '').trim().toLowerCase();
    let filtered = allUsers.filter(u => {
      if (!q) return true;
      const hay = `${u.id} ${u.name||''} ${u.email||''} ${u.phone||''}`.toLowerCase();
      return hay.includes(q);
    });
    if (!filtered.length) {
      container.innerHTML = `<div class="ma-empty"><i class="fas fa-users"></i><h3>لا يوجد عملاء</h3><p>${q ? 'لا نتائج للبحث' : 'سيظهرون هنا عند التسجيل'}</p></div>`;
      return;
    }
    container.innerHTML = '<div class="ma-orders">' + filtered.map(renderUserCard).join('') + '</div>';
    container.querySelectorAll('[data-user-cb]').forEach(btn => btn.addEventListener('click', () => openUserCbModal(btn.dataset.userCb, btn.dataset.cbMode || 'add')));
    container.querySelectorAll('[data-user-note]').forEach(btn => btn.addEventListener('click', () => openNoteModal(btn.dataset.userNote)));
    container.querySelectorAll('[data-user-chat]').forEach(btn => btn.addEventListener('click', () => openChatModal(btn.dataset.userChat)));
  }

  function getUserStats(userId) {
    const list = allOrders.filter(o => String(o.user_id) === String(userId));
    const total = list.length;
    const delivered = list.filter(o => o.status === 'delivered');
    const paid = delivered.reduce((s, o) => s + Number(o.total||0), 0);
    const pending = list.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const cancelled = list.filter(o => o.status === 'cancelled').length;
    return { total, paid, pending, cancelled, lastOrder: list[0] };
  }

  function renderUserCard(u) {
    const stats = getUserStats(u.id);
    const parts = (u.name||'M').split(/\s+/);
    let initials = parts.length === 1 ? parts[0].substring(0,2) : (parts[0][0]||'') + (parts[parts.length-1][0]||'');
    initials = initials.toUpperCase();
    const lastTxt = stats.lastOrder ? fmtAgo(stats.lastOrder.created_at) : 'لا يوجد';
    return `
      <div class="ma-order">
        <div class="ma-order-top">
          <div style="display:flex;align-items:center;gap:14px">
            <div style="width:56px;height:56px;border-radius:50%;background:linear-gradient(135deg,#021ca4,#4a7aff);display:flex;align-items:center;justify-content:center;font-size:1.2rem;font-weight:900;color:#fff">${esc(initials)}</div>
            <div>
              <div class="ma-order-id"><span class="dot" style="background:#4caf50"></span> ${esc(u.name||'بدون اسم')}</div>
              <div class="ma-order-date" style="margin-top:6px"><i class="fas fa-envelope"></i> ${esc(u.email||'—')}</div>
            </div>
          </div>
          <div class="ma-order-badge" style="background:linear-gradient(135deg,#4a7aff,#021ca4);color:#fff"><i class="fas fa-user"></i> عميل</div>
        </div>
        <div class="ma-user-stats">
          <div class="ma-us-item"><div class="ma-us-val">${stats.total}</div><div class="ma-us-lbl">إجمالي الطلبات</div></div>
          <div class="ma-us-item"><div class="ma-us-val">${stats.paid.toFixed(0)} ر.س</div><div class="ma-us-lbl">إجمالي المدفوع</div></div>
          <div class="ma-us-item"><div class="ma-us-val" style="background:linear-gradient(135deg,#66bb6a,#2e7d32);-webkit-background-clip:text;background-clip:text;color:transparent">${Number(u.cashback||0).toFixed(0)} ر.س</div><div class="ma-us-lbl">رصيد الكاش باك</div></div>
          <div class="ma-us-item"><div class="ma-us-val" style="font-size:.86rem">${lastTxt}</div><div class="ma-us-lbl">آخر طلب</div></div>
        </div>
        <div class="ma-customer">
          <div class="ma-cust-item"><i class="fas fa-phone"></i><div><div class="lbl">الجوال</div><div class="val">${esc(u.phone||'—')}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-calendar"></i><div><div class="lbl">سجل في</div><div class="val">${fmtDate(u.created_at)}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-hourglass-half"></i><div><div class="lbl">جارية</div><div class="val">${stats.pending}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-circle-xmark"></i><div><div class="lbl">ملغاة</div><div class="val">${stats.cancelled}</div></div></div>
        </div>
        <div class="ma-actions">
          <button class="ma-btn-action ma-btn-chat" data-user-chat="${u.id}"><i class="fas fa-comments"></i> المحادثة</button>
          <button class="ma-btn-action ma-btn-note" data-user-note="${u.id}"><i class="fas fa-comment-dots"></i> ملاحظة</button>
          <button class="ma-btn-action ma-btn-cb" data-user-cb="${u.id}" data-cb-mode="add"><i class="fas fa-gift"></i> إضافة كاش باك</button>
          <button class="ma-btn-action ma-btn-deduct" data-user-cb="${u.id}" data-cb-mode="deduct"><i class="fas fa-minus"></i> خصم كاش باك</button>
        </div>
      </div>
    `;
  }

  // ═══ Apply Status (مع تحديث رصيد العميل) ═══
  async function applyStatus(orderId, newStatus, btnEl) {
    if (!ORDER_STATUS[newStatus]) return;
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    if (order.status === newStatus) { toast('الحالة نفسها', 'info'); return; }
    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...'; }
    const oldStatus = order.status;
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    let cbMsg = '';

    // عند التسليم: أضف كاش باك لرصيد العميل
    if (newStatus === 'delivered' && !order.cashback_applied) {
      const earned = Math.round(Number(order.total||0) * CASHBACK_RATE * 100) / 100;
      updates.cashback = earned;
      updates.cashback_applied = true;
      updates.cashback_applied_at = new Date().toISOString();
      updates.cashback_paid = false;
      cbMsg = ` + ${earned.toFixed(2)} ر.س كاش باك`;
      try {
        await sb.from('men_cashback_log').insert({
          user_id: order.user_id, user_email: order.user_email, amount: earned,
          reason: `كاش باك تلقائي من الطلب #${orderId}`, order_id: orderId,
          type: 'order', created_by: currentUser.email
        });
        // ✅ أضف لرصيد العميل
        const { data: u } = await sb.from('men_users').select('cashback').eq('id', order.user_id).maybeSingle();
        const newCb = Math.round((Number(u?.cashback||0) + earned) * 100) / 100;
        await sb.from('men_users').update({ cashback: newCb, updated_at: new Date().toISOString() }).eq('id', order.user_id);
        const lu = allUsers.find(x => String(x.id) === String(order.user_id));
        if (lu) lu.cashback = newCb;
      } catch (e) { console.warn(e); }
    }

    // عند الإلغاء أو الرجوع: اخصم من رصيد العميل
    if ((oldStatus === 'delivered' && newStatus !== 'delivered') || newStatus === 'cancelled') {
      if (order.cashback_applied && order.cashback > 0) {
        const refund = Number(order.cashback||0);
        updates.cashback = 0;
        updates.cashback_applied = false;
        updates.cashback_paid = false;
        cbMsg = ` − خصم ${refund.toFixed(2)} ر.س`;
        try {
          await sb.from('men_cashback_log').insert({
            user_id: order.user_id, user_email: order.user_email, amount: -refund,
            reason: `إلغاء كاش باك الطلب #${orderId}`, order_id: orderId,
            type: 'refund', created_by: currentUser.email
          });
          const { data: u } = await sb.from('men_users').select('cashback').eq('id', order.user_id).maybeSingle();
          const newCb = Math.max(0, Math.round((Number(u?.cashback||0) - refund) * 100) / 100);
          await sb.from('men_users').update({ cashback: newCb, updated_at: new Date().toISOString() }).eq('id', order.user_id);
          const lu = allUsers.find(x => String(x.id) === String(order.user_id));
          if (lu) lu.cashback = newCb;
        } catch (e) { console.warn(e); }
      }
    }

    try {
      const { error } = await sb.from('men_orders').update(updates).eq('id', orderId);
      if (error) throw error;
      Object.assign(order, updates);
      renderStats(); renderOrders();
      toast(`✅ "${ORDER_STATUS[newStatus].label}"${cbMsg}`, 'success');
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-check"></i> تطبيق'; }
    }
  }

  // ═══ Cashback Modal ═══
  function openUserCbModal(userId, mode = 'add') {
    const user = allUsers.find(u => String(u.id) === String(userId));
    if (!user) return;
    cbMode = mode;
    selectedOrderForCashback = { user_id: user.id, user_email: user.email, user_name: user.name, id: '—' };
    updateCbModalUI();
    const hint = mode === 'deduct' ? `<em style="color:#ff8a8a">خصم من الرصيد</em>` : `<em style="color:#6a9aff">إضافة للرصيد</em>`;
    $('maCbSub').innerHTML = `العميل: <strong>${esc(user.name||'—')}</strong><br>البريد: <strong dir="ltr">${esc(user.email||'—')}</strong><br>الرصيد الحالي: <strong style="color:#66bb6a">${Number(user.cashback||0).toFixed(2)} ر.س</strong><br>${hint}`;
    $('maCbAmount').value = ''; $('maCbReason').value = '';
    $('maCbModal').classList.add('show');
    setTimeout(() => $('maCbAmount').focus(), 200);
  }
  function openCbModal(orderId, mode = 'add') {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    cbMode = mode;
    selectedOrderForCashback = order;
    updateCbModalUI();
    $('maCbSub').innerHTML = `العميل: <strong>${esc(order.user_name||'—')}</strong><br>البريد: <strong dir="ltr">${esc(order.user_email||'—')}</strong><br>رقم الطلب: <strong>#${String(order.id).slice(-8).toUpperCase()}</strong>`;
    $('maCbAmount').value = ''; $('maCbReason').value = '';
    $('maCbModal').classList.add('show');
    setTimeout(() => $('maCbAmount').focus(), 200);
  }
  function updateCbModalUI() {
    const isD = cbMode === 'deduct';
    const icon = $('maCbIcon'), btn = $('maCbConfirm');
    $('maCbTitle').textContent = isD ? 'خصم كاش باك' : 'إضافة كاش باك';
    if (isD) {
      icon.className = 'fas fa-minus';
      icon.style.background = 'linear-gradient(135deg,#d90429,#8b0018)';
      icon.style.color = '#fff';
      btn.className = 'confirm deduct';
      btn.innerHTML = '<i class="fas fa-minus"></i> خصم';
    } else {
      icon.className = 'fas fa-gift';
      icon.style.background = 'linear-gradient(135deg,#f5b342,#c98a1e)';
      icon.style.color = '#000';
      btn.className = 'confirm';
      btn.innerHTML = '<i class="fas fa-check"></i> إضافة';
    }
  }
  function closeCbModal() { $('maCbModal').classList.remove('show'); selectedOrderForCashback = null; cbMode = 'add'; }

  async function confirmCashback() {
    const amount = Number($('maCbAmount').value);
    const reasonInput = $('maCbReason').value.trim();
    if (!amount || amount <= 0) { toast('مبلغ غير صحيح', 'error'); return; }
    if (!selectedOrderForCashback) return;
    const order = selectedOrderForCashback;
    const isD = cbMode === 'deduct';
    const signed = isD ? -amount : amount;
    const btn = $('maCbConfirm');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
    try {
      const { data: u, error: uE } = await sb.from('men_users').select('cashback, name, email').eq('id', order.user_id).maybeSingle();
      if (uE) throw uE;
      const currentCb = Number(u?.cashback||0);
      if (isD && amount > currentCb) { toast(`الرصيد ${currentCb.toFixed(2)} فقط`, 'error'); btn.disabled = false; updateCbModalUI(); return; }
      const reason = reasonInput || (isD ? 'خصم كاش باك' : 'كاش باك إضافي');
      const { error } = await sb.from('men_cashback_log').insert({
        user_id: order.user_id, user_email: order.user_email, amount: signed,
        reason, order_id: order.id !== '—' ? order.id : null,
        type: isD ? 'deduct' : 'manual', created_by: currentUser.email
      });
      if (error) throw error;
      const newCb = Math.round((currentCb + signed) * 100) / 100;
      const { error: uE2 } = await sb.from('men_users').update({ cashback: newCb, updated_at: new Date().toISOString() }).eq('id', order.user_id);
      if (uE2) throw uE2;
      const lu = allUsers.find(x => String(x.id) === String(order.user_id));
      if (lu) lu.cashback = newCb;
      toast(isD ? `✅ خصم ${amount.toFixed(2)} ر.س` : `✅ إضافة ${amount.toFixed(2)} ر.س`, 'success');
      closeCbModal();
      if (usersView) renderUsers();
      renderStats();
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
      btn.disabled = false;
      updateCbModalUI();
    }
  }

  // ═══ Delete Modal ═══
  function openDelModal(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    selectedOrderForDelete = order;
    const items = Array.isArray(order.items) ? order.items : [];
    const list = items.length ? items.map(it => `• ${esc(it.name||'منتج')} × ${it.qty||1}`).join('<br>') : '—';
    const cbNote = (order.cashback_applied && Number(order.cashback||0) > 0) ? `<br><span style="color:#ff9a9a">⚠️ سيُخصم ${Number(order.cashback).toFixed(2)} ر.س من الرصيد</span>` : '';
    $('maDelSub').innerHTML = `رقم الطلب: <strong>#${String(order.id).slice(-8).toUpperCase()}</strong><br>العميل: <strong>${esc(order.user_name||'—')}</strong><br>الإجمالي: <strong style="color:#6a9aff">${Number(order.total||0).toFixed(2)} ر.س</strong><br><div style="margin-top:10px;padding:10px 12px;background:rgba(0,0,0,.25);border-radius:12px;font-size:.82rem;line-height:1.9">${list}</div>${cbNote}`;
    $('maDelModal').classList.add('show');
  }
  function closeDelModal() { $('maDelModal').classList.remove('show'); selectedOrderForDelete = null; }

  async function confirmDelete() {
    if (!selectedOrderForDelete) return;
    const order = selectedOrderForDelete;
    const btn = $('maDelConfirm');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
    try {
      if (order.cashback_applied && Number(order.cashback||0) > 0) {
        const refund = Number(order.cashback||0);
        try {
          await sb.from('men_cashback_log').insert({
            user_id: order.user_id, user_email: order.user_email, amount: -refund,
            reason: `حذف الطلب #${order.id}`, order_id: order.id,
            type: 'refund', created_by: currentUser.email
          });
          const { data: u } = await sb.from('men_users').select('cashback').eq('id', order.user_id).maybeSingle();
          const newCb = Math.max(0, Math.round((Number(u?.cashback||0) - refund) * 100) / 100);
          await sb.from('men_users').update({ cashback: newCb, updated_at: new Date().toISOString() }).eq('id', order.user_id);
          const lu = allUsers.find(x => String(x.id) === String(order.user_id));
          if (lu) lu.cashback = newCb;
        } catch (e) { console.warn(e); }
      }
      const { error } = await sb.from('men_orders').delete().eq('id', order.id);
      if (error) throw error;
      allOrders = allOrders.filter(o => String(o.id) !== String(order.id));
      renderStats(); renderOrders();
      toast(`🗑️ تم الحذف`, 'success');
      closeDelModal();
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-trash"></i> حذف';
    }
  }

  // ═══ Note Modal ═══
  function openNoteModal(userId) {
    const user = allUsers.find(u => String(u.id) === String(userId));
    if (!user) return;
    selectedUserForNote = user;
    $('maNoteSub').innerHTML = `العميل: <strong>${esc(user.name||'—')}</strong><br>البريد: <strong dir="ltr">${esc(user.email||'—')}</strong>`;
    $('maNoteText').value = '';
    $('maNoteModal').classList.add('show');
    setTimeout(() => $('maNoteText').focus(), 200);
  }
  function closeNoteModal() { $('maNoteModal').classList.remove('show'); selectedUserForNote = null; }

  async function confirmNote() {
    if (!selectedUserForNote) return;
    const text = $('maNoteText').value.trim();
    if (!text) { toast('اكتب النص', 'error'); return; }
    const btn = $('maNoteConfirm');
    btn.disabled = true; btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>...';
    try {
      const { error } = await sb.from('men_messages').insert({
        user_id: selectedUserForNote.id, user_email: selectedUserForNote.email,
        sender: 'admin', sender_name: currentUser.user_metadata?.name || currentUser.email.split('@')[0],
        sender_email: currentUser.email, message: text, type: 'note', is_read: false
      });
      if (error) throw error;
      toast('📝 تم الإرسال', 'success');
      closeNoteModal();
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-paper-plane"></i> إرسال';
    }
  }

  // ═══ Chat ═══
  async function openChatModal(userId) {
    const user = allUsers.find(u => String(u.id) === String(userId));
    if (!user) return;
    selectedUserForChat = user;
    const parts = (user.name||'M').split(/\s+/);
    let initials = parts.length === 1 ? parts[0].substring(0,2) : (parts[0][0]||'') + (parts[parts.length-1][0]||'');
    initials = initials.toUpperCase();
    $('maChatAvatar').textContent = initials;
    $('maChatName').textContent = user.name || 'بدون اسم';
    $('maChatEmail').textContent = user.email || '—';
    $('maChatBody').innerHTML = '<div class="ma-chat-empty"><i class="fas fa-spinner fa-spin"></i> تحميل...</div>';
    $('maChatInput').value = '';
    $('maChatModal').classList.add('show');
    await loadChatMessages(user.id);
    setTimeout(() => $('maChatInput').focus(), 200);
  }
  function closeChatModal() { $('maChatModal').classList.remove('show'); selectedUserForChat = null; }

  async function loadChatMessages(userId) {
    try {
      const { data, error } = await sb.from('men_messages').select('*').eq('user_id', userId).order('created_at', { ascending: true }).limit(300);
      if (error) throw error;
      renderChatMessages(data || []);
    } catch (err) {
      console.error(err);
      $('maChatBody').innerHTML = `<div class="ma-chat-empty"><i class="fas fa-triangle-exclamation" style="color:#d90429"></i> فشل: ${esc(err.message)}</div>`;
    }
  }

  function renderChatMessages(msgs) {
    const body = $('maChatBody');
    if (!msgs.length) { body.innerHTML = '<div class="ma-chat-empty"><i class="fas fa-comment-slash"></i> لا يوجد رسائل</div>'; return; }
    body.innerHTML = msgs.map(m => {
      const time = fmtDate(m.created_at);
      if (m.type === 'note') {
        return `<div class="ma-msg note"><div class="ma-msg-meta"><i class="fas fa-comment-dots"></i> ملاحظة — ${esc(m.sender_name||'المشرف')}</div><div>${esc(m.message)}</div><div class="ma-msg-time">${time}</div></div>`;
      }
      const cls = m.sender === 'admin' ? 'admin' : 'customer';
      const lbl = m.sender === 'admin' ? 'المشرف' : 'العميل';
      return `<div class="ma-msg ${cls}"><div class="ma-msg-meta">${lbl}</div><div>${esc(m.message)}</div><div class="ma-msg-time">${time}</div></div>`;
    }).join('');
    body.scrollTop = body.scrollHeight;
  }

  async function sendChatMessage() {
    if (!selectedUserForChat) return;
    const input = $('maChatInput');
    const text = input.value.trim();
    if (!text) return;
    const btn = $('maChatSend');
    btn.disabled = true;
    try {
      const { error } = await sb.from('men_messages').insert({
        user_id: selectedUserForChat.id, user_email: selectedUserForChat.email,
        sender: 'admin', sender_name: currentUser.user_metadata?.name || currentUser.email.split('@')[0],
        sender_email: currentUser.email, message: text, type: 'chat', is_read: false
      });
      if (error) throw error;
      input.value = '';
      await loadChatMessages(selectedUserForChat.id);
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      input.focus();
    }
  }

  // ═══ Toast ═══
  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'ma-toast ' + type;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    t.innerHTML = `<i class="fas ${icons[type]||'fa-circle-info'}"></i><span>${esc(msg)}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 400); }, 3000);
  }

  // ═══ Bootstrap ═══
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
