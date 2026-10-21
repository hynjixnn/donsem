// 돈셈 가계부: 기록은 이 기기의 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
(() => {
  const KEY = 'donsem:budget';
  const CATS = {
    out: ['식비', '카페·간식', '교통', '쇼핑', '생활', '주거·통신', '의료', '문화·여가', '경조사', '기타'],
    in: ['월급', '용돈', '부수입', '이자·배당', '기타'],
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const W = '일월화수목금토';

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.entries)) return { entries: d.entries, budget: Number(d.budget) || 0 };
    } catch (e) { /* 저장된 게 없거나 망가진 경우 */ }
    return { entries: [], budget: 0 };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { toast('이 브라우저에서는 저장할 수 없어요. 개인정보 보호 모드인지 확인해 주세요.'); return false; }
  }

  let data = load();
  const today = new Date();
  let month = iso(today).slice(0, 7); // 보고 있는 달 (YYYY-MM)
  let type = 'out', cat = CATS.out[0], editingBudget = false;

  // ── 기록하기 ──
  function drawCats() {
    $('b-cats').innerHTML = CATS[type].map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${catIcon(c)}${esc(c)}</button>`).join('');
  }
  $('b-type').addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    type = v; cat = CATS[type][0];
    drawCats();
    $('b-save').textContent = type === 'out' ? '지출 기록하기' : '수입 기록하기';
  });
  $('b-cats').addEventListener('click', e => {
    const c = e.target.dataset && e.target.dataset.cat;
    if (!c) return;
    cat = c; drawCats();
  });
  $('b-date').value = iso(today);

  function addEntry() {
    const amt = num($('b-amt').value), date = $('b-date').value, err = $('b-err');
    if (!amt) { err.textContent = '금액을 넣어 주세요.'; $('b-amt').focus(); return; }
    if (!date) { err.textContent = '날짜를 골라 주세요.'; return; }
    err.textContent = '';
    const before = budgetStreak(data.entries);
    data.entries.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, amt, cat, date, memo: $('b-memo').value.trim().slice(0, 40) });
    if (!save()) return;
    month = date.slice(0, 7);
    $('b-amt').value = ''; $('b-memo').value = '';
    $('b-amt').dispatchEvent(new Event('input', { bubbles: true }));
    $('b-amt').focus();
    render();
    toast(streakCheer(before, data.entries) || `${cat} ${won(amt)}을 기록했어요.`);
  }
  $('b-save').addEventListener('click', addEntry);
  ['b-amt', 'b-memo'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addEntry(); } }));
  $('b-amt').addEventListener('input', () => { $('b-err').textContent = ''; });

  // ── 달 넘기기 ──
  document.querySelectorAll('.month-nav [data-m]').forEach(b => b.addEventListener('click', () => {
    const [y, m] = month.split('-').map(Number), d = new Date(y, m - 1 + Number(b.dataset.m), 1);
    month = iso(d).slice(0, 7); editingBudget = false; render();
  }));

  // ── 그리기 ──
  function render() {
    const [y, m] = month.split('-').map(Number);
    $('b-month').textContent = `${y}년 ${m}월`;
    const list = data.entries.filter(e => e.date.startsWith(month));
    const sumIn = list.filter(e => e.type === 'in').reduce((s, e) => s + e.amt, 0);
    const sumOut = list.filter(e => e.type === 'out').reduce((s, e) => s + e.amt, 0);
    $('b-in').textContent = won(sumIn);
    $('b-out').textContent = won(sumOut);
    $('b-left').textContent = (sumIn - sumOut < 0 ? '-' : '') + won(Math.abs(sumIn - sumOut));
    $('b-left').classList.toggle('minus', sumIn - sumOut < 0);
    drawBudget(sumOut, y, m);
    drawStreak();
    drawList(list);
    drawBreakdown(list, sumOut);
  }

  // ── 연속 기록 ──
  function drawStreak() {
    const st = budgetStreak(data.entries), box = $('b-streak');
    let head, sub;
    if (st.current) {
      head = `<span class="streak-fire">🔥</span><b>${st.current}일 연속 기록 중</b>`;
      sub = !st.recordedToday ? `오늘 기록하면 ${st.current + 1}일째예요. 놓치지 마세요!`
        : st.next ? `'${st.next[2]}' 배지까지 ${st.next[0] - st.current}일 남았어요` : '모든 배지를 모았어요. 대단해요!';
    } else {
      head = `<span class="streak-fire">🌱</span><b>${data.entries.length ? '연속 기록을 다시 시작해요' : '오늘 첫 기록을 남겨 보세요'}</b>`;
      sub = '매일 한 번만 기록해도 3일이면 첫 배지를 받아요';
    }
    box.innerHTML = `<div class="streak-head">${head}${st.best ? `<span class="streak-best">최고 ${st.best}일</span>` : ''}</div><p class="streak-sub">${sub}</p>
      <div class="badges">${STREAK_BADGES.map(([n, icon, name]) => `<span class="badge-item${st.best >= n ? ' on' : ''}" title="${n}일 연속 기록"><i>${icon}</i><small>${name}</small></span>`).join('')}</div>`;
  }

  function drawBudget(used, y, m) {
    const box = $('b-budget');
    if (editingBudget) {
      box.innerHTML = `<label for="b-budget-in">한 달 예산</label>
        <div class="field"><input id="b-budget-in" inputmode="numeric" value="${data.budget ? data.budget.toLocaleString('ko-KR') : ''}" placeholder="1,500,000"><span>원</span></div>
        <div class="row-btns"><button type="button" class="btn fill" id="b-budget-ok">저장</button><button type="button" class="btn line" id="b-budget-cancel">취소</button></div>`;
      const inp = $('b-budget-in');
      inp.addEventListener('input', () => { const d = inp.value.replace(/[^0-9]/g, ''); inp.value = d ? Number(d).toLocaleString('ko-KR') : ''; });
      inp.focus();
      $('b-budget-ok').addEventListener('click', () => { data.budget = num(inp.value); editingBudget = false; save(); render(); });
      $('b-budget-cancel').addEventListener('click', () => { editingBudget = false; render(); });
      return;
    }
    if (!data.budget) {
      box.innerHTML = '<button type="button" class="btn line wide" id="b-budget-edit">이번 달 예산 정하기</button>';
    } else {
      const ratio = used / data.budget, left = data.budget - used;
      const isNow = month === iso(today).slice(0, 7);
      const daysLeft = new Date(y, m, 0).getDate() - today.getDate() + 1;
      let tip;
      if (left < 0) tip = `예산을 ${won(-left)} 넘었어요.`;
      else if (isNow) tip = `남은 ${daysLeft}일 동안 하루에 약 ${won(left / daysLeft)}씩 쓸 수 있어요.`;
      else tip = `예산에서 ${won(left)}이 남았어요.`;
      box.innerHTML = `<div class="budget-head"><span>한 달 예산 ${won(data.budget)} 중 <b>${Math.round(ratio * 100)}%</b> 썼어요</span><button type="button" class="link" id="b-budget-edit">바꾸기</button></div>
        <div class="bar${left < 0 ? ' over' : ''}"><i style="width:${Math.min(100, ratio * 100)}%"></i></div>
        <p class="budget-tip">${tip}</p>`;
    }
    $('b-budget-edit').addEventListener('click', () => { editingBudget = true; render(); });
  }

  function drawList(list) {
    const ul = $('b-items');
    if (!list.length) {
      ul.innerHTML = `<li class="empty">${month === iso(today).slice(0, 7) ? '이번 달 첫 기록을 남겨 보세요. 위에서 금액과 카테고리만 고르면 돼요.' : '이 달에는 기록이 없어요.'}</li>`;
      return;
    }
    const days = {};
    list.forEach(e => (days[e.date] = days[e.date] || []).push(e));
    ul.innerHTML = Object.keys(days).sort().reverse().map(d => {
      const items = days[d].slice().reverse(), dt = new Date(d + 'T00:00:00');
      const out = items.filter(e => e.type === 'out').reduce((s, e) => s + e.amt, 0);
      return `<li class="day"><span>${dt.getMonth() + 1}월 ${dt.getDate()}일 (${W[dt.getDay()]})</span><span>${out ? '지출 ' + won(out) : ''}</span></li>` +
        items.map(e => `<li class="item">${catIcon(e.cat, 32).replace('cat-ico', 'item-ico')}<div><b>${esc(e.cat)}</b>${e.memo ? `<span>${esc(e.memo)}</span>` : ''}</div>
          <b class="amt ${e.type}">${e.type === 'in' ? '+' : '-'}${won(e.amt)}</b>
          <button type="button" class="del" data-id="${esc(e.id)}" aria-label="${esc(e.cat)} ${won(e.amt)} 기록 지우기">×</button></li>`).join('');
    }).join('');
  }
  $('b-items').addEventListener('click', e => {
    const id = e.target.dataset && e.target.dataset.id;
    if (!id) return;
    const it = data.entries.find(x => x.id === id);
    if (!it || !confirm(`${it.date} ${it.cat} ${won(it.amt)} 기록을 지울까요?`)) return;
    data.entries = data.entries.filter(x => x.id !== id);
    save(); render();
  });

  function drawBreakdown(list, sumOut) {
    const box = $('b-breakdown');
    if (!sumOut) { box.innerHTML = '<p class="empty">지출을 기록하면 어디에 많이 썼는지 보여 드려요.</p>'; return; }
    const by = {};
    list.filter(e => e.type === 'out').forEach(e => { by[e.cat] = (by[e.cat] || 0) + e.amt; });
    const rows = Object.entries(by).sort((a, b) => b[1] - a[1]);
    const [topCat, topAmt] = rows[0];
    box.innerHTML = `<p class="insight"><b>한 줄 정리</b>이번 달은 <strong>${esc(topCat)}</strong>에 가장 많이 썼어요. 전체 지출의 ${Math.round(topAmt / sumOut * 100)}%예요.</p>` +
      rows.map(([c, a]) => `<div class="cat-row"><div class="cat-top"><span>${catIcon(c)}${esc(c)}</span><span>${won(a)} · ${Math.round(a / sumOut * 100)}%</span></div><div class="bar"><i style="width:${a / topAmt * 100}%"></i></div></div>`).join('');
  }

  // ── 백업 ──
  function download(name, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  const stamp = () => iso(new Date()).replace(/-/g, '');
  $('b-export').addEventListener('click', () => {
    download(`돈셈-가계부-백업-${stamp()}.json`, JSON.stringify({ app: 'donsem', version: 1, ...data }, null, 2), 'application/json');
    toast('백업 파일을 저장했어요. 안전한 곳에 보관하세요.');
  });
  $('b-csv').addEventListener('click', () => {
    const q = s => `"${String(s).replace(/"/g, '""')}"`;
    const lines = [['날짜', '구분', '카테고리', '금액', '메모'].join(',')].concat(
      data.entries.slice().sort((a, b) => a.date.localeCompare(b.date)).map(e => [e.date, e.type === 'in' ? '수입' : '지출', q(e.cat), e.amt, q(e.memo || '')].join(',')));
    download(`돈셈-가계부-${stamp()}.csv`, '﻿' + lines.join('\n'), 'text/csv'); // 엑셀에서 한글이 깨지지 않게 BOM을 붙여요
  });
  $('b-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.entries)) throw new Error('형식');
      const have = new Set(data.entries.map(x => x.id));
      const fresh = d.entries.filter(x => x && x.id && !have.has(x.id) && (x.type === 'in' || x.type === 'out') && Number(x.amt) > 0 && /^\d{4}-\d{2}-\d{2}$/.test(x.date))
        .map(x => ({ id: String(x.id), type: x.type, amt: Number(x.amt), cat: String(x.cat || '기타').slice(0, 20), date: x.date, memo: String(x.memo || '').slice(0, 40) }));
      if (!confirm(`백업 파일에서 새 기록 ${fresh.length}개를 찾았어요. 지금 가계부에 합칠까요?`)) return;
      data.entries = data.entries.concat(fresh);
      if (!data.budget && d.budget) data.budget = Number(d.budget) || 0;
      save(); render();
      toast(`기록 ${fresh.length}개를 불러왔어요.`);
    } catch (err) {
      toast('돈셈 가계부 백업 파일이 아니에요. 파일을 다시 확인해 주세요.');
    }
  });
  $('b-reset').addEventListener('click', () => {
    if (!data.entries.length && !data.budget) return toast('지울 기록이 없어요.');
    if (!confirm(`가계부 기록 ${data.entries.length}개와 예산을 모두 지울까요? 지우면 되돌릴 수 없어요. 먼저 백업 파일을 저장해 두는 걸 추천해요.`)) return;
    data = { entries: [], budget: 0 };
    save(); render();
    toast('가계부를 모두 지웠어요.');
  });

  drawCats();
  render();
})();
