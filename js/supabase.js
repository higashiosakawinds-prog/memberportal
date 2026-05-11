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

// ── Supabaseクライアント ──
// window.supabase はSDKが注入するグローバル変数のため、
// 競合を避けるため別名 _sb で管理する
let _sb = null;

function initSupabase() {
  if (typeof window.supabase === 'undefined') {
    console.warn('Supabase SDK が読み込まれていません。');
    return null;
  }
  _sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
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
        sessionStorage.setItem('hs_user', JSON.stringify({
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
    if (_sb) await _sb.auth.signOut();
    sessionStorage.removeItem('hs_user');
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
