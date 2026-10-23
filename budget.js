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

  // 분류별 예산: { 식비: 400000, ... } (지출 분류만, 0원은 빼요)
  const cleanCats = c => { const o = {}; if (c && typeof c === 'object') CATS.out.forEach(k => { const v = Math.round(Number(c[k])); if (v > 0) o[k] = v; }); return o; };
  function load() {
    try {
      const d = JSON.parse(localStorage.getItem(KEY));
      if (d && Array.isArray(d.entries)) return { entries: d.entries, budget: Number(d.budget) || 0, cats: cleanCats(d.cats) };
    } catch (e) { /* 저장된 게 없거나 망가진 경우 */ }
    return { entries: [], budget: 0, cats: {} };
  }
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch (e) { toast('이 브라우저에서는 저장할 수 없어요. 개인정보 보호 모드인지 확인해 주세요.'); return false; }
  }

  let data = load();
  const today = new Date();
  let month = iso(today).slice(0, 7); // 보고 있는 달 (YYYY-MM)
  let type = 'out', cat = CATS.out[0], editingBudget = false, editingCats = false;
  let view = 'cal', selDay = iso(today); // 내역을 달력으로 볼지 목록으로 볼지, 달력에서 고른 날
  try { if (localStorage.getItem('donsem:budget-view') === 'list') view = 'list'; } catch (e) { /* 기본은 달력 */ }

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
    const [y, m] = month.split('-').map(Number), d = new Date(y, m - 1 + Number(b.dataset.m), 1);
    month = iso(d).slice(0, 7); selDay = month === iso(today).slice(0, 7) ? iso(today) : null; editingBudget = false; render();
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
    drawBudget(sumOut, y, m, list);
    drawStreak();
    drawUpcoming();
    drawList(list);
    drawBreakdown(list, sumOut);
    drawCatBudget(list);
    drawTrend(y, m);
    drawWrap(list, y, m, sumOut);
  }

  // ── 월말 돈 결산 카드 (스포티파이 연말 결산처럼) ──
  const NICK = { '식비': '맛집 탐험가 🍚', '카페·간식': '카페 단골손님 ☕', '교통': '프로 이동러 🚌', '쇼핑': '쇼핑 요정 🛍️', '생활': '살림 고수 🧺', '주거·통신': '집이 최고 🏠',
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
    const icon = typeof CAT_ICONS !== 'undefined' && CAT_ICONS[w.topCat] ? `/icons/cat/${CAT_ICONS[w.topCat]}.webp` : '/icons/wrap.webp';
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

  function drawBudget(used, y, m, list) {
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
      if (left < 0) tip = `<p class="budget-tip">예산을 ${won(-left)} 넘었어요.</p>`;
      else if (isNow) {
        // ① 오늘 쓸 수 있는 돈: 오늘 이미 쓴 돈은 빼고, 남은 예산을 오늘 포함 남은 날로 나눠요
        const todayKey = iso(today), spentToday = list.filter(e => e.type === 'out' && e.date === todayKey).reduce((a, e) => a + e.amt, 0);
        const perDay = Math.floor((left + spentToday) / daysLeft), canToday = Math.max(0, perDay - spentToday);
        tip = `<div class="today-card"><div><span>오늘 쓸 수 있는 돈</span><b>${won(canToday)}</b></div><em>남은 예산 ${won(left)}<br>÷ 남은 ${daysLeft}일${spentToday ? `<br>오늘 ${won(spentToday)} 썼어요` : ''}</em></div>`;
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
    $('b-up').innerHTML = soon.map(({ x, d, n }) => `<li class="up${n <= 2 ? ' soon' : ''}"><span class="up-d"><b>${d.getDate()}</b>${W[d.getDay()]}</span>
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
        const c = {}; box.querySelectorAll('input').forEach(inp => { c[inp.dataset.c] = num(inp.value); });
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

  // ── 달력 ──
  const short = n => n < 1e4 ? n.toLocaleString('ko-KR') : (n < 1e5 ? Math.round(n / 1e3) / 10 : Math.round(n / 1e4)).toLocaleString('ko-KR') + '만';
  function drawCal(list) {
    const [y, m] = month.split('-').map(Number), first = new Date(y, m - 1, 1).getDay(), last = new Date(y, m, 0).getDate();
    const by = {};
    list.forEach(e => { const d = by[e.date] = by[e.date] || { in: 0, out: 0 }; d[e.type] += e.amt; });
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span class="cal-blank"></span>';
    for (let d = 1; d <= last; d++) {
      const key = `${month}-${String(d).padStart(2, '0')}`, t = by[key];
      cells += `<button type="button" class="cal-day${key === iso(today) ? ' today' : ''}${key === selDay ? ' sel' : ''}" data-day="${key}" aria-label="${m}월 ${d}일${t && t.out ? ` 지출 ${won(t.out)}` : ''}${t && t.in ? ` 수입 ${won(t.in)}` : ''}">
        <span class="cal-n">${d}</span>${t && t.out ? `<span class="cal-out">-${short(t.out)}</span>` : ''}${t && t.in ? `<span class="cal-in">+${short(t.in)}</span>` : ''}</button>`;
    }
    $('b-cal').innerHTML = `<div class="cal-week">${[...W].map(w => `<span>${w}</span>`).join('')}</div><div class="cal-grid">${cells}</div>`;
  }
  $('b-cal').addEventListener('click', e => {
    const b = e.target.closest('[data-day]');
    if (!b) return;
    selDay = b.dataset.day; render();
  });
  $('b-view').addEventListener('click', e => {
    const v = e.target.dataset && e.target.dataset.v;
    if (!v) return;
    view = v;
    try { localStorage.setItem('donsem:budget-view', v); } catch (err) { /* 저장 안 돼도 괜찮아요 */ }
    render();
  });
  function drawList(list) {
    const ul = $('b-items'), cal = view === 'cal';
    $('b-cal').hidden = !cal;
    $('b-view').querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === view));
    if (cal) {
      drawCal(list);
      if (!selDay || !selDay.startsWith(month)) { ul.innerHTML = '<li class="empty">날짜를 누르면 그날 내역이 보여요.</li>'; return; }
      list = list.filter(e => e.date === selDay);
      if (!list.length) { ul.innerHTML = `<li class="empty">${Number(selDay.slice(5, 7))}월 ${Number(selDay.slice(8))}일에는 기록이 없어요.</li>`; return; }
    }
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
      if (!Object.keys(data.cats).length) data.cats = cleanCats(d.cats);
      save(); render();
      toast(`기록 ${fresh.length}개를 불러왔어요.`);
    } catch (err) {
      toast('돈셈 가계부 백업 파일이 아니에요. 파일을 다시 확인해 주세요.');
    }
  });
  $('b-reset').addEventListener('click', () => {
    if (!data.entries.length && !data.budget) return toast('지울 기록이 없어요.');
    if (!confirm(`가계부 기록 ${data.entries.length}개와 예산을 모두 지울까요? 지우면 되돌릴 수 없어요. 먼저 백업 파일을 저장해 두는 걸 추천해요.`)) return;
    data = { entries: [], budget: 0, cats: {} };
    save(); render();
    toast('가계부를 모두 지웠어요.');
  });

  drawCats();
  render();
})();
