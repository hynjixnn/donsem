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
    ['fc', '앞으로의 돈', '<path d="M4 19V5M4 19h16M7 14l4-4 3 3 5-6"/>'],
    ['rp', '반복 결제', '<path d="M17 2l3 3-3 3M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3M20 13v2a4 4 0 0 1-4 4H4"/>'],
    ['cd', '카드 실적', '<rect x="3" y="5.5" width="18" height="13" rx="2.5"/><path d="M3 10h18M7 15h4"/>'],
    ['rc', '한 장 결산', '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6"/>'],
  ];
  let tab = 'fc';
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
    const daily = recent.reduce((s, e) => s + (+e.amt || 0), 0) / 30;
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
    box.innerHTML = head + `<div class="pro-panel"><div class="pro-kpis"><div><span>${pay ? `월급 들어오기 직전 (${md(new Date(pay.d))})` : '30일 뒤'}</span><b>${W(pay ? pay.v : f.pts[29])}</b></div><div><span>가장 적을 때 (${md(new Date(f.low.d))})</span><b class="${f.low.v < 0 ? 'neg' : ''}">${W(f.low.v)}</b></div></div>${chart(f.pts, f.start)}<p class="pro-cap">오늘 → 90일 뒤 · 평소 지출 하루 약 ${W(f.daily)} · 월급 ${f.salary ? W(f.salary) : '미입력'}</p></div>` + warn +
      (needPay ? `<p class="pro-note">💡 캘린더에서 월급날을 정하면 월급 들어오는 날도 반영돼요.</p>` : '') +
      `<h3 class="pro-h">다가오는 고정 지출</h3>` + (up.length ? `<ul class="pro-list">${up.map(e => `<li><span><b>${E(e.name)}</b><small>${md(new Date(e.d))}</small></span><em>−${W(e.amt)}</em></li>`).join('')}</ul>` : `<p class="pro-empty">고정지출 탭에 월세·통신비·구독을 적으면 날짜에 맞춰 빠져요.</p>`);
    bindFc();
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
      fc: `<div class="pro-panel pro-ex"><span class="pro-extag">예시</span><div class="pro-kpis"><div><span>월급 전날 (12/24)</span><b>412,000원</b></div><div><span>가장 적을 때 (12/23)</span><b>298,000원</b></div></div>${chart([1200, 1100, 980, 900, 760, 700, 640, 520, 430, 300, 2900, 2800, 2650, 2500].map(v => v * 1000), 1300000)}</div>`,
      rp: `<ul class="pro-list pro-ex"><li><span><b>영상 구독</b><small>매달 5일쯤 · 3달 연속</small></span><em>17,000원</em></li><li><span><b>클라우드 저장소</b><small>매달 12일쯤 · 4달 연속</small></span><em>2,900원</em></li><li><span><b>헬스장</b><small>매달 25일쯤 · 2달 연속</small></span><em>75,000원</em></li><span class="pro-extag">예시</span></ul>`,
      cd: `<ul class="pro-cards pro-ex"><li class="pro-card-row"><div class="pro-card-top"><b>생활 혜택 카드</b><span>82,000원 남음</span></div><div class="pro-bar"><i style="width:73%"></i></div><small>218,000원 / 300,000원 · 식비·카페·쇼핑</small></li><span class="pro-extag">예시</span></ul>`,
      rc: `<div class="pro-receipt pro-ex"><span class="pro-extag">예시</span><p class="pr-brand">DONSAM · 월간 영수증</p><p class="pr-big">1,284,500원</p><hr><ul><li><span>식비</span><em>412,000원</em></li><li><span>쇼핑</span><em>268,000원</em></li><li><span>교통</span><em>96,000원</em></li></ul></div>`,
    };
    return ex[k] || '';
  }

  function draw() {
    seg.querySelectorAll('button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === tab)));
    ({ fc: drawFc, rp: drawRp, cd: drawCd, rc: drawRc })[tab]();
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
  const like = $('pro-like');
  if (like) like.addEventListener('click', () => { ping('like'); like.disabled = true; like.textContent = '고마워요! 의견이 잘 전해졌어요 💜'; });
})();
