// 돈 달력 페이지: 다가오는 일정 / 달마다 보기, 일정마다 '내 달력에 넣기'
(() => {
  const list = $id('mc-list'), chips = $id('mc-chips');
  if (!list || typeof MONEY_CAL === 'undefined') return;
  function $id(id) { return document.getElementById(id); }
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const W = '일월화수목금토', TAG = { '세금': 'tax', '연말정산': 'yet', '월급': 'pay', '지원금': 'aid' };
  const t = new Date(), thisM = `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}`;
  // 고를 수 있는 달: 이번 달부터 일정이 있는 달
  const months = [...new Set(MONEY_CAL.map(e => e.d.slice(0, 7)))].filter(m => m >= thisM).sort();
  let sel = 'up';
  const label = m => { const [y, mm] = m.split('-').map(Number); return (y !== t.getFullYear() ? `${String(y).slice(2)}년 ` : '') + `${mm}월`; };
  function dateText(e) {
    if (e.when) return e.when;
    const f = d => { const [y, m, dd] = d.split('-').map(Number); return `${m}월 ${dd}일 (${W[new Date(y, m - 1, dd).getDay()]})`; };
    return e.from ? `${f(e.d)}까지` : f(e.d);
  }
  function draw() {
    chips.innerHTML = [['up', '다가오는 일정']].concat(months.map(m => [m, label(m)])).map(([v, l]) => `<button type="button" role="tab" aria-selected="${v === sel}" class="${v === sel ? 'on' : ''}" data-v="${v}">${l}</button>`).join('');
    const rows = sel === 'up' ? mcUpcoming() : MONEY_CAL.filter(e => e.d.startsWith(sel)).sort((a, b) => a.d.localeCompare(b.d));
    if (!rows.length) { list.innerHTML = '<li class="empty">이 달에는 정리된 일정이 없어요.</li>'; return; }
    list.innerHTML = rows.map(e => {
      const n = mcDays(e.d), past = n < 0, i = MONEY_CAL.indexOf(e);
      const badge = past ? '지났어요' : mcBadge(e), cls = past ? 'past' : e.soft ? 'soft' : n <= 7 ? 'near' : '';
      return `<li class="mc-ev${past ? ' is-past' : ''}"><div class="mc-dd"><em class="${cls}">${badge}</em><b>${esc(dateText(e))}</b></div>
        <div class="mc-b"><span class="mc-tag ${TAG[e.tag] || ''}">${esc(e.tag)}</span><h3>${esc(e.t)}</h3><p>${esc(e.who)}</p>
        <div class="mc-acts">${e.go ? `<a class="go" href="${e.go[0]}">${esc(e.go[1])} ›</a>` : ''}${past ? '' : `<button type="button" data-i="${i}">📅 내 달력에 넣기</button>`}</div></div></li>`;
    }).join('');
  }
  chips.addEventListener('click', e => { const b = e.target.closest('[data-v]'); if (b) { sel = b.dataset.v; draw(); } });
  list.addEventListener('click', e => { const b = e.target.closest('[data-i]'); if (b) { const ev = MONEY_CAL[+b.dataset.i]; mcIcs([ev], `돈셈-${ev.t}.ics`); } });
  $id('mc-all').addEventListener('click', () => { const up = mcUpcoming(); if (!up.length) return toast('다가오는 일정이 없어요.'); mcIcs(up, '돈셈-돈달력.ics'); });
  $id('mc-chg').innerHTML = MONEY_CHANGES.map(c => `<div class="mc-c"><b>${esc(c.t)}</b><p class="mc-ab">${c.a === c.b ? `<i>${esc(c.b)}</i> 그대로` : `<s>${esc(c.a)}</s> → <i>${esc(c.b)}</i>`}</p><p>${esc(c.note)}</p><small>출처: ${esc(c.src)}</small>${c.go ? `<a href="${c.go[0]}">${esc(c.go[1])} ›</a>` : ''}</div>`).join('');
  draw();
})();
