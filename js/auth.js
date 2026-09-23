/* ═══════════════════════════════════════════════════════════
   MEN Store — Auth (Supabase + LocalStorage Fallback)
   نسخة محدثة — تحل مشكلة الاسم والجوال
   ═══════════════════════════════════════════════════════════ */
(function(){
'use strict';

// ═══════════════════════════════════════════════════════════
// 🔑 إعدادات Supabase
// ═══════════════════════════════════════════════════════════
const SUPABASE_URL = 'https://xoqwzluyxynqpdpmidts.supabase.co';   // ← ضع رابط مشروعك
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXd6bHV5eHlucXBkcG1pZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTI2NDAsImV4cCI6MjEwNTY4ODY0MH0.xIpvxJyAMAoLqkSR9RJk2ZcgN7rsfOg2OfbelraMWvs';   // ← ضع anon key
// ═══════════════════════════════════════════════════════════

const CASHBACK_RATE = 0.02;
const USE_SUPABASE = !!(SUPABASE_URL && SUPABASE_KEY && window.supabase);

let sb = null;
if(USE_SUPABASE){
  try{
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    console.log(' Supabase mode');
  }catch(e){ console.error(' خطأ Supabase:', e.message); }
}else{
  console.log(' LocalStorage mode');
}

window.sb = sb;
window.MEN_CASHBACK_RATE = CASHBACK_RATE;
window.MEN_MODE = USE_SUPABASE ? 'supabase' : 'local';

let currentUser = null;
let currentProfile = null;
let authMode = 'login';
const listeners = [];

/* ═══════════ Local Storage Helpers ═══════════ */
const LS_USERS = 'men_users_local';
const LS_SESSION = 'men_session_local';

function lsGetUsers(){ try{return JSON.parse(localStorage.getItem(LS_USERS)||'{}')}catch{return {}} }
function lsSaveUsers(u){ localStorage.setItem(LS_USERS, JSON.stringify(u)); }
function lsGetSession(){ try{return JSON.parse(localStorage.getItem(LS_SESSION)||'null')}catch{return null} }
function lsSetSession(s){ s ? localStorage.setItem(LS_SESSION, JSON.stringify(s)) : localStorage.removeItem(LS_SESSION); }
function simpleHash(str){ let h=0; for(let i=0;i<str.length;i++){h=((h<<5)-h)+str.charCodeAt(i);h|=0;} return 'h'+Math.abs(h).toString(36); }

/* ═══════════ 🔑 الدالة الأساسية: جلب بيانات المستخدم ═══════════ */
function getCurrentUser(){
  if(!currentUser) return null;
  const meta = currentUser.user_metadata || {};
  return {
    id: currentUser.id || currentUser.email,
    name: currentProfile?.name || meta.name || '',
    email: currentUser.email || '',
    phone: currentProfile?.phone || meta.phone || '',
    cashback: Number(currentProfile?.cashback || 0),
    createdAt: currentProfile?.created_at || currentProfile?.createdAt || currentUser.created_at
  };
}

/* ═══════════ جلب البروفايل مع fallback قوي ═══════════ */
async function loadProfile(){
  if(!currentUser) return;
  
  if(USE_SUPABASE){
    try{
      const { data, error } = await sb
        .from('profiles')
        .select('*')
        .eq('id', currentUser.id)
        .maybeSingle();
      
      if(data) {
        currentProfile = data;
        return;
      }
      
      // ⚠️ Profile ما موجود — ننشئه من user_metadata
      if(error || !data){
        const meta = currentUser.user_metadata || {};
        const { data: created, error: cErr } = await sb
          .from('profiles')
          .insert({
            id: currentUser.id,
            name: meta.name || 'مستخدم',
            phone: meta.phone || ''
          })
          .select()
          .single();
        
        if(created) {
          currentProfile = created;
          console.log(' تم إنشاء profile جديد');
        } else {
          // fallback أخير — استخدم metadata فقط
          currentProfile = {
            id: currentUser.id,
            name: meta.name || '',
            phone: meta.phone || '',
            cashback: 0,
            created_at: currentUser.created_at
          };
          if(cErr) console.warn(' إنشاء profile فشل:', cErr.message);
        }
      }
    }catch(e){
      console.error('خطأ loadProfile:', e);
      const meta = currentUser.user_metadata || {};
      currentProfile = {
        id: currentUser.id,
        name: meta.name || '',
        phone: meta.phone || '',
        cashback: 0,
        created_at: currentUser.created_at
      };
    }
  }else{
    const users = lsGetUsers();
    const u = users[currentUser.email];
    if(u) currentProfile = {...u, id: u.email};
  }
}

/* ═══════════ تسجيل جديد ═══════════ */
async function signup(name, email, phone, password){
  name=(name||'').trim(); email=(email||'').toLowerCase().trim();
  phone=(phone||'').trim(); password=password||'';
  if(!name||!email||!phone||!password) throw new Error('الرجاء إكمال جميع الحقول');
  if(name.length<3) throw new Error('الاسم يجب أن يكون 3 أحرف على الأقل');
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('البريد الإلكتروني غير صحيح');
  const phoneClean = phone.replace(/[\s\-]/g,'');
  if(!/^(?:\+?966|0)?5\d{8}$/.test(phoneClean)) throw new Error('رقم الجوال غير صحيح (05XXXXXXXX)');
  if(password.length<6) throw new Error('كلمة المرور 6 أحرف على الأقل');

  if(USE_SUPABASE){
    try{
      const { data: existPhone } = await sb.rpc('find_email_by_phone', { p_phone: phoneClean });
      if(existPhone) throw new Error('رقم الجوال مسجّل مسبقاً');
    }catch(e){ if(e.message && e.message.includes('مسجّل')) throw e; }

    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { data: { name, phone: phoneClean } }
    });
    if(error) throw new Error(error.message);
    
    currentUser = data.user;
    
    // ⏱️ انتظر شوي عشان الـ trigger يشتغل
    await new Promise(r => setTimeout(r, 600));
    await loadProfile();
  }else{
    const users = lsGetUsers();
    if(users[email]) throw new Error('هذا البريد مسجّل مسبقاً');
    for(const k in users){
      if(users[k].phone && users[k].phone.replace(/[\s\-]/g,'') === phoneClean)
        throw new Error('رقم الجوال مسجّل مسبقاً');
    }
    users[email] = {
      name, email, phone: phoneClean,
      password: simpleHash(password),
      cashback: 0,
      orders: [],
      createdAt: new Date().toISOString()
    };
    lsSaveUsers(users);
    lsSetSession({email});
    currentProfile = {...users[email], id: email};
    currentUser = {id: email, email, user_metadata: {name, phone: phoneClean}};
  }
  updateHeader();
  return getCurrentUser();
}

/* ═══════════ تسجيل دخول ═══════════ */
async function login(identifier, password){
  identifier=(identifier||'').trim();
  if(!identifier||!password) throw new Error('الرجاء إكمال الحقول');

  if(USE_SUPABASE){
    let email = identifier;
    if(!identifier.includes('@')){
      const phoneClean = identifier.replace(/[\s\-]/g,'');
      const { data, error } = await sb.rpc('find_email_by_phone', { p_phone: phoneClean });
      if(error || !data) throw new Error('رقم الجوال غير مسجّل');
      email = data;
    }
    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if(error) throw new Error('بيانات الدخول غير صحيحة');
    currentUser = data.user;
    await loadProfile();
  }else{
    const users = lsGetUsers();
    const email = identifier.toLowerCase();
    const phoneClean = identifier.replace(/[\s\-]/g,'');
    let u = users[email];
    if(!u){
      for(const k in users){
        if(users[k].phone === phoneClean){ u = users[k]; break; }
      }
    }
    if(!u) throw new Error('لا يوجد حساب بهذه البيانات');
    if(u.password !== simpleHash(password)) throw new Error('كلمة المرور غير صحيحة');
    lsSetSession({email: u.email});
    currentProfile = {...u, id: u.email};
    currentUser = {id: u.email, email: u.email, user_metadata: {name: u.name, phone: u.phone}};
  }
  updateHeader();
  return getCurrentUser();
}

/* ═══════════ خروج ═══════════ */
async function logout(){
  if(USE_SUPABASE){ try{ await sb.auth.signOut(); }catch(e){} }
  else{ lsSetSession(null); }
  currentUser = null; currentProfile = null;
  updateHeader();
}

/* ═══════════ كاش باك ═══════════ */
async function addCashback(amount){
  if(!currentUser || !amount) return;
  if(USE_SUPABASE){
    const { error } = await sb.rpc('add_cashback', { target_user_id: currentUser.id, amount: Number(amount) });
    if(error) console.error(error);
    await loadProfile();
  }else{
    const users = lsGetUsers();
    const u = users[currentUser.email];
    if(u){ u.cashback = (u.cashback||0) + Number(amount); lsSaveUsers(users); currentProfile = {...u, id: u.email}; }
  }
  notifyChange();
}

async function deductCashback(amount){
  if(!currentUser || !amount) return;
  if(USE_SUPABASE){
    const { error } = await sb.rpc('deduct_cashback', { target_user_id: currentUser.id, amount: Number(amount) });
    if(error) console.error(error);
    await loadProfile();
  }else{
    const users = lsGetUsers();
    const u = users[currentUser.email];
    if(u){ u.cashback = Math.max(0, (u.cashback||0) - Number(amount)); lsSaveUsers(users); currentProfile = {...u, id: u.email}; }
  }
  notifyChange();
}

/* ═══════════ الطلبات ═══════════ */
async function addOrder(orderData){
  if(!currentUser) return;
  if(USE_SUPABASE){
    try{ await sb.from('orders').insert({ user_id: currentUser.id, total: orderData.total, items: orderData.items }); }catch(e){}
  }else{
    const users = lsGetUsers();
    const u = users[currentUser.email];
    if(u){
      u.orders = u.orders || [];
      u.orders.unshift({...orderData, date: new Date().toISOString()});
      if(u.orders.length>20) u.orders = u.orders.slice(0,20);
      lsSaveUsers(users);
      currentProfile = {...u, id: u.email};
    }
  }
}

/* ═══════════ التحقق من الأدمن ═══════════ */
async function isAdmin(){
  if(!currentUser) return false;
  if(USE_SUPABASE){
    const { data, error } = await sb.from('admins').select('user_id').eq('user_id', currentUser.id).maybeSingle();
    return !error && !!data;
  }
  const users = lsGetUsers();
  const emails = Object.keys(users).sort((a,b)=>{
    const ta = new Date(users[a].createdAt||0).getTime();
    const tb = new Date(users[b].createdAt||0).getTime();
    return ta - tb;
  });
  return emails[0] === currentUser.email;
}

async function adminSetCashback(targetUserId, amount){
  if(USE_SUPABASE){
    const { error } = await sb.rpc('admin_set_cashback', { target_user_id: targetUserId, new_amount: Number(amount) });
    if(error) throw new Error(error.message);
  }else{
    const users = lsGetUsers();
    let found = false;
    for(const k in users){
      if(users[k].email === targetUserId || k === targetUserId){
        users[k].cashback = Math.max(0, Number(amount));
        found = true;
        break;
      }
    }
    if(!found) throw new Error('المستخدم غير موجود');
    lsSaveUsers(users);
    if(currentUser && (currentUser.email === targetUserId)) await loadProfile();
  }
}

async function adminGetAllUsers(){
  if(USE_SUPABASE){
    const { data, error } = await sb.rpc('admin_get_all_users');
    if(error) throw new Error(error.message);
    return data || [];
  }
  const users = lsGetUsers();
  return Object.values(users).map(u => ({
    id: u.email, name: u.name, email: u.email, phone: u.phone,
    cashback: u.cashback||0, created_at: u.createdAt
  }));
}

/* ═══════════ أفاتار ═══════════ */
function generateAvatar(name){
  const initial = (name||'?').trim().charAt(0).toUpperCase();
  const c=document.createElement('canvas'); c.width=c.height=120;
  const ctx=c.getContext('2d');
  const g=ctx.createLinearGradient(0,0,120,120);
  g.addColorStop(0,'#021ca4'); g.addColorStop(1,'#4a7aff');
  ctx.fillStyle=g; ctx.fillRect(0,0,120,120);
  ctx.fillStyle='#fff';
  ctx.font='bold 58px Cairo, Arial, sans-serif';
  ctx.textAlign='center'; ctx.textBaseline='middle';
  ctx.fillText(initial,60,64);
  return c.toDataURL();
}

/* ═══════════ تحديث الهيدر ═══════════ */
function updateHeader(){
  const lb=document.getElementById('menLoginBtn');
  const av=document.getElementById('menHeaderAvatar');
  const mL=document.getElementById('menMobileLogin');
  const mA=document.getElementById('menMobileAccount');
  if(currentUser){
    const u = getCurrentUser();
    if(lb) lb.style.display='none';
    if(av){
      av.src=generateAvatar(u.name || u.email);
      av.style.display='block';
      av.onclick=openAccount;
      av.title='حسابي';
    }
    if(mL) mL.style.display='none';
    if(mA) mA.style.display='flex';
  }else{
    if(lb) lb.style.display='inline-flex';
    if(av) av.style.display='none';
    if(mL) mL.style.display='flex';
    if(mA) mA.style.display='none';
  }
  if(typeof window.updateCartUI==='function') window.updateCartUI();
}

function notifyChange(){
  updateHeader();
  listeners.forEach(fn => { try{ fn(getCurrentUser()); }catch(e){} });
}

/* ═══════════ فتح الحساب ═══════════ */
async function openAccount(){
  if(!currentUser){ openAuth('login'); return; }
  
  // أعد جلب البروفايل قبل العرض
  await loadProfile();
  
  const u = getCurrentUser();
  document.getElementById('menAccAvatar').src = generateAvatar(u.name || u.email);
  document.getElementById('menAccName').textContent = u.name || '—';
  document.getElementById('menAccEmail').textContent = u.email || '—';
  document.getElementById('menInfoName').textContent = u.name || '—';
  document.getElementById('menInfoPhone').textContent = u.phone || '—';
  document.getElementById('menInfoEmail').textContent = u.email || '—';
  document.getElementById('menInfoDate').textContent = u.createdAt
    ? new Date(u.createdAt).toLocaleDateString('ar-SA') : '—';
  animateCash(u.cashback || 0);

  const ad = await isAdmin();
  const devBtn = document.getElementById('menDevOpenBtn');
  if(devBtn) devBtn.style.display = ad ? 'inline-flex' : 'none';

  document.getElementById('menAccountModal').classList.add('active');
}

function animateCash(target){
  const el=document.getElementById('menCashVal'); if(!el) return;
  const start=0, dur=900, t0=performance.now();
  (function step(t){
    const p=Math.min((t-t0)/dur,1);
    const e=1-Math.pow(1-p,3);
    el.textContent=(start+(target-start)*e).toFixed(2);
    if(p<1) requestAnimationFrame(step);
  })(t0);
}

/* ═══════════ نوافذ ═══════════ */
function injectModals(){
  if(document.getElementById('menAuthModal')) return;

  const auth=document.createElement('div');
  auth.id='menAuthModal'; auth.className='modal-overlay';
  auth.innerHTML=`
    <div class="modal-box auth-modal-box">
      <div class="modal-close" id="menAuthClose"><i class="fas fa-times"></i></div>
      <h3><i class="fas fa-fingerprint"></i><span id="menAuthTitle">تسجيل الدخول</span></h3>
      <p class="auth-subtitle" id="menAuthSub">مرحباً بعودتك إلى MEN Store</p>
      <div id="menSignupFields" style="display:none">
        <div class="auth-input-group"><input type="text" id="menAuthName" placeholder="الاسم الكامل" autocomplete="name"><i class="fas fa-user"></i></div>
        <div class="auth-input-group"><input type="tel" id="menAuthPhone" placeholder="05XXXXXXXX" autocomplete="tel"><i class="fas fa-phone"></i></div>
      </div>
      <div class="auth-input-group"><input type="text" id="menAuthEmail" placeholder="البريد الإلكتروني أو رقم الجوال" autocomplete="username"><i class="fas fa-envelope"></i></div>
      <div class="auth-input-group"><input type="password" id="menAuthPassword" placeholder="كلمة المرور" autocomplete="current-password"><i class="fas fa-lock"></i></div>
      <div class="auth-error" id="menAuthErr"></div>
      <button class="auth-submit-btn" id="menAuthSubmit" type="button"><i class="fas fa-fingerprint"></i><span>دخول</span></button>
      <div class="auth-switch"><span id="menAuthSwitchTxt">ليس لديك حساب؟</span><a id="menAuthSwitchBtn">إنشاء حساب</a></div>
    </div>`;
  document.body.appendChild(auth);

  const acc=document.createElement('div');
  acc.id='menAccountModal'; acc.className='modal-overlay';
  acc.innerHTML=`
    <div class="modal-box account-modal-box">
      <div class="modal-close" id="menAccClose"><i class="fas fa-times"></i></div>
      <div class="account-hero">
        <img class="account-avatar" id="menAccAvatar" src="" alt="">
        <div class="account-name" id="menAccName">—</div>
        <div class="account-email" id="menAccEmail">—</div>
      </div>
      <div class="account-body">
        <div class="cashback-card">
          <div class="cash-label"><i class="fas fa-wallet"></i> رصيد الكاش باك</div>
          <div class="cash-amount"><span id="menCashVal">0</span><small>ر.س</small></div>
          <div class="cash-note"><i class="fas fa-gift"></i> تكسب ${(CASHBACK_RATE*100).toFixed(0)}% على كل طلب</div>
        </div>
        <div class="account-info-grid">
          <div class="account-info-item"><div class="lbl"><i class="fas fa-user"></i> الاسم</div><div class="val" id="menInfoName">—</div></div>
          <div class="account-info-item"><div class="lbl"><i class="fas fa-phone"></i> الجوال</div><div class="val" id="menInfoPhone">—</div></div>
          <div class="account-info-item"><div class="lbl"><i class="fas fa-envelope"></i> البريد</div><div class="val" id="menInfoEmail">—</div></div>
          <div class="account-info-item"><div class="lbl"><i class="fas fa-calendar"></i> عضو منذ</div><div class="val" id="menInfoDate">—</div></div>
        </div>
        <div class="account-actions">
          <button class="account-btn danger" id="menLogout" style="flex:1;" type="button"><i class="fas fa-right-from-bracket"></i> تسجيل الخروج</button>
          <button class="account-btn" id="menDevOpenBtn" style="display:none;background:linear-gradient(135deg,#b71c1c,#d90429);color:#fff;flex:1;" type="button">
            <i class="fas fa-user-shield"></i> لوحة المطور
          </button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(acc);

  document.getElementById('menAuthClose').onclick=()=>auth.classList.remove('active');
  auth.addEventListener('click',e=>{if(e.target===auth)auth.classList.remove('active')});
  document.getElementById('menAccClose').onclick=()=>acc.classList.remove('active');
  acc.addEventListener('click',e=>{if(e.target===acc)acc.classList.remove('active')});

  document.getElementById('menAuthSwitchBtn').onclick=()=>{
    authMode = authMode==='login'?'signup':'login';
    refreshAuthUI();
    document.getElementById('menAuthErr').textContent='';
  };

  document.getElementById('menAuthSubmit').onclick=handleAuthSubmit;
  ['menAuthName','menAuthPhone','menAuthEmail','menAuthPassword'].forEach(id=>{
    document.getElementById(id)?.addEventListener('keydown',e=>{if(e.key==='Enter')handleAuthSubmit();});
  });

  document.getElementById('menLogout').onclick=async ()=>{
    if(confirm('هل تريد تسجيل الخروج؟')){ await logout(); acc.classList.remove('active'); toast('تم تسجيل الخروج','info'); }
  };

  document.getElementById('menDevOpenBtn').onclick=openDevPanel;
}

function refreshAuthUI(){
  const t=document.getElementById('menAuthTitle');
  const s=document.getElementById('menAuthSub');
  const f=document.getElementById('menSignupFields');
  const b=document.getElementById('menAuthSubmit');
  const st=document.getElementById('menAuthSwitchTxt');
  const sb2=document.getElementById('menAuthSwitchBtn');
  const emailInp=document.getElementById('menAuthEmail');
  if(authMode==='signup'){
    t.textContent='إنشاء حساب جديد';
    s.textContent='انضم لعائلة MEN واحصل على كاش باك 2%';
    f.style.display='block';
    b.innerHTML='<i class="fas fa-user-plus"></i><span>إنشاء الحساب</span>';
    st.textContent='لديك حساب؟';
    sb2.textContent='تسجيل الدخول';
    if(emailInp) emailInp.placeholder='البريد الإلكتروني';
  }else{
    t.textContent='تسجيل الدخول';
    s.textContent='مرحباً بعودتك إلى MEN Store';
    f.style.display='none';
    b.innerHTML='<i class="fas fa-fingerprint"></i><span>دخول</span>';
    st.textContent='ليس لديك حساب؟';
    sb2.textContent='إنشاء حساب';
    if(emailInp) emailInp.placeholder='البريد الإلكتروني أو رقم الجوال';
  }
}

function openAuth(mode){
  authMode = mode||'login';
  refreshAuthUI();
  document.getElementById('menAuthErr').textContent='';
  document.getElementById('menAuthModal').classList.add('active');
  setTimeout(()=>{
    const f = authMode==='signup'?'menAuthName':'menAuthEmail';
    document.getElementById(f)?.focus();
  },250);
}

async function handleAuthSubmit(){
  const err=document.getElementById('menAuthErr');
  const btn=document.getElementById('menAuthSubmit');
  err.textContent='';
  const name=document.getElementById('menAuthName')?.value||'';
  const phone=document.getElementById('menAuthPhone')?.value||'';
  const email=document.getElementById('menAuthEmail')?.value||'';
  const pass=document.getElementById('menAuthPassword')?.value||'';
  btn.disabled=true;
  try{
    if(authMode==='signup'){
      const u=await signup(name,email,phone,pass);
      toast(`أهلاً ${u?.name||''}! تم إنشاء حسابك 🎉`,'success');
    }else{
      const u=await login(email,pass);
      toast(`أهلاً بعودتك ${u?.name||''}! 👋`,'success');
    }
    document.getElementById('menAuthModal').classList.remove('active');
    ['menAuthName','menAuthPhone','menAuthEmail','menAuthPassword'].forEach(id=>{
      const el=document.getElementById(id); if(el) el.value='';
    });
    notifyChange();
  }catch(e){ err.textContent=e.message; }
  finally{ btn.disabled=false; }
}

/* ═══════════ لوحة المطور ═══════════ */
async function openDevPanel(){
  if(!await isAdmin()){ toast('غير مصرح','error'); return; }

  if(!document.getElementById('menDevPanel')){
    const panel=document.createElement('div');
    panel.id='menDevPanel'; panel.className='modal-overlay';
    panel.innerHTML=`
      <div class="modal-box" style="max-width:620px;padding:32px 28px;">
        <div class="modal-close" id="menDevClose"><i class="fas fa-times"></i></div>
        <h3 style="color:#fff;display:flex;align-items:center;gap:10px;margin-bottom:6px;font-size:1.4rem;">
          <i class="fas fa-user-shield" style="color:#d90429;"></i> لوحة المطور
        </h3>
        <p style="color:#8a92b0;font-size:.85rem;margin-bottom:18px;">الوضع: <b style="color:#4a7aff;">${USE_SUPABASE?'Supabase':'محلي'}</b></p>
        <div class="input-field">
          <label><i class="fas fa-search"></i> بحث</label>
          <input type="text" id="menDevSearch" placeholder="ابحث...">
        </div>
        <div style="margin-top:12px;padding:10px;background:rgba(74,122,255,.04);border:1px solid rgba(74,122,255,.1);border-radius:14px;max-height:380px;overflow-y:auto;">
          <div id="menDevUsersList"><div style="text-align:center;color:#8a92b0;padding:20px;"><i class="fas fa-spinner fa-spin"></i> تحميل...</div></div>
        </div>
        <div style="text-align:center;margin-top:14px;">
          <button id="menDevRefresh" type="button" style="background:rgba(74,122,255,.1);border:1px solid rgba(74,122,255,.2);color:#4a7aff;padding:8px 20px;border-radius:20px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:.82rem;">
            <i class="fas fa-rotate"></i> تحديث
          </button>
        </div>
      </div>`;
    document.body.appendChild(panel);
    document.getElementById('menDevClose').onclick=()=>panel.classList.remove('active');
    panel.addEventListener('click',e=>{if(e.target===panel)panel.classList.remove('active')});
    document.getElementById('menDevRefresh').onclick=loadDevUsers;
    document.getElementById('menDevSearch').addEventListener('input',filterDevUsers);
  }
  document.getElementById('menDevPanel').classList.add('active');
  loadDevUsers();
}

let devUsersCache = [];

async function loadDevUsers(){
  const list=document.getElementById('menDevUsersList');
  if(!list) return;
  list.innerHTML='<div style="text-align:center;color:#8a92b0;padding:20px;"><i class="fas fa-spinner fa-spin"></i> تحميل...</div>';
  try{
    devUsersCache = await adminGetAllUsers();
    renderDevUsers(devUsersCache);
  }catch(e){
    list.innerHTML=`<div style="text-align:center;color:#ff6b6b;padding:20px;">${e.message}</div>`;
  }
}

function filterDevUsers(){
  const q=(document.getElementById('menDevSearch').value||'').trim().toLowerCase();
  if(!q){ renderDevUsers(devUsersCache); return; }
  const filtered = devUsersCache.filter(u =>
    (u.name||'').toLowerCase().includes(q) ||
    (u.email||'').toLowerCase().includes(q) ||
    (u.phone||'').includes(q)
  );
  renderDevUsers(filtered);
}

function renderDevUsers(users){
  const list=document.getElementById('menDevUsersList');
  if(!list) return;
  if(!users.length){
    list.innerHTML='<div style="text-align:center;color:#8a92b0;padding:20px;">لا يوجد مستخدمون</div>';
    return;
  }
  list.innerHTML = users.map(u => `
    <div style="padding:12px;border-bottom:1px solid rgba(74,122,255,.08);display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;">
      <div style="flex:1;min-width:150px;overflow:hidden;">
        <div style="color:#fff;font-weight:700;font-size:.9rem;">${u.name||'—'}</div>
        <div style="color:#8a92b0;font-size:.72rem;">${u.email||''}</div>
        <div style="color:#8a92b0;font-size:.72rem;"><i class="fas fa-phone"></i> ${u.phone||'—'}</div>
      </div>
      <div style="text-align:center;min-width:90px;">
        <div style="color:#4caf50;font-weight:800;font-size:1rem;">${Number(u.cashback||0).toFixed(2)}</div>
        <div style="color:#8a92b0;font-size:.68rem;">ر.س</div>
      </div>
      <div style="display:flex;gap:6px;">
        <button onclick="window.MEN_DEV_EDIT('${u.id}','${(u.name||'').replace(/'/g,"\\'")}',${Number(u.cashback||0)})" type="button"
          style="background:linear-gradient(135deg,#021ca4,#4a7aff);border:none;color:#fff;padding:7px 14px;border-radius:20px;cursor:pointer;font-family:'Cairo',sans-serif;font-weight:700;font-size:.75rem;">
          <i class="fas fa-pen"></i> تعديل
        </button>
      </div>
    </div>
  `).join('');
}

window.MEN_DEV_EDIT = async function(userId, userName, currentCash){
  const v = prompt(`💰 الرصيد الجديد لـ "${userName}" (ر.س):`, Number(currentCash).toFixed(2));
  if(v===null) return;
  const n = parseFloat(v);
  if(isNaN(n) || n<0){ toast('قيمة غير صحيحة','error'); return; }
  try{
    await adminSetCashback(userId, n);
    toast(`✅ تم تحديث رصيد ${userName} إلى ${n.toFixed(2)} ر.س`, 'success');
    loadDevUsers();
  }catch(e){ toast(e.message, 'error'); }
};

/* ═══════════ Toast ═══════════ */
function toast(msg,type){
  if(typeof window.showToast==='function') window.showToast(msg,type||'info');
}

/* ═══════════ الواجهة العامة ═══════════ */
window.MEN_AUTH = {
  open: openAuth,
  openAccount,
  getCurrentUser,
  logout,
  addCashback,
  deductCashback,
  adminSetCashback,
  isAdmin,
  addOrder,
  onChange: fn => listeners.push(fn),
  CASHBACK_RATE,
  sb,
  mode: USE_SUPABASE ? 'supabase' : 'local',
  reload: async () => { await loadProfile(); notifyChange(); }
};

window.MEN_SUPABASE = {
  auth: {
    getSession: async () => {
      if(USE_SUPABASE){
        const { data } = await sb.auth.getSession();
        return { data: { session: data.session } };
      }
      const s = lsGetSession();
      return { data: { session: s ? { user: { email: s.email } } : null } };
    },
    onAuthStateChange: (cb) => {
      if(USE_SUPABASE){
        sb.auth.onAuthStateChange((event, session) => cb(event, session));
      }
    }
  }
};

/* ═══════════ تشغيل ═══════════ */
async function initAuth(){
  injectModals();
  console.log('🚀 auth.js يعمل — الوضع:', USE_SUPABASE ? 'Supabase' : 'LocalStorage');

  if(USE_SUPABASE){
    try{
      const { data:{session} } = await sb.auth.getSession();
      if(session){
        currentUser = session.user;
        await loadProfile();
        console.log('👤 مستخدم مسجل:', getCurrentUser());
      }
      updateHeader();
      sb.auth.onAuthStateChange(async (event, session) => {
        if(session){
          currentUser = session.user;
          await loadProfile();
        } else {
          currentUser = null; currentProfile = null;
        }
        notifyChange();
      });
    }catch(e){
      console.error('خطأ Supabase:', e);
      updateHeader();
    }
  }else{
    const s = lsGetSession();
    if(s && s.email){
      const users = lsGetUsers();
      const u = users[s.email];
      if(u){
        currentUser = {id: u.email, email: u.email, user_metadata: {name: u.name, phone: u.phone}};
        currentProfile = {...u, id: u.email};
        console.log('👤 مستخدم مسجل:', getCurrentUser());
      }
    }
    updateHeader();
  }
}

if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', initAuth);
else initAuth();

})();
