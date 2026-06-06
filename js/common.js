/**
 * 東大阪吹奏楽団 DXシステム
 * 共通UI部品生成・ナビゲーション管理
 */

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
  nav_scoreedit:          ['all'],
  nav_distribution:       ['gm', 'leader','subleader'],
  nav_repertoire:         ['gm', 'leader','subleader'],
  nav_ledger:             ['all'],
  nav_dues:               ['all'],                           // 団費登録（全員）
  nav_dues_admin:         ['gm','leader','subleader', 'treasurer'],      // 団費管理（GM・幹部・会計のみ）
  nav_instruments:        ['gm', 'leader','subleader'],
  nav_instrument_lending: ['gm', 'leader','subleader'],
  nav_qrcode:             ['gm', 'leader','subleader'],
  nav_contact:            ['gm', 'leader','subleader', 'safety'],        // 連絡網（役職限定）
  nav_requests:           ['gm', 'leader','subleader'],

  // ── 各ページの操作（編集・追加・削除）権限 ──
  // ページ内で canDo('キー名') を呼び出して判定します
  scores_edit:            ['all'],
  distribution_edit:      ['all'],
  repertoire_edit:        ['all'],
  ledger_edit:            ['all'],

  // 団費関連
  dues_view:              ['all'],                           // 団費登録ページ閲覧
  dues_admin:             ['gm', 'leader','subleader', 'treasurer'],      // 団費管理ページ全般
  dues_payment_approve:   ['gm', 'leader','subleader', 'treasurer'],      // QR承認・手動支払い変更
  dues_fee_edit:          ['gm','leader','subleader', 'treasurer'],      // 金額変更
  dues_method_edit:       ['gm', 'leader','subleader', 'treasurer'],      // 支払い方法変更

  instruments_edit:       ['all'],
  lending_edit:           ['all'],
  qrcode_print:           ['all'],
  contact_send:           ['gm','leader','subleader', 'safety'],        // 連絡送信（役職限定）
  requests_approve:       ['all'],
  members_edit:           ['all'],
};

// ─────────────────────────────────────────
// 役職定義（表示名・バッジ色）
// ─────────────────────────────────────────
const ROLE_DEFINITIONS = [
  { value: 'gm',        label: 'GM',     badgeClass: 'badge-danger'  },
  { value: 'leader',     label: '団長',   badgeClass: 'badge-danger'  },
  { value: 'subleader',     label: '副団長',   badgeClass: 'badge-danger'  },
  { value: 'conductor', label: '指揮者', badgeClass: 'badge-navy'    },
  { value: 'planner',   label: '企画委員', badgeClass: 'badge-navy'  },
  { value: 'treasurer', label: '会計委員',   badgeClass: 'badge-gold'    },
  { value: 'conector', label: '広報委員', badgeClass: 'badge-success'},
  { value: 'librarian', label: '楽譜委員', badgeClass: 'badge-success'},
  { value: 'reserver', label: '予約委員', badgeClass: 'badge-success'},
  { value: 'equipment', label: '備品委員', badgeClass: 'badge-success'},
  { value: 'safety', label: '安全委員', badgeClass: 'badge-success'},
  { value: 'member',    label: '一般団員', badgeClass: 'badge-navy'  },
];

// ─────────────────────────────────────────
// セッションユーザー取得
// ─────────────────────────────────────────
function getSessionUser() {
  try {
    const raw = sessionStorage.getItem('hs_user');
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
    const def = ROLE_DEFINITIONS.find(d => d.value === r);
    return `<span class="badge ${def?.badgeClass ?? 'badge-navy'}">${def?.label ?? r}</span>`;
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
        id: 'scores', permKey: 'nav_scores', label: '楽譜管理', href: 'pages/scores.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>`,
      },
      {
        id: 'score-editor', permKey: 'nav_scoreedit', label: '楽譜管理（編集）', href: 'pages/score-editor.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 11-.99-3.467l2.31-.66a2.25 2.25 0 001.632-2.163zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 01-1.632 2.163l-1.32.377a1.803 1.803 0 01-.99-3.467l2.31-.66A2.25 2.25 0 009 15.553z"/></svg>`,
      },
      {
        id: 'distribution', permKey: 'nav_distribution', label: '配布・貸出管理', href: 'pages/distribution.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z"/></svg>`,
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
    section: 'COMMUNICATION',
    label: 'コミュニケーション',
    items: [
      {
        id: 'contact', permKey: 'nav_contact', label: '連絡網', href: 'pages/contact.html',
        icon: `<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"/></svg>`,
      },
      {
        id: 'requests', permKey: 'nav_requests', label: '団員申請', href: 'pages/requests.html',
        badge: '2',
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
// ヘッダー生成（役職バッジ付き）
// ─────────────────────────────────────────
function renderHeader(options = {}) {
  const { currentUser = null } = options;
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
      sessionStorage.removeItem('hs_user');
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
        ${visibleItems.map(item => `
          <a href="${rootPrefix}${item.href}"
             class="sidebar-item ${item.id === currentPageId ? 'active' : ''}"
             data-page="${item.id}">
            ${item.icon}
            <span>${item.label}</span>
            ${item.badge ? `<span class="sidebar-badge">${item.badge}</span>` : ''}
          </a>
        `).join('')}
      </div>
    `;
  });

  // ── サイドバー下部：設定ボタン（全員に表示） ──
  html += `
    <div class="sidebar-section" style="margin-top:auto;padding-top:var(--space-4);border-top:1px solid rgba(201,168,76,0.15);">
      <a href="${rootPrefix}pages/settings.html"
         class="sidebar-item ${currentPageId === 'settings' ? 'active' : ''}"
         data-page="settings">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5" width="18" height="18">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z"/>
          <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
        </svg>
        <span>設定</span>
      </a>
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
