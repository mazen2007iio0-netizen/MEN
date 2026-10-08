/* ═══════════════════════════════════════════════════════════════
   MEN Ai — Full Screen Auth with Supabase (xain.js)
   شاشة تسجيل دخول كاملة الحجم — ربط مباشر مع Supabase
   ═══════════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    /* ═══ Supabase Config ═══ */
    const SUPABASE_URL      = 'https://xoqwzluyxynqpdpmidts.supabase.co';
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhvcXd6bHV5eHlucXBkcG1pZHRzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTAxMTI2NDAsImV4cCI6MjEwNTY4ODY0MH0.xIpvxJyAMAoLqkSR9RJk2ZcgN7rsfOg2OfbelraMWvs';

    /* ═══ الحالة ═══ */
    let supabase = null;
    let currentUser = null;
    let currentMode = 'login';
    let isLoading = false;
    let screenEl = null;
    let bootDone = false;
    const listeners = [];

    /* ══════════════ Helpers ══════════════ */
    function notify() {
        listeners.forEach(cb => { try { cb(currentUser); } catch (e) { console.error(e); } });
    }
    function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
    function makeAvatar(name) {
        const seed = encodeURIComponent((name || 'user').trim());
        return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e3a8a,2563eb,3b82f6,60a5fa&fontFamily=Cairo&fontSize=42&chars=1&textColor=ffffff`;
    }

    /* ═══ ترجمة أخطاء Supabase للعربية ═══ */
    function translateError(msg) {
        if (!msg) return 'حدث خطأ غير متوقع';
        const m = msg.toLowerCase();
        if (m.includes('invalid login credentials'))   return 'البريد أو كلمة المرور غير صحيحة';
        if (m.includes('email not confirmed'))         return 'يجب تأكيد البريد الإلكتروني أولاً';
        if (m.includes('user already registered'))     return 'هذا البريد مسجّل مسبقاً';
        if (m.includes('password should be at least')) return 'كلمة المرور قصيرة جداً';
        if (m.includes('unable to validate email'))    return 'البريد الإلكتروني غير صحيح';
        if (m.includes('email rate limit'))            return 'محاولات كثيرة — جرب لاحقاً';
        if (m.includes('signup is disabled'))          return 'التسجيل معطّل حالياً';
        if (m.includes('network'))                     return 'تعذّر الاتصال بالخادم';
        if (m.includes('too many requests'))           return 'محاولات كثيرة — انتظر قليلاً';
        return msg;
    }

    /* ══════════════ CSS ══════════════ */
    function injectStyles() {
        if (document.getElementById('men-auth-styles')) return;
        const s = document.createElement('style');
        s.id = 'men-auth-styles';
        s.textContent = `
.men-auth-screen {
    position: fixed;
    inset: 0;
    z-index: 999999;
    background: #03060d;
    overflow: hidden;
    font-family: 'Cairo', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    color: #e8eefc;
    -webkit-font-smoothing: antialiased;
    opacity: 0;
    pointer-events: none;
    transition: opacity .55s cubic-bezier(.16, 1, .3, 1);
}
.men-auth-screen.show { opacity: 1; pointer-events: auto; }
.men-auth-screen.hiding {
    opacity: 0;
    transform: scale(1.05);
    transition: opacity .6s ease, transform .6s ease;
}

/* ═══ الخلفيات الضخمة ═══ */
.men-bg {
    position: absolute;
    inset: 0;
    overflow: hidden;
    pointer-events: none;
}
.men-bg-orb {
    position: absolute;
    border-radius: 50%;
    filter: blur(140px);
    opacity: .45;
    will-change: transform;
}
.men-bg-orb.o1 {
    width: 780px; height: 780px;
    background: radial-gradient(circle, #1e40af 0%, #1e3a8a 40%, transparent 70%);
    top: -320px; right: -280px;
    animation: menOrb1 26s ease-in-out infinite;
}
.men-bg-orb.o2 {
    width: 660px; height: 660px;
    background: radial-gradient(circle, #2563eb 0%, #1e40af 40%, transparent 70%);
    bottom: -280px; left: -240px;
    animation: menOrb2 32s ease-in-out infinite;
    opacity: .35;
}
.men-bg-orb.o3 {
    width: 460px; height: 460px;
    background: radial-gradient(circle, #3b82f6 0%, #2563eb 40%, transparent 70%);
    top: 35%; left: 45%;
    animation: menOrb3 24s ease-in-out infinite;
    opacity: .18;
}
@keyframes menOrb1 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(-80px, 90px) scale(1.15); }
}
@keyframes menOrb2 {
    0%, 100% { transform: translate(0, 0) scale(1); }
    50% { transform: translate(90px, -70px) scale(1.2); }
}
@keyframes menOrb3 {
    0%, 100% { transform: translate(-50%, -50%) scale(1); }
    50% { transform: translate(-45%, -55%) scale(1.3); }
}
.men-bg-grid {
    position: absolute;
    inset: 0;
    background-image:
        linear-gradient(rgba(96, 165, 250, .028) 1px, transparent 1px),
        linear-gradient(90deg, rgba(96, 165, 250, .028) 1px, transparent 1px);
    background-size: 64px 64px;
    mask-image: radial-gradient(ellipse 80% 70% at center, black 10%, transparent 80%);
    -webkit-mask-image: radial-gradient(ellipse 80% 70% at center, black 10%, transparent 80%);
}
.men-bg-noise {
    position: absolute;
    inset: 0;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='200' height='200' filter='url(%23n)' opacity='0.35'/%3E%3C/svg%3E");
    opacity: .04;
    mix-blend-mode: overlay;
}

.men-auth-layer {
    position: relative;
    z-index: 5;
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px 24px;
    overflow-y: auto;
    overscroll-behavior: contain;
}

.men-auth-grid {
    width: 100%;
    max-width: 1180px;
    display: grid;
    grid-template-columns: 1fr 460px;
    gap: 60px;
    align-items: center;
    animation: menGridIn 1s cubic-bezier(.16, 1, .3, 1);
}
@keyframes menGridIn {
    from { opacity: 0; transform: translateY(30px); }
    to { opacity: 1; transform: none; }
}

/* ═══ الجانب الأيسر — البراندينج ═══ */
.men-brand {
    display: flex;
    flex-direction: column;
    gap: 26px;
    padding: 20px 0;
    animation: menBrandIn 1.2s cubic-bezier(.16, 1, .3, 1) .1s both;
}
@keyframes menBrandIn {
    from { opacity: 0; transform: translateX(-24px); filter: blur(6px); }
    to { opacity: 1; transform: none; filter: blur(0); }
}
.men-brand-tag {
    display: inline-flex;
    align-items: center;
    gap: 9px;
    padding: 7px 14px;
    border-radius: 30px;
    background: rgba(37, 99, 235, .12);
    border: 1px solid rgba(96, 165, 250, .22);
    font-size: .74rem;
    font-weight: 700;
    color: #93c5fd;
    letter-spacing: .04em;
    text-transform: uppercase;
    width: fit-content;
}
.men-brand-tag i { font-size: .72rem; }
.men-brand-title {
    font-size: clamp(2rem, 4.5vw, 3.2rem);
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -.035em;
    color: #ffffff;
}
.men-brand-title .grad {
    background: linear-gradient(135deg, #60a5fa 0%, #93c5fd 50%, #ffffff 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    display: block;
}
.men-brand-desc {
    font-size: 1.02rem;
    line-height: 1.85;
    color: #9db0d0;
    max-width: 520px;
    font-weight: 500;
}
.men-brand-sweep {
    width: 100%;
    max-width: 460px;
    display: flex;
    flex-direction: column;
    gap: 9px;
    margin-top: 6px;
}
.men-sweep-big {
    height: 2px;
    width: 100%;
    border-radius: 3px;
    background: linear-gradient(90deg,
        transparent 0%,
        rgba(96, 165, 250, .08) 8%,
        rgba(96, 165, 250, .9) 55%,
        rgba(147, 197, 253, 1) 75%,
        rgba(96, 165, 250, .3) 92%,
        transparent 100%);
    transform-origin: right;
    transform: scaleX(0);
    animation: menBigSweep 3s cubic-bezier(.4, 0, .2, 1) infinite;
    position: relative;
    box-shadow: 0 0 16px rgba(96, 165, 250, .6), 0 0 30px rgba(37, 99, 235, .4);
}
.men-sweep-big.short { width: 70%; height: 1.5px; animation-delay: .4s; opacity: .8; }
.men-sweep-big.thin { width: 45%; height: 1px; animation-delay: .8s; opacity: .55; }
@keyframes menBigSweep {
    0% { transform: scaleX(0); opacity: 0; }
    12% { opacity: 1; }
    55% { transform: scaleX(1); opacity: 1; }
    82% { transform: scaleX(1); opacity: .35; }
    100% { transform: scaleX(1) translateX(-28%); opacity: 0; }
}
.men-sweep-big::after {
    content: '';
    position: absolute;
    top: 50%;
    right: 0;
    width: 7px; height: 7px;
    border-radius: 50%;
    background: #ffffff;
    transform: translate(0, -50%);
    box-shadow: 0 0 14px #93c5fd, 0 0 28px #60a5fa, 0 0 42px rgba(96, 165, 250, .8);
    animation: menBigSpark 3s cubic-bezier(.4, 0, .2, 1) infinite;
    opacity: 0;
}
.men-sweep-big.short::after { animation-delay: .4s; width: 5px; height: 5px; }
.men-sweep-big.thin::after { animation-delay: .8s; width: 4px; height: 4px; }
@keyframes menBigSpark {
    0% { opacity: 0; right: 0; }
    12% { opacity: 1; right: 0; }
    55% { opacity: 1; right: 100%; }
    82% { opacity: .4; right: 100%; }
    100% { opacity: 0; right: 100%; }
}
.men-brand-feats {
    display: flex;
    flex-wrap: wrap;
    gap: 14px 26px;
    margin-top: 8px;
}
.men-feat {
    display: flex;
    align-items: center;
    gap: 10px;
    font-size: .84rem;
    font-weight: 600;
    color: #9db0d0;
}
.men-feat i {
    width: 26px; height: 26px;
    border-radius: 8px;
    background: rgba(37, 99, 235, .14);
    border: 1px solid rgba(96, 165, 250, .2);
    color: #60a5fa;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: .7rem;
}

/* ═══ الجانب الأيمن — النموذج ═══ */
.men-form-side {
    width: 100%;
    animation: menFormIn 1.2s cubic-bezier(.16, 1, .3, 1) .25s both;
}
@keyframes menFormIn {
    from { opacity: 0; transform: translateX(24px); filter: blur(6px); }
    to { opacity: 1; transform: none; filter: blur(0); }
}
.men-form-card {
    background: linear-gradient(180deg, rgba(13, 26, 46, .95) 0%, rgba(8, 18, 34, .95) 100%);
    border: 1px solid rgba(96, 165, 250, .16);
    border-radius: 26px;
    padding: 38px 34px 30px;
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    position: relative;
    overflow: hidden;
    box-shadow:
        0 40px 100px rgba(0, 0, 0, .85),
        inset 0 1px 0 rgba(255, 255, 255, .04),
        0 0 80px rgba(37, 99, 235, .12);
    transition: transform .3s ease;
}
.men-form-card::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(96, 165, 250, .5), transparent);
}
.men-form-card.success { animation: menCardSuccess .75s ease; }
@keyframes menCardSuccess {
    0% { transform: scale(1); }
    30% { transform: scale(1.025); box-shadow: 0 40px 100px rgba(0,0,0,.85), 0 0 130px rgba(37,99,235,.7); }
    100% { transform: scale(1); }
}

.men-form-logo {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 10px;
    margin-bottom: 26px;
}
.men-form-logo-stage {
    position: relative;
    width: 82px; height: 82px;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-bottom: 2px;
}
.men-form-aura {
    position: absolute;
    inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(59, 130, 246, .4) 0%, rgba(37, 99, 235, .15) 40%, transparent 70%);
    animation: menAuraPulse 3.5s ease-in-out infinite;
    filter: blur(6px);
}
@keyframes menAuraPulse {
    0%, 100% { transform: scale(.9); opacity: .55; }
    50% { transform: scale(1.18); opacity: 1; }
}
.men-form-ring {
    position: absolute;
    inset: 8px;
    border-radius: 50%;
    border: 1.5px solid transparent;
    border-top-color: rgba(96, 165, 250, .8);
    border-right-color: rgba(96, 165, 250, .15);
    animation: menSpin 8s linear infinite;
}
.men-form-ring.r2 {
    inset: 18px;
    border-top-color: rgba(147, 197, 253, .55);
    border-left-color: rgba(96, 165, 250, .15);
    animation: menSpin 6s linear infinite reverse;
}
@keyframes menSpin { to { transform: rotate(360deg); } }
.men-form-icon {
    font-size: 1.7rem;
    position: relative;
    z-index: 3;
    filter: drop-shadow(0 0 14px rgba(96, 165, 250, .9)) drop-shadow(0 0 28px rgba(37, 99, 235, .6));
    animation: menIconFloat 4s ease-in-out infinite;
    background: linear-gradient(135deg, #ffffff 0%, #93c5fd 55%, #60a5fa 100%);
    -webkit-background-clip: text;
    background-clip: text;
    -webkit-text-fill-color: transparent;
}
@keyframes menIconFloat {
    0%, 100% { transform: translateY(0) rotate(0deg); }
    50% { transform: translateY(-6px) rotate(-5deg); }
}
.men-form-title {
    font-size: 1.35rem;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: -.025em;
    margin: 0;
}
.men-form-sub {
    font-size: .82rem;
    color: #9db0d0;
    margin: 0;
}

.men-form {
    display: flex;
    flex-direction: column;
    gap: 14px;
}
.men-field {
    display: flex;
    flex-direction: column;
    gap: 8px;
    animation: menFieldIn .55s cubic-bezier(.16, 1, .3, 1) both;
}
.men-field.hidden { display: none; }
.men-field:nth-child(1) { animation-delay: .05s; }
.men-field:nth-child(2) { animation-delay: .12s; }
.men-field:nth-child(3) { animation-delay: .19s; }
.men-field:nth-child(4) { animation-delay: .26s; }
@keyframes menFieldIn {
    from { opacity: 0; transform: translateY(10px); }
    to { opacity: 1; transform: none; }
}
.men-field label {
    font-size: .76rem;
    font-weight: 700;
    color: #9db0d0;
    padding-inline-start: 4px;
    letter-spacing: .01em;
}
.men-input-wrap {
    display: flex;
    align-items: center;
    gap: 12px;
    background: rgba(5, 10, 20, .75);
    border: 1px solid rgba(96, 165, 250, .13);
    border-radius: 14px;
    padding: 0 14px;
    transition: border-color .2s, box-shadow .2s, background .2s, transform .2s;
    position: relative;
    min-height: 50px;
}
.men-input-wrap:focus-within {
    border-color: rgba(96, 165, 250, .55);
    background: rgba(10, 22, 40, .95);
    box-shadow: 0 0 0 4px rgba(37, 99, 235, .14), 0 8px 24px -8px rgba(37, 99, 235, .4);
    transform: translateY(-1px);
}
.men-input-wrap > i {
    color: #5c6f92;
    font-size: .88rem;
    width: 18px;
    text-align: center;
    flex-shrink: 0;
    transition: color .2s;
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
    font-size: .93rem;
    padding: 14px 0;
}
.men-input-wrap input::placeholder { color: #455878; }
.men-input-wrap input:-webkit-autofill {
    -webkit-text-fill-color: #e8eefc;
    -webkit-box-shadow: 0 0 0 1000px rgba(5, 10, 20, .9) inset;
    transition: background-color 9999s ease-in-out 0s;
}
.men-eye {
    width: 34px; height: 34px;
    border-radius: 9px;
    border: none;
    background: transparent;
    color: #5c6f92;
    cursor: pointer;
    font-size: .82rem;
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
    transition: .18s;
}
.men-eye:hover { background: rgba(96, 165, 250, .1); color: #60a5fa; }

.men-error {
    display: none;
    color: #f87171;
    background: rgba(239, 65, 70, .08);
    border: 1px solid rgba(239, 65, 70, .25);
    border-radius: 12px;
    padding: 11px 14px;
    font-size: .82rem;
    font-weight: 600;
    text-align: center;
}
.men-error.show { display: block; animation: menErrIn .35s ease; }
@keyframes menErrIn {
    from { opacity: 0; transform: translateY(-6px) scale(.96); }
    to { opacity: 1; transform: none; }
}

.men-info {
    display: none;
    color: #60a5fa;
    background: rgba(37, 99, 235, .1);
    border: 1px solid rgba(96, 165, 250, .25);
    border-radius: 12px;
    padding: 11px 14px;
    font-size: .82rem;
    font-weight: 600;
    text-align: center;
    line-height: 1.6;
}
.men-info.show { display: block; animation: menErrIn .35s ease; }

.men-submit {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    margin-top: 8px;
    padding: 15px 20px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #1e40af 0%, #2563eb 45%, #3b82f6 100%);
    color: #ffffff;
    font-family: inherit;
    font-size: .95rem;
    font-weight: 700;
    letter-spacing: .01em;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition: transform .2s, box-shadow .2s;
    box-shadow:
        0 12px 34px -8px rgba(37, 99, 235, .9),
        0 0 0 1px rgba(96, 165, 250, .2) inset,
        0 1px 0 rgba(255,255,255,.14) inset;
}
.men-submit::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(135deg, transparent 0%, rgba(255,255,255,.15) 50%, transparent 100%);
    transform: translateX(-100%);
    transition: transform .6s ease;
}
.men-submit:hover:not(:disabled)::before { transform: translateX(100%); }
.men-submit:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow:
        0 18px 42px -8px rgba(59, 130, 246, 1),
        0 0 0 1px rgba(147, 197, 253, .3) inset,
        0 1px 0 rgba(255,255,255,.18) inset;
}
.men-submit:active:not(:disabled) { transform: translateY(0) scale(.985); }
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

.men-switch {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    margin-top: 20px;
    padding-top: 20px;
    border-top: 1px solid rgba(96, 165, 250, .1);
    font-size: .83rem;
    color: #5c6f92;
    font-weight: 500;
}
.men-switch button {
    background: transparent;
    border: none;
    color: #60a5fa;
    font-family: inherit;
    font-size: .83rem;
    font-weight: 700;
    cursor: pointer;
    padding: 5px 8px;
    border-radius: 8px;
    transition: .18s;
}
.men-switch button:hover {
    background: rgba(96, 165, 250, .12);
    color: #93c5fd;
}

/* ═══ شاشة التحميل الأولية ═══ */
.men-boot {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-direction: column;
    gap: 20px;
    z-index: 10;
    transition: opacity .4s ease;
}
.men-boot.hide { opacity: 0; pointer-events: none; }
.men-boot-spinner {
    width: 42px; height: 42px;
    border: 3px solid rgba(96, 165, 250, .15);
    border-top-color: #60a5fa;
    border-radius: 50%;
    animation: menSpinBtn .8s linear infinite;
}
.men-boot-text {
    font-size: .85rem;
    color: #60a5fa;
    font-weight: 600;
    letter-spacing: .02em;
}

@media (max-width: 960px) {
    .men-auth-grid { grid-template-columns: 1fr; gap: 0; max-width: 480px; }
    .men-brand { display: none; }
    .men-form-card { padding: 34px 26px 26px; }
}
@media (max-width: 480px) {
    .men-auth-layer { padding: 20px 14px; }
    .men-form-card { padding: 30px 22px 22px; border-radius: 22px; }
    .men-form-title { font-size: 1.2rem; }
    .men-form-logo-stage { width: 74px; height: 74px; }
    .men-form-icon { font-size: 1.5rem; }
    .men-input-wrap input { font-size: 16px; }
}
@media (max-height: 640px) {
    .men-auth-layer { align-items: flex-start; padding-top: 30px; }
    .men-form-logo { margin-bottom: 18px; }
    .men-form-logo-stage { width: 68px; height: 68px; }
    .men-form-icon { font-size: 1.4rem; }
    .men-form { gap: 11px; }
    .men-input-wrap { min-height: 46px; }
    .men-submit { padding: 13px 18px; }
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
            <div class="men-bg">
                <div class="men-bg-orb o1"></div>
                <div class="men-bg-orb o2"></div>
                <div class="men-bg-orb o3"></div>
                <div class="men-bg-grid"></div>
                <div class="men-bg-noise"></div>
            </div>

            <div class="men-boot" data-boot>
                <div class="men-boot-spinner"></div>
                <div class="men-boot-text">جارٍ التحقق من الجلسة...</div>
            </div>

            <div class="men-auth-layer">
                <div class="men-auth-grid">

                    <div class="men-brand">
                        <span class="men-brand-tag">
                            <i class="fas fa-sparkles"></i>
                            مدعوم بالذكاء الاصطناعي
                        </span>
                        <h1 class="men-brand-title">
                            مرحباً بك في
                            <span class="grad">MEN Ai</span>
                        </h1>
                        <p class="men-brand-desc">
                            مساعدك الذكي للإجابة على أسئلتك، تحليل ملفاتك، وإنجاز مهامك بسرعة ودقة واحترافية.
                        </p>
                        <div class="men-brand-sweep">
                            <div class="men-sweep-big"></div>
                            <div class="men-sweep-big short"></div>
                            <div class="men-sweep-big thin"></div>
                        </div>
                        <div class="men-brand-feats">
                            <div class="men-feat">
                                <i class="fas fa-bolt"></i>
                                <span>ردود فورية</span>
                            </div>
                            <div class="men-feat">
                                <i class="fas fa-shield-halved"></i>
                                <span>حساب آمن</span>
                            </div>
                            <div class="men-feat">
                                <i class="fas fa-file-lines"></i>
                                <span>تحليل الملفات</span>
                            </div>
                        </div>
                    </div>

                    <div class="men-form-side">
                        <div class="men-form-card">
                            <div class="men-form-logo">
                                <div class="men-form-logo-stage">
                                    <div class="men-form-aura"></div>
                                    <div class="men-form-ring"></div>
                                    <div class="men-form-ring r2"></div>
                                    <i class="fas fa-user-shield men-form-icon"></i>
                                </div>
                                <h2 class="men-form-title" data-title>تسجيل الدخول</h2>
                                <p class="men-form-sub" data-sub>أدخل بياناتك للمتابعة</p>
                            </div>

                            <form class="men-form" novalidate>
                                <div class="men-field hidden" data-field-name>
                                    <label>الاسم</label>
                                    <div class="men-input-wrap">
                                        <i class="fas fa-user"></i>
                                        <input type="text" name="name" autocomplete="name" placeholder="اسمك الكامل">
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
                                <div class="men-info" data-info></div>

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
                if (input.type === 'password') { input.type = 'text'; icon.className = 'fas fa-eye-slash'; }
                else { input.type = 'password'; icon.className = 'fas fa-eye'; }
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
        screenEl.querySelector('[data-sub]').textContent = isLogin ? 'أدخل بياناتك للمتابعة' : 'انشئ حسابك للبدء باستخدام MEN Ai';
        screenEl.querySelector('[data-submit-text]').textContent = isLogin ? 'دخول' : 'إنشاء الحساب';
        screenEl.querySelector('[data-switch-text]').textContent = isLogin ? 'ليس لديك حساب؟' : 'لديك حساب بالفعل؟';
        screenEl.querySelector('[data-switch-btn]').textContent = isLogin ? 'إنشاء حساب جديد' : 'تسجيل الدخول';
        screenEl.querySelector('[data-field-name]').classList.toggle('hidden', isLogin);
        screenEl.querySelector('[data-field-confirm]').classList.toggle('hidden', isLogin);
        screenEl.querySelector('input[name="password"]').autocomplete = isLogin ? 'current-password' : 'new-password';
        setError('');
        setInfo('');
    }

    function setError(msg) {
        const el = screenEl.querySelector('[data-error]');
        el.textContent = msg || '';
        el.classList.toggle('show', !!msg);
        if (msg) setInfo('');
    }
    function setInfo(msg) {
        const el = screenEl.querySelector('[data-info]');
        el.textContent = msg || '';
        el.classList.toggle('show', !!msg);
    }
    function setLoading(v) {
        isLoading = v;
        const btn = screenEl.querySelector('.men-submit');
        btn.disabled = v;
        btn.classList.toggle('loading', v);
    }

    /* ══════════════ إرسال النموذج ══════════════ */
    async function handleSubmit(e) {
        e.preventDefault();
        if (isLoading) return;
        if (!supabase) { setError('جارٍ التحميل...'); return; }

        const form = screenEl.querySelector('form');
        const name = form.name ? form.name.value.trim() : '';
        const email = (form.email.value || '').trim().toLowerCase();
        const password = form.password.value || '';
        const confirm = form.confirm ? form.confirm.value : '';

        setError('');
        setInfo('');

        if (!email) return setError('الرجاء إدخال البريد الإلكتروني');
        if (!isValidEmail(email)) return setError('البريد الإلكتروني غير صحيح');
        if (!password) return setError('الرجاء إدخال كلمة المرور');
        if (password.length < 6) return setError('كلمة المرور يجب أن تكون 6 أحرف على الأقل');

        setLoading(true);

        try {
            if (currentMode === 'signup') {
                if (!name) { setLoading(false); return setError('الرجاء إدخال الاسم'); }
                if (password !== confirm) { setLoading(false); return setError('كلمتا المرور غير متطابقتين'); }

                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: { name },
                        emailRedirectTo: window.location.origin
                    }
                });

                if (error) {
                    setLoading(false);
                    return setError(translateError(error.message));
                }

                // إذا الحساب يحتاج تأكيد إيميل
                if (data.user && !data.session) {
                    setLoading(false);
                    setMode('login');
                    setInfo('✅ تم إنشاء حسابك. تحقق من بريدك الإلكتروني لتأكيد الحساب.');
                    return;
                }

                // دخول مباشر (لو التأكيد مغلق)
                if (data.session && data.user) {
                    completeLogin(data.user);
                }
            } else {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    setLoading(false);
                    return setError(translateError(error.message));
                }

                if (data.user) completeLogin(data.user);
                else { setLoading(false); setError('فشل تسجيل الدخول'); }
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
            setError('حدث خطأ — حاول مرة أخرى');
        }
    }

    /* ══════════════ إتمام الدخول ══════════════ */
    function completeLogin(user) {
        currentUser = {
            id: user.id,
            email: user.email,
            user_metadata: user.user_metadata || {},
            created_at: user.created_at
        };
        setLoading(false);

        const card = screenEl.querySelector('.men-form-card');
        card.classList.add('success');

        setTimeout(() => {
            hideScreen();
            notify();
        }, 750);
    }

    function showScreen() {
        buildScreen();
        screenEl.style.display = '';
        screenEl.classList.remove('hiding');
        requestAnimationFrame(() => screenEl.classList.add('show'));
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
        }, 600);
    }

    async function doLogout() {
        try {
            if (supabase) await supabase.auth.signOut();
        } catch (e) { console.error(e); }

        currentUser = null;

        if (screenEl) {
            screenEl.style.display = '';
            screenEl.querySelector('form').reset();
            screenEl.querySelectorAll('.men-eye i').forEach(i => i.className = 'fas fa-eye');
            screenEl.querySelectorAll('input').forEach(i => {
                if (i.name === 'password' || i.name === 'confirm') i.type = 'password';
            });
            setMode('login');
            setError('');
            setInfo('');
            showScreen();
        } else {
            showScreen();
        }
        notify();
    }

    /* ══════════════ API ══════════════ */
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
    async function init() {
        injectStyles();

        // انتظر تحميل مكتبة Supabase
        if (!window.supabase) {
            await new Promise(r => {
                let tries = 0;
                const iv = setInterval(() => {
                    if (window.supabase || tries++ > 40) { clearInterval(iv); r(); }
                }, 100);
            });
        }

        if (!window.supabase) {
            console.error('[MEN_AUTH] Supabase library not loaded');
            // اعرض الشاشة بأي حال مع رسالة
            buildScreen();
            showScreen();
            setError('تعذّر تحميل مكتبة المصادقة — تحقق من الاتصال');
            return;
        }

        // إنشاء العميل
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true,
                storageKey: 'men-ai-auth'
            }
        });

        // ربط حدث تغيير الحالة
        supabase.auth.onAuthStateChange((event, session) => {
            if (session && session.user) {
                currentUser = {
                    id: session.user.id,
                    email: session.user.email,
                    user_metadata: session.user.user_metadata || {},
                    created_at: session.user.created_at
                };
                // إخفاء الشاشة لو ظاهرة
                if (screenEl && screenEl.classList.contains('show') && event === 'SIGNED_IN') {
                    hideScreen();
                }
                notify();
            } else {
                currentUser = null;
                notify();
            }
        });

        // تحقق من الجلسة الحالية
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.user) {
            currentUser = {
                id: session.user.id,
                email: session.user.email,
                user_metadata: session.user.user_metadata || {},
                created_at: session.user.created_at
            };
            // لا تعرض الشاشة — المستخدم مسجل
            setTimeout(notify, 0);
        } else {
            // ما فيه جلسة — أظهر الشاشة
            showScreen();
            setTimeout(notify, 0);
        }

        bootDone = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
