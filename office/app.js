/* ============================================================
   MEN Office — app.js (كامل)
   ============================================================ */
(function(){
'use strict';

/* ════════ ⚙️ الإعدادات ════════ */
const SUPABASE_URL      = 'https://wziuzllafxjpiwcputwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aXV6bGxhZnhqcGl3Y3B1dHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTI0MDksImV4cCI6MjEwNTc2ODQwOX0.YfdTdXNydRI1olcQKAeLHn0-rOrbY-_P1gzndwhfIeU';

/* ════════ 🔌 Supabase Init ════════ */
let sb = null;
try {
  if(window.supabase?.createClient){
    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'menoffice-auth',
        storage: localStorage
      }
    });
  } else {
    console.error('[MEN] Supabase SDK غير محمّل');
  }
} catch(e){ console.error('[MEN] فشل الاتصال:', e); }

/* ════════ 🛠 Helpers ════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

function escapeHtml(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function initials(name){
  if(!name) return '?';
  return name.trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
}

/* ════════ 🔔 Toast ════════ */
let toastTimer;
function toast(msg, type='success'){
  const t = $('toast');
  if(!t) return;
  const ico = type === 'success'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>'
    : type === 'error'
    ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'
    : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>';
  t.innerHTML = ico + '<span>' + msg + '</span>';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2800);
}

/* ════════ 🪟 Modal ════════ */
function openModal(id){
  const m = $(id);
  if(!m) return;
  m.classList.add('on');
  document.body.style.overflow = 'hidden';
  if(id === 'modalProfile') fillProfileForm();
}
function closeModal(id){
  const m = $(id);
  if(!m) return;
  m.classList.remove('on');
  document.body.style.overflow = '';
}
document.addEventListener('keydown', e => {
  if(e.key === 'Escape') $$('.ov.on').forEach(o => closeModal(o.id));
});

/* ════════ 🧭 Navigation ════════ */
function scrollTo(id){
  const el = $(id);
  if(el) el.scrollIntoView({ behavior:'smooth', block:'start' });
}
function scrollTop(){ window.scrollTo({ top:0, behavior:'smooth' }); }
function toggleMenu(){ $('nav')?.classList.toggle('open'); }

const SECTIONS = ['home','email','groups','achievements','excellence'];
window.addEventListener('scroll', () => {
  const y = window.scrollY + 120;
  let active = 'home';
  SECTIONS.forEach(id => {
    const el = $(id);
    if(el && el.offsetTop <= y) active = id;
  });
  $$('.nav a').forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + active));
});

/* ════════ 👤 Auth State ════════ */
let currentUser = null;
let currentProfile = null;
let authMode = 'login';

async function getSession(){
  if(!sb) return null;
  const { data: { session } } = await sb.auth.getSession();
  currentUser = session?.user || null;
  updateAuthUI();
  return session;
}

async function signIn(email, pass){
  const { data, error } = await sb.auth.signInWithPassword({ email, password: pass });
  if(error) throw error;
  currentUser = data.user;
  return data;
}

async function signUp(email, pass, name){
  const { data, error } = await sb.auth.signUp({
    email, password: pass,
    options: { data: { name } }
  });
  if(error) throw error;
  // إدخال البروفايل يدوياً في حال عدم وجود trigger
  if(data.user){
    try {
      await sb.from('profiles').upsert({
        id: data.user.id, name, email
      }, { onConflict: 'id' });
    } catch(e){ console.warn('profile insert:', e); }
  }
  return data;
}

async function signOut(){
  await sb.auth.signOut();
  currentUser = null; currentProfile = null;
  updateAuthUI();
  await loadGroups();
  await loadAchievements();
  await updateStats();
  toast('تم تسجيل الخروج','info');
}

function updateAuthUI(){
  const logged = !!currentUser;
  $('authBtn').style.display = logged ? 'none' : 'inline-flex';
  $('userChip').style.display = logged ? 'inline-flex' : 'none';
  if(logged){
    const name = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'مستخدم';
    $('userName').textContent = name;
    $('userAv').textContent = initials(name);
  }
}

/* ════════ 📊 Data Operations ════════ */
async function loadProfile(){
  if(!currentUser) return null;
  const { data } = await sb.from('profiles').select('*').eq('id', currentUser.id).maybeSingle();
  currentProfile = data;
  return data;
}

async function saveProfile(name, role){
  if(!currentUser) throw new Error('غير مسجل');
  const { error } = await sb.from('profiles').upsert({
    id: currentUser.id,
    name,
    role,
    email: currentUser.email,
    updated_at: new Date().toISOString()
  }, { onConflict: 'id' });
  if(error) throw error;
  currentProfile = { ...currentProfile, name, role };
  updateAuthUI();
}

function fillProfileForm(){
  if(!currentUser) return;
  $('pfName').value = currentProfile?.name || currentUser.user_metadata?.name || '';
  $('pfEmail').value = currentUser.email || '';
  $('pfRole').value = currentProfile?.role || '';
}

/* ════════ 📧 Emails ════════ */
async function sendEmailRecord({ to, name, subject, body }){
  if(!currentUser) throw new Error('يجب تسجيل الدخول أولاً');
  const { error } = await sb.from('emails').insert({
    user_id: currentUser.id,
    to_email: to, to_name: name || '',
    subject, body, status: 'sent'
  });
  if(error) throw error;
  await incrementAchievement('إنجاز الإيميلات', 1);
}

/* ════════ 👥 Groups ════════ */
async function loadGroups(){
  const grid = $('groupsGrid');
  if(!grid) return;

  grid.innerHTML = '<div class="skeleton" style="height:200px"></div><div class="skeleton" style="height:200px"></div><div class="skeleton" style="height:200px"></div>';

  try {
    const { data: groups } = await sb.from('groups')
      .select('*, group_members(count)')
      .order('created_at', { ascending: false });

    let myIds = [];
    if(currentUser){
      const { data: mine } = await sb.from('group_members')
        .select('group_id').eq('user_id', currentUser.id);
      myIds = (mine || []).map(m => m.group_id);
    }

    if(!groups?.length){
      grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray)">لا توجد مجموعات بعد — كن أول من ينشئ واحدة!</div>';
      return;
    }

    grid.innerHTML = groups.map(g => {
      const joined = myIds.includes(g.id);
      const count = g.group_members?.[0]?.count || 0;
      return `
        <div class="group-card">
          <div class="group-head">
            <div class="group-avatar">${initials(g.name)}</div>
            <div class="gt">
              <b>${escapeHtml(g.name)}</b>
              <span>${escapeHtml(g.category||'')} · ${count}/${g.max_members} عضو</span>
            </div>
          </div>
          <p class="group-desc">${escapeHtml(g.description||'')}</p>
          <div class="group-meta">
            <div class="group-members">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>
              <b>${count}</b> عضو
            </div>
            <button class="join-btn ${joined?'joined':''}" data-join="${g.id}">
              ${joined ? 'مغادرة' : 'انضمام'}
            </button>
          </div>
        </div>`;
    }).join('');

    grid.querySelectorAll('[data-join]').forEach(btn => {
      btn.addEventListener('click', () => toggleJoin(btn.dataset.join));
    });
  } catch(err){
    console.error('loadGroups:', err);
    grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:40px;color:var(--gray)">تعذّر تحميل المجموعات</div>';
  }
}

async function toggleJoin(id){
  if(!currentUser){ toast('سجّل دخولك أولاً','error'); openModal('modalAuth'); return; }
  try {
    const { data: mine } = await sb.from('group_members')
      .select('id').eq('group_id', id).eq('user_id', currentUser.id).maybeSingle();

    if(mine){
      await sb.from('group_members').delete().eq('id', mine.id);
      toast('تم مغادرة المجموعة','info');
    } else {
      const { error } = await sb.from('group_members').insert({
        group_id: id, user_id: currentUser.id
      });
      if(error) throw error;
      toast('تم الانضمام للمجموعة ✓');
      await incrementAchievement('قائد فريق', 1);
    }
    await loadGroups();
    await updateStats();
  } catch(err){
    toast(err.message, 'error');
  }
}

async function createGroup(){
  if(!currentUser){ toast('سجّل دخولك أولاً','error'); return openModal('modalAuth'); }
  const name = $('grpName').value.trim();
  const desc = $('grpDesc').value.trim();
  const cat  = $('grpCat').value;
  const max  = Math.max(2, Math.min(100, Number($('grpMax').value) || 10));
  if(!name || !desc){ toast('أكمل جميع الحقول','error'); return; }

  try {
    const { data, error } = await sb.from('groups').insert({
      name, description: desc, category: cat,
      max_members: max, owner_id: currentUser.id
    }).select().single();
    if(error) throw error;

    await sb.from('group_members').insert({
      group_id: data.id, user_id: currentUser.id
    });

    closeModal('modalGroup');
    $('grpName').value = ''; $('grpDesc').value = '';
    await loadGroups();
    await updateStats();
    toast('تم إنشاء المجموعة ✓');
  } catch(err){
    toast(err.message, 'error');
  }
}

/* ════════ 🏆 Achievements ════════ */
const ICONS = {
  trophy:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></svg>',
  star:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>',
  target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',
  zap:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>',
  award:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>'
};

async function loadAchievements(){
  const grid = $('achGrid');
  if(!grid) return;

  // عرض هيكلي افتراضي حتى لو لم يكن مسجل
  let achs = [];
  if(currentUser){
    try {
      const { data } = await sb.from('achievements')
        .select('*').eq('user_id', currentUser.id);

      if(data?.length){
        achs = data;
      } else {
        // إنشاء الإنجازات الافتراضية
        const defaults = [
          { title:'إنجاز الإيميلات', description:'أرسل 100 إيميل احترافي', icon:'trophy', current_value:0, target_value:100 },
          { title:'قائد فريق', description:'انضم إلى 5 مجموعات', icon:'users', current_value:0, target_value:5 },
          { title:'الأداء المتفوّق', description:'حافظ على تقييم عالي', icon:'star', current_value:0, target_value:30 },
          { title:'معدّل الإنجاز', description:'أكمل 20 مهمة', icon:'target', current_value:0, target_value:20 },
          { title:'النشاط اليومي', description:'30 يوماً متتالياً', icon:'zap', current_value:0, target_value:30 },
          { title:'وسام التفوق', description:'المركز الأول شهرياً', icon:'award', current_value:0, target_value:1 }
        ].map(a => ({ ...a, user_id: currentUser.id }));

        const { data: created } = await sb.from('achievements').insert(defaults).select();
        achs = created || [];
      }
    } catch(err){ console.error('loadAchievements:', err); }
  } else {
    // عرض افتراضي للزوار
    achs = [
      { title:'إنجاز الإيميلات', description:'أرسل 100 إيميل احترافي', icon:'trophy', current_value:0, target_value:100 },
      { title:'قائد فريق', description:'انضم إلى 5 مجموعات', icon:'users', current_value:0, target_value:5 },
      { title:'الأداء المتفوّق', description:'حافظ على تقييم عالي', icon:'star', current_value:0, target_value:30 },
      { title:'معدّل الإنجاز', description:'أكمل 20 مهمة', icon:'target', current_value:0, target_value:20 },
      { title:'النشاط اليومي', description:'30 يوماً متتالياً', icon:'zap', current_value:0, target_value:30 },
      { title:'وسام التفوق', description:'المركز الأول شهرياً', icon:'award', current_value:0, target_value:1 }
    ];
  }

  grid.innerHTML = achs.map(a => {
    const pct = Math.round((a.current_value / a.target_value) * 100);
    return `
      <div class="ach-card">
        <div class="ach-medal">${ICONS[a.icon] || ICONS.trophy}</div>
        <div class="ach-body">
          <h4>${escapeHtml(a.title)} ${a.completed?'✅':''}</h4>
          <p>${escapeHtml(a.description || '')}</p>
          <div class="ach-bar"><span style="width:${pct}%"></span></div>
          <div class="ach-info"><span>التقدّم</span><b>${a.current_value} / ${a.target_value} (${pct}%)</b></div>
        </div>
      </div>`;
  }).join('');
}

async function incrementAchievement(title, amount){
  if(!currentUser) return;
  try {
    const { data } = await sb.from('achievements')
      .select('*').eq('user_id', currentUser.id).eq('title', title).maybeSingle();
    if(!data) return;

    const newVal = Math.min(data.target_value, data.current_value + amount);
    await sb.from('achievements').update({
      current_value: newVal,
      completed: newVal >= data.target_value,
      updated_at: new Date().toISOString()
    }).eq('id', data.id);

    await loadAchievements();
    await updateStats();
  } catch(e){ console.warn('increment:', e); }
}

/* ════════ ⭐ Excellence ════════ */
const LEADERS = [
  { name:'محمد العتيبي',   role:'قائد فريق التقنية', score:2480 },
  { name:'سارة القحطاني',  role:'مصمّمة واجهات',     score:2310 },
  { name:'عبدالله الشمري', role:'مطوّر برمجيات',     score:2150 },
  { name:'نورة الدوسري',   role:'مسؤولة تسويق',      score:1980 },
  { name:'خالد الحربي',    role:'محلّل بيانات',      score:1840 },
  { name:'ريم السبيعي',    role:'مديرة مشاريع',      score:1720 },
  { name:'فهد الغامدي',    role:'مهندس شبكات',       score:1590 },
  { name:'هند المطيري',    role:'مصمّمة جرافيك',     score:1450 },
  { name:'سلطان الزهراني', role:'منسّق مبيعات',      score:1310 },
  { name:'لمى العنزي',     role:'كاتبة محتوى',       score:1180 }
];

function renderExcellence(){
  const p = $('podium');
  const r = $('rankList');
  if(!p || !r) return;

  const pod = (u,i) => `
    <div class="pod ${i===0?'p1':''}">
      <div class="pod-rank">#${i+1}</div>
      <div class="pod-av">${initials(u.name)}</div>
      <b>${escapeHtml(u.name)}</b>
      <span>${escapeHtml(u.role)}</span>
      <div class="pod-score">${u.score}</div>
    </div>`;
  p.innerHTML = [pod(LEADERS[1],1), pod(LEADERS[0],0), pod(LEADERS[2],2)].join('');

  r.innerHTML = LEADERS.slice(3).map((u,i) => `
    <div class="rank-row">
      <div class="rank-num">${i+4}</div>
      <div class="rank-av">${initials(u.name)}</div>
      <div class="rank-info"><b>${escapeHtml(u.name)}</b><span>${escapeHtml(u.role)}</span></div>
      <div class="rank-score">${u.score}</div>
    </div>`).join('');
}

/* ════════ 📊 Stats ════════ */
function animateNum(el, target){
  if(!el) return;
  const cur = Number(el.textContent) || 0;
  const dur = 900;
  const start = performance.now();
  (function step(t){
    const p = Math.min(1, (t - start) / dur);
    const v = Math.round(cur + (target - cur) * (1 - Math.pow(1-p, 3)));
    el.textContent = v;
    if(p < 1) requestAnimationFrame(step);
  })(start);
}

async function updateStats(){
  let emails = 0, groups = 0, achs = 0;
  if(currentUser){
    try {
      const [e,g,a] = await Promise.all([
        sb.from('emails').select('id',{count:'exact',head:true}).eq('user_id', currentUser.id),
        sb.from('group_members').select('id',{count:'exact',head:true}).eq('user_id', currentUser.id),
        sb.from('achievements').select('id',{count:'exact',head:true}).eq('user_id', currentUser.id).eq('completed',true)
      ]);
      emails = e.count || 0;
      groups = g.count || 0;
      achs = a.count || 0;
    } catch(err){ console.warn(err); }
  }
  animateNum($('stat1'), emails);
  animateNum($('stat2'), groups);
  animateNum($('stat3'), achs);
}

/* ════════ 📧 Email UI ════════ */
const TEMPLATES = {
  welcome:{ s:'مرحباً بك في MEN Office 🎉', b:'أهلاً بك في عائلتنا!\n\nيسعدنا انضمامك إلينا. نحن هنا لمساعدتك على تحقيق إنجازاتك والعمل مع فريقك بكل سهولة.\n\nمع تحيات فريق MEN Office' },
  meeting:{ s:'دعوة لاجتماع فريق العمل', b:'السلام عليكم،\n\nيسعدنا دعوتكم لحضور اجتماع فريق العمل:\n\n📅 التاريخ:\n🕐 الوقت:\n📍 المكان:\n\nمحاور الاجتماع:\n• مراجعة ما تم إنجازه\n• مناقشة الخطط القادمة\n\nنرجو تأكيد الحضور.' },
  report:{ s:'التقرير الأسبوعي', b:'السلام عليكم،\n\nإليكم ملخّص الإنجازات لهذا الأسبوع:\n\n✅ تم إكمال:\n⏳ قيد التنفيذ:\n📌 المتبقي:\n\nنسبة الإنجاز: 85%' },
  congrats:{ s:'تهانينا على إنجازك 🎉', b:'السلام عليكم،\n\nنهنّئك بمناسبة تحقيق هذا الإنجاز الرائع!\n\nاستمر في التفوق! 🏆\n\nمع تحيات فريق MEN Office' },
  followup:{ s:'متابعة بخصوص المشروع', b:'السلام عليكم،\n\nأرغب في متابعة آخر مستجدات المشروع:\n\n• هل هناك أي معوّقات؟\n• ما نسبة الإنجاز الحالية؟\n\nيرجى الرد في أقرب وقت.' }
};

function loadTemplate(key, btn){
  const t = TEMPLATES[key];
  if(!t) return;
  $('emSubject').value = t.s;
  $('emBody').value = t.b;
  updatePreview();
  $$('.tag-chip').forEach(c => c.classList.remove('on'));
  btn?.classList.add('on');
}

function updatePreview(){
  const name = $('emName').value.trim();
  const email = $('emTo').value.trim();
  const subject = $('emSubject').value.trim();
  const body = $('emBody').value.trim();
  const ini = name ? initials(name) : (email ? email[0].toUpperCase() : '?');
  $('pvAv').textContent = ini;
  $('pvName').textContent = name || 'المستلم';
  $('pvEmail').textContent = email || 'name@example.com';
  $('pvSubject').textContent = subject || 'بدون موضوع';
  $('pvBody').textContent = body || 'سيظهر نص الرسالة هنا أثناء الكتابة...';
}

async function sendEmail(){
  if(!currentUser){ toast('سجّل دخولك أولاً','error'); return openModal('modalAuth'); }
  const to = $('emTo').value.trim();
  const name = $('emName').value.trim();
  const subject = $('emSubject').value.trim();
  const body = $('emBody').value.trim();

  if(!to || !subject || !body){ toast('أكمل جميع الحقول','error'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)){ toast('صيغة البريد غير صحيحة','error'); return; }

  try {
    await sendEmailRecord({ to, name, subject, body });
    const greeting = name ? `السيد/ة ${name}،\n\n` : '';
    const mailto = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(greeting + body)}`;
    window.location.href = mailto;
    toast('تم حفظ الإيميل وفتح برنامج البريد ✓');
    await updateStats();
  } catch(err){
    console.error(err);
    toast('فشل الإرسال: ' + err.message, 'error');
  }
}

/* ════════ 🔐 Auth Form ════════ */
function switchAuthMode(){
  authMode = authMode === 'login' ? 'signup' : 'login';
  const isSignup = authMode === 'signup';
  $('fName').style.display = isSignup ? 'block' : 'none';
  $('authTitle').textContent = isSignup ? 'حساب جديد' : 'تسجيل الدخول';
  $('authSub').textContent = isSignup ? 'أنشئ حسابك في ثوانٍ' : 'ادخل إلى حسابك للمتابعة';
  $('authSubmitBtn').textContent = isSignup ? 'إنشاء الحساب' : 'دخول';
  $('authToggle').textContent = isSignup ? 'لديك حساب؟ سجّل الدخول' : 'ليس لديك حساب؟ سجّل الآن';
}

async function handleAuthSubmit(){
  const email = $('authEmail').value.trim();
  const pass = $('authPass').value;
  const name = $('authName').value.trim();
  const btn = $('authSubmitBtn');

  if(!email || !pass){ toast('أكمل جميع الحقول','error'); return; }
  if(authMode === 'signup' && !name){ toast('الرجاء إدخال الاسم','error'); return; }
  if(pass.length < 6){ toast('كلمة المرور 6 أحرف على الأقل','error'); return; }

  btn.disabled = true;
  const origText = btn.textContent;
  btn.textContent = 'جارٍ...';

  try {
    if(authMode === 'signup'){
      const data = await signUp(email, pass, name);
      if(!data.session){
        toast('تحقق من بريدك لتأكيد الحساب','info');
      } else {
        toast('تم إنشاء الحساب ✓');
        closeModal('modalAuth');
        await afterLogin();
      }
    } else {
      await signIn(email, pass);
      toast('مرحباً بك!');
      closeModal('modalAuth');
      await afterLogin();
    }
    $('authEmail').value = ''; $('authPass').value = ''; $('authName').value = '';
  } catch(err){
    console.error(err);
    const m = (err.message || '').toLowerCase();
    if(m.includes('invalid')) toast('البيانات غير صحيحة','error');
    else if(m.includes('already')) toast('البريد مسجّل بالفعل','error');
    else toast(err.message || 'حدث خطأ', 'error');
  } finally {
    btn.disabled = false;
    btn.textContent = origText;
  }
}

async function afterLogin(){
  await loadProfile();
  await loadGroups();
  await loadAchievements();
  await updateStats();
  updateAuthUI();
}

/* ════════ 🎁 Profile ════════ */
async function saveProfileHandler(){
  if(!currentUser) return;
  const name = $('pfName').value.trim();
  const role = $('pfRole').value.trim();
  if(!name){ toast('الرجاء إدخال الاسم','error'); return; }
  try {
    await saveProfile(name, role);
    toast('تم الحفظ ✓');
    closeModal('modalProfile');
  } catch(err){
    toast(err.message, 'error');
  }
}

/* ════════ 🔗 Bind ════════ */
function bind(){
  // Preview
  ['emTo','emName','emSubject','emBody'].forEach(id => {
    $(id)?.addEventListener('input', updatePreview);
  });

  // Send
  $('sendEmailBtn')?.addEventListener('click', sendEmail);

  // Templates
  $$('.tag-chip').forEach(c => c.addEventListener('click', () => loadTemplate(c.dataset.template, c)));

  // Create group
  $('createGroupBtn')?.addEventListener('click', createGroup);

  // Save profile
  $('saveProfileBtn')?.addEventListener('click', saveProfileHandler);
  $('logoutBtn')?.addEventListener('click', () => { closeModal('modalProfile'); signOut(); });

  // Auth form
  $('authSubmitBtn')?.addEventListener('click', handleAuthSubmit);
  $('authToggle')?.addEventListener('click', switchAuthMode);
  $('authPass')?.addEventListener('keydown', e => { if(e.key === 'Enter') handleAuthSubmit(); });

  // Modals
  $$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
  $$('.ov[data-close-outside]').forEach(ov => ov.addEventListener('click', e => {
    if(e.target === ov) closeModal(ov.id);
  }));

  // Nav mobile
  $$('.nav a').forEach(a => a.addEventListener('click', () => $('nav').classList.remove('open')));
}

/* ════════ 🚀 Init ════════ */
async function init(){
  console.log('%c MEN Office · جاهز ',
    'background:#0a0a0a;color:#fff;padding:6px 14px;border-radius:8px;font-weight:900;letter-spacing:2px');

  bind();
  renderExcellence();

  if(!sb){
    console.error('[MEN] لا يمكن الاتصال بـ Supabase');
    toast('فشل الاتصال بالخادم','error');
    return;
  }

  // راقب تغيرات المصادقة
  sb.auth.onAuthStateChange(async (event, session) => {
    console.log('[MEN Auth]', event);
    currentUser = session?.user || null;
    updateAuthUI();
    if(event === 'SIGNED_IN' && currentUser){
      await afterLogin();
    }
  });

  // جلسة حالية
  await getSession();
  if(currentUser) await afterLogin();
  else {
    await loadGroups();
    await loadAchievements();
    await updateStats();
  }
}

/* ════════ 🌐 Public API ════════ */
window.MEN_APP = {
  openModal, closeModal, scrollTo, scrollTop, toggleMenu,
  signOut
};

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
