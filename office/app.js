/* ═══════════════════════════════════════════
   MEN Office — Application
   ═══════════════════════════════════════════ */
(function(){
'use strict';

/* ═══════════ Config ═══════════ */
const SUPABASE_URL      = 'https://wziuzllafxjpiwcputwn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6aXV6bGxhZnhqcGl3Y3B1dHduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxOTI0MDksImV4cCI6MjEwNTc2ODQwOX0.YfdTdXNydRI1olcQKAeLHn0-rOrbY-_P1gzndwhfIeU';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'menoffice-auth'
  }
});

console.log('%c MEN Office · جاهز ',
  'background:#000;color:#fff;padding:8px 16px;border-radius:8px;font-weight:900;letter-spacing:2px');

/* ═══════════ Helpers ═══════════ */
const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

const initials = name => {
  if(!name) return '؟';
  return String(name).trim().split(/\s+/).map(w => w[0]).slice(0,2).join('').toUpperCase();
};

const escapeHtml = s => String(s == null ? '' : s)
  .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
  .replace(/"/g,'&quot;').replace(/'/g,'&#39;');

const formatDate = s => {
  try { return new Date(s).toLocaleDateString('ar-EG',{day:'numeric',month:'short'}); }
  catch { return s || '—'; }
};

/* ═══════════ State ═══════════ */
const state = {
  user: null,
  profile: null,
  currentEmail: 0,
  currentChat: 0,
  data: {
    projects: [], tasks: [], emails: [],
    employees: [], files: [], events: [], chats: []
  }
};

/* ═══════════ Icons ═══════════ */
const ICONS = {
  check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>',
  close:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
  send:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 2-7 20-4-9-9-4Z"/><path d="M22 2 11 13"/></svg>',
  plus:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg>',
  folder:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>',
  users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  mail:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg>',
  chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3"/></svg>',
  ai:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v1a3 3 0 0 0-3 3v1a3 3 0 0 0 0 6 3 3 0 0 0 3 3 3 3 0 0 0 3 3 3 3 0 0 0 3-3 3 3 0 0 0 3-3 3 3 0 0 0 3-3 3 3 0 0 0 0-6 3 3 0 0 0-3-3 3 3 0 0 0-3-3 3 3 0 0 0-3-3z"/><circle cx="12" cy="12" r="2"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>',
  bell:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
  cal:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></svg>',
  file:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><polyline points="13 2 13 9 20 9"/></svg>',
  more:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></svg>',
  arrowR:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m9 18 6-6-6-6"/></svg>',
  arrowL:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="m15 18-6-6 6-6"/></svg>',
  trendUp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m22 7-8.5 8.5-5-5L2 17"/><path d="M16 7h6v6"/></svg>',
  trendDown:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m22 17-8.5-8.5-5 5L2 7"/><path d="M16 17h6v-6"/></svg>'
};

/* ═══════════ Toast & Loading ═══════════ */
let toastTimer;
function toast(msg){
  const t = $('toast');
  t.innerHTML = ICONS.check + '<span>' + msg + '</span>';
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const showLoading = () => $('loadingOverlay').classList.add('on');
const hideLoading = () => $('loadingOverlay').classList.remove('on');

/* ═══════════ AUTH ═══════════ */
let authMode = 'login';

function switchAuthMode(mode){
  authMode = mode;
  $$('.auth-mode button').forEach(t => t.classList.toggle('active', t.dataset.tab === mode));
  $('nameField').style.display = mode === 'signup' ? 'flex' : 'none';
  $('authKicker').textContent = mode === 'signup' ? 'CREATE ACCOUNT' : 'WELCOME BACK';
  $('authTitle').textContent = mode === 'signup' ? 'ابدأ رحلتك' : 'أهلاً بعودتك';
  $('authSub').textContent = mode === 'signup'
    ? 'أنشئ حسابك المجاني وابدأ بإدارة فريقك'
    : 'سجّل دخولك للمتابعة إلى مساحة العمل الخاصة بك';
  $('authSubmitText').textContent = mode === 'signup' ? 'إنشاء الحساب' : 'دخول إلى المنصة';
  $('authError').textContent = '';
}

async function handleAuth(){
  const email = $('authEmail').value.trim().toLowerCase();
  const password = $('authPassword').value;
  const name = $('authName').value.trim();
  const btn = $('authSubmit');

  if(!email || !password){ showAuthError('أكمل جميع الحقول'); return; }
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){ showAuthError('صيغة البريد غير صحيحة'); return; }
  if(password.length < 6){ showAuthError('كلمة المرور 6 أحرف على الأقل'); return; }
  if(authMode === 'signup' && !name){ showAuthError('الرجاء إدخال الاسم الكامل'); return; }

  btn.disabled = true;
  const orig = $('authSubmitText').textContent;
  $('authSubmitText').textContent = 'جارٍ...';
  showAuthError('');

  try {
    if(authMode === 'signup'){
      const { data, error } = await sb.auth.signUp({
        email, password,
        options: { data: { name } }
      });
      if(error) throw error;

      if(data.user){
        await sb.from('profiles').upsert({
          id: data.user.id, name, email
        }, { onConflict: 'id' });
      }

      if(!data.session){
        showAuthError('✓ تم إنشاء حسابك! تحقق من بريدك للتأكيد');
        return;
      }
      toast('مرحباً بك!');
    } else {
      const { error } = await sb.auth.signInWithPassword({ email, password });
      if(error) throw error;
      toast('مرحباً بعودتك!');
    }
  } catch(err){
    console.error(err);
    const m = (err.message || '').toLowerCase();
    if(m.includes('invalid')) showAuthError('بيانات الدخول غير صحيحة');
    else if(m.includes('already')) showAuthError('هذا البريد مسجّل بالفعل');
    else if(m.includes('rate')) showAuthError('محاولات كثيرة — انتظر قليلاً');
    else showAuthError(err.message || 'حدث خطأ');
  } finally {
    btn.disabled = false;
    $('authSubmitText').textContent = orig;
  }
}
const showAuthError = msg => { $('authError').textContent = msg; };

async function logout(){
  if(!confirm('هل تريد تسجيل الخروج؟')) return;
  await sb.auth.signOut();
  state.user = null; state.profile = null;
  $('app').style.display = 'none';
  $('authScreen').style.display = 'grid';
  $('authEmail').value = '';
  $('authPassword').value = '';
  toast('تم تسجيل الخروج');
}

/* ═══════════ Load Data ═══════════ */
async function loadAllData(){
  if(!state.user) return;
  showLoading();
  try {
    const uid = state.user.id;

    const { data: profile } = await sb.from('profiles').select('*').eq('id', uid).maybeSingle();
    state.profile = profile || { name: state.user.user_metadata?.name || 'مستخدم' };

    const { data: employees } = await sb.from('profiles').select('*');
    state.data.employees = (employees || []).map(p => ({
      id: p.id, name: p.name || 'مستخدم',
      role: p.role || 'موظف', email: p.email, tasks: 0, projects: 0
    }));

    const { data: projects } = await sb.from('projects').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    state.data.projects = (projects || []).map(p => ({
      id: p.id, name: p.name, progress: p.progress || 0,
      team: p.team || [], deadline: p.deadline || new Date().toISOString(),
      tasks: p.tasks_count || 0, done: p.done_count || 0,
      status: p.status || 'نشط'
    }));

    const { data: tasks } = await sb.from('tasks').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    state.data.tasks = (tasks || []).map(t => ({
      id: t.id, title: t.title, project: t.project || 'عام',
      status: t.status || 'todo', priority: t.priority || 'عادي',
      assignee: t.assignee || 'غير محدد', due: t.due_date, tags: t.tags || []
    }));

    const { data: emails } = await sb.from('emails').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    state.data.emails = (emails || []).map(e => ({
      id: e.id, from: e.from_name || e.to_name || 'مستخدم',
      email: e.from_email || e.to_email, subject: e.subject,
      preview: (e.body || '').slice(0, 60), body: e.body || '',
      time: formatDate(e.created_at), unread: !e.is_read
    }));

    const { data: files } = await sb.from('files').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    state.data.files = (files || []).map(f => ({
      id: f.id, name: f.name, type: f.type || 'doc',
      size: f.size || '0 KB', date: formatDate(f.created_at)
    }));

    const { data: events } = await sb.from('events').select('*').eq('user_id', uid).order('event_time');
    state.data.events = (events || []).map(e => ({
      id: e.id, time: e.event_time?.slice(0,5) || '00:00',
      title: e.title, desc: e.description || ''
    }));

    const { data: chats } = await sb.from('chats').select('*').eq('user_id', uid).order('created_at', { ascending: false });
    if(chats && chats.length){
      state.data.chats = await Promise.all(chats.map(async c => {
        const { data: msgs } = await sb.from('messages').select('*').eq('chat_id', c.id).order('created_at');
        return {
          id: c.id, name: c.name, av: initials(c.name),
          online: c.online || false,
          last: msgs?.[msgs.length-1]?.text || 'لا توجد رسائل',
          time: formatDate(c.created_at), unread: 0,
          messages: (msgs || []).map(m => ({
            from: m.from_user === uid ? 'me' : 'them',
            text: m.text,
            time: new Date(m.created_at).toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'})
          }))
        };
      }));
    }

    $('navProjects').textContent = state.data.projects.length;
    $('navTasks').textContent = state.data.tasks.length;
    $('navEmails').textContent = state.data.emails.filter(e => e.unread).length || 0;

  } catch(err){
    console.error('loadAllData:', err);
    toast('فشل تحميل البيانات');
  } finally {
    hideLoading();
  }
}

function syncUserUI(){
  if(!state.user) return;
  const name = state.profile?.name || state.user.user_metadata?.name || state.user.email?.split('@')[0] || 'مستخدم';
  $('sbUserName').textContent = name;
  $('sbUserAv').textContent = initials(name);
  $('sbUserRole').textContent = state.profile?.role || 'مدير عام';
}

/* ═══════════ ROUTER ═══════════ */
const PAGES = {
  dashboard:  { title:'لوحة التحكم',   sub:'نظرة عامة على أداء فريقك ومشاريعك', render:renderDashboard },
  projects:   { title:'المشاريع',      sub:'إدارة جميع مشاريع الشركة',          render:renderProjects },
  tasks:      { title:'المهام',        sub:'متابعة المهام وتوزيعها على الفريق', render:renderTasks },
  email:      { title:'البريد',        sub:'إرسال واستقبال الرسائل',            render:renderEmail },
  messages:   { title:'الرسائل',       sub:'محادثات فردية وجماعية',              render:renderMessages },
  calendar:   { title:'التقويم',       sub:'تنظيم مواعيدك واجتماعاتك',           render:renderCalendar },
  employees:  { title:'الموظفون',      sub:'إدارة الفريق والأدوار والصلاحيات',   render:renderEmployees },
  files:      { title:'الملفات',       sub:'رفع المستندات وتخزينها ومشاركتها',   render:renderFiles },
  reports:    { title:'التقارير',      sub:'متابعة أداء المشاريع والموظفين',      render:renderReports },
  ai:         { title:'الذكاء الاصطناعي', sub:'مساعدك الذكي لإدارة المهام',        render:renderAI },
  settings:   { title:'الإعدادات',     sub:'تخصيص المنصة والأمان',               render:renderSettings }
};

function navigate(page){
  if(!PAGES[page]) return;
  $$('.sb-item').forEach(el => el.classList.toggle('active', el.dataset.page === page));
  const info = PAGES[page];
  $('pageTitle').textContent = info.title;
  $('pageSub').textContent = info.sub;
  const c = $('content');
  c.innerHTML = '<div class="page-enter">' + info.render() + '</div>';
  c.scrollTop = 0;
  closeSidebar();
  if(page === 'email')    setTimeout(bindEmailEvents, 30);
  if(page === 'messages') setTimeout(bindMessagesEvents, 30);
  if(page === 'ai')       setTimeout(bindAIEvents, 30);
  if(page === 'settings') setTimeout(bindSettingsEvents, 30);
  history.replaceState(null, '', '#' + page);
}

/* ═══════════ DASHBOARD ═══════════ */
function renderDashboard(){
  const P = state.data.projects;
  const T = state.data.tasks;
  const E = state.data.emails;

  const stats = [
    { label:'المشاريع', value:P.length, trend:'+12%', up:true, ico:'folder' },
    { label:'المهام',   value:T.length, trend:'+8%',  up:true, ico:'check' },
    { label:'الرسائل',  value:E.length, trend:'+3',   up:true, ico:'mail' },
    { label:'الموظفون', value:state.data.employees.length, trend:'—', up:true, ico:'users' }
  ];

  const statCards = stats.map(s => `
    <div class="stat">
      <div class="stat-top">
        <div class="stat-ico">${ICONS[s.ico]}</div>
        <div class="stat-trend ${s.up?'up':'down'}">
          ${s.up ? ICONS.trendUp : ICONS.trendDown}
          ${s.trend}
        </div>
      </div>
      <div class="stat-val">${s.value}</div>
      <div class="stat-lbl">${s.label}</div>
    </div>`).join('');

  const recentTasks = T.slice(0,5).map(t => `
    <div class="list-item">
      <div class="av">${initials(t.assignee)}</div>
      <div class="li-body">
        <b>${escapeHtml(t.title)}</b>
        <span>${escapeHtml(t.project)} · ${escapeHtml(t.assignee)}</span>
      </div>
      <span class="badge ${t.priority.includes('عالي') ? 'dark' : ''}">${escapeHtml(t.priority)}</span>
    </div>`).join('') || '<div class="text-center text-muted" style="padding:30px;font-size:13px">لا توجد مهام بعد</div>';

  const projectRows = P.slice(0,5).map(p => `
    <tr>
      <td><b>${escapeHtml(p.name)}</b></td>
      <td>${p.team.length || 0} أعضاء</td>
      <td>
        <div style="min-width:100px">
          <div class="progress"><span style="width:${p.progress}%"></span></div>
          <div style="font-size:11px;font-weight:800;color:var(--text-3);margin-top:5px">${p.progress}%</div>
        </div>
      </td>
      <td><span class="badge ${p.status==='نشط'?'dark':''}">${escapeHtml(p.status)}</span></td>
      <td class="text-2" style="font-size:12px;font-weight:700">${formatDate(p.deadline)}</td>
    </tr>`).join('') || '<tr><td colspan="5" class="text-center text-muted" style="padding:30px">لا توجد مشاريع</td></tr>';

  const eventsList = state.data.events.slice(0,5).map(e => `
    <div class="event">
      <div class="event-time">${e.time}</div>
      <div class="event-body"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.desc)}</span></div>
    </div>`).join('') || '<div class="text-center text-muted" style="padding:20px;font-size:13px">لا توجد مواعيد</div>';

  return `
    <div class="grid g-4" style="margin-bottom:20px">${statCards}</div>

    <div class="grid g-2-1" style="margin-bottom:20px">
      <div class="card">
        <div class="card-hd">
          <div><h3>${ICONS.chart} أداء الأسبوع</h3><p>مقارنة الإنجاز اليومي</p></div>
          <span class="badge dark">+18%</span>
        </div>
        <div style="display:flex;align-items:flex-end;justify-content:space-around;gap:10px;height:180px;padding:10px 0">
          ${['السبت','الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة'].map((d,i) => {
            const h = [45,68,52,80,62,88,54][i];
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:10px;height:100%;justify-content:flex-end">
              <div style="width:100%;max-width:38px;border-radius:8px 8px 3px 3px;background:${i%2?'var(--gray-2)':'#000'};height:${h}%;transition:height 1s"></div>
              <div style="font-size:11px;color:var(--text-3);font-weight:800">${d}</div>
            </div>`;
          }).join('')}
        </div>
      </div>

      <div class="card">
        <div class="card-hd"><h3>${ICONS.cal} اجتماعات اليوم</h3></div>
        ${eventsList}
      </div>
    </div>

    <div class="grid g-1-2">
      <div class="card">
        <div class="card-hd"><h3>${ICONS.check} مهام قادمة</h3></div>
        ${recentTasks}
      </div>

      <div class="card">
        <div class="card-hd">
          <div><h3>${ICONS.folder} المشاريع النشطة</h3></div>
          <button class="btn btn-ghost" data-page="projects" style="padding:8px 14px;font-size:12.5px">عرض الكل</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>المشروع</th><th>الفريق</th><th>التقدم</th><th>الحالة</th><th>الموعد</th></tr></thead>
            <tbody>${projectRows}</tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════ PROJECTS ═══════════ */
function renderProjects(){
  const cards = state.data.projects.map(p => `
    <div class="card">
      <div class="card-hd" style="margin-bottom:16px">
        <div class="flex items-center gap-3">
          <div class="av lg">${initials(p.name)}</div>
          <div>
            <h3 style="font-size:15px">${escapeHtml(p.name)}</h3>
            <p>${p.tasks} مهمة · ${p.done} مكتملة</p>
          </div>
        </div>
        <span class="badge ${p.status==='نشط'?'dark':'light'}">${escapeHtml(p.status)}</span>
      </div>
      <div style="margin:18px 0">
        <div class="flex justify-between mb-2">
          <span class="text-sm font-bold">التقدم</span>
          <span class="text-sm font-bold">${p.progress}%</span>
        </div>
        <div class="progress"><span style="width:${p.progress}%"></span></div>
      </div>
      <div class="flex justify-between items-center" style="padding-top:16px;border-top:1px solid var(--border-2)">
        <div class="av-stack">${(p.team||[]).slice(0,4).map(m => `<div class="av sm">${initials(m)}</div>`).join('')}</div>
        <div style="text-align:left">
          <div class="text-sm text-muted" style="font-weight:700;font-size:11px">الموعد النهائي</div>
          <b style="font-size:13px">${formatDate(p.deadline)}</b>
        </div>
      </div>
    </div>`).join('') || '<div class="card text-center" style="grid-column:1/-1;padding:80px 20px"><h3 style="font-size:16px">لا توجد مشاريع بعد</h3><p style="color:var(--text-3);margin-top:8px;font-size:13px">ابدأ بإنشاء أول مشروع لك</p></div>';

  return `
    <div class="flex justify-between items-center mb-4">
      <button class="btn btn-primary" id="newProjBtn">${ICONS.plus} مشروع جديد</button>
      <span class="badge dark">${state.data.projects.length} مشروع</span>
    </div>
    <div class="grid g-3">${cards}</div>
  `;
}

/* ═══════════ TASKS ═══════════ */
function renderTasks(){
  const cols = {
    todo:     { name:'بانتظار البدء', color:'#d4d4d4', items: state.data.tasks.filter(t => t.status === 'todo') },
    progress: { name:'قيد التنفيذ',  color:'#000',    items: state.data.tasks.filter(t => t.status === 'progress') },
    review:   { name:'قيد المراجعة', color:'#737373', items: state.data.tasks.filter(t => t.status === 'review') },
    done:     { name:'مكتملة',       color:'#262626', items: state.data.tasks.filter(t => t.status === 'done') }
  };

  const kanban = Object.keys(cols).map(k => {
    const c = cols[k];
    return `
      <div class="kanban-col">
        <div class="kb-hd">
          <b><span class="kb-dot" style="background:${c.color}"></span> ${c.name}</b>
          <span class="count">${c.items.length}</span>
        </div>
        ${c.items.map(t => `
          <div class="kb-card">
            <b>${escapeHtml(t.title)}</b>
            <div style="font-size:11.5px;color:var(--text-3);font-weight:700;margin-bottom:12px">${escapeHtml(t.project)}</div>
            <div class="kb-meta">
              <div class="kb-tags">${(t.tags||[]).slice(0,2).map(tg => `<span class="kb-tag">${escapeHtml(tg)}</span>`).join('')}</div>
              <div class="av sm">${initials(t.assignee)}</div>
            </div>
          </div>`).join('') || '<div style="text-align:center;padding:24px;font-size:12px;color:var(--text-3)">لا مهام</div>'}
      </div>`;
  }).join('');

  return `
    <div class="flex justify-between items-center mb-4">
      <button class="btn btn-primary" id="newTaskBtn2">${ICONS.plus} مهمة جديدة</button>
      <span class="badge dark">${state.data.tasks.length} مهمة</span>
    </div>
    <div class="kanban">${kanban}</div>
  `;
}

/* ═══════════ EMAIL ═══════════ */
function renderEmail(){
  const emails = state.data.emails.map((e, i) => `
    <div class="email-item ${i === state.currentEmail ? 'active' : ''} ${e.unread ? 'unread' : ''}" data-idx="${i}">
      <div class="email-item-hd">
        <b>${escapeHtml(e.from)}</b>
        <span>${e.time}</span>
      </div>
      <div class="subj">${escapeHtml(e.subject)}</div>
      <div class="preview">${escapeHtml(e.preview)}</div>
    </div>`).join('') || '<div style="padding:50px;text-align:center;color:var(--text-3);font-size:13px">لا توجد رسائل بعد</div>';

  return `
    <div style="margin-bottom:18px">
      <button class="btn btn-primary" id="composeBtn">${ICONS.plus} رسالة جديدة</button>
    </div>
    <div class="email-layout">
      <div class="email-list">
        <div class="email-list-hd">
          <b>البريد الوارد</b>
          <span class="badge dark">${state.data.emails.filter(e => e.unread).length} غير مقروء</span>
        </div>
        <div class="email-items">${emails}</div>
      </div>
      <div class="email-view" id="emailView">${emailViewContent(state.data.emails[state.currentEmail])}</div>
    </div>
  `;
}

function emailViewContent(e){
  if(!e) return '<div class="text-center text-muted" style="padding:80px 20px;font-size:13px">اختر رسالة لعرضها</div>';
  return `
    <div class="email-view-hd">
      <div class="av lg">${initials(e.from)}</div>
      <div style="flex:1">
        <b style="font-size:15px;font-weight:900;display:block">${escapeHtml(e.from)}</b>
        <span class="text-sm text-muted">${escapeHtml(e.email)}</span>
      </div>
      <span class="text-sm text-muted">${e.time}</span>
    </div>
    <h2>${escapeHtml(e.subject)}</h2>
    <div class="email-view-body">${escapeHtml(e.body)}</div>
    <div style="margin-top:26px;display:flex;gap:10px">
      <button class="btn btn-primary">${ICONS.send} رد</button>
      <button class="btn btn-ghost">${ICONS.arrowR} تحويل</button>
    </div>
  `;
}

function bindEmailEvents(){
  $$('.email-item').forEach(item => {
    item.addEventListener('click', () => {
      const idx = +item.dataset.idx;
      state.currentEmail = idx;
      $$('.email-item').forEach(el => el.classList.toggle('active', +el.dataset.idx === idx));
      $('emailView').innerHTML = emailViewContent(state.data.emails[idx]);
    });
  });
  $('composeBtn')?.addEventListener('click', () => openModal('compose'));
}

/* ═══════════ MESSAGES ═══════════ */
function renderMessages(){
  if(!state.data.chats.length){
    return '<div class="card text-center" style="padding:100px 20px"><h3 style="font-size:16px">لا توجد محادثات بعد</h3><p style="color:var(--text-3);margin-top:8px;font-size:13px">ابدأ محادثة جديدة مع فريقك</p></div>';
  }

  const contacts = state.data.chats.map((c, i) => `
    <div class="msg-contact ${i === state.currentChat ? 'active' : ''}" data-idx="${i}">
      <div class="av">${c.av}</div>
      ${c.online ? '<span class="online"></span>' : ''}
      <div class="mc-info">
        <b>${escapeHtml(c.name)}</b>
        <span>${escapeHtml(c.last)}</span>
      </div>
      <div class="mc-meta">
        <span class="mc-time">${c.time}</span>
        ${c.unread ? `<span class="mc-unread">${c.unread}</span>` : ''}
      </div>
    </div>`).join('');

  const chat = state.data.chats[state.currentChat];
  const bubbles = chat.messages.map(m => `
    <div class="bubble ${m.from === 'me' ? 'me' : 'them'}">
      ${escapeHtml(m.text)}
      <div class="time">${m.time}</div>
    </div>`).join('') || '<div style="text-align:center;color:var(--text-3);font-size:13px;margin:auto">لا توجد رسائل</div>';

  return `
    <div class="msg-layout">
      <div class="msg-side">
        <div class="msg-side-hd"><b>المحادثات</b></div>
        <div class="msg-contacts" id="msgContacts">${contacts}</div>
      </div>
      <div class="msg-chat">
        <div class="msg-chat-hd">
          <div class="av">${chat.av}</div>
          <div class="info" style="flex:1">
            <b>${escapeHtml(chat.name)}</b>
            <span>${chat.online ? '● متصل الآن' : 'آخر ظهور مؤخراً'}</span>
          </div>
          <button class="icon-btn">${ICONS.more}</button>
        </div>
        <div class="msg-body" id="msgBody">${bubbles}</div>
        <div class="msg-foot">
          <textarea placeholder="اكتب رسالتك..." id="msgInput" rows="1"></textarea>
          <button class="msg-send" id="msgSend">${ICONS.send}</button>
        </div>
      </div>
    </div>
  `;
}

function bindMessagesEvents(){
  $$('.msg-contact').forEach(c => {
    c.addEventListener('click', () => {
      state.currentChat = +c.dataset.idx;
      navigate('messages');
    });
  });
  const body = $('msgBody');
  if(body) body.scrollTop = body.scrollHeight;
  $('msgSend')?.addEventListener('click', sendMsg);
  $('msgInput')?.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendMsg(); }
  });
}

async function sendMsg(){
  const inp = $('msgInput');
  const text = inp.value.trim();
  if(!text || !state.user) return;
  const chat = state.data.chats[state.currentChat];
  try {
    await sb.from('messages').insert({
      chat_id: chat.id, from_user: state.user.id, text
    });
    const time = new Date().toLocaleTimeString('ar-EG',{hour:'2-digit',minute:'2-digit'});
    chat.messages.push({ from:'me', text, time });
    chat.last = text;
    inp.value = '';
    navigate('messages');
  } catch(err){ toast('فشل الإرسال'); }
}

/* ═══════════ CALENDAR ═══════════ */
function renderCalendar(){
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = now.getDate();
  const monthNames = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  const dows = ['ح','ن','ث','ر','خ','ج','س'];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month+1, 0).getDate();
  const prevDays = new Date(year, month, 0).getDate();

  let days = [];
  for(let i = firstDay - 1; i >= 0; i--) days.push({ d: prevDays - i, muted: true });
  for(let i = 1; i <= daysInMonth; i++) days.push({ d: i, muted: false, today: i === today, event: [3,7,12,15,18,22,25].includes(i) });
  for(let i = 1; i <= 6; i++) days.push({ d: i, muted: true });

  const calDays = days.map(d => `
    <div class="cal-day ${d.muted?'muted':''} ${d.today?'today':''} ${d.event?'has-event':''}">${d.d}</div>
  `).join('');

  const eventsList = state.data.events.map(e => `
    <div class="event">
      <div class="event-time">${e.time}</div>
      <div class="event-body"><b>${escapeHtml(e.title)}</b><span>${escapeHtml(e.desc)}</span></div>
    </div>`).join('') || '<div class="text-center text-muted" style="padding:20px;font-size:13px">لا توجد مواعيد</div>';

  return `
    <div class="calendar-wrap">
      <div class="calendar">
        <div class="cal-hd">
          <b>${monthNames[month]} ${year}</b>
          <div class="cal-nav">
            <button>${ICONS.arrowR}</button>
            <button>${ICONS.arrowL}</button>
          </div>
        </div>
        <div class="cal-grid">
          ${dows.map(d => `<div class="cal-dow">${d}</div>`).join('')}
          ${calDays}
        </div>
      </div>
      <div class="events-list">
        <div class="card-hd"><h3>${ICONS.cal} مواعيد اليوم</h3></div>
        ${eventsList}
      </div>
    </div>
  `;
}

/* ═══════════ EMPLOYEES ═══════════ */
function renderEmployees(){
  const cards = state.data.employees.map(e => `
    <div class="emp-card">
      <div class="av">${initials(e.name)}</div>
      <b>${escapeHtml(e.name)}</b>
      <span class="role">${escapeHtml(e.role)}</span>
      <div class="emp-stats">
        <div class="emp-stat"><b>${e.tasks}</b><span>مهام</span></div>
        <div class="emp-stat"><b>${e.projects}</b><span>مشاريع</span></div>
      </div>
    </div>`).join('') || '<div class="card text-center" style="grid-column:1/-1;padding:80px"><h3 style="font-size:16px">لا يوجد موظفون</h3></div>';

  return `
    <div class="flex justify-between items-center mb-4">
      <span class="badge dark">${state.data.employees.length} موظف مسجّل</span>
    </div>
    <div class="emp-grid">${cards}</div>
  `;
}

/* ═══════════ FILES ═══════════ */
function renderFiles(){
  const files = state.data.files.map(f => `
    <div class="file-card">
      <div class="file-ico">${ICONS.file}</div>
      <b>${escapeHtml(f.name)}</b>
      <span>${f.size} · ${f.date}</span>
    </div>`).join('') || '<div class="card text-center" style="grid-column:1/-1;padding:80px"><h3 style="font-size:16px">لا توجد ملفات</h3></div>';

  return `
    <div class="flex justify-between items-center mb-4">
      <span class="badge dark">${state.data.files.length} ملف</span>
    </div>
    <div class="file-grid">${files}</div>
  `;
}

/* ═══════════ REPORTS ═══════════ */
function renderReports(){
  const P = state.data.projects;
  const T = state.data.tasks;

  const stats = [
    { label:'المشاريع', value:P.length, trend:'+12%', up:true, ico:'folder' },
    { label:'مكتملة',   value:T.filter(t=>t.status==='done').length, trend:'+8%', up:true, ico:'check' },
    { label:'الرسائل',  value:state.data.emails.length, trend:'+3', up:true, ico:'mail' },
    { label:'الموظفون', value:state.data.employees.length, trend:'—', up:true, ico:'users' }
  ];

  const teamBars = state.data.employees.slice(0,6).map(e => {
    const pct = Math.min(100, (e.tasks || 0) * 4 || 55);
    return `
      <div style="margin-bottom:22px">
        <div class="flex justify-between mb-2">
          <span style="font-size:12.5px;font-weight:800">${escapeHtml(e.name)}</span>
          <span style="font-size:12.5px;font-weight:800;color:var(--text-3)">${pct}%</span>
        </div>
        <div class="progress"><span style="width:${pct}%"></span></div>
      </div>`;
  }).join('') || '<div class="text-center text-muted" style="padding:20px;font-size:13px">لا توجد بيانات</div>';

  return `
    <div class="grid g-4" style="margin-bottom:20px">
      ${stats.map(s => `
        <div class="stat">
          <div class="stat-top">
            <div class="stat-ico">${ICONS[s.ico]}</div>
            <div class="stat-trend ${s.up?'up':'down'}">${s.up?ICONS.trendUp:ICONS.trendDown} ${s.trend}</div>
          </div>
          <div class="stat-val">${s.value}</div>
          <div class="stat-lbl">${s.label}</div>
        </div>`).join('')}
    </div>

    <div class="grid g-2">
      <div class="card">
        <div class="card-hd"><h3>${ICONS.chart} أداء الفريق</h3></div>
        ${teamBars}
      </div>
      <div class="card">
        <div class="card-hd"><h3>${ICONS.folder} تقرير المشاريع</h3></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>المشروع</th><th>التقدم</th><th>الحالة</th></tr></thead>
            <tbody>${P.map(p => `
              <tr>
                <td><b>${escapeHtml(p.name)}</b></td>
                <td>
                  <div style="min-width:80px">
                    <div class="progress"><span style="width:${p.progress}%"></span></div>
                    <div style="font-size:11px;font-weight:800;color:var(--text-3);margin-top:5px">${p.progress}%</div>
                  </div>
                </td>
                <td><span class="badge ${p.status==='نشط'?'dark':''}">${escapeHtml(p.status)}</span></td>
              </tr>`).join('') || '<tr><td colspan="3" class="text-center text-muted" style="padding:30px">لا توجد بيانات</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

/* ═══════════ AI ═══════════ */
function renderAI(){
  const name = state.profile?.name || 'مستخدم';
  return `
    <div class="ai-layout">
      <div class="ai-chat">
        <div class="ai-hd">
          <div class="ai-av">${ICONS.ai}</div>
          <div class="ai-info">
            <b>مساعد MEN Office الذكي</b>
            <span>● متاح دائماً</span>
          </div>
        </div>
        <div class="ai-body" id="aiBody">
          <div class="ai-msg">
            <div class="av">AI</div>
            <div class="bubble-ai">مرحباً ${escapeHtml(name)}! 👋<br>يمكنني مساعدتك في:<br>• كتابة الرسائل والإيميلات<br>• تلخيص المستندات والتقارير<br>• إدارة المهام وتنظيمها<br>• اقتراح أفكار إبداعية<br><br>كيف يمكنني مساعدتك اليوم؟</div>
          </div>
        </div>
        <div class="msg-foot">
          <textarea placeholder="اسألني أي شيء..." id="aiInput" rows="1"></textarea>
          <button class="msg-send" id="aiSend">${ICONS.send}</button>
        </div>
      </div>
      <div class="ai-suggest">
        <h4>اقتراحات سريعة</h4>
        <button data-prompt="اكتب لي إيميل احترافي لطلب اجتماع مع عميل جديد">📧 اكتب إيميل احترافي</button>
        <button data-prompt="لخّص لي اجتماع فريق التطوير الأخير في 5 نقاط">📝 لخّص اجتماعاً</button>
        <button data-prompt="اقترح عليّ خطة تسويقية لحملة جديدة">💡 خطة تسويقية</button>
        <button data-prompt="أنشئ لي جدول مهام أسبوعي لفريق من 5 أشخاص">📅 نظّم مهام الفريق</button>
        <button data-prompt="اكتب رسالة شكر احترافية لعميل قديم">💌 رسالة شكر</button>
      </div>
    </div>
  `;
}

function bindAIEvents(){
  const body = $('aiBody');
  if(body) body.scrollTop = body.scrollHeight;
  $('aiSend')?.addEventListener('click', sendAI);
  $('aiInput')?.addEventListener('keydown', e => {
    if(e.key === 'Enter' && !e.shiftKey){ e.preventDefault(); sendAI(); }
  });
  $$('.ai-suggest button').forEach(b => {
    b.addEventListener('click', () => {
      $('aiInput').value = b.dataset.prompt;
      sendAI();
    });
  });
}

function sendAI(){
  const inp = $('aiInput');
  const text = inp.value.trim();
  if(!text) return;
  const body = $('aiBody');
  const name = state.profile?.name || 'أنا';

  body.insertAdjacentHTML('beforeend', `
    <div class="ai-msg user">
      <div class="av">${initials(name)}</div>
      <div class="bubble-ai">${escapeHtml(text)}</div>
    </div>
  `);
  inp.value = '';
  body.scrollTop = body.scrollHeight;

  setTimeout(() => {
    const reply = getAIResponse(text);
    body.insertAdjacentHTML('beforeend', `
      <div class="ai-msg">
        <div class="av">AI</div>
        <div class="bubble-ai">${reply}</div>
      </div>
    `);
    body.scrollTop = body.scrollHeight;
  }, 700);
}

function getAIResponse(q){
  const l = q.toLowerCase();
  if(l.includes('إيميل') || l.includes('ايميل') || l.includes('بريد'))
    return 'إليك مسودة إيميل احترافي:<br><br><b>الموضوع:</b> طلب اجتماع لمناقشة فرص التعاون<br><br>السلام عليكم،<br><br>أتمنى أن تكون بخير. أود أن أقترح عقد اجتماع لمناقشة سبل التعاون المستقبلية بيننا.<br><br>هل يناسبك يوم [التاريخ] الساعة [الوقت]؟<br><br>مع التقدير.';
  if(l.includes('لخّص') || l.includes('ملخص'))
    return '📝 <b>ملخص الاجتماع:</b><br>1. تمت مراجعة الإنجازات الأسبوعية<br>2. مناقشة تحديات الأداء وحلولها<br>3. إقرار خطة الأسبوع القادم<br>4. تحديد KPIs جديدة<br>5. الاتفاق على موعد الاجتماع القادم';
  if(l.includes('تسويق') || l.includes('حملة'))
    return '💡 <b>خطة تسويقية مقترحة:</b><br>1. <b>الوعي:</b> حملات على السوشيال ميديا (40%)<br>2. <b>التفاعل:</b> محتوى تعليمي (25%)<br>3. <b>التحويل:</b> إعلانات مدفوعة (25%)<br>4. <b>الاحتفاظ:</b> برنامج ولاء (10%)';
  if(l.includes('جدول') || l.includes('مهام'))
    return '📅 <b>جدول مهام أسبوعي:</b><br>• <b>الأحد:</b> اجتماع تخطيط<br>• <b>الاثنين-الثلاثاء:</b> تنفيذ المهام<br>• <b>الأربعاء:</b> مراجعة منتصف الأسبوع<br>• <b>الخميس:</b> إكمال وتسليم<br>• <b>الجمعة:</b> تقرير أسبوعي';
  if(l.includes('شكر'))
    return '💌 <b>رسالة شكر احترافية:</b><br><br>عزيزي [العميل]،<br><br>أتقدم إليكم بجزيل الشكر على ثقتكم الغالية وتعاونكم المثمر معنا. نتطلع لمواصلة تقديم أفضل الخدمات لكم.<br><br>مع خالص التقدير.';
  return 'شكراً لك! يمكنني مساعدتك في:<br>• ✍️ كتابة الإيميلات<br>• 📝 تلخيص الاجتماعات<br>• 📊 إنشاء التقارير<br>• 💡 اقتراح الأفكار<br>• 📅 تنظيم المهام<br><br>اكتب طلبك بوضوح.';
}

/* ═══════════ SETTINGS ═══════════ */
function renderSettings(){
  const p = state.profile || {};
  const u = state.user;
  return `
    <div class="settings-grid">
      <div class="setting-card">
        <h3>${ICONS.users} حسابي</h3>
        <div class="setting-row">
          <div class="sr-info"><b>الاسم</b><span>${escapeHtml(p.name || '—')}</span></div>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>البريد</b><span>${escapeHtml(u?.email || '—')}</span></div>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>رقم العضوية</b><span>#${String(u?.id || '').slice(0,8).toUpperCase()}</span></div>
        </div>
      </div>

      <div class="setting-card">
        <h3>${ICONS.bell} الإشعارات</h3>
        <div class="setting-row">
          <div class="sr-info"><b>إشعارات البريد</b><span>عند وصول رسالة</span></div>
          <div class="switch on"></div>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>إشعارات المهام</b><span>عند إسناد مهمة</span></div>
          <div class="switch on"></div>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>الاجتماعات</b><span>قبل الموعد بـ 15 دقيقة</span></div>
          <div class="switch on"></div>
        </div>
      </div>

      <div class="setting-card">
        <h3>${ICONS.shield} الأمان</h3>
        <div class="setting-row">
          <div class="sr-info"><b>الجلسة الحالية</b><span>جهازك الحالي</span></div>
          <span class="badge dark">نشط</span>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>آخر تسجيل دخول</b><span>${new Date().toLocaleDateString('ar-EG')}</span></div>
        </div>
      </div>

      <div class="setting-card">
        <h3>${ICONS.check} عن المنصة</h3>
        <div class="setting-row">
          <div class="sr-info"><b>الإصدار</b><span>1.0.0</span></div>
        </div>
        <div class="setting-row">
          <div class="sr-info"><b>اللغة</b><span>العربية (RTL)</span></div>
          <span class="badge">عربي</span>
        </div>
      </div>
    </div>
  `;
}

function bindSettingsEvents(){
  $$('.switch').forEach(el => el.addEventListener('click', () => el.classList.toggle('on')));
}

/* ═══════════ MODAL ═══════════ */
function openModal(type){
  const m = $('modal');
  if(type === 'task'){
    m.innerHTML = `
      <button class="icon-btn" style="position:absolute;top:18px;left:18px" onclick="MEN.closeModal()">${ICONS.close}</button>
      <h2>مهمة جديدة</h2>
      <p class="sub">أضف مهمة جديدة وحدّد تفاصيلها</p>
      <div class="field"><label>عنوان المهمة</label><input type="text" id="mTaskTitle" placeholder="مثال: تصميم صفحة الهبوط"></div>
      <div class="field"><label>المشروع</label><input type="text" id="mTaskProject" placeholder="عام"></div>
      <div class="field"><label>المسؤول</label>
        <select id="mTaskAssignee">${state.data.employees.map(e => `<option value="${escapeHtml(e.name)}">${escapeHtml(e.name)}</option>`).join('') || '<option>غير محدد</option>'}</select>
      </div>
      <div class="field"><label>الأولوية</label>
        <select id="mTaskPriority"><option>عالية</option><option>متوسطة</option><option>عادية</option></select>
      </div>
      <button class="btn btn-primary w-full" id="mSaveTask" style="margin-top:8px;padding:15px">${ICONS.check} حفظ المهمة</button>
    `;
    setTimeout(() => $('mSaveTask')?.addEventListener('click', saveTask), 30);
  } else if(type === 'compose'){
    m.innerHTML = `
      <button class="icon-btn" style="position:absolute;top:18px;left:18px" onclick="MEN.closeModal()">${ICONS.close}</button>
      <h2>رسالة جديدة</h2>
      <p class="sub">أرسل رسالة بريد إلكتروني</p>
      <div class="field"><label>إلى</label><input type="email" id="mEmailTo" placeholder="name@example.com" dir="ltr" style="text-align:right"></div>
      <div class="field"><label>الاسم</label><input type="text" id="mEmailName" placeholder="الاسم"></div>
      <div class="field"><label>الموضوع</label><input type="text" id="mEmailSubject" placeholder="الموضوع"></div>
      <div class="field"><label>الرسالة</label><textarea id="mEmailBody" rows="6" placeholder="اكتب رسالتك..."></textarea></div>
      <button class="btn btn-primary w-full" id="mSendEmail" style="margin-top:8px;padding:15px">${ICONS.send} إرسال</button>
    `;
    setTimeout(() => $('mSendEmail')?.addEventListener('click', sendEmail), 30);
  }
  $('modalOverlay').classList.add('on');
}
const closeModal = () => $('modalOverlay').classList.remove('on');

async function saveTask(){
  const title = $('mTaskTitle').value.trim();
  const project = $('mTaskProject').value.trim() || 'عام';
  const assignee = $('mTaskAssignee').value;
  const priority = $('mTaskPriority').value;
  if(!title){ toast('أدخل عنوان المهمة'); return; }
  try {
    const { error } = await sb.from('tasks').insert({
      user_id: state.user.id, title, project, assignee, priority, status:'todo'
    });
    if(error) throw error;
    closeModal();
    toast('تمت إضافة المهمة ✓');
    await loadAllData();
    navigate('tasks');
  } catch(err){ toast('فشل الحفظ'); }
}

async function sendEmail(){
  const to = $('mEmailTo').value.trim();
  const toName = $('mEmailName').value.trim();
  const subject = $('mEmailSubject').value.trim();
  const body = $('mEmailBody').value.trim();
  if(!to || !subject || !body){ toast('أكمل الحقول'); return; }
  try {
    const { error } = await sb.from('emails').insert({
      user_id: state.user.id, to_email: to, to_name: toName,
      from_name: state.profile?.name || state.user.email,
      from_email: state.user.email,
      subject, body, is_read: true
    });
    if(error) throw error;
    closeModal();
    toast('تم الإرسال ✓');
    window.location.href = `mailto:${encodeURIComponent(to)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    await loadAllData();
    navigate('email');
  } catch(err){ toast('فشل الإرسال'); }
}

/* ═══════════ UI ═══════════ */
const openSidebar  = () => { $('sidebar').classList.add('open'); $('sidebarOverlay').classList.add('on'); };
const closeSidebar = () => { $('sidebar').classList.remove('open'); $('sidebarOverlay').classList.remove('on'); };

/* ═══════════ Session ═══════════ */
async function handleSession(session){
  if(session?.user){
    state.user = session.user;
    $('authScreen').style.display = 'none';
    $('app').style.display = 'flex';
    await loadAllData();
    syncUserUI();
    const hash = location.hash.replace('#','');
    navigate(PAGES[hash] ? hash : 'dashboard');
  } else {
    state.user = null;
    $('authScreen').style.display = 'grid';
    $('app').style.display = 'none';
  }
}

/* ═══════════ Init ═══════════ */
async function init(){
  // Auth
  $$('.auth-mode button').forEach(t => t.addEventListener('click', () => switchAuthMode(t.dataset.tab)));
  $('authSubmit')?.addEventListener('click', handleAuth);
  $('authPassword')?.addEventListener('keydown', e => { if(e.key === 'Enter') handleAuth(); });
  $('authEmail')?.addEventListener('keydown', e => { if(e.key === 'Enter') $('authPassword').focus(); });

  // Nav
  $$('.sb-item').forEach(el => el.addEventListener('click', () => navigate(el.dataset.page)));
  document.addEventListener('click', e => {
    const btn = e.target.closest('[data-page]');
    if(btn && !btn.classList.contains('sb-item')) navigate(btn.dataset.page);
    if(e.target.id === 'newTaskBtn2') openModal('task');
  });

  // UI
  $('menuBtn')?.addEventListener('click', openSidebar);
  $('sidebarOverlay')?.addEventListener('click', closeSidebar);
  $('logoutBtn')?.addEventListener('click', logout);
  $('newTaskBtn')?.addEventListener('click', () => openModal('task'));

  $('modalOverlay')?.addEventListener('click', e => {
    if(e.target === $('modalOverlay')) closeModal();
  });

  document.addEventListener('keydown', e => {
    if(e.key === 'Escape') closeModal();
    if((e.metaKey || e.ctrlKey) && e.key === 'k'){ e.preventDefault(); $('globalSearch')?.focus(); }
  });

  // Auth listener
  sb.auth.onAuthStateChange((event, session) => {
    if(event === 'SIGNED_OUT'){
      state.user = null;
      $('authScreen').style.display = 'grid';
      $('app').style.display = 'none';
    } else if(event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED'){
      handleSession(session);
    }
  });

  // Current session
  const { data: { session } } = await sb.auth.getSession();
  await handleSession(session);
}

window.MEN = { closeModal, saveTask, sendEmail, navigate };

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

})();
