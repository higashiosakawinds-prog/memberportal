/**
 * 東大阪吹奏楽団 DXシステム
 * 共通UI部品生成・ナビゲーション管理
 */

// ═══════════════════════════════════════════════════════
//  ★ 直近のJSエラー記録（不具合報告の自動添付用）
//
//  各ページで発生した未処理エラーを sessionStorage に最大10件だけ
//  ため込みます。「不具合・要望」ページ(feedback.html)が、直前にいた
//  ページのエラーを拾って報告に添付できるようにするためのものです。
//  （同一タブ内のページ遷移では sessionStorage は保持されます）
// ═══════════════════════════════════════════════════════
(function initErrorBuffer() {
  const KEY = 'hs_error_log';
  const MAX = 10;
  function pageId() {
    try {
      const f = location.pathname.split('/').pop().replace('.html', '');
      return (f === 'index' || f === '') ? 'dashboard' : f;
    } catch { return '-'; }
  }
  function push(entry) {
    try {
      const raw = sessionStorage.getItem(KEY);
      const arr = raw ? JSON.parse(raw) : [];
      arr.push(entry);
      while (arr.length > MAX) arr.shift();
      sessionStorage.setItem(KEY, JSON.stringify(arr));
    } catch { /* プライベートモード等では黙ってスキップ */ }
  }
  window.addEventListener('error', e => {
    push({
      time: new Date().toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      page: pageId(),
      msg:  String(e.message ?? e.error?.message ?? 'error'),
      src:  (e.filename || '').split('/').pop(),
      line: e.lineno, col: e.colno,
    });
    maybePrompt();
  });
  window.addEventListener('unhandledrejection', e => {
    push({
      time: new Date().toLocaleString('ja-JP', { month:'numeric', day:'numeric', hour:'2-digit', minute:'2-digit' }),
      page: pageId(),
      msg:  'Promise: ' + String(e.reason?.message ?? e.reason ?? 'rejection'),
      src:  '', line: '', col: '',
    });
    maybePrompt();
  });

  // ── エラー時に「報告する」通知バーを出す（1ページ表示につき1回・12秒で自動消滅） ──
  //   押すと feedback.html が「不具合」固定・対象画面セット済みで開き、
  //   直近のエラー記録(hs_error_log)が自動添付されます。
  const SKIP_PAGES = ['feedback', 'feedback-admin', 'login', 'register', 'profile-setup'];
  let promptShown = false;
  function feedbackHref() {
    const isRoot = !location.pathname.includes('/pages/');
    const base = isRoot ? 'pages/feedback.html' : 'feedback.html';
    return `${base}?kind=bug&page=${encodeURIComponent(pageId())}`;
  }
  function maybePrompt() {
    try {
      if (promptShown) return;
      if (SKIP_PAGES.includes(pageId())) return;   // 報告ページ自身・ログイン系では出さない
      if (location.pathname.includes('/auth/')) return;
      promptShown = true;                           // 同じページ表示では1回だけ
      const render = () => {
        if (!document.body || document.getElementById('hs-error-report-bar')) return;
        const bar = document.createElement('div');
        bar.id = 'hs-error-report-bar';
        bar.style.cssText =
          'position:fixed;left:50%;transform:translateX(-50%);bottom:16px;z-index:9500;width:420px;max-width:92%;' +
          'background:var(--navy-900,#0d1b2a);color:#fff;border:1px solid rgba(201,168,76,.4);border-radius:12px;' +
          'box-shadow:0 10px 30px rgba(0,0,0,.25);padding:12px 14px;display:flex;align-items:center;gap:10px;' +
          'font-size:13px;line-height:1.6;';
        bar.innerHTML =
          '<span style="flex:0 0 auto;font-size:18px;">⚠</span>' +
          '<span style="flex:1 1 auto;">問題が発生したようです。開発チームに報告できます。</span>' +
          '<a href="' + feedbackHref() + '" style="flex:0 0 auto;background:var(--gold-500,#c9a84c);color:var(--navy-900,#0d1b2a);font-weight:700;text-decoration:none;padding:6px 12px;border-radius:8px;font-size:12px;white-space:nowrap;">報告する</a>' +
          '<button type="button" aria-label="閉じる" style="flex:0 0 auto;background:transparent;border:none;color:rgba(255,255,255,.65);font-size:18px;cursor:pointer;line-height:1;padding:0 2px;">&times;</button>';
        bar.querySelector('button').onclick = () => bar.remove();
        document.body.appendChild(bar);
        setTimeout(() => bar.remove(), 12000);
      };
      if (document.body) render();
      else document.addEventListener('DOMContentLoaded', render, { once: true });
    } catch { /* 通知の失敗はアプリ動作に影響させない */ }
  }
})();

// ═══════════════════════════════════════════════════════
//  ★ メンテナンス設定テーブル（ページ単位）
//
//  各ページIDに対して true を設定するとメンテナンス中になります。
//  メンテナンス中のページは 団長・GM・IT委員 のみ閲覧可能で、
//  それ以外のユーザーにはメンテナンス案内が表示されます。
//  ※ 大型更新時の「全体メンテナンス」（IT委員のみ）は下の SiteMaintenance で、
//    設定画面から切り替えます（push 不要）。
//
//  ページIDはURLのファイル名から拡張子を除いたものです。
//  例: scores.html → 'scores'  /  index.html → 'dashboard'
//
//  【設定方法】
//    true  → メンテナンス中（leader のみ閲覧可）
//    false → 通常公開
// ═══════════════════════════════════════════════════════
const MAINTENANCE_CONFIG = {
  dashboard:          false,  // ダッシュボード (index.html)
  members:            false,  // 団員一覧
  scores:             false,  // 楽譜一覧
  'score-editor':     false,  // 楽譜管理（編集）
  distribution:       true,  // 配布・貸出管理
  repertoire:         true,  // 曲目リスト
  ledger:             false,  // 出納帳
  dues:               false,  // 団費登録
  'dues-admin':       false,  // 団費管理
  instruments:        false,  // 楽器一覧
  'instrument-lending': false, // 楽器貸出管理
  qrcode:             true,  // QRコード印刷
  contact:            false,  // 連絡網
  requests:           false,  // 団員申請
  settings:           false,  // 設定
  schedule:           false,   //スケジュール
  activities:         false,   //活動記録
  visitors:           false,    //見学者連絡
  applications:       false,   // 各種申請
  'surveys-admin':    false,   // アンケート管理
  survey:             false,   // アンケート回答（団員）
  feedback:           false,   // 不具合・要望（送信）
  'feedback-admin':   false,   // 要望・不具合管理
};

// メンテナンス中ページの閲覧を許可するロール（ページ単位のメンテナンスだけに使う）
// この配列にあるロールを持つユーザーは「メンテナンス中」でも閲覧できます
const MAINTENANCE_BYPASS_ROLES = ['leader', 'gm', 'engineer'];

// ═══════════════════════════════════════════════════════
//  ★ 全体メンテナンス（v1.03）
//
//  ・設定は Supabase の system_maintenance（1行）。IT委員が設定画面から ON/OFF する
//  ・状態は「画面が変わった時」だけ読む（ページを開く・移る・再読み込み・戻る）。定期的には読まない
//  ・メンテナンス中: IT委員以外 → 全画面の案内 ／ IT委員 → 通常画面＋帯
//    （通れるかどうかは DB が判定した can_bypass を使う。localStorage の役職は使わない）
//  ・予告の表示期間中: 全員に予告の帯
//  ・状態が読めないとき（通信失敗など）は止めない（通常表示）
//  ・GAS への書き込み（GET 以外）の直前にだけ状態を読み直し、メンテナンス中かつ
//    block_outbound のときは送信せずに「送信していません」を返す（開いたままの画面からの送信も止める）
//  ・文面などは必ず textContent で表示する（innerHTML に入れない）
// ═══════════════════════════════════════════════════════
const SiteMaintenance = (() => {
  const TIMEOUT_MS = 6000;
  const BLOCK_MSG  = 'メンテナンス中のため送信していません。メンテナンス終了後にもう一度お試しください。';
  const DEFAULT_MSG = 'システムの更新作業を行っています。終了まで今しばらくお待ちください。';
  let inflight = null;
  let savedOverflow = null;

  // 状態を読む（失敗時は null）。毎回 DB から読む（キャッシュしない）。同時の呼び出しは1回にまとめる
  function load() {
    if (inflight) return inflight;
    inflight = (async () => {
      if (typeof _sb === 'undefined' || !_sb) return null;
      const timer = new Promise(r => setTimeout(() => r({ data: null, error: 'timeout' }), TIMEOUT_MS));
      const { data, error } = await Promise.race([_sb.rpc('get_maintenance_status'), timer]);
      if (error || !data || typeof data !== 'object') return null;
      return data;
    })().catch(() => null).finally(() => { inflight = null; });
    return inflight;
  }

  // ── 日時の表示（日本時間）。例: 11/30(日) 0:00〜1:30 ──
  const fmtDay  = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' });
  const fmtTime = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', hour: 'numeric', minute: '2-digit' });
  const toDate  = v => { const d = v ? new Date(v) : null; return d && !isNaN(d) ? d : null; };
  function fmtDateTime(v) { const d = toDate(v); return d ? `${fmtDay.format(d)} ${fmtTime.format(d)}` : ''; }
  function fmtRange(start, end) {
    const s = toDate(start), e = toDate(end);
    if (s && e) {
      const sameDay = fmtDay.format(s) === fmtDay.format(e);
      return `${fmtDateTime(s)}〜${sameDay ? fmtTime.format(e) : fmtDateTime(e)}`;
    }
    if (s) return `${fmtDateTime(s)}〜`;
    if (e) return `〜${fmtDateTime(e)}`;
    return '';
  }

  // 予告の表示期間か（端末の時計ではなく DB の時刻で判定）
  function inNotice(s) {
    if (!s || s.active) return false;
    const start = toDate(s.notice_start);
    if (!start) return false;
    const now = toDate(s.server_now) || new Date();
    const end = toDate(s.notice_end) || toDate(s.planned_end);
    return now >= start && (!end || now < end);
  }

  function clear() {
    document.getElementById('site-maint-banner')?.remove();
    const ov = document.getElementById('site-maint-overlay');
    if (ov) {
      ov.remove();
      document.body.style.overflow = savedOverflow ?? '';
      savedOverflow = null;
    }
  }

  function banner(kind, s) {
    const el = document.createElement('div');
    el.id = 'site-maint-banner';
    el.setAttribute('role', 'status');
    const isBypass = kind === 'bypass';
    el.style.cssText =
      'position:sticky;top:var(--header-height, 64px);z-index:50;margin:0 0 var(--space-4);padding:10px 14px;border-radius:var(--radius-md);' +
      'font-size:var(--text-sm);line-height:1.7;' +
      (isBypass
        ? 'background:#c0392b;color:#fff;font-weight:700;'
        : 'background:#fff7e0;color:#7a5200;border:1px solid #f0d58a;');
    const range = fmtRange(s.planned_start, s.planned_end);
    if (isBypass) {
      el.textContent = `メンテナンス中（IT委員として表示しています）${range ? '　予定: ' + range : ''}`;
    } else {
      el.textContent = range
        ? `${range} にメンテナンスを行います。この間はポータルを利用できません。`
        : '近日中にメンテナンスを行います。この間はポータルを利用できません。';
      if (s.message) {
        const p = document.createElement('div');
        p.style.cssText = 'font-size:var(--text-xs);margin-top:2px;white-space:pre-wrap;';
        p.textContent = s.message;
        el.appendChild(p);
      }
    }
    const host = document.querySelector('.main-content') || document.body;
    host.insertBefore(el, host.firstChild);
  }

  function overlay(s) {
    const ov = document.createElement('div');
    ov.id = 'site-maint-overlay';
    ov.setAttribute('role', 'alertdialog');
    ov.setAttribute('aria-modal', 'true');
    ov.style.cssText =
      'position:fixed;inset:0;z-index:9000;background:var(--gray-100);display:flex;align-items:flex-start;' +
      'justify-content:center;padding:var(--space-4);overflow:auto;';
    const box = document.createElement('div');
    box.style.cssText =
      'margin:auto;width:100%;max-width:480px;background:var(--white);border-radius:var(--radius-xl);border:1px solid var(--gray-200);' +
      'box-shadow:var(--shadow-lg);padding:var(--space-10) var(--space-6);text-align:center;';
    const eyebrow = document.createElement('p');
    eyebrow.style.cssText = 'font-size:var(--text-xs);font-weight:500;color:var(--gold-500);letter-spacing:.2em;margin-bottom:var(--space-3);';
    eyebrow.textContent = 'MAINTENANCE';
    const h = document.createElement('h1');
    h.style.cssText = 'font-family:var(--font-display);font-size:var(--text-xl);font-weight:700;color:var(--navy-800);margin-bottom:var(--space-4);line-height:1.4;';
    h.textContent = 'ただいまメンテナンス中です';
    const msg = document.createElement('p');
    msg.style.cssText = 'font-size:var(--text-sm);color:var(--gray-700);line-height:1.8;white-space:pre-wrap;margin-bottom:var(--space-4);';
    msg.textContent = s.message || DEFAULT_MSG;
    box.append(eyebrow, h, msg);
    if (s.planned_end) {
      const end = document.createElement('p');
      end.style.cssText = 'font-size:var(--text-sm);color:var(--navy-700);font-weight:700;margin-bottom:var(--space-6);';
      end.textContent = `終了予定: ${fmtDateTime(s.planned_end)}`;
      box.appendChild(end);
    }
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn btn-gold';
    btn.textContent = '再読み込み';
    btn.addEventListener('click', () => location.reload());
    box.appendChild(btn);
    // 案内がヘッダーごと覆うので、ログアウトの手段をここにも置く（サイドバーのログアウトと同じ処理）
    if (document.getElementById('logout-btn')) {
      const out = document.createElement('button');
      out.type = 'button';
      out.className = 'btn btn-outline';
      out.style.marginLeft = 'var(--space-2)';
      out.textContent = 'ログアウト';
      out.addEventListener('click', () => document.getElementById('logout-btn')?.click());
      box.appendChild(out);
    }
    ov.appendChild(box);
    document.body.appendChild(ov);
    if (savedOverflow === null) savedOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  function render(s) {
    clear();
    if (!s) return;
    if (s.active) { s.can_bypass ? banner('bypass', s) : overlay(s); return; }
    if (inNotice(s)) banner('notice', s);
  }

  // 画面が変わった時に呼ぶ
  async function apply() { render(await load()); }

  // ── GAS への書き込みを止める（fetch を1か所で包む） ──
  const GAS_RE = /^https:\/\/script\.google(usercontent)?\.com\//;
  const origFetch = window.fetch.bind(window);
  window.fetch = async function (input, init) {
    try {
      const url    = String(input?.url ?? input);
      const method = String(init?.method ?? input?.method ?? 'GET').toUpperCase();
      if (method !== 'GET' && method !== 'HEAD' && GAS_RE.test(url)) {
        const s = await load();
        if (s && s.active && s.block_outbound) {
          try { showToast(BLOCK_MSG, 'error'); } catch { /* 表示の失敗は無視 */ }
          return new Response(
            JSON.stringify({ ok: false, success: false, maintenance: true, error: BLOCK_MSG }),
            { status: 200, headers: { 'Content-Type': 'application/json' } });
        }
      }
    } catch { /* 判定に失敗したら通常どおり送る */ }
    return origFetch(input, init);
  };

  // 「戻る」でキャッシュから表示されたときも読み直す
  window.addEventListener('pageshow', e => { if (e.persisted) apply(); });

  return { load, apply, fmtRange, fmtDateTime, DEFAULT_MSG };
})();

// ═══════════════════════════════════════════════════════
//  ★ 権限設定テーブル（ここを編集するだけで全ページの
//    表示・操作権限を変更できます）
//
//  値の意味:
//    ['all']  → ログイン済み全員が利用可能
//    ['admin','librarian'] のように配列で役職を指定 → その役職のみ
//
//  【団費関連権限キー一覧】
//    nav_dues            : 「団費登録」ページをサイドバーに表示
//    nav_dues_admin      : 「団費管理」ページをサイドバーに表示
//    dues_view           : 団費登録ページの閲覧
//    dues_admin          : 団費管理ページの閲覧・操作全般
//    dues_payment_approve: QRコード承認・手動支払い変更
//    dues_fee_edit       : 団費金額の変更
//    dues_method_edit    : 支払い方法の変更（現金/クレジット）
// ═══════════════════════════════════════════════════════
const ROLE_PERMISSIONS = {
  // ── サイドバーの表示権限 ──
  nav_dashboard:          ['all'],
  nav_members:            ['all'],
  nav_scores:             ['all'],
  nav_scoreedit:          ['gm', 'leader','subleader','librarian'],
  nav_distribution:       ['gm', 'leader','subleader'],
  nav_repertoire:         ['gm', 'leader','subleader'],
  nav_ledger:             ['gm','leader','subleader', 'treasurer','reserver','librarian'],
  nav_dues:               ['all'],                           // 団費登録（全員）
  nav_dues_admin:         ['gm','leader','subleader', 'treasurer'],      // 団費管理（GM・幹部・会計のみ）
  nav_instruments:        ['all'],
  nav_instrument_lending: ['gm', 'leader','subleader','equipment'],
  nav_qrcode:             ['gm', 'leader','subleader'],
  nav_contact:            ['gm', 'leader','subleader', 'safety'],        // 連絡網（役職限定）
  nav_requests:           ['gm', 'leader','subleader'],
  nav_schedule:    ['all'],                              // 活動予定（全員）
  nav_activities:  ['gm', 'leader', 'subleader','reserver'],        // 活動記録管理（幹部）
  nav_visitors: ['gm','leader','subleader'],
  nav_surveys_admin:      ['gm', 'leader','subleader'],      // アンケート管理（幹部のみ）
  nav_feedback_admin:     ['gm', 'leader','subleader','engineer'], // 要望・不具合管理（幹部＋IT委員）

  // ── 各ページの操作（編集・追加・削除）権限 ──
  // ページ内で canDo('キー名') を呼び出して判定します
  scores_edit:            ['all'],
  distribution_edit:      ['all'],
  repertoire_edit:        ['all'],
  ledger_edit:            ['all'],

  // 団費関連
  dues_view:              ['all'],                           // 団費登録ページ閲覧
  dues_admin:            ['all'],      // 団費管理ページ全般
  dues_payment_approve:   ['all'],      // QR承認・手動支払い変更
  dues_fee_edit:          ['all'],      // 金額変更
  dues_method_edit:       ['all'],      // 支払い方法変更
  special_measures_admin: ['gm',  'leader', 'subleader'],                   // 特例措置の承認・管理（幹部のみ）

  instruments_edit:       ['all'],
  lending_edit:           ['all'],
  qrcode_print:           ['all'],
  contact_send:           ['gm','leader','subleader', 'safety'],        // 連絡送信（役職限定）
  requests_approve:       ['all'],
  members_edit:           ['all'],
  surveys_admin:          ['gm', 'leader','subleader'],      // アンケート作成・管理
  feedback_admin:         ['gm', 'leader','subleader','engineer'], // 要望・不具合管理（閲覧・操作）
};

// ─────────────────────────────────────────
// 役職定義（表示名・バッジ色）
//   ★ 色を変えたい場合は color の値（16進カラーコード）だけ編集してください。
//   バッジの文字色＝color、背景＝color を薄めた色（自動計算）になります。
//   ヘッダーの自分の役職バッジは「白背景＋この色」で表示されます。
// ─────────────────────────────────────────
const ROLE_DEFINITIONS = [
  { value: 'gm',        label: 'GM',       color: '#c0392b' },
  { value: 'leader',    label: '団長',     color: '#c0392b' },
  { value: 'subleader', label: '副団長',   color: '#c0392b' },
  { value: 'conductor', label: '指揮委員',  color: '#b33e5c' },
  { value: 'engineer',   label: 'IT委員', color: '#26499d' },
  { value: 'treasurer', label: '会計委員', color: '#bf9000' },
  { value: 'conector',  label: '広報委員', color: '#25b7c0' },
  { value: 'librarian', label: '蔵書委員', color: '#915da3' },
  { value: 'reserver',  label: '予約委員', color: '#456A2C' },
  { value: 'equipment', label: '備品委員', color: '#ed6d35' },
  { value: 'safety',    label: '安全委員', color: '#388F98' },
  { value: 'recorder',    label: '議事録委員', color: '#9cbb1c' },
  { value: 'member',    label: '一般団員', color: '#566573' },
];

const ROLE_DEFAULT_COLOR = '#1a2e4a'; // 定義にない役職のとき

// 16進カラー → rgba 文字列（背景の薄い色を作るため）
function hexToRgba(hex, alpha) {
  let h = String(hex || '').replace('#', '');
  if (h.length === 3) h = h.split('').map(c => c + c).join('');
  const n = parseInt(h, 16);
  if (isNaN(n) || h.length !== 6) return `rgba(26,46,74,${alpha})`;
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}
// ─────────────────────────────────────────
// セッションユーザー取得
// ─────────────────────────────────────────
function getSessionUser() {
  try {
    const raw = localStorage.getItem('hs_user');
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

// ─────────────────────────────────────────
// 権限チェック関数
// 使い方: canDo('dues_admin') → true/false
// ─────────────────────────────────────────
function canDo(permissionKey) {
  const allowed = ROLE_PERMISSIONS[permissionKey];
  if (!allowed) return false;
  if (allowed.includes('all')) return true;

  const sessionUser = getSessionUser();
  if (!sessionUser) return false;

  // roles は配列（複数役職対応）。旧形式（role: 文字列）との互換性も維持
  const userRoles = Array.isArray(sessionUser.roles)
    ? sessionUser.roles
    : [sessionUser.role].filter(Boolean);

  return userRoles.some(r => allowed.includes(r));
}

// ─────────────────────────────────────────
// 役職バッジHTML生成（複数対応）
// ─────────────────────────────────────────
function renderRoleBadges(roles) {
  if (!roles || roles.length === 0) return '<span class="badge badge-navy">—</span>';
  const arr = Array.isArray(roles) ? roles : [roles];
  return arr.map(r => {
    const def   = ROLE_DEFINITIONS.find(d => d.value === r);
    const color = def?.color ?? ROLE_DEFAULT_COLOR;
    return `<span class="badge role-badge" style="color:${color};background:${hexToRgba(color, 0.12)};">${def?.label ?? r}</span>`;
  }).join(' ');
}

// ─────────────────────────────────────────
// ナビゲーション定義
// ─────────────────────────────────────────
const NAV_ITEMS = [
  {
    section: 'MAIN',
    label: 'メイン',
    items: [
      {
        id: 'dashboard', permKey: 'nav_dashboard', label: 'ダッシュボード', href: 'index.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z"/></svg>`,
      },
      {
        id: 'members', permKey: 'nav_members', label: '団員一覧', href: 'pages/members.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z"/></svg>`,
      },
    ],
  },
  {
    section: 'LIBRARY',
    label: 'ライブラリ',
    items: [
      {
        id: 'scores', permKey: 'nav_scores', label: '楽譜一覧', href: 'pages/scores.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>`,
      },
      {
        id: 'score-editor', permKey: 'nav_scoreedit', label: '楽譜管理', href: 'pages/score-editor.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>`,
      },
      {
        id: 'repertoire', permKey: 'nav_repertoire', label: '曲目リスト', href: 'pages/repertoire.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z"/></svg>`,
      },
    ],
  },
  {
    section: 'ACCOUNTING',
    label: '会計',
    items: [
      {
        id: 'ledger', permKey: 'nav_ledger', label: '出納帳', href: 'pages/ledger.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0118 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"/></svg>`,
      },
      {
        id: 'dues', permKey: 'nav_dues', label: '団費登録', href: 'pages/dues.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"/></svg>`,
      },
      {
        // ★ 新規追加：団費管理ページ（GM・幹部・会計のみ表示）
        id: 'dues-admin', permKey: 'nav_dues_admin', label: '団費管理', href: 'pages/dues-admin.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 7.5l3 4.5m0 0l3-4.5M12 12v5.25M15 12H9m6 3H9m12-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
      },
    ],
  },
  {
    section: 'INSTRUMENTS',
    label: '楽器管理',
    items: [
      {
        id: 'instruments', permKey: 'nav_instruments', label: '楽器一覧', href: 'pages/instruments.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25"/></svg>`,
      },
      {
        id: 'instrument-lending', permKey: 'nav_instrument_lending', label: '貸出管理', href: 'pages/instrument-lending.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"/></svg>`,
      },
      {
        id: 'qrcode', permKey: 'nav_qrcode', label: 'QRコード印刷', href: 'pages/qrcode.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 013.75 9.375v-4.5zM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 01-1.125-1.125v-4.5zM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0113.5 9.375v-4.5z"/><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 6.75h.75v.75h-.75v-.75zM6.75 16.5h.75v.75h-.75v-.75zM16.5 6.75h.75v.75h-.75v-.75zM13.5 13.5h.75v.75h-.75v-.75zM13.5 19.5h.75v.75h-.75v-.75zM19.5 13.5h.75v.75h-.75v-.75zM19.5 19.5h.75v.75h-.75v-.75zM16.5 16.5h.75v.75h-.75v-.75z"/></svg>`,
      },
    ],
  },
    {
    section: 'SCHEDULE',
    label: 'スケジュール',
    items: [
      {
        id: 'schedule', permKey: 'nav_schedule', label: '活動予定', href: 'pages/schedule.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 9v7.5m-9-6h.008v.008H12V12zm0 3h.008v.008H12v-.008zm0 3h.008v.008H12v-.008zm-3-6h.008v.008H9V12zm0 3h.008v.008H9v-.008zm0 3h.008v.008H9v-.008zm3-9h.008v.008H12V9zm3 0h.008v.008H15V9z"/></svg>`,
      },
      {
        id: 'activities', permKey: 'nav_activities', label: '活動登録', href: 'pages/activities.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"/></svg>`,
      },
    ],
  },
  {
    section: 'COMMUNICATION',
    label: 'コミュニケーション',
    items: [
      {
        id: 'contact', permKey: 'nav_contact', label: '連絡網', href: 'pages/contact.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>`,
      },
      {
  id: 'visitors', permKey: 'nav_visitors', label: '見学者対応', href: 'pages/visitors.html',
  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.641 0-8.573-3.007-9.963-7.178z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>`,
},
      {
  id: 'surveys-admin', permKey: 'nav_surveys_admin', label: 'アンケート管理', href: 'pages/surveys-admin.html',
  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 3h6m2 5H7a2 2 0 01-2-2V6a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V18a2 2 0 01-2 2z"/><path stroke-linecap="round" stroke-linejoin="round" d="M9 9h1"/></svg>`,
},
      {
  id: 'feedback-admin', permKey: 'nav_feedback_admin', label: '要望・不具合管理', href: 'pages/feedback-admin.html',
  icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"/></svg>`,
},
      {
        id: 'requests', permKey: 'nav_requests', label: '団員申請', href: 'pages/requests.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z"/></svg>`,
      },
    ],
  },
];

// ─────────────────────────────────────────
// 現在のページIDを取得（URLから判定）
// ─────────────────────────────────────────
function getCurrentPageId() {
  const path = window.location.pathname;
  const filename = path.split('/').pop().replace('.html', '');
  if (filename === 'index' || filename === '') return 'dashboard';
  return filename;
}

// ─────────────────────────────────────────
// ページ表示名を取得（メンテナンス案内用）
// ─────────────────────────────────────────
function getPageLabel(pageId) {
  const labels = {
    dashboard:            'ダッシュボード',
    members:              '団員一覧',
    scores:               '楽譜管理',
    'score-editor':       '楽譜管理（編集）',
    distribution:         '配布・貸出管理',
    repertoire:           '曲目リスト',
    ledger:               '出納帳',
    dues:                 '団費登録',
    'dues-admin':         '団費管理',
    instruments:          '楽器一覧',
    'instrument-lending': '楽器貸出管理',
    qrcode:               'QRコード印刷',
    contact:              '連絡網',
    requests:             '団員申請',
    settings:             '設定',
    applications:         '各種申請',
    'surveys-admin':      'アンケート管理',
    survey:               'アンケート回答',
    feedback:             '不具合・要望',
    'feedback-admin':     '要望・不具合管理',
  };
  return labels[pageId] ?? pageId;
}

// ─────────────────────────────────────────
// メンテナンスチェック
// 戻り値: true = メンテナンス中かつアクセス不可
// ─────────────────────────────────────────
function isPageUnderMaintenance(pageId) {
  return MAINTENANCE_CONFIG[pageId] === true;
}

function canBypassMaintenance() {
  const user = getSessionUser();
  if (!user) return false;
  const userRoles = Array.isArray(user.roles) ? user.roles : [user.role].filter(Boolean);
  return userRoles.some(r => MAINTENANCE_BYPASS_ROLES.includes(r));
}

// ─────────────────────────────────────────
// メンテナンス案内オーバーレイを表示
// ページ全体のコンテンツをブロックする
// ─────────────────────────────────────────
function showMaintenanceOverlay(pageId) {
  const pageName = getPageLabel(pageId);

  // すでに存在する場合はスキップ
  if (document.getElementById('maintenance-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'maintenance-overlay';
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    z-index: 8000;
    background: var(--gray-100);
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--space-4);
  `;

  overlay.innerHTML = `
    <div style="
      width: 100%;
      max-width: 480px;
      background: var(--white);
      border-radius: var(--radius-xl);
      border: 1px solid var(--gray-200);
      box-shadow: var(--shadow-lg);
      padding: var(--space-10) var(--space-8);
      text-align: center;
      animation: fadeInUp 0.4s ease both;
    ">
      <div style="
        width: 72px; height: 72px;
        background: var(--navy-900);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto var(--space-6);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             stroke="var(--gold-400)" stroke-width="1.5" width="36" height="36">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877
               M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766
               M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63
               m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336
               l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276
               a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95
               l-.102.085m-1.745 1.437L5.909 7.5H4.5L2.25 3.75l1.5-1.5
               L7.5 4.5v1.409l4.26 4.26m-1.745 1.437l1.745-1.437
               m6.615 8.206L15.75 15.75M4.867 19.125h.008v.008h-.008v-.008z"/>
        </svg>
      </div>
      <p style="
        font-size: var(--text-xs); font-weight: 500;
        color: var(--gold-500); letter-spacing: 0.2em;
        text-transform: uppercase; margin-bottom: var(--space-3);
      ">MAINTENANCE</p>
      <h1 style="
        font-family: var(--font-display);
        font-size: var(--text-2xl); font-weight: 700;
        color: var(--navy-800); margin-bottom: var(--space-4);
        line-height: 1.3;
      ">「${pageName}」は<br>ただいまメンテナンス中です。</h1>
      <p style="
        font-size: var(--text-sm); color: var(--gray-500); line-height: 1.8;
        margin-bottom: var(--space-8);
      ">運用再開までお待ちください。</p>
      <a href="${window.location.pathname.includes('/pages/') ? '../' : ''}index.html"
         style="
           display: inline-flex; align-items: center; gap: var(--space-2);
           padding: var(--space-3) var(--space-6);
           background: var(--navy-800); color: var(--gold-300);
           border-radius: var(--radius-md); font-size: var(--text-sm);
           font-weight: 500; text-decoration: none;
           transition: background var(--transition-fast);
         "
         onmouseover="this.style.background='var(--navy-700)'"
         onmouseout="this.style.background='var(--navy-800)'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" stroke-width="2" width="15" height="15">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18"/>
        </svg>
        ダッシュボードに戻る
      </a>
    </div>
  `;

  document.body.appendChild(overlay);

  // メインコンテンツをスクロール不可にする
  document.body.style.overflow = 'hidden';
}

// ─────────────────────────────────────────
// メンテナンス判定を実行してオーバーレイ表示
// DOMContentLoaded 内で呼び出す
// ─────────────────────────────────────────
function checkMaintenance() {
  const pageId = getCurrentPageId();
  if (isPageUnderMaintenance(pageId) && !canBypassMaintenance()) {
    showMaintenanceOverlay(pageId);
    return true; // メンテナンス中
  }
  return false; // 通常表示
}

// ─────────────────────────────────────────
// 認証が不要なページ（ログイン・登録系）
// ─────────────────────────────────────────
const PUBLIC_PAGES = ['login', 'register', 'profile-setup'];

function isPublicPage() {
  const path = window.location.pathname;
  return PUBLIC_PAGES.some(p => path.includes(p));
}

// ─────────────────────────────────────────
// 未ログイン時の警告オーバーレイを表示
// ─────────────────────────────────────────
function showAuthRequiredOverlay() {
  // すでに存在する場合はスキップ
  if (document.getElementById('auth-required-overlay')) return;

  const isRoot = !window.location.pathname.includes('/pages/');
  const loginPath = isRoot ? 'pages/auth/login.html' : '../pages/auth/login.html';

  const overlay = document.createElement('div');
  overlay.id = 'auth-required-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999;
    background: var(--navy-900);
    display: flex; align-items: center; justify-content: center;
    padding: var(--space-4);
  `;

  overlay.innerHTML = `
    <div style="
      width: 100%; max-width: 420px;
      background: rgba(255,255,255,0.04);
      border: 1px solid rgba(201,168,76,0.25);
      border-radius: var(--radius-xl);
      padding: var(--space-10) var(--space-8);
      text-align: center;
      animation: fadeInUp 0.4s ease both;
    ">
      <!-- アイコン -->
      <div style="
        width: 72px; height: 72px;
        background: rgba(201,168,76,0.12);
        border-radius: 50%;
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto var(--space-6);
        border: 1px solid rgba(201,168,76,0.3);
      ">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             stroke="var(--gold-400)" stroke-width="1.5" width="36" height="36">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75
               m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25
               v-6.75a2.25 2.25 0 00-2.25-2.25H6.75
               a2.25 2.25 0 00-2.25 2.25v6.75
               a2.25 2.25 0 002.25 2.25z"/>
        </svg>
      </div>

      <!-- テキスト -->
      <p style="
        font-size: var(--text-xs); font-weight: 500;
        color: var(--gold-500); letter-spacing: 0.2em;
        text-transform: uppercase; margin-bottom: var(--space-3);
      ">LOGIN REQUIRED</p>

      <h1 style="
        font-family: var(--font-display);
        font-size: var(--text-2xl); font-weight: 700;
        color: var(--white); margin-bottom: var(--space-4);
        line-height: 1.4;
      ">ログインが必要です</h1>

      <p style="
        font-size: var(--text-sm); color: rgba(255,255,255,0.5);
        line-height: 1.8; margin-bottom: var(--space-8);
      ">
        このページを閲覧するには<br>
        ログインが必要です。
      </p>

      <!-- カウントダウン表示 -->
      <p style="
        font-size: var(--text-xs); color: rgba(255,255,255,0.3);
        margin-bottom: var(--space-4);
      ">
        <span id="auth-countdown">5</span>秒後に自動的にログイン画面へ移動します
      </p>

      <!-- ボタン -->
      <a href="${loginPath}" style="
        display: inline-flex; align-items: center; gap: var(--space-2);
        padding: var(--space-3) var(--space-8);
        background: var(--gold-500); color: var(--navy-900);
        border-radius: var(--radius-md); font-size: var(--text-sm);
        font-weight: 700; text-decoration: none;
        transition: background var(--transition-fast), box-shadow var(--transition-fast);
      "
      onmouseover="this.style.background='var(--gold-400)';this.style.boxShadow='var(--shadow-gold)'"
      onmouseout="this.style.background='var(--gold-500)';this.style.boxShadow='none'">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" stroke-width="2" width="15" height="15">
          <path stroke-linecap="round" stroke-linejoin="round"
            d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6
               a2.25 2.25 0 00-2.25 2.25v13.5
               A2.25 2.25 0 007.5 21h6
               a2.25 2.25 0 002.25-2.25V15
               M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
        </svg>
        今すぐログインする
      </a>
    </div>
  `;

  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  // カウントダウンして自動リダイレクト
  let count = 5;
  const timer = setInterval(() => {
    count--;
    const el = document.getElementById('auth-countdown');
    if (el) el.textContent = count;
    if (count <= 0) {
      clearInterval(timer);
      window.location.href = loginPath;
    }
  }, 1000);
}

// ─────────────────────────────────────────
// 認証チェックを実行
// 未ログインなら警告を表示して true を返す
// ─────────────────────────────────────────
function checkAuth() {
  if (isPublicPage()) return false;

  const sessionUser = getSessionUser();
  if (!sessionUser) {
    showAuthRequiredOverlay();
    return true;
  }
  return false;
}

// ─────────────────────────────────────────
// ヘッダー生成（役職バッジ付き）
// ─────────────────────────────────────────
function renderHeader(options = {}) {
  const { currentUser = null } = options;

    if (!document.querySelector('meta[name="apple-mobile-web-app-capable"]')) {
    const metas = [
      { name: 'apple-mobile-web-app-capable',       content: 'yes' },
      { name: 'apple-mobile-web-app-status-bar-style', content: 'black-translucent' },
      { name: 'apple-mobile-web-app-title',          content: '東大阪吹奏楽団' },
      { name: 'theme-color',                          content: '#0d1b2a' },
    ];
    metas.forEach(({ name, content }) => {
      const meta = document.createElement('meta');
      meta.name    = name;
      meta.content = content;
      document.head.appendChild(meta);
    });
  }
  
  const header = document.getElementById('site-header');
  if (!header) return;

  const isRoot = !window.location.pathname.includes('/pages/');
  const rootPrefix = isRoot ? '' : '../';

  const roleBadgesHtml = currentUser
    ? renderRoleBadges(currentUser.roles ?? [currentUser.role].filter(Boolean))
    : '';

  header.innerHTML = `
    <button class="hamburger" id="hamburger-btn" aria-label="メニューを開く">
      <span></span><span></span><span></span>
    </button>
    <a href="${rootPrefix}index.html" class="site-header__logo">
      <span class="site-header__logo-main">東大阪吹奏楽団</span>
      <span class="site-header__logo-sub">HIGASUI WINDS</span>
    </a>
    <nav class="site-header__nav">
      ${currentUser ? `
        <div class="header-user-info">
          <span class="header-user-name">${currentUser.name}</span>
          <div class="header-user-roles">${roleBadgesHtml}</div>
        </div>
      ` : ''}
      <button class="header-action-btn" id="logout-btn">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="16" height="16">
          <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"/>
        </svg>
        <span class="logout-label">ログアウト</span>
      </button>
    </nav>
  `;

  document.getElementById('logout-btn').addEventListener('click', () => {
    if (typeof Auth !== 'undefined' && _sb) {
      Auth.signOut();
    } else {
      // セッションは localStorage に保存しているため、ここも localStorage から削除する
      localStorage.removeItem('hs_user');
      window.location.href = `${rootPrefix}pages/auth/login.html`;
    }
  });
}

// ─────────────────────────────────────────
// サイドバー生成（権限テーブルで表示制御）
// ─────────────────────────────────────────
function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  if (!sidebar) return;

  const currentPageId = getCurrentPageId();
  const isRoot = !window.location.pathname.includes('/pages/');
  const rootPrefix = isRoot ? '' : '../';

  let html = '';

  NAV_ITEMS.forEach(section => {
    const visibleItems = section.items.filter(item => canDo(item.permKey));
    if (visibleItems.length === 0) return;

    html += `
      <div class="sidebar-section">
        <p class="sidebar-section__label">${section.label}</p>
        ${visibleItems.map(item => {
          const isMaintenance = isPageUnderMaintenance(item.id);
          const maintenanceBadge = (isMaintenance && canBypassMaintenance())
            ? `<span class="sidebar-badge" style="background:var(--warning);color:var(--white);font-size:9px;">工事中</span>`
            : '';
          return `
          <a href="${rootPrefix}${item.href}"
             class="sidebar-item ${item.id === currentPageId ? 'active' : ''}"
             data-page="${item.id}">
            ${item.icon}
            <span>${item.label}</span>
            ${item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : ''}
            ${maintenanceBadge}
          </a>`;
        }).join('')}
      </div>
    `;
  });

  // ── サイドバー下部：各種申請・設定ボタン（全員に表示） ──
  html += `
    <div class="sidebar-section" style="margin-top:auto;padding-top:var(--space-4);border-top:1px solid rgba(201,168,76,0.15);">
      <a href="${rootPrefix}pages/applications.html"
         class="sidebar-item ${currentPageId === 'applications' ? 'active' : ''}"
         data-page="applications">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75"/>
        </svg>
        <span>各種申請</span>
      </a>
      <a href="${rootPrefix}pages/feedback.html"
         class="sidebar-item ${currentPageId === 'feedback' ? 'active' : ''}"
         data-page="feedback">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"/>
        </svg>
        <span>不具合・要望</span>
      </a>
      <a href="${rootPrefix}pages/settings.html"
         class="sidebar-item ${currentPageId === 'settings' ? 'active' : ''}"
         data-page="settings">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span>設定</span>
      </a>
      <p class="sidebar-version" style="margin:var(--space-3) 0 0;padding:0 var(--space-4);font-size:11px;color:rgba(255,255,255,0.4);letter-spacing:0.05em;">
        ひがすいポータル ${typeof APP_VERSION_LABEL !== 'undefined' ? APP_VERSION_LABEL : ''}
      </p>
    </div>
  `;

  sidebar.innerHTML = html;
}

// ─────────────────────────────────────────
// ハンバーガーメニュー（モバイル）
// ─────────────────────────────────────────
function initMobileMenu() {
  const btn = document.getElementById('hamburger-btn');
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebar-overlay');
  if (!btn || !sidebar) return;

  const toggle = () => {
    sidebar.classList.toggle('mobile-open');
    if (overlay) overlay.classList.toggle('active');
  };

  btn.addEventListener('click', toggle);
  if (overlay) overlay.addEventListener('click', toggle);
}

// ─────────────────────────────────────────
// トースト通知
// ─────────────────────────────────────────
function showToast(message, type = 'default') {
  const container = document.getElementById('toast-container') ||
    (() => {
      const el = document.createElement('div');
      el.id = 'toast-container';
      el.className = 'toast-container';
      document.body.appendChild(el);
      return el;
    })();

  const icons = {
    success: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>`,
    error:   `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>`,
    default: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>`,
  };

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `${icons[type] || icons.default}<span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ─────────────────────────────────────────
// メール送信アプリ選択ピッカー
//
// 使い方:
//   showMailPicker(mailtoHref);
//   ※ window.location.href = mailtoHref; の代わりに呼び出す
//
// Gmail URL形式:
//   https://mail.google.com/mail/?view=cm&fs=1&to=...&su=...&body=...&bcc=...
// ─────────────────────────────────────────
function showMailPicker(mailtoHref) {
  // mailto: URL から各フィールドをパース
  let to = '', subject = '', body = '', bcc = '', cc = '';
  try {
    // 'mailto:A@b.com?subject=...' → pathname='A@b.com', search='?subject=...'
    const colonIdx = mailtoHref.indexOf(':');
    const rest     = mailtoHref.slice(colonIdx + 1);
    const qIdx     = rest.indexOf('?');
    if (qIdx === -1) {
      to = decodeURIComponent(rest);
    } else {
      to = decodeURIComponent(rest.slice(0, qIdx));
      const sp = new URLSearchParams(rest.slice(qIdx + 1));
      subject  = sp.get('subject') ?? '';
      body     = sp.get('body')    ?? '';
      bcc      = sp.get('bcc')     ?? '';
      cc       = sp.get('cc')      ?? '';
    }
  } catch (e) {
    console.warn('[HighasuiDX] showMailPicker: mailtoHref のパースに失敗しました', e);
  }

  // Gmail 用 URL を構築
  const gp = new URLSearchParams();
  gp.set('view', 'cm');
  gp.set('fs',   '1');
  if (to)      gp.set('to',   to);
  if (subject) gp.set('su',   subject);
  if (body)    gp.set('body', body);
  if (bcc)     gp.set('bcc', bcc);
  if (cc)      gp.set('cc',  cc);
  const gmailHref = `https://mail.google.com/mail/?${gp.toString()}`;

  // ピッカーモーダルを動的生成（初回のみ）
  if (!document.getElementById('modal-mail-picker')) {
    const el = document.createElement('div');
    el.className = 'modal-overlay';
    el.id = 'modal-mail-picker';
    el.innerHTML = `
      <div class="modal" style="max-width:380px;">
        <div class="modal__header">
          <h2 class="modal__title">メールアプリを選択</h2>
          <button class="modal__close" onclick="closeModal('modal-mail-picker')">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal__body">
          <p style="font-size:var(--text-sm);color:var(--gray-500);margin-bottom:var(--space-5);">
            メールを送信するアプリを選択してください。
          </p>

          <!-- Gmail -->
          <button id="mail-picker-gmail"
            style="display:flex;align-items:center;gap:var(--space-4);width:100%;
                   padding:var(--space-4) var(--space-5);border:1px solid var(--gray-200);
                   border-radius:var(--radius-lg);background:var(--white);cursor:pointer;
                   text-align:left;transition:all var(--transition-fast);margin-bottom:var(--space-3);"
            onmouseover="this.style.background='var(--gray-100)';this.style.borderColor='var(--navy-400)'"
            onmouseout="this.style.background='var(--white)';this.style.borderColor='var(--gray-200)'">
            <span style="flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;
                          background:#fff5f5;border-radius:var(--radius-md);">
              <svg viewBox="0 0 48 48" width="22" height="22" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M6 40h8V24L2 14v22c0 2.21 1.79 4 4 4z"/>
                <path fill="#34A853" d="M34 40h8c2.21 0 4-1.79 4-4V14l-12 10z"/>
                <path fill="#FBBC05" d="M34 8H14l10 8.3z"/>
                <path fill="#4285F4" d="M14 24v16h20V24L24 16.3z"/>
                <path fill="#EA4335" d="M2 14l12 10V8H6c-2.21 0-4 1.79-4 4z"/>
              </svg>
            </span>
            <div>
              <p style="font-weight:700;color:var(--navy-800);font-size:var(--text-sm);">Gmail で開く</p>
              <p style="font-size:var(--text-xs);color:var(--gray-500);margin-top:1px;">ブラウザでGmailの作成画面を開きます</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                 width="14" height="14" style="margin-left:auto;color:var(--gray-400);flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </button>

          <!-- 標準メールアプリ -->
          <button id="mail-picker-default"
            style="display:flex;align-items:center;gap:var(--space-4);width:100%;
                   padding:var(--space-4) var(--space-5);border:1px solid var(--gray-200);
                   border-radius:var(--radius-lg);background:var(--white);cursor:pointer;
                   text-align:left;transition:all var(--transition-fast);"
            onmouseover="this.style.background='var(--gray-100)';this.style.borderColor='var(--navy-400)'"
            onmouseout="this.style.background='var(--white)';this.style.borderColor='var(--gray-200)'">
            <span style="flex-shrink:0;width:36px;height:36px;display:flex;align-items:center;justify-content:center;
                          background:#f0f4ff;border-radius:var(--radius-md);">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                   stroke="var(--navy-600)" stroke-width="1.5" width="22" height="22">
                <path stroke-linecap="round" stroke-linejoin="round"
                  d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75
                     m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243
                     a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0
                     L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/>
              </svg>
            </span>
            <div>
              <p style="font-weight:700;color:var(--navy-800);font-size:var(--text-sm);">標準メールアプリで開く</p>
              <p style="font-size:var(--text-xs);color:var(--gray-500);margin-top:1px;">iPhone標準メール・Outlookなど</p>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                 width="14" height="14" style="margin-left:auto;color:var(--gray-400);flex-shrink:0;">
              <path stroke-linecap="round" stroke-linejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5"/>
            </svg>
          </button>
        </div>
      </div>`;
    el.addEventListener('click', e => { if (e.target === el) el.classList.remove('open'); });
    document.body.appendChild(el);
  }

  // ボタンのハンドラを毎回上書き（URLが変わるため）
  document.getElementById('mail-picker-gmail').onclick = () => {
    closeModal('modal-mail-picker');
    window.open(gmailHref, '_blank');
  };
  document.getElementById('mail-picker-default').onclick = () => {
    closeModal('modal-mail-picker');
    window.location.href = mailtoHref;
  };

  openModal('modal-mail-picker');
}

// ─────────────────────────────────────────
// モーダル制御
// ─────────────────────────────────────────
function openModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.add('open');
}

function closeModal(id) {
  const overlay = document.getElementById(id);
  if (overlay) overlay.classList.remove('open');
}

// ─────────────────────────────────────────
// 初期化
// ─────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const sessionUser = getSessionUser();

  renderHeader({ currentUser: sessionUser });
  renderSidebar();
  initMobileMenu();

  // ── 認証チェック（未ログインなら警告表示） ──
  if (checkAuth()) return;
  
  // ── メンテナンスチェック ──
  checkMaintenance();          // ページ単位（common.js の設定）
  SiteMaintenance.apply();     // 全体（DB の設定。画面が変わった時だけ読む）

  // モーダル外クリックで閉じる
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', e => {
      if (e.target === overlay) overlay.classList.remove('open');
    });
  });

  // ESCキーでモーダルを閉じる
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.open').forEach(el => el.classList.remove('open'));
    }
  });
});
