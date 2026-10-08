/* ═══════════════════════════════════════════════════════════════
   MEN Ai — Authentication Module (xain.js)
   تصميم موحّد أزرق داكن + أنيميشن انسياب الخطوط (يمين ← يسار)
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ── المفاتيح ── */
    const USERS_KEY = 'menAuthUsers';
    const SESSION_KEY = 'menAuthSession';

    /* ── الحالة ── */
    let currentUser = null;
    const listeners = [];
    let overlayEl = null;
    let currentMode = 'login';
    let isLoading = false;

    /* ══════════════ Helpers ══════════════ */
    function getUsers() {
        try { return JSON.parse(localStorage.getItem(USERS_KEY) || '{}'); }
        catch (e) { return {}; }
    }
    function saveUsers(u) {
        try { localStorage.setItem(USERS_KEY, JSON.stringify(u)); } catch (e) {}
    }
    function getSession() {
        try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); }
        catch (e) { return null; }
    }
    function saveSession(s) {
        try {
            if (s) localStorage.setItem(SESSION_KEY, JSON.stringify(s));
            else localStorage.removeItem(SESSION_KEY);
        } catch (e) {}
    }
    function hashPassword(pw) {
        let h = 5381;
        for (let i = 0; i < pw.length; i++) {
            h = ((h << 5) + h) ^ pw.charCodeAt(i);
            h |= 0;
        }
        return 'h_' + Math.abs(h).toString(36) + '_' + pw.length;
    }
    function makeAvatar(name, size) {
        const seed = encodeURIComponent((name || 'user').trim());
        return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e3a8a,2563eb,3b82f6,60a5fa&fontFamily=Cairo&fontSize=42&chars=1&textColor=ffffff`;
    }
    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }

    /* ══════════════ Listeners ══════════════ */
    function notify() {
        listeners.forEach(cb => { try { cb(currentUser); } catch (e) { console.error(e); } });
    }

    /* ══════════════ CSS Injection ══════════════ */
    function injectStyles() {
        if (document.getElementById('men-auth-styles')) return;
        const s = document.createElement('style');
        s.id = 'men-auth-styles';
        s.textContent = `
.men-auth-overlay {
    position: fixed; inset: 0;
    background: rgba(0, 2, 6, .88);
    backdrop-filter: blur(14px);
    -webkit-backdrop-filter: blur(14px);
    z-index: 99999;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 20px;
    font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #e8eefc;
    overscroll-behavior: contain;
}
.men-auth-overlay.show {
    display: flex;
    animation: menAuthFade .22s ease;
}
@keyframes menAuthFade { from { opacity: 0; } to { opacity: 1; } }

/* ── الصندوق ── */
.men-auth-box {
    width: 100%;
    max-width: 430px;
    background: #0d1a2e;
    border: 1px solid rgba(96, 165, 250, .16);
    border-radius: 24px;
    padding: 32px 26px 26px;
    position: relative;
    box-shadow: 0 30px 80px rgba(0, 0, 0, .85), 0 0 60px rgba(37, 99, 235, .1);
    animation: menAuthBoxIn .42s cubic-bezier(.16, 1, .3, 1);
    overflow: hidden;
}
@keyframes menAuthBoxIn {
    from { opacity: 0; transform: translateY(20px) scale(.96); }
    to { opacity: 1; transform: none; }
}
.men-auth-box.success {
    animation: menAuthSuccess .65s ease;
}
@keyframes menAuthSuccess {
    0% { transform: scale(1); }
    30% { transform: scale(1.02); box-shadow: 0 30px 80px rgba(0,0,0,.85), 0 0 90px rgba(37,99,235,.5); }
    100% { transform: scale(1); }
}

/* ── زر الإغلاق ── */
.men-auth-close {
    position: absolute;
    top: 14px;
    left: 14px;
    width: 34px; height: 34px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #5c6f92;
    cursor: pointer;
    display: flex; align-items: center; justify-content: center;
    font-size: .9rem;
    transition: .18s;
    z-index: 5;
}
.men-auth-close:hover { background: rgba(96, 165, 250, .12); color: #e8eefc; transform: rotate(90deg); }

/* ── الرأس ── */
.men-auth-head {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 12px;
    margin-bottom: 20px;
}

/* ── شعار مع أنيميشن ── */
.men-auth-logo-stage {
    position: relative;
    width: 92px;
    height: 92px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
}
.men-auth-aura {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59, 130, 246, .35) 0%, rgba(37, 99, 235, .15) 35%, transparent 70%);
    animation: menAuthAuraPulse 3.5s ease-in-out infinite;
    filter: blur(6px);
}
@keyframes menAuthAuraPulse {
    0%, 100% { transform: scale(.9); opacity: .5; }
    50% { transform: scale(1.15); opacity: .9; }
}
.men-auth-ring {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: rgba(96, 165, 250, .7);
    border-right-color: rgba(96, 165, 250, .2);
    animation: menAuthSpin 8s linear infinite;
}
.men-auth-ring.r2 {
    inset: 18px;
    border-top-color: rgba(147, 197, 253, .5);
    border-left-color: rgba(96, 165, 250, .2);
    animation: menAuthSpin 6s linear infinite reverse;
}
@keyframes menAuthSpin { to { transform: rotate(360deg); } }
.men-auth-logo-icon {
    font-size: 2rem;
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 14px rgba(96, 165, 250, .9)) drop-shadow(0 0 28px rgba(37, 99, 235, .6));
    animation: menAuthFloat 4s ease-in-out infinite;
    background: linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
@keyframes menAuthFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-6px) rotate(-5deg); }
}

/* ── العنوان ── */
.men-auth-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: #e8eefc;
    letter-spacing: -.02em;
    margin: 0;
    animation: menAuthTextFade .8s ease .1s both;
}
.men-auth-sub {
    font-size: .84rem;
    color: #9db0d0;
    margin: 0;
    animation: menAuthTextFade .8s ease .25s both;
}
@keyframes menAuthTextFade {
    from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
    to { opacity: 1; transform: none; filter: blur(0); }
}

/* ══════════════════════════════════════
   ✨ أنيميشن انسياب الخطوط من اليمين إلى اليسار
   ══════════════════════════════════════ */
.men-auth-sweep {
    width: 100%;
    max-width: 240px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    margin-top: 4px;
    animation: menAuthTextFade .8s ease .4s both;
}
.men-auth-sweep-line {
    width: 100%;
    height: 1.5px;
    border-radius: 2px;
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(96, 165, 250, .15) 10%,
        rgba(96, 165, 250, .8) 50%,
        rgba(147, 197, 253, 1) 70%,
        rgba(96, 165, 250, .4) 90%,
        transparent 100%);
    transform-origin: right;
    transform: scaleX(0);
    animation: menAuthSweep 2.6s cubic-bezier(.4, 0, .2, 1) infinite;
    box-shadow: 0 0 12px rgba(96, 165, 250, .5);
    position: relative;
}
.men-auth-sweep-line.short {
    width: 60%;
    height: 1px;
    animation-delay: .35s;
    opacity: .75;
}
@keyframes menAuthSweep {
    0% { transform: scaleX(0); opacity: 0; }
    15% { opacity: 1; }
    60% { transform: scaleX(1); opacity: 1; }
    85% { transform: scaleX(1); opacity: .4; }
    100% { transform: scaleX(1) translateX(-30%); opacity: 0; }
}
.men-auth-sweep-line::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    width: 5px; height: 5px;
    border-radius: 50%;
    background: #93c5fd;
    transform: translate(0, -50%);
    box-shadow: 0 0 10px #60a5fa, 0 0 20px rgba(96, 165, 250, .7);
    animation: menAuthSpark 2.6s cubic-bezier(.4, 0, .2, 1) infinite;
    opacity: 0;
}
.men-auth-sweep-line.short::after { animation-delay: .35s; }
@keyframes menAuthSpark {
    0% { opacity: 0; right: 0; }
    15% { opacity: 1; right: 0; }
    60% { opacity: 1; right: 100%; }
    85% { opacity: .4; right: 100%; }
    100% { opacity: 0; right: 100%; }
}

/* ── النموذج ── */
.men-auth-form {
    display: flex;
    flex-direction: column;
    gap: 13px;
}

.men-auth-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    animation: menAuthTextFade .5s ease both;
}
.men-auth-field label {
    font-size: .78rem;
    font-weight: 600;
    color: #9db0d0;
    padding-inline-start: 4px;
}

.men-auth-input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0a1424;
    border: 1px solid rgba(96, 165, 250, .14);
    border-radius: 13px;
    padding: 0 12px;
    transition: border-color .18s, box-shadow .18s, background .18s;
    position: relative;
    min-height: 46px;
}
.men-auth-input-wrap:focus-within {
    border-color: rgba(96, 165, 250, .5);
    background: #0f1e36;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, .14);
}
.men-auth-input-wrap > i {
    color: #5c6f92;
    font-size: .85rem;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    transition: color .18s;
}
.men-auth-input-wrap:focus-within > i { color: #60a5fa; }
.men-auth-input-wrap input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: #e8eefc;
    font-family: inherit;
    font-size: .92rem;
    padding: 12px 0;
}
.men-auth-input-wrap input::placeholder { color: #475a7a; }
.men-auth-input-wrap input:-webkit-autofill {
    -webkit-text-fill-color: #e8eefc;
    -webkit-box-shadow: 0 0 0 1000px #0a1424 inset;
    transition: background-color 9999s ease-in-out 0s;
}

.men-auth-eye {
    width: 30px; height: 30px;
    border-radius: 8px;
    border: none;
    background: transparent;
    color: #5c6f92;
    cursor: pointer;
    font-size: .82rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: .15s;
}
.men-auth-eye:hover { background: rgba(96, 165, 250, .12); color: #60a5fa; }

/* ── الخطأ ── */
.men-auth-error {
    display: none;
    color: #f87171;
    background: rgba(239, 65, 70, .08);
    border: 1px solid rgba(239, 65, 70, .22);
    border-radius: 11px;
    padding: 10px 14px;
    font-size: .82rem;
    font-weight: 500;
    text-align: center;
}
.men-auth-error.show { display: block; animation: menAuthErrIn .3s ease; }
@keyframes menAuthErrIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
}

/* ── زر الإرسال ── */
.men-auth-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    margin-top: 6px;
    padding: 13px 18px;
    border-radius: 13px;
    border: none;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
    color: #fff;
    font-family: inherit;
    font-size: .92rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform .18s, box-shadow .18s;
    box-shadow: 0 10px 30px -8px rgba(37, 99, 235, .8), inset 0 1px 0 rgba(255,255,255,.14);
    position: relative;
    overflow: hidden;
}
.men-auth-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 36px -8px rgba(59, 130, 246, .9), inset 0 1px 0 rgba(255,255,255,.18);
}
.men-auth-submit:active:not(:disabled) { transform: translateY(0) scale(.98); }
.men-auth-submit:disabled { opacity: .75; cursor: not-allowed; }

.men-auth-spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255, 255, 255, .3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: menAuthSpinBtn .65s linear infinite;
    display: none;
}
.men-auth-submit.loading .men-auth-spinner { display: inline-block; }
@keyframes menAuthSpinBtn { to { transform: rotate(360deg); } }

/* ── التبديل ── */
.men-auth-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 20px;
    padding-top: 18px;
    border-top: 1px solid rgba(96, 165, 250, .1);
    font-size: .82rem;
    color: #5c6f92;
    animation: menAuthTextFade .8s ease .5s both;
}
.men-auth-switch button {
    background: transparent;
    border: none;
    color: #60a5fa;
    font-family: inherit;
    font-size: .82rem;
    font-weight: 700;
    cursor: pointer;
    padding: 4px 6px;
    border-radius: 8px;
    transition: .15s;
}
.men-auth-switch button:hover {
    background: rgba(96, 165, 250, .1);
    color: #93c5fd;
}

/* ── Responsive ── */
@media (max-width: 480px) {
    .men-auth-overlay { padding: 14px; }
    .men-auth-box { padding: 26px 20px 20px; border-radius: 20px; }
    .men-auth-title { font-size: 1.2rem; }
    .men-auth-logo-stage { width: 80px; height: 80px; }
    .men-auth-logo-icon { font-size: 1.7rem; }
    .men-auth-sweep { max-width: 200px; }
    .men-auth-input-wrap input { font-size: 16px; }
}
        `;
        document.head.appendChild(s);
    }

    /* ══════════════ بناء النافذة ══════════════ */
    function buildOverlay() {
        if (overlayEl) return overlayEl;

        overlayEl = document.createElement('div');
        overlayEl.className = 'men-auth-overlay';
        overlayEl.innerHTML = `
            <div class="men-auth-box" role="dialog" aria-modal="true">
                <button class="men-auth-close" type="button" aria-label="إغلاق">
                    <i class="fas fa-xmark"></i>
                </button>

                <div class="men-auth-head">
                    <div class="men-auth-logo-stage">
                        <div class="men-auth-aura"></div>
                        <div class="men-auth-ring"></div>
                        <div class="men-auth-ring r2"></div>
                        <i class="fas fa-user-shield men-auth-logo-icon"></i>
                    </div>

                    <h2 class="men-auth-title" data-title>تسجيل الدخول</h2>
                    <p class="men-auth-sub" data-sub>أدخل بياناتك للمتابعة</p>

                    <div class="men-auth-sweep">
                        <div class="men-auth-sweep-line"></div>
                        <div class="men-auth-sweep-line short"></div>
                    </div>
                </div>

                <form class="men-auth-form" novalidate>
                    <div class="men-auth-field" data-field-name style="display:none">
                        <label>الاسم</label>
                        <div class="men-auth-input-wrap">
                            <i class="fas fa-user"></i>
                            <input type="text" name="name" autocomplete="name" placeholder="اسمك">
                        </div>
                    </div>

                    <div class="men-auth-field">
                        <label>البريد الإلكتروني</label>
                        <div class="men-auth-input-wrap">
                            <i class="fas fa-envelope"></i>
                            <input type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
                        </div>
                    </div>

                    <div class="men-auth-field">
                        <label>كلمة المرور</label>
                        <div class="men-auth-input-wrap">
                            <i class="fas fa-lock"></i>
                            <input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required>
                            <button class="men-auth-eye" type="button" tabindex="-1" aria-label="إظهار">
                                <i class="fas fa-eye"></i>
                            </button>
                        </div>
                    </div>

                    <div class="men-auth-field" data-field-confirm style="display:none">
                        <label>تأكيد كلمة المرور</label>
                        <div class="men-auth-input-wrap">
                            <i class="fas fa-lock"></i>
                            <input type="password" name="confirm" autocomplete="new-password" placeholder="••••••••">
                        </div>
                    </div>

                    <div class="men-auth-error" data-error></div>

                    <button class="men-auth-submit" type="submit">
                        <span data-submit-text>دخول</span>
                        <span class="men-auth-spinner"></span>
                    </button>
                </form>

                <div class="men-auth-switch">
                    <span data-switch-text>ليس لديك حساب؟</span>
                    <button type="button" data-switch-btn>إنشاء حساب جديد</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlayEl);
        bindEvents();
        return overlayEl;
    }

    function bindEvents() {
        overlayEl.querySelector('.men-auth-close').addEventListener('click', closeModal);

        overlayEl.addEventListener('click', (e) => {
            if (e.target === overlayEl) closeModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && overlayEl.classList.contains('show')) closeModal();
        });

        // إظهار/إخفاء كلمة المرور
        overlayEl.querySelectorAll('.men-auth-eye').forEach(btn => {
            btn.addEventListener('click', () => {
                const input = btn.parentElement.querySelector('input');
                const icon = btn.querySelector('i');
                if (input.type === 'password') {
                    input.type = 'text';
                    icon.className = 'fas fa-eye-slash';
                } else {
                    input.type = 'password';
                    icon.className = 'fas fa-eye';
                }
            });
        });

        // تبديل بين دخول/تسجيل
        overlayEl.querySelector('[data-switch-btn]').addEventListener('click', () => {
            setMode(currentMode === 'login' ? 'signup' : 'login');
        });

        // إرسال النموذج
        overlayEl.querySelector('form').addEventListener('submit', handleSubmit);
    }

    function setMode(mode) {
        currentMode = mode;
        const isLogin = mode === 'login';
        overlayEl.querySelector('[data-title]').textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب';
        overlayEl.querySelector('[data-sub]').textContent = isLogin ? 'أدخل بياناتك للمتابعة' : 'انشئ حسابك للبدء باستخدام MEN Ai';
        overlayEl.querySelector('[data-submit-text]').textContent = isLogin ? 'دخول' : 'إنشاء الحساب';
        overlayEl.querySelector('[data-switch-text]').textContent = isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
        overlayEl.querySelector('[data-switch-btn]').textContent = isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
        overlayEl.querySelector('[data-field-name]').style.display = isLogin ? 'none' : '';
        overlayEl.querySelector('[data-field-confirm]').style.display = isLogin ? 'none' : '';
        overlayEl.querySelector('input[name="password"]').autocomplete = isLogin ? 'current-password' : 'new-password';
        setError('');
    }

    function setError(msg) {
        const el = overlayEl.querySelector('[data-error]');
        el.textContent = msg || '';
        el.classList.toggle('show', !!msg);
    }

    function setLoading(v) {
        isLoading = v;
        const btn = overlayEl.querySelector('.men-auth-submit');
        btn.disabled = v;
        btn.classList.toggle('loading', v);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isLoading) return;

        const form = overlayEl.querySelector('form');
        const name = form.name ? form.name.value.trim() : '';
        const email = (form.email.value || '').trim().toLowerCase();
        const password = form.password.value || '';
        const confirm = form.confirm ? form.confirm.value : '';

        setError('');

        if (!email) return setError('الرجاء إدخال البريد الإلكتروني');
        if (!isValidEmail(email)) return setError('البريد الإلكتروني غير صحيح');
        if (!password) return setError('الرجاء إدخال كلمة المرور');
        if (password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

        setLoading(true);
        await new Promise(r => setTimeout(r, 550));

        const users = getUsers();

        if (currentMode === 'signup') {
            if (!name) { setLoading(false); return setError('الرجاء إدخال الاسم'); }
            if (password !== confirm) { setLoading(false); return setError('كلمتا المرور غير متطابقتين'); }
            if (users[email]) { setLoading(false); return setError('هذا البريد مسجّل مسبقاً'); }

            const user = {
                id: 'u_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
                email,
                user_metadata: { name },
                created_at: new Date().toISOString(),
                passwordHash: hashPassword(password)
            };
            users[email] = user;
            saveUsers(users);

            completeLogin(user);
        } else {
            const user = users[email];
            if (!user) { setLoading(false); return setError('لا يوجد حساب بهذا البريد'); }
            if (user.passwordHash !== hashPassword(password)) {
                setLoading(false);
                return setError('كلمة المرور غير صحيحة');
            }
            completeLogin(user);
        }
    }

    function completeLogin(user) {
        currentUser = {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata || {},
            created_at: user.created_at
        };
        saveSession(currentUser);
        setLoading(false);

        const box = overlayEl.querySelector('.men-auth-box');
        box.classList.add('success');

        setTimeout(() => {
            box.classList.remove('success');
            closeModal();
            notify();
        }, 700);
    }

    function openModal(mode) {
        buildOverlay();
        setMode(mode || 'login');

        const form = overlayEl.querySelector('form');
        form.reset();
        setError('');
        overlayEl.querySelectorAll('.men-auth-eye i').forEach(i => i.className = 'fas fa-eye');
        overlayEl.querySelectorAll('input').forEach(i => {
            if (i.name === 'password' || i.name === 'confirm') i.type = 'password';
        });

        overlayEl.classList.add('show');

        setTimeout(() => {
            const first = overlayEl.querySelector('.men-auth-field:not([style*="display:none"]) input');
            if (first) first.focus();
        }, 120);
    }

    function closeModal() {
        if (!overlayEl) return;
        overlayEl.classList.remove('show');
        setLoading(false);
        setError('');
    }

    function doLogout() {
        currentUser = null;
        saveSession(null);
        notify();
    }

    /* ══════════════ Init ══════════════ */
    function init() {
        injectStyles();

        // استرجاع الجلسة
        const session = getSession();
        if (session && session.email) {
            const users = getUsers();
            if (users[session.email]) currentUser = session;
            else saveSession(null);
        }

        // إشعار المستمعين بعد ما يسجّل index.html مستمعيه
        setTimeout(notify, 0);
    }

    /* ══════════════ Public API ══════════════ */
    window.MEN_AUTH = {
        isLoggedIn: () => !!currentUser,
        getUser: () => currentUser,
        open: (mode) => openModal(mode || 'login'),
        close: closeModal,
        logout: doLogout,
        onAuthChange: (cb) => {
            if (typeof cb !== 'function') return;
            listeners.push(cb);
            try { cb(currentUser); } catch (e) { console.error(e); }
        },
        makeAvatar
    };

    init();
})();
