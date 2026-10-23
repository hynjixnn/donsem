// 돈셈 내 자산: 기록은 이 기기의 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
(() => {
  const KEY = 'donsem:assets';
  const CATS = {
    asset: ['현금·입출금', '예금·적금', '주식·펀드', '연금', '보증금·부동산', '자동차', '기타 자산'],
    debt: ['신용대출', '주택담보대출', '전세대출', '카드값', '기타 대출'],
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.items)) return { items: d.items, history: d.history && typeof d.history === 'object' ? d.history : {} };
    } catch (e) { /* 저장된 게 없거나 망가진 경우 */ }
    return { items: [], history: {} };
  }
  let data = load();
  const totals = () => {
    const a = data.items.filter(x => x.kind === 'asset').reduce((s, x) => s + x.amt, 0);
    const d = data.items.filter(x => x.kind === 'debt').reduce((s, x) => s + x.amt, 0);
    return { a, d, net: a - d };
  };
  function save() {
    const t = totals();
    data.history[thisMonth] = { a: t.a, d: t.d }; // 이번 달 기록은 바뀔 때마다 최신 값으로 덮어써요
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { toast('이 브라우저에서는 저장할 수 없어요. 개인정보 보호 모드인지 확인해 주세요.'); return false; }
  }
  const signed = n => (n < 0 ? '-' : '') + won(Math.abs(n));

  // ── 항목 추가 ──
  let kind = 'asset', cat = CATS.asset[0], editing = null;
  function drawCats() {
    $('a-cats').innerHTML = CATS[kind].map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
    $('a-name').placeholder = kind === 'asset' ? '토스뱅크 통장' : '○○은행 신용대출';
  }
  $('a-kind').addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    kind = v; cat = CATS[kind][0]; drawCats();
    $('a-save').textContent = kind === 'asset' ? '자산 추가하기' : '부채 추가하기';
  });
  $('a-cats').addEventListener('click', e => {
    const c = e.target.dataset && e.target.dataset.cat;
    if (c) { cat = c; drawCats(); }
  });
  function addItem() {
    const amt = num($('a-amt').value), err = $('a-err');
    if (!amt) { err.textContent = '금액을 넣어 주세요.'; $('a-amt').focus(); return; }
    if (amt > MAX_REC) { err.textContent = '1,000억 원보다 큰 금액은 넣을 수 없어요. 숫자를 다시 확인해 주세요.'; $('a-amt').focus(); return; }
    err.textContent = '';
    const name = $('a-name').value.trim().slice(0, 30) || cat;
    data.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), kind, cat, name, amt });
    if (!save()) return;
    $('a-amt').value = ''; $('a-name').value = '';
    $('a-amt').dispatchEvent(new Event('input', { bubbles: true }));
    render();
    toast(`${name} ${won(amt)}을 추가했어요.`);
  }
  $('a-save').addEventListener('click', addItem);
  ['a-amt', 'a-name'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }));
  $('a-amt').addEventListener('input', () => { $('a-err').textContent = ''; });

  // ── 그리기 ──
  function render() {
    const t = totals();
    setRoll($('a-net'), signed(t.net));
    $('a-net').classList.toggle('minus', t.net < 0);
    $('a-net-kr').textContent = t.net >= 10000 ? korean(t.net) : '';
    $('a-total').textContent = won(t.a);
    $('a-debt').textContent = won(t.d);
    drawInsight(t);
    drawList();
    drawMix(t);
    drawHistory();
  }

  function drawInsight(t) {
    const box = $('a-insight');
    if (!data.items.length) { box.innerHTML = ''; return; }
    const parts = [];
    const months = Object.keys(data.history).sort(), prevKey = months.filter(m => m < thisMonth).pop();
    if (prevKey) {
      const p = data.history[prevKey], diff = t.net - (p.a - p.d);
      parts.push(diff === 0 ? '지난 기록과 순자산이 같아요.' : `${Number(prevKey.slice(5))}월보다 순자산이 <strong>${won(Math.abs(diff))} ${diff > 0 ? '늘었어요' : '줄었어요'}</strong>.`);
    }
    if (t.a > 0) {
      const ratio = t.d / t.a * 100;
      parts.push(`부채 비율은 자산의 ${Math.round(ratio)}%예요${ratio > 100 ? '. 갚아야 할 돈이 가진 돈보다 많아요' : ratio >= 40 ? '. 대출 금리를 한번 점검해 보세요' : ''}.`);
    }
    box.innerHTML = parts.length ? `<p class="insight"><b>한 줄 정리</b>${parts.join(' ')}</p>` : '';
  }

  function drawList() {
    const ul = $('a-items');
    if (!data.items.length) {
      ul.innerHTML = '<li class="empty">통장, 투자, 대출을 하나씩 추가해 보세요. 정확하지 않아도 괜찮아요. 대략적인 금액만 적어도 흐름이 보여요.</li>';
      return;
    }
    const block = k => {
      const list = data.items.filter(x => x.kind === k);
      if (!list.length) return '';
      return `<li class="day"><span>${k === 'asset' ? '자산' : '부채'}</span><span>${won(list.reduce((s, x) => s + x.amt, 0))}</span></li>` +
        list.map(x => x.id === editing
          ? `<li class="item editing"><div><b>${esc(x.name)}</b><span>${esc(x.cat)}</span></div>
              <div class="field mini"><input id="a-edit" inputmode="numeric" value="${x.amt.toLocaleString('ko-KR')}" aria-label="${esc(x.name)} 금액"><span>원</span></div>
              <button type="button" class="link" data-ok="${esc(x.id)}">저장</button></li>`
          : `<li class="item"><div><b>${esc(x.name)}</b><span>${esc(x.cat)}</span></div>
              <button type="button" class="amt-btn ${x.kind}" data-edit="${esc(x.id)}" aria-label="${esc(x.name)} 금액 고치기">${x.kind === 'debt' ? '-' : ''}${won(x.amt)}</button>
              <button type="button" class="del" data-id="${esc(x.id)}" aria-label="${esc(x.name)} 지우기">×</button></li>`).join('');
    };
    ul.innerHTML = block('asset') + block('debt');
    const ed = $('a-edit');
    if (ed) {
      ed.focus(); ed.select();
      ed.addEventListener('input', () => { const d = ed.value.replace(/[^0-9]/g, ''); ed.value = d ? Number(d).toLocaleString('ko-KR') : ''; });
      ed.addEventListener('keydown', e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { editing = null; render(); } });
    }
  }
  function commitEdit() {
    const it = data.items.find(x => x.id === editing), v = num($('a-edit').value);
    editing = null;
    if (it && v) { it.amt = v; save(); toast(`${it.name} 금액을 ${won(v)}으로 고쳤어요.`); }
    render();
  }
  $('a-items').addEventListener('click', e => {
    const d = e.target.dataset || {};
    if (d.edit) { editing = d.edit; render(); }
    else if (d.ok) commitEdit();
    else if (d.id) {
      const it = data.items.find(x => x.id === d.id);
      if (!it || !confirm(`${it.name} (${won(it.amt)})을 지울까요?`)) return;
      data.items = data.items.filter(x => x.id !== d.id);
      save(); render();
    }
  });

  function drawMix(t) {
    const box = $('a-mix');
    if (!t.a) { box.innerHTML = '<p class="empty">자산을 추가하면 어디에 얼마나 있는지 보여 드려요.</p>'; return; }
    const by = {};
    data.items.filter(x => x.kind === 'asset').forEach(x => { by[x.cat] = (by[x.cat] || 0) + x.amt; });
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]), top = rows[0][1];
    box.innerHTML = `<p class="insight"><b>한 줄 정리</b>자산의 ${Math.round(top / t.a * 100)}%가 <strong>${esc(rows[0][0])}</strong>에 있어요.</p>` +
      rows.map(([c, a]) => `<div class="cat-row"><div class="cat-top"><span>${esc(c)}</span><span>${won(a)} · ${Math.round(a / t.a * 100)}%</span></div><div class="bar"><i style="width:${a / top * 100}%"></i></div></div>`).join('');
  }

  function drawHistory() {
    const box = $('a-history'), months = Object.keys(data.history).sort().slice(-12);
    if (months.length < 2) {
      box.innerHTML = '<p class="empty">매달 한 번씩 금액을 업데이트하면, 여기에 순자산이 어떻게 변하는지 쌓여요. 이번 달 기록은 저장돼 있어요.</p>';
      return;
    }
    const nets = months.map(m => data.history[m].a - data.history[m].d), max = Math.max(...nets.map(Math.abs)) || 1;
    box.innerHTML = months.map((m, i) => {
      const n = nets[i], diff = i ? n - nets[i - 1] : 0;
      return `<div class="cat-row"><div class="cat-top"><span>${m.slice(0, 4)}년 ${Number(m.slice(5))}월</span><span>${signed(n)}${i ? ` <small class="${diff >= 0 ? 'up' : 'down'}">${diff >= 0 ? '▲' : '▼'} ${won(Math.abs(diff))}</small>` : ''}</span></div>
        <div class="bar${n < 0 ? ' over' : ''}"><i style="width:${Math.abs(n) / max * 100}%"></i></div></div>`;
    }).join('');
  }

  // ── 백업 ──
  function download(name, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const stamp = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
  $('a-export').addEventListener('click', () => {
    download(`돈셈-내자산-백업-${stamp()}.json`, JSON.stringify({ app: 'donsem-assets', version: 1, ...data }, null, 2), 'application/json');
    toast('백업 파일을 저장했어요. 안전한 곳에 보관하세요.');
  });
  $('a-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.items)) throw new Error('형식');
      const have = new Set(data.items.map(x => x.id));
      const fresh = d.items.filter(x => x && x.id && !have.has(x.id) && (x.kind === 'asset' || x.kind === 'debt') && Number(x.amt) > 0)
        .map(x => ({ id: String(x.id), kind: x.kind, cat: String(x.cat || '기타').slice(0, 20), name: String(x.name || x.cat || '항목').slice(0, 30), amt: Number(x.amt) }));
      if (!confirm(`백업 파일에서 새 항목 ${fresh.length}개를 찾았어요. 지금 자산 목록에 합칠까요?`)) return;
      data.items = data.items.concat(fresh);
      if (d.history && typeof d.history === 'object') {
        Object.entries(d.history).forEach(([m, v]) => {
          if (/^\d{4}-\d{2}$/.test(m) && m !== thisMonth && !data.history[m] && v && isFinite(v.a) && isFinite(v.d)) data.history[m] = { a: Number(v.a), d: Number(v.d) };
        });
      }
      save(); render();
      toast(`항목 ${fresh.length}개를 불러왔어요.`);
    } catch (err) {
      toast('돈셈 내 자산 백업 파일이 아니에요. 파일을 다시 확인해 주세요.');
    }
  });
  $('a-reset').addEventListener('click', () => {
    if (!data.items.length && !Object.keys(data.history).length) return toast('지울 기록이 없어요.');
    if (!confirm(`자산·부채 항목 ${data.items.length}개와 월별 기록을 모두 지울까요? 지우면 되돌릴 수 없어요. 먼저 백업 파일을 저장해 두는 걸 추천해요.`)) return;
    data = { items: [], history: {} };
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장이 막힌 브라우저 */ }
    render();
    toast('내 자산 기록을 모두 지웠어요.');
  });

  drawCats();
  render();
})();
