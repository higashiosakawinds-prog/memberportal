/**
 * 東大阪吹奏楽団 DXシステム — PWA 初期化
 *  - manifest / apple-touch-icon の注入
 *  - Service Worker の登録
 *  - ホーム画面追加の案内バナー（Android: ワンタップ / iOS: 手順表示）
 *
 * ルート・pages/・pages/auth/ のどこから読み込まれても動くよう、
 * パスから相対プレフィックスを計算しています。
 */
(function () {
  const p = location.pathname;
  const ROOT = p.includes('/pages/auth/') ? '../../' : p.includes('/pages/') ? '../' : '';

  // ── manifest / アイコン ──
  if (!document.querySelector('link[rel="manifest"]')) {
    const l = document.createElement('link');
    l.rel = 'manifest';
    l.href = ROOT + 'manifest.webmanifest';
    document.head.appendChild(l);
  }
  if (!document.querySelector('link[rel="apple-touch-icon"]')) {
    const l = document.createElement('link');
    l.rel = 'apple-touch-icon';
    l.href = ROOT + 'apple-touch-icon-180x180.png';
    document.head.appendChild(l);
  }

  // ── Service Worker 登録 ──
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register(ROOT + 'sw.js').catch(err =>
        console.warn('[HighasuiDX] Service Worker 登録失敗:', err.message));
    });
  }

  // ── インストール案内 ──
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const DISMISS_KEY = 'pwa_install_dismissed_at';
  const dismissedRecently = () => {
    const t = Number(localStorage.getItem(DISMISS_KEY) || 0);
    return Date.now() - t < 14 * 24 * 60 * 60 * 1000; // 14日間は再表示しない
  };
  // ログイン画面・登録画面では出さない
  const isAuthPage = p.includes('/pages/auth/');

  let deferredPrompt = null;

  function showBanner(html, onInstall) {
    if (document.getElementById('pwa-install-banner')) return;
    const el = document.createElement('div');
    el.id = 'pwa-install-banner';
    el.style.cssText =
      'position:fixed;left:12px;right:12px;bottom:12px;z-index:2500;max-width:420px;margin:0 auto;' +
      'background:#0d1b2a;color:#fff;border:1px solid rgba(201,168,76,.4);border-radius:12px;' +
      'padding:14px 16px;box-shadow:0 8px 24px rgba(0,0,0,.35);font-size:13px;line-height:1.7;';
    el.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start;">
        <div style="flex:1;">${html}</div>
        <button type="button" id="pwa-banner-close" aria-label="閉じる"
          style="color:#9ca3af;font-size:18px;line-height:1;background:none;border:none;cursor:pointer;">×</button>
      </div>
      ${onInstall ? `<div style="text-align:right;margin-top:8px;">
        <button type="button" id="pwa-banner-install"
          style="background:#c9a84c;color:#0d1b2a;font-weight:700;font-size:13px;border:none;border-radius:8px;padding:8px 18px;cursor:pointer;">
          ホーム画面に追加</button></div>` : ''}`;
    document.body.appendChild(el);
    el.querySelector('#pwa-banner-close').onclick = () => {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
      el.remove();
    };
    if (onInstall) el.querySelector('#pwa-banner-install').onclick = () => { onInstall(); el.remove(); };
  }

  // Android / Chrome / Edge
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    if (isStandalone || isAuthPage || dismissedRecently()) return;
    document.addEventListener('DOMContentLoaded', () => {}, { once: true });
    const show = () => showBanner(
      '<strong>ひがすいポータルをアプリとして使えます</strong><br>ホーム画面に追加すると、すぐ開けて全画面で表示されます。',
      async () => {
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt = null;
      }
    );
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  });

  window.addEventListener('appinstalled', () => {
    document.getElementById('pwa-install-banner')?.remove();
    deferredPrompt = null;
  });

  // iOS Safari（beforeinstallprompt が無いため手順を案内）
  if (isIOS && !isStandalone && !isAuthPage && !dismissedRecently()) {
    const show = () => showBanner(
      '<strong>ホーム画面に追加してアプリのように使えます</strong><br>' +
      'Safari下部の<strong>共有ボタン</strong>（□↑）→<strong>「ホーム画面に追加」</strong>をタップしてください。'
    );
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', show); else show();
  }

  // ══════════════════════════════════════
  //  プッシュ通知
  // ══════════════════════════════════════
  // ★ `npx web-push generate-vapid-keys` で作成した「公開鍵」を貼り付けてください（秘密鍵は絶対に入れない）
  const VAPID_PUBLIC_KEY = 'BK7QD_FkF3V1pLaQliH0T8zt2uABb5kAJpMIbRhIgi982GwgMRD3WPv77FHD7weKw_ZnTVu55KzyNaU6_NAE0Ok';

  function urlB64ToUint8Array(b64) {
    const pad = '='.repeat((4 - (b64.length % 4)) % 4);
    const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
  }

  async function registerOnServer(sub) {
    const j = sub.toJSON();
    const { error } = await _sb.rpc('register_push_subscription', {
      p_endpoint: j.endpoint,
      p_p256dh:   j.keys.p256dh,
      p_auth:     j.keys.auth,
      p_ua:       navigator.userAgent,
    });
    if (error) throw error;
  }

  const HigasuiPush = {
    supported() {
      return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    },

    /** 'need-install'(iOSでホーム画面未追加) | 'unsupported' | 'denied' | 'on' | 'off' */
    async state() {
      if (isIOS && !isStandalone) return 'need-install';
      if (!this.supported()) return 'unsupported';
      if (Notification.permission === 'denied') return 'denied';
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      return (sub && Notification.permission === 'granted') ? 'on' : 'off';
    },

    /** 必ずボタンのクリックなど、ユーザー操作の中から呼ぶこと（iOS必須） */
    async enable() {
      if (!this.supported()) throw new Error('この端末・ブラウザはプッシュ通知に対応していません');
      if (VAPID_PUBLIC_KEY.startsWith('REPLACE_')) throw new Error('VAPID公開鍵が未設定です（pwa.js）');
      if (typeof _sb === 'undefined' || !_sb) throw new Error('Supabase未接続です');

      const perm = await Notification.requestPermission();
      if (perm !== 'granted') throw new Error('通知が許可されませんでした');

      const reg = await navigator.serviceWorker.ready;
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }
      await registerOnServer(sub);
    },

    /** この端末の通知をオフにする */
    async disable() {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      const endpoint = sub.endpoint;
      await sub.unsubscribe();
      if (typeof _sb !== 'undefined' && _sb) await _sb.from('push_subscriptions').delete().eq('endpoint', endpoint);
    },

    /** ログアウト直前に呼ぶ: サーバー上の紐付けだけ外す（別の人が同じ端末でログインしても前の人宛の通知が届かないように） */
    async detach() {
      try {
        if (!this.supported()) return;
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        if (sub && typeof _sb !== 'undefined' && _sb) {
          await _sb.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        }
      } catch (e) { console.warn('[HighasuiDX] push detach 失敗:', e.message); }
    },
  };

  // 許可済みの端末は、起動のたびに静かに再登録する（ユーザー切替・購読更新への追従）
  window.addEventListener('load', async () => {
    try {
      if (!HigasuiPush.supported() || Notification.permission !== 'granted') return;
      if (typeof getSessionUser === 'function' && !getSessionUser()) return;
      if (typeof _sb === 'undefined' || !_sb) return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) await registerOnServer(sub);
    } catch (e) { /* 未ログイン等は無視 */ }
  });

  // 他スクリプトから手動でインストールを促したい場合用
  window.HigasuiPWA = {
    isStandalone,
    push: HigasuiPush,
    async promptInstall() {
      if (!deferredPrompt) return false;
      deferredPrompt.prompt();
      const r = await deferredPrompt.userChoice;
      deferredPrompt = null;
      return r.outcome === 'accepted';
    },
    // アプリアイコンの数字バッジ（未回答アンケート数など）。非対応環境では何もしない
    setBadge(n) {
      if (!('setAppBadge' in navigator)) return;
      (n > 0 ? navigator.setAppBadge(n) : navigator.clearAppBadge()).catch(() => {});
    },
  };
})();
