/* ============================================================
   🛡️ MEN Store — Admin Orders Panel v1
   لوحة إدارة الطلبات + الكاش باك
   ============================================================ */
(function () {
  'use strict';

  // ═══════════════════════════════════════════════════════════
  // ⚙️ الإعدادات — عدّلها حسب مشروعك
  // ═══════════════════════════════════════════════════════════
  const SUPABASE_URL  = 'https://xoqwzluyxynqpdpmidts.supabase.co';
  const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXd6bHV5eHlucXBkcG1pZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTI2NDAsImV4cCI6MjEwNTY4ODY0MH0.xIpvxJyAMAoLqkSR9RJk2ZcgN7rsfOg2OfbelraMWvs';
  const ADMIN_EMAILS  = ['mkmkmkl24666606@gmail.com']; // ⭐ أضف بريدك
  const CASHBACK_RATE = 0.02;
  const LOGO_URL      = 'https://www.socialcreator.com/srv/imgs/ti_imgs/200176_309202.png';

  // ═══ حالة الطلب ═══
  const ORDER_STATUS = {
    pending:   { label: 'قيد الانتظار', color: '#f5b342', bg: 'linear-gradient(135deg,#f5b342,#c98a1e)', icon: 'fa-hourglass-half', text: '#000' },
    preparing: { label: 'جاري التجهيز', color: '#4a7aff', bg: 'linear-gradient(135deg,#4a7aff,#021ca4)', icon: 'fa-gears',           text: '#fff' },
    review:    { label: 'تحت المراجعة', color: '#6a9aff', bg: 'linear-gradient(135deg,#6a9aff,#4a7aff)', icon: 'fa-magnifying-glass',text: '#fff' },
    delivered: { label: 'تم الاستلام',  color: '#4caf50', bg: 'linear-gradient(135deg,#4caf50,#2e7d32)', icon: 'fa-circle-check',    text: '#fff' },
    cancelled: { label: 'ملغي',         color: '#d90429', bg: 'linear-gradient(135deg,#d90429,#8b0018)', icon: 'fa-circle-xmark',    text: '#fff' }
  };

  let sb = null;
  let currentUser = null;
  let allOrders = [];
  let selectedOrderForCashback = null;
  const $ = id => document.getElementById(id);

  // ═══════════════════════════════════════════════════════════
  // 🚀 Boot
  // ═══════════════════════════════════════════════════════════
  function boot() {
    if (!window.supabase?.createClient) {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      script.onload = init;
      document.head.appendChild(script);
    } else {
      init();
    }
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

  // ═══════════════════════════════════════════════════════════
  // 🎨 CSS
  // ═══════════════════════════════════════════════════════════
  function injectCSS() {
    if ($('menAdminStyles')) return;
    const s = document.createElement('style');
    s.id = 'menAdminStyles';
    s.textContent = `
      .ma-root{position:fixed;inset:0;z-index:99999;background:#060812;color:#fff;font-family:'Cairo','Outfit',sans-serif;overflow-y:auto;overflow-x:hidden;display:none}
      .ma-root.active{display:block;animation:maFade .3s ease}
      @keyframes maFade{from{opacity:0}to{opacity:1}}

      .ma-bg{position:fixed;inset:0;z-index:0;pointer-events:none;background:
        radial-gradient(ellipse at 15% 20%,rgba(2,28,164,.35) 0%,transparent 55%),
        radial-gradient(ellipse at 85% 80%,rgba(74,122,255,.25) 0%,transparent 50%),
        radial-gradient(ellipse at 50% 50%,#060812 0%,#030510 100%)}
      .ma-bg::after{content:'';position:absolute;inset:0;background-image:
        linear-gradient(rgba(74,122,255,.04) 1px,transparent 1px),
        linear-gradient(90deg,rgba(74,122,255,.04) 1px,transparent 1px);
        background-size:60px 60px;
        mask-image:radial-gradient(ellipse at center,black 20%,transparent 75%);
        -webkit-mask-image:radial-gradient(ellipse at center,black 20%,transparent 75%)}

      /* Login Gate */
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
      .ma-gate-btn:disabled{opacity:.7;cursor:not-allowed}
      .ma-gate-err{display:none;margin-top:14px;padding:12px;border-radius:12px;background:rgba(217,4,41,.1);border:1px solid rgba(217,4,41,.3);color:#ff8a8a;font-size:.85rem;font-weight:700}
      .ma-gate-err.show{display:block}

      /* Dashboard */
      .ma-dash{position:relative;z-index:10;display:none;padding:24px 0 80px}
      .ma-dash.active{display:block}
      .ma-header{position:sticky;top:0;z-index:100;background:linear-gradient(180deg,rgba(6,8,18,.98),rgba(6,8,18,.9));backdrop-filter:blur(20px);border-bottom:1px solid rgba(74,122,255,.14);padding:16px 0;margin-bottom:28px}
      .ma-header-inner{max-width:1400px;margin:0 auto;padding:0 24px;display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap}
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

      .ma-container{max-width:1400px;margin:0 auto;padding:0 24px}

      /* Stats */
      .ma-stats{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:24px}
      .ma-stat{background:linear-gradient(145deg,rgba(14,20,38,.75),rgba(8,12,24,.9));border:1px solid rgba(74,122,255,.14);border-radius:22px;padding:22px;position:relative;overflow:hidden;transition:all .35s}
      .ma-stat::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#4a7aff);opacity:.9}
      .ma-stat:hover{transform:translateY(-5px);border-color:rgba(74,122,255,.35);box-shadow:0 22px 50px -15px rgba(2,28,164,.6)}
      .ma-stat-icon{width:46px;height:46px;border-radius:14px;display:flex;align-items:center;justify-content:center;font-size:1.2rem;margin-bottom:14px;background:var(--icon-bg);color:var(--accent)}
      .ma-stat-val{font-size:1.8rem;font-weight:900;line-height:1.1;margin-bottom:4px;letter-spacing:-1px}
      .ma-stat-lbl{font-size:.78rem;color:#8a92b0;font-weight:700}

      /* Filters */
      .ma-filters{background:linear-gradient(145deg,rgba(14,20,38,.75),rgba(8,12,24,.9));border:1px solid rgba(74,122,255,.14);border-radius:22px;padding:20px 22px;margin-bottom:20px;display:flex;gap:12px;flex-wrap:wrap;align-items:center}
      .ma-search{flex:1;min-width:220px;position:relative}
      .ma-search input{width:100%;height:48px;padding:0 44px 0 16px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-weight:600;font-size:.9rem;outline:none;transition:all .3s;box-sizing:border-box}
      .ma-search input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.15)}
      .ma-search i{position:absolute;right:16px;top:50%;transform:translateY(-50%);color:#4a7aff;pointer-events:none}
      .ma-filters select{height:48px;padding:0 18px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:.88rem;outline:none;cursor:pointer;min-width:170px}
      .ma-filters select:focus{border-color:#4a7aff}
      .ma-refresh{height:48px;padding:0 22px;border-radius:14px;border:none;background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;font-family:'Cairo',sans-serif;font-weight:800;font-size:.85rem;cursor:pointer;display:inline-flex;align-items:center;gap:8px;transition:all .3s;box-shadow:0 10px 26px -10px rgba(74,122,255,.8)}
      .ma-refresh:hover{transform:translateY(-2px)}

      /* Orders */
      .ma-orders{display:flex;flex-direction:column;gap:14px}
      .ma-order{background:linear-gradient(145deg,rgba(14,20,38,.7),rgba(8,12,24,.85));border:1px solid rgba(74,122,255,.14);border-radius:22px;padding:22px 24px;transition:all .35s;position:relative;overflow:hidden}
      .ma-order:hover{transform:translateY(-3px);border-color:rgba(74,122,255,.35);box-shadow:0 20px 50px -15px rgba(2,28,164,.6)}
      .ma-order-top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;flex-wrap:wrap;margin-bottom:16px}
      .ma-order-id{font-weight:900;font-size:1rem;display:flex;align-items:center;gap:10px}
      .ma-order-id .dot{width:10px;height:10px;border-radius:50%;background:var(--st-color,#4caf50);box-shadow:0 0 14px var(--st-color,#4caf50)}
      .ma-order-date{color:#8a92b0;font-size:.78rem;font-weight:600;display:flex;align-items:center;gap:6px;margin-top:6px}
      .ma-order-badge{color:#fff;font-size:.72rem;font-weight:800;padding:6px 14px;border-radius:20px;display:inline-flex;align-items:center;gap:6px;box-shadow:0 6px 18px -6px rgba(0,0,0,.6)}
      .ma-customer{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;padding:14px 16px;background:rgba(74,122,255,.05);border:1px solid rgba(74,122,255,.14);border-radius:16px;margin-bottom:14px}
      .ma-cust-item{display:flex;align-items:center;gap:10px}
      .ma-cust-item i{width:32px;height:32px;border-radius:10px;background:rgba(74,122,255,.15);color:#6a9aff;display:flex;align-items:center;justify-content:center;font-size:.82rem;flex-shrink:0}
      .ma-cust-item .lbl{font-size:.68rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1px}
      .ma-cust-item .val{font-size:.86rem;font-weight:700;color:#fff;word-break:break-all}
      .ma-items{padding:14px 16px;background:rgba(0,0,0,.2);border-radius:14px;margin-bottom:14px;font-size:.85rem;color:#a8b0cc;line-height:1.9}
      .ma-items .name{color:#fff;font-weight:700}
      .ma-bottom{display:flex;justify-content:space-between;align-items:center;gap:16px;flex-wrap:wrap}
      .ma-total{font-size:1.4rem;font-weight:900;background:linear-gradient(135deg,#fff,#6a9aff);-webkit-background-clip:text;background-clip:text;color:transparent}
      .ma-cb-info{display:inline-flex;align-items:center;gap:8px;padding:8px 14px;border-radius:20px;font-size:.78rem;font-weight:800}
      .ma-cb-info.earned{background:rgba(76,175,80,.12);border:1px solid rgba(76,175,80,.3);color:#66bb6a}
      .ma-cb-info.pending{background:rgba(245,179,66,.1);border:1px solid rgba(245,179,66,.3);color:#f5b342}
      .ma-actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:16px;border-top:1px dashed rgba(74,122,255,.2)}
      .ma-actions select{flex:1;min-width:160px;height:44px;padding:0 14px;border-radius:12px;background:rgba(0,0,0,.4);border:1.5px solid rgba(74,122,255,.25);color:#fff;font-family:'Cairo',sans-serif;font-weight:700;font-size:.85rem;outline:none;cursor:pointer}
      .ma-actions select:focus{border-color:#4a7aff;box-shadow:0 0 0 3px rgba(74,122,255,.15)}
      .ma-btn-action{padding:11px 20px;border-radius:12px;border:none;font-family:'Cairo',sans-serif;font-weight:800;font-size:.82rem;cursor:pointer;display:inline-flex;align-items:center;gap:7px;transition:all .3s}
      .ma-btn-apply{background:linear-gradient(135deg,#021ca4,#4a7aff);color:#fff;box-shadow:0 8px 22px -8px rgba(74,122,255,.8)}
      .ma-btn-apply:hover:not(:disabled){transform:translateY(-2px)}
      .ma-btn-cb{background:linear-gradient(135deg,#f5b342,#c98a1e);color:#000;box-shadow:0 8px 22px -8px rgba(245,179,66,.8)}
      .ma-btn-cb:hover{transform:translateY(-2px)}
      .ma-btn-action:disabled{opacity:.6;cursor:not-allowed;transform:none!important}

      /* Empty / Loading */
      .ma-empty{text-align:center;padding:80px 24px;background:rgba(74,122,255,.04);border:1.5px dashed rgba(74,122,255,.25);border-radius:24px}
      .ma-empty i{font-size:3rem;color:#4a7aff;margin-bottom:16px;opacity:.7}
      .ma-empty h3{font-size:1.2rem;font-weight:900;margin-bottom:8px}
      .ma-empty p{color:#8a92b0;font-weight:600}
      .ma-loader{text-align:center;padding:60px}
      .ma-spin{width:44px;height:44px;margin:0 auto 16px;border-radius:50%;border:3px solid rgba(74,122,255,.2);border-top-color:#4a7aff;animation:maSpin .8s linear infinite}
      @keyframes maSpin{to{transform:rotate(360deg)}}

      /* Modal */
      .ma-modal-back{display:none;position:fixed;inset:0;z-index:100000;background:rgba(0,0,0,.75);backdrop-filter:blur(8px);align-items:center;justify-content:center;padding:20px}
      .ma-modal-back.show{display:flex;animation:maFade .25s}
      .ma-modal{background:linear-gradient(145deg,rgba(14,20,38,.98),rgba(8,12,24,1));border:1px solid rgba(74,122,255,.14);border-radius:24px;max-width:440px;width:100%;padding:30px 28px;box-shadow:0 40px 100px -30px rgba(2,28,164,.9);animation:maPop .35s cubic-bezier(.34,1.56,.64,1)}
      @keyframes maPop{from{transform:scale(.85);opacity:0}to{transform:scale(1);opacity:1}}
      .ma-modal-title{display:flex;align-items:center;gap:12px;font-size:1.15rem;font-weight:900;margin-bottom:8px}
      .ma-modal-title i{width:42px;height:42px;border-radius:12px;background:linear-gradient(135deg,#f5b342,#c98a1e);color:#000;display:flex;align-items:center;justify-content:center;font-size:1rem}
      .ma-modal-sub{color:#8a92b0;font-size:.85rem;font-weight:600;margin-bottom:22px;line-height:1.7}
      .ma-modal-field{margin-bottom:14px}
      .ma-modal-field label{display:block;font-size:.72rem;color:#8a92b0;font-weight:800;text-transform:uppercase;letter-spacing:1.2px;margin-bottom:8px}
      .ma-modal-field input{width:100%;padding:14px 18px;border-radius:14px;background:rgba(0,0,0,.35);border:1.5px solid rgba(74,122,255,.14);color:#fff;font-family:'Cairo',sans-serif;font-weight:600;font-size:.94rem;outline:none;transition:all .3s;box-sizing:border-box}
      .ma-modal-field input:focus{border-color:#4a7aff;box-shadow:0 0 0 4px rgba(74,122,255,.15)}
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
      .ma-modal-actions .confirm:disabled{opacity:.6;cursor:not-allowed;transform:none}

      /* Toast */
      .ma-toast{position:fixed;bottom:24px;left:50%;transform:translateX(-50%) translateY(100px);padding:14px 26px;border-radius:60px;font-weight:800;font-size:.9rem;z-index:100001;transition:transform .4s cubic-bezier(.34,1.56,.64,1);display:inline-flex;align-items:center;gap:10px;box-shadow:0 15px 40px -10px rgba(0,0,0,.6);max-width:90vw;font-family:'Cairo',sans-serif}
      .ma-toast.show{transform:translateX(-50%) translateY(0)}
      .ma-toast.success{background:linear-gradient(135deg,#4caf50,#2e7d32);color:#fff}
      .ma-toast.error{background:linear-gradient(135deg,#d90429,#8b0018);color:#fff}
      .ma-toast.info{background:linear-gradient(135deg,#4a7aff,#021ca4);color:#fff}

      /* Close Btn */
      .ma-close{position:fixed;top:20px;left:20px;z-index:9999;width:46px;height:46px;border-radius:50%;background:rgba(74,122,255,.1);border:1px solid rgba(74,122,255,.25);color:#6a9aff;font-size:1.1rem;cursor:pointer;display:none;align-items:center;justify-content:center;transition:all .3s;backdrop-filter:blur(10px)}
      .ma-close.show{display:flex}
      .ma-close:hover{background:rgba(217,4,41,.15);border-color:rgba(217,4,41,.3);color:#ff6b6b;transform:rotate(90deg)}

      @media (max-width:900px){
        .ma-stats{grid-template-columns:repeat(2,1fr)}
        .ma-user-info{display:none}
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
        .ma-close{top:14px;left:14px;width:40px;height:40px}
      }
    `;
    document.head.appendChild(s);
  }

  // ═══════════════════════════════════════════════════════════
  // 🖼️ HTML
  // ═══════════════════════════════════════════════════════════
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
          <p>يجب تسجيل الدخول بحساب المشرف للوصول</p>
          <div class="ma-field">
            <label>البريد الإلكتروني</label>
            <input type="email" id="maGateEmail" placeholder="admin@example.com" autocomplete="email">
          </div>
          <div class="ma-field">
            <label>كلمة المرور</label>
            <input type="password" id="maGatePass" placeholder="••••••••" autocomplete="current-password">
          </div>
          <button class="ma-gate-btn" id="maGateBtn">
            <i class="fas fa-right-to-bracket"></i> دخول
          </button>
          <div class="ma-gate-err" id="maGateErr"></div>
        </div>
      </div>

      <div class="ma-dash" id="maDash">
        <div class="ma-header">
          <div class="ma-header-inner">
            <div class="ma-brand">
              <img src="${LOGO_URL}" alt="MEN Store">
              <div class="ma-brand-text">
                <div class="t">لوحة الطلبات</div>
                <div class="s">MEN Store Admin</div>
              </div>
            </div>
            <div class="ma-user">
              <div class="ma-user-info">
                <div class="n" id="maUserName">—</div>
                <div class="e" id="maUserEmail">—</div>
              </div>
              <button class="ma-btn-ghost" id="maLogout">
                <i class="fas fa-sign-out-alt"></i> خروج
              </button>
            </div>
          </div>
        </div>

        <div class="ma-container">
          <div class="ma-stats">
            <div class="ma-stat" style="--accent:#4a7aff;--icon-bg:rgba(74,122,255,.15)">
              <div class="ma-stat-icon"><i class="fas fa-box"></i></div>
              <div class="ma-stat-val" id="maStatTotal">0</div>
              <div class="ma-stat-lbl">إجمالي الطلبات</div>
            </div>
            <div class="ma-stat" style="--accent:#f5b342;--icon-bg:rgba(245,179,66,.15)">
              <div class="ma-stat-icon"><i class="fas fa-hourglass-half"></i></div>
              <div class="ma-stat-val" id="maStatPending">0</div>
              <div class="ma-stat-lbl">قيد المعالجة</div>
            </div>
            <div class="ma-stat" style="--accent:#4caf50;--icon-bg:rgba(76,175,80,.15)">
              <div class="ma-stat-icon"><i class="fas fa-circle-check"></i></div>
              <div class="ma-stat-val" id="maStatDelivered">0</div>
              <div class="ma-stat-lbl">تم الاستلام</div>
            </div>
            <div class="ma-stat" style="--accent:#6a9aff;--icon-bg:rgba(106,154,255,.15)">
              <div class="ma-stat-icon"><i class="fas fa-coins"></i></div>
              <div class="ma-stat-val" id="maStatRevenue">0</div>
              <div class="ma-stat-lbl">إجمالي المبيعات (ر.س)</div>
            </div>
          </div>

          <div class="ma-filters">
            <div class="ma-search">
              <input type="text" id="maSearch" placeholder="ابحث بالاسم، البريد، الجوال، رقم الطلب...">
              <i class="fas fa-search"></i>
            </div>
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

          <div id="maOrders">
            <div class="ma-loader"><div class="ma-spin"></div><p style="color:#8a92b0;font-weight:700">جاري تحميل الطلبات...</p></div>
          </div>
        </div>
      </div>

      <div class="ma-modal-back" id="maCbModal">
        <div class="ma-modal">
          <div class="ma-modal-title">
            <i class="fas fa-gift"></i>
            إضافة كاش باك للعميل
          </div>
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

          <div class="ma-modal-field">
            <label>السبب / ملاحظة (اختياري)</label>
            <input type="text" id="maCbReason" placeholder="مثال: تعويض عن تأخير، هدية، إلخ">
          </div>

          <div class="ma-modal-actions">
            <button class="cancel" id="maCbCancel" type="button">إلغاء</button>
            <button class="confirm" id="maCbConfirm" type="button"><i class="fas fa-check"></i> إضافة الكاش باك</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(root);
  }

  // ═══════════════════════════════════════════════════════════
  // 🎯 Open/Close
  // ═══════════════════════════════════════════════════════════
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

  // ═══════════════════════════════════════════════════════════
  // 🔗 Events
  // ═══════════════════════════════════════════════════════════
  function bindEvents() {
    $('maClose').addEventListener('click', closePanel);

    $('maGateBtn').addEventListener('click', doLogin);
    $('maGatePass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    $('maGateEmail').addEventListener('keydown', e => { if (e.key === 'Enter') $('maGatePass').focus(); });

    $('maLogout').addEventListener('click', async () => {
      await sb.auth.signOut();
      currentUser = null;
      showGate();
      toast('تم تسجيل الخروج', 'info');
    });

    $('maSearch').addEventListener('input', renderOrders);
    $('maStatusFilter').addEventListener('change', renderOrders);
    $('maRefresh').addEventListener('click', () => { loadOrders(); toast('تم التحديث', 'info'); });

    $('maCbCancel').addEventListener('click', closeCbModal);
    $('maCbModal').addEventListener('click', e => { if (e.target.id === 'maCbModal') closeCbModal(); });
    $('maCbConfirm').addEventListener('click', confirmCashback);
    document.querySelectorAll('[data-amt]').forEach(b => {
      b.addEventListener('click', () => { $('maCbAmount').value = b.dataset.amt; });
    });
  }

  // ═══════════════════════════════════════════════════════════
  // 🔐 Auth
  // ═══════════════════════════════════════════════════════════
  async function checkAuth() {
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user && ADMIN_EMAILS.includes((session.user.email || '').toLowerCase())) {
      currentUser = session.user;
      showDashboard();
    } else {
      showGate();
    }
  }

  function showGate() {
    $('maGate').style.display = 'flex';
    $('maDash').classList.remove('active');
  }

  function showDashboard() {
    $('maGate').style.display = 'none';
    $('maDash').classList.add('active');
    $('maUserName').textContent = currentUser.user_metadata?.name || currentUser.email.split('@')[0];
    $('maUserEmail').textContent = currentUser.email;
    loadOrders();
  }

  async function doLogin() {
    const email = $('maGateEmail').value.trim().toLowerCase();
    const pass = $('maGatePass').value;
    const err = $('maGateErr');
    err.classList.remove('show');

    if (!email || !pass) {
      err.textContent = 'الرجاء إدخال البريد وكلمة المرور';
      err.classList.add('show');
      return;
    }
    if (!ADMIN_EMAILS.includes(email)) {
      err.textContent = 'هذا الحساب ليس مشرفاً';
      err.classList.add('show');
      return;
    }

    const btn = $('maGateBtn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الدخول...';

    try {
      const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
      if (error) throw error;
      currentUser = data.user;
      toast('مرحباً بك 👋', 'success');
      showDashboard();
    } catch (e) {
      err.textContent = e.message || 'فشل تسجيل الدخول';
      err.classList.add('show');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-right-to-bracket"></i> دخول';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 📦 Load Orders
  // ═══════════════════════════════════════════════════════════
  async function loadOrders() {
    const container = $('maOrders');
    container.innerHTML = '<div class="ma-loader"><div class="ma-spin"></div><p style="color:#8a92b0;font-weight:700">جاري تحميل الطلبات...</p></div>';

    try {
      const { data, error } = await sb.from('men_orders')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;
      allOrders = data || [];
      renderStats();
      renderOrders();
    } catch (err) {
      console.error(err);
      container.innerHTML = `<div class="ma-empty"><i class="fas fa-triangle-exclamation" style="color:#d90429"></i><h3>فشل تحميل الطلبات</h3><p>${err.message}</p></div>`;
    }
  }

  function renderStats() {
    const total = allOrders.length;
    const pending = allOrders.filter(o => o.status !== 'delivered' && o.status !== 'cancelled').length;
    const delivered = allOrders.filter(o => o.status === 'delivered').length;
    const revenue = allOrders.filter(o => o.status === 'delivered').reduce((s, o) => s + Number(o.total || 0), 0);

    $('maStatTotal').textContent = total;
    $('maStatPending').textContent = pending;
    $('maStatDelivered').textContent = delivered;
    $('maStatRevenue').textContent = revenue.toFixed(0);
  }

  function renderOrders() {
    const container = $('maOrders');
    const q = ($('maSearch').value || '').trim().toLowerCase();
    const statusFilter = $('maStatusFilter').value;

    let filtered = allOrders.filter(o => {
      if (statusFilter && o.status !== statusFilter) return false;
      if (q) {
        const hay = `${o.id} ${o.user_name||''} ${o.user_email||''} ${o.user_phone||''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });

    if (!filtered.length) {
      container.innerHTML = `<div class="ma-empty"><i class="fas fa-inbox"></i><h3>لا يوجد طلبات</h3><p>${q || statusFilter ? 'جرّب تغيير الفلتر أو البحث' : 'ستظهر الطلبات هنا تلقائياً'}</p></div>`;
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

    container.querySelectorAll('[data-add-cashback]').forEach(btn => {
      btn.addEventListener('click', () => openCbModal(btn.dataset.addCashback));
    });
  }

  function renderOrderCard(o) {
    const st = ORDER_STATUS[o.status] || ORDER_STATUS.pending;
    const items = Array.isArray(o.items) ? o.items : [];
    const itemsHtml = items.map(it => `<div>• <span class="name">${it.name || 'منتج'}</span> × ${it.qty || 1} — ${(Number(it.price||0) * Number(it.qty||1)).toFixed(2)} ر.س</div>`).join('') || '<div>—</div>';
    const date = o.created_at ? new Date(o.created_at).toLocaleString('ar-SA', { year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : '—';

    let cbHtml = '';
    if (o.status === 'delivered' && o.cashback_applied) {
      cbHtml = `<div class="ma-cb-info earned"><i class="fas fa-gift"></i> كاش باك مكتسب: ${Number(o.cashback || 0).toFixed(2)} ر.س</div>`;
    } else if (o.status !== 'cancelled' && o.status !== 'delivered') {
      const potential = Number(o.total || 0) * CASHBACK_RATE;
      cbHtml = `<div class="ma-cb-info pending"><i class="fas fa-clock"></i> متوقع عند التسليم: ${potential.toFixed(2)} ر.س</div>`;
    }

    const options = Object.entries(ORDER_STATUS).map(([k, v]) =>
      `<option value="${k}" ${k === o.status ? 'selected' : ''}>${v.label}</option>`
    ).join('');

    return `
      <div class="ma-order" data-order="${o.id}">
        <div class="ma-order-top">
          <div>
            <div class="ma-order-id" style="--st-color:${st.color}">
              <span class="dot"></span>
              طلب #${String(o.id || '').slice(-8).toUpperCase()}
            </div>
            <div class="ma-order-date"><i class="fas fa-clock"></i> ${date}</div>
          </div>
          <div class="ma-order-badge" style="background:${st.bg};color:${st.text}">
            <i class="fas ${st.icon}"></i> ${st.label}
          </div>
        </div>

        <div class="ma-customer">
          <div class="ma-cust-item"><i class="fas fa-user"></i><div><div class="lbl">العميل</div><div class="val">${o.user_name || '—'}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-envelope"></i><div><div class="lbl">البريد</div><div class="val">${o.user_email || '—'}</div></div></div>
          <div class="ma-cust-item"><i class="fas fa-phone"></i><div><div class="lbl">الجوال</div><div class="val">${o.user_phone || '—'}</div></div></div>
        </div>

        <div class="ma-items">${itemsHtml}</div>

        <div class="ma-bottom">
          <div class="ma-total">${Number(o.total || 0).toFixed(2)} ر.س</div>
          ${cbHtml}
        </div>

        <div class="ma-actions">
          <select data-order-select="${o.id}">${options}</select>
          <button class="ma-btn-action ma-btn-apply" data-apply-status="${o.id}">
            <i class="fas fa-check"></i> تطبيق الحالة
          </button>
          <button class="ma-btn-action ma-btn-cb" data-add-cashback="${o.id}">
            <i class="fas fa-gift"></i> إضافة كاش باك
          </button>
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════════════════════════
  // 🔄 Apply Status + Auto Cashback
  // ═══════════════════════════════════════════════════════════
  async function applyStatus(orderId, newStatus, btnEl) {
    if (!ORDER_STATUS[newStatus]) return;
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    if (order.status === newStatus) { toast('الحالة نفسها', 'info'); return; }

    if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري...'; }

    const oldStatus = order.status;
    const updates = { status: newStatus, updated_at: new Date().toISOString() };
    let cbMsg = '';

    if (newStatus === 'delivered' && !order.cashback_applied) {
      const earned = Math.round(Number(order.total || 0) * CASHBACK_RATE * 100) / 100;
      updates.cashback = earned;
      updates.cashback_applied = true;
      updates.cashback_applied_at = new Date().toISOString();
      cbMsg = ` + ${earned.toFixed(2)} ر.س كاش باك`;

      try {
        await sb.from('men_cashback_log').insert({
          user_id: order.user_id,
          user_email: order.user_email,
          amount: earned,
          reason: `كاش باك تلقائي من الطلب #${orderId}`,
          order_id: orderId,
          type: 'order',
          created_by: currentUser.email
        });
      } catch (e) { console.warn('log insert failed', e); }
    }

    if ((oldStatus === 'delivered' && newStatus !== 'delivered') || newStatus === 'cancelled') {
      if (order.cashback_applied && order.cashback > 0) {
        const refund = Number(order.cashback || 0);
        updates.cashback = 0;
        updates.cashback_applied = false;
        cbMsg = ` − خصم ${refund.toFixed(2)} ر.س`;

        try {
          await sb.from('men_cashback_log').insert({
            user_id: order.user_id,
            user_email: order.user_email,
            amount: -refund,
            reason: `إلغاء كاش باك الطلب #${orderId}`,
            order_id: orderId,
            type: 'refund',
            created_by: currentUser.email
          });
        } catch (e) { console.warn(e); }
      }
    }

    try {
      const { error } = await sb.from('men_orders').update(updates).eq('id', orderId);
      if (error) throw error;

      Object.assign(order, updates);
      renderStats();
      renderOrders();
      toast(`✅ تم التحديث إلى "${ORDER_STATUS[newStatus].label}"${cbMsg}`, 'success');
    } catch (err) {
      console.error(err);
      toast('فشل التحديث: ' + err.message, 'error');
      if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = '<i class="fas fa-check"></i> تطبيق الحالة'; }
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 💰 Cashback Modal
  // ═══════════════════════════════════════════════════════════
  function openCbModal(orderId) {
    const order = allOrders.find(o => String(o.id) === String(orderId));
    if (!order) return;
    selectedOrderForCashback = order;

    $('maCbSub').innerHTML = `
      العميل: <strong>${order.user_name || '—'}</strong><br>
      البريد: <strong dir="ltr">${order.user_email || '—'}</strong><br>
      رقم الطلب: <strong>#${String(order.id).slice(-8).toUpperCase()}</strong>
    `;
    $('maCbAmount').value = '';
    $('maCbReason').value = '';
    $('maCbModal').classList.add('show');
    setTimeout(() => $('maCbAmount').focus(), 200);
  }

  function closeCbModal() {
    $('maCbModal').classList.remove('show');
    selectedOrderForCashback = null;
  }

  async function confirmCashback() {
    const amount = Number($('maCbAmount').value);
    const reason = $('maCbReason').value.trim() || 'كاش باك إضافي من الإدارة';

    if (!amount || amount <= 0) { toast('أدخل مبلغاً صحيحاً', 'error'); return; }
    if (!selectedOrderForCashback) return;

    const order = selectedOrderForCashback;
    const btn = $('maCbConfirm');
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> جاري الإضافة...';

    try {
      const { error } = await sb.from('men_cashback_log').insert({
        user_id: order.user_id,
        user_email: order.user_email,
        amount: amount,
        reason: reason,
        order_id: order.id,
        type: 'manual',
        created_by: currentUser.email
      });
      if (error) throw error;

      toast(`✅ تم إضافة ${amount.toFixed(2)} ر.س كاش باك لـ ${order.user_name || order.user_email}`, 'success');
      closeCbModal();
    } catch (err) {
      console.error(err);
      toast('فشل: ' + err.message, 'error');
    } finally {
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-check"></i> إضافة الكاش باك';
    }
  }

  // ═══════════════════════════════════════════════════════════
  // 🔔 Toast
  // ═══════════════════════════════════════════════════════════
  function toast(msg, type = 'info') {
    const t = document.createElement('div');
    t.className = 'ma-toast ' + type;
    const icons = { success: 'fa-circle-check', error: 'fa-circle-exclamation', info: 'fa-circle-info' };
    t.innerHTML = `<i class="fas ${icons[type] || 'fa-circle-info'}"></i><span>${msg}</span>`;
    document.body.appendChild(t);
    requestAnimationFrame(() => t.classList.add('show'));
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 400);
    }, 3000);
  }

  // ═══════════════════════════════════════════════════════════
  // 🚀 Bootstrap
  // ═══════════════════════════════════════════════════════════
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
