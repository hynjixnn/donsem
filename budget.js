// 돈셈 가계부: 기록은 이 기기의 브라우저(localStorage)에만 저장해요. 서버로 보내지 않아요.
(() => {
  const KEY = 'donsem:budget';
  const CATS = {
    out: ['식비', '카페·간식', '교통', '쇼핑', '생활', '주거·통신', '구독', '의료', '문화·여가', '경조사', '기타'],
    in: ['월급', '용돈', '부수입', '이자·배당', '기타'],
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const W = '일월화수목금토';

  // 분류별 예산: { 식비: 400000, ... } (지출 분류만, 0원은 빼요)
  const cleanCats = c => { const o = {}; if (c && typeof c === 'object') CATS.out.forEach(k => { const v = Math.round(Number(c[k])); if (v > 0) o[k] = v; }); return o; };
  const cleanPay = p => (p && p.day >= 1 && p.day <= 32 ? { day: Math.round(p.day), early: p.early !== false } : null);
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.entries)) return { entries: d.entries, budget: Number(d.budget) || 0, cats: cleanCats(d.cats), payday: cleanPay(d.payday) };
    } catch (e) { /* 저장된 게 없거나 망가진 경우 */ }
    return { entries: [], budget: 0, cats: {} };
  }
  function save() {
    try { if (window.donsemSubSync) window.donsemSubSync(data.entries); } catch (e) { /* 괜찮아요 */ } // 구독 기록은 고정지출과 맞춰요
    try { localStorage.setItem(KEY, JSON.stringify(data)); window.dispatchEvent(new Event('donsem:budget')); return true; }
    catch (e) { toast('이 브라우저에서는 저장할 수 없어요. 개인정보 보호 모드인지 확인해 주세요.'); return false; }
  }

  let data = load();
  const today = new Date();
  let month = iso(today).slice(0, 7); // 보고 있는 달 (YYYY-MM)
  let type = 'out', cat = CATS.out[0], editingBudget = false, editingCats = false, editingPay = false;
  let dsPop = false, dsIn = false; // 휴대폰: 날짜를 누르면 그날 한 장이 아래에서 올라와요
  const phone = matchMedia('(max-width: 640px)');
  let view = 'cal', selDay = iso(today); // 내역을 달력으로 볼지 목록으로 볼지, 달력에서 고른 날
  try { const k = sessionStorage.getItem('donsem:selday'); if (k && /^\d{4}-\d{2}-\d{2}$/.test(k)) { selDay = k; month = k.slice(0, 7); } sessionStorage.removeItem('donsem:selday'); } catch (e) { /* 기본은 오늘 */ } // 달력에서 다른 날에 기록하고 돌아오면 그 날을 다시 보여 줘요
  // 달력/목록 고르기는 없앴어요: 늘 달력으로 보여요 (2026-11-11)

  // ── 기록하기 ──
  function drawCats() {
    $('b-cats').innerHTML = CATS[type].map(c => `<button type="button" class="${c === cat ? 'on' : ''}" data-cat="${esc(c)}">${catIcon(c)}${esc(c)}</button>`).join('');
  }
  $('b-type').addEventListener('click', e => {
    const v = e.target.closest && e.target.closest('[data-v]') && e.target.closest('[data-v]').dataset.v;
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
    if (amt > MAX_REC) { err.textContent = '1,000억 원보다 큰 금액은 넣을 수 없어요. 숫자를 다시 확인해 주세요.'; $('b-amt').focus(); return; }
    if (!date) { err.textContent = '날짜를 골라 주세요.'; return; }
    err.textContent = '';
    const before = budgetStreak(data.entries);
    data.entries.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), type, amt, cat, date, memo: $('b-memo').value.trim().slice(0, 40) });
    if (!save()) return;
    month = date.slice(0, 7); selDay = date; // 방금 기록한 날을 달력에서 보여 줘요
    $('b-amt').value = ''; $('b-memo').value = '';
    $('b-amt').dispatchEvent(new Event('input', { bubbles: true }));
    $('b-amt').focus();
    render();
    toast(streakCheer(before, data.entries) || `${cat} ${won(amt)}을 기록했어요.`);
    markDailyFull();
  }
  $('b-save').addEventListener('click', addEntry);
  ['b-amt', 'b-memo'].forEach(id => $(id).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); addEntry(); } }));
  $('b-amt').addEventListener('input', () => { $('b-err').textContent = ''; });

  // ── 달 넘기기 ──
  document.querySelectorAll('.month-nav [data-m]').forEach(b => b.addEventListener('click', () => {
    const [y, m] = month.split('-').map(Number);
    goMonth(iso(new Date(y, m - 1 + Number(b.dataset.m), 1)).slice(0, 7));
  }));
  function goMonth(ym, day) {
    dsPop = false; month = ym; selDay = day || (month === iso(today).slice(0, 7) ? iso(today) : null); editingBudget = false; render();
  }

  // ── 그리기 ──
  function render() {
    const [y, m] = month.split('-').map(Number);
    $('b-month').textContent = `${y}년 ${m}월`;
    const list = data.entries.filter(e => e.date.startsWith(month));
    const sumIn = list.filter(e => e.type === 'in').reduce((s, e) => s + e.amt, 0);
    const sumOut = list.filter(e => e.type === 'out').reduce((s, e) => s + e.amt, 0), outAll = sumOut + fixedPaid(y, m); // 이미 지난 고정지출도 쓴 돈이에요
    setRoll($('b-in'), won(sumIn));
    setRoll($('b-out'), won(outAll));
    setRoll($('b-left'), (sumIn - outAll < 0 ? '-' : '') + won(Math.abs(sumIn - outAll)));
    $('b-left').classList.toggle('minus', sumIn - outAll < 0);
    drawBudget(outAll, y, m, list);
    drawPayday();
    drawStreak();
    drawUpcoming();
    drawList(list);
    drawBreakdown(list, sumOut);
    drawCatBudget(list);
    drawTrend(y, m);
    drawWrap(list, y, m, sumOut);
    drawRank();
  }
  // 내 자산 흐름 (뱅크샐러드 위젯처럼): 순자산 추이 · 자산 순위 · 투자 비율 · 비상금
  function drawRank() {
    const el = $('a-flow');
    let a = null;
    try { a = JSON.parse(localStorage.getItem('donsem:assets')); } catch (e) { a = null; }
    if (!el) return;
    if (!a || !Array.isArray(a.items) || !a.items.length) { el.innerHTML = ''; return; }
    const sum = f => a.items.filter(f).reduce((s, x) => s + (Number(x.amt) || 0), 0);
    const as = sum(x => x.kind !== 'debt'), de = sum(x => x.kind === 'debt'), net = as - de;
    // ① 순자산 추이: 최근 12달 (적지 않은 달은 건너뛰어요)
    const h = a.history && typeof a.history === 'object' ? a.history : {}, ks = Object.keys(h).sort().slice(-12);
    let chart = '<p class="fw-empty">한 달에 한 번 금액을 고치면 막대가 쌓여요</p>';
    if (ks.length) {
      const top = Math.max(1, ...ks.map(k => Math.max(h[k].a || 0, h[k].d || 0))), W = 300, H = 110, bw = W / ks.length;
      const y = v => H - 14 - Math.max(0, v) / top * (H - 24);
      const bars = ks.map((k, i) => `<rect x="${(i * bw + bw * 0.18).toFixed(1)}" y="${y(h[k].a || 0).toFixed(1)}" width="${(bw * 0.38).toFixed(1)}" height="${(H - 14 - y(h[k].a || 0)).toFixed(1)}" rx="2" class="fw-a"/><rect x="${(i * bw + bw * 0.56).toFixed(1)}" y="${y(h[k].d || 0).toFixed(1)}" width="${(bw * 0.26).toFixed(1)}" height="${(H - 14 - y(h[k].d || 0)).toFixed(1)}" rx="2" class="fw-d"/>`).join('');
      const pts = ks.map((k, i) => [(i * bw + bw / 2).toFixed(1), y((h[k].a || 0) - (h[k].d || 0)).toFixed(1)]);
      const labels = ks.map((k, i) => (i === 0 || i === ks.length - 1 || ks.length <= 6) ? `<text x="${(i * bw + bw / 2).toFixed(1)}" y="${H - 2}">${Number(k.slice(5))}월</text>` : '').join('');
      chart = `<svg class="fw-chart" viewBox="0 0 ${W} ${H}" aria-hidden="true">${bars}<polyline points="${pts.map(p => p.join(',')).join(' ')}" class="fw-line"/>${pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="3" class="fw-dot"/>`).join('')}${labels}</svg>
        <div class="fw-key"><span class="a">자산</span><span class="d">부채</span><span class="n">순자산</span></div>`;
    }
    // ② 순위
    const t = typeof assetTop === 'function' ? assetTop(Math.max(0, net)) : null, yPos = t === null ? 50 : Math.max(8, Math.min(92, t));
    // ③ 투자 자산 비율 (주식·펀드)
    const inv = sum(x => x.kind !== 'debt' && x.cat === '주식·펀드'), ir = as ? inv / as : 0;
    // ④ 비상금: 현금·예금이 최근 석 달 평균 지출의 몇 달 치인지
    const cash = sum(x => x.kind !== 'debt' && (x.cat === '현금·입출금' || x.cat === '예금·적금'));
    const d0 = new Date(today.getFullYear(), today.getMonth() - 3, 1), from = iso(d0), to = iso(new Date(today.getFullYear(), today.getMonth(), 0));
    const spent = data.entries.filter(e => e.type === 'out' && e.date >= from && e.date <= to).reduce((s, e) => s + e.amt, 0) / 3;
    const months = spent ? cash / spent : null;
    const donut = (r, cls) => `<svg class="fw-donut" viewBox="0 0 42 42" aria-hidden="true"><circle cx="21" cy="21" r="15.9" class="fw-ring"/>${r > 0.005 ? `<circle cx="21" cy="21" r="15.9" class="${cls}" stroke-dasharray="${(r * 100).toFixed(1)} ${(100 - r * 100).toFixed(1)}" stroke-dashoffset="25"/>` : ''}</svg>`;
    el.innerHTML = `<p class="fw-title">내 자산 흐름</p><div class="fw-grid">
      <div class="fw fw-wide"><span>순자산 추이</span>${chart}</div>
      <a class="fw" href="/asset-rank/"><span>내 자산 순위 ›</span><svg class="fw-pyr" viewBox="0 0 100 60" aria-hidden="true"><polygon points="50,2 98,58 2,58" class="ar-tri"/><polygon points="50,2 ${(50 + 48 * yPos / 100).toFixed(1)},${(2 + 56 * yPos / 100).toFixed(1)} ${(50 - 48 * yPos / 100).toFixed(1)},${(2 + 56 * yPos / 100).toFixed(1)}" class="ar-top"/><line x1="0" x2="100" y1="${(2 + 56 * yPos / 100).toFixed(1)}" y2="${(2 + 56 * yPos / 100).toFixed(1)}" class="ar-line"/></svg><b>${t === null ? '-' : `상위 ${topText(t)}`}</b><small>우리나라 가구 중</small></a>
      <div class="fw"><span>투자 자산 비율</span>${donut(ir, 'fw-inv')}<b>${(ir * 100).toFixed(1)}%</b><small>주식·펀드 ÷ 전체 자산</small></div>
      <div class="fw"><span>비상금</span><b class="fw-big">${months === null ? '-' : `${months >= 24 ? '24+' : months.toFixed(1)}개월`}</b><small>${months === null ? '가계부에 지출을 적으면 계산해요' : `현금·예금으로 버틸 수 있는 기간 (보통 3~6개월 권장)`}</small></div>
      <div class="fw"><span>부채 비율</span>${donut(as ? Math.min(1, de / as) : 0, 'fw-debt')}<b>${as ? (de / as * 100).toFixed(1) : 0}%</b><small>부채 ÷ 자산</small></div>
    </div>`;
  }


  // ── 월말 돈 결산 카드 (스포티파이 연말 결산처럼) ──
  const NICK = { '식비': '맛집 탐험가 🍚', '카페·간식': '카페 단골손님 ☕', '교통': '프로 이동러 🚌', '쇼핑': '쇼핑 요정 🛍️', '생활': '살림 고수 🧺', '주거·통신': '집이 최고 🏠', '구독': '구독 부자 📺',
    '의료': '건강 지킴이 💊', '문화·여가': '문화생활 러버 🍿', '경조사': '의리파 💌', '기타': '자유로운 영혼 📦' };
  let wrapCache = null, wrapBtn = null;
  function wrapData(list, y, m, sumOut) {
    const outs = list.filter(e => e.type === 'out'), by = {}, cnt = {}, days = {};
    const free = outs.filter(e => !String(e.id).startsWith('fx-')); // 월세·구독 같은 고정지출은 빼고 '내가 고른 지출'로 별명을 정해요
    (free.length ? free : outs).forEach(e => { by[e.cat] = (by[e.cat] || 0) + e.amt; cnt[e.cat] = (cnt[e.cat] || 0) + 1; days[e.date] = (days[e.date] || 0) + e.amt; });
    const [topCat, topAmt] = Object.entries(by).sort((a, b) => b[1] - a[1])[0];
    const [bigDay, bigAmt] = Object.entries(days).sort((a, b) => b[1] - a[1])[0];
    const prevKey = iso(new Date(y, m - 2, 1)).slice(0, 7);
    const isNow = month === iso(today).slice(0, 7), daysIn = isNow ? today.getDate() : new Date(y, m, 0).getDate();
    // 진행 중인 달은 지난달의 같은 기간(1일~오늘 날짜)과 비교해요
    const prev = data.entries.filter(e => e.type === 'out' && e.date.startsWith(prevKey) && (!isNow || Number(e.date.slice(8)) <= daysIn)).reduce((a, e) => a + e.amt, 0);
    let ns = 0;
    try {
      const st = JSON.parse(localStorage.getItem('donsem:nospend'));
      if (st && Array.isArray(st.days)) ns = st.days.filter(d => d.startsWith(month) && !data.entries.some(e => e.type === 'out' && e.date === d && !String(e.id).startsWith('fx-'))).length;
    } catch (e) { ns = 0; }
    return { topCat, topAmt, topCnt: cnt[topCat], bigDay, bigAmt, prev, isNow, daysIn, ns, avg: Math.round(sumOut / daysIn), sumOut, count: outs.length, nick: NICK[topCat] || '알뜰한 사람 🙂' };
  }
  function drawWrap(list, y, m, sumOut) {
    const box = $('b-wrap');
    if (!box) return;
    $('b-wrap-title').textContent = `${m}월 돈 결산`;
    wrapCache = null;
    if (!sumOut) { box.innerHTML = '<p class="empty">지출을 기록하면 이번 달 결산 카드가 만들어져요.</p>'; if (wrapBtn) wrapBtn.hidden = true; return; }
    const w = wrapData(list, y, m, sumOut), [, bm, bd] = w.bigDay.split('-').map(Number);
    const change = w.prev ? Math.round((sumOut - w.prev) / w.prev * 100) : null;
    box.innerHTML = `<div class="wrap-card">
      <span class="wrap-cap">${y}년 ${m}월${w.isNow ? ` · 1일~${today.getDate()}일 (진행 중)` : ''}</span>
      <p class="wrap-nick">이번 달 나는<br><b>${esc(w.nick)}</b></p>
      <div class="wrap-total"><span>총 지출</span><b>${won(sumOut)}</b>${change === null ? '' : `<em class="${change > 0 ? 'up' : 'down'}">${w.isNow ? '지난달 같은 기간' : '지난달'}보다 ${change > 0 ? '▲' : '▼'} ${Math.abs(change)}%</em>`}</div>
      <div class="wrap-grid">
        <div><span>가장 많이 쓴 곳${list.some(e => String(e.id).startsWith('fx-')) ? ' (고정지출 빼고)' : ''}</span><b>${catIcon(w.topCat, 22)}${esc(w.topCat)}</b><small>${won(w.topAmt)} · ${w.topCnt}번</small></div>
        <div><span>가장 많이 쓴 날</span><b>${bm}월 ${bd}일</b><small>${won(w.bigAmt)}</small></div>
        <div><span>하루 평균</span><b>${won(w.avg)}</b><small>지출 ${w.count}건</small></div>
        <div><span>무지출</span><b>${w.ns}일</b><small><a href="/no-spend/">챌린지 하러 가기 ›</a></small></div>
      </div>
    </div>`;
    if (!wrapBtn) {
      wrapBtn = storyButton('결산 카드 인스타 스토리에 올리기', () => wrapCache || (wrapCache = makeWrap()), '돈셈_월말결산.png', `${location.origin}/budget/`);
      wrapBtn.classList.add('wrap-story');
      box.after(wrapBtn);
    }
    wrapBtn.hidden = false;
    clearTimeout(drawWrap.t); drawWrap.t = setTimeout(() => { wrapCache = makeWrap(); }, 700); // 누르자마자 공유 창이 뜨게 미리 그려 둬요
  }
  function makeWrap() {
    const [y, m] = month.split('-').map(Number), list = data.entries.filter(e => e.date.startsWith(month));
    const sumOut = list.filter(e => e.type === 'out').reduce((a, e) => a + e.amt, 0), w = wrapData(list, y, m, sumOut);
    const icon = typeof CAT_ICONS !== 'undefined' && CAT_ICONS[w.topCat] ? catSrc(w.topCat) : '/icons/wrap.webp';
    return storyCard({ kicker: `돈셈 · ${m}월 돈 결산`, title: '이번 달 나는', img: icon, color: '#7d7aff',
      big: w.nick, sub: `총 지출 ${korean(sumOut) || won(sumOut)}${w.prev ? ` · ${w.isNow ? '지난달 같은 기간' : '지난달'}보다 ${sumOut > w.prev ? '▲' : '▼'} ${Math.abs(Math.round((sumOut - w.prev) / w.prev * 100))}%` : ''}`,
      draw: (c, top, { text, round, W }) => { // 많이 쓴 곳 TOP 3 막대 (고정지출 빼고)
        const by = {};
        list.filter(e => e.type === 'out' && !String(e.id).startsWith('fx-')).forEach(e => { by[e.cat] = (by[e.cat] || 0) + e.amt; });
        const r = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3);
        if (!r.length) return 0;
        round(90, top, W - 180, 80 + r.length * 110, 36, 'rgba(255,255,255,.85)');
        text('많이 쓴 곳 TOP 3', 140, top + 64, 34, 700, '#1d1d1f', 'left');
        r.forEach(([cat, amt], i) => {
          const yy = top + 120 + i * 110;
          text(`${i + 1}  ${cat}`, 140, yy + 12, 38, 600, '#1d1d1f', 'left');
          text(korean(amt) || won(amt), W - 140, yy + 12, 34, 600, '#6e6e73', 'right');
          round(140, yy + 34, (W - 280) * amt / r[0][1], 16, 8, '#7d7aff');
        });
        return 80 + r.length * 110;
      },
      boxes: [[`1위 ${w.topCat}`, `${w.topCnt}번`], ['무지출', `${w.ns}일`], ['하루 평균', korean(w.avg) || won(w.avg)]],
      foot: '너의 이번 달 결산은? 👀', link: `${location.origin}/budget/` });
  }

  // ── 연속 기록 ──
  function drawStreak() {
    const st = budgetStreak(data.entries), box = $('b-streak'), rs = restoreInfo(data.entries);
    let head, sub;
    if (st.current) {
      head = `<span class="streak-fire">🔥</span><b>${st.current}일 연속 기록 중</b>`;
      sub = !st.recordedToday ? `오늘 기록하면 ${st.current + 1}일째예요. 놓치지 마세요!`
        : st.next ? `'${st.next[2]}' 배지까지 ${st.next[0] - st.current}일 남았어요` : '모든 배지를 모았어요. 대단해요!';
    } else {
      head = `<span class="streak-fire">🌱</span><b>${data.entries.length ? '연속 기록을 다시 시작해요' : '오늘 첫 기록을 남겨 보세요'}</b>`;
      sub = '매일 한 번만 기록해도 3일이면 첫 배지를 받아요';
    }
    // 어제 하루만 비었고 복구권이 있으면, 끊기지 않게 채울 수 있어요
    const fix = rs.gap && rs.tickets ? `<button type="button" class="restore-btn" data-restore="${rs.gap}">🎟️ 복구권으로 어제 채우기 <small>${rs.tickets}장 있어요</small></button>`
      : rs.gap ? '<p class="restore-note">어제 하루 빠졌어요. 괜찮아요, 오늘부터 다시 하면 돼요. (기록한 날 7일마다 복구권 1장)</p>' : '';
    box.innerHTML = `<div class="streak-head">${head}<span class="streak-best">${rs.tickets ? `🎟️ ${rs.tickets} · ` : ''}${st.best ? `최고 ${st.best}일` : ''}</span></div><p class="streak-sub">${sub}</p>${fix}
      <div class="badges">${STREAK_BADGES.map(([n, icon, name]) => `<span class="badge-item${st.best >= n ? ' on' : ''}" title="${n}일 연속 기록"><i>${icon}</i><small>${name}</small></span>`).join('')}</div>`;
  }

  function drawBudget(used, y, m, list) {
    const box = $('b-budget');
    if (editingBudget) {
      box.innerHTML = `<label for="b-budget-in">한 달 예산</label>
        <div class="field"><input id="b-budget-in" inputmode="numeric" value="${data.budget ? data.budget.toLocaleString('ko-KR') : ''}" placeholder="1,500,000"><span>원</span></div>
        <div class="row-btns"><button type="button" class="btn fill" id="b-budget-ok">저장</button><button type="button" class="btn line" id="b-budget-cancel">취소</button></div>`;
      const inp = $('b-budget-in');
      inp.addEventListener('input', () => { const d = inp.value.replace(/[^0-9]/g, ''); inp.value = d ? Number(d).toLocaleString('ko-KR') : ''; });
      inp.focus();
      $('b-budget-ok').addEventListener('click', () => { data.budget = Math.min(num(inp.value), MAX_REC); editingBudget = false; save(); render(); });
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
      if (left < 0) tip = `<p class="budget-tip">예산을 ${won(-left)} 넘었어요.</p>`;
      else if (isNow) {
        // ① 오늘 쓸 수 있는 돈: 오늘 이미 쓴 돈은 빼고, 남은 예산을 오늘 포함 남은 날로 나눠요
        const todayKey = iso(today), spentToday = list.filter(e => e.type === 'out' && e.date === todayKey).reduce((a, e) => a + e.amt, 0);
        const perDay = Math.floor((left + spentToday) / daysLeft), canToday = Math.max(0, perDay - spentToday);
        tip = `<div class="budget-today"><div><span>오늘 쓸 수 있는 돈</span><b>${won(canToday)}</b></div><em>남은 예산 ${won(left)}<br>÷ 남은 ${daysLeft}일${spentToday ? `<br>오늘 ${won(spentToday)} 썼어요` : ''}</em></div>`;
        tip += pace(list, used, y, m);
      } else tip = `<p class="budget-tip">예산에서 ${won(left)}이 남았어요.</p>`;
      box.innerHTML = `<div class="budget-head"><span>한 달 예산 ${won(data.budget)} 중 <b>${Math.round(ratio * 100)}%</b> 썼어요</span><button type="button" class="link" id="b-budget-edit">바꾸기</button></div>
        <div class="bar${left < 0 ? ' over' : ''}"><i style="width:${Math.min(100, ratio * 100)}%"></i></div>
        ${tip}`;
    }
    $('b-budget-edit').addEventListener('click', () => { editingBudget = true; render(); });
  }

  // ① 이 속도면 이번 달 지출은? (고정지출은 한 번 나가는 돈이라 속도 계산에서 빼요)
  function pace(list, used, y, m) {
    const day = today.getDate(), last = new Date(y, m, 0).getDate();
    if (day < 3 || day >= last) return ''; // 초반 이틀은 너무 들쭉날쭉해서, 마지막 날은 의미가 없어서 안 보여요
    const fixed = list.filter(e => e.type === 'out' && String(e.id).startsWith('fx-')).reduce((a, e) => a + e.amt, 0);
    const guess = Math.round(fixed + (used - fixed) / day * last), diff = guess - data.budget;
    const big = n => korean(Math.round(n / 1e4) * 1e4) || won(n);
    return `<p class="pace">지금 속도면 이번 달 지출 <b class="${diff > 0 ? 'over' : 'ok'}">약 ${big(guess)}</b> · ${Math.abs(diff) < 1e4 ? '예산과 비슷해요' : `예산보다 ${big(Math.abs(diff))} ${diff > 0 ? '많아요' : '적어요'}`}</p>`;
  }

  // 월급날 D-day와 다음 월급까지 하루 쓸 돈
  function drawPayday() {
    const box = $('b-payday');
    if (editingPay) {
      const p = data.payday || { day: 25, early: true };
      box.innerHTML = `<label for="b-pd-day">월급날</label>
        <div class="field"><select id="b-pd-day">${Array.from({ length: 31 }, (_, i) => `<option value="${i + 1}"${p.day === i + 1 ? ' selected' : ''}>매달 ${i + 1}일</option>`).join('')}<option value="32"${p.day === 32 ? ' selected' : ''}>매달 말일</option></select></div>
        <label class="pd-check"><input type="checkbox" id="b-pd-early"${p.early !== false ? ' checked' : ''}> 주말이면 금요일에 미리 받아요</label>
        <div class="row-btns"><button type="button" class="btn fill" id="b-pd-ok">저장</button><button type="button" class="btn line" id="b-pd-cancel">취소</button></div>
        ${data.payday ? '<button type="button" class="link danger" id="b-pd-del">월급날 지우기</button>' : ''}`;
      $('b-pd-ok').addEventListener('click', () => { data.payday = cleanPay({ day: Number($('b-pd-day').value), early: $('b-pd-early').checked }); editingPay = false; save(); render(); toast('월급날을 저장했어요.'); });
      $('b-pd-cancel').addEventListener('click', () => { editingPay = false; render(); });
      if ($('b-pd-del')) $('b-pd-del').addEventListener('click', () => { data.payday = null; editingPay = false; save(); render(); });
      return;
    }
    const pi = paydayInfo(data);
    if (!pi) {
      box.innerHTML = '<button type="button" class="pd-set" id="b-pd-edit"><span aria-hidden="true">💰</span><span><b>월급날 정하기</b><small>월급날까지 며칠 남았는지, 하루에 얼마 쓸 수 있는지 알려 드려요</small></span><i aria-hidden="true">›</i></button>';
    } else {
      const right = pi.perDay != null
        ? `<div class="pd-r"><span>하루 쓸 수 있는 돈</span><b>${won(pi.perDay)}</b><em>${pi.left < 0 ? `${won(-pi.left)} 넘게 썼어요` : `${pi.how === 'income' ? '월급 받고 남은 돈' : '예산에서 남은 돈'} ${won(pi.left)} ÷ ${pi.days}일`}</em></div>`
        : pi.days ? '<div class="pd-r"><em>월급을 수입으로 기록하거나 한 달 예산을 정하면, 하루 쓸 돈을 알려 드려요</em></div>' : '<div class="pd-r"><b>🎉</b><em>오늘 들어온 월급을 수입으로 기록해 보세요</em></div>';
      box.innerHTML = `<div class="pd-card"><div class="pd-l"><span>월급날까지</span><b>${pi.days ? `D-${pi.days}` : 'D-DAY'}</b><em>${paydayLabel(pi.next)}</em></div>${right}</div><button type="button" class="link pd-edit" id="b-pd-edit">월급날 바꾸기</button>`;
    }
    $('b-pd-edit').addEventListener('click', () => { editingPay = true; render(); });
  }

  // ② 다가오는 결제: 고정지출(donsem:fixed)에서 앞으로 35일 안에 나갈 것
  const dayIn = (yy, mm, dd) => new Date(yy, mm, Math.min(dd, new Date(yy, mm + 1, 0).getDate()));
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  function nextPay(x) {
    let d;
    if (x.cycle === 'year') { d = dayIn(t0.getFullYear(), x.month - 1, x.day); if (d < t0) d = dayIn(t0.getFullYear() + 1, x.month - 1, x.day); }
    else { d = dayIn(t0.getFullYear(), t0.getMonth(), x.day); if (d < t0) d = dayIn(t0.getFullYear(), t0.getMonth() + 1, x.day); }
    return d;
  }
  function drawUpcoming() {
    const card = $('b-up-card');
    let items = [];
    try { const f = JSON.parse(localStorage.getItem('donsem:fixed')); items = f && Array.isArray(f.items) ? f.items : []; } catch (e) { items = []; }
    const soon = items.filter(x => x && Number(x.amt) > 0 && Number(x.day) > 0).map(x => ({ x, d: nextPay(x) }))
      .map(o => ({ ...o, n: Math.round((o.d - t0) / 864e5) })).filter(o => o.n <= 35).sort((a, b) => a.n - b.n).slice(0, 5);
    card.hidden = !soon.length;
    if (!soon.length) return;
    $('b-up').innerHTML = soon.map(({ x, d, n }) => `<li class="up-row${n <= 2 ? ' soon' : ''}"><span class="up-d"><b>${d.getDate()}</b>${W[d.getDay()]}</span>
      <span class="up-n">${esc(x.name || x.cat || '고정지출')}<small>${n === 0 ? '오늘' : n === 1 ? '내일' : `${n}일 뒤`}${x.cycle === 'year' ? ' · 1년에 한 번' : ''}</small></span><b class="up-a">${won(Number(x.amt))}</b></li>`).join('');
  }

  // ③ 분류별 예산
  function drawCatBudget(list) {
    const box = $('b-catbud'), by = {};
    list.filter(e => e.type === 'out').forEach(e => { by[e.cat] = (by[e.cat] || 0) + e.amt; });
    if (editingCats) {
      box.innerHTML = `<p class="sub small">쓰고 싶은 분류만 넣으세요. 비워 두면 그 분류는 예산 없이 기록만 해요.</p>
        <div class="cb-edit">${CATS.out.map(c => `<label class="cb-in"><span>${catIcon(c)}${esc(c)}</span><span class="field"><input inputmode="numeric" data-c="${esc(c)}" value="${data.cats[c] ? data.cats[c].toLocaleString('ko-KR') : ''}" placeholder="0" aria-label="${esc(c)} 예산"><i>원</i></span></label>`).join('')}</div>
        <div class="row-btns"><button type="button" class="btn fill" id="b-cb-ok">저장</button><button type="button" class="btn line" id="b-cb-cancel">취소</button></div>`;
      box.querySelectorAll('input').forEach(inp => inp.addEventListener('input', () => { const d = inp.value.replace(/[^0-9]/g, '').slice(0, 12); inp.value = d ? Number(d).toLocaleString('ko-KR') : ''; }));
      $('b-cb-ok').addEventListener('click', () => {
        const c = {}; box.querySelectorAll('input').forEach(inp => { c[inp.dataset.c] = Math.min(num(inp.value), MAX_REC); });
        data.cats = cleanCats(c); editingCats = false; save(); render(); toast('분류별 예산을 저장했어요.');
      });
      $('b-cb-cancel').addEventListener('click', () => { editingCats = false; render(); });
      return;
    }
    const keys = CATS.out.filter(c => data.cats[c]);
    if (!keys.length) {
      box.innerHTML = '<p class="sub small">식비 40만 원, 카페 8만 원처럼 분류마다 예산을 정하면, 얼마나 썼는지 막대로 보여 드려요.</p><button type="button" class="btn line wide" id="b-cb-edit">분류별 예산 정하기</button>';
    } else {
      const rows = keys.map(c => ({ c, b: data.cats[c], u: by[c] || 0 })).sort((a, b) => b.u / b.b - a.u / a.b);
      box.innerHTML = rows.map(({ c, b, u }) => {
        const r = u / b, cls = r > 1 ? 'over' : r >= .8 ? 'warn' : '';
        return `<div class="cat-row cb-row"><div class="cat-top"><span>${catIcon(c)}${esc(c)}</span>${r > 1 ? `<span class="cb-over">${won(u - b)} 넘었어요</span>` : `<span>${u.toLocaleString('ko-KR')} / ${won(b)}</span>`}</div><div class="bar ${cls}"><i style="width:${Math.min(100, r * 100)}%"></i></div></div>`;
      }).join('') + '<button type="button" class="link cb-edit-link" id="b-cb-edit">분류별 예산 바꾸기</button>';
    }
    $('b-cb-edit').addEventListener('click', () => { editingCats = true; render(); });
  }

  // ④ 6개월 흐름: 보고 있는 달까지 6달 지출 막대 + 평균선
  function drawTrend(y, m) {
    const box = $('b-trend'), months = [];
    for (let i = 5; i >= 0; i--) { const d = new Date(y, m - 1 - i, 1); months.push({ k: iso(d).slice(0, 7), m: d.getMonth() + 1 }); }
    months.forEach(o => { o.v = data.entries.filter(e => e.type === 'out' && e.date.startsWith(o.k)).reduce((a, e) => a + e.amt, 0); });
    const cur = months[5], past = months.slice(0, 5).filter(o => o.v), max = Math.max(...months.map(o => o.v));
    if (!max) { box.innerHTML = '<p class="empty">지출을 기록하면 달마다 얼마나 썼는지 막대로 보여 드려요.</p>'; return; }
    const avg = past.length ? past.reduce((a, o) => a + o.v, 0) / past.length : 0;
    const isNow = cur.k === iso(today).slice(0, 7);
    let line;
    if (!avg) line = '기록이 두 달 넘게 쌓이면 평균과 비교해 드려요.';
    else {
      // 진행 중인 달은 지금 속도로 한 달을 채웠을 때와 비교해요
      let full = cur.v;
      if (isNow) { // 고정지출은 한 번 나가는 돈이라 그대로 두고, 나머지만 지금 속도로 한 달을 채워요
        const fx = data.entries.filter(e => e.type === 'out' && e.date.startsWith(cur.k) && String(e.id).startsWith('fx-')).reduce((a, e) => a + e.amt, 0);
        full = fx + (cur.v - fx) / today.getDate() * new Date(y, m, 0).getDate();
      }
      const p = Math.round((full - avg) / avg * 100);
      line = Math.abs(p) < 3 ? `${isNow ? '이번 달은' : `${cur.m}월은`} 평균과 비슷하게 ${isNow ? '쓰고 있어요' : '썼어요'}`
        : `${isNow ? '이번 달은' : `${cur.m}월은`} 지난 ${past.length}달 평균보다 <b class="${p > 0 ? 'over' : 'ok'}">${Math.abs(p)}% ${p > 0 ? '많이' : '적게'}</b> ${isNow ? '쓰는 속도예요' : '썼어요'}`;
    }
    const top = Math.max(max, avg);
    box.innerHTML = `<p class="pace">${line}</p><div class="trend" role="img" aria-label="${months.map(o => `${o.m}월 ${won(o.v)}`).join(', ')}">
      ${avg ? `<span class="trend-avg" style="bottom:calc(26px + ${avg / top} * (100% - 52px))"></span>` : ''}
      ${months.map((o, i) => `<span class="trend-col${i === 5 ? ' now' : ''}"><small>${o.v ? short(o.v) : ''}</small><i style="height:calc(${o.v / top} * (100% - 52px))"></i><span>${o.m}월</span></span>`).join('')}</div>${avg ? `<p class="trend-key">지난 ${past.length}달 평균 ${won(Math.round(avg))}</p>` : ''}`;
  }

  // ── 달력 꾸미기: 테마와 날짜별 스티커 (donsem:deco, 이 기기에만 저장) ──
  // 테마: 기본은 색이 없고, 나머지는 보이는 색 이름 그대로 (예전 이름 berry·mint·butter·night는 저장값이라 그대로 둬요)
  const THEMES = [['basic', '기본'], ['berry', '연분홍'], ['peach', '연주황'], ['ivory', '아이보리'], ['butter', '노랑'], ['sage', '연초록'], ['mint', '민트'], ['sky', '연하늘'], ['night', '남색'], ['lilac', '라벤더'], ['gray', '회색']];
  const STICKERS = '🍎 🍓 🍰 ☕ 🧋 🍜 🍕 🍗 🛍️ 💄 👗 🎁 💸 💰 🐷 🧾 🚕 ✈️ 🎬 🎮 💖 ⭐ 🌸 🍀 😎 🥳 😭 💪'.split(' ');
  const ST_MAX = 3;
  function loadDeco() {
    try {
      const d = JSON.parse(localStorage.getItem('donsem:deco'));
      if (d && typeof d === 'object') return { th: THEMES.some(t => t[0] === d.th) ? d.th : 'basic', st: d.st && typeof d.st === 'object' ? d.st : {} };
    } catch (e) { /* 처음이면 기본 */ }
    return { th: 'basic', st: {} };
  }
  let deco = loadDeco(), decoOpen = false;
  const saveDeco = () => { try { localStorage.setItem('donsem:deco', JSON.stringify(deco)); } catch (e) { /* 저장 안 돼도 화면은 바뀌어요 */ } };
  const dayLabel = k => `${Number(k.slice(5, 7))}월 ${Number(k.slice(8))}일`;
  function decoHTML() {
    const mine = (selDay && selDay.startsWith(month) && deco.st[selDay]) || [];
    return `<div class="deco"><button type="button" class="deco-toggle${decoOpen ? ' on' : ''}" data-deco="toggle" aria-expanded="${decoOpen}">🎨 달력 꾸미기</button>${decoOpen ? `
      <p class="deco-h">테마</p><div class="deco-th">${THEMES.map(([k, n]) => `<button type="button" class="th-${k}${deco.th === k ? ' on' : ''}" data-pick="${k}"><i${k === 'basic' ? ' class="none"' : ''}></i>${n}</button>`).join('')}</div>
      <p class="deco-h">스티커 <span>${selDay && selDay.startsWith(month) ? `${dayLabel(selDay)}에 붙여요 (최대 ${ST_MAX}개)` : '먼저 달력에서 날짜를 눌러 주세요'}</span></p>
      ${mine.length ? `<div class="deco-mine">${mine.map((c, i) => `<button type="button" data-rm="${i}" aria-label="${c} 스티커 떼기">${c}<b>×</b></button>`).join('')}</div>` : ''}
      <div class="deco-st">${STICKERS.map(c => `<button type="button" data-st="${c}" aria-label="${c} 스티커 붙이기">${c}</button>`).join('')}</div>` : ''}</div>`;
  }
  function onDeco(e) {
    const b = e.target.closest('[data-deco],[data-pick],[data-st],[data-rm]');
    if (!b) return false;
    if (b.dataset.deco) decoOpen = !decoOpen;
    else if (b.dataset.pick) { deco.th = b.dataset.pick; saveDeco(); }
    else if (!selDay || !selDay.startsWith(month)) { toast('먼저 달력에서 날짜를 눌러 주세요.'); return true; }
    else if (b.dataset.st) {
      const l = deco.st[selDay] = deco.st[selDay] || [];
      if (l.length >= ST_MAX) { toast(`하루에 스티커는 ${ST_MAX}개까지 붙일 수 있어요. 붙인 스티커를 누르면 뗄 수 있어요.`); return true; }
      l.push(b.dataset.st); saveDeco();
    } else {
      const l = deco.st[selDay] || [];
      l.splice(Number(b.dataset.rm), 1);
      if (!l.length) delete deco.st[selDay];
      saveDeco();
    }
    render();
    return true;
  }

  // ── 돈 일정: 세금 마감·연말정산·지원금 신청처럼 놓치면 손해인 날 (app.js의 MONEY_CAL) ──
  // 내 상황을 고르면 나와 상관있는 일정만 보여요 (donsem:mc-me)
  const ME = [['work', '직장인·알바'], ['biz', '사업자·프리랜서'], ['own', '집·차 있음'], ['invest', '예금·대출·투자 (금리)'], ['shop', '쇼핑 할인']];
  const meOf = e => e.tag === '쇼핑' ? 'shop' : e.tag === '금리' ? 'invest' : /종합소득세|부가세|법인세/.test(e.t) ? 'biz' : /종합부동산세|자동차세/.test(e.t) ? 'own' : 'work';
  let me = ['work', 'biz', 'own', 'invest', 'shop'];
  try { // { on: 켠 상황, known: 그때 있던 상황 } — 나중에 새로 생긴 상황은 켜진 채로 시작해요
    const v = JSON.parse(localStorage.getItem('donsem:mc-me')), on = Array.isArray(v) ? v : v && Array.isArray(v.on) ? v.on : null;
    const known = Array.isArray(v) ? ['work', 'biz', 'own', 'shop'] : v && Array.isArray(v.known) ? v.known : [];
    if (on) me = ME.map(x => x[0]).filter(k => on.includes(k) || !known.includes(k));
  } catch (e) { /* 처음이면 모두 */ }
  const MC_TAG = { '세금': 'tax', '연말정산': 'yet', '월급': 'pay', '지원금': 'aid', '쇼핑': 'shop', '금리': 'rate' };
  // 중요도 별점 (Save 앱 경제 캘린더처럼): ★★★ 꼭 챙길 마감, ★★ 알아 두면 좋은 날, ★ 쇼핑처럼 가벼운 날
  const impOf = e => e.imp || 2, stars = n => `<span class="imp-stars" aria-label="중요도 ${n}">${'★'.repeat(n)}<i>${'★'.repeat(3 - n)}</i></span>`;
  let impF = 0, lossAll = false;
  const dateLabel = k => { const [y, m, d] = k.split('-').map(Number); return `${m}월 ${d}일 (${W[new Date(y, m - 1, d).getDay()]})`; };
  const moneyEvents = () => (typeof MONEY_CAL === 'undefined' ? [] : MONEY_CAL.filter(e => me.includes(meOf(e))));
  const mcOn = k => moneyEvents().filter(e => e.d === k);
  function lossHTML(ym) {
    const nowYm = iso(today).slice(0, 7);
    const list = moneyEvents().filter(e => e.d.startsWith(ym) && (ym !== nowYm || e.d >= iso(today)) && (!impF || impOf(e) === impF))
      .sort((a, b) => a.d.localeCompare(b.d) || impOf(b) - impOf(a));
    const row = e => { const n = typeof mcDays === 'function' ? mcDays(e.d) : 0;
      return `<button type="button" class="loss-row" data-mcday="${e.d}"><em class="${n <= 7 && !e.soft ? 'near' : ''}">${n < 0 ? '지남' : typeof mcBadge === 'function' ? mcBadge(e) : ''}</em><span>${esc(e.t)}</span>${stars(impOf(e))}<i class="mc-dot ${MC_TAG[e.tag] || ''}"></i></button>`; };
    let rows = '';
    if (lossAll) { // 전체 보기: 날짜별로 묶어서 차례로 (경제 캘린더 목록처럼)
      let prev = '';
      list.forEach(e => { if (e.d !== prev) { rows += `<p class="loss-date">${dateLabel(e.d)}</p>`; prev = e.d; } rows += row(e); });
    } else rows = list.slice(0, 3).map(row).join('');
    const chips = [[0, '전체'], [3, '★★★'], [2, '★★'], [1, '★']].map(([v, l]) => `<button type="button" class="${impF === v ? 'on' : ''}" data-imp="${v}">${l}</button>`).join('');
    return `<div class="cal-loss"><div class="loss-h"><b>${ym === nowYm ? '이번 달' : `${Number(ym.slice(5))}월`} 놓치면 손해</b><button type="button" class="loss-me-btn" data-meopen>내 상황 ›</button></div>
      ${mePanel ? `<div class="loss-me">${ME.map(([k, n]) => `<button type="button" class="${me.includes(k) ? 'on' : ''}" data-me="${k}">${n}</button>`).join('')}<small>고른 상황에 맞는 세금·지원금·금리·세일 일정만 달력에 보여요</small></div>` : ''}
      <div class="imp-f" role="group" aria-label="중요도로 거르기">${chips}</div>
      ${rows || `<p class="loss-none">${me.length ? (impF ? '이 중요도의 일정이 없어요' : '이 달에는 챙길 돈 일정이 없어요') : '내 상황을 골라 주세요'}</p>`}
      ${list.length > 3 ? `<button type="button" class="loss-all" data-lossall>${lossAll ? '접기 ︿' : `전체 ${list.length}개 날짜별로 보기 ›`}</button>` : ''}</div>`;
  }
  let mePanel = false;
  function mcDayHTML(k) {
    const list = mcOn(k);
    if (!list.length) return '';
    return `<div class="mc-day">${list.map(e => `<div class="mc-day-row"><p><span class="mc-tag ${MC_TAG[e.tag] || ''}">${esc(e.tag)}</span><b>${esc(e.t)}</b>${stars(impOf(e))}</p><small>${esc(e.who)}${e.when ? ` (날짜: ${esc(e.when)})` : ''}</small>
      <div class="mc-acts">${e.go ? `<a class="go" href="${e.go[0]}">${esc(e.go[1])} ›</a>` : ''}<button type="button" class="${typeof mcSubs === 'function' && mcSubs().has(mcSubKey(e)) ? 'on' : ''}" data-mcsub="${MONEY_CAL.indexOf(e)}">${typeof mcSubs === 'function' && mcSubs().has(mcSubKey(e)) ? '🔔 알림 받는 중' : '🔕 알림 받기'}</button><button type="button" data-mcics="${MONEY_CAL.indexOf(e)}">📅 휴대폰 달력에 넣기</button></div></div>`).join('')}</div>`;
  }
  // 달력 접기: 토스처럼 고른 날이 있는 한 주만 보여요
  let fold = false;
  try { fold = localStorage.getItem('donsem:cal-fold') === '1'; } catch (e) { /* 기본은 펼침 */ }
  // 지출 히트맵: 많이 쓴 날일수록 칸이 진해져요 (주식 테마 캘린더처럼 한눈에)
  let heat = false;
  // 히트맵 버튼은 없앴어요 (2026-11-11)

  // ── 일정: 여행·생일 같은 계획 (donsem:plans, 이 기기에만 저장) ──
  const PCOLORS = ['pink', 'orange', 'yellow', 'green', 'blue', 'purple'];
  function loadPlans() {
    try { const d = JSON.parse(localStorage.getItem('donsem:plans')); if (d && Array.isArray(d.items)) return d.items; } catch (e) { /* 처음이면 비어 있어요 */ }
    return [];
  }
  let plans = loadPlans(), pColor = 'pink', planOpen = false;
  const savePlans = () => { try { localStorage.setItem('donsem:plans', JSON.stringify({ items: plans })); } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); } };
  // 반복 일정도 그날 걸치는 회차로 바꿔서 돌려줘요 (s·e는 이번 회차 날짜, id는 원래 일정)
  const plansOn = k => plans.map(p => { const o = typeof planOcc === 'function' ? planOcc(p, k) : (p.s <= k && k <= (p.e || p.s) ? { s: p.s, e: p.e || p.s } : null); return o && { ...p, s: o.s, e: o.e }; }).filter(Boolean)
    .sort((a, b) => a.s.localeCompare(b.s) || (a.allDay === false) - (b.allDay === false) || (a.st || '').localeCompare(b.st || '') || a.id.localeCompare(b.id));
  const mdLabel = k => `${Number(k.slice(5, 7))}.${Number(k.slice(8))}`;
  function planHTML() {
    if (!selDay) return '';
    const ps = plansOn(selDay);
    // 그날 일정 목록은 위 「날짜 상세」에 같이 보여요 (지우기 ×도 거기)
    return `<div class="plan-box">${planOpen ? `<p class="deco-h">일정 <span>${dayLabel(selDay)}</span></p>` : ''}
      ${planOpen ? `<div class="plan-form"><div class="field"><input id="p-title" maxlength="20" placeholder="일정 이름 (예: 제주도 여행)" autocomplete="off" enterkeyhint="done" aria-label="일정 이름"></div>
        <div class="plan-opt"><span class="plan-lab">언제까지</span><span class="field"><input id="p-end" type="date" value="${selDay}" min="${selDay}" aria-label="일정이 끝나는 날"></span><small>여행처럼 며칠 이어지면 바꿔요</small></div>
        <div class="plan-opt"><span class="plan-lab">색깔</span><div class="plan-colors" role="group" aria-label="일정 색">${PCOLORS.map(c => `<button type="button" class="pc-${c}${c === pColor ? ' on' : ''}" data-pc="${c}" aria-label="${c} 색"></button>`).join('')}</div></div>
        <div class="plan-btns"><button type="button" class="btn line" data-pcancel>취소</button><button type="button" class="btn fill" data-padd>저장</button></div></div>`
      : ''}</div>`;
  }
  function addPlan() {
    const t = $('p-title').value.trim().slice(0, 20), end = $('p-end').value;
    if (!t) { toast('일정 이름을 적어 주세요.'); $('p-title').focus(); return; }
    plans.push({ id: Date.now().toString(36) + Math.random().toString(36).slice(2, 5), s: selDay, e: end && end > selDay ? end : selDay, t, c: pColor });
    planOpen = false; savePlans(); render();
    toast(`'${t}' 일정을 넣었어요.`);
  }
  function onPlan(e) {
    const b = e.target.closest('[data-pc],[data-padd],[data-pdel],[data-cm],[data-ctoday],[data-popen],[data-pcancel],[data-goanal],[data-goassets],[data-mcday],[data-me],[data-meopen],[data-mcics],[data-mcsub],[data-heat],[data-fold],[data-imp],[data-lossall],[data-gobudget]');
    if (!b) return false;
    if (b.dataset.pc) { pColor = b.dataset.pc; b.parentNode.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b)); }
    else if (b.hasAttribute('data-padd')) addPlan();
    else if (b.dataset.mcday) { const k = b.dataset.mcday; if (k.startsWith(month)) { selDay = k; planOpen = false; render(); } else goMonth(k.slice(0, 7), k); }
    else if (b.dataset.me) {
      me = me.includes(b.dataset.me) ? me.filter(x => x !== b.dataset.me) : me.concat(b.dataset.me);
      try { localStorage.setItem('donsem:mc-me', JSON.stringify({ on: me, known: ME.map(x => x[0]) })); } catch (err) { /* 저장 안 돼도 화면은 바뀌어요 */ }
      render();
    } else if (b.hasAttribute('data-meopen')) { mePanel = !mePanel; render(); }
    else if (b.dataset.mcsub) { if (typeof mcSubToggle === 'function') { mcSubToggle(MONEY_CAL[Number(b.dataset.mcsub)]); render(); } }
    else if (b.dataset.mcics) { if (typeof mcIcs === 'function') { const ev = MONEY_CAL[Number(b.dataset.mcics)]; mcIcs([ev], `돈셈-${ev.t}.ics`); } }
    else if (b.hasAttribute('data-gobudget')) {
      const card = $('budget'); if (card) card.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (!data.budget) { editingBudget = true; render(); }
    }
    else if (b.dataset.imp !== undefined) { impF = Number(b.dataset.imp); render(); }
    else if (b.hasAttribute('data-lossall')) { lossAll = !lossAll; render(); }
    else if (b.hasAttribute('data-fold')) { fold = !fold; try { localStorage.setItem('donsem:cal-fold', fold ? '1' : '0'); } catch (err) { /* 괜찮아요 */ } render(); }
    else if (b.hasAttribute('data-heat')) { heat = !heat; try { localStorage.setItem('donsem:heat', heat ? '1' : '0'); } catch (err) { /* 괜찮아요 */ } render(); }
    else if (b.hasAttribute('data-goanal') || b.hasAttribute('data-goassets')) { const box = b.hasAttribute('data-goassets') ? $('assets') : $('b-breakdown').closest('section'); if (box) box.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    else if (b.hasAttribute('data-popen')) openPlanEd(null);
    else if (b.dataset.pdel) {
      const p = plans.find(x => x.id === b.dataset.pdel);
      if (p && confirm(`'${p.t}' 일정을 지울까요?`)) { plans = plans.filter(x => x !== p); savePlans(); render(); }
    } else if (b.dataset.cm) { const [y, m] = month.split('-').map(Number); goMonth(iso(new Date(y, m - 1 + Number(b.dataset.cm), 1)).slice(0, 7)); }
    else goMonth(iso(today).slice(0, 7));
    return true;
  }

  // ── 달력 ──
  const short = n => n < 1e4 ? n.toLocaleString('ko-KR') : (n < 1e5 ? Math.round(n / 1e3) / 10 : Math.round(n / 1e4)).toLocaleString('ko-KR') + '만';
  // 지난달 같은 날까지 쓴 돈과 비교해서, 소비 습관이 유지되는지 한 줄로 알려 줘요
  function paceHTML(y, m) {
    const ym = `${y}-${String(m).padStart(2, '0')}`, prev = iso(new Date(y, m - 2, 1)).slice(0, 7);
    const days = new Date(y, m, 0).getDate(), pdays = new Date(y, m - 1, 0).getDate();
    const daily = k => { const a = [], [ky, km] = k.split('-').map(Number), fx = fixedByDay(ky, km, new Date(ky, km, 0).getDate()); data.entries.forEach(e => { if (e.type === 'out' && e.date.startsWith(k)) a[Number(e.date.slice(8))] = (a[Number(e.date.slice(8))] || 0) + e.amt; });
      Object.keys(fx).forEach(d => fx[d].forEach(x => { a[d] = (a[d] || 0) + Number(x.amt); })); return a; }; // 고정지출도 그날 쓴 돈으로 쳐요
    const cum = (a, n) => { const r = [0]; for (let d = 1; d <= n; d++) r[d] = r[d - 1] + (a[d] || 0); return r; };
    const now = cum(daily(ym), days), last = cum(daily(prev), pdays);
    const nowYm = iso(today).slice(0, 7), upTo = ym === nowYm ? today.getDate() : ym < nowYm ? days : 0;
    const a = now[upTo] || 0, b = last[Math.min(upTo, pdays)] || 0;
    let title;
    if (!upTo) title = '아직 오지 않은 달이에요';
    else if (!b && !a) title = '이번 달 첫 지출을 기록해 보세요';
    else if (!b) title = '지난달 기록이 없어서 비교할 수 없어요';
    else if (a < b * 0.9) title = `지난달보다 ${won(b - a)} 덜 쓰는 중`;
    else if (a > b * 1.1) title = `지난달보다 ${won(a - b)} 더 쓰는 중`;
    else title = '지난달과 비슷하게 쓰는 중';
    if (upTo && ym < nowYm) title = title.replace(' 쓰는 중', ' 썼어요');
    const hl = title.replace(/(\d[\d,]*원)/, '<em>$1</em>'); // 토스처럼 금액만 보라색으로
    return `<div class="cal-pace"><button type="button" class="pace-l" data-goanal><b>${hl}</b><small>분석·고정 지출 보기 ›</small></button>${paceChart(now, last, upTo, days, pdays)}</div>`;
  }
  // 토스 가계부처럼: 이번 달 쌓인 지출(보라 선, 오늘까지)과 지난달(회색)을 작은 그래프로
  function paceChart(now, last, upTo, days, pdays) {
    const W2 = 120, H = 44, max = Math.max(1, last[pdays] || 0, now[upTo] || 0), X = (d, n) => (d / n * W2).toFixed(1), Y = v => (H - 3 - v / max * (H - 8)).toFixed(1);
    const pl = last.map((v, d) => `${X(d, pdays)},${Y(v)}`).join(' ');
    const pn = now.slice(0, upTo + 1).map((v, d) => `${X(d, days)},${Y(v)}`).join(' ');
    return `<svg class="pace-chart" viewBox="0 0 ${W2} ${H}" width="${W2}" height="${H}" aria-hidden="true">
      ${last[pdays] ? `<polygon points="0,${H} ${pl} ${W2},${H}" class="pc-area"/><polyline points="${pl}" class="pc-last"/>` : ''}
      ${upTo ? `<polyline points="${pn}" class="pc-now"/><circle cx="${X(upTo, days)}" cy="${Y(now[upTo])}" r="3.5" class="pc-dot"/>` : ''}</svg>`;
  }
  // 이번 달 예산을 달력 위에서 바로 (뱅크샐러드 가계부처럼)
  function budgetLine(used) {
    if (!data.budget) return '<button type="button" class="cal-bud" data-gobudget><span>이번 달 예산</span><b>설정하기 ›</b></button>';
    const left = data.budget - used, r = Math.min(1, used / data.budget);
    return `<button type="button" class="cal-bud" data-gobudget><span>이번 달 예산 ${won(data.budget)}</span><b class="${left < 0 ? 'over' : ''}">${left < 0 ? `${won(-left)} 넘었어요` : `${won(left)} 남았어요`} ›</b><i class="bud-bar"><u style="width:${(r * 100).toFixed(1)}%" class="${r >= 1 ? 'over' : r >= .8 ? 'warn' : ''}"></u></i></button>`;
  }
  // 내 자산과 연동: 월별 순자산이 늘면 그래프가 오르고, 줄면 내려가요 (빨강 = 늘었어요, 파랑 = 줄었어요)
  function assetGraph(ym) {
    let h = {};
    try { const a = JSON.parse(localStorage.getItem('donsem:assets')); h = a && a.history && typeof a.history === 'object' ? a.history : {}; } catch (e) { h = {}; }
    const [y, m] = ym.split('-').map(Number), pts = [];
    let last = null;
    for (let i = -5; i <= 0; i++) { // 보고 있는 달까지 6개월, 적지 않은 달은 앞 달 값을 이어 써요
      const k = iso(new Date(y, m - 1 + i, 1)).slice(0, 7);
      if (h[k]) last = (Number(h[k].a) || 0) - (Number(h[k].d) || 0);
      if (last !== null) pts.push(last);
    }
    if (!pts.length) return '<button type="button" class="pace-r empty" data-goassets><small>순자산</small><span>내 자산을 적으면<br>그래프가 보여요 ›</span></button>';
    const net = pts[pts.length - 1], diff = pts.length > 1 ? net - pts[pts.length - 2] : 0;
    const lo = Math.min(...pts), hi = Math.max(...pts), span = hi - lo || 1, W = 120, H = 40;
    const xy = pts.map((v, i) => [pts.length > 1 ? i / (pts.length - 1) * W : W, hi === lo ? H / 2 : H - 4 - (v - lo) / span * (H - 8)]);
    const cls = diff > 0 ? 'up' : diff < 0 ? 'down' : '';
    return `<button type="button" class="pace-r ${cls}" data-goassets aria-label="순자산 ${won(Math.abs(net))}, 지난달보다 ${diff >= 0 ? '늘었어요' : '줄었어요'}">
      <small>순자산 ${diff ? `${diff > 0 ? '+' : '-'}${short(Math.abs(diff))}` : ''}</small>
      <svg class="pace-g" viewBox="-4 0 ${W + 8} ${H}" aria-hidden="true"><polyline points="${xy.map(p => p.map(n => n.toFixed(1)).join(',')).join(' ')}"/><circle cx="${xy[xy.length - 1][0].toFixed(1)}" cy="${xy[xy.length - 1][1].toFixed(1)}" r="3.5"/></svg></button>`;
  }
  // 고정지출(넷플릭스 같은 구독)을 결제일 칸에 미리 보여 줘요. 가계부에 기록한 달은 지출 금액으로 보여서 빼요
  function fixedByDay(y, m, last) {
    let items = [];
    try { const f = JSON.parse(localStorage.getItem('donsem:fixed')); items = f && Array.isArray(f.items) ? f.items : []; } catch (e) { items = []; }
    const ym = `${y}-${String(m).padStart(2, '0')}`, have = new Set(data.entries.map(e => e.id)), out = {};
    items.filter(x => x && Number(x.amt) > 0 && Number(x.day) > 0 && (x.cycle !== 'year' || Number(x.month) === m) && !have.has(`fx-${x.id}-${ym}`))
      .forEach(x => { const d = Math.min(Number(x.day), last); (out[d] = out[d] || []).push(x); });
    return out;
  }
  // 이 달 고정지출 중 오늘까지 지난 것의 합 (지난달은 전부, 다음 달은 0)
  function fixedPaid(y, m) {
    const last = new Date(y, m, 0).getDate(), ym = `${y}-${String(m).padStart(2, '0')}`, now = iso(today).slice(0, 7);
    const upTo = ym < now ? last : ym > now ? 0 : today.getDate(), fx = fixedByDay(y, m, last);
    let sum = 0; for (let d = 1; d <= upTo; d++) (fx[d] || []).forEach(x => { sum += Number(x.amt); });
    return sum;
  }
  function payDayOf(y, m) { // 이 달 월급날 (주말이면 금요일로 당겨요, 32는 말일)
    const p = data.payday;
    if (!p) return '';
    const last = new Date(y, m, 0).getDate(), d = new Date(y, m - 1, p.day === 32 ? last : Math.min(p.day, last));
    if (p.early !== false) while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    return iso(d);
  }
  // 토스 가계부처럼: 칸 아래에 그날 수입(보라)·지출(회색) 금액. 일정이 많으면 첫 번째만 보이고 「+n개」로 줄여요
  const calWon = n => n < 1e6 ? n.toLocaleString('ko-KR') : short(n);
  const calTags = a => a.length > 3 ? a.slice(0, 2).join('') + `<span class="cal-more">+${a.length - 2}개</span>` : a.join(''); // 칸이 길어져서 3개까지 보여요
  // ── 일정 고치기 (네이버 캘린더처럼): 종일·시간, 반복, 장소, 설명, 파일, 알림, 색, 완료, D-day ──
  const PL_REP = { none: '안 함', day: '매일', week: '매주', month: '매달', year: '매년' };
  const PALARM = typeof PL_ALARM !== 'undefined' ? PL_ALARM : { none: '없음' };
  const SV = d => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${d}</svg>`;
  const PI = {
    clock: SV('<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>'), rep: SV('<path d="M4 9a7 7 0 0 1 12-3l2 2M20 15a7 7 0 0 1-12 3l-2-2"/><path d="M18 4v4h-4M6 20v-4h4"/>'),
    pin: SV('<path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/>'), note: SV('<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8.5 8h7M8.5 12h7M8.5 16h4"/>'),
    clip: SV('<path d="M20 11.5 12 19.5a5 5 0 0 1-7-7L13.5 4a3.4 3.4 0 0 1 4.8 4.8L10 17.1a1.7 1.7 0 0 1-2.4-2.4L15 7.3"/>'), bell: SV('<path d="M6 16V11a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/>'),
    pal: SV('<path d="M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.8 1.8-1.7 0-1.3-1.2-1.6-1.2-2.8 0-1 .8-1.7 1.9-1.7h2.2A3.8 3.8 0 0 0 20.5 10 8.5 8.5 0 0 0 12 3.5z"/><circle cx="8" cy="11" r="1"/><circle cx="11" cy="7.5" r="1"/><circle cx="15.5" cy="8" r="1"/>'),
    done: SV('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="m8.5 12 2.5 2.5 4.5-5"/>'), dday: SV('<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M9 8.5v7h1.5a3.5 3.5 0 0 0 0-7z"/>'),
    cal: SV('<rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/>'), trash: SV('<path d="M4.5 7h15M9.5 7V4.5h5V7M6.5 7l1 13h9l1-13"/>'),
  };
  // 일정 색 (네이버 캘린더처럼 7가지 색 × 5단계 = 35색). c1~c35로 저장하고, 예전 6색(pink 등)도 그대로 보여요
  const PAL = [['#D52A55', '#EA5476', '#FF7F9E', '#FFCFDC', '#FBE4EA'], ['#C7491A', '#E86B3F', '#FF8F66', '#FFD9C2', '#FFEEDD'], ['#C78400', '#E3A100', '#F6BE1A', '#F9EA8E', '#F8F5BF'],
    ['#1C7A6A', '#18A98A', '#52C9A0', '#BEEDD2', '#E2F8E4'], ['#2546AE', '#3D73E3', '#6EA6FF', '#BDDBFF', '#DCEBFC'], ['#5E1DC2', '#7D42E6', '#AE85FF', '#DDC8FF', '#EFE3FF'], ['#4F555C', '#747A80', '#9AA5A8', '#CFD2D3', '#E8E8E8']];
  (() => { if (document.getElementById('pal-css')) return; const st = document.createElement('style'); st.id = 'pal-css'; // 진한 3단계까지는 흰 글씨
    st.textContent = PAL.flat().map((h, i) => `.pc-c${i + 1}{--pc:${h};${i % 5 < 3 ? '--pct:#fff;--pctb:#fff;' : ''}}`).join(''); document.head.append(st); })();
  const palHTML = cur => `<div class="pe-pal" id="pe-pal" hidden role="group" aria-label="일정 색 고르기">${PAL.flat().map((h, i) => `<button type="button" class="pc-c${i + 1}${cur === 'c' + (i + 1) ? ' on' : ''}" data-pec="c${i + 1}" aria-label="색 ${i + 1}"></button>`).join('')}</div>`;
  let peEl = null, peCur = null, peMode = 'plan';
  const peShell = () => {
    if (peEl) return peEl;
    peEl = document.createElement('div'); peEl.className = 'pe'; peEl.hidden = true;
    peEl.innerHTML = '<div class="pe-dim" data-pex></div><div class="pe-panel" role="dialog" aria-modal="true" aria-labelledby="pe-h"></div>';
    document.body.append(peEl);
    peEl.addEventListener('click', onPe); peEl.addEventListener('change', onPeChange); peEl.addEventListener('input', onPeInput);
    peEl.addEventListener('keydown', e => { if (e.key === 'Escape') closePe(); });
    return peEl;
  };
  const showPe = html => {
    const el = peShell(); el.querySelector('.pe-panel').innerHTML = html; el.hidden = false;
    document.documentElement.classList.add('qa-open'); requestAnimationFrame(() => el.classList.add('show'));
  };
  const closePe = () => { if (!peEl) return; peEl.classList.remove('show'); document.documentElement.classList.remove('qa-open'); setTimeout(() => { peEl.hidden = true; }, 220); peCur = null; };
  const swHTML = (id, on, label) => `<label class="pe-sw"><input type="checkbox" id="${id}"${on ? ' checked' : ''} aria-label="${label}"><i></i></label>`;
  function openPlanEd(id) {
    peMode = 'plan';
    const src = id && plans.find(p => p.id === id);
    peCur = src ? JSON.parse(JSON.stringify(src)) : { id: '', s: selDay || iso(today), e: selDay || iso(today), t: '', c: pColor || 'pink', allDay: true, st: '09:00', et: '10:00', rep: 'none', place: '', memo: '', files: [], alarm: 'none', done: false, dday: false };
    const p = peCur; if (p.allDay === undefined) p.allDay = true; p.files = p.files || [];
    showPe(`<div class="pe-top"><button type="button" class="pe-ib" data-pex aria-label="닫기">✕</button><b id="pe-h">${src ? '일정' : '새 일정'}</b><button type="button" class="pe-ib ok" data-pesave aria-label="저장">✓</button></div>
      <div class="pe-body">
        <div class="pe-name"><i class="pe-dot pc-${p.c}"></i><input id="pe-t" maxlength="30" placeholder="일정 이름 (예: 제주도 여행)" value="${esc(p.t)}" autocomplete="off" enterkeyhint="done"></div>
        <div class="pe-line"><span class="pe-ico">${PI.clock}</span><b>종일</b>${swHTML('pe-all', p.allDay !== false, '종일')}</div>
        <div class="pe-when"><label><input type="date" id="pe-s" value="${p.s}"><input type="time" id="pe-st" value="${p.st || '09:00'}"${p.allDay !== false ? ' hidden' : ''}></label><span class="pe-arr">›</span><label><input type="date" id="pe-e" value="${p.e || p.s}"><input type="time" id="pe-et" value="${p.et || '10:00'}"${p.allDay !== false ? ' hidden' : ''}></label></div>
        <label class="pe-line"><span class="pe-ico">${PI.rep}</span><b>반복</b><select id="pe-rep">${Object.entries(PL_REP).map(([k, v]) => `<option value="${k}"${p.rep === k ? ' selected' : ''}>${v}</option>`).join('')}</select><span class="pe-chev">›</span></label>
        <label class="pe-line"><span class="pe-ico">${PI.pin}</span><input id="pe-place" maxlength="40" placeholder="장소" value="${esc(p.place || '')}" autocomplete="off"></label>
        <label class="pe-line top"><span class="pe-ico">${PI.note}</span><textarea id="pe-memo" rows="2" maxlength="500" placeholder="설명">${esc(p.memo || '')}</textarea></label>
        <div class="pe-line"><span class="pe-ico">${PI.clip}</span><b>파일</b><label class="pe-add">＋ 사진 넣기<input type="file" id="pe-file" accept="image/*" multiple hidden></label></div>
        <div class="pe-files" id="pe-files">${peFilesHTML()}</div>
        <label class="pe-line"><span class="pe-ico">${PI.bell}</span><b>알림</b><select id="pe-alarm">${Object.entries(PALARM).map(([k, v]) => `<option value="${k}"${(p.alarm || 'none') === k ? ' selected' : ''}>${v}</option>`).join('')}</select><span class="pe-chev">›</span></label>
        <p class="pe-hint" id="pe-ahint"${!p.alarm || p.alarm === 'none' ? ' hidden' : ''}>돈셈을 켜 두거나 열면 알려 드려요. 휴대폰 알림을 허락하면 알림으로도 와요.</p>
        <button type="button" class="pe-line pe-cline" data-pecol aria-expanded="false"><span class="pe-ico">${PI.pal}</span><b>색</b><i class="pe-dot pc-${p.c}"></i><span class="pe-chev">›</span></button>
        ${palHTML(p.c)}
        <div class="pe-line"><span class="pe-ico">${PI.done}</span><b>완료</b>${swHTML('pe-done', p.done, '완료')}</div>
        <div class="pe-line"><span class="pe-ico">${PI.dday}</span><b>D-day 보기</b><small>달력 위에 남은 날을 보여 줘요</small>${swHTML('pe-dday', p.dday, 'D-day 보기')}</div>
        <div class="pe-foot">${src ? `<button type="button" class="pe-fb" data-peics>${PI.cal}휴대폰 달력에 넣기</button><button type="button" class="pe-fb del" data-pedel>${PI.trash}지우기</button>` : ''}</div>
      </div>`);
    if (!src) setTimeout(() => { const t = $('pe-t'); if (t) t.focus(); }, 250);
  }
  const peFilesHTML = () => (peCur && peCur.files || []).map((f, i) => `<span class="pe-fl"><img src="${f}" alt="첨부 사진 ${i + 1}"><button type="button" data-pefx="${i}" aria-label="사진 빼기">×</button></span>`).join('');
  const shrinkImg = f => new Promise((ok, no) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { const k = Math.min(1, 900 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); ok(c.toDataURL('image/jpeg', .7)); }; im.onerror = no; im.src = u; });
  function readPlanForm() {
    const p = peCur;
    p.t = $('pe-t').value.trim(); p.allDay = $('pe-all').checked; p.s = $('pe-s').value || p.s; p.e = $('pe-e').value || p.s; if (p.e < p.s) p.e = p.s;
    p.st = $('pe-st').value || '09:00'; p.et = $('pe-et').value || p.st; if (p.s === p.e && p.et < p.st) p.et = p.st;
    p.rep = $('pe-rep').value; p.place = $('pe-place').value.trim(); p.memo = $('pe-memo').value.trim(); p.alarm = $('pe-alarm').value; p.done = $('pe-done').checked; p.dday = $('pe-dday').checked;
    return p;
  }
  function savePlanEd() {
    const p = readPlanForm();
    if (!p.t) { toast('일정 이름을 적어 주세요.'); $('pe-t').focus(); return; }
    if (!p.id) { p.id = Date.now().toString(36) + Math.random().toString(36).slice(2, 5); plans.push(p); } else plans = plans.map(x => x.id === p.id ? p : x);
    pColor = p.c; savePlans(); closePe(); render(); toast(`「${p.t}」 일정을 저장했어요.`);
  }
  // ── 지출·수입 기록 고치기 ──
  function openRecEd(id) {
    peMode = 'rec';
    const src = data.entries.find(x => x.id === id); if (!src) return;
    peCur = { ...src };
    const r = peCur;
    showPe(`<div class="pe-top"><button type="button" class="pe-ib" data-pex aria-label="닫기">✕</button><b id="pe-h">${r.type === 'in' ? '수입' : '지출'} 고치기</b><button type="button" class="pe-ib ok" data-pesave aria-label="저장">✓</button></div>
      <div class="pe-body">
        <div class="seg pe-type"><button type="button" data-pet="out" class="${r.type === 'out' ? 'on' : ''}">지출</button><button type="button" data-pet="in" class="${r.type === 'in' ? 'on' : ''}">수입</button></div>
        <div class="field pe-amt"><input id="pe-amt" inputmode="numeric" value="${r.amt.toLocaleString('ko-KR')}" aria-label="금액" autocomplete="off"><span>원</span></div>
        <div class="chips pe-cats" id="pe-cats">${peCatsHTML()}</div>
        <label class="pe-line"><span class="pe-ico">${PI.cal}</span><b>날짜</b><input type="date" id="pe-date" value="${r.date}"></label>
        <label class="pe-line"><span class="pe-ico">${PI.note}</span><input id="pe-rmemo" maxlength="40" placeholder="메모 (예: 점심 김밥)" value="${esc(r.memo || '')}" autocomplete="off"></label>
        <div class="pe-foot"><button type="button" class="pe-fb del" data-pedel>${PI.trash}이 기록 지우기</button></div>
      </div>`);
  }
  const peCatsHTML = () => CATS[peCur.type].map(c => `<button type="button" class="${c === peCur.cat ? 'on' : ''}" data-pecat="${esc(c)}">${typeof catIcon === 'function' ? catIcon(c) : ''}${esc(c)}</button>`).join('');
  function saveRecEd() {
    const r = peCur, amt = Math.round(Number(String($('pe-amt').value).replace(/[^0-9]/g, '')));
    if (!amt) { toast('금액을 넣어 주세요.'); $('pe-amt').focus(); return; }
    if (amt > MAX_REC) { toast('1,000억 원보다 큰 금액은 넣을 수 없어요.'); return; }
    r.amt = amt; r.date = $('pe-date').value || r.date; r.memo = $('pe-rmemo').value.trim().slice(0, 40);
    if (!CATS[r.type].includes(r.cat)) r.cat = CATS[r.type][0];
    data.entries = data.entries.map(x => x.id === r.id ? r : x);
    if (r.date.slice(0, 7) !== month) { month = r.date.slice(0, 7); } selDay = r.date;
    if (save()) { closePe(); render(); toast('기록을 고쳤어요.'); }
  }
  function onPe(e) {
    const b = e.target.closest('[data-pex],[data-pesave],[data-pedel],[data-peics],[data-pec],[data-pefx],[data-pet],[data-pecat],[data-pecol]'); if (!b) return;
    if (b.hasAttribute('data-pecol')) { const pal = $('pe-pal'); pal.hidden = !pal.hidden; b.setAttribute('aria-expanded', String(!pal.hidden)); if (!pal.hidden) pal.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); return; }
    if (b.hasAttribute('data-pex')) closePe();
    else if (b.hasAttribute('data-pesave')) (peMode === 'plan' ? savePlanEd : saveRecEd)();
    else if (b.hasAttribute('data-pedel')) {
      if (peMode === 'plan') { if (!confirm(`「${peCur.t}」 일정을 지울까요?${peCur.rep && peCur.rep !== 'none' ? '\n반복되는 일정이 모두 지워져요.' : ''}`)) return; plans = plans.filter(x => x.id !== peCur.id); savePlans(); toast('일정을 지웠어요.'); }
      else { if (!confirm(`${peCur.cat} ${won(peCur.amt)} 기록을 지울까요?`)) return; data.entries = data.entries.filter(x => x.id !== peCur.id); save(); toast('기록을 지웠어요.'); }
      closePe(); render();
    }
    else if (b.hasAttribute('data-peics')) { if (typeof planIcs === 'function') planIcs(readPlanForm()); }
    else if (b.dataset.pec) { peCur.c = b.dataset.pec; peEl.querySelectorAll('[data-pec]').forEach(x => x.classList.toggle('on', x === b)); peEl.querySelectorAll('.pe-dot').forEach(d => { d.className = `pe-dot pc-${peCur.c}`; }); $('pe-pal').hidden = true; }
    else if (b.dataset.pefx !== undefined) { peCur.files.splice(Number(b.dataset.pefx), 1); $('pe-files').innerHTML = peFilesHTML(); }
    else if (b.dataset.pet) { peCur.type = b.dataset.pet; peCur.cat = CATS[peCur.type][0]; peEl.querySelectorAll('[data-pet]').forEach(x => x.classList.toggle('on', x === b)); $('pe-cats').innerHTML = peCatsHTML(); $('pe-h').textContent = `${peCur.type === 'in' ? '수입' : '지출'} 고치기`; }
    else if (b.dataset.pecat) { peCur.cat = b.dataset.pecat; $('pe-cats').innerHTML = peCatsHTML(); }
  }
  async function onPeChange(e) {
    const t = e.target;
    if (t.id === 'pe-all') { peEl.querySelectorAll('#pe-st, #pe-et').forEach(x => { x.hidden = t.checked; }); }
    else if (t.id === 'pe-s') { const en = $('pe-e'); if (en.value < t.value) en.value = t.value; en.min = t.value; }
    else if (t.id === 'pe-alarm') {
      $('pe-ahint').hidden = t.value === 'none';
      if (t.value !== 'none' && 'Notification' in window && Notification.permission === 'default') { try { await Notification.requestPermission(); } catch (err) { /* 허락 창이 안 뜨는 기기 */ } }
    }
    else if (t.id === 'pe-file' && t.files.length) {
      for (const f of [...t.files].slice(0, 3 - peCur.files.length)) { try { peCur.files.push(await shrinkImg(f)); } catch (err) { toast('사진을 넣지 못했어요.'); } }
      if (t.files.length && peCur.files.length >= 3) toast('사진은 3장까지 넣을 수 있어요.');
      $('pe-files').innerHTML = peFilesHTML(); t.value = '';
    }
  }
  function onPeInput(e) { if (e.target.id === 'pe-amt') { const d = e.target.value.replace(/[^0-9]/g, ''); e.target.value = d ? Number(d).toLocaleString('ko-KR') : ''; } }
  // D-day: 「D-day 보기」를 켠 일정은 달력 위에 남은 날을 보여 줘요
  function ddayHTML() {
    const t0 = iso(today), list = [];
    plans.filter(p => p.dday && !p.done).forEach(p => {
      for (let i = 0; i <= 400; i++) { const d = new Date(today); d.setDate(d.getDate() + i); const k = iso(d), o = typeof planOcc === 'function' ? planOcc(p, k) : null; if (o && (o.s === k || (i === 0 && o.s <= t0))) { list.push({ p, n: o.s <= t0 ? 0 : i }); break; } }
    });
    if (!list.length) return '';
    return `<div class="dday-row">${list.sort((a, b) => a.n - b.n).slice(0, 4).map(x => `<button type="button" class="dday pc-${x.p.c}" data-pedit="${esc(x.p.id)}"><b>${x.n ? `D-${x.n}` : 'D-DAY'}</b>${esc(x.p.t)}</button>`).join('')}</div>`;
  }

  const bIco = (n, sz) => (window.donsemBrandIco && n ? window.donsemBrandIco(n, sz) : '');
  const clean = n => String(n || '').replace(/\s*\(고정지출\)$/, '');
  // 날짜를 누르면 달력 바로 밑에 그날 한 장 (네이버 캘린더처럼): 왼쪽 이름표 · 색 막대 · 내용 · 오른쪽 금액
  function daySumHTML(list, y, m, last, payKey) {
    if (!selDay || !selDay.startsWith(month)) return '';
    const dt = new Date(selDay + 'T00:00:00'), es = list.filter(e => e.date === selDay).slice().reverse(), fs = fixedByDay(y, m, last)[dt.getDate()] || [];
    const out = es.filter(e => e.type === 'out').reduce((a, e) => a + e.amt, 0) + fs.reduce((a, x) => a + Number(x.amt), 0), inn = es.filter(e => e.type === 'in').reduce((a, e) => a + e.amt, 0);
    const wd = d => `${d.getMonth() + 1}. ${d.getDate()}.(${W[d.getDay()]})`, dd = k => wd(new Date(k + 'T00:00:00'));
    const row = (lab, bar, title, sub, right, act, ico = '') => `<li class="ds-row${act ? ' tap' : ''}"${act ? ` ${act} role="button" tabindex="0"` : ''}><span class="ds-lab">${lab}</span><i class="ds-bar ${bar}"></i>${ico}<div class="ds-txt"><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</div>${right || ''}${act ? '<span class="ds-go" aria-hidden="true">›</span>' : ''}</li>`;
    const rows = [
      ...plansOn(selDay).map(p => row(p.allDay === false && p.st ? `${p.st}<small>${p.et || ''}</small>` : '종일', `pc-${p.c}`, `${p.done ? '✓ ' : ''}${esc(p.t)}`,
        [p.e && p.e !== p.s ? `${dd(p.s)} - ${dd(p.e)}` : '', p.rep && p.rep !== 'none' ? `↻ ${PL_REP[p.rep]}` : '', p.place ? `📍 ${esc(p.place)}` : ''].filter(Boolean).join(' · '),
        `${p.files && p.files.length ? '<span class="ds-clip" title="첨부 파일">📎</span>' : ''}${p.alarm && p.alarm !== 'none' ? '<span class="ds-clip" title="알림">🔔</span>' : ''}`, `data-pedit="${esc(p.id)}"`).replace('class="ds-row', `class="ds-row${p.done ? ' done' : ''}`)),
      ...(selDay === payKey ? [row('종일', 'ds-pay', '💰 월급날', '', '')] : []),
      ...mcOn(selDay).map(e => row('종일', `ds-mc ${MC_TAG[e.tag] || ''}`, esc(e.t), `${esc(e.tag)} · ${esc(e.go ? e.go[1] : '돈 달력')}에서 보기`, '', `data-mcgo="${esc(e.go ? e.go[0] : '/money-calendar/')}"`)), // 누르면 관련 계산기로
      ...fs.map(x => row('고정지출', 'ds-fx', esc(x.name || x.cat || '고정지출'), bIco(x.name, 36) ? `${esc(x.cat || '구독')} · 매달 나가는 돈` : '매달 나가는 돈 · 누르면 고정지출에서 바꿔요', `<em class="ds-amt out">-${won(Number(x.amt))}</em>`, 'data-fxgo', bIco(x.name, 36))),
      ...es.map(e => { const ic = bIco(e.memo, 36); return row(e.type === 'in' ? '수입' : '지출', e.type === 'in' ? 'ds-in' : 'ds-out', ic ? esc(clean(e.memo)) : esc(e.cat), ic ? esc(e.cat) : e.memo ? esc(e.memo) : '', `<em class="ds-amt ${e.type}">${e.type === 'in' ? '+' : '-'}${won(e.amt)}</em>`, `data-eedit="${esc(e.id)}"`, ic); }),
    ];
    const pop = dsPop && phone.matches, anim = pop && dsIn; dsIn = false;
    return `${pop ? `<div class="ds-dim${anim ? ' in' : ''}" data-dsx aria-hidden="true"></div>` : ''}<div class="day-sheet${pop ? ' pop' : ''}${anim ? ' in' : ''}"${pop ? ' role="dialog" aria-modal="true"' : ''}>${pop ? '<button type="button" class="ds-grip-btn" data-dsx aria-label="닫기"><span class="ds-grip"></span></button>' : '<span class="ds-grip" aria-hidden="true"></span>'}
      <div class="ds-head"><b>${dt.getMonth() + 1}. ${dt.getDate()}. ${W[dt.getDay()]}</b>${selDay === iso(today) ? '<em>오늘</em>' : ''}<span class="ds-sum">${out ? `<span class="out">-${won(out)}</span>` : ''}${inn ? `<span class="in">+${won(inn)}</span>` : ''}</span></div>
      ${rows.length ? `<ul class="ds-list">${rows.join('')}</ul>` : '<p class="ds-none">이날은 아무것도 없어요.</p>'}
      <div class="ds-btns"><button type="button" class="ds-add" data-dsrec>＋ 이날 쓴 돈 적기</button><button type="button" class="ds-add line" data-popen>＋ 일정</button></div></div>`;
  }
  function drawCal(list) {
    const [y, m] = month.split('-').map(Number), first = new Date(y, m - 1, 1).getDay(), last = new Date(y, m, 0).getDate();
    const rows = Math.ceil((first + last) / 7), by = {}, fx = fixedByDay(y, m, last);
    list.forEach(e => { const d = by[e.date] = by[e.date] || { in: 0, out: 0 }; d[e.type] += e.amt; });
    const heatMax = Math.max(1, ...Object.values(by).map(d => d.out));
    // 뱅크샐러드처럼: 무지출 날엔 점, 월급날엔 💰 표시
    let nsDays = [];
    try { const ns = JSON.parse(localStorage.getItem('donsem:nospend')); nsDays = ns && Array.isArray(ns.days) ? ns.days.filter(d => d.startsWith(month)) : []; } catch (e) { nsDays = []; }
    const payKey = payDayOf(y, m);
    let cells = '';
    const focus = selDay && selDay.startsWith(month) ? Number(selDay.slice(8)) : month === iso(today).slice(0, 7) ? today.getDate() : 1;
    const row0 = fold ? Math.floor((first + focus - 1) / 7) : 0, row1 = fold ? row0 + 1 : rows;
    for (let i = row0 * 7; i < row1 * 7; i++) { // 앞뒤 달 날짜도 흐리게 채워서 실제 달력처럼 보여요
      const dt = new Date(y, m - 1, i - first + 1), key = iso(dt), dow = i % 7, own = key.startsWith(month), t = own && by[key];
      const ps = plansOn(key), fs = own ? fx[dt.getDate()] || [] : [], ms = own ? mcOn(key) : [];
      const hv = heat && own && t && t.out ? Math.max(.12, Math.sqrt(t.out / heatMax)) : 0; // 제곱근으로 눌러서 작은 지출도 보이게
      const chips = ps.map(p => { const st = p.s === key || dow === 0, en = (p.e || p.s) === key || dow === 6;
        // 여러 날 일정은 이름이 이번 주 끝(또는 일정 끝)까지 이어지게 폭을 넓혀요
        const span = st ? Math.min(Math.round((new Date((p.e || p.s) + 'T00:00:00') - dt) / 864e5), 6 - dow) + 1 : 1;
        return `<span class="cal-plan pc-${p.c}${p.done ? ' done' : ''}${st ? ' st' : ''}${en ? ' en' : ''}${span > 1 ? ' long' : ''}"${span > 1 ? ` style="--span:${span}"` : ''}>${st ? esc(p.t) : '&nbsp;'}</span>`; });
      cells += `<button type="button"${hv ? ` style="--heat:${hv.toFixed(2)}"` : ''} class="cal-day${hv ? ' hot' : ''}${own && nsDays.includes(key) ? ' ns' : ''}${own ? '' : ' out'}${dow === 0 ? ' sun' : dow === 6 ? ' sat' : ''}${key === iso(today) ? ' today' : ''}${key === selDay ? ' sel' : ''}" data-day="${key}" aria-label="${dt.getMonth() + 1}월 ${dt.getDate()}일${ps.length ? ' 일정 ' + ps.map(p => p.t).join(', ') : ''}${fs.length ? ' 고정지출 ' + fs.map(x => `${x.name || x.cat} ${won(Number(x.amt))}`).join(', ') : ''}${ms.length ? ' 돈 일정 ' + ms.map(e => e.t).join(', ') : ''}${t && t.out ? ` 지출 ${won(t.out)}` : ''}${t && t.in ? ` 수입 ${won(t.in)}` : ''}">
        <span class="cal-n">${dt.getDate()}</span>${calTags([...chips, ...(key === payKey ? ['<span class="cal-pay">💰 월급</span>'] : []), ...ms.map(e => `<span class="cal-mc ${MC_TAG[e.tag] || ''}">${esc(e.t)}</span>`), ...fs.map(x => `<span class="cal-fx">${bIco(x.name, 13)}${esc(x.name || x.cat || '고정지출')}</span>`), ...(own ? list.filter(e => e.date === key && e.type === 'out' && (e.cat === '구독' || String(e.id).startsWith('fx-'))).map(e => `<span class="cal-fx paid">${bIco(e.memo, 13)}${esc(String(e.memo || e.cat).replace(/\s*\(고정지출\)$/, ''))}</span>`) : [])])}${(() => { const inn = t ? t.in : 0, out = (t ? t.out : 0) + fs.reduce((a, x) => a + Number(x.amt), 0); return inn || out ? `<span class="cal-amt">${inn ? `<span class="cal-in">+${calWon(inn)}</span>` : ''}${out ? `<span class="cal-out">-${calWon(out)}</span>` : ''}</span>` : ''; })()}${deco.st[key] ? `<span class="cal-st" aria-hidden="true">${deco.st[key].join('')}</span>` : ''}</button>`;
    }
    const nowYm = iso(today).slice(0, 7);
    // 토스처럼 달력 위에 이달 지출·수입 합계
    const tot = list.reduce((o, e) => (o[e.type] += e.amt, o), { in: 0, out: fixedPaid(y, m) }); // 오늘까지 지난 고정지출(애플뮤직 같은 구독)도 지출에 넣어요. 아직 안 온 날은 빼요
    const sumHTML = `<div class="cal-sum"><div class="cal-tot"><div><span>지출</span><b>${tot.out ? '-' : ''}${won(tot.out)}</b></div><div><span>수입</span><b>${tot.in ? '+' : ''}${won(tot.in)}</b></div></div>${paceHTML(y, m)}</div>`;
    $('b-cal').dataset.th = deco.th;
    $('b-cal').innerHTML = `<div class="cal-paper"><div class="cal-head"><button type="button" data-cm="-1" aria-label="이전 달">‹</button>
        <span class="cal-title"><b>${y}년 ${m}월</b><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg><input type="month" id="b-jump" value="${month}" aria-label="년도와 달 고르기"></span>
        <button type="button" data-cm="1" aria-label="다음 달">›</button>${month !== nowYm ? '<button type="button" class="cal-today" data-ctoday>오늘</button>' : ''}</div>
      ${sumHTML}${ddayHTML()}<div class="cal-week">${[...W].map(w => `<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div><button type="button" class="cal-fold" data-fold aria-expanded="${!fold}">${fold ? '﹀ 달력 펼치기' : '︿ 한 주만 보기'}</button></div>`;
    // 달력 바로 밑: 일정·꾸미기 → (그날 내역) → 놓치면 손해 → 그날 돈 일정
    $('b-cal-mid').innerHTML = daySumHTML(list, y, m, last, payKey);
    document.documentElement.classList.toggle('ds-open', dsPop && phone.matches);
    $('b-cal-more').innerHTML = decoHTML() + lossHTML(month) + mcDayHTML(selDay);
  }
  const calBoxes = ['b-cal', 'b-cal-mid', 'b-cal-more'].map($);
  calBoxes.forEach(box => {
    box.addEventListener('change', e => { if (e.target.id === 'b-jump' && /^\d{4}-\d{2}$/.test(e.target.value)) goMonth(e.target.value); });
    box.addEventListener('keydown', e => { if (e.target.id === 'p-title' && e.key === 'Enter') { e.preventDefault(); addPlan(); } });
    box.addEventListener('input', e => { if (e.target.id === 'p-end' && e.target.value && e.target.value < selDay) e.target.value = selDay; });
    box.addEventListener('click', onCalClick);
    box.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.ds-row.tap')) { e.preventDefault(); e.target.click(); } });
  });
  function onCalClick(e) {
    if (e.target.id === 'b-jump') { try { e.target.showPicker(); } catch (err) { /* 누르면 바로 열리는 브라우저도 있어요 */ } return; }
    if (e.target.closest('[data-dsx]')) { dsPop = false; render(); return; }
    if (onPlan(e) || onDeco(e)) return;
    const ed = e.target.closest('[data-pedit], [data-eedit], [data-fxgo], [data-mcgo]');
    if (ed) { if (ed.dataset.mcgo) location.href = ed.dataset.mcgo; else if (ed.dataset.pedit) openPlanEd(ed.dataset.pedit); else if (ed.dataset.eedit) openRecEd(ed.dataset.eedit); else location.href = '/fixed/'; return; }
    const d = e.target.closest('[data-eid], [data-dsrec]');
    if (d && d.dataset.eid) {
      const it = data.entries.find(x => x.id === d.dataset.eid);
      if (it && confirm(`${it.date} ${it.cat} ${won(it.amt)} 기록을 지울까요?`)) { data.entries = data.entries.filter(x => x.id !== it.id); save(); render(); }
      return;
    }
    if (d) { // 이날 쓴 돈 적기: 「바로 기록하기」 창을 이 날짜로 열어요
      if (typeof window.openQuickAdd === 'function') window.openQuickAdd(selDay); return;
    }
    const b = e.target.closest('[data-day]');
    if (!b) return;
    if (!b.dataset.day.startsWith(month)) return goMonth(b.dataset.day.slice(0, 7), b.dataset.day);
    selDay = b.dataset.day; planOpen = false; if (phone.matches) { dsPop = true; dsIn = true; } render();
  }
  // 아래로 쓸어내리거나 Esc를 누르면 한 장을 닫아요
  { let y0 = null; const mid = $('b-cal-mid');
    mid.addEventListener('touchstart', e => { const sh = e.target.closest('.day-sheet.pop'); y0 = sh && sh.scrollTop <= 0 ? e.touches[0].clientY : null; }, { passive: true });
    mid.addEventListener('touchmove', e => { if (y0 === null) return; const sh = mid.querySelector('.day-sheet.pop'), dy = e.touches[0].clientY - y0; if (sh) sh.style.transform = dy > 0 ? `translateY(${dy}px)` : ''; }, { passive: true });
    mid.addEventListener('touchend', e => { if (y0 === null) return; const sh = mid.querySelector('.day-sheet.pop'), dy = e.changedTouches[0].clientY - y0; y0 = null; if (!sh) return; if (dy > 90) { dsPop = false; render(); } else sh.style.transform = ''; });
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && dsPop && !document.querySelector('.pe, .qa.show')) { dsPop = false; render(); } });
    phone.addEventListener('change', () => { if (dsPop) render(); }); }
  $('b-view').addEventListener('click', e => {
    const v = e.target.closest && e.target.closest('[data-v]') && e.target.closest('[data-v]').dataset.v;
    if (!v) return;
    view = v;
    try { localStorage.setItem('donsem:budget-view', v); } catch (err) { /* 저장 안 돼도 괜찮아요 */ }
    render();
  });
  // 내역 검색: 메모·분류·금액으로 모든 달에서 찾아요
  let query = '';
  $('b-q').addEventListener('input', e => { query = e.target.value.trim(); render(); });
  function searchHits() {
    const q = query.toLowerCase(), qn = q.replace(/[^0-9]/g, '');
    return data.entries.filter(e => (e.memo || '').toLowerCase().includes(q) || e.cat.toLowerCase().includes(q) || (qn && String(e.amt).includes(qn)));
  }
  function drawList(list) {
    const ul = $('b-items');
    if (query) {
      $('b-cal').hidden = $('b-cal-mid').hidden = $('b-cal-more').hidden = true; $('b-view').hidden = true;
      list = searchHits();
      const out = list.filter(e => e.type === 'out').reduce((a, e) => a + e.amt, 0), inn = list.filter(e => e.type === 'in').reduce((a, e) => a + e.amt, 0);
      if (!list.length) { ul.innerHTML = `<li class="empty">'${esc(query)}'에 맞는 기록이 없어요.</li>`; return; }
      ul.innerHTML = `<li class="bq-sum"><b>'${esc(query)}' ${list.length}건</b><span>${out ? `지출 ${won(out)}` : ''}${out && inn ? ' · ' : ''}${inn ? `수입 ${won(inn)}` : ''}</span></li>` + itemsHTML(list, true);
      return;
    }
    $('b-view').hidden = false;
    const cal = view === 'cal';
    $('b-cal').hidden = $('b-cal-mid').hidden = $('b-cal-more').hidden = !cal;
    $('b-view').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    if (cal) {
      drawCal(list);
      if (!selDay || !selDay.startsWith(month)) { ul.innerHTML = '<li class="empty">날짜를 누르면 그날 내역이 보여요.</li>'; return; }
      ul.innerHTML = ''; return; // 그날 내역은 달력 밑 한 장에 같이 보여요
      list = list.filter(e => e.date === selDay);
      if (!list.length) { ul.innerHTML = ''; return; }
      ul.innerHTML = ''; return; // 그날 내역은 달력 밑 한 장에 같이 보여요
    }
    if (!list.length) {
      ul.innerHTML = `<li class="empty">${month === iso(today).slice(0, 7) ? '이번 달 첫 기록을 남겨 보세요. 위에서 금액과 카테고리만 고르면 돼요.' : '이 달에는 기록이 없어요.'}</li>`;
      return;
    }
    ul.innerHTML = itemsHTML(list);
  }
  function itemsHTML(list, withYear) {
    const days = {};
    list.forEach(e => (days[e.date] = days[e.date] || []).push(e));
    return Object.keys(days).sort().reverse().map(d => {
      const items = days[d].slice().reverse(), dt = new Date(d + 'T00:00:00');
      const out = items.filter(e => e.type === 'out').reduce((s, e) => s + e.amt, 0);
      return `<li class="day"><span>${withYear && dt.getFullYear() !== today.getFullYear() ? `${dt.getFullYear()}년 ` : ''}${dt.getMonth() + 1}월 ${dt.getDate()}일 (${W[dt.getDay()]})</span><span>${out ? '지출 ' + won(out) : ''}</span></li>` +
        items.map(e => { const ic = bIco(e.memo, 32); return `<li class="item">${ic || catIcon(e.cat, 32).replace('cat-ico', 'item-ico')}<div>${ic ? `<b>${esc(clean(e.memo))}</b><span>${esc(e.cat)}</span>` : `<b>${esc(e.cat)}</b>${e.memo ? `<span>${esc(e.memo)}</span>` : ''}`}</div>
          <b class="amt ${e.type}">${e.type === 'in' ? '+' : '-'}${won(e.amt)}</b>
          <button type="button" class="del" data-id="${esc(e.id)}" aria-label="${esc(e.cat)} ${won(e.amt)} 기록 지우기">×</button></li>`; }).join('');
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
  const readKey = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  $('b-export').addEventListener('click', () => {
    download(`돈셈-가계부-백업-${stamp()}.json`, JSON.stringify({ app: 'donsem', version: 1, ...data, deco, plans, fixed: readKey('donsem:fixed'), assets: readKey('donsem:assets') }, null, 2), 'application/json');
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
      if (!Object.keys(data.cats).length) data.cats = cleanCats(d.cats);
      if (!data.payday) data.payday = cleanPay(d.payday);
      if (d.deco && d.deco.st && typeof d.deco.st === 'object') { // 스티커는 비어 있는 날에만 채워요
        Object.keys(d.deco.st).forEach(k => { const l = d.deco.st[k]; if (/^\d{4}-\d{2}-\d{2}$/.test(k) && !deco.st[k] && Array.isArray(l)) deco.st[k] = l.filter(c => STICKERS.includes(c)).slice(0, ST_MAX); });
        if (deco.th === 'basic' && THEMES.some(t => t[0] === d.deco.th)) deco.th = d.deco.th;
        saveDeco();
      }
      if (Array.isArray(d.plans)) { // 일정도 없는 것만 더해요
        const ids = new Set(plans.map(p => p.id));
        plans = plans.concat(d.plans.filter(p => p && p.id && !ids.has(p.id) && /^\d{4}-\d{2}-\d{2}$/.test(p.s) && p.t)
          .map(p => ({ id: String(p.id), s: p.s, e: /^\d{4}-\d{2}-\d{2}$/.test(p.e) && p.e > p.s ? p.e : p.s, t: String(p.t).slice(0, 20), c: PCOLORS.includes(p.c) ? p.c : 'pink' })));
        savePlans();
      }
      let more = false; // 고정지출·내 자산은 이 기기에 아무것도 없을 때만 백업으로 채워요
      [['donsem:fixed', d.fixed], ['donsem:assets', d.assets]].forEach(([k, v]) => {
        const cur = readKey(k);
        if (v && Array.isArray(v.items) && v.items.length && !(cur && Array.isArray(cur.items) && cur.items.length)) { try { localStorage.setItem(k, JSON.stringify(v)); more = true; } catch (err) { /* 저장 안 되면 넘어가요 */ } }
      });
      save(); render();
      toast(`기록 ${fresh.length}개를 불러왔어요.${more ? ' 고정지출과 내 자산도 불러와서 화면을 새로 열어요.' : ''}`);
      if (more) setTimeout(() => location.reload(), 1200);
    } catch (err) {
      toast('돈셈 가계부 백업 파일이 아니에요. 파일을 다시 확인해 주세요.');
    }
  });
  $('b-reset').addEventListener('click', () => {
    if (!data.entries.length && !data.budget) return toast('지울 기록이 없어요.');
    if (!confirm(`가계부 기록 ${data.entries.length}개와 예산을 모두 지울까요? 지우면 되돌릴 수 없어요. 먼저 백업 파일을 저장해 두는 걸 추천해요.`)) return;
    data = { entries: [], budget: 0, cats: {}, payday: null };
    save(); render();
    toast('가계부를 모두 지웠어요.');
  });

  $('b-streak').addEventListener('click', e => {
    const b = e.target.closest('[data-restore]');
    if (!b || !useRestore(b.dataset.restore)) return;
    render();
    toast(`복구권을 썼어요. 연속 기록이 ${budgetStreak(data.entries).current}일로 이어졌어요 🎟️`);
  });

  // 같은 화면의 고정지출·내 자산에서 바꾸면 달력도 바로 다시 그려요
  window.addEventListener('donsem:data', () => { data = load(); render(); });

  drawCats();
  render();
})();
