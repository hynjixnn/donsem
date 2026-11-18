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
    ({ an: drawAn, fc: drawFc, rp: drawRp, cd: drawCd, ye: drawYe, rc: drawRc })[tab]();
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

  const like = $('pro-like');
  if (like) like.addEventListener('click', () => { ping('like'); like.disabled = true; like.textContent = '고마워요! 의견이 잘 전해졌어요 💜'; });
})();
