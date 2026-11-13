/**
 * 設定画面「メンテナンス」タブ（IT委員のみ・v1.03）
 *
 *  ・タブの表示は画面側の役職（hs_user.roles に engineer）で出し分ける
 *  ・読み書きは RPC（get_maintenance_status / set_maintenance / list_maintenance_log）だけ。
 *    DB 側でも IT委員かを確かめるので、画面を書き換えても保存はできない
 *  ・表示は textContent のみ（innerHTML に入れない）
 *  ・日時の入力（datetime-local）は端末の時刻（日本時間の前提）として扱う
 *
 * 読み込み順: supabase.js → config.js → common.js → このファイル
 */
(() => {
  const user  = (typeof getSessionUser === 'function') ? getSessionUser() : null;
  const roles = Array.isArray(user?.roles) ? user.roles : [];
  if (!roles.includes('engineer')) return;

  const $ = id => document.getElementById(id);
  let current = null;    // 最後に読めた状態
  let busy    = false;
  let dirty   = false;   // 入力を変えてまだ保存していない

  // ── 日時の変換（ISO ⇔ datetime-local） ──
  const pad = n => String(n).padStart(2, '0');
  function isoToLocalInput(v) {
    const d = v ? new Date(v) : null;
    if (!d || isNaN(d)) return '';
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  }
  function localInputToIso(v) {
    if (!v) return null;
    const d = new Date(v);
    return isNaN(d) ? undefined : d.toISOString();   // undefined = 入力が不正
  }

  function showError(msg) {
    const box = $('mt-error');
    box.textContent = msg;
    box.style.display = msg ? 'block' : 'none';
  }

  function renderState(s) {
    const st = $('mt-state');
    const tg = $('mt-toggle');
    if (s.active) {
      st.textContent = '現在: メンテナンス中（ON）';
      st.style.background = '#c0392b';
      st.style.color = '#fff';
      tg.textContent = 'メンテナンスを終了する（OFF）';
      tg.className = 'btn btn-lg btn-primary';
    } else {
      st.textContent = '現在: 通常運用（OFF）';
      st.style.background = 'rgba(39,174,96,0.12)';
      st.style.color = '#1e8449';
      tg.textContent = 'メンテナンスを開始する（ON）';
      tg.className = 'btn btn-lg btn-danger';
    }
    tg.style.width = '100%';
    tg.style.justifyContent = 'center';
  }

  function fillForm(s) {
    $('mt-planned-start').value = isoToLocalInput(s.planned_start);
    $('mt-planned-end').value   = isoToLocalInput(s.planned_end);
    $('mt-notice-start').value  = isoToLocalInput(s.notice_start);
    $('mt-notice-end').value    = isoToLocalInput(s.notice_end);
    $('mt-message').value       = s.message || '';
    $('mt-message-count').textContent = String(($('mt-message').value || '').length);
    $('mt-block-outbound').checked = s.block_outbound !== false;
  }

  const ACTION_LABEL = { on: 'ON', off: 'OFF', update: '予定・文面を変更' };
  async function loadLog() {
    const box = $('mt-log');
    box.textContent = '';
    const { data, error } = await _sb.rpc('list_maintenance_log', { p_limit: 10 });
    if (error) { box.textContent = '記録を読み込めませんでした。'; return; }
    if (!data || !data.length) { box.textContent = 'まだ記録はありません。'; return; }
    data.forEach(r => {
      const row = document.createElement('div');
      row.style.cssText = 'padding:6px 0;border-bottom:1px solid var(--gray-200);';
      const when = SiteMaintenance.fmtDateTime(r.changed_at);
      const plan = SiteMaintenance.fmtRange(r.planned_start, r.planned_end);
      row.textContent =
        `${when}　${r.changed_by_name}　${ACTION_LABEL[r.action] || r.action}` +
        (plan ? `　予定: ${plan}` : '') +
        (r.active && !r.block_outbound ? '　（GAS 送信あり）' : '');
      box.appendChild(row);
    });
  }

  async function load() {
    showError('');
    $('mt-loading').style.display = 'block';
    $('mt-form').style.display = 'none';
    const s = await SiteMaintenance.load();
    $('mt-loading').style.display = 'none';
    if (!s) { showError('状態を読み込めませんでした。通信状況を確認して、もう一度タブを開いてください。'); return; }
    if (!s.can_bypass) { showError('この設定は IT委員だけが使えます。'); return; }
    current = s;
    renderState(s);
    if (!dirty) fillForm(s);   // 入力の途中で他のタブへ行って戻っても、入力を消さない
    $('mt-form').style.display = 'block';
    loadLog();
  }

  // 画面に出している ON/OFF が DB と同じか確かめる。違えば表示を DB に合わせて false
  async function verifyUnchanged() {
    const fresh = await SiteMaintenance.load();
    if (!fresh) { showError('状態を読み込めませんでした。通信状況を確認して、もう一度お試しください。'); return null; }
    if (!!fresh.active !== !!current?.active) {
      current = fresh;
      renderState(fresh);
      fillForm(fresh);
      dirty = false;
      loadLog();
      showError(`他の IT委員がすでに${fresh.active ? 'ON' : 'OFF'}にしています。表示を更新しました。`);
      return null;
    }
    return fresh;
  }

  // 画面の入力をまとめて保存する（active は引数で指定）
  async function save(active) {
    if (busy) return;
    showError('');
    const ps = localInputToIso($('mt-planned-start').value);
    const pe = localInputToIso($('mt-planned-end').value);
    const ns = localInputToIso($('mt-notice-start').value);
    const ne = localInputToIso($('mt-notice-end').value);
    if ([ps, pe, ns, ne].includes(undefined)) { showError('日時の入力が正しくありません。'); return; }
    if (ps && pe && ps >= pe) { showError('メンテナンスの終了は開始より後にしてください。'); return; }
    if (ns && ne && ns >= ne) { showError('予告の表示の終了は開始より後にしてください。'); return; }
    const msg = $('mt-message').value;
    if (msg.length > 500) { showError('文面は500文字以内にしてください。'); return; }

    busy = true;
    const btns = [$('mt-toggle'), $('mt-save')];
    btns.forEach(b => { b.disabled = true; });
    try {
      const { data, error } = await _sb.rpc('set_maintenance', {
        p_active:         active,
        p_message:        msg,
        p_planned_start:  ps,
        p_planned_end:    pe,
        p_notice_start:   ns,
        p_notice_end:     ne,
        p_block_outbound: $('mt-block-outbound').checked,
      });
      if (error) { showError(`保存できませんでした: ${error.message || error}`); return; }
      current = data;
      renderState(data);
      fillForm(data);
      dirty = false;
      loadLog();
      // この画面の帯も新しい状態に合わせる
      SiteMaintenance.apply();
      showToast(
        active === true  ? 'メンテナンスを開始しました' :
        active === false ? 'メンテナンスを終了しました' : '保存しました',
        'success');
    } finally {
      busy = false;
      btns.forEach(b => { b.disabled = false; });
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    const tab = $('tab-maint');
    if (!tab) return;
    tab.style.display = '';
    // タブを開くたびに読み直す（画面が変わった時に読む方針。開きっぱなしの古い表示を残さない）
    tab.addEventListener('click', () => { if (!busy) load(); });

    $('mt-message').addEventListener('input', e => {
      $('mt-message-count').textContent = String(e.target.value.length);
    });
    ['mt-planned-start', 'mt-planned-end', 'mt-notice-start', 'mt-notice-end', 'mt-message', 'mt-block-outbound']
      .forEach(id => $(id).addEventListener('input', () => { dirty = true; }));

    // 予定・文面の保存は ON/OFF を送らない（null = DB 側で今の状態のまま）
    $('mt-save').addEventListener('click', () => save(null));

    $('mt-toggle').addEventListener('click', async () => {
      if (busy) return;
      // 押した直前に読み直し、別の IT委員が切り替えていたら中断して表示を更新する
      const fresh = await verifyUnchanged();
      if (!fresh) return;
      const turnOn = !fresh.active;
      const ok = window.confirm(turnOn
        ? 'メンテナンスを開始します。\nIT委員以外の団員は、次に画面を開いた・移った時から案内の画面になります。よろしいですか？'
        : 'メンテナンスを終了します。\n団員が通常どおりポータルを使えるようになります。よろしいですか？');
      if (!ok) return;
      // 確認ダイアログを開いている間に切り替えられていないか、もう一度確かめる
      if (!(await verifyUnchanged())) return;
      save(turnOn);
    });
  });
})();
