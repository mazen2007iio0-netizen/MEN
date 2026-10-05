// ============================================================
// سومها — لوحة تحكم المشرفين (admin.js) — مستقلة تماماً
// لا تعتمد على so.js أو SUMHA
// ============================================================
(function(){
  const CFG = window.SUMHA_CONFIG || {};
  const SBC = window.SUPABASE_CONFIG;
  let sb = null;
  const st = { user:null, role:null, page:'dashboard', users:[], auctions:[], orders:[], admins:[], settings:{} };

  const $ = id => document.getElementById(id);
  const esc = s => String(s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const fmt = n => Number(n||0).toLocaleString('en-US');
  const fmtDate = d => d ? new Date(d).toLocaleString('ar-SA',{dateStyle:'short',timeStyle:'short'}) : '—';
  const fmtDTLocal = d => { const x=new Date(d), p=n=>String(n).padStart(2,'0'); return `${x.getFullYear()}-${p(x.getMonth()+1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`; };
  function toast(m){ const t=$('toast'); if(!t) return; t.textContent=m; t.classList.add('show'); clearTimeout(t._t); t._t=setTimeout(()=>t.classList.remove('show'),2400); }
  const openModal = id => $(id)?.classList.add('on');
  const closeModal = id => $(id)?.classList.remove('on');

  const CATEGORIES = CFG.categories || [
    {name:"سيارات ومركبات"},{name:"إلكترونيات"},{name:"أجهزة وتقنية"},
    {name:"عقارات"},{name:"مقتنيات"},{name:"ساعات ومجوهرات"},
    {name:"أثاث"},{name:"منتجات متنوعة"}
  ];

  // ============ Boot ============
  async function boot(){
    const logoUrl = CFG.logo || 'https://www.socialcreator.com/srv/imgs/ti_imgs/202750_332160.png';
    if($('logoImgAdmin')) $('logoImgAdmin').src = logoUrl;

    if(!window.supabase || !SBC?.url || !SBC?.anonKey || SBC.anonKey.includes("ضع_هنا")){
      $('view').innerHTML = `<div class="empty"><div class="e-ico">⚠️</div><h3>Supabase غير مُهيأ</h3><p>تحقق من <code>somha/supabase-config.js</code></p></div>`;
      return;
    }

    sb = window.supabase.createClient(SBC.url, SBC.anonKey);

    const { data: { session } } = await sb.auth.getSession();
    if(!session){
      $('view').innerHTML = `
        <div class="empty">
          <div class="e-ico">🔒</div>
          <h3>يجب تسجيل الدخول أولاً</h3>
          <p>سجّل دخولك من الموقع الرئيسي ثم ارجع لهذه الصفحة</p>
          <p style="margin-top:14px"><a href="index.html" class="btn btn-primary" style="display:inline-flex;text-decoration:none;padding:12px 22px">← الذهاب للموقع</a></p>
        </div>`;
      return;
    }

    // تحقق من صلاحية المشرف
    const { data: adminRow, error: adminErr } = await sb
      .from('admins').select('role').eq('id', session.user.id).maybeSingle();

    if(adminErr){
      $('view').innerHTML = `<div class="empty"><div class="e-ico">⚠️</div><h3>خطأ في الاتصال</h3><p>${esc(adminErr.message)}</p></div>`;
      return;
    }

    if(!adminRow){
      $('view').innerHTML = `
        <div class="empty">
          <div class="e-ico">🚫</div>
          <h3>غير مصرح لك بالدخول</h3>
          <p>حسابك غير مضاف كمشرف. لتفعيله، افتح Supabase → SQL Editor ونفّذ:</p>
          <code>insert into public.admins (id, role)<br>values ('${session.user.id}', 'super_admin');</code>
          <p style="margin-top:16px;font-size:12px">معرّف حسابك (UUID):</p>
          <code style="margin-top:6px">${session.user.id}</code>
          <p style="margin-top:14px">ثم حدّث هذه الصفحة 🔄</p>
        </div>`;
      return;
    }

    st.user = session.user;
    st.role = adminRow.role;
    $('roleTag').textContent = adminRow.role === 'super_admin' ? 'مشرف عام' : 'مشرف';
    await loadAll();
    nav('dashboard');
  }

  async function loadAll(){
    try {
      const [u, a, o, ad, s] = await Promise.all([
        sb.from('profiles').select('*').order('created_at',{ascending:false}),
        sb.from('auctions').select('*, seller:profiles!auctions_seller_id_fkey(full_name), bids(count)').order('created_at',{ascending:false}),
        sb.from('orders').select('*, auction:auctions(title), buyer:profiles!orders_buyer_id_fkey(full_name, phone), seller:profiles!orders_seller_id_fkey(full_name, phone)').order('created_at',{ascending:false}),
        sb.from('admins').select('*, profile:profiles!admins_id_fkey(full_name, phone, email)'),
        sb.from('settings').select('key, value')
      ]);
      st.users = u.data||[];
      st.auctions = a.data||[];
      st.orders = o.data||[];
      st.admins = ad.data||[];
      st.settings = {};
      (s.data||[]).forEach(x => st.settings[x.key] = x.value);
    } catch(e){
      console.error(e);
      toast('خطأ في تحميل البيانات');
    }
  }

  function nav(page){
    st.page = page;
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.toggle('on', n.dataset.page===page));
    document.querySelectorAll('.mob-bar button').forEach(b=>b.classList.toggle('on', b.dataset.page===page));
    const titles = {
      dashboard:['لوحة التحكم','نظرة سريعة على الموقع'],
      auctions:['المزادات','إدارة كاملة'],
      users:['العملاء','قائمة كاملة بالمستخدمين'],
      orders:['الطلبات','إدارة الطلبات'],
      admins:['المشرفون','إدارة الصلاحيات'],
      settings:['الإعدادات','هوية الموقع']
    };
    $('pageTitle').textContent = titles[page][0];
    $('pageSub').textContent = titles[page][1];
    renderActions();
    render();
  }

  function renderActions(){
    const el = $('topActions');
    if(st.page==='auctions'){
      el.innerHTML = `<button class="btn btn-primary" onclick="ADMIN.openAuctionForm()">➕ إنشاء مزاد</button>`;
    } else if(st.page==='admins'){
      el.innerHTML = `<button class="btn btn-primary" onclick="ADMIN.openAdminForm()">➕ إضافة مشرف</button>`;
    } else {
      el.innerHTML = `<button class="btn btn-ghost" onclick="ADMIN.reload()">🔄 تحديث</button>`;
    }
  }

  async function reload(){ await loadAll(); render(); toast('تم التحديث ✅'); }

  function render(){
    const v = $('view');
    switch(st.page){
      case 'dashboard': v.innerHTML = renderDashboard(); break;
      case 'auctions': v.innerHTML = renderAuctions(); break;
      case 'users': v.innerHTML = renderUsers(); break;
      case 'orders': v.innerHTML = renderOrders(); break;
      case 'admins': v.innerHTML = renderAdmins(); break;
      case 'settings': v.innerHTML = renderSettings(); break;
    }
  }

  function renderDashboard(){
    const active = st.auctions.filter(a => new Date(a.end_time) > new Date()).length;
    const totalBids = st.auctions.reduce((s,a) => s + (a.bids?.[0]?.count||0), 0);
    const pendingOrders = st.orders.filter(o => o.status === 'pending').length;
    const revenue = st.orders.filter(o => o.status === 'delivered').reduce((s,o) => s + Number(o.amount||0), 0);
    return `
      <div class="stats-grid">
        <div class="stat-card"><div class="ic">👥</div><div class="val">${st.users.length}</div><div class="lbl">إجمالي العملاء</div></div>
        <div class="stat-card"><div class="ic">🔨</div><div class="val">${st.auctions.length}</div><div class="lbl">إجمالي المزادات</div></div>
        <div class="stat-card"><div class="ic">🔴</div><div class="val">${active}</div><div class="lbl">مزادات نشطة</div></div>
        <div class="stat-card"><div class="ic">💰</div><div class="val">${totalBids}</div><div class="lbl">إجمالي المزايدات</div></div>
        <div class="stat-card"><div class="ic">🧾</div><div class="val">${st.orders.length}</div><div class="lbl">إجمالي الطلبات</div></div>
        <div class="stat-card"><div class="ic">⏳</div><div class="val">${pendingOrders}</div><div class="lbl">قيد الانتظار</div></div>
        <div class="stat-card"><div class="ic">💵</div><div class="val">${fmt(revenue)}</div><div class="lbl">الإيرادات (ر.س)</div></div>
        <div class="stat-card"><div class="ic">👑</div><div class="val">${st.admins.length}</div><div class="lbl">المشرفون</div></div>
      </div>

      <div class="card">
        <div class="card-hdr"><h2>🔨 أحدث المزادات</h2></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>المنتج</th><th>البائع</th><th>السعر الحالي</th><th>المزايدات</th><th>الحالة</th></tr></thead>
          <tbody>${st.auctions.slice(0,6).map(a => `
            <tr>
              <td>${esc(a.title)}</td>
              <td>${esc(a.seller?.full_name||'—')}</td>
              <td><b style="color:var(--maroon)">${fmt(a.current_price)} ر.س</b></td>
              <td>${a.bids?.[0]?.count||0}</td>
              <td>${new Date(a.end_time) > new Date() ? '<span class="tag live">نشط</span>' : '<span class="tag ended">انتهى</span>'}</td>
            </tr>`).join('') || '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:30px">لا توجد مزادات</td></tr>'}
          </tbody>
        </table></div>
      </div>

      <div class="card">
        <div class="card-hdr"><h2>👥 أحدث العملاء</h2></div>
        <div class="tbl-wrap"><table>
          <thead><tr><th>الاسم</th><th>البريد</th><th>الجوال</th><th>التسجيل</th></tr></thead>
          <tbody>${st.users.slice(0,6).map(u => `
            <tr>
              <td><div class="user-cell"><div class="av">${esc((u.full_name||'?')[0])}</div>${esc(u.full_name||'—')}</div></td>
              <td style="direction:ltr;text-align:right;font-size:12px">${esc(u.email||'—')}</td>
              <td style="direction:ltr;text-align:right">${esc(u.phone||'—')}</td>
              <td>${fmtDate(u.created_at)}</td>
            </tr>`).join('') || '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:30px">لا يوجد عملاء</td></tr>'}
          </tbody>
        </table></div>
      </div>`;
  }

  function renderAuctions(){
    return `<div class="card">
      <div class="card-hdr"><h2>🔨 جميع المزادات (${st.auctions.length})</h2></div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>الصورة</th><th>المنتج</th><th>التصنيف</th><th>البائع</th>
          <th>السعر</th><th>الزيادة</th><th>الحالة</th><th>النهاية</th><th>إجراءات</th>
        </tr></thead>
        <tbody>${st.auctions.map(a => {
          const live = new Date(a.end_time) > new Date();
          return `<tr>
            <td>${a.image_url ? `<img src="${a.image_url}" class="thumb" onerror="this.style.display='none'">` : `<div class="thumb" style="display:flex;align-items:center;justify-content:center;background:var(--cream2);font-size:22px">📦</div>`}</td>
            <td><b>${esc(a.title)}</b>${a.featured?' <span class="tag featured">⭐</span>':''}</td>
            <td>${esc(a.category||'—')}</td>
            <td>${esc(a.seller?.full_name||'—')}</td>
            <td><b style="color:var(--maroon)">${fmt(a.current_price)} ر.س</b></td>
            <td>${fmt(a.min_increment)} ر.س</td>
            <td>${live?'<span class="tag live">مباشر</span>':'<span class="tag ended">انتهى</span>'}</td>
            <td>${fmtDate(a.end_time)}</td>
            <td><div class="actions-cell">
              <button class="btn btn-ghost btn-sm" onclick="ADMIN.openAuctionForm('${a.id}')">✏️ تعديل</button>
              <button class="btn btn-danger btn-sm" onclick="ADMIN.deleteAuction('${a.id}')">🗑️</button>
            </div></td>
          </tr>`;
        }).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px">لا توجد مزادات</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  }

  function renderUsers(){
    return `<div class="card">
      <div class="card-hdr"><h2>👥 كشف العملاء (${st.users.length})</h2></div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>#</th><th>الاسم</th><th>البريد الإلكتروني</th><th>الجوال</th>
          <th>التقييم</th><th>المبيعات</th><th>المشتريات</th><th>التسجيل</th><th>إجراءات</th>
        </tr></thead>
        <tbody>${st.users.map((u,i) => `
          <tr>
            <td>${i+1}</td>
            <td><div class="user-cell"><div class="av">${esc((u.full_name||'?')[0])}</div>${esc(u.full_name||'—')}</div></td>
            <td style="direction:ltr;text-align:right;font-size:12.5px">${esc(u.email||'—')}</td>
            <td style="direction:ltr;text-align:right">${esc(u.phone||'—')}</td>
            <td><span style="color:var(--gold)">★</span> ${(u.rating||5).toFixed(1)}</td>
            <td>${u.sales||0}</td>
            <td>${u.purchases||0}</td>
            <td>${fmtDate(u.created_at)}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="ADMIN.viewUser('${u.id}')">👁️ عرض</button></td>
          </tr>`).join('') || '<tr><td colspan="9" style="text-align:center;color:var(--muted);padding:30px">لا يوجد عملاء</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  }

  function renderOrders(){
    return `<div class="card">
      <div class="card-hdr"><h2>🧾 الطلبات (${st.orders.length})</h2></div>
      <div class="tbl-wrap"><table>
        <thead><tr>
          <th>#</th><th>المزاد</th><th>المشتري</th><th>البائع</th>
          <th>المبلغ</th><th>الحالة</th><th>التاريخ</th><th>إجراءات</th>
        </tr></thead>
        <tbody>${st.orders.map((o,i) => `
          <tr>
            <td>${i+1}</td>
            <td>${esc(o.auction?.title||'—')}</td>
            <td>${esc(o.buyer?.full_name||'—')}<br><small style="color:var(--muted)">${esc(o.buyer?.phone||'')}</small></td>
            <td>${esc(o.seller?.full_name||'—')}</td>
            <td><b style="color:var(--maroon)">${fmt(o.amount)} ر.س</b></td>
            <td><span class="tag st-${o.status}">${statusLabel(o.status)}</span></td>
            <td>${fmtDate(o.created_at)}</td>
            <td><button class="btn btn-ghost btn-sm" onclick="ADMIN.viewOrder('${o.id}')">👁️ تفاصيل</button></td>
          </tr>`).join('') || '<tr><td colspan="8" style="text-align:center;color:var(--muted);padding:30px">لا توجد طلبات</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  }
  const statusLabel = s => ({pending:'قيد الانتظار',confirmed:'مؤكد',shipped:'تم الشحن',delivered:'تم التسليم',cancelled:'ملغي'}[s]||s);

  function renderAdmins(){
    return `<div class="card">
      <div class="card-hdr"><h2>👑 المشرفون (${st.admins.length})</h2></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>#</th><th>الاسم</th><th>البريد</th><th>الجوال</th><th>الدور</th><th>إجراءات</th></tr></thead>
        <tbody>${st.admins.map((a,i) => `
          <tr>
            <td>${i+1}</td>
            <td><div class="user-cell"><div class="av">${esc((a.profile?.full_name||'?')[0])}</div>${esc(a.profile?.full_name||'—')}</div></td>
            <td style="direction:ltr;text-align:right;font-size:12px">${esc(a.profile?.email||'—')}</td>
            <td style="direction:ltr;text-align:right">${esc(a.profile?.phone||'—')}</td>
            <td><span class="tag role-${a.role}">${a.role==='super_admin'?'مشرف عام':'مشرف'}</span></td>
            <td>${st.role==='super_admin' && a.id!==st.user.id ? `<button class="btn btn-danger btn-sm" onclick="ADMIN.removeAdmin('${a.id}')">🗑️ إزالة</button>` : '<span style="color:var(--muted);font-size:12px">—</span>'}</td>
          </tr>`).join('') || '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:30px">لا يوجد مشرفون</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  }

  function renderSettings(){
    const s = st.settings || {};
    return `<div class="card">
      <div class="card-hdr"><h2>⚙️ الإعدادات والشعار</h2></div>
      <form onsubmit="ADMIN.saveSettings(event)">
        <div class="field">
          <label>رابط الشعار (Logo URL) *</label>
          <input id="sLogo" value="${esc(s.logo_url||CFG.logo||'')}" required style="direction:ltr">
        </div>
        <div class="field">
          <label>معاينة الشعار</label>
          <div style="background:var(--cream);border:1.5px solid var(--line);border-radius:12px;padding:14px;text-align:center">
            <img src="${esc(s.logo_url||CFG.logo||'')}" style="height:80px;object-fit:contain;margin:0 auto" onerror="this.style.opacity=.3">
          </div>
        </div>
        <div class="row2">
          <div class="field"><label>اسم الموقع</label><input id="sName" value="${esc(s.site_name||'سومها')}"></div>
          <div class="field"><label>الشعار النصي</label><input id="sTag" value="${esc(s.tagline||'أعلى سوم يفوز')}"></div>
        </div>
        <div class="field"><label>عنوان الهيرو</label><input id="sHeroTitle" value="${esc(s.hero_title||'')}"></div>
        <div class="field"><label>وصف الهيرو</label><textarea id="sHeroSub" rows="2">${esc(s.hero_subtitle||'')}</textarea></div>
        <div class="row2">
          <div class="field"><label>اللون الأساسي</label><input type="color" id="sPrimary" value="${esc(s.primary_color||'#8d0b0b')}"></div>
          <div class="field"><label>اللون الذهبي</label><input type="color" id="sGold" value="${esc(s.gold_color||'#c9a961')}"></div>
        </div>
        <div class="field"><label>اللون السكري</label><input type="color" id="sCream" value="${esc(s.cream_color||'#faf6ef')}"></div>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:8px">💾 حفظ الإعدادات</button>
      </form>
    </div>

    <div class="card">
      <div class="card-hdr"><h2>📋 جدول بيانات الإعدادات (Raw)</h2></div>
      <div class="tbl-wrap"><table>
        <thead><tr><th>المفتاح</th><th>القيمة</th></tr></thead>
        <tbody>${Object.entries(s).map(([k,v]) => `
          <tr>
            <td><code style="background:var(--cream2);padding:3px 8px;border-radius:6px;font-size:12px">${esc(k)}</code></td>
            <td style="word-break:break-all;direction:ltr;text-align:right;font-size:12.5px">${esc(String(v||''))}</td>
          </tr>`).join('') || '<tr><td colspan="2" style="text-align:center;color:var(--muted);padding:20px">لا توجد إعدادات</td></tr>'}
        </tbody>
      </table></div>
    </div>`;
  }

  async function openAuctionForm(id){
    $('formAuction').reset();
    $('aCat').innerHTML = '<option value="">اختر تصنيف</option>' + CATEGORIES.map(c=>`<option value="${c.name}">${c.name}</option>`).join('');
    $('auctionModalTitle').textContent = id ? 'تعديل المزاد' : 'إنشاء مزاد جديد';
    if(id){
      const a = st.auctions.find(x => x.id === id);
      if(!a) return;
      $('aId').value = a.id;
      $('aTitle').value = a.title || '';
      $('aCat').value = a.category || '';
      $('aDesc').value = a.description || '';
      $('aImg').value = a.image_url || '';
      $('aStart').value = a.start_price;
      $('aCurrent').value = a.current_price;
      $('aInc').value = a.min_increment;
      $('aStatus').value = a.status || 'approved';
      $('aEnd').value = fmtDTLocal(a.end_time);
      $('aLocation').value = a.location || '';
      $('aCond').value = a.condition || 'جديد';
      $('aFeatured').checked = !!a.featured;
    } else {
      $('aId').value = '';
      $('aStart').value = 100;
      $('aCurrent').value = 100;
      $('aInc').value = 50;
      $('aEnd').value = fmtDTLocal(new Date(Date.now()+24*3600000));
    }
    openModal('ovAuction');
  }

  async function saveAuction(e){
    e.preventDefault();
    const id = $('aId').value;
    const payload = {
      title: $('aTitle').value.trim(),
      category: $('aCat').value,
      description: $('aDesc').value.trim(),
      image_url: $('aImg').value.trim() || null,
      start_price: Number($('aStart').value),
      current_price: Number($('aCurrent').value),
      min_increment: Number($('aInc').value),
      status: $('aStatus').value,
      end_time: new Date($('aEnd').value).toISOString(),
      location: $('aLocation').value.trim() || null,
      condition: $('aCond').value,
      featured: $('aFeatured').checked
    };
    let res;
    if(id){
      res = await sb.from('auctions').update(payload).eq('id', id);
    } else {
      payload.seller_id = st.user.id;
      payload.start_time = new Date().toISOString();
      res = await sb.from('auctions').insert(payload);
    }
    if(res.error){ toast(res.error.message); return; }
    toast(id?'تم التحديث ✅':'تم الإنشاء 🎉');
    closeModal('ovAuction');
    await loadAll();
    render();
  }

  async function deleteAuction(id){
    if(!confirm('حذف هذا المزاد؟')) return;
    const { error } = await sb.from('auctions').delete().eq('id', id);
    if(error){ toast(error.message); return; }
    toast('تم الحذف ✅');
    await loadAll();
    render();
  }

  function openAdminForm(){
    if(st.role !== 'super_admin'){ toast('فقط المشرف العام يمكنه إضافة مشرفين'); return; }
    const opts = st.users
      .filter(u => !st.admins.find(a => a.id === u.id))
      .map(u => `<option value="${u.id}">${esc(u.full_name||'—')} — ${esc(u.email||'')}</option>`).join('');
    $('adUser').innerHTML = '<option value="">اختر مستخدم</option>' + opts;
    openModal('ovAdmin');
  }

  async function addAdmin(e){
    e.preventDefault();
    const uid = $('adUser').value;
    const role = $('adRole').value;
    if(!uid){ toast('اختر مستخدم'); return; }
    const { error } = await sb.from('admins').insert({ id: uid, role });
    if(error){ toast(error.message); return; }
    toast('تم إضافة المشرف 👑');
    closeModal('ovAdmin');
    await loadAll();
    render();
  }

  async function removeAdmin(id){
    if(!confirm('إزالة صلاحيات هذا المشرف؟')) return;
    const { error } = await sb.from('admins').delete().eq('id', id);
    if(error){ toast(error.message); return; }
    toast('تمت الإزالة ✅');
    await loadAll();
    render();
  }

  async function saveSettings(e){
    e.preventDefault();
    const updates = [
      ['logo_url', $('sLogo').value.trim()],
      ['site_name', $('sName').value.trim()],
      ['tagline', $('sTag').value.trim()],
      ['hero_title', $('sHeroTitle').value.trim()],
      ['hero_subtitle', $('sHeroSub').value.trim()],
      ['primary_color', $('sPrimary').value],
      ['gold_color', $('sGold').value],
      ['cream_color', $('sCream').value]
    ];
    for(const [key, value] of updates){
      await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
    }
    toast('تم الحفظ ✅');
    $('logoImgAdmin').src = updates[0][1];
    await loadAll();
    render();
  }

  function viewOrder(id){
    const o = st.orders.find(x => x.id === id);
    if(!o) return;
    $('orderDetails').innerHTML = `
      <div class="field"><label>المزاد</label><div>${esc(o.auction?.title||'—')}</div></div>
      <div class="row2">
        <div class="field"><label>المشتري</label><div>${esc(o.buyer?.full_name||'—')} — ${esc(o.buyer?.phone||'')}</div></div>
        <div class="field"><label>البائع</label><div>${esc(o.seller?.full_name||'—')} — ${esc(o.seller?.phone||'')}</div></div>
      </div>
      <div class="row2">
        <div class="field"><label>المبلغ</label><div><b style="color:var(--maroon)">${fmt(o.amount)} ر.س</b></div></div>
        <div class="field"><label>الحالة</label><div><span class="tag st-${o.status}">${statusLabel(o.status)}</span></div></div>
      </div>
      <div class="field">
        <label>تغيير الحالة</label>
        <select id="oStatus" style="width:100%;padding:11px 13px;border-radius:11px;border:1.5px solid var(--line);background:var(--cream);font-size:14px">
          ${['pending','confirmed','shipped','delivered','cancelled'].map(s=>`<option value="${s}" ${o.status===s?'selected':''}>${statusLabel(s)}</option>`).join('')}
        </select>
      </div>
      <div class="field"><label>ملاحظات</label><textarea id="oNotes" rows="2">${esc(o.notes||'')}</textarea></div>
      <button class="btn btn-primary" style="width:100%;margin-top:8px" onclick="ADMIN.updateOrder('${o.id}')">💾 حفظ</button>
    `;
    openModal('ovOrder');
  }

  async function updateOrder(id){
    const status = $('oStatus').value;
    const notes = $('oNotes').value.trim();
    const { error } = await sb.from('orders').update({ status, notes }).eq('id', id);
    if(error){ toast(error.message); return; }
    toast('تم التحديث ✅');
    closeModal('ovOrder');
    await loadAll();
    render();
  }

  function viewUser(id){
    const u = st.users.find(x => x.id === id);
    if(!u) return;
    const userAuctions = st.auctions.filter(a => a.seller_id === id);
    const userOrders = st.orders.filter(o => o.buyer_id === id || o.seller_id === id);
    alert(
      `👤 الاسم: ${u.full_name||'—'}\n` +
      `📧 البريد: ${u.email||'—'}\n` +
      `📱 الجوال: ${u.phone||'—'}\n` +
      `⭐ التقييم: ${(u.rating||5).toFixed(1)}\n` +
      `🔨 المزادات: ${userAuctions.length}\n` +
      `🧾 الطلبات: ${userOrders.length}\n` +
      `📅 التسجيل: ${fmtDate(u.created_at)}`
    );
  }

  function logout(){
    if(sb) sb.auth.signOut().then(() => location.href='index.html');
    else location.href='index.html';
  }

  window.ADMIN = {
    boot, nav, reload, logout,
    openAuctionForm, saveAuction, deleteAuction,
    openAdminForm, addAdmin, removeAdmin,
    saveSettings, viewOrder, updateOrder, viewUser,
    closeModal
  };
})();
