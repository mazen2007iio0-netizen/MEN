// ============================================================
// سومها — المنطق الكامل (so.js)
// ============================================================
(function(){
  const CFG = window.SUMHA_CONFIG;
  const SBC = window.SUPABASE_CONFIG;
  let sb = null;
  const state = {
    user:null, profile:null, isAdmin:false, adminRole:null,
    auctions:[], settings:{}, page:'home', pageData:{},
    pendingAction:null, channel:null
  };

  // ============ الأيقونات ============
  const CAT_SVG = {
    'سيارات ومركبات': `<svg viewBox="0 0 100 80"><defs><linearGradient id="c1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a5f7e"/><stop offset="1" stop-color="#0d1a30"/></linearGradient></defs><ellipse cx="50" cy="70" rx="42" ry="3" fill="#000" opacity=".2"/><path d="M8 46 L14 32 Q18 26 26 24 L40 20 L74 20 L86 30 L94 46 L94 58 L8 58 Z" fill="url(#c1)"/><circle cx="28" cy="58" r="11" fill="#0a0a0a"/><circle cx="28" cy="58" r="6" fill="#c0c0c0"/><circle cx="72" cy="58" r="11" fill="#0a0a0a"/><circle cx="72" cy="58" r="6" fill="#c0c0c0"/></svg>`,
    'إلكترونيات': `<svg viewBox="0 0 80 100"><defs><linearGradient id="p1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7a7a7a"/><stop offset="1" stop-color="#1a1a1a"/></linearGradient><linearGradient id="p2" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a4a75"/><stop offset="1" stop-color="#05101e"/></linearGradient></defs><rect x="22" y="10" width="36" height="80" rx="6" fill="url(#p1)"/><rect x="24" y="12" width="32" height="76" rx="5" fill="#0a0a0a"/><rect x="25.5" y="13.5" width="29" height="73" rx="4" fill="url(#p2)"/><rect x="35" y="16" width="10" height="3" rx="1.5" fill="#0a0a0a"/></svg>`,
    'أجهزة وتقنية': `<svg viewBox="0 0 100 80"><defs><linearGradient id="l1" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1a3a5f"/><stop offset="1" stop-color="#05101e"/></linearGradient></defs><rect x="14" y="16" width="72" height="46" rx="3" fill="#c0c0c0"/><rect x="16" y="18" width="68" height="42" rx="2" fill="url(#l1)"/><path d="M6 62 L94 62 L96 72 L4 72 Z" fill="#8a8a8a"/></svg>`,
    'عقارات': `<svg viewBox="0 0 100 80"><defs><linearGradient id="r1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffd8a8"/><stop offset="1" stop-color="#c98868"/></linearGradient></defs><rect x="0" y="0" width="100" height="62" fill="url(#r1)"/><rect x="16" y="20" width="18" height="42" fill="#3a5a7a"/><rect x="38" y="14" width="22" height="48" fill="#2a4a6a"/><rect x="64" y="26" width="20" height="36" fill="#3a5a7a"/><g fill="#f8e0a0" opacity=".85"><rect x="20" y="26" width="3" height="3"/><rect x="26" y="26" width="3" height="3"/><rect x="42" y="20" width="4" height="3"/><rect x="50" y="20" width="4" height="3"/></g><rect x="0" y="60" width="100" height="20" fill="#2a1e14"/></svg>`,
    'مقتنيات': `<svg viewBox="0 0 80 90"><defs><linearGradient id="v1" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7a3a1a"/><stop offset=".5" stop-color="#e88a5a"/><stop offset="1" stop-color="#6a2a10"/></linearGradient></defs><ellipse cx="40" cy="82" rx="20" ry="3" fill="#000" opacity=".2"/><ellipse cx="40" cy="78" rx="18" ry="4" fill="#c9a961"/><path d="M24 78 Q20 62 26 48 Q30 38 34 34 L46 34 Q50 38 54 48 Q60 62 56 78 Z" fill="url(#v1)"/><ellipse cx="40" cy="34" rx="12" ry="4" fill="#c9a961"/></svg>`,
    'ساعات ومجوهرات': `<svg viewBox="0 0 80 90"><defs><linearGradient id="ws" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f5d67a"/><stop offset=".5" stop-color="#c9a961"/><stop offset="1" stop-color="#6a5020"/></linearGradient><radialGradient id="wf" cx=".5" cy=".4" r=".6"><stop offset="0" stop-color="#1a4060"/><stop offset="1" stop-color="#0a1a30"/></radialGradient></defs><ellipse cx="40" cy="84" rx="18" ry="2" fill="#000" opacity=".2"/><rect x="34" y="2" width="12" height="14" fill="#a8a8a8" rx="1.5"/><rect x="34" y="74" width="12" height="12" fill="#a8a8a8" rx="1.5"/><circle cx="40" cy="45" r="26" fill="#d8d8d8"/><circle cx="40" cy="45" r="23" fill="url(#ws)"/><circle cx="40" cy="45" r="20" fill="url(#wf)"/><rect x="39" y="29" width="2" height="16" fill="#fff"/><rect x="40" y="45" width="13" height="2" fill="url(#ws)"/></svg>`,
    'أثاث': `<svg viewBox="0 0 100 80"><defs><linearGradient id="f1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#5a4a3a"/><stop offset="1" stop-color="#2a1e14"/></linearGradient><linearGradient id="f2" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8a6a4a"/><stop offset=".5" stop-color="#c99a6a"/><stop offset="1" stop-color="#8a6a4a"/></linearGradient></defs><rect x="8" y="44" width="84" height="20" rx="5" fill="url(#f1)"/><rect x="12" y="30" width="76" height="20" rx="7" fill="url(#f2)"/><rect x="12" y="64" width="6" height="10" rx="2" fill="#2a1e14"/><rect x="82" y="64" width="6" height="10" rx="2" fill="#2a1e14"/></svg>`,
    'منتجات متنوعة': `<svg viewBox="0 0 80 90"><defs><linearGradient id="g1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a83a3a"/><stop offset="1" stop-color="#6a1a1a"/></linearGradient><linearGradient id="g2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f5d67a"/><stop offset="1" stop-color="#c9a961"/></linearGradient></defs><rect x="14" y="36" width="52" height="42" rx="3" fill="url(#g1)"/><rect x="35" y="36" width="10" height="42" fill="url(#g2)"/><rect x="12" y="32" width="56" height="8" rx="2" fill="#8a2020"/><circle cx="40" cy="32" r="3" fill="url(#g2)"/></svg>`
  };
  const EMOJI = {
    live:'🔴',featured:'⭐',ending:'⏰',topBids:'🔥',latest:'🆕',
    hammer:'🔨',timer:'⏱',heart:'❤️',heartEmpty:'🤍',share:'🔗',
    report:'🚩',seller:'🏪',history:'📜',rules:'📋',bell:'🔔',
    chart:'📊',trophy:'🏆',package:'📦',logout:'🚪',
    admin:'👑',edit:'✏️',trash:'🗑️',check:'✅',close:'✖️',plus:'➕'
  };
  const ico = n => {
    const url = CFG.icons && CFG.icons[n];
    return url ? `<img src="${url}" alt="" style="width:1em;height:1em;object-fit:contain;vertical-align:-.15em">` : (EMOJI[n]||'');
  };

  // ============ أدوات ============
  const fmt = n => Number(n||0).toLocaleString('en-US');
  const highestBid = a => (a.bids && a.bids.length) ? Math.max(...a.bids.map(b=>Number(b.amount))) : Number(a.current_price);
  function leftTime(ms){
    if(ms<=0) return 'انتهى';
    const s=Math.floor(ms/1000);
    const d=Math.floor(s/86400),h=Math.floor((s%86400)/3600),m=Math.floor((s%3600)/60),sec=s%60;
    if(d>0) return `${d}ي ${h}س`;
    if(h>0) return `${h}س ${m}د`;
    if(m>0) return `${m}د ${sec}ث`;
    return `${sec}ث`;
  }
  function ago(ts){
    const d=Math.floor((Date.now()-new Date(ts).getTime())/1000);
    if(d<60) return 'الآن';
    if(d<3600) return 'قبل '+Math.floor(d/60)+' د';
    if(d<86400) return 'قبل '+Math.floor(d/3600)+' س';
    return 'قبل '+Math.floor(d/86400)+' يوم';
  }
  function toast(m){
    const t=document.getElementById('toast');
    if(!t) return;
    t.textContent=m;t.classList.add('show');
    clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400);
  }
  const openOv = id => document.getElementById(id)?.classList.add('on');
  const closeOv = id => document.getElementById(id)?.classList.remove('on');
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ============ تهيئة Supabase ============
  async function initSupabase(){
    if(!window.supabase || !SBC?.url || SBC.anonKey.includes("ضع_هنا")){
      console.warn("⚠️ Supabase غير مُهيأ");
      return null;
    }
    sb = window.supabase.createClient(SBC.url, SBC.anonKey);
    console.log("✅ Supabase متصل");

    const { data: { session } } = await sb.auth.getSession();
    if(session){
      await loadProfile(session.user.id, session.user);
      await loadSettings();
    }

    sb.auth.onAuthStateChange(async (evt, sess) => {
      if(evt === 'SIGNED_OUT'){
        state.user=null; state.profile=null; state.isAdmin=false;
        renderHeader(); go('home');
      } else if(evt === 'SIGNED_IN' && sess){
        await loadProfile(sess.user.id, sess.user);
        await loadSettings();
        renderHeader();
      }
    });
    return sb;
  }

  async function loadProfile(uid, authUser){
    const { data: p } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    const prof = p || {};
    state.profile = prof;
    state.user = {
      id: uid,
      name: prof.full_name || authUser?.user_metadata?.full_name || 'مستخدم',
      phone: prof.phone || authUser?.user_metadata?.phone || '',
      joinedAt: new Date(prof.created_at || authUser?.created_at || Date.now()).getTime(),
      rating: prof.rating || 5.0,
      sales: prof.sales || 0,
      purchases: prof.purchases || 0
    };
    // تحقق من صلاحية المشرف
    const { data: adminRow } = await sb.from('admins').select('role').eq('id', uid).maybeSingle();
    state.isAdmin = !!adminRow;
    state.adminRole = adminRow?.role || null;
  }

  async function loadSettings(){
    const { data } = await sb.from('settings').select('key, value');
    state.settings = {};
    (data||[]).forEach(s => state.settings[s.key] = s.value);
    // طبّق الشعار الجديد على الصفحة إن وُجد
    const logoUrl = state.settings.logo_url || CFG.logo;
    if(logoUrl){
      document.querySelectorAll('#logoImgSm, #logoImgAuth, #logoImgAdmin').forEach(el => el.src = logoUrl);
    }
  }

  async function loadAuctions(){
    const { data, error } = await sb
      .from('auctions')
      .select(`
        *,
        seller:profiles!auctions_seller_id_fkey(full_name, rating, sales),
        bids(id, amount, user_id, created_at, user:profiles!bids_user_id_fkey(full_name))
      `)
      .eq('status','approved')
      .order('created_at', { ascending: false });
    if(error){ console.error(error); return; }
    state.auctions = (data||[]).map(a => ({
      ...a,
      bids: a.bids || [],
      sellerName: a.seller?.full_name || 'بائع',
      sellerRating: Number(a.seller?.rating)||5,
      sellerSales: a.seller?.sales || 0
    }));
  }

  // ============ Realtime ============
  function subscribeRealtime(){
    if(state.channel) sb.removeChannel(state.channel);
    state.channel = sb.channel('sumha-realtime')
      .on('postgres_changes', { event:'*', schema:'public', table:'auctions' }, async () => {
        await loadAuctions();
        if(['home','live','product'].includes(state.page)) render();
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'bids' }, async () => {
        await loadAuctions();
        if(state.page==='product') render();
      })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'notifications' }, () => updateNotifDot())
      .on('postgres_changes', { event:'*', schema:'public', table:'settings' }, async () => {
        await loadSettings();
        renderHeader(); render();
      })
      .subscribe();
  }

  // ============ المصادقة ============
  function openAuth(pending){
    state.pendingAction = pending || null;
    document.querySelectorAll('.tabs button').forEach((b,i)=>b.classList.toggle('on', i===0));
    const fl = document.getElementById('formLogin');
    const fs = document.getElementById('formSignup');
    if(fl) fl.hidden = false;
    if(fs) fs.hidden = true;
    document.getElementById('lgErr') && (document.getElementById('lgErr').textContent = '');
    document.getElementById('suErr') && (document.getElementById('suErr').textContent = '');
    openOv('ovAuth');
  }

  document.querySelectorAll('.tabs button').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.tabs button').forEach(b => b.classList.remove('on'));
      btn.classList.add('on');
      const t = btn.dataset.tab;
      document.getElementById('formLogin').hidden = t !== 'login';
      document.getElementById('formSignup').hidden = t !== 'signup';
      document.getElementById('lgErr') && (document.getElementById('lgErr').textContent = '');
      document.getElementById('suErr') && (document.getElementById('suErr').textContent = '');
    });
  });

  document.getElementById('formSignup')?.addEventListener('submit', async e => {
    e.preventDefault();
    if(!sb){ toast('الاتصال بالسيرفر غير جاهز'); return; }
    const name = document.getElementById('suName').value.trim();
    const phone = document.getElementById('suPhone').value.trim();
    const pass = document.getElementById('suPass').value;
    const err = document.getElementById('suErr');
    err.textContent = '';
    if(name.length < 3){ err.textContent='أدخل اسمك الكامل'; return; }
    if(!/^05\d{8}$/.test(phone)){ err.textContent='رقم الجوال يبدأ بـ 05 (10 أرقام)'; return; }
    if(pass.length < 6){ err.textContent='كلمة المرور 6 أحرف على الأقل'; return; }
    err.textContent = 'جاري إنشاء الحساب...';
    const email = phone + '@sumha.app';
    const { data, error } = await sb.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name, phone } }
    });
    if(error){
      err.textContent = error.message.includes('already') ? 'رقم الجوال مسجل مسبقًا' : error.message;
      return;
    }
    await new Promise(r => setTimeout(r, 900));
    await loadProfile(data.user.id, data.user);
    await enterApp();
    toast('تم إنشاء حسابك 🎉');
  });

  document.getElementById('formLogin')?.addEventListener('submit', async e => {
    e.preventDefault();
    if(!sb){ toast('الاتصال بالسيرفر غير جاهز'); return; }
    const phone = document.getElementById('lgPhone').value.trim();
    const pass = document.getElementById('lgPass').value;
    const err = document.getElementById('lgErr');
    err.textContent = 'جاري الدخول...';
    const email = phone + '@sumha.app';
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error){
      err.textContent = error.message.includes('Invalid') ? 'رقم الجوال أو كلمة المرور غير صحيحة' : error.message;
      return;
    }
    await loadProfile(data.user.id, data.user);
    await enterApp();
    toast('أهلًا بك ' + state.user.name.split(' ')[0] + ' 👋');
  });

  async function enterApp(){
    closeOv('ovAuth');
    document.getElementById('formLogin')?.reset();
    document.getElementById('formSignup')?.reset();
    await loadAuctions();
    subscribeRealtime();
    renderHeader(); render(); updateNotifDot();
    const pending = state.pendingAction; state.pendingAction = null;
    if(pending) setTimeout(() => pending(), 300);
  }

  async function logout(){
    if(sb) await sb.auth.signOut();
    if(state.channel){ sb.removeChannel(state.channel); state.channel = null; }
    state.user = null; state.profile = null; state.isAdmin = false;
    renderHeader(); go('home');
    toast('تم تسجيل الخروج');
  }

  // ============ التنبيهات ============
  async function addNotif(userId, icon, title, body){
    if(!sb || !userId) return;
    await sb.from('notifications').insert({ user_id: userId, icon, title, body });
  }
  async function getMyNotifs(){
    if(!state.user) return [];
    const { data } = await sb.from('notifications').select('*')
      .eq('user_id', state.user.id).order('created_at', { ascending: false }).limit(50);
    return data || [];
  }
  async function updateNotifDot(){
    if(!state.user) return;
    const { count } = await sb.from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', state.user.id).eq('read', false);
    const dot = document.getElementById('notifDot');
    if(dot) dot.hidden = !count;
  }
  async function markNotifsRead(){
    if(!state.user) return;
    await sb.from('notifications').update({ read: true })
      .eq('user_id', state.user.id).eq('read', false);
    updateNotifDot();
  }

  // ============ المفضلة ============
  async function isFav(aid){
    if(!state.user) return false;
    const { data } = await sb.from('favorites').select('id')
      .eq('user_id', state.user.id).eq('auction_id', aid).maybeSingle();
    return !!data;
  }
  async function toggleFav(aid, ev){
    if(ev) ev.stopPropagation();
    if(!state.user){ openAuth(() => toggleFav(aid)); return; }
    const fav = await isFav(aid);
    if(fav){
      await sb.from('favorites').delete().eq('user_id', state.user.id).eq('auction_id', aid);
      toast('أُزيل من المفضلة');
    } else {
      await sb.from('favorites').insert({ user_id: state.user.id, auction_id: aid });
      toast('أُضيف للمفضلة ❤️');
    }
    render();
  }
  async function myFavs(){
    if(!state.user) return [];
    const { data } = await sb.from('favorites').select('auction_id').eq('user_id', state.user.id);
    const ids = (data||[]).map(f => f.auction_id);
    return state.auctions.filter(a => ids.includes(a.id));
  }

  // ============ الهيدر ============
  function renderHeader(){
    const el = document.getElementById('hdrActions');
    if(!el) return;
    const adminBtn = state.isAdmin
      ? `<button class="ibtn" onclick="location.href='admin.html'" title="لوحة المشرف" style="background:linear-gradient(135deg,#8d0b0b,#6d0808);color:#fff;border-color:transparent">${ico('admin')}</button>`
      : '';
    if(state.user){
      el.innerHTML = `
        <button class="btn-sell" onclick="SUMHA.openSell()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>اعرض منتجك</span></button>
        ${adminBtn}
        <button class="ibtn" onclick="SUMHA.go('notifs')"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/></svg><span class="dot" id="notifDot" hidden></span></button>
        <div class="user-chip" onclick="SUMHA.go('account')"><div class="uav">${state.user.name[0]}</div><div><b>${esc(state.user.name.split(' ')[0])}</b><span>حسابي</span></div></div>`;
    } else {
      el.innerHTML = `
        <button class="btn-sell" onclick="SUMHA.openSell()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg><span>اعرض منتجك</span></button>
        <button class="btn-login" onclick="SUMHA.openAuth()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/><path d="m10 17 5-5-5-5"/><path d="M15 12H3"/></svg>دخول / تسجيل</button>`;
    }
  }

  // ============ التنقل ============
  function go(page, data){
    if(page === 'account' && !state.user){ openAuth(()=>go('account')); return; }
    if(['my-bids','my-wins','my-products','favorites','notifs'].includes(page) && !state.user){
      openAuth(()=>go(page)); return;
    }
    state.page = page; state.pageData = data||{};
    document.querySelectorAll('.ni').forEach(n=>n.classList.toggle('on', n.dataset.nav===page));
    window.scrollTo({top:0, behavior:'smooth'});
    render();
  }

  async function render(){
    const main = document.getElementById('main');
    if(!main) return;
    const live = state.auctions.filter(a => new Date(a.end_time).getTime() > Date.now());
    switch(state.page){
      case 'home': main.innerHTML = renderHome(live); break;
      case 'live': main.innerHTML = renderList(ico('live')+' مزادات مباشرة', live); break;
      case 'cats': main.innerHTML = renderCatsPage(live); break;
      case 'category': main.innerHTML = renderList(state.pageData.cat, live.filter(a=>a.category===state.pageData.cat)); break;
      case 'search': main.innerHTML = renderList(`نتائج البحث: "${esc(state.pageData.q)}"`, state.pageData.results||[]); break;
      case 'product': main.innerHTML = await renderProduct(state.pageData.id); break;
      case 'account': main.innerHTML = await renderAccount(); break;
      case 'my-bids': main.innerHTML = pageWrap(ico('chart')+' المزادات التي شاركت فيها', await myBidsAuctions(), 'لم تشارك في أي مزاد بعد', 'ابدأ بالمزايدة'); break;
      case 'my-wins': main.innerHTML = pageWrap(ico('trophy')+' المزادات التي فزت بها', await myWins(), 'لم تفز بأي مزاد بعد', 'استمر بالمزايدة'); break;
      case 'my-products': main.innerHTML = pageWrap(ico('package')+' منتجاتي المعروضة', await myAuctions(), 'لم تعرض أي منتج بعد', 'اضغط اعرض منتجك'); break;
      case 'favorites': main.innerHTML = pageWrap(ico('heart')+' المحفوظات', await myFavs(), 'لا توجد منتجات محفوظة', 'اضغط ❤️ على أي منتج'); break;
      case 'notifs': main.innerHTML = await renderNotifs(); markNotifsRead(); break;
    }
    updateNotifDot(); initCountdowns();
  }

  async function myAuctions(){
    if(!state.user) return [];
    return state.auctions.filter(a => a.seller_id === state.user.id);
  }
  async function myBidsAuctions(){
    if(!state.user) return [];
    const { data } = await sb.from('bids').select('auction_id').eq('user_id', state.user.id);
    const ids = [...new Set((data||[]).map(b=>b.auction_id))];
    return state.auctions.filter(a => ids.includes(a.id));
  }
  async function myWins(){
    if(!state.user) return [];
    return state.auctions.filter(a => {
      if(new Date(a.end_time).getTime() > Date.now()) return false;
      if(!a.bids?.length) return false;
      const top = a.bids.reduce((m,b)=>Number(b.amount)>Number(m.amount)?b:m, a.bids[0]);
      return top.user_id === state.user.id;
    });
  }

  // ============ الصفحة الرئيسية ============
  function guestBanner(){
    if(state.user) return '';
    return `<div class="guest-banner"><div class="gi">🎯</div><div class="gt"><b>أنت تتصفح كزائر</b><span>سجّل الآن لتتمكن من المزايدة وعرض منتجاتك</span></div><button onclick="SUMHA.openAuth()">تسجيل سريع</button></div>`;
  }

  function renderHome(all){
    // 🔴 المزاد المباشر — أول قسم بدل العرض
    const liveNow = all.filter(a => new Date(a.end_time).getTime() - Date.now() < 6*3600000).slice(0, 8);
    const featured = all.filter(a => a.featured).slice(0, 8);
    const ending = [...all].sort((a,b)=>new Date(a.end_time)-new Date(b.end_time)).slice(0,4);
    const topBids = [...all].sort((a,b)=>(b.bids?.length||0)-(a.bids?.length||0)).slice(0,4);
    const latest = [...all].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4);

    return `
      ${guestBanner()}
      <div class="hero">
        <h1>${esc(state.settings.hero_title || (CFG.siteName+'… '+CFG.tagline+' 🏆'))}</h1>
        <p>${esc(state.settings.hero_subtitle || 'منصة المزادات السعودية — اعرض منتجك، زايد بثقة، واربح بأعلى سوم')}</p>
        <div class="hero-cta">
          ${state.user
            ? `<button class="c1" onclick="SUMHA.openSell()">اعرض منتجك</button><button class="c2" onclick="SUMHA.go('live')">🔴 المزادات المباشرة</button>`
            : `<button class="c1" onclick="SUMHA.openAuth()">✨ أنشئ حسابك الآن</button><button class="c2" onclick="SUMHA.go('live')">🔴 تصفح المزادات</button>`}
        </div>
        <div class="stats">
          <div><b>${all.length}</b><span>مزاد نشط</span></div>
          <div><b>${new Set(all.map(a=>a.seller_id)).size}</b><span>بائع</span></div>
          <div><b>4.9★</b><span>تقييم المنصة</span></div>
        </div>
      </div>

      <!-- 🔴 المزاد المباشر أولاً -->
      <section>
        <div class="sec-h"><h2>${ico('live')} المزاد المباشر</h2><a onclick="SUMHA.go('live')">عرض الكل</a></div>
        <div class="hrow">${liveNow.length ? liveNow.map(cardHTML).join('') : '<div style="padding:20px;color:var(--muted);font-size:13px">لا توجد مزادات مباشرة الآن</div>'}</div>
      </section>

      <section><div class="sec-h"><h2>${ico('featured')} مزادات مميزة</h2></div><div class="hrow">${featured.length ? featured.map(cardHTML).join('') : '<div style="padding:20px;color:var(--muted);font-size:13px">لا توجد مزادات مميزة</div>'}</div></section>
      <section><div class="sec-h"><h2>${ico('ending')} تنتهي قريبًا</h2></div><div class="grid">${ending.map(cardHTML).join('')}</div></section>
      <section><div class="sec-h"><h2>التصنيفات</h2><a onclick="SUMHA.go('cats')">عرض الكل</a></div><div class="cats">${CFG.categories.map(c=>{
        const cIcon = c.icon ? `<img src="${c.icon}" alt="" onerror="this.outerHTML='${CAT_SVG[c.name]||''}'">` : (CAT_SVG[c.name]||'');
        return `<div class="cat" onclick="SUMHA.go('category',{cat:'${c.name}'})"><div class="ico">${cIcon}</div><span>${c.name}</span></div>`;
      }).join('')}</div></section>
      <section><div class="sec-h"><h2>${ico('topBids')} الأكثر مزايدة</h2></div><div class="grid">${topBids.map(cardHTML).join('')}</div></section>
      <section><div class="sec-h"><h2>${ico('latest')} أحدث المزادات</h2></div><div class="grid">${latest.map(cardHTML).join('')}</div></section>
    `;
  }

  function cardHTML(a){
    const highest = highestBid(a);
    const ms = new Date(a.end_time).getTime() - Date.now();
    const warn = ms < 3600000 ? 'warn' : '';
    const badge = ms < 6*3600000
      ? `<span class="badge live">مباشر</span>`
      : (a.featured ? `<span class="badge feat">${ico('featured')} مميز</span>` : '');
    const imgEl = a.image_url
      ? `<img src="${a.image_url}" alt="${esc(a.title)}" loading="lazy" onerror="this.outerHTML='${CAT_SVG[a.category]||''}'">`
      : (CAT_SVG[a.category]||'');
    return `<div class="pcard" onclick="SUMHA.go('product',{id:'${a.id}'})">
      <div class="pcard-img">${badge}<div class="fav-btn" onclick="SUMHA.toggleFav('${a.id}',event)">${ico('heartEmpty')}</div>${imgEl}</div>
      <div class="pcard-body">
        <div class="pcard-cat">${esc(a.category)}</div>
        <div class="pcard-title">${esc(a.title)}</div>
        <div class="pcard-price"><div class="pp"><small>ر.س</small> ${fmt(highest)}</div><div class="bn">${(a.bids||[]).length} مزايدة</div></div>
        <div class="pcard-foot">
          <div class="tmr ${warn}" data-end="${new Date(a.end_time).getTime()}">${ico('timer')} ${leftTime(ms)}</div>
          <button class="bid-sm" onclick="event.stopPropagation();SUMHA.go('product',{id:'${a.id}'})">سوم الآن</button>
        </div>
      </div>
    </div>`;
  }

  function renderList(title, items){
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('home')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>${title}</h1></div>${items.length?`<div class="grid">${items.map(cardHTML).join('')}</div>`:emptyState('لا توجد نتائج','')}`;
  }
  function renderCatsPage(all){
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('home')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>التصنيفات</h1></div><div class="cats">${CFG.categories.map(c=>{
      const count = all.filter(a=>a.category===c.name).length;
      const cIcon = c.icon ? `<img src="${c.icon}" alt="" onerror="this.outerHTML='${CAT_SVG[c.name]||''}'">` : (CAT_SVG[c.name]||'');
      return `<div class="cat" onclick="SUMHA.go('category',{cat:'${c.name}'})"><div class="ico">${cIcon}</div><span>${c.name}</span><div style="font-size:10px;color:var(--muted);margin-top:2px">${count} مزاد</div></div>`;
    }).join('')}</div>`;
  }
  function emptyState(t,m){ return `<div class="empty"><div class="e-ico">🔎</div><h3>${t}</h3><p>${m}</p><button onclick="SUMHA.go('home')">الرئيسية</button></div>`; }
  function pageWrap(t, items, et, em){
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('account')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>${t}</h1></div>${items.length?`<div class="grid">${items.map(cardHTML).join('')}</div>`:emptyState(et,em)}`;
  }

  async function renderProduct(id){
    const a = state.auctions.find(x => x.id === id);
    if(!a) return emptyState('المنتج غير موجود','');
    const highest = highestBid(a);
    const ms = new Date(a.end_time).getTime() - Date.now();
    const ended = ms <= 0;
    const isMine = state.user && a.seller_id === state.user.id;
    const minNext = highest + Number(a.min_increment);
    const topBid = a.bids?.length ? a.bids.reduce((m,b)=>Number(b.amount)>Number(m.amount)?b:m, a.bids[0]) : null;
    const winner = ended && topBid ? topBid : null;
    const fav = await isFav(id);
    let bidUI = '';
    if(!ended && !isMine){
      bidUI = `<div class="bid-row"><input type="number" id="bidInput" value="${minNext}" min="${minNext}"><button onclick="SUMHA.placeBid('${a.id}')">${ico('hammer')} سوم الآن</button></div><p class="hint">${state.user?`الحد الأدنى: <b>${fmt(minNext)} ر.س</b>`:`<b>سجّل دخولك</b> للمشاركة`}</p>`;
    } else if(!ended && isMine){
      bidUI = `<div class="cd done" style="background:var(--cream2);color:var(--ink2);border:1.5px solid var(--line)"><small>هذا منتجك</small><div class="t" style="font-size:15px">لا يمكنك المزايدة على منتجك</div></div>`;
    }
    const imgEl = a.image_url ? `<img src="${a.image_url}" alt="${esc(a.title)}" onerror="this.outerHTML='${CAT_SVG[a.category]||''}'">` : (CAT_SVG[a.category]||'');
    const sortedBids = [...(a.bids||[])].sort((x,y)=>Number(y.amount)-Number(x.amount));
    return `
      <div class="page-h"><button class="back-btn" onclick="SUMHA.go('home')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>تفاصيل المزاد</h1></div>
      <div class="prod-wrap">
        <div class="prod-main">
          <div class="prod-img">${!ended&&ms<6*3600000?'<span class="badge live" style="top:14px;right:14px">مباشر</span>':''}${a.featured?`<span class="badge feat" style="top:14px;right:14px">${ico('featured')} مميز</span>`:''}${imgEl}</div>
          <div class="prod-title">${esc(a.title)}</div>
          <div class="prod-meta"><span>${ico('package')} ${esc(a.category)}</span><span>📍 ${esc(a.location||'—')}</span><span>🏷️ ${esc(a.condition||'—')}</span><span>👥 <b>${(a.bids||[]).length}</b> مزايد</span></div>
          <div class="prod-desc">${esc(a.description||'')}</div>
        </div>
        <div>
          <div class="price-box">
            <div class="pp-row"><span class="lbl">السعر الابتدائي</span><span class="val">${fmt(a.start_price)} ر.س</span></div>
            <div class="pp-row"><span class="lbl">${ended?'السعر النهائي':'أعلى مزايدة حالية'}</span><span class="val big" id="livePrice">${fmt(highest)} ر.س</span></div>
            <div class="pp-row"><span class="lbl">أقل زيادة</span><span class="val gld">${fmt(a.min_increment)} ر.س</span></div>
            <div class="pp-row"><span class="lbl">عدد المزايدات</span><span class="val" id="liveBidCount">${(a.bids||[]).length}</span></div>
          </div>
          <div class="cd ${ended?'done':''}" id="prodCd" data-end="${new Date(a.end_time).getTime()}"><small>${ended?'🏆 انتهى المزاد':(winner?'الفائز':'⏱ الوقت المتبقي')}</small><div class="t">${ended?(winner?esc(winner.user?.full_name||'فائز'):'لا يوجد فائز'):leftTime(ms)}</div></div>
          ${bidUI}
          <div class="pactions">
            <button class="${fav?'on':''}" onclick="SUMHA.toggleFav('${a.id}',event)">${fav?ico('heart')+' في المفضلة':ico('heartEmpty')+' المفضلة'}</button>
            <button onclick="SUMHA.shareProduct('${a.id}')">${ico('share')} مشاركة</button>
            <button onclick="SUMHA.reportProduct('${a.id}')">${ico('report')} إبلاغ</button>
          </div>
          <div class="box"><h3>${ico('seller')} البائع</h3><div class="seller-row"><div class="av">${esc(a.sellerName[0]||'؟')}</div><div class="info"><b>${esc(a.sellerName)} <span style="color:var(--gold)">✓</span></b><span>بائع موثّق · ${a.sellerSales} عملية</span></div><div style="text-align:center"><div class="stars">${'★'.repeat(Math.round(a.sellerRating))}</div><span style="font-size:11px;color:var(--ink2)">${a.sellerRating.toFixed(1)}</span></div></div></div>
          <div class="box"><h3>${ico('history')} سجل المزايدات</h3><div class="bids-list" id="bidsList">${sortedBids.length?sortedBids.map((b,i)=>`<div class="bid-item ${i===0?'top':''}"><div class="u"><div class="av2">${esc((b.user?.full_name||'?')[0])}</div><div><b>${esc(b.user?.full_name||'مزايد')}</b><span>${ago(b.created_at)}</span></div></div><div class="amt">${fmt(b.amount)} ر.س</div></div>`).join(''):'<p style="text-align:center;color:var(--muted);padding:14px;font-size:13px">لا توجد مزايدات — كن الأول!</p>'}</div></div>
          <div class="box"><h3>${ico('rules')} شروط المزاد</h3><ul class="rules"><li>المزايدة ملزمة ولا يمكن التراجع عنها</li><li>يجب أن تكون أعلى من السعر الحالي بمقدار الزيادة الدنيا</li><li>يتم تحديد الفائز عند انتهاء الوقت</li><li>لا يمكنك المزايدة على منتجك</li></ul></div>
        </div>
      </div>`;
  }

  // ============ المزايدة ============
  async function placeBid(aid){
    if(!state.user){ openAuth(()=>placeBid(aid)); return; }
    const a = state.auctions.find(x=>x.id===aid);
    if(!a) return;
    if(new Date(a.end_time).getTime() <= Date.now()){ toast('انتهى هذا المزاد'); return; }
    if(a.seller_id === state.user.id){ toast('لا يمكنك المزايدة على منتجك'); return; }
    const input = document.getElementById('bidInput');
    const amount = Number(input.value);
    const current = highestBid(a);
    const minNext = current + Number(a.min_increment);
    if(!amount || amount < minNext){ toast(`يجب أن تكون المزايدة ${fmt(minNext)} ر.س على الأقل`); return; }
    const { error } = await sb.from('bids').insert({ auction_id:aid, user_id:state.user.id, amount });
    if(error){ toast(error.message); return; }
    const prevTop = a.bids?.length ? a.bids.reduce((m,b)=>Number(b.amount)>Number(m.amount)?b:m, a.bids[0]) : null;
    if(prevTop && prevTop.user_id !== state.user.id){
      addNotif(prevTop.user_id,'⚠️','تم تجاوز مزايدتك',`على "${a.title}" — السعر الآن ${fmt(amount)} ر.س`);
    }
    if(a.seller_id !== state.user.id){
      addNotif(a.seller_id,'⚡','مزايدة جديدة على منتجك',`"${a.title}" — ${fmt(amount)} ر.س من ${state.user.name}`);
    }
    addNotif(state.user.id,'✅','تم تسجيل مزايدتك',`"${a.title}" بمبلغ ${fmt(amount)} ر.س`);
    toast('تم تسجيل مزايدتك ✅');
    await loadAuctions(); render();
  }

  async function shareProduct(aid){
    const a = state.auctions.find(x=>x.id===aid);
    if(!a) return;
    const text = `شاهد مزاد "${a.title}" على ${CFG.siteName} — ${CFG.tagline}!`;
    if(navigator.share) navigator.share({title:CFG.siteName, text}).catch(()=>{});
    else { navigator.clipboard?.writeText(text); toast('تم نسخ الرابط'); }
  }
  async function reportProduct(){
    if(!state.user){ openAuth(); return; }
    addNotif(state.user.id,'✅','تم استلام بلاغك','سيراجع فريقنا خلال 24 ساعة');
    toast('تم استلام البلاغ ✅');
  }

  // ============ الحساب ============
  async function renderAccount(){
    const u = state.user; if(!u) return '';
    const myBids = await myBidsAuctions();
    const myWinsList = await myWins();
    const myProducts = await myAuctions();
    const favs = await myFavs();
    return `
      <div class="acc-hdr"><div class="av">${esc(u.name[0])}</div><div><h2>${esc(u.name)}</h2><p>${esc(u.phone)} · عضو منذ ${new Date(u.joinedAt).toLocaleDateString('ar-SA')}</p></div></div>
      <div class="acc-stats"><div class="acc-stat"><b>${myBids.length}</b><span>مزايدة</span></div><div class="acc-stat"><b>${myWinsList.length}</b><span>فوز</span></div><div class="acc-stat"><b>${(u.rating||5).toFixed(1)}★</b><span>تقييمي</span></div></div>
      <div class="menu">
        <div class="mi" onclick="SUMHA.go('my-bids')"><div class="ico">${ico('chart')}</div><div class="txt"><b>المزادات التي شاركت فيها</b><span>${myBids.length} مزاد</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('my-wins')"><div class="ico">${ico('trophy')}</div><div class="txt"><b>المزادات التي فزت بها</b><span>${myWinsList.length} عملية</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('my-products')"><div class="ico">${ico('package')}</div><div class="txt"><b>منتجاتي المعروضة</b><span>${myProducts.length} منتج</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('favorites')"><div class="ico">${ico('heart')}</div><div class="txt"><b>المحفوظات</b><span>${favs.length} منتج</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('notifs')"><div class="ico">${ico('bell')}</div><div class="txt"><b>التنبيهات</b></div><div class="arr">‹</div></div>
        ${state.isAdmin?`<div class="mi" onclick="location.href='admin.html'" style="background:#fff5e8"><div class="ico" style="background:#8d0b0b;color:#fff">${ico('admin')}</div><div class="txt"><b>لوحة المشرف</b><span>إدارة الموقع</span></div><div class="arr">‹</div></div>`:''}
        <div class="mi danger" onclick="SUMHA.logout()"><div class="ico">${ico('logout')}</div><div class="txt"><b>تسجيل الخروج</b><span>الخروج من الحساب</span></div><div class="arr">‹</div></div>
      </div>`;
  }

  async function renderNotifs(){
    const items = await getMyNotifs();
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('account')"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>${ico('bell')} التنبيهات</h1></div>${items.length?`<div class="box" style="padding:6px 14px">${items.map(n=>`<div class="bid-item"><div class="u"><div class="av2">${n.icon||'🔔'}</div><div><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div></div><div style="font-size:11px;color:var(--muted);flex-shrink:0">${ago(n.created_at)}</div></div>`).join('')}</div>`:emptyState('لا توجد تنبيهات','ستظهر هنا إشعاراتك')}`;
  }

  // ============ عرض منتج ============
  function openSell(){
    if(!state.user){ openAuth(()=>openSell()); return; }
    document.getElementById('pCat').innerHTML = '<option value="">اختر تصنيف</option>' + CFG.categories.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
    const now = new Date(), to = new Date(now.getTime()+24*3600000);
    const fmtDT = d => { const p=n=>String(n).padStart(2,'0'); return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`; };
    document.getElementById('pFrom').value = fmtDT(now);
    document.getElementById('pTo').value = fmtDT(to);
    openOv('ovSell');
  }

  async function uploadImage(file){
    if(!file || !state.user) return null;
    const ext = file.name.split('.').pop();
    const path = `${state.user.id}/${Date.now()}.${ext}`;
    const prog = document.getElementById('uploadProgress');
    if(prog){ prog.style.display='block'; prog.textContent='جاري رفع الصورة...'; }
    const { error } = await sb.storage.from('auction-images').upload(path, file);
    if(prog) prog.style.display='none';
    if(error){ toast('فشل رفع الصورة: '+error.message); return null; }
    const { data: urlData } = sb.storage.from('auction-images').getPublicUrl(path);
    return urlData.publicUrl;
  }

  document.getElementById('formSell')?.addEventListener('submit', async e => {
    e.preventDefault();
    if(!state.user){ openAuth(()=>openSell()); return; }
    const fileInput = document.getElementById('pImageFile');
    const file = fileInput?.files?.[0];
    const title = document.getElementById('pTitle').value.trim();
    const desc = document.getElementById('pDesc').value.trim();
    const cat = document.getElementById('pCat').value;
    const startPrice = Number(document.getElementById('pStart').value);
    const minInc = Number(document.getElementById('pInc').value);
    const from = new Date(document.getElementById('pFrom').value).toISOString();
    const to = new Date(document.getElementById('pTo').value).toISOString();
    const location = document.getElementById('pLoc').value.trim();
    const condition = document.getElementById('pCond').value;
    if(new Date(to) <= new Date(from)){ toast('تاريخ النهاية بعد البداية'); return; }
    if(new Date(to) <= new Date()){ toast('تاريخ النهاية في المستقبل'); return; }
    if(minInc<=0 || startPrice<=0){ toast('السعر والزيادة أكبر من صفر'); return; }
    let imageUrl = '';
    if(file) imageUrl = await uploadImage(file);
    const { error } = await sb.from('auctions').insert({
      seller_id: state.user.id,
      title, description: desc, category: cat,
      image_url: imageUrl,
      start_price: startPrice, current_price: startPrice,
      min_increment: minInc,
      start_time: from, end_time: to,
      location, condition, status:'approved'
    });
    if(error){ toast(error.message); return; }
    addNotif(state.user.id,'✅','تم نشر منتجك',`"${title}" متاح للمزايدة الآن`);
    closeOv('ovSell'); e.target.reset();
    toast('تم نشر منتجك 🎉');
    await loadAuctions(); go('my-products');
  });

  // ============ البحث ============
  document.getElementById('searchInput')?.addEventListener('input', e => {
    const q = e.target.value.trim();
    if(!q){ if(state.page==='search') go('home'); return; }
    const results = state.auctions.filter(a =>
      (a.title||'').includes(q) || (a.category||'').includes(q) || (a.description||'').includes(q)
    );
    state.page='search'; state.pageData={results,q};
    document.querySelectorAll('.ni').forEach(n=>n.classList.remove('on'));
    document.getElementById('main').innerHTML = renderList(`نتائج البحث: "${esc(q)}"`, results);
    initCountdowns();
  });

  // ============ العد التنازلي ============
  function initCountdowns(){
    document.querySelectorAll('.tmr[data-end]').forEach(el => {
      const ms = Number(el.dataset.end) - Date.now();
      el.innerHTML = ico('timer') + ' ' + leftTime(ms);
      el.classList.toggle('warn', ms < 3600000);
    });
    const pc = document.getElementById('prodCd');
    if(pc && pc.dataset.end){
      const ms = Number(pc.dataset.end) - Date.now();
      const t = pc.querySelector('.t');
      if(t && ms > 0) t.textContent = leftTime(ms);
    }
  }
  setInterval(initCountdowns, 1000);

  // ============ Boot ============
  async function boot(){
    // طبّق الشعار من CFG فوراً (قبل تحميل Supabase)
    const logoUrl = CFG.logo;
    if(logoUrl){
      document.querySelectorAll('#logoImgSm, #logoImgAuth, #logoImgAdmin').forEach(el => el.src = logoUrl);
    }
    await initSupabase();
    if(sb){
      await loadSettings();
      await loadAuctions();
      if(state.user) subscribeRealtime();
    }
    renderHeader(); render();
    document.addEventListener('keydown', e => {
      if(e.key === 'Escape') document.querySelectorAll('.ov.on').forEach(o => o.classList.remove('on'));
    });
  }

  // ============ واجهة عامة ============
  window.SUMHA = {
    boot, go, openAuth, closeOv, openSell, logout,
    toggleFav, placeBid, shareProduct, reportProduct,
    get user(){ return state.user; },
    get isAdmin(){ return state.isAdmin; },
    get adminRole(){ return state.adminRole; },
    get auctions(){ return state.auctions; },
    get settings(){ return state.settings; },
    get sb(){ return sb; },
    get config(){ return CFG; },
    reloadAuctions: loadAuctions,
    reloadSettings: loadSettings,
    toast
  };
})();
