/* 돈셈 Pro (무료 체험): 가계부 기록으로 「앞으로의 돈 · 반복 결제 · 카드 실적 · 한 장 결산」을 알려 줘요.
   모든 계산은 이 기기 안에서만 해요. 기록은 서버로 보내지 않아요. */
(() => {
  const box = document.getElementById('pro-body');
  if (!box) return;
  const $ = id => document.getElementById(id);
  const rd = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } };
  const W = n => Math.round(n).toLocaleString('ko-KR') + '원';
  const E = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = s => Number(String(s || '').replace(/[^\d]/g, '')) || 0;
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const md = d => `${d.getMonth() + 1}/${d.getDate()}`;
  const norm = s => String(s || '').toLowerCase().replace(/\s*\(.*\)$/, '').replace(/[\s·.,_-]/g, '');
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const PK = 'donsem:pro';
  const pro = () => Object.assign({ bal: 0, salary: 0, cards: [] }, rd(PK) || {});
  const budget = () => { const b = rd('donsem:budget'); return b && Array.isArray(b.entries) ? b : { entries: [] }; };
  const fixed = () => { const f = rd('donsem:fixed'); return f && Array.isArray(f.items) ? f.items.filter(x => x && +x.amt > 0 && +x.day > 0) : []; };
  const today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
  const real = es => es.filter(e => e && !String(e.id).startsWith('fx-')); // 고정지출로 자동 들어간 기록은 빼고
  // 쓰는 사람 수만 세요 (이름·기록은 안 보내요). 서버가 아직 모르는 이름이면 조용히 넘어가요
  const API = 'https://donsem-counter.hjjung330.workers.dev';
  const ping = v => { try { const k = 'donsem:pro-ping-' + v, d = ymd(new Date()); if (localStorage.getItem(k) === d) return; localStorage.setItem(k, d); fetch(API, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ k: 'pro:use', v }) }).catch(() => {}); } catch (e) { /* 괜찮아요 */ } };

  const TABS = [
    ['an', '소비 분석', '<path d="M4 20h16M7 16v-5M12 16V6M17 16v-8"/>'],
    ['fc', '앞으로의 돈', '<path d="M4 19V5M4 19h16M7 14l4-4 3 3 5-6"/>'],
    ['rp', '반복 결제', '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>'],
    ['cd', '카드 실적', '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>'],
    ['ye', '연말정산', '<path d="M4 7l8-4 8 4-8 4zM4 12l8 4 8-4M4 17l8 4 8-4"/>'],
    ['rc', '한 장 결산', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'],
    ['hb', '돈 습관', '<path d="M12 3c1 3 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 0-8z"/>'],
  ];
  let tab = 'an';
  try { const t = sessionStorage.getItem('donsem:pro-tab'); if (TABS.some(x => x[0] === t)) tab = t; } catch (e) { /* 괜찮아요 */ }
  const seg = $('pro-seg');
  seg.innerHTML = TABS.map(([k, l, p]) => `<button type="button" role="tab" data-k="${k}" aria-selected="${k === tab}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${p}</svg><span>${l}</span></button>`).join('');
  seg.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; tab = b.dataset.k; try { sessionStorage.setItem('donsem:pro-tab', tab); } catch (er) { /* 괜찮아요 */ } draw(); });

  // ── 1. 앞으로의 돈: 지금 잔액 + 월급 − 고정지출 − 평소 지출로 90일 잔액을 미리 그려요 ──
  function payDates(p, from, to) {
    if (!p || !(p.day >= 1 && p.day <= 32)) return [];
    const out = [];
    for (let k = -1; k < 5; k++) {
      const y = from.getFullYear(), m = from.getMonth() + k, last = new Date(y, m + 1, 0).getDate();
      const d = new Date(y, m, p.day === 32 ? last : Math.min(p.day, last));
      if (p.early !== false) while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
      if (d > from && d <= to) out.push(ymd(d));
    }
    return out;
  }
  function forecast() {
    const P = pro(), b = budget(), es = real(b.entries), t0 = today(), end = new Date(t0); end.setDate(end.getDate() + 90);
    const since = new Date(t0); since.setDate(since.getDate() - 30);
    const fxNames = new Set(fixed().map(x => norm(x.name)));
    const recent = es.filter(e => e.type === 'out' && e.date >= ymd(since) && e.date <= ymd(t0) && !(e.cat === '구독' && fxNames.has(norm(e.memo))));
    // 기록을 시작한 지 30일이 안 됐으면 시작한 날부터 나눠요 (최소 7일)
    const first = es.filter(e => e.type === 'out' && e.date).reduce((m, e) => (e.date < m ? e.date : m), ymd(t0));
    const span = Math.min(30, Math.max(7, Math.round((t0 - new Date(first)) / 864e5) + 1));
    const daily = recent.reduce((s, e) => s + (+e.amt || 0), 0) / span;
    const ins = es.filter(e => e.type === 'in' && e.date >= ymd(new Date(t0.getFullYear(), t0.getMonth() - 2, 1)) && e.date < ymd(new Date(t0.getFullYear(), t0.getMonth(), 1)));
    const salaryGuess = Math.round(ins.reduce((s, e) => s + (+e.amt || 0), 0) / 2 / 1000) * 1000;
    const salary = P.salary || salaryGuess;
    const pays = new Set(payDates(b.payday, t0, end));
    const fx = fixed(), pts = [], events = [];
    let bal = +P.bal || 0, low = { v: bal, d: ymd(t0) }, short = null, beforePay = null;
    for (let i = 1; i <= 90; i++) {
      const d = new Date(t0); d.setDate(d.getDate() + i);
      const key = ymd(d), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      bal -= daily;
      fx.forEach(x => {
        if (x.cycle === 'year' && +x.month !== d.getMonth() + 1) return;
        if (Math.min(+x.day, last) === d.getDate()) { bal -= +x.amt; events.push({ d: key, name: x.name || x.cat, amt: +x.amt }); }
      });
      if (bal < low.v) low = { v: bal, d: key }; // 월급이 들어오기 전 잔액으로 가장 적은 날을 찾아요
      if (pays.has(key)) { if (beforePay === null) beforePay = { v: bal, d: key }; if (salary) bal += salary; events.push({ d: key, name: '월급', amt: -salary, pay: true }); }
      if (bal < 0 && !short) short = key;
      pts.push(bal);
    }
    return { P, b, daily, salary, salaryGuess, pts, low, short, beforePay, events, t0, start: +P.bal || 0 };
  }
  function chart(pts, start) {
    const w = 320, h = 120, all = [start].concat(pts), max = Math.max(...all, 1), min = Math.min(...all, 0), span = max - min || 1;
    const x = i => (i / (all.length - 1)) * w, y = v => h - 8 - ((v - min) / span) * (h - 16);
    const path = all.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const zero = min < 0 ? `<line x1="0" x2="${w}" y1="${y(0)}" y2="${y(0)}" class="pro-zero"/>` : '';
    return `<svg viewBox="0 0 ${w} ${h}" class="pro-chart" preserveAspectRatio="none" aria-hidden="true"><defs><linearGradient id="pro-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7040A1" stop-opacity=".28"/><stop offset="1" stop-color="#7040A1" stop-opacity="0"/></linearGradient></defs>${zero}<path d="${path} L${w} ${h} L0 ${h}Z" fill="url(#pro-g)"/><path d="${path}" class="pro-line"/></svg>`;
  }
  function drawFc() {
    const f = forecast(), P = f.P;
    const needPay = !f.b.payday;
    const head = `<div class="pro-in2"><label>지금 통장 잔액<input id="pro-bal" inputmode="numeric" value="${P.bal ? (+P.bal).toLocaleString('ko-KR') : ''}" placeholder="예: 1,200,000"></label><label>한 달 월급 (세후)<input id="pro-sal" inputmode="numeric" value="${P.salary ? (+P.salary).toLocaleString('ko-KR') : ''}" placeholder="${f.salaryGuess ? '기록상 ' + f.salaryGuess.toLocaleString('ko-KR') : '예: 2,600,000'}"></label></div>`;
    if (!P.bal) { box.innerHTML = head + `<p class="pro-empty">지금 통장 잔액을 넣으면, 월급·고정지출·평소 쓰는 돈으로 <b>앞으로 90일 잔액</b>을 미리 그려 드려요.</p>` + example('fc'); bindFc(); return; }
    const pay = f.beforePay, warn = f.short ? (() => { const d = new Date(f.short), a = new Date(d); a.setDate(a.getDate() - 3); return `<div class="pro-alert">⚠ <b>${md(d)}</b>쯤 잔액이 모자라요. ${md(a)}까지 ${W(-f.low.v)} 정도를 마련해 두세요.</div>`; })() : `<div class="pro-ok">✓ 앞으로 90일 동안 잔액이 모자라는 날은 없어요.</div>`;
    const up = f.events.filter(e => !e.pay).slice(0, 6);
    box.innerHTML = head + budgetWarn(f) + `<div class="pro-panel"><div class="pro-kpis"><div><span>${pay ? `월급 들어오기 직전 (${md(new Date(pay.d))})` : '30일 뒤'}</span><b>${W(pay ? pay.v : f.pts[29])}</b></div><div><span>가장 적을 때 (${md(new Date(f.low.d))})</span><b class="${f.low.v < 0 ? 'neg' : ''}">${W(f.low.v)}</b></div></div>${chart(f.pts, f.start)}<p class="pro-cap">오늘 → 90일 뒤 · 평소 지출 하루 약 ${W(f.daily)} · 월급 ${f.salary ? W(f.salary) : '미입력'}</p></div>` + warn +
      (needPay ? `<p class="pro-note">💡 캘린더에서 월급날을 정하면 월급 들어오는 날도 반영돼요.</p>` : '') +
      `<h3 class="pro-h">다가오는 고정 지출</h3>` + (up.length ? `<ul class="pro-list">${up.map(e => `<li><span><b>${E(e.name)}</b><small>${md(new Date(e.d))}</small></span><em>−${W(e.amt)}</em></li>`).join('')}</ul>` : `<p class="pro-empty">고정지출 탭에 월세·통신비·구독을 적으면 날짜에 맞춰 빠져요.</p>`);
    bindFc();
  }
  // 예산 초과 예상: 이번 달 지금까지 쓴 돈 + 남은 날 평소 지출 + 아직 안 나간 고정지출
  function budgetWarn(f) {
    const b = f.b, B = +b.budget || 0; if (!B) return '';
    const t0 = f.t0, ym = ymd(t0).slice(0, 7), last = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate(), left = last - t0.getDate();
    const es = typeof withFixed === 'function' ? withFixed(b.entries) : b.entries;
    const spent = es.filter(e => e && e.type === 'out' && e.date.startsWith(ym)).reduce((s, e) => s + (+e.amt || 0), 0);
    const fxLeft = fixed().filter(x => (x.cycle !== 'year' || +x.month === t0.getMonth() + 1) && Math.min(+x.day, last) > t0.getDate()).reduce((s, x) => s + (+x.amt || 0), 0);
    const proj = spent + f.daily * left + fxLeft, over = proj - B;
    const room = B - spent - fxLeft;
    if (over > 0 && room <= 0) return `<div class="pro-alert">⚠ 이번 달 예산 ${W(B)}을 이미 다 썼어요 (남은 고정지출 포함 ${W(-room)} 초과). 남은 ${left}일은 꼭 필요한 데만 써요.</div>`;
    return over > 0
      ? `<div class="pro-alert">⚠ 이대로면 이번 달 예산을 <b>${W(over)}</b> 넘을 것 같아요. 남은 ${left}일 동안 하루 <b>${W(room / Math.max(1, left))}</b> 안에서 쓰면 지킬 수 있어요.</div>`
      : `<div class="pro-ok">✓ 이번 달 예산 ${W(B)} 중 월말에 약 <b>${W(-over)}</b>이 남을 것 같아요.</div>`;
  }
  function bindFc() {
    [['pro-bal', 'bal'], ['pro-sal', 'salary']].forEach(([id, k]) => { const el = $(id); if (!el) return; el.addEventListener('change', () => { const P = pro(); P[k] = num(el.value); wr(PK, P); drawFc(); }); el.addEventListener('input', () => { const n = num(el.value); el.value = n ? n.toLocaleString('ko-KR') : ''; }); });
  }

  // ── 2. 반복 결제 발견: 두 달 넘게 비슷한 금액·날짜로 나간 지출을 찾아 고정지출로 넣게 해요 ──
  function findRecurring() {
    const es = real(budget().entries), t0 = today(), since = ymd(new Date(t0.getFullYear(), t0.getMonth() - 6, 1));
    const fxN = new Set(fixed().map(x => norm(x.name)));
    const g = {};
    es.forEach(e => {
      if (e.type !== 'out' || e.date < since || /할부/.test(e.memo || '')) return;
      const name = String(e.memo || '').replace(/\s*\(.*\)$/, '').trim(); if (!name) return;
      const k = norm(name); if (!k || fxN.has(k)) return;
      (g[k] = g[k] || { name, cat: e.cat, rows: [] }).rows.push(e);
    });
    return Object.values(g).map(x => {
      const months = new Set(x.rows.map(r => r.date.slice(0, 7)));
      const amts = x.rows.map(r => +r.amt).sort((a, b) => a - b), med = amts[Math.floor(amts.length / 2)];
      const same = x.rows.filter(r => Math.abs(+r.amt - med) <= med * 0.15);
      const days = same.map(r => +r.date.slice(8)).sort((a, b) => a - b), day = days[Math.floor(days.length / 2)];
      const near = same.filter(r => Math.abs(+r.date.slice(8) - day) <= 5);
      const nm = new Set(near.map(r => r.date.slice(0, 7))).size;
      return { name: x.name, cat: x.cat, amt: med, day, months: nm, per: x.rows.length / Math.max(1, months.size) };
    }).filter(x => x.months >= 2 && x.per <= 2).sort((a, b) => b.amt - a.amt);
  }
  function drawRp() {
    const list = findRecurring(), fx = fixed(), monthFx = fx.reduce((s, x) => s + (x.cycle === 'year' ? +x.amt / 12 : +x.amt), 0);
    const cand = list.reduce((s, x) => s + x.amt, 0);
    box.innerHTML = `<div class="pro-panel"><div class="pro-kpis"><div><span>등록된 고정지출 (월)</span><b>${W(monthFx)}</b></div><div><span>새로 찾은 반복 결제 (월)</span><b>${W(cand)}</b></div></div><p class="pro-cap">합치면 1년에 <b>${W((monthFx + cand) * 12)}</b>이 자동으로 나가요.</p></div>` +
      `<h3 class="pro-h">이렇게 찾아 드려요</h3>` + (list.length ? `<ul class="pro-list">${list.map((x, i) => `<li><span><b>${E(x.name)}</b><small>매달 ${x.day}일쯤 · ${x.months}달 연속</small></span><em>${W(x.amt)}</em><button type="button" class="pro-mini" data-i="${i}">고정지출로</button></li>`).join('')}</ul>` : `<p class="pro-empty">아직 반복 결제를 못 찾았어요. 같은 이름으로 두 달 넘게 기록하면 여기에 나타나요.</p>` + example('rp')) +
      `<p class="pro-note">💡 고정지출로 넣으면 캘린더·앞으로의 돈에 날짜에 맞춰 미리 보여요. 안 쓰는 구독은 바로 해지하세요.</p>`;
    box.querySelectorAll('.pro-mini').forEach(b => b.addEventListener('click', () => {
      const x = list[+b.dataset.i], f = rd('donsem:fixed') || { items: [] }; if (!Array.isArray(f.items)) f.items = [];
      f.items.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name: x.name.slice(0, 30), cat: x.cat || '고정지출', amt: x.amt, cycle: 'month', day: x.day });
      if (wr('donsem:fixed', f)) { say(`「${x.name}」을 고정지출에 넣었어요. 매달 ${x.day}일에 미리 보여요 📅`); drawRp(); }
    }));
  }

  // ── 3. 카드 실적: 카드별 실적 기준과 셀 분류를 정하면, 이번 달 남은 실적을 보여 줘요 ──
  const EXCL = ['공과금', '세금', '보험', '이체', '저축'];
  function cardUse(c, ym) {
    return real(budget().entries).filter(e => e.type === 'out' && e.date.startsWith(ym) && (c.cats || []).includes(e.cat) && !EXCL.includes(e.cat) && !/할부/.test(e.memo || '')).reduce((s, e) => s + (+e.amt || 0), 0);
  }
  function drawCd() {
    const P = pro(), t0 = today(), ym = ymd(t0).slice(0, 7), left = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate() - t0.getDate();
    const cats = [...new Set(real(budget().entries).filter(e => e.type === 'out').map(e => e.cat).filter(c => c && !EXCL.includes(c)))].slice(0, 16);
    const rows = P.cards.map((c, i) => {
      const used = cardUse(c, ym), rest = Math.max(0, c.goal - used), pct = c.goal ? Math.min(100, used / c.goal * 100) : 0;
      return `<li class="pro-card-row"><div class="pro-card-top"><b>${E(c.name)}</b><span class="${rest ? (left <= 5 ? 'warn' : '') : 'done'}">${rest ? `${W(rest)} 남음` : '실적 달성 ✓'}</span></div><div class="pro-bar"><i style="width:${pct.toFixed(1)}%"></i></div><small>${W(used)} / ${W(c.goal)} · ${E((c.cats || []).join('·') || '분류 없음')}</small><button type="button" class="pro-x" data-i="${i}" aria-label="${E(c.name)} 지우기">×</button></li>`;
    }).join('');
    const alertCard = P.cards.find(c => c.goal - cardUse(c, ym) > 0);
    box.innerHTML = (P.cards.length && left <= 5 && alertCard ? `<div class="pro-alert">⏰ 이번 달이 ${left}일 남았어요. 「${E(alertCard.name)}」 실적이 ${W(alertCard.goal - cardUse(alertCard, ym))} 모자라요.</div>` : '') +
      (P.cards.length ? `<ul class="pro-cards">${rows}</ul>` : `<p class="pro-empty">카드를 추가하면 다음 실적 구간까지 남은 금액을 보여 드려요.</p>` + example('cd')) +
      `<details class="pro-add"${P.cards.length ? '' : ' open'}><summary>＋ 카드 추가</summary><div class="pro-in2"><label>카드 이름<input id="pro-cn" maxlength="20" placeholder="예: 신한 Deep Dream"></label><label>월 실적 기준<input id="pro-cg" inputmode="numeric" placeholder="예: 300,000"></label></div><p class="pro-cap">이 카드로 주로 쓰는 분류를 골라 주세요 (공과금·보험·할부는 실적에서 빼고 셈해요)</p><div class="pro-chips">${(cats.length ? cats : ['식비', '카페', '쇼핑', '교통', '생활']).map(c => `<label><input type="checkbox" value="${E(c)}"><span>${E(c)}</span></label>`).join('')}</div><button type="button" class="btn fill" id="pro-cadd">추가하기</button></details>`;
    const g = $('pro-cg'); if (g) g.addEventListener('input', () => { const n = num(g.value); g.value = n ? n.toLocaleString('ko-KR') : ''; });
    $('pro-cadd').addEventListener('click', () => {
      const name = $('pro-cn').value.trim(), goal = num($('pro-cg').value), cs = [...box.querySelectorAll('.pro-chips input:checked')].map(x => x.value);
      if (!name || !goal) return say('카드 이름과 실적 기준을 넣어 주세요.');
      if (!cs.length) return say('이 카드로 쓰는 분류를 하나 이상 골라 주세요.');
      const P2 = pro(); P2.cards.push({ id: Date.now().toString(36), name: name.slice(0, 20), goal, cats: cs }); wr(PK, P2); drawCd();
    });
    box.querySelectorAll('.pro-x').forEach(b => b.addEventListener('click', () => { const P2 = pro(); P2.cards.splice(+b.dataset.i, 1); wr(PK, P2); drawCd(); }));
  }

  // ── 연말정산 준비: 올해 가계부 기록으로 카드 사용·의료비·월세를 모으고, 총급여만 넣으면 환급을 어림해요 ──
  let taxReady = typeof window.TAX_TABLE === 'object';
  function needTable(cb) { if (taxReady) return cb(); const s = document.createElement('script'); s.src = '/salary/table.js'; s.onload = () => { taxReady = true; cb(); }; s.onerror = cb; document.head.append(s); }
  function yearData() {
    const t0 = today(), y = t0.getFullYear(), es = real(budget().entries).filter(e => e.type === 'out' && e.date.startsWith(String(y)));
    const fx = typeof withFixed === 'function' ? withFixed([]).filter(e => e.date.startsWith(String(y))) : [];
    const all = es.concat(fx), sum = f => all.filter(f).reduce((s, e) => s + (+e.amt || 0), 0);
    const isRent = e => /월세/.test(e.memo || ''), isMed = e => e.cat === '의료', notCard = e => isRent(e) || e.cat === '경조사' || /보험|세금|관리비|이체|저축/.test(e.memo || '');
    const day = Math.max(1, Math.round((t0 - new Date(y, 0, 1)) / 864e5) + 1), k = 365 / day;
    const card = sum(e => !notCard(e)), med = sum(isMed), rent = sum(isRent);
    return { y, card, med, rent, k, pCard: Math.round(card * k), pMed: Math.round(med * k), pRent: Math.round(rent * k), dday: Math.round((new Date(y, 11, 31) - t0) / 864e5) };
  }
  function yeCalc(o) {
    if (typeof yearEndTax !== 'function' || typeof tableTax !== 'function' || !taxReady) return null;
    const r = yearEndTax(o), f10 = n => Math.floor((n + 1e-6) / 10) * 10, kidCut = o.kids <= 0 ? 0 : o.kids === 1 ? 20830 : 45830 + (o.kids - 2) * 33330;
    const paid = Math.max(0, f10(tableTax(o.pay / 12, Math.min(o.fam, 11)) - kidCut)) * 12;
    return { r, diff: (paid + f10(paid * 0.1)) - (r.tax + f10(r.tax * 0.1)) };
  }
  function drawYe() {
    const P = pro(), Y = P.ye || {}, d = yearData();
    const steps = [['12.31', '지출·납입 마감'], ['1.15', '간소화 열림'], ['1월 말', '회사 제출'], ['2월', '급여로 정산']];
    const head = `<div class="pro-ye-top"><span class="pro-pill">${d.y}년 사용분</span><span class="pro-pill on">D-${d.dday}</span></div><div class="pro-steps">${steps.map((s, i) => `<div class="${i === 0 ? 'on' : ''}"><i></i><b>${s[0]}</b><span>${s[1]}</span></div>`).join('')}</div>`;
    const inputs = `<div class="pro-in2"><label>총급여 (1년, 비과세 뺀 연봉)<input id="ye-pay" inputmode="numeric" value="${Y.pay ? (+Y.pay).toLocaleString('ko-KR') : ''}" placeholder="예: 40,000,000"></label><label>연금저축·IRP 올해 넣은 돈<input id="ye-pen" inputmode="numeric" value="${Y.pen ? (+Y.pen).toLocaleString('ko-KR') : ''}" placeholder="0"></label><label>기본공제 가족 수 (나 포함)<input id="ye-fam" inputmode="numeric" value="${Y.fam || 1}"></label><label>9세 이상 자녀 수<input id="ye-kids" inputmode="numeric" value="${Y.kids || 0}"></label></div><label class="pro-range">카드 사용 중 체크카드·현금 비율 <b id="ye-dbv">${Y.dr == null ? 30 : Y.dr}%</b><input id="ye-dr" type="range" min="0" max="100" step="10" value="${Y.dr == null ? 30 : Y.dr}"></label>`;
    const ledger = `<h3 class="pro-h">가계부에서 찾은 올해 공제 재료</h3><ul class="pro-list"><li><span><b>카드로 쓴 돈 (추정)</b><small>지금까지 ${W(d.card)} → 연말까지 약 ${W(d.pCard)}</small></span></li><li><span><b>의료비</b><small>분류 「의료」 · 연말까지 약 ${W(d.pMed)}</small></span></li><li><span><b>월세</b><small>메모에 「월세」 · 연말까지 약 ${W(d.pRent)}</small></span></li></ul>`;
    if (!Y.pay) { box.innerHTML = head + `<div class="pro-panel"><p class="pro-empty" style="margin:0"><b>총급여만 알려 주시면 시작해요.</b><br>지금까지 가계부 기록을 바탕으로 올해 챙길 공제와 예상 환급을 찾아 드려요.</p></div>` + inputs + ledger + marriage(); bindYe(); return; }
    needTable(() => {
      const fam = Math.max(1, +Y.fam || 1, (+Y.kids || 0) + 1), kids = +Y.kids || 0, dr = (Y.dr == null ? 30 : +Y.dr) / 100;
      const base = { pay: +Y.pay, fam, kids, credit: Math.round(d.pCard * (1 - dr)), debit: Math.round(d.pCard * dr), pension: +Y.pen || 0, rent: d.pRent, med: d.pMed, ins: 0 };
      const now = yeCalc(base);
      if (!now) { box.innerHTML = head + inputs + `<p class="pro-empty">계산 준비 중이에요. 잠시 뒤 다시 열어 주세요.</p>`; bindYe(); return; }
      const th = base.pay * 0.25, left = Math.max(0, th - d.pCard);
      const pen = yeCalc(Object.assign({}, base, { pension: 9e6 })), penGain = pen ? pen.diff - now.diff : 0, penNeed = Math.max(0, 9e6 - base.pension);
      const tips = [];
      if (left > 0) tips.push(`<li><span><b>카드 공제 기준까지 ${W(left)} 남았어요</b><small>총급여의 25%(${W(th)})를 넘게 써야 카드 공제가 시작돼요. 그전엔 혜택 좋은 신용카드로</small></span></li>`);
      else tips.push(`<li><span><b>카드 공제 기준을 넘었어요</b><small>12월 31일까지는 체크카드·현금영수증(30%)이 신용카드(15%)보다 2배 유리해요</small></span></li>`);
      if (penNeed > 0 && penGain > 0) tips.push(`<li><span><b>연금저축·IRP ${W(penNeed)} 더 넣으면</b><small>12월 31일까지 넣으면 내년 2월에 이만큼 더 돌려받아요</small></span><em class="plus">+${W(penGain)}</em></li>`);
      if (!d.rent) tips.push(`<li><span><b>월세를 산다면 꼭 챙기세요</b><small>무주택 세대주·총급여 8천만 원 이하면 낸 월세의 15~17%를 돌려받아요. 가계부 메모에 「월세」라고 적어 두세요</small></span></li>`);
      box.innerHTML = head + `<div class="pro-panel"><div class="pro-kpis"><div><span>${now.diff >= 0 ? '예상 환급' : '예상 추가 납부'}</span><b class="${now.diff < 0 ? 'neg' : ''}">${W(Math.abs(now.diff))}</b></div><div><span>카드 공제 (어림)</span><b>${W(now.r.card)}</b></div></div><p class="pro-cap">가계부 기록을 연말까지 늘려 잡은 어림값이에요 (지방소득세 포함). 정확한 계산은 <a href="/year-end-tax/">연말정산 계산기</a>에서.</p></div>` +
        `<h3 class="pro-h">올해 안에 챙길 것</h3><ul class="pro-list">${tips.join('')}</ul>` + marriage() + inputs + ledger;
      bindYe();
    });
  }
  function marriage() { return `<div class="pro-panel pro-tip"><b>12월 31일까지 혼인신고하면</b><span>2024~2026년에 혼인신고한 부부는 각각 결혼세액공제 50만 원(지방소득세 포함 55만 원)을 한 번 받아요.</span></div>`; }
  function bindYe() {
    const save = () => { const P = pro(); P.ye = { pay: num(($('ye-pay') || {}).value), pen: num(($('ye-pen') || {}).value), fam: Math.max(1, num(($('ye-fam') || {}).value) || 1), kids: num(($('ye-kids') || {}).value), dr: +(($('ye-dr') || {}).value || 30) }; wr(PK, P); drawYe(); };
    ['ye-pay', 'ye-pen', 'ye-fam', 'ye-kids'].forEach(id => { const el = $(id); if (!el) return; el.addEventListener('change', save); if (id === 'ye-pay' || id === 'ye-pen') el.addEventListener('input', () => { const n = num(el.value); el.value = n ? n.toLocaleString('ko-KR') : ''; }); });
    const r = $('ye-dr'); if (r) { r.addEventListener('input', () => { $('ye-dbv').textContent = r.value + '%'; }); r.addEventListener('change', save); }
  }

  // ── 0. 소비 분석: 쌓이는 지출 그래프 · 이번 달 리포트 · 지출 패턴 · 월별 흐름 · 기간별 리포트 ──
  let anOff = 0, anPat = 'wd', anPer = 'q';
  const outsAll = () => (typeof withFixed === 'function' ? withFixed(budget().entries) : budget().entries).filter(e => e && e.type === 'out' && e.date && +e.amt > 0);
  const sumA = a => a.reduce((s, e) => s + (+e.amt || 0), 0);
  const catOf = a => { const c = {}; a.forEach(e => { const k = e.cat || '기타'; c[k] = (c[k] || 0) + (+e.amt || 0); }); return c; };
  const man = v => (v >= 1e4 ? (v >= 1e6 ? Math.round(v / 1e4) : Math.round(v / 1e3) / 10) + '만' : Math.round(v).toLocaleString('ko-KR'));
  const josa = (w, a, b) => { const c = String(w).charCodeAt(String(w).length - 1); return w + (c >= 0xAC00 && c <= 0xD7A3 && (c - 0xAC00) % 28 ? a : b); };
  function cumChart(cur, prev, last, proj) {
    const w = 320, h = 130, max = Math.max(1, proj || 0, ...cur, ...prev);
    const x = d => ((d - 1) / Math.max(1, last - 1)) * w, y = v => h - 6 - (v / max) * (h - 14);
    const line = a => a.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join(' ');
    const n = cur.length, cl = n ? line(cur) : '';
    return `<svg viewBox="0 0 ${w} ${h}" class="an-chart" aria-hidden="true"><defs><linearGradient id="an-g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#7040A1" stop-opacity=".22"/><stop offset="1" stop-color="#7040A1" stop-opacity="0"/></linearGradient></defs>` +
      (prev.length ? `<path d="${line(prev.slice(0, last))}" class="an-prev"/>` : '') +
      (n ? `<path d="${cl} L${x(n).toFixed(1)} ${h} L0 ${h}Z" fill="url(#an-g)"/><path d="${cl}" class="an-cur"/>` : '') +
      (proj && n && n < last ? `<path d="M${x(n).toFixed(1)} ${y(cur[n - 1]).toFixed(1)} L${x(last).toFixed(1)} ${y(proj).toFixed(1)}" class="an-proj"/><circle cx="${x(last).toFixed(1)}" cy="${y(proj).toFixed(1)}" r="4" class="an-dot"/>` : '') +
      `</svg>`;
  }
  const cumOf = (es, upTo) => { const d = new Array(upTo).fill(0); es.forEach(e => { const k = +e.date.slice(8) - 1; if (k >= 0 && k < upTo) d[k] += +e.amt || 0; }); let s = 0; return d.map(v => (s += v)); };
  function bars(items) {
    const max = Math.max(1, ...items.map(i => i.v));
    return `<div class="an-bars">${items.map(i => `<div class="${i.on ? 'on' : ''}"><small>${i.v ? man(i.v) : ''}</small><i style="height:${(i.v / max * 70).toFixed(1)}%"></i><b>${i.l}</b></div>`).join('')}</div>`;
  }
  function drawAn() {
    const all = outsAll(), t0 = today();
    if (!all.length) { box.innerHTML = `<p class="pro-empty">캘린더에 쓴 돈을 적으면 <b>이번 달 지출 흐름, 돈 샌 곳, 요일별 패턴, 분기·연간 리포트</b>를 자동으로 만들어 드려요.</p>` + example('an'); return; }
    const d = new Date(t0.getFullYear(), t0.getMonth() + anOff, 1), ym = ymd(d).slice(0, 7), last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    const isNow = anOff === 0, upTo = isNow ? t0.getDate() : last;
    const pd = new Date(d.getFullYear(), d.getMonth() - 1, 1), pym = ymd(pd).slice(0, 7), plast = new Date(pd.getFullYear(), pd.getMonth() + 1, 0).getDate();
    const mine = all.filter(e => e.date.startsWith(ym)), prevAll = all.filter(e => e.date.startsWith(pym));
    const spent = sumA(mine), cur = cumOf(mine, upTo), prev = cumOf(prevAll, plast);
    // 월말 예상: 지금까지 + 남은 날 × 평소 하루 지출 + 아직 안 나간 고정지출 (앞으로의 돈·예산 경고와 같은 셈)
    let proj = 0, fxLeft = 0;
    if (isNow) { const f = forecast(); fxLeft =fixed().filter(x => (x.cycle !== 'year' || +x.month === t0.getMonth() + 1) && Math.min(+x.day, last) > t0.getDate()).reduce((s, x) => s + (+x.amt || 0), 0); proj = Math.round(spent + f.daily * (last - upTo) + fxLeft); }
    const B = +budget().budget || 0;
    // ① 이번 달 리포트
    const cats = Object.entries(catOf(mine)).sort((a, b) => b[1] - a[1]);
    // 비교는 고정지출을 빼고 해요 (고정지출은 최근 두 달에만 자동으로 들어가서, 그 전 달과 비교하면 틀어져요)
    const nf = a => a.filter(e => !e.fx), pSame = catOf(nf(prevAll).filter(e => +e.date.slice(8) <= upTo)), vCats = Object.entries(catOf(nf(mine)));
    const rep = [];
    if (cats.length) rep.push(['🏆', `${isNow ? '이번 달' : d.getMonth() + 1 + '월'} 1위는 ${cats[0][0]}`, `${W(cats[0][1])} · 전체의 ${Math.round(cats[0][1] / Math.max(1, spent) * 100)}%를 썼어요`]);
    if (prevAll.length) {
      const ups = vCats.map(([c, v]) => [c, v, v - (pSame[c] || 0), pSame[c] || 0]).filter(x => x[2] > 0).sort((a, b) => b[2] - a[2]);
      const pTot = sumA(nf(prevAll).filter(e => +e.date.slice(8) <= upTo)), gap = sumA(nf(mine)) - pTot;
      if (ups.length) rep.push(['💧', '돈 샌 곳', `${josa(ups[0][0], '이', '가')} 지난달 ${isNow ? '같은 기간' : ''}보다 ${ups[0][3] ? Math.round(ups[0][2] / ups[0][3] * 100) + '% ' : ''}늘었어요 (+${W(ups[0][2])})`.replace('지난달 보다', '지난달보다')]);
      else rep.push(['👏', '돈 샌 곳 없음', `지난달 ${isNow ? '같은 기간' : ''}보다 늘어난 분류가 없어요`.replace('지난달 보다', '지난달보다')]);
      rep.push(['📊', isNow ? (gap > 0 ? '지난달보다 더 쓰는 중' : '지난달보다 덜 쓰는 중') : (gap > 0 ? '지난달보다 더 썼어요' : '지난달보다 덜 썼어요'), `${isNow ? `지난달 ${upTo}일까지보다` : '지난달보다'} ${W(Math.abs(gap))} ${gap > 0 ? '더' : '덜'} 썼어요 (고정지출 빼고)`]);
    }
    if (isNow) rep.push(['🔮', '월말 예상', B ? (proj > B ? (B - spent - fxLeft <= 0 ? `예산 ${W(B)}을 남은 고정지출까지 합쳐 이미 다 썼어요. 남은 ${last - upTo}일은 꼭 필요한 데만 써요` : `이대로면 예산 ${W(B)}을 ${W(proj - B)} 넘겨요. 남은 ${last - upTo}일은 하루 ${W((B - spent - fxLeft) / Math.max(1, last - upTo))} 안에서 써 보세요`) : `약 ${W(proj)} · 예산 ${W(B)} 안에서 끝날 것 같아요`) : `이대로면 월말까지 약 ${W(proj)}을 써요`]);
    // 다음 달 추천 예산: 지난 3달(기록 있는 달) 평균을 만 원 단위로
    // 기록을 시작한 달은 중간부터라 평균에서 빼요 (3일 안에 시작했으면 넣어요)
    const first0 = all.reduce((m, e) => (e.date < m ? e.date : m), ymd(t0)), full = y2 => y2 > first0.slice(0, 7) || +first0.slice(8) <= 3;
    const past = [1, 2, 3].map(k => ymd(new Date(t0.getFullYear(), t0.getMonth() - k, 1)).slice(0, 7)).filter(full).map(y2 => sumA(all.filter(e => e.date.startsWith(y2)))).filter(v => v > 0);
    const rec = past.length ? Math.ceil(past.reduce((s, v) => s + v, 0) / past.length / 1e4) * 1e4 : 0;
    if (isNow && rec) rep.push(['🎯', '다음 달 추천 예산', `최근 ${past.length}달 평균으로 보면 ${W(rec)} 정도가 알맞아요${B && B !== rec ? ` (지금 예산 ${W(B)})` : ''}`, B !== rec ? `<button type="button" class="pro-mini" id="an-setb">이 금액으로 예산 정하기</button>` : '']);
    const sim = cats[0] ? `<button type="button" class="an-simlink" id="an-sim"><span><b>${cats[0][0]} 20% 줄이면 한 달 ${W(cats[0][1] * (isNow ? last / upTo : 1) * 0.2)} 아껴요</b><small>10%·20%·30% 줄였을 때를 비교해 보세요</small></span><em>›</em></button>` : '';
    // ② 지출 패턴 (최근 90일, 고정지출은 빼고)
    const from = new Date(t0); from.setDate(from.getDate() - 89);
    const firstD = all.filter(e => !e.fx).reduce((m, e) => (e.date < m ? e.date : m), ymd(t0));
    const s0 = new Date(Math.max(+from, +new Date(firstD))), recent = all.filter(e => !e.fx && e.date >= ymd(s0) && e.date <= ymd(t0));
    let pat, patHead;
    if (anPat === 'wd') {
      const cnt = new Array(7).fill(0), sum = new Array(7).fill(0);
      for (let x = new Date(s0); x <= t0; x.setDate(x.getDate() + 1)) cnt[x.getDay()]++;
      recent.forEach(e => { const [yy, mm, dd] = e.date.split('-').map(Number); sum[new Date(yy, mm - 1, dd).getDay()] += +e.amt || 0; });
      const avg = sum.map((s, i) => (cnt[i] ? s / cnt[i] : 0)), order = [1, 2, 3, 4, 5, 6, 0], nm = '일월화수목금토';
      const top = order.reduce((m, i) => (avg[i] > avg[m] ? i : m), 1), mean = avg.reduce((s, v) => s + v, 0) / 7;
      pat = bars(order.map(i => ({ l: nm[i], v: avg[i], on: i === top })));
      patHead = mean ? `${nm[top]}요일에 하루 평균 ${W(avg[top])}, 평소의 ${(avg[top] / mean).toFixed(1)}배를 써요` : '';
    } else {
      const parts = [[1, 10, '월초 1~10일'], [11, 20, '중순 11~20일'], [21, 31, '월말 21일~']], sum = [0, 0, 0], days = [0, 0, 0];
      for (let x = new Date(s0); x <= t0; x.setDate(x.getDate() + 1)) days[x.getDate() <= 10 ? 0 : x.getDate() <= 20 ? 1 : 2]++;
      recent.forEach(e => { const dd = +e.date.slice(8); sum[dd <= 10 ? 0 : dd <= 20 ? 1 : 2] += +e.amt || 0; });
      const avg = sum.map((s, i) => (days[i] ? s / days[i] : 0)), top = avg.indexOf(Math.max(...avg));
      pat = bars(parts.map((p, i) => ({ l: p[2], v: avg[i], on: i === top })));
      patHead = avg[top] ? `${parts[top][2].split(' ')[0]}에 하루 평균 ${W(avg[top])}으로 가장 많이 써요` : '';
    }
    // ③ 월별 흐름 (6달)
    const six = [5, 4, 3, 2, 1, 0].map(k => { const m = new Date(t0.getFullYear(), t0.getMonth() - k, 1), y2 = ymd(m).slice(0, 7); return { l: (m.getMonth() + 1) + '월', v: sumA(all.filter(e => e.date.startsWith(y2))), on: k === -anOff, full: full(y2) }; });
    const known = six.slice(0, 5).filter(m => m.v && m.full), avg6 = known.length ? known.reduce((s, m) => s + m.v, 0) / known.length : 0;
    // ④ 기간별 리포트
    const per = (back) => {
      const m = t0.getMonth(), len = anPer === 'q' ? 3 : anPer === 'h' ? 6 : 12, s = anPer === 'q' ? Math.floor(m / 3) * 3 : anPer === 'h' ? (m < 6 ? 0 : 6) : 0;
      const st = new Date(t0.getFullYear(), s - back * len, 1), en = new Date(st.getFullYear(), st.getMonth() + len, 0);
      const es = all.filter(e => e.date >= ymd(st) && e.date <= ymd(en));
      const label = anPer === 'q' ? `${st.getFullYear()}년 ${Math.floor(st.getMonth() / 3) + 1}분기` : anPer === 'h' ? `${st.getFullYear()}년 ${st.getMonth() < 6 ? '상반기' : '하반기'}` : `${st.getFullYear()}년`;
      const mon = {}; es.forEach(e => { const k = e.date.slice(0, 7); mon[k] = (mon[k] || 0) + (+e.amt || 0); });
      const months = Object.keys(mon).length, tot = sumA(es);
      return { label, tot, months, avg: months ? tot / months : 0, cats: Object.entries(catOf(es)).sort((a, b) => b[1] - a[1]), peak: Object.entries(mon).sort((a, b) => b[1] - a[1])[0] };
    };
    const P0 = per(0), P1 = per(1), pname = { q: '분기', h: '반기', y: '해' }[anPer];
    const perHtml = P0.tot ? `<div class="pro-panel"><p class="an-ptitle">${P0.label} <small>· 기록한 ${P0.months}달</small></p><div class="pro-kpis"><div><span>쓴 돈</span><b>${W(P0.tot)}</b></div><div><span>한 달 평균</span><b>${W(P0.avg)}</b></div></div>` +
      `<ul class="an-top">${P0.cats.slice(0, 3).map(([c, v], i) => `<li><i>${i + 1}</i><span>${E(c)}</span><div class="pro-bar"><i style="width:${(v / P0.cats[0][1] * 100).toFixed(1)}%"></i></div><em>${Math.round(v / P0.tot * 100)}%</em></li>`).join('')}</ul>` +
      `<p class="pro-cap">가장 많이 쓴 달은 <b>${+P0.peak[0].slice(5)}월 (${W(P0.peak[1])})</b>${P1.tot ? ` · 지난 ${pname}보다 한 달 평균 <b>${W(Math.abs(P0.avg - P1.avg))} ${P0.avg > P1.avg ? '더' : '덜'}</b> 썼어요` : ''}</p></div>` : `<p class="pro-empty">${P0.label}에 적은 지출이 아직 없어요.</p>`;

    box.innerHTML = `<div class="pro-mon"><button type="button" data-o="-1"${anOff <= -11 ? ' disabled' : ''}>‹</button><b>${d.getFullYear()}년 ${d.getMonth() + 1}월</b><button type="button" data-o="1"${anOff >= 0 ? ' disabled' : ''}>›</button></div>` +
      `<div class="pro-panel"><div class="pro-kpis"><div><span>${isNow ? `${upTo}일까지 쓴 돈` : '이 달에 쓴 돈'}</span><b>${W(spent)}</b></div><div><span>${isNow ? `${last}일 예상` : '지난달'}</span><b>${W(isNow ? proj : sumA(prevAll))}</b></div></div>${cumChart(cur, prev, last, proj)}<div class="an-axis"><span>1일</span><span>${last}일</span></div><p class="an-legend"><span><i></i>${isNow ? '지금까지' : '이 달'}</span>${isNow ? '<span><i class="d"></i>월말 예상</span>' : ''}${prevAll.length ? '<span><i class="p"></i>지난달</span>' : ''}</p></div>` +
      `<h3 class="pro-h">${isNow ? '이번 달' : d.getMonth() + 1 + '월'} 리포트</h3><ul class="an-rep">${rep.map(r => `<li><span class="ic" aria-hidden="true">${r[0]}</span><div><b>${r[1]}</b><span>${r[2]}</span>${r[3] || ''}</div></li>`).join('')}</ul>${sim}` +
      `<div class="an-hrow"><h3 class="pro-h">지출 패턴</h3><div class="pro-tabs2" id="an-pat"><button type="button" data-v="wd" class="${anPat === 'wd' ? 'on' : ''}">요일별</button><button type="button" data-v="dm" class="${anPat === 'dm' ? 'on' : ''}">날짜별</button></div></div><p class="pro-cap">${patHead || '기록이 더 쌓이면 보여 드려요'} <small>(최근 90일 · 고정지출 빼고 하루 평균)</small></p>${pat}` +
      `<h3 class="pro-h">월별 지출 흐름</h3><p class="pro-cap">${avg6 ? `지난 ${known.length}달 평균 ${W(avg6)}` : '달마다 쓴 돈을 비교해요'}</p>${bars(six)}` +
      `<div class="an-hrow"><h3 class="pro-h">기간별 리포트</h3><div class="pro-tabs2" id="an-per"><button type="button" data-v="q" class="${anPer === 'q' ? 'on' : ''}">분기</button><button type="button" data-v="h" class="${anPer === 'h' ? 'on' : ''}">반기</button><button type="button" data-v="y" class="${anPer === 'y' ? 'on' : ''}">연간</button></div></div>${perHtml}` +
      `<p class="pro-note">💡 고정지출은 캘린더처럼 지난달·이번 달만 자동으로 더해요. 그 전 달은 직접 적은 기록만 셈해요.</p>`;
    box.querySelectorAll('.pro-mon button').forEach(b => b.addEventListener('click', () => { anOff += +b.dataset.o; drawAn(); }));
    box.querySelectorAll('#an-pat button').forEach(b => b.addEventListener('click', () => { anPat = b.dataset.v; drawAn(); }));
    box.querySelectorAll('#an-per button').forEach(b => b.addEventListener('click', () => { anPer = b.dataset.v; drawAn(); }));
    const sb = $('an-setb'); if (sb) sb.addEventListener('click', () => { const b = rd('donsem:budget') || { entries: [] }; if (!Array.isArray(b.entries)) b.entries = []; b.budget = rec; if (wr('donsem:budget', b)) { say(`한 달 예산을 ${W(rec)}으로 정했어요 🎯`); drawAn(); } });
    const sl = $('an-sim'); if (sl) sl.addEventListener('click', () => { rcOff = 0; tab = 'rc'; try { sessionStorage.setItem('donsem:pro-tab', tab); } catch (er) { /* 괜찮아요 */ } draw(); setTimeout(() => { const s = box.querySelector('.pro-sim'); if (s) s.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 60); });
  }

  // ── 6. 돈 습관: 가계부 기록으로 저절로 체크되는 습관 + 돈 D-day + 잠금화면 배경 만들기 ──
  const DEF_H = [
    { id: 'rec', name: '가계부 적기', ic: '✍️', auto: 'rec' },
    { id: 'nos', name: '무지출 데이', ic: '🌱', auto: 'nos' },
    { id: 'cafe', name: '카페·간식 참기', ic: '☕', auto: 'cafe' },
    { id: 'dlv', name: '배달 안 시키기', ic: '🛵', auto: 'dlv' },
  ];
  const H_IC = ['💪', '📚', '🚶', '🍱', '🚭', '💧', '🧾', '🏦'];
  const habits = () => { const P = pro(); return Array.isArray(P.habits) ? P.habits : DEF_H; };
  let wpStyle = 'purple';
  function hbDay() {
    // 날짜별 기록을 한 번에 묶어 둬요
    const es = real(budget().entries), by = {};
    es.forEach(e => { if (e && e.date) (by[e.date] = by[e.date] || []).push(e); });
    const first = Object.keys(by).sort()[0] || null, chk = pro().hchk || {};
    const done = (h, k) => {
      if (!h.auto) return (chk[k] || []).includes(h.id);
      if (!first || k < first) return null; // 기록을 시작하기 전 날은 세지 않아요
      const d = by[k] || [], outs = d.filter(e => e.type === 'out');
      if (h.auto === 'rec') return d.length > 0;
      if (h.auto === 'nos') return outs.length === 0;
      if (h.auto === 'cafe') return !outs.some(e => /카페|간식/.test(e.cat || '') || /커피|스타벅스|카페/.test(e.memo || ''));
      if (h.auto === 'dlv') return !outs.some(e => /배달|배민|쿠팡이츠|요기요/.test((e.memo || '') + (e.cat || '')));
      return false;
    };
    const rate = k => { const hs = habits(); let n = 0, ok = 0; hs.forEach(h => { const v = done(h, k); if (v === null) return; n++; if (v) ok++; }); return n ? ok / n : null; };
    return { done, rate, first };
  }
  function ddays() {
    const t0 = today(), b = budget(), out = [], end = new Date(t0); end.setDate(end.getDate() + 45);
    const dd = d => Math.round((d - t0) / 864e5);
    const yest = new Date(t0); yest.setDate(yest.getDate() - 1);
    const pay = payDates(b.payday, yest, end)[0]; if (pay) out.push({ name: '월급날', ic: '💰', d: dd(new Date(pay)), fixedOne: true });
    const last = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate();
    fixed().filter(x => x.cycle !== 'year').map(x => { const day = Math.min(+x.day, last); let d = new Date(t0.getFullYear(), t0.getMonth(), day); if (d < t0) d = new Date(t0.getFullYear(), t0.getMonth() + 1, Math.min(+x.day, new Date(t0.getFullYear(), t0.getMonth() + 2, 0).getDate())); return { name: x.name || x.cat, ic: '📌', d: dd(d), amt: +x.amt, fixedOne: true }; })
      .filter(x => x.d <= 7).sort((a, b2) => a.d - b2.d).slice(0, 3).forEach(x => out.push(x));
    (pro().dd || []).forEach((x, i) => { const d = dd(new Date(x.date)); if (d >= 0) out.push({ name: x.name, ic: '🎯', d, i }); });
    return out.sort((a, b2) => a.d - b2.d);
  }
  const dTxt = d => (d === 0 ? 'D-DAY' : 'D-' + d);
  function hbGrid(H, y, m, big) {
    const t0 = today(), first = new Date(y, m, 1).getDay(), last = new Date(y, m + 1, 0).getDate(), cells = [];
    for (let i = 0; i < first; i++) cells.push('<i class="e"></i>');
    for (let d = 1; d <= last; d++) {
      const dt = new Date(y, m, d), k = ymd(dt), r = dt > t0 ? null : H.rate(k);
      const lv = r === null ? '' : r >= 1 ? 'l4' : r >= .67 ? 'l3' : r >= .34 ? 'l2' : r > 0 ? 'l1' : 'l0';
      cells.push(`<i class="${lv}${+dt === +t0 ? ' now' : ''}${dt > t0 ? ' f' : ''}">${big ? d : ''}</i>`);
    }
    return cells.join('');
  }
  function drawHb() {
    const H = hbDay(), hs = habits(), t0 = today(), k0 = ymd(t0), P = pro();
    // 이번 달 달성률 · 가계부 연속 기록
    let sum = 0, cnt = 0; for (let d = 1; d <= t0.getDate(); d++) { const r = H.rate(ymd(new Date(t0.getFullYear(), t0.getMonth(), d))); if (r !== null) { sum += r; cnt++; } }
    let streak = 0; for (let x = new Date(t0); streak < 400; x.setDate(x.getDate() - 1)) { const v = H.done(DEF_H[0], ymd(x)); if (v) streak++; else if (+x === +t0) continue; else break; }
    const pct = cnt ? Math.round(sum / cnt * 100) : 0;
    const list = hs.map((h, i) => { const v = H.done(h, k0); return `<li class="hb-row${v ? ' ok' : ''}"><span class="hb-ic" aria-hidden="true">${h.ic}</span><span class="hb-n"><b>${E(h.name)}</b><small>${h.auto ? (v === null ? '가계부를 적으면 시작돼요' : h.auto === 'rec' ? (v ? '오늘 적었어요' : '오늘 아직 안 적었어요') : (v ? '오늘 지키는 중' : '오늘은 못 지켰어요')) : '직접 체크해요'}</small></span>${h.auto ? `<span class="hb-auto">자동</span>` : ''}<button type="button" class="hb-chk" data-i="${i}" aria-pressed="${!!v}" aria-label="${E(h.name)} ${v ? '완료' : '안 함'}"${h.auto ? ' disabled' : ''}>${v ? '✓' : ''}</button><button type="button" class="pro-x hb-del" data-i="${i}" aria-label="${E(h.name)} 지우기">×</button></li>`; }).join('');
    const D = ddays();
    box.innerHTML = `<div class="pro-panel"><div class="hb-top"><b>${t0.getFullYear()}년 ${t0.getMonth() + 1}월</b><span>달성률 <em>${pct}%</em></span></div><div class="hb-grid"><span>일</span><span>월</span><span>화</span><span>수</span><span>목</span><span>금</span><span>토</span>${hbGrid(H, t0.getFullYear(), t0.getMonth(), true)}</div><p class="pro-cap">🔥 가계부 <b>${streak}일 연속</b> 기록 중 · 진할수록 그날 습관을 많이 지켰어요</p></div>` +
      `<h3 class="pro-h">오늘의 돈 습관</h3><ul class="hb-list">${list}</ul>` +
      `<details class="pro-add"><summary>＋ 습관 추가</summary><div class="pro-in2"><label>습관 이름<input id="hb-name" maxlength="16" placeholder="예: 점심 도시락 싸기"></label></div><div class="hb-icpick" id="hb-icpick">${H_IC.map((c, i) => `<button type="button" data-c="${c}" class="${i ? '' : 'on'}">${c}</button>`).join('')}</div><button type="button" class="btn fill" id="hb-add">추가하기</button></details>` +
      `<h3 class="pro-h">돈 D-day</h3>${D.length ? `<ul class="dd-list">${D.map(x => `<li><span class="dd-ic" aria-hidden="true">${x.ic}</span><span class="dd-n"><b>${E(x.name)}</b>${x.amt ? `<small>${W(x.amt)} 나가요</small>` : ''}</span><em class="${x.d <= 3 ? 'soon' : ''}">${dTxt(x.d)}</em>${x.i != null ? `<button type="button" class="pro-x dd-del" data-i="${x.i}" aria-label="지우기">×</button>` : ''}</li>`).join('')}</ul>` : `<p class="pro-empty">캘린더에서 월급날을 정하거나 아래에 적금 만기·여행 같은 날을 넣어 보세요.</p>`}` +
      `<details class="pro-add"><summary>＋ D-day 추가</summary><div class="pro-in2"><label>이름<input id="dd-name" maxlength="16" placeholder="예: 적금 만기, 여행"></label><label>날짜<input id="dd-date" type="date" min="${k0}"></label></div><button type="button" class="btn fill" id="dd-add">추가하기</button></details>` +
      `<h3 class="pro-h">잠금화면 배경 만들기</h3><p class="pro-cap">이번 달 쓸 수 있는 돈, D-day, 습관 달력을 배경화면 한 장으로 만들어요. 휴대폰을 켤 때마다 보게 돼요.</p><div class="pro-tabs2" id="wp-style"><button type="button" data-v="purple" class="${wpStyle === 'purple' ? 'on' : ''}">보라</button><button type="button" data-v="dark" class="${wpStyle === 'dark' ? 'on' : ''}">다크</button><button type="button" data-v="light" class="${wpStyle === 'light' ? 'on' : ''}">라이트</button></div><div class="wp-prev"><canvas id="wp-cv" width="1179" height="2556" aria-label="잠금화면 배경 미리보기"></canvas></div><button type="button" class="btn fill wide" id="wp-save">배경화면 저장하기</button><p class="pro-note">💡 저장한 사진을 사진 앱에서 열고 공유 → 「배경화면으로 지정」을 누르세요. 숫자가 바뀌면 다시 만들어 주세요.</p>`;
    const saveP = f => { const P2 = pro(); f(P2); wr(PK, P2); drawHb(); };
    box.querySelectorAll('.hb-chk').forEach(b => b.addEventListener('click', () => saveP(P2 => { const h = habits()[+b.dataset.i]; P2.hchk = P2.hchk || {}; const a = P2.hchk[k0] || []; P2.hchk[k0] = a.includes(h.id) ? a.filter(x => x !== h.id) : a.concat(h.id); /* 오래된 체크는 1년치만 둬요 */ const cut = ymd(new Date(t0.getFullYear() - 1, t0.getMonth(), 1)); Object.keys(P2.hchk).forEach(k => { if (k < cut) delete P2.hchk[k]; }); })));
    box.querySelectorAll('.hb-del').forEach(b => b.addEventListener('click', () => saveP(P2 => { P2.habits = habits().filter((_, i) => i !== +b.dataset.i); })));
    let ic = H_IC[0]; box.querySelectorAll('#hb-icpick button').forEach(b => b.addEventListener('click', () => { ic = b.dataset.c; box.querySelectorAll('#hb-icpick button').forEach(x => x.classList.toggle('on', x === b)); }));
    $('hb-add').addEventListener('click', () => { const n = $('hb-name').value.trim(); if (!n) return say('습관 이름을 적어 주세요.'); if (habits().length >= 8) return say('습관은 8개까지 둘 수 있어요.'); saveP(P2 => { P2.habits = habits().concat({ id: 'h' + Date.now().toString(36), name: n.slice(0, 16), ic }); }); });
    $('dd-add').addEventListener('click', () => { const n = $('dd-name').value.trim(), d = $('dd-date').value; if (!n || !d) return say('이름과 날짜를 넣어 주세요.'); saveP(P2 => { P2.dd = (P2.dd || []).filter(x => x.date >= k0).concat({ name: n.slice(0, 16), date: d }).slice(-10); }); });
    box.querySelectorAll('.dd-del').forEach(b => b.addEventListener('click', () => saveP(P2 => { P2.dd = (P2.dd || []).filter((_, i) => i !== +b.dataset.i); })));
    box.querySelectorAll('#wp-style button').forEach(b => b.addEventListener('click', () => { wpStyle = b.dataset.v; box.querySelectorAll('#wp-style button').forEach(x => x.classList.toggle('on', x === b)); paintWp(H, D, pct); }));
    paintWp(H, D, pct);
    $('wp-save').addEventListener('click', () => { ping('wp'); $('wp-cv').toBlob(blob => saveImg(blob, `donsem-wallpaper-${k0}.png`, '돈셈 잠금화면', '배경화면 이미지를 저장했어요 📱'), 'image/png'); });
  }
  function paintWp(H, D, pct) {
    const c = $('wp-cv'); if (!c) return;
    const x = c.getContext('2d'), w = c.width, h = c.height, t0 = today(), FF = '"Pretendard Variable", Pretendard, -apple-system, sans-serif';
    const S = { purple: { bg: ['#2A1145', '#7040A1'], card: 'rgba(255,255,255,.12)', tx: '#FFFFFF', mu: 'rgba(255,255,255,.7)', ac: '#E4D3FF', lv: ['rgba(255,255,255,.12)', 'rgba(228,211,255,.35)', 'rgba(228,211,255,.6)', 'rgba(228,211,255,.85)', '#FFFFFF'] },
      dark: { bg: ['#0E0E10', '#1C1A22'], card: 'rgba(255,255,255,.07)', tx: '#F5F5F7', mu: 'rgba(245,245,247,.6)', ac: '#B69AD8', lv: ['rgba(255,255,255,.08)', 'rgba(182,154,216,.3)', 'rgba(182,154,216,.55)', 'rgba(182,154,216,.8)', '#B69AD8'] },
      light: { bg: ['#F7F3FC', '#E9DEF6'], card: 'rgba(255,255,255,.75)', tx: '#1D1D1F', mu: 'rgba(29,29,31,.55)', ac: '#7040A1', lv: ['rgba(112,64,161,.08)', 'rgba(112,64,161,.25)', 'rgba(112,64,161,.45)', 'rgba(112,64,161,.7)', '#7040A1'] } }[wpStyle];
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, S.bg[0]); g.addColorStop(1, S.bg[1]); x.fillStyle = g; x.fillRect(0, 0, w, h);
    const T = (s, X, Y, size, wt = 700, col = S.tx, al = 'left') => { x.font = `${wt} ${size}px ${FF}`; x.fillStyle = col; x.textAlign = al; x.fillText(s, X, Y); };
    const card = (Y, H2) => { x.fillStyle = S.card; x.beginPath(); x.roundRect(90, Y, w - 180, H2, 56); x.fill(); };
    // 위쪽 38%는 시계 자리로 비워 둬요
    const b = budget(), B = +b.budget || 0, ym = ymd(t0).slice(0, 7), last = new Date(t0.getFullYear(), t0.getMonth() + 1, 0).getDate();
    const es = typeof withFixed === 'function' ? withFixed(b.entries) : b.entries;
    const spent = es.filter(e => e && e.type === 'out' && e.date && e.date.startsWith(ym)).reduce((s, e) => s + (+e.amt || 0), 0);
    const fxLeft = fixed().filter(f => (f.cycle !== 'year' || +f.month === t0.getMonth() + 1) && Math.min(+f.day, last) > t0.getDate()).reduce((s, f) => s + (+f.amt || 0), 0);
    let Y = 960; card(Y, 420);
    if (B) { const room = B - spent - fxLeft, per = room / (last - t0.getDate() + 1);
      T(`${t0.getMonth() + 1}월에 더 쓸 수 있는 돈`, 160, Y + 110, 46, 600, S.mu); T(W(Math.max(0, room)), 160, Y + 235, 112, 800, room < 0 ? '#FF8A80' : S.tx);
      T(room > 0 ? `오늘부터 하루 ${W(per)}씩 쓰면 돼요` : `예산을 ${W(-room)} 넘었어요`, 160, Y + 330, 44, 600, S.ac);
    } else { T(`${t0.getMonth() + 1}월에 쓴 돈`, 160, Y + 110, 46, 600, S.mu); T(W(spent), 160, Y + 235, 112, 800); T('가계부에서 예산을 정하면 남은 돈을 보여 줘요', 160, Y + 330, 40, 600, S.ac); }
    Y += 470;
    const top = D.slice(0, 3); if (top.length) { const cw = (w - 180 - 40 * (top.length - 1)) / top.length; top.forEach((d, i) => { const X = 90 + i * (cw + 40); x.fillStyle = S.card; x.beginPath(); x.roundRect(X, Y, cw, 220, 48); x.fill(); T(dTxt(d.d), X + cw / 2, Y + 105, 64, 800, d.d <= 3 ? S.ac : S.tx, 'center'); T(String(d.name).slice(0, 7), X + cw / 2, Y + 172, 38, 600, S.mu, 'center'); }); Y += 270; }
    card(Y, 720); T(`돈 습관 ${t0.getMonth() + 1}월`, 160, Y + 100, 46, 700); T(`${pct}%`, w - 160, Y + 100, 46, 800, S.ac, 'right');
    const fd = new Date(t0.getFullYear(), t0.getMonth(), 1).getDay(), cs = 128, gx = (w - cs * 7) / 2;
    for (let d = 1; d <= last; d++) { const p = fd + d - 1, cx = gx + (p % 7) * cs, cy = Y + 150 + Math.floor(p / 7) * 92, dt = new Date(t0.getFullYear(), t0.getMonth(), d), r = dt > t0 ? null : H.rate(ymd(dt));
      const lv = r === null ? 0 : r >= 1 ? 4 : r >= .67 ? 3 : r >= .34 ? 2 : r > 0 ? 1 : 0;
      x.fillStyle = S.lv[lv]; x.globalAlpha = dt > t0 ? .45 : 1; x.beginPath(); x.roundRect(cx + 9, cy, cs - 18, 76, 20); x.fill(); x.globalAlpha = 1;
      if (+dt === +t0) { x.strokeStyle = S.tx; x.lineWidth = 5; x.beginPath(); x.roundRect(cx + 9, cy, cs - 18, 76, 20); x.stroke(); }
      T(String(d), cx + cs / 2, cy + 50, 32, 600, lv >= 3 && wpStyle !== 'light' ? S.bg[0] : lv >= 3 ? '#fff' : S.mu, 'center'); }
    T('DONSAM', w / 2, h - 50, 34, 800, S.mu, 'center');
  }
  function saveImg(blob, name, title, msg) {
    const file = new File([blob], name, { type: 'image/png' });
    (async () => {
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000); say(msg);
    })();
  }

  // ── 4. 한 장 결산: 이번 달을 영수증 한 장으로 + 소비 줄이면 1년에 얼마 남는지 ──
  let rcOff = 0;
  function monthStats(off) {
    const t0 = today(), d = new Date(t0.getFullYear(), t0.getMonth() + off, 1), ym = ymd(d).slice(0, 7);
    const es = (typeof withFixed === 'function' ? withFixed(budget().entries) : budget().entries).filter(e => e && e.date && e.date.startsWith(ym));
    const inn = es.filter(e => e.type === 'in').reduce((s, e) => s + (+e.amt || 0), 0), outs = es.filter(e => e.type === 'out'), out = outs.reduce((s, e) => s + (+e.amt || 0), 0);
    const cat = {}; outs.forEach(e => { cat[e.cat || '기타'] = (cat[e.cat || '기타'] || 0) + (+e.amt || 0); });
    const top = Object.entries(cat).sort((a, b) => b[1] - a[1]);
    const lastDay = off < 0 ? new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate() : t0.getDate();
    const spentDays = new Set(outs.filter(e => !e.fx).map(e => e.date)).size;
    const big = outs.slice().sort((a, b) => b.amt - a.amt)[0];
    return { d, ym, inn, out, top, noSpend: Math.max(0, lastDay - spentDays), big, n: outs.length };
  }
  function drawRc() {
    const s = monthStats(rcOff), left = s.inn - s.out, rate = s.inn ? Math.round(left / s.inn * 100) : 0;
    const lines = s.top.slice(0, 5).map(([c, v]) => `<li><span>${E(c)}</span><em>${W(v)}</em></li>`).join('');
    box.innerHTML = `<div class="pro-mon"><button type="button" data-o="-1"${rcOff <= -11 ? ' disabled' : ''}>‹</button><b>${s.d.getFullYear()}년 ${s.d.getMonth() + 1}월</b><button type="button" data-o="1"${rcOff >= 0 ? ' disabled' : ''}>›</button></div>` +
      (s.n || s.inn ? `<div class="pro-receipt" id="pro-receipt"><p class="pr-brand">DONSAM · 월간 영수증</p><p class="pr-sub">${s.d.getFullYear()}.${pad(s.d.getMonth() + 1)} ${rcOff === 0 ? `${today().getDate()}일까지 쓴 돈` : '이 달에 쓴 돈'}</p><p class="pr-big">${W(s.out)}</p><hr><ul>${lines}</ul><hr><ul><li><span>수입</span><em>${W(s.inn)}</em></li><li><span>남은 돈</span><em class="${left < 0 ? 'neg' : ''}">${W(left)}</em></li><li><span>저축률</span><em>${s.inn ? rate + '%' : '-'}</em></li><li><span>무지출 데이</span><em>${s.noSpend}일</em></li>${s.big ? `<li><span>가장 큰 지출</span><em>${E((s.big.memo || s.big.cat || '').slice(0, 10))} ${W(s.big.amt)}</em></li>` : ''}</ul><div class="pr-code" aria-hidden="true"></div><p class="pr-foot">doncalculator.com</p></div><button type="button" class="btn fill wide" id="pro-share">이미지로 저장 · 공유</button>` : `<p class="pro-empty">이 달에 적은 기록이 없어요. 캘린더에 쓴 돈을 적으면 영수증 한 장으로 정리해 드려요.</p>` + example('rc')) +
      (s.top.length ? `<h3 class="pro-h">소비 감소 시뮬레이터</h3><p class="pro-cap">줄일 비율을 움직여 보세요.</p><div class="pro-sim">${s.top.slice(0, 3).map(([c, v], i) => `<label><span>${E(c)} <small>월 ${W(v)}</small></span><input type="range" min="0" max="50" step="5" value="${i ? 10 : 20}" data-v="${v}"><b>0%</b></label>`).join('')}</div><div class="pro-ok" id="pro-simr"></div>` : '');
    box.querySelectorAll('.pro-mon button').forEach(b => b.addEventListener('click', () => { rcOff += +b.dataset.o; drawRc(); }));
    const sim = () => { let m = 0; box.querySelectorAll('.pro-sim input').forEach(r => { r.nextElementSibling.textContent = r.value + '%'; m += +r.dataset.v * r.value / 100; }); const o = $('pro-simr'); if (o) o.innerHTML = `한 달에 <b>${W(m)}</b>, 1년이면 <b>${W(m * 12)}</b>이 남아요.`; };
    box.querySelectorAll('.pro-sim input').forEach(r => r.addEventListener('input', sim)); sim();
    const sh = $('pro-share'); if (sh) sh.addEventListener('click', () => shareReceipt(s));
  }
  function shareReceipt(s) {
    const W2 = 720, rows = s.top.slice(0, 5), H = 760 + rows.length * 56, c = document.createElement('canvas'); c.width = W2; c.height = H;
    const x = c.getContext('2d'), FF = '"Pretendard Variable", Pretendard, -apple-system, sans-serif', left = s.inn - s.out;
    x.fillStyle = '#7040A1'; x.fillRect(0, 0, W2, H); x.fillStyle = '#FBFAF7'; x.beginPath(); x.roundRect(48, 48, W2 - 96, H - 96, 16); x.fill();
    const txt = (t, y, size, w = 600, col = '#1D1D1F', al = 'center', xx = W2 / 2) => { x.fillStyle = col; x.font = `${w} ${size}px ${FF}`; x.textAlign = al; x.fillText(t, xx, y); };
    txt('DONSAM · 월간 영수증', 120, 26, 700, '#7040A1'); txt(`${s.d.getFullYear()}.${pad(s.d.getMonth() + 1)} 이 달에 쓴 돈`, 162, 24, 500, '#6E6E73'); txt(W(s.out), 236, 58, 800);
    const dash = y => { x.strokeStyle = '#C7C7CC'; x.setLineDash([8, 6]); x.beginPath(); x.moveTo(90, y); x.lineTo(W2 - 90, y); x.stroke(); x.setLineDash([]); };
    dash(276); let y = 330;
    rows.forEach(([c2, v]) => { txt(c2, y, 26, 500, '#1D1D1F', 'left', 96); txt(W(v), y, 26, 700, '#1D1D1F', 'right', W2 - 96); y += 56; });
    dash(y - 20); y += 30;
    [['수입', W(s.inn)], ['남은 돈', W(left)], ['저축률', s.inn ? Math.round(left / s.inn * 100) + '%' : '-'], ['무지출 데이', s.noSpend + '일']].forEach(([a, b]) => { txt(a, y, 26, 500, '#6E6E73', 'left', 96); txt(b, y, 26, 700, a === '남은 돈' && left < 0 ? '#D93025' : '#1D1D1F', 'right', W2 - 96); y += 52; });
    for (let i = 0; i < 64; i++) { x.fillStyle = '#1D1D1F'; const bw = (i * 7) % 3 + 1; x.fillRect(110 + i * 7.8, y + 10, bw, 60); }
    txt('doncalculator.com', y + 110, 22, 600, '#7040A1');
    c.toBlob(async blob => {
      const file = new File([blob], `donsem-${s.ym}.png`, { type: 'image/png' });
      try { if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: '돈셈 월간 영수증' }); return; } } catch (e) { if (e && e.name === 'AbortError') return; }
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = file.name; document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
      say('영수증 이미지를 저장했어요 🧾');
    }, 'image/png');
  }

  // 기록이 없을 때 보여 주는 예시 (흐리게, 「예시」 표시)
  function example(k) {
    const ex = {
      an: `<div class="pro-panel pro-ex"><span class="pro-extag">예시</span><div class="pro-kpis"><div><span>18일까지 쓴 돈</span><b>1,236,000원</b></div><div><span>30일 예상</span><b>1,980,000원</b></div></div>${cumChart([40, 52, 90, 120, 180, 230, 260, 300, 410, 470, 520, 600, 690, 760, 900, 1010, 1120, 1236].map(v => v * 1000), [30, 80, 110, 170, 220, 300, 330, 380, 450, 520, 610, 700, 760, 820, 930, 1050, 1150, 1260, 1330, 1400, 1480, 1560, 1600, 1680, 1750, 1810, 1870, 1900, 1950, 2010].map(v => v * 1000), 30, 1980000)}</div>` +
        `<ul class="an-rep pro-ex"><li><span class="ic">💧</span><div><b>돈 샌 곳</b><span>쇼핑이 지난달 같은 기간보다 18% 늘었어요 (+48,000원)</span></div></li><li><span class="ic">🎯</span><div><b>다음 달 추천 예산</b><span>최근 3달 평균으로 보면 1,950,000원 정도가 알맞아요</span></div></li></ul>`,
      fc: `<div class="pro-panel pro-ex"><span class="pro-extag">예시</span><div class="pro-kpis"><div><span>월급 전날 (12/24)</span><b>412,000원</b></div><div><span>가장 적을 때 (12/23)</span><b>298,000원</b></div></div>${chart([1200, 1100, 980, 900, 760, 700, 640, 520, 430, 300, 2900, 2800, 2650, 2500].map(v => v * 1000), 1300000)}</div>`,
      rp: `<ul class="pro-list pro-ex"><li><span><b>영상 구독</b><small>매달 5일쯤 · 3달 연속</small></span><em>17,000원</em></li><li><span><b>클라우드 저장소</b><small>매달 12일쯤 · 4달 연속</small></span><em>2,900원</em></li><li><span><b>헬스장</b><small>매달 25일쯤 · 2달 연속</small></span><em>75,000원</em></li><span class="pro-extag">예시</span></ul>`,
      cd: `<ul class="pro-cards pro-ex"><li class="pro-card-row"><div class="pro-card-top"><b>생활 혜택 카드</b><span>82,000원 남음</span></div><div class="pro-bar"><i style="width:73%"></i></div><small>218,000원 / 300,000원 · 식비·카페·쇼핑</small></li><span class="pro-extag">예시</span></ul>`,
      rc: `<div class="pro-receipt pro-ex"><span class="pro-extag">예시</span><p class="pr-brand">DONSAM · 월간 영수증</p><p class="pr-big">1,284,500원</p><hr><ul><li><span>식비</span><em>412,000원</em></li><li><span>쇼핑</span><em>268,000원</em></li><li><span>교통</span><em>96,000원</em></li></ul></div>`,
    };
    return ex[k] || '';
  }

  function draw() {
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === tab)));
    ({ an: drawAn, fc: drawFc, rp: drawRp, cd: drawCd, ye: drawYe, rc: drawRc, hb: drawHb })[tab]();
    ping(tab);
  }
  // Pro 탭을 처음 열 때 그려요
  const sec = $('pro');
  let drawn = false;
  const maybe = () => { if (!drawn && sec && !sec.hidden && sec.offsetParent !== null) { drawn = true; draw(); } };
  new MutationObserver(maybe).observe(document.body, { attributes: true, subtree: true, attributeFilter: ['hidden', 'class'] });
  window.addEventListener('hashchange', () => setTimeout(maybe, 50));
  window.addEventListener('storage', e => { if (drawn && /^donsem:(budget|fixed|pro)$/.test(e.key || '')) draw(); });
  setTimeout(maybe, 300);
  // ── (무료) 경조사 장부: 주고받은 경조사비를 적어 두고 이름으로 찾아봐요 ──
  const EK = 'donsem:events';
  const evs = () => { const a = rd(EK); return Array.isArray(a) ? a : []; };
  function drawEv() {
    const L = $('ev-list'); if (!L) return;
    const q = norm(($('ev-q') || {}).value || ''), all = evs().slice().sort((a, b) => b.date.localeCompare(a.date));
    const list = q ? all.filter(e => norm(e.name).includes(q) || norm(e.memo).includes(q)) : all;
    const give = all.filter(e => e.dir === 'out').reduce((s, e) => s + e.amt, 0), got = all.filter(e => e.dir === 'in').reduce((s, e) => s + e.amt, 0);
    $('ev-sum').innerHTML = all.length ? `<div class="pro-kpis ev-kpis"><div><span>낸 돈 (${all.filter(e => e.dir === 'out').length}건)</span><b>${W(give)}</b></div><div><span>받은 돈 (${all.filter(e => e.dir === 'in').length}건)</span><b>${W(got)}</b></div></div>` : '';
    L.innerHTML = list.length ? `<ul class="pro-list">${list.slice(0, 50).map(e => `<li><span><b>${E(e.name)} <small class="ev-tag">${E(e.rel)} · ${E(e.kind)}</small></b><small>${e.date.replace(/-/g, '.')}${e.memo ? ' · ' + E(e.memo) : ''}</small></span><em class="${e.dir === 'in' ? 'plus' : ''}">${e.dir === 'in' ? '+' : '−'}${W(e.amt)}</em><button type="button" class="pro-x ev-x" data-id="${E(e.id)}" aria-label="지우기">×</button></li>`).join('')}</ul>` : `<p class="pro-empty">${q ? '찾는 이름이 없어요.' : '아직 적은 경조사가 없어요. 결혼식·장례식·돌잔치에 낸 돈과 받은 돈을 적어 두면, 나중에 「그때 얼마 했더라?」를 바로 찾을 수 있어요.'}</p>`;
    L.querySelectorAll('.ev-x').forEach(b => b.addEventListener('click', () => { wr(EK, evs().filter(e => e.id !== b.dataset.id)); drawEv(); }));
  }
  (() => {
    const form = $('ev-form'); if (!form) return;
    const dt = $('ev-date'); if (dt && !dt.value) dt.value = ymd(today());
    let dir = 'out';
    form.querySelectorAll('.ev-dir button').forEach(b => b.addEventListener('click', () => { dir = b.dataset.v; form.querySelectorAll('.ev-dir button').forEach(x => x.classList.toggle('on', x === b)); $('ev-book-wrap').hidden = dir !== 'out'; }));
    const amt = $('ev-amt'); amt.addEventListener('input', () => { const n = num(amt.value); amt.value = n ? n.toLocaleString('ko-KR') : ''; });
    $('ev-add').addEventListener('click', () => {
      const name = $('ev-name').value.trim(), a = num(amt.value), date = $('ev-date').value || ymd(today());
      if (!name || !a) return say('이름과 금액을 넣어 주세요.');
      const e = { id: Date.now().toString(36), date, name: name.slice(0, 20), rel: $('ev-rel').value, kind: $('ev-kind').value, dir, amt: a, memo: $('ev-memo').value.trim().slice(0, 30) };
      const all = evs(); all.push(e); wr(EK, all);
      if (dir === 'out' && $('ev-book').checked) { const b = rd('donsem:budget') || { entries: [] }; if (!Array.isArray(b.entries)) b.entries = []; b.entries.push({ id: 'ev' + e.id, type: 'out', cat: '경조사', amt: a, date, memo: `${name} ${e.kind}`.slice(0, 40) }); wr('donsem:budget', b); }
      $('ev-name').value = ''; amt.value = ''; $('ev-memo').value = '';
      say(dir === 'out' && $('ev-book').checked ? '경조사 장부와 가계부에 같이 적었어요.' : '경조사 장부에 적었어요.'); drawEv();
    });
    const q = $('ev-q'); if (q) q.addEventListener('input', drawEv);
    drawEv();
  })();

  // ── (무료) 1초 기록: /budget/?add=점심 12000 으로 열면 바로 기록 창이 떠요 (아이폰 단축어·뒷면 탭·카드 문자 자동화용) ──
  function cleanSms(t) {
    t = String(t || '').trim();
    if (!/원/.test(t) || !/(승인|결제|사용|출금|체크)/.test(t)) return t;
    if (/취소/.test(t)) return '';
    const amt = (t.match(/([\d,]{3,})\s*원/) || [])[1]; if (!amt) return t;
    const cand = t.split(/[\n\r]+|\s{2,}/).map(s => s.trim()).filter(s => s && !/(카드|승인|원|Web발신|웹발신|누적|잔액|일시불|할부|\d{1,2}\/\d{1,2}|\d{1,2}:\d{2}|\*)/.test(s));
    const shop = (cand[cand.length - 1] || '').slice(0, 20);
    return shop ? `${shop} ${amt.replace(/,/g, '')}` : `카드 ${amt.replace(/,/g, '')}`;
  }
  (() => {
    const p = new URLSearchParams(location.search); if (!p.has('add')) return;
    const text = cleanSms(p.get('add'));
    history.replaceState(null, '', location.pathname + location.hash);
    if (text === '') return say('취소 문자라서 기록하지 않았어요.');
    let n = 0; const go = () => {
      if (typeof window.openQuickAdd !== 'function') { if (n++ < 20) setTimeout(go, 150); return; }
      window.openQuickAdd();
      const ta = document.querySelector('.qa .qa-text'); if (!ta || !text) return;
      ta.value = text; ta.dispatchEvent(new Event('input', { bubbles: true })); ping('url');
    };
    setTimeout(go, 200);
  })();
  document.querySelectorAll('[data-copy]').forEach(b => b.addEventListener('click', () => {
    const v = b.dataset.copy; (navigator.clipboard ? navigator.clipboard.writeText(v) : Promise.reject()).then(() => say('주소를 복사했어요. 단축어 「URL 열기」에 붙여 넣으세요.'), () => prompt('이 주소를 복사하세요', v));
  }));

  // ── Pro 딸깍: 거래내역 캡처·영수증 사진을 올리면 AI가 읽어서 가계부에 한 번에 넣어요 ──
  (() => {
    const wrap = $('pro-scan'); if (!wrap) return;
    const CK = 'donsem:ai-ok', MAXF = 5;
    let rows = [];
    const agreed = () => { try { return localStorage.getItem(CK) === '1'; } catch (e) { return false; } };
    wrap.innerHTML = `<div class="sc-card"><div class="sc-top"><span class="sc-ic" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8V6a2 2 0 0 1 2-2h2M16 4h2a2 2 0 0 1 2 2v2M20 16v2a2 2 0 0 1-2 2h-2M8 20H6a2 2 0 0 1-2-2v-2M8 12h8M12 8v8"/></svg></span><span><b>캡처로 한 번에 기록</b><small>토스·카드·은행 거래내역 캡처나 영수증 사진을 올리면 AI가 읽어서 가계부에 넣어 줘요</small></span></div>
      <div class="sc-agree" id="sc-agree"${agreed() ? ' hidden' : ''}><p>사진은 내용을 읽는 데만 쓰고 돈셈은 저장하지 않아요. 읽기는 미국 Anthropic의 AI(Claude)가 하며, 사진이 그 서버로 보내져요. <a href="/privacy/#ai">자세히</a></p><label><input type="checkbox" id="sc-ok"> 위 내용(개인정보 국외 이전)에 동의해요</label></div>
      <label class="btn fill wide sc-btn" id="sc-pick"><input type="file" id="sc-file" accept="image/*" multiple class="sr-only">캡처 올리기 <small>(한 번에 ${MAXF}장까지)</small></label>
      <p class="sc-msg" id="sc-msg" aria-live="polite"></p><div id="sc-review"></div></div>`;
    const msg = t => { $('sc-msg').textContent = t; };
    const okBox = $('sc-ok'); if (okBox) okBox.addEventListener('change', () => { try { localStorage.setItem(CK, okBox.checked ? '1' : '0'); } catch (e) { /* 괜찮아요 */ } });
    $('sc-pick').addEventListener('click', e => { if (!agreed()) { e.preventDefault(); say('먼저 아래 동의에 체크해 주세요.'); $('sc-agree').hidden = false; } });
    // 긴 쪽을 1568px로 줄여서 보내요 (글자는 그대로 읽히고, 보내는 양·AI 사용료가 줄어요)
    const shrink = file => new Promise((res, rej) => {
      const u = URL.createObjectURL(file), im = new Image();
      im.onload = () => { const k = Math.min(1, 1568 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); res(c.toDataURL('image/jpeg', 0.85).split(',')[1]); };
      im.onerror = () => { URL.revokeObjectURL(u); rej(new Error('img')); };
      im.src = u;
    });
    const dupOf = it => { const es = budget().entries; return es.some(e => e && e.type === it.type && e.date === it.date && +e.amt === it.amt); };
    $('sc-file').addEventListener('change', async e => {
      const files = [...e.target.files].slice(0, MAXF); e.target.value = '';
      if (!files.length) return;
      $('sc-agree').hidden = true;
      const btn = $('sc-pick'); btn.classList.add('busy');
      const got = []; let err = '';
      for (let i = 0; i < files.length; i++) {
        msg(`AI가 캡처를 읽고 있어요… (${i + 1}/${files.length}) 한 장에 10~20초쯤 걸려요`);
        try {
          const img = await shrink(files[i]);
          const r = await fetch(API + '/ai/scan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ img, type: 'image/jpeg' }) });
          const j = await r.json().catch(() => ({}));
          if (!r.ok) { err = j.message || '읽지 못했어요.'; if (r.status === 429 || r.status === 503) break; continue; }
          (j.items || []).forEach(x => got.push(x));
        } catch (er) { err = '사진을 열지 못했어요. 다른 캡처로 해 주세요.'; }
      }
      btn.classList.remove('busy'); ping('scan');
      // 같은 캡처를 두 번 올려도 한 번만 보이게
      const seen = new Set(); rows = got.filter(x => { const k = `${x.date}|${x.type}|${x.amt}|${x.shop}`; if (seen.has(k)) return false; seen.add(k); return true; }).map(x => Object.assign(x, { on: !dupOf(x), dup: dupOf(x) }));
      msg(rows.length ? `${rows.length}건을 찾았어요. 확인하고 넣어 주세요.${err ? ' (' + err + ')' : ''}` : err || '거래를 찾지 못했어요. 거래내역이 잘 보이게 캡처해 주세요.');
      drawReview();
    });
    function drawReview() {
      const box2 = $('sc-review'); if (!rows.length) { box2.innerHTML = ''; return; }
      const n = rows.filter(r => r.on).length, sum = rows.filter(r => r.on && r.type === 'out').reduce((s, r) => s + r.amt, 0);
      box2.innerHTML = `<ul class="sc-list">${rows.map((r, i) => `<li class="${r.on ? '' : 'off'}"><input type="checkbox" data-i="${i}" ${r.on ? 'checked' : ''} aria-label="${E(r.shop)} 넣기"><span class="sc-t"><b>${E(r.shop || (r.type === 'in' ? '입금' : '지출'))}</b><small>${r.date.slice(5).replace('-', '/')}${r.dup ? ' · 이미 적은 것 같아요' : ''}</small></span><select data-i="${i}" aria-label="분류">${(r.type === 'in' ? ['월급', '용돈', '부수입', '이자·배당', '기타'] : ['식비', '카페·간식', '교통', '쇼핑', '생활', '주거·통신', '구독', '의료', '문화·여가', '경조사', '기타']).map(c => `<option${c === r.cat ? ' selected' : ''}>${c}</option>`).join('')}</select><em class="${r.type === 'in' ? 'plus' : ''}">${r.type === 'in' ? '+' : '−'}${W(r.amt)}</em></li>`).join('')}</ul>` +
        `<div class="sc-act"><button type="button" class="btn line" id="sc-cancel">취소</button><button type="button" class="btn fill" id="sc-save"${n ? '' : ' disabled'}>${n}건 가계부에 넣기</button></div>${sum ? `<p class="sc-sum">고른 지출 합계 ${W(sum)}</p>` : ''}`;
      box2.querySelectorAll('input[type=checkbox]').forEach(c => c.addEventListener('change', () => { rows[+c.dataset.i].on = c.checked; drawReview(); }));
      box2.querySelectorAll('select').forEach(s => s.addEventListener('change', () => { rows[+s.dataset.i].cat = s.value; }));
      $('sc-cancel').addEventListener('click', () => { rows = []; msg(''); drawReview(); });
      $('sc-save').addEventListener('click', () => {
        const b = rd('donsem:budget') || { entries: [] }; if (!Array.isArray(b.entries)) b.entries = [];
        const add = rows.filter(r => r.on).map((r, i) => ({ id: 'ai' + Date.now().toString(36) + i, type: r.type, cat: r.cat, amt: r.amt, date: r.date, memo: (r.shop || '').slice(0, 40) }));
        b.entries.push(...add);
        if (!wr('donsem:budget', b)) return say('저장하지 못했어요. 저장 공간을 확인해 주세요.');
        rows = []; drawReview(); msg(`✓ ${add.length}건을 가계부에 넣었어요. 캘린더에서 확인해 보세요.`); say(`${add.length}건을 가계부에 넣었어요 ✨`);
        window.dispatchEvent(new StorageEvent('storage', { key: 'donsem:budget' })); // 다른 화면(캘린더·분석)도 다시 그려요
        if (drawn) draw();
      });
    }
  })();

  const like = $('pro-like');
  if (like) like.addEventListener('click', () => { ping('like'); like.disabled = true; like.textContent = '고마워요! 의견이 잘 전해졌어요 💜'; });
})();
