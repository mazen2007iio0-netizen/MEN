/* ═══════════════════════════════════════════════════════════════
   MEN Ai — Full Screen Auth (xain.js)
   شاشة تسجيل دخول كاملة بتصميم الشات + أنيميشن انسياب الخطوط
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ═══ المفاتيح ═══ */
    const USERS_KEY = 'menAuthUsers';
    const SESSION_KEY = 'menAuthSession';

    /* ═══ الحالة ═══ */
    let currentUser = null;
    let currentMode = 'login';
    let isLoading = false;
    let screenEl = null;
    const listeners = [];

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
    function notify() {
        listeners.forEach(cb => { try { cb(currentUser); } catch (e) { console.error(e); } });
    }

    /* ══════════════ CSS Injection ══════════════ */
    function injectStyles() {
        if (document.getElementById('men-auth-styles')) return;
        const s = document.createElement('style');
        s.id = 'men-auth-styles';
        s.textContent = `
/* ════════ شاشة تسجيل الدخول الكاملة ════════ */
.men-auth-screen {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: #050a14;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px 20px;
    overflow-y: auto;
    overflow-x: hidden;
    font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #e8eefc;
    -webkit-font-smoothing: antialiased;
    overscroll-behavior: contain;
    opacity: 0;
    pointer-events: none;
    transition: opacity .45s cubic-bezier(.16, 1, .3, 1);
}
.men-auth-screen.show {
    opacity: 1;
    pointer-events: auto;
}
.men-auth-screen.hiding {
    opacity: 0;
    transform: scale(1.04);
    transition: opacity .5s ease, transform .5s ease;
}

/* ═══ الخلفيات المتوهجة ═══ */
.men-bg-glow {
    position: absolute;
    border-radius: 50%;
    filter: blur(120px);
    pointer-events: none;
    z-index: 0;
    opacity: .35;
    will-change: transform;
}
.men-bg-glow.g1 {
    width: 520px; height: 520px;
    background: radial-gradient(circle, #1e3a8a 0%, transparent 70%);
    top: -200px; right: -200px;
    animation: menGlow1 22s ease-in-out infinite;
}
.men-bg-glow.g2 {
    width: 460px; height: 460px;
    background: radial-gradient(circle, #2563eb 0%, transparent 70%);
    bottom: -200px; left: -200px;
    animation: menGlow2 26s ease-in-out infinite;
    opacity: .28;
}
.men-bg-glow.g3 {
    width: 340px; height: 340px;
    background: radial-gradient(circle, #3b82f6 0%, transparent 70%);
    top: 40%; left: 50%;
    transform: translateX(-50%);
    animation: menGlow1 30s ease-in-out infinite reverse;
    opacity: .15;
}
@keyframes menGlow1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(60px, 60px) scale(1.15); }
}
@keyframes menGlow2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-60px, -50px) scale(1.12); }
}

/* ═══ شبكة خفيفة ═══ */
.men-bg-grid {
    position: absolute;
    inset: 0;
    pointer-events: none;
    z-index: 0;
    background-image:
        linear-gradient(rgba(96, 165, 250, .025) 1px, transparent 1px),
        linear-gradient(90deg, rgba(96, 165, 250, .025) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
    -webkit-mask-image: radial-gradient(ellipse at center, black 20%, transparent 75%);
}

/* ═══ الحاوية ═══ */
.men-auth-wrap {
    width: 100%;
    max-width: 460px;
    position: relative;
    z-index: 2;
    margin: auto;
}

.men-auth-card {
    background: #0d1a2e;
    border: 1px solid rgba(96, 165, 250, .16);
    border-radius: 26px;
    padding: 40px 34px 30px;
    position: relative;
    overflow: hidden;
    box-shadow:
        0 30px 80px rgba(0, 0, 0, .85),
        0 0 60px rgba(37, 99, 235, .08);
    animation: menCardIn .65s cubic-bezier(.16, 1, .3, 1);
}
@keyframes menCardIn {
    from { opacity: 0; transform: translateY(28px) scale(.95); }
    to { opacity: 1; transform: none; }
}
.men-auth-card.success { animation: menCardSuccess .7s ease; }
@keyframes menCardSuccess {
    0% { transform: scale(1); }
    30% { transform: scale(1.025); box-shadow: 0 30px 80px rgba(0,0,0,.85), 0 0 110px rgba(37,99,235,.6); }
    100% { transform: scale(1); }
}

/* ═══ الرأس ═══ */
.men-auth-head {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
    margin-bottom: 26px;
}

/* شعار متحرك */
.men-logo-stage {
    position: relative;
    width: 108px;
    height: 108px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 4px;
}
.men-aura {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59, 130, 246, .35) 0%, rgba(37, 99, 235, .15) 35%, transparent 70%);
    animation: menAuraPulse 3.5s ease-in-out infinite;
    filter: blur(6px);
}
@keyframes menAuraPulse {
    0%, 100% { transform: scale(.9); opacity: .5; }
    50% { transform: scale(1.15); opacity: .9; }
}
.men-ring {
    position: absolute;
    inset: 10px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: rgba(96, 165, 250, .7);
    border-right-color: rgba(96, 165, 250, .2);
    animation: menSpin 8s linear infinite;
}
.men-ring.r2 {
    inset: 22px;
    border-top-color: rgba(147, 197, 253, .5);
    border-left-color: rgba(96, 165, 250, .2);
    animation: menSpin 6s linear infinite reverse;
}
@keyframes menSpin { to { transform: rotate(360deg); } }

.men-logo-icon {
    font-size: 2.3rem;
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 16px rgba(96, 165, 250, .9)) drop-shadow(0 0 32px rgba(37, 99, 235, .6));
    animation: menIconFloat 4s ease-in-out infinite;
    background: linear-gradient(135deg, #ffffff 0%, #93c5fd 60%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
@keyframes menIconFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-7px) rotate(-5deg); }
}

/* العناوين */
.men-title {
    font-size: 1.5rem;
    font-weight: 700;
    color: #e8eefc;
    letter-spacing: -.025em;
    line-height: 1.3;
    animation: menTextFade .8s ease .15s both;
}
.men-sub {
    font-size: .85rem;
    color: #9db0d0;
    animation: menTextFade .8s ease .3s both;
}
@keyframes menTextFade {
    from { opacity: 0; transform: translateY(8px); filter: blur(4px); }
    to { opacity: 1; transform: none; filter: blur(0); }
}

/* ═══════════════════════════════════════
   ✨ أنيميشن انسياب الخطوط (يمين ← يسار)
   ═══════════════════════════════════════ */
.men-sweep-container {
    width: 100%;
    max-width: 260px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 7px;
    margin-top: 6px;
    animation: menTextFade .8s ease .45s both;
}
.men-sweep-line {
    height: 1.5px;
    width: 100%;
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
    animation: menSweep 2.6s cubic-bezier(.4, 0, .2, 1) infinite;
    position: relative;
    box-shadow: 0 0 12px rgba(96, 165, 250, .5);
}
.men-sweep-line.short {
    width: 62%;
    height: 1px;
    animation-delay: .35s;
    opacity: .75;
}
.men-sweep-line.thin {
    width: 38%;
    height: 1px;
    animation-delay: .7s;
    opacity: .5;
}
@keyframes menSweep {
    0% { transform: scaleX(0); opacity: 0; }
    15% { opacity: 1; }
    60% { transform: scaleX(1); opacity: 1; }
    85% { transform: scaleX(1); opacity: .4; }
    100% { transform: scaleX(1) translateX(-30%); opacity: 0; }
}
.men-sweep-line::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #93c5fd;
    transform: translate(0, -50%);
    box-shadow: 0 0 12px #60a5fa, 0 0 24px rgba(96, 165, 250, .7);
    animation: menSpark 2.6s cubic-bezier(.4, 0, .2, 1) infinite;
    opacity: 0;
}
.men-sweep-line.short::after { animation-delay: .35s; }
.men-sweep-line.thin::after { animation-delay: .7s; }
@keyframes menSpark {
    0% { opacity: 0; right: 0; }
    15% { opacity: 1; right: 0; }
    60% { opacity: 1; right: 100%; }
    85% { opacity: .4; right: 100%; }
    100% { opacity: 0; right: 100%; }
}

/* ═══ النموذج ═══ */
.men-form {
    display: flex;
    flex-direction: column;
    gap: 13px;
    animation: menTextFade .8s ease .55s both;
}
.men-field {
    display: flex;
    flex-direction: column;
    gap: 7px;
    transition: opacity .25s, max-height .35s;
}
.men-field.hidden {
    display: none;
}
.men-field label {
    font-size: .78rem;
    font-weight: 600;
    color: #9db0d0;
    padding-inline-start: 4px;
}

.men-input-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    background: #0a1424;
    border: 1px solid rgba(96, 165, 250, .14);
    border-radius: 13px;
    padding: 0 12px;
    transition: border-color .18s, box-shadow .18s, background .18s;
    position: relative;
    min-height: 48px;
}
.men-input-wrap:focus-within {
    border-color: rgba(96, 165, 250, .5);
    background: #0f1e36;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, .14);
}
.men-input-wrap > i {
    color: #5c6f92;
    font-size: .85rem;
    width: 16px;
    text-align: center;
    flex-shrink: 0;
    transition: color .18s;
}
.men-input-wrap:focus-within > i { color: #60a5fa; }
.men-input-wrap input {
    flex: 1;
    min-width: 0;
    background: transparent;
    border: none;
    outline: none;
    color: #e8eefc;
    font-family: inherit;
    font-size: .92rem;
    padding: 13px 0;
}
.men-input-wrap input::placeholder { color: #475a7a; }
.men-input-wrap input:-webkit-autofill {
    -webkit-text-fill-color: #e8eefc;
    -webkit-box-shadow: 0 0 0 1000px #0a1424 inset;
    transition: background-color 9999s ease-in-out 0s;
}

.men-eye {
    width: 32px; height: 32px;
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
.men-eye:hover { background: rgba(96, 165, 250, .08); color: #60a5fa; }

/* ═══ الخطأ ═══ */
.men-error {
    display: none;
    color: #f87171;
    background: rgba(239, 65, 70, .08);
    border: 1px solid rgba(239, 65, 70, .22);
    border-radius: 11px;
    padding: 11px 14px;
    font-size: .82rem;
    font-weight: 500;
    text-align: center;
}
.men-error.show { display: block; animation: menErrIn .3s ease; }
@keyframes menErrIn {
    from { opacity: 0; transform: translateY(-4px); }
    to { opacity: 1; transform: none; }
}

/* ═══ زر الإرسال ═══ */
.men-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 9px;
    margin-top: 6px;
    padding: 14px 18px;
    border-radius: 13px;
    border: none;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%);
    color: #fff;
    font-family: inherit;
    font-size: .95rem;
    font-weight: 700;
    cursor: pointer;
    transition: transform .18s, box-shadow .18s;
    box-shadow: 0 10px 30px -8px rgba(37, 99, 235, .8), inset 0 1px 0 rgba(255,255,255,.14);
}
.men-submit:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 14px 36px -8px rgba(59, 130, 246, .9), inset 0 1px 0 rgba(255,255,255,.18);
}
.men-submit:active:not(:disabled) { transform: translateY(0) scale(.98); }
.men-submit:disabled { opacity: .75; cursor: not-allowed; }

.men-spinner {
    width: 15px; height: 15px;
    border: 2px solid rgba(255, 255, 255, .3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: menSpinBtn .65s linear infinite;
    display: none;
}
.men-submit.loading .men-spinner { display: inline-block; }
@keyframes menSpinBtn { to { transform: rotate(360deg); } }

/* ═══ التبديل ═══ */
.men-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 18px;
    padding-top: 18px;
    border-top: 1px solid rgba(96, 165, 250, .1);
    font-size: .82rem;
    color: #5c6f92;
    animation: menTextFade .8s ease .65s both;
}
.men-switch button {
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
.men-switch button:hover {
    background: rgba(96, 165, 250, .1);
    color: #93c5fd;
}

/* ═══ Responsive ═══ */
@media (max-width: 480px) {
    .men-auth-screen { padding: 16px 14px; }
    .men-auth-card { padding: 32px 22px 24px; border-radius: 22px; }
    .men-title { font-size: 1.28rem; }
    .men-logo-stage { width: 92px; height: 92px; }
    .men-logo-icon { font-size: 2rem; }
    .men-sweep-container { max-width: 210px; gap: 6px; }
    .men-input-wrap input { font-size: 16px; }
}
        `;
        document.head.appendChild(s);
    }

    /* ══════════════ بناء الشاشة ══════════════ */
    function buildScreen() {
        if (screenEl) return screenEl;

        screenEl = document.createElement('div');
        screenEl.className = 'men-auth-screen';
        screenEl.innerHTML = `
            <div class="men-bg-glow g1"></div>
            <div class="men-bg-glow g2"></div>
            <div class="men-bg-glow g3"></div>
            <div class="men-bg-grid"></div>

            <div class="men-auth-wrap">
                <div class="men-auth-card">
                    <div class="men-auth-head">
                        <div class="men-logo-stage">
                            <div class="men-aura"></div>
                            <div class="men-ring"></div>
                            <div class="men-ring r2"></div>
                            <i class="fas fa-user-shield men-logo-icon"></i>
                        </div>

                        <h2 class="men-title" data-title>تسجيل الدخول</h2>
                        <p class="men-sub" data-sub>أدخل بياناتك للمتابعة إلى MEN Ai</p>

                        <div class="men-sweep-container">
                            <div class="men-sweep-line"></div>
                            <div class="men-sweep-line short"></div>
                            <div class="men-sweep-line thin"></div>
                        </div>
                    </div>

                    <form class="men-form" novalidate>
                        <div class="men-field hidden" data-field-name>
                            <label>الاسم</label>
                            <div class="men-input-wrap">
                                <i class="fas fa-user"></i>
                                <input type="text" name="name" autocomplete="name" placeholder="اسمك">
                            </div>
                        </div>

                        <div class="men-field">
                            <label>البريد الإلكتروني</label>
                            <div class="men-input-wrap">
                                <i class="fas fa-envelope"></i>
                                <input type="email" name="email" autocomplete="email" placeholder="you@example.com" required>
                            </div>
                        </div>

                        <div class="men-field">
                            <label>كلمة المرور</label>
                            <div class="men-input-wrap">
                                <i class="fas fa-lock"></i>
                                <input type="password" name="password" autocomplete="current-password" placeholder="••••••••" required>
                                <button class="men-eye" type="button" tabindex="-1" aria-label="إظهار">
                                    <i class="fas fa-eye"></i>
                                </button>
                            </div>
                        </div>

                        <div class="men-field hidden" data-field-confirm>
                            <label>تأكيد كلمة المرور</label>
                            <div class="men-input-wrap">
                                <i class="fas fa-lock"></i>
                                <input type="password" name="confirm" autocomplete="new-password" placeholder="••••••••">
                            </div>
                        </div>

                        <div class="men-error" data-error></div>

                        <button class="men-submit" type="submit">
                            <span data-submit-text>دخول</span>
                            <span class="men-spinner"></span>
                        </button>
                    </form>

                    <div class="men-switch">
                        <span data-switch-text>ليس لديك حساب؟</span>
                        <button type="button" data-switch-btn>إنشاء حساب جديد</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(screenEl);
        bindEvents();
        return screenEl;
    }

    function bindEvents() {
        screenEl.querySelectorAll('.men-eye').forEach(btn => {
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

        screenEl.querySelector('[data-switch-btn]').addEventListener('click', () => {
            setMode(currentMode === 'login' ? 'signup' : 'login');
        });

        screenEl.querySelector('form').addEventListener('submit', handleSubmit);
    }

    function setMode(mode) {
        currentMode = mode;
        const isLogin = mode === 'login';
        screenEl.querySelector('[data-title]').textContent = isLogin ? 'تسجيل الدخول' : 'إنشاء حساب';
        screenEl.querySelector('[data-sub]').textContent = isLogin ? 'أدخل بياناتك للمتابعة إلى MEN Ai' : 'أنشئ حسابك للبدء في استخدام MEN Ai';
        screenEl.querySelector('[data-submit-text]').textContent = isLogin ? 'دخول' : 'إنشاء الحساب';
        screenEl.querySelector('[data-switch-text]').textContent = isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
        screenEl.querySelector('[data-switch-btn]').textContent = isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
        screenEl.querySelector('[data-field-name]').classList.toggle('hidden', isLogin);
        screenEl.querySelector('[data-field-confirm]').classList.toggle('hidden', isLogin);
        screenEl.querySelector('input[name="password"]').autocomplete = isLogin ? 'current-password' : 'new-password';
        setError('');
    }

    function setError(msg) {
        const el = screenEl.querySelector('[data-error]');
        el.textContent = msg || '';
        el.classList.toggle('show', !!msg);
    }

    function setLoading(v) {
        isLoading = v;
        const btn = screenEl.querySelector('.men-submit');
        btn.disabled = v;
        btn.classList.toggle('loading', v);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        if (isLoading) return;

        const form = screenEl.querySelector('form');
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

        const card = screenEl.querySelector('.men-auth-card');
        card.classList.add('success');

        setTimeout(() => {
            hideScreen();
            notify();
        }, 750);
    }

    function showScreen() {
        buildScreen();
        screenEl.classList.remove('hiding');
        requestAnimationFrame(() => screenEl.classList.add('show'));
        // امنع السكرول في الخلفية
        document.body.style.overflow = 'hidden';
    }

    function hideScreen() {
        if (!screenEl) return;
        screenEl.classList.add('hiding');
        screenEl.classList.remove('show');
        setTimeout(() => {
            if (screenEl) {
                screenEl.style.display = 'none';
                screenEl.classList.remove('hiding');
            }
            document.body.style.overflow = '';
        }, 500);
    }

    function doLogout() {
        try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
        currentUser = null;

        // إعادة عرض الشاشة
        if (screenEl) {
            screenEl.style.display = '';
            screenEl.querySelector('form').reset();
            screenEl.querySelectorAll('.men-eye i').forEach(i => i.className = 'fas fa-eye');
            screenEl.querySelectorAll('input').forEach(i => {
                if (i.name === 'password' || i.name === 'confirm') i.type = 'password';
            });
            setMode('login');
            setError('');
        } else {
            showScreen();
        }
        notify();
    }

    /* ══════════════ Public API ══════════════ */
    window.MEN_AUTH = {
        isLoggedIn: () => !!currentUser,
        getUser: () => currentUser,
        open: (mode) => { showScreen(); if (mode) setMode(mode); },
        close: hideScreen,
        logout: doLogout,
        onAuthChange: (cb) => {
            if (typeof cb !== 'function') return;
            listeners.push(cb);
            try { cb(currentUser); } catch (e) { console.error(e); }
        },
        makeAvatar
    };

    /* ══════════════ Init ══════════════ */
    function init() {
        injectStyles();

        const session = getSession();
        if (session && session.email) {
            const users = getUsers();
            if (users[session.email]) {
                currentUser = session;
                // لا نعرض الشاشة
                setTimeout(notify, 0);
                return;
            }
        }

        // ما فيه جلسة → أظهر الشاشة
        showScreen();
        setTimeout(notify, 0);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
