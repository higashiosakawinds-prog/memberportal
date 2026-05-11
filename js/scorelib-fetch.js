
//fetchSongs() を呼ぶと楽曲データが取得できます

const SHEET_PUBLISH_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRI4F0AYNKACIWikC9bukK6-eBpX8Kz1_3xbSD-ZyNza9zYplGrZt6dMbmY6X8jldvNfKS76-V0I6Y8/pubhtml?gid=1754023041&single=true';

/**
 * 楽曲データを取得する
 * @returns {Promise<{songs: Song[]}>}
 *
 * Song の型:
 * {
 *   title: string,
 *   folderId: string,
 *   createdAt: string,
 *   parts: { name: string, fileId: string, fileName: string, fileUrl: string }[]
 * }
 */
async function fetchSongs() {
  if (!SHEET_PUBLISH_URL || SHEET_PUBLISH_URL === 'YOUR_SPREADSHEET_PUBLISH_URL') {
    console.warn('SHEET_PUBLISH_URL が設定されていません');
    return { songs: [] };
  }

  // キャッシュ（5分間有効）
  const CACHE_KEY = 'scorelib_songs_cache';
  const CACHE_TTL = 5 * 60 * 1000;
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_TTL) return data;
    } catch (_) {}
  }

  // Spreadsheet の「ウェブに公開」URLからデータを取得
  // 公開URLは gviz/tq エンドポイントでJSONPとして返ってくる
  const url = SHEET_PUBLISH_URL.replace(/\/pub.*/, '/gviz/tq')
    + '?tq=select+A&sheet=JSON出力&tqx=out:json';

  const res = await fetch(url);
  const text = await res.text();

  // Google のJSONPラッパーを除去: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonStr = text.match(/setResponse\((.+)\);?\s*$/s)?.[1];
  if (!jsonStr) throw new Error('Spreadsheetのデータ取得に失敗しました');

  const gvizData = JSON.parse(jsonStr);
  const cellValue = gvizData?.table?.rows?.[0]?.c?.[0]?.v;
  if (!cellValue) return { songs: [] };

  const data = JSON.parse(cellValue);

  // キャッシュに保存
  sessionStorage.setItem(CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
  return data;
}

/**
 * PDFのプレビューURLを生成（iframe埋め込み用）
 * @param {string} fileId - Google DriveのファイルID
 */
function getPdfPreviewUrl(fileId) {
  return `https://drive.google.com/file/d/${fileId}/preview`;
}

/**
 * PDFのダウンロードURLを生成
 * @param {string} fileId
 */
function getPdfDownloadUrl(fileId) {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * キャッシュを消去（強制リロード用）
 */
function clearSongsCache() {
  sessionStorage.removeItem('scorelib_songs_cache');
}

// ============================================================
// 東大阪吹奏楽団 DXシステム用 変換・統合ヘルパー
// ============================================================

/**
 * GASから取得した Song[] を scores.html 内部形式に変換する。
 *
 * 内部形式:
 * {
 *   id:             string,          // folderId をIDとして使用
 *   title:          string,
 *   composer:       string,
 *   arranger:       string,
 *   notes:          string,
 *   created_at:     string,
 *   is_distributed: boolean,         // Supabase DBの値を上書きで使用
 *   parts:          string[],        // パートキー配列（例: ['flute','clarinet']）
 *   gasparts:       GasPart[],       // GAS由来のパート詳細（fileId等）
 * }
 *
 * GasPart:
 * {
 *   key:      string,   // パートキー（PART_KEY_MAP で正規化）
 *   name:     string,   // GASから来たパート名（例: "Flute"）
 *   fileId:   string,
 *   fileName: string,
 *   fileUrl:  string,
 * }
 */

// GASのパート名 → 内部キー 変換マップ
// GASのスプレッドシートでの表記に合わせて追加・変更してください
const PART_KEY_MAP = {
  // 英語表記
  'conductor': 'conductor', 'score': 'conductor',
  'flute': 'flute', 'fl': 'flute',
  'oboe': 'oboe', 'ob': 'oboe',
  'clarinet': 'clarinet', 'cl': 'clarinet',
  'bassoon': 'bassoon', 'fg': 'bassoon', 'bn': 'bassoon',
  'saxophone': 'saxophone', 'sax': 'saxophone',
  'alto sax': 'saxophone', 'tenor sax': 'saxophone',
  'horn': 'horn', 'hn': 'horn', 'fr.horn': 'horn',
  'trumpet': 'trumpet', 'tp': 'trumpet', 'tpt': 'trumpet',
  'trombone': 'trombone', 'tb': 'trombone', 'tbn': 'trombone',
  'euphonium': 'euphonium', 'euph': 'euphonium', 'baritone': 'euphonium',
  'tuba': 'tuba',
  'percussion': 'percussion', 'perc': 'percussion',
  'contrabass': 'contrabass', 'cb': 'contrabass', 'string bass': 'contrabass',
  // 日本語表記
  '指揮者譜': 'conductor', '指揮': 'conductor',
  'フルート': 'flute',
  'オーボエ': 'oboe',
  'クラリネット': 'clarinet',
  'ファゴット': 'bassoon',
  'サクソフォーン': 'saxophone', 'サックス': 'saxophone',
  'ホルン': 'horn',
  'トランペット': 'trumpet',
  'トロンボーン': 'trombone',
  'ユーフォニアム': 'euphonium', 'ユーフォ': 'euphonium',
  'テューバ': 'tuba', 'チューバ': 'tuba',
  '打楽器': 'percussion', 'パーカッション': 'percussion',
  'コントラバス': 'contrabass',
};

/**
 * GASのパート名を内部キーに正規化する
 * 大文字小文字・前後の空白を無視して検索
 */
function normalizePartKey(gasPartName) {
  const lower = gasPartName.trim().toLowerCase();
  return PART_KEY_MAP[lower] ?? PART_KEY_MAP[gasPartName.trim()] ?? 'other';
}

/**
 * GASの Song[] と Supabase の scores[] をマージして内部形式に変換する。
 * - GASに存在する曲を主データとする
 * - Supabase に同名の曲がある場合、is_distributed / composer / arranger / notes を補完する
 *
 * @param {Song[]} gasSongs       - fetchSongs() の結果
 * @param {Object[]} supaScores   - Supabase の scores テーブルの行（なければ []）
 * @returns {Object[]}            - 内部形式の楽曲配列
 */
function mergeScoresData(gasSongs, supaScores) {
  return gasSongs.map(song => {
    // Supabase から同タイトルの行を探す（補助情報として使う）
    const supa = supaScores.find(
      s => s.title?.trim() === song.title?.trim()
    ) ?? {};

    const gasparts = (song.parts ?? []).map(p => ({
      key:      normalizePartKey(p.name),
      name:     p.name,
      fileId:   p.fileId,
      fileName: p.fileName,
      fileUrl:  p.fileUrl,
    }));

    return {
      // IDはSupabaseにあればそちらを、なければfolderId
      id:             supa.id ?? song.folderId,
      title:          song.title,
      composer:       supa.composer ?? '',
      arranger:       supa.arranger ?? '',
      notes:          supa.notes    ?? '',
      created_at:     song.createdAt ?? supa.created_at ?? '',
      is_distributed: supa.is_distributed ?? false,
      // パートキー配列（フィルタ用）
      parts:          [...new Set(gasparts.map(p => p.key))],
      // GAS由来のパート詳細（PDF表示用）
      gasparts,
      // Supabase DB の ID（配布切替の更新に使う。GASにしかない曲はnull）
      supaId:         supa.id ?? null,
    };
  });
}
