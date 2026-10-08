/* ═══════════════════════════════════════════════════════════
   MEN Ai — Session Reader (xain.js)
   يقرأ الجلسة المحفوظة من login.html ويوفر MEN_AUTH لـ index.html
   ═══════════════════════════════════════════════════════════ */

(function () {
    'use strict';

    const SESSION_KEY = 'menAuthSession';
    let currentUser = null;
    const listeners = [];

    function readSession() {
        try {
            const s = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
            return (s && s.email) ? s : null;
        } catch (e) { return null; }
    }

    function notify() {
        listeners.forEach(cb => {
            try { cb(currentUser); } catch (e) { console.error(e); }
        });
    }

    function makeAvatar(name, size) {
        const seed = encodeURIComponent((name || 'user').trim());
        return `https://api.dicebear.com/7.x/initials/svg?seed=${seed}&backgroundColor=1e3a8a,2563eb,3b82f6,60a5fa&fontFamily=Cairo&fontSize=42&chars=1&textColor=ffffff`;
    }

    /* ═══ Public API ═══ */
    window.MEN_AUTH = {
        isLoggedIn: () => !!currentUser,
        getUser: () => currentUser,

        /* يفتح صفحة تسجيل الدخول */
        open: () => {
            window.location.href = 'login.html';
        },

        /* تسجيل الخروج ثم الانتقال لصفحة الدخول */
        logout: () => {
            try { localStorage.removeItem(SESSION_KEY); } catch (e) {}
            currentUser = null;
            notify();
            window.location.href = 'login.html';
        },

        onAuthChange: (cb) => {
            if (typeof cb !== 'function') return;
            listeners.push(cb);
            try { cb(currentUser); } catch (e) { console.error(e); }
        },

        makeAvatar
    };

    /* ═══ Init ═══ */
    function init() {
        currentUser = readSession();

        // لو مو مسجّل دخول، حوّله لصفحة تسجيل الدخول
        if (!currentUser) {
            window.location.href = 'login.html';
            return;
        }

        setTimeout(notify, 0);
    }

    // انتظر تحميل الصفحة كاملاً
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
