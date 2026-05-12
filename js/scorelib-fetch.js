
//fetchSongs() を呼ぶと楽曲データが取得できます

// ▼ pubhtml の URL をそのまま貼ってください（gid= が含まれているものでOK）
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

  // ── URL 構築 ────────────────────────────────────────────────
  // SHEET_PUBLISH_URL は pubhtml 形式:
  //   https://docs.google.com/spreadsheets/d/e/{publishedId}/pubhtml?gid=XXXX&single=true
  //
  // gviz/tq エンドポイントの形式:
  //   https://docs.google.com/spreadsheets/d/e/{publishedId}/pub?gid={jsonSheetGid}&tqx=out:json
  //
  // JSON出力シートの gid は GAS の updateJsonOutput() で作られるシートのものです。
  // 既知の gid がある場合は JSON_OUTPUT_GID に設定してください。
  // 不明な場合は 0 (先頭シート) ではなく sheet= パラメータでシート名指定を試みます。
  // ─────────────────────────────────────────────────────────────

  // pubhtml → pub に変換し、gid・single パラメータを除去してベースURLを作る
  const publishedBase = SHEET_PUBLISH_URL
    .replace('/pubhtml', '/pub')
    .replace(/[?&](gid|single)=[^&]*/g, '')
    .replace(/[?&]$/, '');

  // JSON出力シートをシート名で指定（GAS側のシート名と合わせること）
  // encodeURIComponent('JSON出力') = 'JSON%E5%87%BA%E5%8A%9B'
  const JSON_SHEET_NAME = encodeURIComponent('JSON出力');

  const url = `${publishedBase}?tqx=out:json&tq=${encodeURIComponent('select A')}&sheet=${JSON_SHEET_NAME}`;

  let res;
  try {
    res = await fetch(url);
  } catch (e) {
    throw new Error(`ネットワークエラー: ${e.message}`);
  }

  if (!res.ok) {
    throw new Error(`スプレッドシートの取得に失敗しました (HTTP ${res.status})。スプレッドシートが「ウェブに公開」されているか確認してください。`);
  }

  const text = await res.text();

  // Google の JSONP ラッパーを除去: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  const jsonStr = text.match(/setResponse\((.+)\);?\s*$/s)?.[1];
  if (!jsonStr) {
    // gviz/tq が HTML を返す場合 → シートが見つからないか未公開
    if (text.includes('<html')) {
      throw new Error('JSON出力シートが見つかりません。GASで updateJsonOutput() を一度実行してから、スプレッドシートを「ウェブに公開」してください。');
    }
    throw new Error('スプレッドシートのデータ取得に失敗しました（レスポンス形式が想定外です）');
  }

  const gvizData = JSON.parse(jsonStr);
  const cellValue = gvizData?.table?.rows?.[0]?.c?.[0]?.v;
  if (!cellValue) return { songs: [] };

  let data;
  try {
    data = JSON.parse(cellValue);
  } catch (e) {
    throw new Error('JSON出力シートのデータが壊れています。GASで updateJsonOutput() を再実行してください。');
  }

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
 *   id:             string,          // supaId があればそちらを、なければ folderId
 *   title:          string,
 *   composer:       string,
 *   arranger:       string,
 *   notes:          string,
 *   created_at:     string,
 *   is_distributed: boolean,         // Supabase DBの値を優先
 *   parts:          string[],        // パートキー配列（例: ['flute','clarinet']）
 *   gasparts:       GasPart[],       // GAS由来のパート詳細（fileId等）
 *   supaId:         string|null,     // Supabase DB の UUID
 *   folderId:       string,          // GAS の Drive フォルダID
 * }
 */

// GASのパート名 → 内部キー 変換マップ
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
 * GASのパート名を内部キーに正規化する（大文字小文字・前後空白を無視）
 */
function normalizePartKey(gasPartName) {
  if (!gasPartName) return 'other';
  const lower = gasPartName.trim().toLowerCase();
  return PART_KEY_MAP[lower] ?? PART_KEY_MAP[gasPartName.trim()] ?? 'other';
}

/**
 * GASの Song[] と Supabase の scores[] をマージして内部形式に変換する。
 * - GASに存在する曲を主データとする
 * - Supabase に同名の曲がある場合、is_distributed / composer / arranger / notes を補完する
 * - GASにない曲がSupabaseにある場合もリストに含める（Supabase単独曲）
 *
 * @param {Song[]} gasSongs       - fetchSongs() の結果
 * @param {Object[]} supaScores   - Supabase の scores テーブルの行（なければ []）
 * @returns {Object[]}            - 内部形式の楽曲配列
 */
function mergeScoresData(gasSongs, supaScores) {
  const merged = [];
  const matchedSupaIds = new Set();

  // GAS曲を主データとしてマージ
  for (const song of gasSongs) {
    const supa = supaScores.find(
      s => s.title?.trim() === song.title?.trim()
    ) ?? {};

    if (supa.id) matchedSupaIds.add(supa.id);

    const gasparts = (song.parts ?? []).map(p => ({
      key:      normalizePartKey(p.name),
      name:     p.name,
      fileId:   p.fileId   ?? '',
      fileName: p.fileName ?? '',
      fileUrl:  p.fileUrl  ?? '',
    }));

    merged.push({
      id:             supa.id ?? song.folderId,
      folderId:       song.folderId,
      title:          song.title,
      composer:       supa.composer ?? '',
      arranger:       supa.arranger ?? '',
      notes:          supa.notes    ?? '',
      created_at:     song.createdAt ?? supa.created_at ?? '',
      is_distributed: supa.is_distributed ?? false,
      parts:          [...new Set(gasparts.map(p => p.key))],
      gasparts,
      supaId:         supa.id ?? null,
    });
  }

  // Supabaseのみに存在する曲（GASに対応がない場合のフォールバック）
  for (const s of supaScores) {
    if (!matchedSupaIds.has(s.id)) continue; // GASとマッチした曲はスキップ
    // GASに未登録の曲はSupabaseデータのみで表示
    merged.push({
      id:             s.id,
      folderId:       '',
      title:          s.title,
      composer:       s.composer ?? '',
      arranger:       s.arranger ?? '',
      notes:          s.notes    ?? '',
      created_at:     s.created_at ?? '',
      is_distributed: s.is_distributed ?? false,
      parts:          [],
      gasparts:       [],
      supaId:         s.id,
    });
  }

  return merged;
}

