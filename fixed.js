// 돈셈 고정지출: 기록은 이 기기의 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
(() => {
  const KEY = 'donsem:fixed', BUDGET_KEY = 'donsem:budget';
  const CATS = ['구독', '통신', '보험', '주거·관리비', '대출 상환', '교육', '기타'];
  const TO_BUDGET_CAT = { '구독': '문화·여가', '통신': '주거·통신', '주거·관리비': '주거·통신' }; // 가계부 카테고리로 옮길 때
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const W = '일월화수목금토';
  // 받침에 맞는 조사 (넷플릭스를 / 보험료를 / 월세를 …, 받침이 있으면 을)
  const eul = w => { const c = String(w).charCodeAt(String(w).length - 1); return c >= 0xac00 && c <= 0xd7a3 ? ((c - 0xac00) % 28 ? '을' : '를') : '을(를)'; };
  const t0 = new Date(), today = new Date(t0.getFullYear(), t0.getMonth(), t0.getDate());
  const thisMonth = iso(today).slice(0, 7);

  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.items)) return { items: d.items };
    } catch (e) { /* 저장된 게 없거나 망가진 경우 */ }
    return { items: [] };
  }
  let data = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { toast('이 브라우저에서는 저장할 수 없어요. 개인정보 보호 모드인지 확인해 주세요.'); return false; }
  }
  const monthly = x => (x.cycle === 'year' ? x.amt / 12 : x.amt);
  // 이 날짜가 있는 달에서 결제일 (31일처럼 없는 날은 그 달 마지막 날로)
  const dayIn = (y, m, d) => new Date(y, m, Math.min(d, new Date(y, m + 1, 0).getDate()));
  function nextDate(x) {
    if (x.cycle === 'year') {
      let d = dayIn(today.getFullYear(), x.month - 1, x.day);
      if (d < today) d = dayIn(today.getFullYear() + 1, x.month - 1, x.day);
      return d;
    }
    let d = dayIn(today.getFullYear(), today.getMonth(), x.day);
    if (d < today) d = dayIn(today.getFullYear(), today.getMonth() + 1, x.day);
    return d;
  }
  // 이번 달에 결제일이 있는지, 있다면 언제인지
  function dateThisMonth(x) {
    if (x.cycle === 'year' && x.month - 1 !== today.getMonth()) return null;
    return dayIn(today.getFullYear(), today.getMonth(), x.day);
  }

  // ── 추가하기 ──
  let cycle = 'month', cat = CATS[0], editing = null;
  function drawCats() {
    $('f-cats').innerHTML = CATS.map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('');
  }
  $('f-cats').addEventListener('click', e => { const c = e.target.dataset && e.target.dataset.cat; if (c) { cat = c; drawCats(); } });
  $('f-cycle').addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    cycle = v;
    $('f-month-wrap').hidden = cycle !== 'year';
  });
  $('f-day').innerHTML = Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}"${i + 1 === today.getDate() ? ' selected' : ''}>${i + 1}일</option>`).join('');
  $('f-month').innerHTML = Array.from({ length: 12 }, (_, i) => `<option value="${i + 1}"${i === today.getMonth() ? ' selected' : ''}>${i + 1}월</option>`).join('');

  function addItem() {
    const amt = num($('f-amt').value), name = $('f-name').value.trim().slice(0, 30), err = $('f-err');
    if (!name) { err.textContent = '이름을 넣어 주세요. 예: 넷플릭스'; $('f-name').focus(); return; }
    if (!amt) { err.textContent = '금액을 넣어 주세요.'; $('f-amt').focus(); return; }
    if (amt > MAX_REC) { err.textContent = '1,000억 원보다 큰 금액은 넣을 수 없어요. 숫자를 다시 확인해 주세요.'; $('f-amt').focus(); return; }
    err.textContent = '';
    const item = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, cat, amt, cycle, day: Number($('f-day').value) };
    if (cycle === 'year') item.month = Number($('f-month').value);
    data.items.push(item);
    if (!save()) return;
    $('f-name').value = ''; $('f-amt').value = '';
    $('f-amt').dispatchEvent(new Event('input', { bubbles: true }));
    render();
    toast(`${name}${eul(name)} 고정지출에 추가했어요.`);
  }
  $('f-save').addEventListener('click', addItem);
  ['f-name', 'f-amt'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }));
  ['f-name', 'f-amt'].forEach(id => $(id).addEventListener('input', () => { $('f-err').textContent = ''; }));

  // ── 그리기 ──
  function render() {
    const perMonth = data.items.reduce((s, x) => s + monthly(x), 0);
    setRoll($('f-month-total'), won(perMonth));
    $('f-year-total').textContent = won(perMonth * 12);
    $('f-count').textContent = `${data.items.length}개`;
    drawInsight(perMonth);
    drawUpcoming();
    drawList();
    drawSync();
    drawCal();
  }

  function budgetIncomeThisMonth() {
    try {
      const b = JSON.parse(localStorage.getItem(BUDGET_KEY));
      return (b && Array.isArray(b.entries) ? b.entries : []).filter(e => e.type === 'in' && String(e.date).startsWith(thisMonth)).reduce((s, e) => s + Number(e.amt || 0), 0);
    } catch (e) { return 0; }
  }
  function drawInsight(perMonth) {
    const box = $('f-insight');
    if (!data.items.length) { box.innerHTML = ''; return; }
    const parts = [], sub = data.items.filter(x => x.cat === '구독').reduce((s, x) => s + monthly(x), 0), income = budgetIncomeThisMonth();
    if (sub) parts.push(`구독료만 1년에 <strong>${won(sub * 12)}</strong>이에요. 안 쓰는 구독이 있는지 한번 살펴보세요.`);
    if (income) parts.push(`고정지출이 이번 달 수입의 ${Math.round(perMonth / income * 100)}%예요.`);
    else parts.push(`하루로 치면 약 ${won(perMonth * 12 / 365)}씩 나가는 셈이에요.`);
    box.innerHTML = `<p class="insight"><b>한 줄 정리</b>${parts.join(' ')}</p>`;
  }

  function drawUpcoming() {
    const ul = $('f-upcoming');
    if (!data.items.length) { ul.innerHTML = '<li class="empty">고정지출을 추가하면 다가오는 결제일을 순서대로 보여 드려요.</li>'; return; }
    const list = data.items.map(x => ({ x, d: nextDate(x) })).sort((a, b) => a.d - b.d).slice(0, 5);
    const left = data.items.map(x => ({ x, d: dateThisMonth(x) })).filter(o => o.d && o.d >= today).reduce((s, o) => s + o.x.amt, 0);
    ul.innerHTML = `<li class="day"><span>이번 달 남은 고정지출</span><span>${won(left)}</span></li>` + list.map(({ x, d }) => {
      const n = Math.round((d - today) / 86400000);
      return `<li class="item"><span class="dday${n <= 3 ? ' soon' : ''}">${n === 0 ? '오늘' : 'D-' + n}</span><div><b>${esc(x.name)}</b><span>${d.getMonth() + 1}월 ${d.getDate()}일 (${W[d.getDay()]})</span></div><b class="amt">${won(x.amt)}</b></li>`;
    }).join('');
  }

  function drawList() {
    const ul = $('f-items');
    if (!data.items.length) {
      ul.innerHTML = '<li class="empty">넷플릭스, 휴대폰 요금, 보험료, 월세처럼 매달 나가는 돈을 하나씩 추가해 보세요.</li>';
      return;
    }
    const groups = {};
    data.items.forEach(x => (groups[x.cat] = groups[x.cat] || []).push(x));
    ul.innerHTML = CATS.filter(c => groups[c]).map(c =>
      `<li class="day"><span>${esc(c)}</span><span>월 ${won(groups[c].reduce((s, x) => s + monthly(x), 0))}</span></li>` +
      groups[c].map(x => {
        const when = x.cycle === 'year' ? `매년 ${x.month}월 ${x.day}일` : `매달 ${x.day}일`;
        return x.id === editing
          ? `<li class="item editing"><div><b>${esc(x.name)}</b><span>${when}</span></div>
              <div class="field mini"><input id="f-edit" inputmode="numeric" value="${x.amt.toLocaleString('ko-KR')}" aria-label="${esc(x.name)} 금액"><span>원</span></div>
              <button type="button" class="link" data-ok="${esc(x.id)}">저장</button></li>`
          : `<li class="item"><div><b>${esc(x.name)}</b><span>${when}</span></div>
              <button type="button" class="amt-btn" data-edit="${esc(x.id)}" aria-label="${esc(x.name)} 금액 고치기">${won(x.amt)}</button>
              <button type="button" class="del" data-id="${esc(x.id)}" aria-label="${esc(x.name)} 지우기">×</button></li>`;
      }).join('')).join('');
    const ed = $('f-edit');
    if (ed) {
      ed.focus(); ed.select();
      ed.addEventListener('input', () => { const d = ed.value.replace(/[^0-9]/g, ''); ed.value = d ? Number(d).toLocaleString('ko-KR') : ''; });
      ed.addEventListener('keydown', e => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { editing = null; render(); } });
    }
  }
  // ── 내 캘린더에 넣기: 서버 없이 캘린더 파일(.ics)을 만들거나, 구글 캘린더 '일정 만들기' 화면을 열어요 ──
  const ymd = d => iso(d).replace(/-/g, '');
  // 29~31일처럼 없는 달이 있는 날은, 그 달 마지막 날로 (위 dayIn과 같은 규칙)
  const rrule = x => x.cycle === 'year' ? `FREQ=YEARLY;BYMONTH=${x.month};BYMONTHDAY=${Math.min(x.day, [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][x.month - 1])}`
    : x.day > 28 ? `FREQ=MONTHLY;BYMONTHDAY=${Array.from({ length: x.day - 27 }, (_, i) => 28 + i).join(',')};BYSETPOS=-1` : `FREQ=MONTHLY;BYMONTHDAY=${x.day}`;
  const icsText = t => String(t).replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n');
  const title = x => `${x.name} 결제 ${won(x.amt)}`;
  const memo = x => `돈셈 고정지출 · ${x.cycle === 'year' ? `매년 ${x.month}월 ${x.day}일` : `매달 ${x.day}일`}\nhttps://doncalculator.com/fixed/`;
  function drawCal() {
    const has = data.items.length;
    $('f-ics').disabled = !has;
    $('f-gcal').innerHTML = has ? data.items.map(x => {
      const d = nextDate(x), end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1);
      const q = new URLSearchParams({ action: 'TEMPLATE', text: title(x), dates: `${ymd(d)}/${ymd(end)}`, recur: `RRULE:${rrule(x)}`, details: memo(x) });
      return `<a class="gcal" href="https://calendar.google.com/calendar/render?${q}" target="_blank" rel="noopener">${esc(x.name)} +</a>`;
    }).join('') : '<p class="empty">고정지출을 추가하면 여기서 캘린더에 넣을 수 있어요.</p>';
  }
  $('f-ics').addEventListener('click', () => {
    if (!data.items.length) return;
    const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
    const ev = data.items.map(x => [
      'BEGIN:VEVENT', `UID:${x.id}@doncalculator.com`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${ymd(nextDate(x))}`, `RRULE:${rrule(x)}`,
      `SUMMARY:${icsText(title(x))}`, `DESCRIPTION:${icsText(memo(x))}`, 'URL:https://doncalculator.com/fixed/', 'TRANSP:TRANSPARENT',
      'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsText(`내일 ${x.name} ${won(x.amt)}이 나가요`)}`, 'TRIGGER:-PT15H', 'END:VALARM', 'END:VEVENT',
    ].join('\r\n')).join('\r\n');
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//doncalculator.com//donsem fixed//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:돈셈 고정지출', ev, 'END:VCALENDAR'].join('\r\n') + '\r\n';
    // 아이폰·아이패드는 파일을 바로 열어야 '모두 추가' 화면이 떠요. 그 밖에는 파일로 저장해요
    if (/iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
      location.href = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(ics);
      return;
    }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    a.download = '돈셈-결제일.ics';
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    toast('캘린더 파일을 저장했어요. 파일을 열면 캘린더에 들어가요.');
  });

  function commitEdit() {
    const it = data.items.find(x => x.id === editing), v = num($('f-edit').value);
    editing = null;
    if (it && v) { it.amt = v; save(); toast(`${it.name} 금액을 ${won(v)}으로 고쳤어요.`); }
    render();
  }
  $('f-items').addEventListener('click', e => {
    const d = e.target.dataset || {};
    if (d.edit) { editing = d.edit; render(); }
    else if (d.ok) commitEdit();
    else if (d.id) {
      const it = data.items.find(x => x.id === d.id);
      if (!it || !confirm(`${it.name} (${won(it.amt)})을 고정지출에서 지울까요?`)) return;
      data.items = data.items.filter(x => x.id !== d.id);
      save(); render();
    }
  });

  // ── 가계부로 옮기기: 이번 달 결제일이 지난 것만, 한 번씩만 ──
  function pending() {
    let entries = [];
    try { const b = JSON.parse(localStorage.getItem(BUDGET_KEY)); entries = b && Array.isArray(b.entries) ? b.entries : []; } catch (e) { entries = []; }
    const have = new Set(entries.map(e => e.id));
    return data.items.map(x => ({ x, d: dateThisMonth(x) })).filter(o => o.d && o.d <= today && !have.has(`fx-${o.x.id}-${thisMonth}`));
  }
  function drawSync() {
    const box = $('f-sync'), list = pending();
    if (!data.items.length) { box.innerHTML = ''; return; }
    box.innerHTML = list.length
      ? `<p class="sub small">이번 달 결제일이 지난 고정지출 ${list.length}개(${won(list.reduce((s, o) => s + o.x.amt, 0))})가 아직 가계부에 없어요.</p><button type="button" class="btn fill wide" id="f-sync-go">가계부에 한 번에 기록하기</button>`
      : '<p class="sub small">이번 달 결제일이 지난 고정지출은 모두 가계부에 기록돼 있어요. ✓</p>';
    const go = $('f-sync-go');
    if (go) go.addEventListener('click', () => {
      let b;
      try { b = JSON.parse(localStorage.getItem(BUDGET_KEY)); } catch (e) { b = null; }
      if (!b || !Array.isArray(b.entries)) b = { entries: [], budget: (b && b.budget) || 0 };
      const add = pending().map(({ x, d }) => ({ id: `fx-${x.id}-${thisMonth}`, type: 'out', amt: x.amt, cat: TO_BUDGET_CAT[x.cat] || '기타', date: iso(d), memo: `${x.name} (고정지출)`.slice(0, 40) }));
      b.entries = b.entries.concat(add);
      try { localStorage.setItem(BUDGET_KEY, JSON.stringify(b)); } catch (e) { return toast('가계부에 저장하지 못했어요.'); }
      render();
      toast(`가계부에 고정지출 ${add.length}개를 기록했어요.`);
    });
  }

  // ── 백업 ──
  function download(name, text, mime) {
    const url = URL.createObjectURL(new Blob([text], { type: mime }));
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  $('f-export').addEventListener('click', () => {
    download(`돈셈-고정지출-백업-${iso(new Date()).replace(/-/g, '')}.json`, JSON.stringify({ app: 'donsem-fixed', version: 1, ...data }, null, 2), 'application/json');
    toast('백업 파일을 저장했어요. 안전한 곳에 보관하세요.');
  });
  $('f-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    try {
      const d = JSON.parse(await file.text());
      if (!d || !Array.isArray(d.items)) throw new Error('형식');
      const have = new Set(data.items.map(x => x.id));
      const fresh = d.items.filter(x => x && x.id && !have.has(x.id) && Number(x.amt) > 0 && (x.cycle === 'month' || x.cycle === 'year') && x.day >= 1 && x.day <= 31)
        .map(x => {
          const it = { id: String(x.id), name: String(x.name || '고정지출').slice(0, 30), cat: CATS.includes(x.cat) ? x.cat : '기타', amt: Number(x.amt), cycle: x.cycle, day: Number(x.day) };
          if (x.cycle === 'year') it.month = Math.min(12, Math.max(1, Number(x.month) || 1));
          return it;
        });
      if (!confirm(`백업 파일에서 새 항목 ${fresh.length}개를 찾았어요. 지금 목록에 합칠까요?`)) return;
      data.items = data.items.concat(fresh);
      save(); render();
      toast(`항목 ${fresh.length}개를 불러왔어요.`);
    } catch (err) {
      toast('돈셈 고정지출 백업 파일이 아니에요. 파일을 다시 확인해 주세요.');
    }
  });
  $('f-reset').addEventListener('click', () => {
    if (!data.items.length) return toast('지울 기록이 없어요.');
    if (!confirm(`고정지출 ${data.items.length}개를 모두 지울까요? 지우면 되돌릴 수 없어요. 가계부에 이미 기록된 내역은 그대로 남아요.`)) return;
    data = { items: [] };
    try { localStorage.removeItem(KEY); } catch (e) { /* 저장이 막힌 브라우저 */ }
    render();
    toast('고정지출 목록을 모두 지웠어요.');
  });

  drawCats();
  render();
})();
