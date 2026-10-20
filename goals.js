// 돈셈 목표 저축: 기록은 이 기기의 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
(() => {
  const KEY = 'donsem:goals', ASSETS_KEY = 'donsem:assets';
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const t0 = new Date(), today = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.goals)) return { goals: d.goals };
    } catch (e) { /* 저장된 게 없거나 망가진 경우 */ }
    return { goals: [] };
  }
  let data = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { toast('이 브라우저에서는 저장할 수 없어요. 개인정보 보호 모드인지 확인해 주세요.'); return false; }
  }
  function assetItems() {
    try { const d = JSON.parse(localStorage.getItem(ASSETS_KEY)); return d && Array.isArray(d.items) ? d.items.filter(x => x.kind === 'asset') : []; }
    catch (e) { return []; }
  }
  const savedOf = g => {
    if (g.mode !== 'assets') return g.saved || 0;
    const ids = new Set(g.assetIds || []);
    return assetItems().filter(x => ids.has(x.id)).reduce((s, x) => s + x.amt, 0);
  };
  const monthsUntil = date => {
    if (!date) return null;
    const d = new Date(date + 'T00:00:00');
    return (d.getFullYear() - today.getFullYear()) * 12 + (d.getMonth() - today.getMonth()) - (d.getDate() < today.getDate() ? 1 : 0);
  };

  // ── 목표 만들기 ──
  let mode = 'manual';
  function drawAssetPick(box, chosen) {
    const items = assetItems();
    if (!items.length) { box.innerHTML = '<p class="sub small">아직 <a href="/assets/">내 자산</a>에 적어 둔 자산이 없어요. 먼저 적금 통장 같은 자산을 추가해 주세요.</p>'; return; }
    box.innerHTML = '<div class="chips multi">' + items.map(x => `<button type="button" class="${chosen.has(x.id) ? 'on' : ''}" data-asset="${esc(x.id)}">${esc(x.name)} · ${won(x.amt)}</button>`).join('') + '</div>';
  }
  const picked = new Set();
  $('g-mode').addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    mode = v;
    $('g-manual-wrap').hidden = mode !== 'manual';
    $('g-assets-wrap').hidden = mode !== 'assets';
    if (mode === 'assets') drawAssetPick($('g-assets'), picked);
  });
  $('g-assets').addEventListener('click', e => {
    const id = e.target.dataset && e.target.dataset.asset;
    if (!id) return;
    picked.has(id) ? picked.delete(id) : picked.add(id);
    drawAssetPick($('g-assets'), picked);
  });
  function addGoal() {
    const name = $('g-name').value.trim().slice(0, 30), target = num($('g-target').value), date = $('g-date').value, err = $('g-err');
    if (!name) { err.textContent = '목표 이름을 넣어 주세요. 예: 결혼자금'; $('g-name').focus(); return; }
    if (!target) { err.textContent = '목표 금액을 넣어 주세요.'; $('g-target').focus(); return; }
    if (date && new Date(date + 'T00:00:00') <= today) { err.textContent = '목표 날짜는 내일 이후로 골라 주세요.'; return; }
    if (mode === 'assets' && !picked.size) { err.textContent = '연결할 자산을 하나 이상 골라 주세요.'; return; }
    err.textContent = '';
    const g = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, target, date: date || '', mode };
    if (mode === 'assets') g.assetIds = [...picked]; else g.saved = num($('g-saved').value);
    data.goals.push(g);
    if (!save()) return;
    ['g-name', 'g-target', 'g-saved', 'g-date'].forEach(id => { $(id).value = ''; });
    picked.clear();
    $('g-target').dispatchEvent(new Event('input', { bubbles: true }));
    render();
    toast(`'${name}' 목표를 만들었어요.`);
  }
  $('g-save').addEventListener('click', addGoal);
  ['g-name', 'g-target', 'g-saved'].forEach(id => $(id).addEventListener('input', () => { $('g-err').textContent = ''; }));

  // ── 목표 카드 그리기 ──
  let openAdd = null;
  function render() {
    const box = $('g-list');
    if (!data.goals.length) {
      box.innerHTML = '<p class="empty">아직 목표가 없어요. 아래에서 첫 목표를 만들어 보세요. 결혼자금, 여행, 비상금처럼 무엇이든 좋아요.</p>';
      $('g-summary').textContent = '';
      return;
    }
    const totalT = data.goals.reduce((s, g) => s + g.target, 0), totalS = data.goals.reduce((s, g) => s + Math.min(savedOf(g), g.target), 0);
    $('g-summary').textContent = `목표 ${data.goals.length}개 · 전체 ${Math.round(totalS / totalT * 100)}% 달성`;
    box.innerHTML = data.goals.map(g => {
      const saved = savedOf(g), ratio = saved / g.target, left = Math.max(0, g.target - saved), done = saved >= g.target;
      const m = monthsUntil(g.date);
      let tip;
      if (done) tip = '🎉 목표를 이뤘어요! 정말 잘했어요.';
      else if (m === null) tip = `${won(left)}만 더 모으면 돼요. 목표 날짜를 정하면 매달 얼마씩 모아야 하는지 알려 드려요.`;
      else if (m <= 0) tip = `목표 날짜가 이번 달이에요. ${won(left)}이 남았어요.`;
      else tip = `목표일까지 ${m}개월, 매달 약 <strong>${won(left / m)}</strong>씩 모으면 돼요.`;
      const calcLink = !done && m > 0 ? `<a class="link" href="/goal/?g_goal=${Math.round(left)}&g_now=0&g_y=${Math.round(m / 12 * 100) / 100}&g_r=3.5">이자까지 따져 보기 ›</a>` : '';
      const source = g.mode === 'assets'
        ? `<span class="src">🔗 내 자산 연결 · ${assetItems().filter(x => (g.assetIds || []).includes(x.id)).map(x => esc(x.name)).join(', ') || '연결된 자산이 지워졌어요'}</span>`
        : '<span class="src">✍️ 직접 입력</span>';
      const addRow = g.mode === 'manual' && !done
        ? (openAdd === g.id
          ? `<div class="add-row"><div class="field mini"><input id="g-add-in" inputmode="numeric" placeholder="모은 금액" aria-label="${esc(g.name)}에 더할 금액"><span>원</span></div><button type="button" class="btn fill" data-addok="${esc(g.id)}">더하기</button><button type="button" class="link" data-addcancel="1">취소</button></div>`
          : `<button type="button" class="btn line" data-add="${esc(g.id)}">+ 모았어요</button>`)
        : '';
      return `<div class="goal${done ? ' done' : ''}">
        <div class="goal-head"><b>${esc(g.name)}</b><button type="button" class="del" data-del="${esc(g.id)}" aria-label="${esc(g.name)} 목표 지우기">×</button></div>
        ${source}
        <div class="goal-num"><strong>${Math.min(100, Math.floor(ratio * 100))}%</strong><span>${won(saved)} / ${won(g.target)}</span></div>
        <div class="bar${done ? ' good' : ''}"><i style="width:${Math.min(100, ratio * 100)}%"></i></div>
        <p class="goal-tip">${tip}${g.date ? ` <span class="muted">(목표일 ${g.date.replace(/-/g, '.')})</span>` : ''}</p>
        <div class="goal-actions">${addRow}${calcLink}</div>
      </div>`;
    }).join('');
    const inp = $('g-add-in');
    if (inp) {
      inp.focus();
      inp.addEventListener('input', () => { const d = inp.value.replace(/[^0-9]/g, ''); inp.value = d ? Number(d).toLocaleString('ko-KR') : ''; });
      inp.addEventListener('keydown', e => { if (e.key === 'Enter') commitAdd(); if (e.key === 'Escape') { openAdd = null; render(); } });
    }
  }
  function commitAdd() {
    const g = data.goals.find(x => x.id === openAdd), v = num($('g-add-in').value);
    openAdd = null;
    if (g && v) {
      const before = g.saved || 0;
      g.saved = before + v; save();
      toast(g.saved >= g.target && before < g.target ? `🎉 '${g.name}' 목표를 이뤘어요!` : `${won(v)}을 더했어요. 지금 ${Math.min(100, Math.floor(g.saved / g.target * 100))}%예요.`);
    }
    render();
  }
  $('g-list').addEventListener('click', e => {
    const d = e.target.dataset || {};
    if (d.add) { openAdd = d.add; render(); }
    else if (d.addok) commitAdd();
    else if (d.addcancel) { openAdd = null; render(); }
    else if (d.del) {
      const g = data.goals.find(x => x.id === d.del);
      if (!g || !confirm(`'${g.name}' 목표를 지울까요? 연결된 내 자산 기록은 그대로 남아요.`)) return;
      data.goals = data.goals.filter(x => x.id !== d.del);
      save(); render();
    }
  });
  // 다른 탭에서 내 자산을 고치면 진행률도 바로 바꿔요
  window.addEventListener('storage', e => { if (e.key === ASSETS_KEY || e.key === KEY) { data = load(); render(); } });

  // ── 백업 ──
  function download(name, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('g-export').addEventListener('click', () => {
    download(`돈셈-목표-백업-${iso(new Date()).replace(/-/g, '')}.json`, JSON.stringify({ app: 'donsem-goals', version: 1, ...data }, null, 2), 'application/json');
    toast('백업 파일을 저장했어요. 안전한 곳에 보관하세요.');
  });
  $('g-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.goals)) throw new Error('형식');
      const have = new Set(data.goals.map(x => x.id));
      const fresh = d.goals.filter(x => x && x.id && !have.has(x.id) && Number(x.target) > 0)
        .map(x => {
          const g = { id: String(x.id), name: String(x.name || '목표').slice(0, 30), target: Number(x.target), date: /^\d{4}-\d{2}-\d{2}$/.test(x.date) ? x.date : '', mode: x.mode === 'assets' ? 'assets' : 'manual' };
          if (g.mode === 'assets') g.assetIds = Array.isArray(x.assetIds) ? x.assetIds.map(String) : []; else g.saved = Math.max(0, Number(x.saved) || 0);
          return g;
        });
      if (!confirm(`백업 파일에서 새 목표 ${fresh.length}개를 찾았어요. 지금 목록에 합칠까요?`)) return;
      data.goals = data.goals.concat(fresh);
      save(); render();
      toast(`목표 ${fresh.length}개를 불러왔어요.`);
    } catch (err) {
      toast('돈셈 목표 백업 파일이 아니에요. 파일을 다시 확인해 주세요.');
    }
  });
  $('g-reset').addEventListener('click', () => {
    if (!data.goals.length) return toast('지울 목표가 없어요.');
    if (!confirm(`목표 ${data.goals.length}개를 모두 지울까요? 지우면 되돌릴 수 없어요.`)) return;
    data = { goals: [] };
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장이 막힌 브라우저 */ }
    render();
    toast('목표를 모두 지웠어요.');
  });

  render();
})();
