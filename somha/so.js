// ============================================================
// سومها — منطق التطبيق الكامل مع أيقونات SVG
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

  // ============ أيقونات ============
  const ico = (n, opts) => {
    const url = CFG.icons && CFG.icons[n];
    if(url) return `<img src="${url}" alt="" style="width:1.15em;height:1.15em;object-fit:contain;vertical-align:-.2em">`;
    return window.SUMHA_ICON ? window.SUMHA_ICON(n, opts) : '';
  };
  const catIcon = (name, opts) => {
    const cat = CFG.categories?.find(c => c.name === name);
    const key = cat?.icon || 'misc';
    return window.SUMHA_ICON ? window.SUMHA_ICON(key, opts) : '';
  };

  // ============ Helpers ============
  const fmt = n => Number(n||0).toLocaleString('en-US');
  const highestBid = a => (a.bids&&a.bids.length)?Math.max(...a.bids.map(b=>Number(b.amount))):Number(a.current_price);
  const isValidEmail = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
  const isValidPhone = p => /^05\d{8}$/.test(p);
  const phoneToEmail = p => p + '@sumha.app';
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
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
    const t=document.getElementById('toast'); if(!t) return;
    t.textContent=m;t.classList.add('show');
    clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2400);
  }
  const openOv = id => document.getElementById(id)?.classList.add('on');
  const closeOv = id => document.getElementById(id)?.classList.remove('on');

  // ============ Supabase ============
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
        await loadSettings(); renderHeader();
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
      email: prof.email || authUser?.email || '',
      joinedAt: new Date(prof.created_at || authUser?.created_at || Date.now()).getTime(),
      rating: prof.rating || 5.0,
      sales: prof.sales || 0,
      purchases: prof.purchases || 0,
      emailVerified: !!authUser?.email_confirmed_at
    };
    const { data: adminRow } = await sb.from('admins').select('role').eq('id', uid).maybeSingle();
    state.isAdmin = !!adminRow;
    state.adminRole = adminRow?.role || null;
  }

  async function loadSettings(){
    const { data } = await sb.from('settings').select('key, value');
    state.settings = {};
    (data||[]).forEach(s => state.settings[s.key] = s.value);
    const logoUrl = state.settings.logo_url || CFG.logo;
    if(logoUrl){
      document.querySelectorAll('#logoImgSm, #logoImgAuth').forEach(el => el.src = logoUrl);
    }
  }

  async function loadAuctions(){
    const { data, error } = await sb
      .from('auctions')
      .select(`*, seller:profiles!auctions_seller_id_fkey(full_name, rating, sales),
        bids(id, amount, user_id, created_at, user:profiles!bids_user_id_fkey(full_name))`)
      .eq('status','approved')
      .order('created_at', { ascending: false });
    if(error){ console.error(error); return; }
    state.auctions = (data||[]).map(a => ({
      ...a, bids: a.bids || [],
      sellerName: a.seller?.full_name || 'بائع',
      sellerRating: Number(a.seller?.rating)||5,
      sellerSales: a.seller?.sales || 0
    }));
  }

  function subscribeRealtime(){
    if(state.channel) sb.removeChannel(state.channel);
    state.channel = sb.channel('sumha-rt')
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
        await loadSettings(); renderHeader(); render();
      })
      .subscribe();
  }

  // ============ Auth ============
  async function resolveLoginEmail(id){
    id = id.trim();
    if(isValidEmail(id)) return id.toLowerCase();
    if(isValidPhone(id)) return phoneToEmail(id);
    return null;
  }

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
    const email = document.getElementById('suEmail').value.trim().toLowerCase();
    const phone = document.getElementById('suPhone').value.trim();
    const pass = document.getElementById('suPass').value;
    const err = document.getElementById('suErr');
    err.textContent = '';
    if(name.length < 3){ err.textContent='أدخل اسمك الكامل'; return; }
    if(!isValidEmail(email)){ err.textContent='البريد الإلكتروني غير صحيح'; return; }
    if(!isValidPhone(phone)){ err.textContent='رقم الجوال يبدأ بـ 05 (10 أرقام)'; return; }
    if(pass.length < 6){ err.textContent='كلمة المرور 6 أحرف على الأقل'; return; }

    const { data: existing } = await sb.from('profiles')
      .select('email, phone').or(`email.eq.${email},phone.eq.${phone}`).maybeSingle();
    if(existing){
      if(existing.email === email) err.textContent='هذا البريد مسجل مسبقاً';
      else err.textContent='هذا الجوال مسجل مسبقاً';
      return;
    }

    err.textContent = 'جاري إنشاء الحساب...';
    const { data, error } = await sb.auth.signUp({
      email, password: pass,
      options: { data: { full_name: name, phone, email } }
    });
    if(error){
      if(error.message.includes('already registered')) err.textContent='هذا البريد مسجل مسبقاً';
      else if(error.message.toLowerCase().includes('password')) err.textContent='كلمة المرور ضعيفة';
      else err.textContent = error.message;
      return;
    }
    if(!data.user){ err.textContent='تعذر إنشاء الحساب'; return; }
    await new Promise(r => setTimeout(r, 1200));
    await loadProfile(data.user.id, data.user);
    await enterApp();
    toast('تم إنشاء حسابك 🎉');
  });

  document.getElementById('formLogin')?.addEventListener('submit', async e => {
    e.preventDefault();
    if(!sb){ toast('الاتصال بالسيرفر غير جاهز'); return; }
    const identifier = document.getElementById('lgIdentifier').value.trim();
    const pass = document.getElementById('lgPass').value;
    const err = document.getElementById('lgErr');
    err.textContent = 'جاري الدخول...';
    const email = await resolveLoginEmail(identifier);
    if(!email){ err.textContent='أدخل بريداً أو جوالاً صحيحاً'; return; }
    const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
    if(error){
      if(error.message.includes('Invalid')) err.textContent='البيانات غير صحيحة';
      else if(error.message.includes('Email not confirmed')) err.textContent='وثّق بريدك أولاً';
      else err.textContent = error.message;
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
    const p = state.pendingAction; state.pendingAction = null;
    if(p) setTimeout(() => p(), 300);
  }

  async function logout(){
    if(sb) await sb.auth.signOut();
    if(state.channel){ sb.removeChannel(state.channel); state.channel = null; }
    state.user=null; state.profile=null; state.isAdmin=false;
    renderHeader(); go('home');
    toast('تم تسجيل الخروج');
  }

  async function resendVerification(){
    if(!state.user?.email){ toast('لا يوجد بريد'); return; }
    const { error } = await sb.auth.resend({ type:'signup', email: state.user.email });
    if(error){ toast(error.message); return; }
    toast('تم إرسال رابط التوثيق 📧');
  }

  // ============ Notifs ============
  async function addNotif(uid, icon, title, body){
    if(!sb || !uid) return;
    await sb.from('notifications').insert({ user_id: uid, icon, title, body });
  }
  async function getMyNotifs(){
    if(!state.user) return [];
    const { data } = await sb.from('notifications').select('*')
      .eq('user_id', state.user.id).order('created_at',{ascending:false}).limit(50);
    return data || [];
  }
  async function updateNotifDot(){
    if(!state.user) return;
    const { count } = await sb.from('notifications')
      .select('*',{count:'exact',head:true}).eq('user_id', state.user.id).eq('read', false);
    const dot = document.getElementById('notifDot');
    if(dot) dot.hidden = !count;
  }
  async function markNotifsRead(){
    if(!state.user) return;
    await sb.from('notifications').update({ read:true }).eq('user_id', state.user.id).eq('read', false);
    updateNotifDot();
  }

  // ============ Favorites ============
  async function isFav(aid){
    if(!state.user) return false;
    const { data } = await sb.from('favorites').select('id')
      .eq('user_id', state.user.id).eq('auction_id', aid).maybeSingle();
    return !!data;
  }
  async function toggleFav(aid, ev){
    if(ev) ev.stopPropagation();
    if(!state.user){ openAuth(()=>toggleFav(aid)); return; }
    const fav = await isFav(aid);
    if(fav){
      await sb.from('favorites').delete().eq('user_id', state.user.id).eq('auction_id', aid);
      toast('أُزيل من المفضلة');
    } else {
      await sb.from('favorites').insert({ user_id: state.user.id, auction_id: aid });
      toast('أُضيف للمفضلة');
    }
    render();
  }
  async function myFavs(){
    if(!state.user) return [];
    const { data } = await sb.from('favorites').select('auction_id').eq('user_id', state.user.id);
    const ids = (data||[]).map(f=>f.auction_id);
    return state.auctions.filter(a => ids.includes(a.id));
  }

  // ============ Header ============
  function renderHeader(){
    const el = document.getElementById('hdrActions'); if(!el) return;
    if(state.user){
      const adminBtn = state.isAdmin
        ? `<button class="ibtn admin" onclick="location.href='admin.html'" title="لوحة المشرف">${ico('admin',{size:'1.1em'})}</button>`
        : '';
      el.innerHTML = `
        ${adminBtn}
        <button class="ibtn" onclick="SUMHA.go('notifs')" title="التنبيهات">${ico('bell',{size:'1.15em'})}<span class="dot" id="notifDot" hidden></span></button>
        <div class="user-chip" onclick="SUMHA.go('account')">
          <div class="uav">${esc(state.user.name[0])}</div>
          <div><b>${esc(state.user.name.split(' ')[0])}</b><span>حسابي</span></div>
        </div>`;
    } else {
      el.innerHTML = `
        <button class="btn-login" onclick="SUMHA.openAuth()">${ico('user',{size:'1em'})} دخول / تسجيل</button>`;
    }
    // ملء أيقونات الشريط السفلي
    const setIco = (id, name) => {
      const el = document.getElementById(id);
      if(el && el.firstElementChild && window.SUMHA_ICON){
        el.firstElementChild.outerHTML = window.SUMHA_ICON(name, { size:'22px' });
      }
    };
    setIco('navIco-home','chart');
    setIco('navIco-cats','package');
    setIco('navIco-live','live');
    setIco('navIco-search','search');
    setIco('navIco-account','user');
  }

  // ============ Router ============
  function go(page, data){
    if(page==='account' && !state.user){ openAuth(()=>go('account')); return; }
    if(['my-bids','my-wins','my-products','favorites','notifs'].includes(page) && !state.user){
      openAuth(()=>go(page)); return;
    }
    state.page=page; state.pageData=data||{};
    document.querySelectorAll('.ni').forEach(n=>n.classList.toggle('on', n.dataset.nav===page));
    window.scrollTo({top:0,behavior:'smooth'});
    render();
  }

  async function render(){
    const main = document.getElementById('main'); if(!main) return;
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
      case 'favorites': main.innerHTML = pageWrap(ico('heart')+' المحفوظات', await myFavs(), 'لا توجد منتجات محفوظة', 'اضغط القلب على أي منتج'); break;
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

  // ============ Home ============
  function guestBanner(){
    if(state.user) return '';
    return `<div class="guest-banner"><div class="gi">${ico('user',{size:'1.2em'})}</div><div class="gt"><b>أنت تتصفح كزائر</b><span>سجّل الآن للمشاركة في المزادات</span></div><button onclick="SUMHA.openAuth()">تسجيل سريع</button></div>`;
  }

  function renderHome(all){
    const liveNow = all.filter(a => new Date(a.end_time).getTime() - Date.now() < 6*3600000).slice(0,8);
    const featured = all.filter(a => a.featured).slice(0,8);
    const ending = [...all].sort((a,b)=>new Date(a.end_time)-new Date(b.end_time)).slice(0,4);
    const topBids = [...all].sort((a,b)=>(b.bids?.length||0)-(a.bids?.length||0)).slice(0,4);
    const latest = [...all].sort((a,b)=>new Date(b.created_at)-new Date(a.created_at)).slice(0,4);
    const totalSellers = new Set(all.map(a=>a.seller_id)).size;

    return `
      ${guestBanner()}
      <div class="hero">
        <div class="hero-inner">
          <div class="hero-live"><span class="pip"></span> مباشر الآن · ${liveNow.length} مزاد نشط</div>
          <h1>${esc(state.settings.hero_title || 'سومها…')} <span class="accent">أعلى سوم يفوز</span></h1>
          <p>${esc(state.settings.hero_subtitle || 'منصة المزادات السعودية الأولى — زايد بثقة، واربح بأعلى سوم')}</p>
          <div class="hero-cta">
            ${state.user
              ? `<button class="c1" onclick="SUMHA.go('live')">${ico('live')} استعرض المزادات المباشرة</button>`
              : `<button class="c1" onclick="SUMHA.openAuth()">${ico('plus')} أنشئ حسابك الآن</button>`}
            <button class="c2" onclick="SUMHA.go('cats')">تصفح التصنيفات</button>
          </div>
          <div class="hero-stats">
            <div class="hero-stat"><b>${all.length}</b><span>مزاد نشط</span></div>
            <div class="hero-stat"><b>${totalSellers}</b><span>بائع موثّق</span></div>
            <div class="hero-stat"><b>4.9★</b><span>تقييم المنصة</span></div>
          </div>
        </div>
      </div>

      <section>
        <div class="sec-h">
          <h2>${ico('live')} المزاد المباشر</h2>
          <a onclick="SUMHA.go('live')">عرض الكل ←</a>
        </div>
        <div class="hrow">
          ${liveNow.length ? liveNow.map(cardHTML).join('') : '<div style="padding:24px;color:var(--muted);font-size:13px;background:var(--white);border-radius:16px;border:1.5px solid var(--line)">لا توجد مزادات مباشرة الآن</div>'}
        </div>
      </section>

      <section>
        <div class="sec-h"><h2>${ico('featured')} مزادات مميزة</h2></div>
        <div class="hrow">
          ${featured.length ? featured.map(cardHTML).join('') : '<div style="padding:24px;color:var(--muted);font-size:13px;background:var(--white);border-radius:16px;border:1.5px solid var(--line)">لا توجد مزادات مميزة حالياً</div>'}
        </div>
      </section>

      <section>
        <div class="sec-h">
          <h2>التصنيفات</h2>
          <a onclick="SUMHA.go('cats')">عرض الكل ←</a>
        </div>
        <div class="cats">
          ${CFG.categories.map(c => `
            <div class="cat" onclick="SUMHA.go('category',{cat:'${c.name}'})">
              <div class="ico">${catIcon(c.name,{size:'32px'})}</div>
              <span>${c.name}</span>
            </div>`).join('')}
        </div>
      </section>

      <section>
        <div class="sec-h"><h2>${ico('ending')} تنتهي قريبًا</h2></div>
        <div class="grid">${ending.map(cardHTML).join('')}</div>
      </section>

      <section>
        <div class="sec-h"><h2>كيف تعمل سومها؟</h2></div>
        <div class="how">
          <div class="step"><div class="num">1</div><div class="icon">${ico('user',{size:'44px'})}</div><h3>سجّل حسابك</h3><p>أنشئ حساب مجاني ببريدك أو جوالك للبدء بالمزايدة</p></div>
          <div class="step"><div class="num">2</div><div class="icon">${ico('hammer',{size:'44px'})}</div><h3>زايد الآن</h3><p>اختر المنتج الذي يعجبك وقدّم أعلى سوم قبل انتهاء الوقت</p></div>
          <div class="step"><div class="num">3</div><div class="icon">${ico('trophy',{size:'44px'})}</div><h3>اربح بثقة</h3><p>عند انتهاء المزاد يُعلن الفائز ويتم التواصل عبر المنصة</p></div>
        </div>
      </section>

      <section>
        <div class="sec-h"><h2>${ico('topBids')} الأكثر مزايدة</h2></div>
        <div class="grid">${topBids.map(cardHTML).join('')}</div>
      </section>

      <section>
        <div class="sec-h"><h2>${ico('latest')} أحدث المزادات</h2></div>
        <div class="grid">${latest.map(cardHTML).join('')}</div>
      </section>
    `;
  }

  function cardHTML(a){
    const highest = highestBid(a);
    const ms = new Date(a.end_time).getTime() - Date.now();
    const warn = ms < 3600000 ? 'warn' : '';
    const badge = ms < 6*3600000 
      ? `<span class="badge live">مباشر</span>` 
      : (a.featured ? `<span class="badge feat">${ico('featured',{size:'13px'})} مميز</span>` : '');
    const imgEl = a.image_url
      ? `<img src="${a.image_url}" alt="${esc(a.title)}" loading="lazy" onerror="this.outerHTML='<div class=\\'ph-icon\\'>${catIcon(a.category,{size:'32px'}).replace(/"/g,'&quot;')}</div>'">`
      : `<div class="ph-icon">${catIcon(a.category,{size:'32px'})}</div>`;
    return `<div class="pcard" onclick="SUMHA.go('product',{id:'${a.id}'})">
      <div class="pcard-img">${badge}<div class="fav-btn" onclick="SUMHA.toggleFav('${a.id}',event)">${ico('heartEmpty',{size:'19px'})}</div>${imgEl}</div>
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
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('home')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>${title}</h1></div>${items.length?`<div class="grid">${items.map(cardHTML).join('')}</div>`:emptyState('لا توجد نتائج','')}`;
  }
  function renderCatsPage(all){
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('home')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>التصنيفات</h1></div>
    <div class="cats">${CFG.categories.map(c=>{
      const count = all.filter(a=>a.category===c.name).length;
      return `<div class="cat" onclick="SUMHA.go('category',{cat:'${c.name}'})">
        <div class="ico">${catIcon(c.name,{size:'32px'})}</div>
        <span>${c.name}</span>
        <div style="font-size:10px;color:var(--muted);margin-top:4px;font-weight:700">${count} مزاد</div>
      </div>`;
    }).join('')}</div>`;
  }
  function emptyState(t,m){ return `<div class="empty"><div class="e-ico">🔎</div><h3>${t}</h3><p>${m}</p><button onclick="SUMHA.go('home')">الرئيسية</button></div>`; }
  function pageWrap(t, items, et, em){
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('account')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>${t}</h1></div>${items.length?`<div class="grid">${items.map(cardHTML).join('')}</div>`:emptyState(et,em)}`;
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
      bidUI = `<div class="bid-row"><input type="number" id="bidInput" value="${minNext}" min="${minNext}"><button onclick="SUMHA.placeBid('${a.id}')">${ico('hammer',{size:'16px'})} سوم الآن</button></div><p class="hint">${state.user?`الحد الأدنى: <b>${fmt(minNext)} ر.س</b>`:`<b>سجّل دخولك</b> للمشاركة`}</p>`;
    } else if(!ended && isMine){
      bidUI = `<div class="cd done" style="background:var(--cream2);color:var(--ink2);border:1.5px solid var(--line)"><small>هذا منتجك</small><div class="t" style="font-size:15px">لا يمكنك المزايدة على منتجك</div></div>`;
    }
    const imgEl = a.image_url 
      ? `<img src="${a.image_url}" alt="${esc(a.title)}" onerror="this.outerHTML='<div class=\\'ph-icon\\'>${catIcon(a.category,{size:'48px'}).replace(/"/g,'&quot;')}</div>'">` 
      : `<div class="ph-icon">${catIcon(a.category,{size:'48px'})}</div>`;
    const sortedBids = [...(a.bids||[])].sort((x,y)=>Number(y.amount)-Number(x.amount));
    return `
      <div class="page-h"><button class="back-btn" onclick="SUMHA.go('home')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>تفاصيل المزاد</h1></div>
      <div class="prod-wrap">
        <div class="prod-main">
          <div class="prod-img">${!ended&&ms<6*3600000?'<span class="badge live" style="top:14px;right:14px">مباشر</span>':''}${a.featured?`<span class="badge feat" style="top:14px;right:14px">${ico('featured',{size:'13px'})} مميز</span>`:''}${imgEl}</div>
          <div class="prod-title">${esc(a.title)}</div>
          <div class="prod-meta"><span>${esc(a.category)}</span><span>${esc(a.location||'—')}</span><span>${esc(a.condition||'—')}</span><span>مزايدون: <b>${(a.bids||[]).length}</b></span></div>
          <div class="prod-desc">${esc(a.description||'')}</div>
        </div>
        <div>
          <div class="price-box">
            <div class="pp-row"><span class="lbl">السعر الابتدائي</span><span class="val">${fmt(a.start_price)} ر.س</span></div>
            <div class="pp-row"><span class="lbl">${ended?'السعر النهائي':'أعلى مزايدة حالية'}</span><span class="val big" id="livePrice">${fmt(highest)} ر.س</span></div>
            <div class="pp-row"><span class="lbl">أقل زيادة</span><span class="val gld">${fmt(a.min_increment)} ر.س</span></div>
            <div class="pp-row"><span class="lbl">عدد المزايدات</span><span class="val" id="liveBidCount">${(a.bids||[]).length}</span></div>
          </div>
          <div class="cd ${ended?'done':''}" id="prodCd" data-end="${new Date(a.end_time).getTime()}"><small>${ended?'انتهى المزاد':(winner?'الفائز':'الوقت المتبقي')}</small><div class="t">${ended?(winner?esc(winner.user?.full_name||'فائز'):'لا يوجد فائز'):leftTime(ms)}</div></div>
          ${bidUI}
          <div class="pactions">
            <button class="${fav?'on':''}" onclick="SUMHA.toggleFav('${a.id}',event)">${fav?ico('heart',{size:'16px'})+' في المفضلة':ico('heartEmpty',{size:'16px'})+' المفضلة'}</button>
            <button onclick="SUMHA.shareProduct('${a.id}')">${ico('share',{size:'16px'})} مشاركة</button>
            <button onclick="SUMHA.reportProduct('${a.id}')">${ico('report',{size:'16px'})} إبلاغ</button>
          </div>
          <div class="box"><h3>${ico('seller',{size:'18px'})} البائع</h3><div class="seller-row"><div class="av">${esc(a.sellerName[0]||'؟')}</div><div class="info"><b>${esc(a.sellerName)}</b><span>بائع موثّق · ${a.sellerSales} عملية</span></div><div style="text-align:center"><div class="stars">${'★'.repeat(Math.round(a.sellerRating))}</div><span style="font-size:11px;color:var(--ink2)">${a.sellerRating.toFixed(1)}</span></div></div></div>
          <div class="box"><h3>${ico('history',{size:'18px'})} سجل المزايدات</h3><div class="bids-list" id="bidsList">${sortedBids.length?sortedBids.map((b,i)=>`<div class="bid-item ${i===0?'top':''}"><div class="u"><div class="av2">${esc((b.user?.full_name||'?')[0])}</div><div><b>${esc(b.user?.full_name||'مزايد')}</b><span>${ago(b.created_at)}</span></div></div><div class="amt">${fmt(b.amount)} ر.س</div></div>`).join(''):'<p style="text-align:center;color:var(--muted);padding:14px;font-size:13px">لا توجد مزايدات — كن الأول!</p>'}</div></div>
          <div class="box"><h3>${ico('rules',{size:'18px'})} شروط المزاد</h3><ul class="rules"><li>المزايدة ملزمة ولا يمكن التراجع عنها</li><li>يجب أن تكون أعلى من السعر الحالي بمقدار الزيادة الدنيا</li><li>يتم تحديد الفائز عند انتهاء الوقت</li><li>لا يمكنك المزايدة على منتجك</li></ul></div>
        </div>
      </div>`;
  }

  // ============ Bid ============
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
      addNotif(a.seller_id,'⚡','مزايدة جديدة على منتجك',`"${a.title}" — ${fmt(amount)} ر.س`);
    }
    addNotif(state.user.id,'✅','تم تسجيل مزايدتك',`"${a.title}" بمبلغ ${fmt(amount)} ر.س`);
    toast('تم تسجيل مزايدتك');
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
    toast('تم استلام البلاغ');
  }

  // ============ Account ============
  async function renderAccount(){
    const u = state.user; if(!u) return '';
    const myBids = await myBidsAuctions();
    const myWinsList = await myWins();
    const myProducts = await myAuctions();
    const favs = await myFavs();
    const verifiedBadge = u.emailVerified
      ? `<span style="background:#dff5e5;color:#1f7a3a;font-size:10px;padding:2px 8px;border-radius:6px;font-weight:800">موثق ✓</span>`
      : `<span style="background:#fff5dd;color:#a87a20;font-size:10px;padding:2px 8px;border-radius:6px;font-weight:800">غير موثق</span>`;
    return `
      <div class="acc-hdr">
        <div class="av">${esc(u.name[0])}</div>
        <div style="flex:1;min-width:0">
          <h2>${esc(u.name)} ${verifiedBadge}</h2>
          <p style="direction:ltr;text-align:right;word-break:break-all;font-size:12px">${esc(u.email)}</p>
          <p>${esc(u.phone)}</p>
        </div>
      </div>
      <div class="acc-stats"><div class="acc-stat"><b>${myBids.length}</b><span>مزايدة</span></div><div class="acc-stat"><b>${myWinsList.length}</b><span>فوز</span></div><div class="acc-stat"><b>${(u.rating||5).toFixed(1)}★</b><span>تقييمي</span></div></div>
      <div class="menu">
        <div class="mi" onclick="SUMHA.go('my-bids')"><div class="ico">${ico('chart',{size:'20px'})}</div><div class="txt"><b>المزادات التي شاركت فيها</b><span>${myBids.length} مزاد</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('my-wins')"><div class="ico">${ico('trophy',{size:'20px'})}</div><div class="txt"><b>المزادات التي فزت بها</b><span>${myWinsList.length} عملية</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('my-products')"><div class="ico">${ico('package',{size:'20px'})}</div><div class="txt"><b>منتجاتي المعروضة</b><span>${myProducts.length} منتج</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('favorites')"><div class="ico">${ico('heart',{size:'20px'})}</div><div class="txt"><b>المحفوظات</b><span>${favs.length} منتج</span></div><div class="arr">‹</div></div>
        <div class="mi" onclick="SUMHA.go('notifs')"><div class="ico">${ico('bell',{size:'20px'})}</div><div class="txt"><b>التنبيهات</b></div><div class="arr">‹</div></div>
        ${!u.emailVerified ? `<div class="mi" onclick="SUMHA.resendVerification()" style="background:#fff9e6"><div class="ico" style="background:#fff0c2">${ico('mail',{size:'20px'})}</div><div class="txt"><b>إعادة إرسال توثيق البريد</b><span>اضغط لتأكيد بريدك</span></div><div class="arr">‹</div></div>` : ''}
        ${state.isAdmin?`<div class="mi" onclick="location.href='admin.html'" style="background:#fff5e8"><div class="ico" style="background:#8d0b0b;color:#fff">${ico('admin',{size:'20px'})}</div><div class="txt"><b>لوحة المشرف</b><span>إدارة الموقع</span></div><div class="arr">‹</div></div>`:''}
        <div class="mi danger" onclick="SUMHA.logout()"><div class="ico">${ico('logout',{size:'20px'})}</div><div class="txt"><b>تسجيل الخروج</b><span>الخروج من الحساب</span></div><div class="arr">‹</div></div>
      </div>`;
  }

  async function renderNotifs(){
    const items = await getMyNotifs();
    return `<div class="page-h"><button class="back-btn" onclick="SUMHA.go('account')"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 6 6 6-6 6"/></svg></button><h1>التنبيهات</h1></div>${items.length?`<div class="box" style="padding:6px 14px">${items.map(n=>`<div class="bid-item"><div class="u"><div class="av2">${n.icon||''}</div><div><b>${esc(n.title)}</b><span>${esc(n.body)}</span></div></div><div style="font-size:11px;color:var(--muted);flex-shrink:0">${ago(n.created_at)}</div></div>`).join('')}</div>`:emptyState('لا توجد تنبيهات','ستظهر هنا إشعاراتك')}`;
  }

  // ============ Sell (Admin Only) ============
  function openSell(){
    if(!state.user){ openAuth(()=>openSell()); return; }
    if(!state.isAdmin){ toast('فقط الإدارة يمكنها إضافة المزادات حالياً'); return; }
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
    if(!state.isAdmin){ toast('غير مصرح'); return; }
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
    addNotif(state.user.id,'✅','تم نشر منتجك',`"${title}" متاح للمزايدة`);
    closeOv('ovSell'); e.target.reset();
    toast('تم نشر منتجك');
    await loadAuctions(); go('my-products');
  });

  // ============ Search ============
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

  // ============ Countdown ============
  function initCountdowns(){
    document.querySelectorAll('.tmr[data-end]').forEach(el => {
      const ms = Number(el.dataset.end) - Date.now();
      const svg = el.querySelector('svg');
      el.innerHTML = (svg ? svg.outerHTML + ' ' : '') + leftTime(ms);
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
    const logoUrl = CFG.logo;
    if(logoUrl){
      document.querySelectorAll('#logoImgSm, #logoImgAuth').forEach(el => el.src = logoUrl);
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

  window.SUMHA = {
    boot, go, openAuth, closeOv, openSell, logout,
    toggleFav, placeBid, shareProduct, reportProduct,
    resendVerification,
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
