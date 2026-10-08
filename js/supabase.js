/**
 * 東大阪吹奏楽団 DXシステム
 * Supabase クライアント設定
 *
 * ⚠️  本番利用前に以下を設定してください:
 *   1. Supabaseプロジェクトを作成 (https://supabase.com)
 *   2. SUPABASE_URL と SUPABASE_ANON_KEY を実際の値に書き換える
 *
 * セキュリティ注意事項:
 *   - anon key はフロントエンドから安全に使用可能（Row Level Security で保護）
 *   - service_role key は絶対にリポジトリにコミットしない
 *   - Supabaseダッシュボードで Row Level Security (RLS) を必ず有効にすること
 */

// ── 設定値（本番前にここを変更） ──
const SUPABASE_CONFIG = {
  url:     'https://iaqbkriorspsjldodhjy.supabase.co',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlhcWJrcmlvcnNwc2psZG9kaGp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg1MDE1MjEsImV4cCI6MjA5NDA3NzUyMX0.vuwBn8D2cvLdLRQ3X7rOPtHEG5cglY5wkzpnqOBVoJ8',
};

// ═══════════════════════════════════════════════════════
//  通信安定化レイヤー (Net)
//   ・Supabase全通信にタイムアウト＋自動リトライ（読み取りのみ）を適用
//   ・書き込み(POST/PATCH/DELETE)は二重登録防止のため自動リトライしない
//   ・GAS用の Net.gas() / 失敗表示用の Net.showError() / 通信状態バナー
// ═══════════════════════════════════════════════════════
const Net = (() => {
  const READ_TIMEOUT  = 15000;
  const WRITE_TIMEOUT = 45000;
  const RETRY_DELAYS  = [800, 2000];           // 最大2回リトライ
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // ── バナー ──
  let bannerEl = null, bannerTimer = null, failing = false;
  const recoverCbs = [];

  function banner(msg, { kind = 'warn', action = null } = {}) {
    if (!document.body) return;
    clearTimeout(bannerTimer);
    if (!bannerEl) {
      bannerEl = document.createElement('div');
      bannerEl.id = 'net-banner';
      bannerEl.setAttribute('role', 'status');
      document.body.appendChild(bannerEl);
    }
    const top = document.getElementById('site-header') ? 'var(--header-height,64px)' : '0';
    bannerEl.style.cssText =
      `position:fixed;left:0;right:0;top:${top};z-index:999;padding:8px 16px;` +
      `background:${kind === 'ok' ? '#1e8449' : '#b9770e'};color:#fff;font-size:13px;text-align:center;line-height:1.7;`;
    bannerEl.textContent = msg;
    if (action) {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = action.label;
      b.style.cssText = 'margin-left:12px;padding:2px 12px;border-radius:999px;border:1px solid #fff;color:#fff;background:transparent;font-size:12px;cursor:pointer;';
      b.onclick = action.fn;
      bannerEl.appendChild(b);
    }
  }
  function clearBanner() { clearTimeout(bannerTimer); bannerEl?.remove(); bannerEl = null; }

  function markFail() {
    failing = true;
    banner('通信が不安定です。表示中の情報が最新でない可能性があります。',
      { action: { label: '再読み込み', fn: () => location.reload() } });
  }
  function markOk() { if (failing) { failing = false; clearBanner(); } }

  window.addEventListener('offline', () => {
    failing = true;
    banner('オフラインです。通信が回復するまで、保存・送信はできません。');
  });
  window.addEventListener('online', () => {
    failing = false;
    banner('通信が回復しました。', { kind: 'ok', action: { label: '最新の情報に更新', fn: () => location.reload() } });
    bannerTimer = setTimeout(clearBanner, 8000);
    recoverCbs.forEach(fn => { try { fn(); } catch {} });
  });
  document.addEventListener('DOMContentLoaded', () => {
    if (navigator.onLine === false) window.dispatchEvent(new Event('offline'));
  });

  // ── タイムアウト付き fetch ──
  function withTimeout(init, ms) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), ms);
    if (init.signal) {
      if (init.signal.aborted) ctrl.abort();
      else init.signal.addEventListener('abort', () => ctrl.abort(), { once: true });
    }
    return { init: { ...init, signal: ctrl.signal }, done: () => clearTimeout(t) };
  }

  // Supabase SDK に差し込む fetch（GET/HEAD のみ自動リトライ）
  async function resilientFetch(input, init = {}) {
    const url    = String(input?.url ?? input);
    const method = String(init.method ?? input?.method ?? 'GET').toUpperCase();
    const isRead = method === 'GET' || method === 'HEAD';
    const noTimeout = url.includes('/storage/v1/');       // PDF等の大きいアップロードは対象外

    if (navigator.onLine === false) { throw new TypeError('オフラインのため通信できません'); }

    const attempts = isRead ? RETRY_DELAYS.length + 1 : 1;
    let lastErr;
    for (let i = 0; i < attempts; i++) {
      const t = noTimeout ? null : withTimeout(init, isRead ? READ_TIMEOUT : WRITE_TIMEOUT);
      try {
        const res = await fetch(input, t ? t.init : init);
        if (isRead && [408, 429, 502, 503, 504].includes(res.status) && i < attempts - 1) {
          lastErr = new Error('HTTP ' + res.status);
          await sleep(RETRY_DELAYS[i]);
          continue;
        }
        res.status >= 500 ? markFail() : markOk();
        return res;
      } catch (e) {
        lastErr = e;
        if (init.signal?.aborted) throw e;                // 呼び出し側が意図して中断
        if (i < attempts - 1) await sleep(RETRY_DELAYS[i]);
      } finally { t?.done(); }
    }
    markFail();
    throw lastErr;
  }

  // ── GAS（Google Apps Script）用：例外を投げず、必ず {ok, ...} を返す ──
  //   成功時  : GASが返したJSONそのもの（{ok:true, data:...}）
  //   通信失敗: { ok:false, network:true, error:'...' }
  //   GAS側エラー: { ok:false, error:'...' }（network は付かない）
  //   GET は自動リトライ。POST は二重登録防止のためリトライしない（retry:true で変更可）
  async function gas(url, { method = 'GET', body, timeout, retry } = {}) {
    const isGet    = method === 'GET';
    const attempts = (retry ?? isGet) ? RETRY_DELAYS.length + 1 : 1;
    const ms       = timeout ?? (isGet ? 25000 : 40000);   // GASはコールドスタートが遅い
    let lastErr = '通信に失敗しました';

    for (let i = 0; i < attempts; i++) {
      if (navigator.onLine === false) { lastErr = 'オフラインです'; break; }
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), ms);
      try {
        const res = await fetch(url, {
          method, redirect: 'follow', signal: ctrl.signal,
          ...(isGet ? {} : {
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(body),
          }),
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();                     // GASがエラーHTMLを返した場合ここで例外
        markOk();
        return json;
      } catch (e) {
        lastErr = e.name === 'AbortError' ? '応答がありません（タイムアウト）' : e.message;
        if (i < attempts - 1) await sleep(RETRY_DELAYS[i]);
      } finally { clearTimeout(t); }
    }
    markFail();
    return { ok: false, network: true, error: lastErr };
  }

  // ── 「0件」と区別できる失敗表示（再試行ボタン付き） ──
  function showError(el, retry, msg = '通信に失敗したため、データを取得できませんでした。') {
    if (!el) return;
    el.innerHTML = `
      <div style="text-align:center;padding:24px 16px;color:#6b7280;background:#fff;border-radius:12px;border:1px dashed #d1d5db;">
        <p style="font-size:.875rem;margin-bottom:${retry ? 12 : 0}px;">⚠ ${esc(msg)}</p>
        ${retry ? '<button type="button" class="btn btn-sm btn-outline" data-net-retry>再読み込み</button>' : ''}
      </div>`;
    el.querySelector('[data-net-retry]')?.addEventListener('click', retry);
  }

  // ── 二重実行防止（ダブルクリック・連打対策） ──
  const locks = new Set();
  async function lock(key, fn) {
    if (locks.has(key)) return;
    locks.add(key);
    try { return await fn(); } finally { locks.delete(key); }
  }

  return {
    fetch: resilientFetch, gas, banner, clearBanner, showError, lock,
    onRecover: fn => recoverCbs.push(fn),
  };
})();

// ── Supabaseクライアント ──
// window.supabase はSDKが注入するグローバル変数のため、
// 競合を避けるため別名 _sb で管理する
let _sb = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase SDK が読み込まれていません。');
    // ★追加：CDN読み込み失敗を利用者に知らせる
    Net.banner('必要なライブラリを読み込めませんでした。通信状況を確認して再読み込みしてください。',
      { action: { label: '再読み込み', fn: () => location.reload() } });
    return null;
  }
  // ★変更：global.fetch を差し替え
  _sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey, {
    global: { fetch: Net.fetch },
  });
  return _sb;
}

// ── 認証ヘルパー ──
const Auth = {
  async signIn(email, password) {
    if (!_sb) return { error: { message: 'Supabase未接続' } };
    const { data, error } = await _sb.auth.signInWithPassword({ email, password });
    if (data?.user) {
      const { data: profile } = await DB.profiles.get(data.user.id);
      if (profile) {
        // roles は text[] 配列。旧形式（role: text）との互換性も維持
        const roles = Array.isArray(profile.roles) && profile.roles.length > 0
          ? profile.roles
          : [profile.role].filter(Boolean);
        localStorage.setItem('hs_user', JSON.stringify({
          id:    profile.id,
          name:  `${profile.last_name}${profile.first_name}`,
          roles: roles,
          part:  profile.part,
        }));
      }
    }
    return { data, error };
  },

  async signOut() {
    await window.HigasuiPWA?.push?.detach?.();
    if (_sb) {
      // ★変更：サーバーへの通知に失敗しても、端末側のセッションは必ず破棄する
      const { error } = await _sb.auth.signOut();
      if (error) await _sb.auth.signOut({ scope: 'local' });
    }
    localStorage.removeItem('hs_user');
    const isRoot = !window.location.pathname.includes('/pages/');
    window.location.href = isRoot ? 'pages/auth/login.html' : '../pages/auth/login.html';
  },

  async getSession() {
    if (!_sb) return null;
    const { data } = await _sb.auth.getSession();
    return data?.session ?? null;
  },

  async requireAuth() {
    const session = await Auth.getSession();
    if (!session) {
      const isRoot = !window.location.pathname.includes('/pages/');
      window.location.href = isRoot ? 'pages/auth/login.html' : '../pages/auth/login.html';
      return false;
    }
    return true;
  },
};

// ── DBヘルパー ──
// 戻り値: { data, error }
// エラー時はコンソールに詳細を出力し、呼び出し元でフォールバックを判断できる
const DB = {
  profiles: {
    async get(userId) {
      if (!_sb) return { data: null, error: null };
      const { data, error } = await _sb.from('profiles').select('*').eq('id', userId).single();
      if (error) console.error('[HighasuiDX] profiles.get エラー:', error.message, error);
      return { data, error };
    },
    async list() {
      if (!_sb) return { data: [], error: null };
      const { data, error } = await _sb.from('profiles').select('*').order('part').order('last_name');
      if (error) console.error('[HighasuiDX] profiles.list エラー:', error.message, error);
      return { data: data ?? [], error };
    },
  },
  scores: {
    async list() {
      if (!_sb) return { data: [], error: null };
      const { data, error } = await _sb.from('scores').select('*').order('title');
      if (error) console.error('[HighasuiDX] scores.list エラー:', error.message, error);
      return { data: data ?? [], error };
    },
    async get(id) {
      if (!_sb) return { data: null, error: null };
      const { data, error } = await _sb.from('scores').select('*').eq('id', id).single();
      if (error) console.error('[HighasuiDX] scores.get エラー:', error.message, error);
      return { data, error };
    },
  },
  ledger: {
    async list(year) {
      if (!_sb) return { data: [], error: null };
      let q = _sb.from('ledger_entries').select('*').order('date', { ascending: false });
      if (year) q = q.gte('date', `${year}-01-01`).lte('date', `${year}-12-31`);
      const { data, error } = await q;
      if (error) console.error('[HighasuiDX] ledger.list エラー:', error.message, error);
      return { data: data ?? [], error };
    },
  },
  instruments: {
    async list() {
      if (!_sb) return { data: [], error: null };
      const { data, error } = await _sb.from('instruments').select('*').order('instrument_number');
      if (error) console.error('[HighasuiDX] instruments.list エラー:', error.message, error);
      return { data: data ?? [], error };
    },
    async findByQR(code) {
      if (!_sb) return { data: null, error: null };
      const { data, error } = await _sb.from('instruments').select('*').eq('instrument_number', code).single();
      if (error) console.error('[HighasuiDX] instruments.findByQR エラー:', error.message, error);
      return { data, error };
    },
  },
};

// ── 初期化 ──
document.addEventListener('DOMContentLoaded', () => {
  initSupabase();
});


// ── 開発者ツール向け接続診断 ──
async function _checkSupabaseConnection() {
  const LABEL = '[HighasuiDX]';
  const t0 = performance.now();

  // 1. SDK 読み込み確認
  if (typeof window.supabase === 'undefined') {
    console.error(
      `%c${LABEL} ✖ Supabase SDK が読み込まれていません`,
      'color:#e74c3c;font-weight:bold;'
    );
    return;
  }

  // 2. 設定値の簡易チェック
  const urlOk = SUPABASE_CONFIG.url && SUPABASE_CONFIG.url !== 'https://xxxx.supabase.co';
  const keyOk = SUPABASE_CONFIG.anonKey && SUPABASE_CONFIG.anonKey.length > 20;

  if (!urlOk || !keyOk) {
    console.warn(
      `%c${LABEL} ⚠ SUPABASE_CONFIG が初期値のままです。supabase.js を編集してください。`,
      'color:#e67e22;font-weight:bold;'
    );
    return;
  }

  // 3. 実際に疎通テスト（getSession は認証不要で軽量）
  try {
    const { data, error } = await _sb.auth.getSession();
    const ms = Math.round(performance.now() - t0);

    if (error) {
      console.group(`%c${LABEL} ✖ Supabase 接続エラー`, 'color:#e74c3c;font-weight:bold;');
      console.error('エラー内容:', error.message);
      console.info ('Project URL:', SUPABASE_CONFIG.url);
      console.groupEnd();
      return;
    }

    // 4. 接続成功
    const session = data?.session;
    console.group(`%c${LABEL} ✔ Supabase 接続成功 (${ms} ms)`, 'color:#27ae60;font-weight:bold;');
    console.info ('Project URL :', SUPABASE_CONFIG.url);
    console.info ('SDK version :', window.supabase?.createClient?.toString().match(/supabase-js@([\d.]+)/)?.[1] ?? '(不明)');
    if (session) {
      console.info('ログイン状態 : ログイン済み');
      console.info('ユーザーID  :', session.user?.id);
      console.info('メール       :', session.user?.email);
    } else {
      console.info('ログイン状態 : 未ログイン（ゲスト）');
    }
    console.groupEnd();

  } catch (err) {
    const ms = Math.round(performance.now() - t0);
    console.group(`%c${LABEL} ✖ Supabase 疎通失敗 (${ms} ms)`, 'color:#e74c3c;font-weight:bold;');
    console.error('例外:', err);
    console.info ('Project URL:', SUPABASE_CONFIG.url);
    console.warn ('ネットワーク接続またはCORSの問題の可能性があります。');
    console.groupEnd();
  }
}

// ── PWA 初期化の読み込み ──
(function () {
  const p = location.pathname;
  const root = p.includes('/pages/auth/') ? '../../' : p.includes('/pages/') ? '../' : '';
  const s = document.createElement('script');
  s.src = root + 'js/pwa.js';
  document.head.appendChild(s);
})();
