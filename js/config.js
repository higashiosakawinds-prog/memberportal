/**
 * 東大阪吹奏楽団 ひがすいポータル — 共通設定・ユーティリティ（単一の定義元）
 *
 * これまで各ページに個別にベタ書きしていた「GAS の URL」「HTMLエスケープ関数」
 * 「会員区分ラベル」を、このファイル1か所にまとめました。
 * 値を変更するときは、このファイルだけを直せば全ページに反映されます。
 *
 * 読み込み順： supabase.js → config.js → common.js →（各ページの個別スクリプト）
 *   ※ このファイルは supabase/common より前後どちらでも動きますが、
 *     必ず各ページの個別スクリプトより前に読み込んでください。
 */

// ══════════════════════════════════════════════════════════
//  アプリのバージョン（不具合報告に自動で添付されます）
//   ・main に push されると GitHub Actions（.github/workflows/release.yml）が
//     自動で書き換えます。手で編集しないでください。
//   ・表記は「α 1.00」。節目で大きく上げるときは、タグ alpha-2.00 を手動で作成します。
// ══════════════════════════════════════════════════════════
const APP_STAGE   = 'α';
const APP_VERSION = '1.02';
const APP_RELEASED_AT = '2026-11-08';   // リリース日（自動で入ります）
const APP_VERSION_LABEL = `${APP_STAGE} ${APP_VERSION}`;

// ══════════════════════════════════════════════════════════
//  Google Apps Script（GAS）エンドポイント
//   ・GAS を貼り替えたら、ここだけを変更すれば全ページに反映されます。
// ══════════════════════════════════════════════════════════
const _GAS_PROD = {
  // 団費（支払い記録）用スプレッドシート
  DUES:     'https://script.google.com/macros/s/AKfycbwvfg_SisVkhgPg8XqWWztiRKwOx7nwAP2JIJzTltuLeYvb8n1yzh2CCxCOEg_Vy91xlg/exec',
  // 出納帳用スプレッドシート
  LEDGER:   'https://script.google.com/macros/s/AKfycbx-mwLTKGdHA2zjvQZiMOylDGDgT2Xl4abynm2kQV7968muF95uWAJ602yiEyKGveXJ/exec',
  // 活動・出欠用スプレッドシート
  ACTIVITY: 'https://script.google.com/macros/s/AKfycbzpDrOSmqliAEMOsPsTMIuiU8ScAxqLGFpOfdi-nGJ5TK2gVK95Pr4F5H4D4ceP-16R/exec',
  // 見学者メール送信用（Gmail）
  VISITOR:  'https://script.google.com/macros/s/AKfycbzYkYBMlJFk4kuxSeJbPU6RzuD26tojo69kK8XQB1eh4i3zScfVxqaD6yUn7TlayjMhrw/exec',
};

// localhost / 127.0.0.1（ローカル開発）で開いたときだけ、GAS を無効にする。
//   ・テスト中に本番の台帳・Gmail（見学者へのメール）へ書き込まないため
//   ・本番サイトでは _GAS_PROD がそのまま使われ、動作は変わらない
//   ・見学者メールは visitors.html が 'YOUR_VISITOR_GAS_SCRIPT_ID' を検知して送信を止める
const _GAS_LOCAL_DISABLED = 'about:blank#YOUR_VISITOR_GAS_SCRIPT_ID-local-disabled';
//   ・iPhone での確認用トンネル（*.trycloudflare.com）も同じくローカル扱い（判定は supabase.js と共通）
window._hsDevHost = window._hsDevHost || (() => {
  const h = location.hostname;
  const tunnel = /\.trycloudflare\.com$/.test(h);
  return { local: tunnel || h === 'localhost' || h === '127.0.0.1', tunnel };
})();
const GAS = window._hsDevHost.local
  ? { DUES: _GAS_LOCAL_DISABLED, LEDGER: _GAS_LOCAL_DISABLED, ACTIVITY: _GAS_LOCAL_DISABLED, VISITOR: _GAS_LOCAL_DISABLED }
  : _GAS_PROD;

// ── 後方互換：既存コードが参照している変数名をそのまま使えるようにする別名 ──
//   （各ページのコードは今まで通りこれらの名前で参照できます）
const DUES_GAS_URL          = GAS.DUES;
const LEDGER_GAS_URL        = GAS.LEDGER;
const GS_URL                = GAS.LEDGER;    // ledger.html が使う名前
const ACTIVITY_GAS_URL      = GAS.ACTIVITY;
const ACTIVITY_GAS_URL_DASH = GAS.ACTIVITY; // index.html が使う旧名
const VISITOR_SEND_GAS_URL  = GAS.VISITOR;

// ══════════════════════════════════════════════════════════
//  会員区分ラベル（単一の定義元）
//   ・以前は dues 系で support を「スタッフ」、members/settings で「賛助」と
//     表記が割れていました。会員管理（members/settings）側を正とし、
//     support=賛助 / staff=スタッフ に統一しています。
// ══════════════════════════════════════════════════════════
const MEMBER_CATEGORY_LABELS = {
  regular:         '正団員',
  regular_student: '正団員（学生）',
  trainee:         '準団員',
  staff:           'スタッフ',
  support:         '賛助',
  rest:            '休団中',
};
// 後方互換の別名（既存コードは CAT_LABELS / CATEGORY_LABELS を参照）
const CAT_LABELS = MEMBER_CATEGORY_LABELS;

// ══════════════════════════════════════════════════════════
//  HTMLエスケープ（XSS対策） — 全ページ共通
// ══════════════════════════════════════════════════════════
function escHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
