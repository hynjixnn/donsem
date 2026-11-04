// 돈셈 마이: 화면 모드 고르기, 가계부·고정지출·내 자산·목표·퀴즈(돈나무)·무지출·돈BTI 전체 백업/복원
(() => {
  const $ = id => document.getElementById(id);
  // 이름표: 저장 키, 목록이 들어 있는 칸, 보여 줄 이름
  const PARTS = [
    { key: 'donsem:budget', list: 'entries', name: '가계부 기록' },
    { key: 'donsem:fixed', list: 'items', name: '고정지출' },
    { key: 'donsem:assets', list: 'items', name: '내 자산 항목' },
    { key: 'donsem:goals', list: 'goals', name: '목표' },
  ];
  const read = key => { try { return JSON.parse(localStorage.getItem(key)) || null; } catch (e) { return null; } };
  const write = (key, v) => { try { localStorage.setItem(key, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) { /* 저장이 막힌 브라우저 */ } };
  // 목록이 아닌 기록들: 퀴즈(돈나무 포함), 무지출 도장, 돈BTI 결과, 즐겨찾기 — 날짜·이름 단위로 합쳐요
  const rawStr = key => { try { return localStorage.getItem(key); } catch (e) { return null; } };
  function extraPlan(d) {
    const q = d.quiz && d.quiz.days ? d.quiz : null, myQ = read('donsem:quiz') || { days: {}, solved: [] };
    const ns = d.nospend && Array.isArray(d.nospend.days) ? d.nospend : null, myNs = read('donsem:nospend') || { days: [] };
    const favs = Array.isArray(d.favs) ? d.favs.filter(x => typeof x === 'string') : [], myFavs = read('donsem:favs') || [];
    const qNew = q ? Object.keys(q.days).filter(k => !(myQ.days || {})[k]).length : 0;
    const nsNew = ns ? ns.days.filter(x => !(myNs.days || []).includes(x)).length : 0;
    const mtNew = typeof d.moneyType === 'string' && /^[su][pf][ar][mw]$/.test(d.moneyType) && !rawStr('donsem:money-type') ? 1 : 0;
    const favNew = favs.filter(x => !myFavs.includes(x)).length;
    return {
      list: [qNew && `퀴즈 기록 ${qNew}일`, nsNew && `무지출 도장 ${nsNew}개`, mtNew && '돈BTI 결과', favNew && `즐겨찾기 ${favNew}개`].filter(Boolean),
      count: qNew + nsNew + mtNew + favNew,
      apply() {
        if (q) {
          const days = Object.assign({}, q.days, myQ.days || {}), prac = Object.assign({}, q.prac || {}), full = Object.assign({}, q.full || {}, myQ.full || {});
          Object.entries(myQ.prac || {}).forEach(([k, v]) => { prac[k] = Math.max(prac[k] || 0, v); });
          write('donsem:quiz', Object.assign({}, myQ, { days, prac, full, solved: [...new Set([...(myQ.solved || []), ...(q.solved || [])])], seed: myQ.seed || q.seed || 0 }));
        }
        if (ns) write('donsem:nospend', { days: [...new Set([...(myNs.days || []), ...ns.days])].sort(), goal: myNs.goal || ns.goal || 10 });
        if (mtNew) write('donsem:money-type', d.moneyType);
        if (favNew) write('donsem:favs', [...myFavs, ...favs.filter(x => !myFavs.includes(x))]);
        if (d.profile && typeof d.profile === 'object' && !read('donsem:profile')) write('donsem:profile', { e: String(d.profile.e || '🐷').slice(0, 4), n: String(d.profile.n || '').slice(0, 12) });
      },
    };
  }

  // ── 화면 모드 ──
  function drawTheme() {
    const now = document.documentElement.dataset.theme || 'light';
    document.querySelectorAll('#my-theme [data-v]').forEach(b => { const on = b.dataset.v === now; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(on)); });
  }
  $('my-theme').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'), v = b && b.dataset.v; // 그림·글자 어디를 눌러도 그 줄이 골라져요
    if (!v) return;
    store.set('donsem:theme', v);
    applyTheme(v, true);
    drawTheme();
  });
  document.querySelectorAll('.theme-btn').forEach(b => b.addEventListener('click', () => setTimeout(drawTheme, 0)));
  drawTheme();

  // ── 지금 저장된 기록 수 ──
  function drawCount() {
    const parts = PARTS.map(p => { const d = read(p.key); const n = d && Array.isArray(d[p.list]) ? d[p.list].length : 0; return n ? `${p.name} ${n}개` : ''; }).filter(Boolean);
    const q = read('donsem:quiz'), ns = read('donsem:nospend'), mt = rawStr('donsem:money-type');
    if (q && q.days && Object.keys(q.days).length) parts.push(`퀴즈 ${Object.keys(q.days).length}일 (돈나무 ${typeof treeOf === 'function' ? treeOf(quizLoad()).name : ''})`.replace(' ()', ''));
    if (ns && Array.isArray(ns.days) && ns.days.length) parts.push(`무지출 도장 ${ns.days.length}개`);
    if (mt) parts.push('돈BTI 결과');
    $('my-count').textContent = parts.length ? `이 기기에 저장된 기록: ${parts.join(' · ')}` : '이 기기에는 아직 저장된 기록이 없어요.';
  }
  drawCount();

  // ── 전체 백업 저장 ──
  $('my-export').addEventListener('click', () => {
    const out = { app: 'donsem-all', version: 1, saved: new Date().toISOString() };
    PARTS.forEach(p => { out[p.key.split(':')[1]] = read(p.key); });
    out.quiz = read('donsem:quiz'); out.nospend = read('donsem:nospend'); out.moneyType = rawStr('donsem:money-type'); out.favs = read('donsem:favs'); out.profile = read('donsem:profile');
    const url = URL.createObjectURL(new Blob([JSON.stringify(out, null, 2)], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url; a.download = `돈셈-전체-백업-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}.json`;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('전체 백업 파일을 저장했어요. 안전한 곳에 보관하세요.');
  });

  // ── 전체 백업 불러오기: 같은 기록은 두 번 들어가지 않게 합쳐요 ──
  $('my-import').addEventListener('change', async e => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;
    let d;
    try { d = JSON.parse(await file.text()); } catch (err) { d = null; }
    if (!d || d.app !== 'donsem-all') return toast('돈셈 전체 백업 파일이 아니에요. 마이에서 저장한 파일을 골라 주세요.');
    const plan = PARTS.map(p => {
      const incoming = d[p.key.split(':')[1]], list = incoming && Array.isArray(incoming[p.list]) ? incoming[p.list].filter(x => x && x.id) : [];
      const mine = read(p.key) || {}, have = new Set((Array.isArray(mine[p.list]) ? mine[p.list] : []).map(x => x.id));
      return { p, incoming, mine, fresh: list.filter(x => !have.has(x.id)) };
    });
    const extra = extraPlan(d), total = plan.reduce((s, x) => s + x.fresh.length, 0) + extra.count;
    if (!total) return toast('새로 불러올 기록이 없어요. 이미 다 들어 있어요.');
    if (!confirm(`백업에서 새 기록을 찾았어요 (${plan.filter(x => x.fresh.length).map(x => `${x.p.name} ${x.fresh.length}개`).concat(extra.list).join(', ')}). 지금 기록에 합칠까요?`)) return;
    extra.apply();
    plan.forEach(({ p, incoming, mine, fresh }) => {
      if (!fresh.length && !(incoming && incoming.history)) return;
      const merged = Object.assign({}, incoming || {}, mine);
      merged[p.list] = (Array.isArray(mine[p.list]) ? mine[p.list] : []).concat(fresh);
      if (p.key === 'donsem:budget' && !mine.budget && incoming && incoming.budget) merged.budget = Number(incoming.budget) || 0;
      if (p.key === 'donsem:assets') merged.history = Object.assign({}, (incoming && incoming.history) || {}, mine.history || {});
      try { localStorage.setItem(p.key, JSON.stringify(merged)); } catch (err) { /* 저장이 막힌 브라우저 */ }
    });
    drawCount();
    toast('백업을 불러왔어요.');
  });

  // ── 프로필 꾸미기 (배민 '마이배민'처럼 스티커 + 별명): 이 기기에만 저장돼요 ──
  const STK = ['🐷', '🐰', '🐻', '🦊', '🐱', '🐶', '🐼', '🐥', '🐸', '🦁', '🐯', '🐳', '💰', '🍀', '🌱', '⭐'];
  const pf = Object.assign({ e: '🐷', n: '' }, read('donsem:profile') || {});
  let pick = STK.includes(pf.e) ? pf.e : '🐷';
  function drawPf() {
    $('pf-av').textContent = pf.e; $('pf-name').textContent = pf.n || '돈셈이';
    $('pf-stk').innerHTML = STK.map(x => `<button type="button" role="radio" aria-checked="${x === pick}" class="${x === pick ? 'on' : ''}" data-e="${x}">${x}</button>`).join('');
  }
  const openPf = () => { const p = $('pf-panel'); p.hidden = !p.hidden; $('pf-edit').setAttribute('aria-expanded', String(!p.hidden)); if (!p.hidden) { pick = pf.e; $('pf-in').value = pf.n; drawPf(); } };
  $('pf-edit').addEventListener('click', openPf); $('pf-av').addEventListener('click', openPf);
  $('pf-stk').addEventListener('click', e => { const b = e.target.closest('[data-e]'); if (!b) return; pick = b.dataset.e; drawPf(); $('pf-av').textContent = pick; });
  $('pf-save').addEventListener('click', () => {
    pf.e = pick; pf.n = $('pf-in').value.trim().slice(0, 12);
    write('donsem:profile', pf); drawPf(); $('pf-panel').hidden = true; $('pf-edit').setAttribute('aria-expanded', 'false');
    toast('프로필을 바꿨어요.');
  });
  drawPf();

  // ── 출석체크 (카카오페이처럼 오전·오후 하루 두 번, 3일·5일 연속이면 보너스): 출석한 날은 돈 온도에도 더해져요 ──
  const AT = 'donsem:attend', atRead = () => { const v = read(AT); return v && v.days && typeof v.days === 'object' ? v : { days: {} }; };
  const ymdOf = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
  function atStreak(days) { // 오늘(아직이면 어제)까지 이어진 출석 날짜 수
    const d = new Date(); if (!days[ymdOf(d)]) d.setDate(d.getDate() - 1);
    let n = 0; while (days[ymdOf(d)]) { n++; d.setDate(d.getDate() - 1); } return n;
  }
  function drawAttend() {
    if (!$('my-attend')) return;
    const a = atRead(), today = ymdOf(new Date()), got = a.days[today] || [], pm = new Date().getHours() >= 12, st = atStreak(a.days);
    const slot = (k, label, ico, open) => { const done = got.includes(k); return `<button type="button" class="at-slot ${done ? 'done' : ''} ${open && !done ? 'now' : ''}" data-at="${k}" ${done || !open ? 'disabled' : ''}><span aria-hidden="true">${ico}</span><b>${label}</b><small>${done ? '완료' : open ? '지금 체크' : k === 'am' ? '놓쳤어요' : '12시부터'}</small></button>`; };
    $('at-slots').innerHTML = slot('am', '오전 출석', '🌤️', !pm) + slot('pm', '오후 출석', '☀️', pm);
    const pos = got.length ? st : st + 1; // 오늘 체크하면 몇 번째 날인지
    $('at-week').innerHTML = [1, 2, 3, 4, 5, 6, 7].map(i => `<li class="${i < pos || (i === pos && got.length) ? 'ok' : i === pos ? 'next' : ''}"><i>${i < pos || (i === pos && got.length) ? '✓' : i}</i><small>${i === 3 ? '×2' : i === 5 ? '×3' : i === 7 ? '🎁' : `${i}일`}</small></li>`).join('');
    $('at-streak').textContent = st ? `${st}일 연속` : '';
    $('at-msg').textContent = got.length === 2 ? '오늘 출석을 모두 끝냈어요. 내일 또 만나요!' : st >= 7 ? '일주일 연속 출석! 돈 온도가 쑥 올라가요.' : '출석한 날은 나의 돈 온도에 더해져요. 3일·5일 연속이면 보너스예요.';
  }
  $('my-attend') && $('at-slots').addEventListener('click', e => {
    const b = e.target.closest('[data-at]'); if (!b || b.disabled) return;
    const a = atRead(), today = ymdOf(new Date()); a.days[today] = [...new Set([...(a.days[today] || []), b.dataset.at])];
    Object.keys(a.days).filter(k => k < ymdOf(new Date(Date.now() - 400 * 864e5))).forEach(k => delete a.days[k]); // 1년 넘은 기록은 정리
    write(AT, a);
    const st = atStreak(a.days);
    toast(st === 3 && a.days[today].length === 1 ? '🎉 3일 연속 출석! 보너스 ×2로 돈 온도가 더 올라요.' : st === 5 && a.days[today].length === 1 ? '🎉 5일 연속 출석! 보너스 ×3!' : st === 7 && a.days[today].length === 1 ? '🎁 일주일 연속 출석 달성!' : '출석 완료! 돈 온도에 더해졌어요.');
    drawAttend(); drawTemp();
  });
  drawAttend();

  // ── 나의 돈 온도: 처음 36.5℃에서, 꾸준한 기록·무지출·예산 지키기로 오르고 예산 초과·오래 쉬면 내려가요 (이 기기 기록으로만) ──
  function drawTemp() {
    const d = new Date(), ymd = x => `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
    const today = ymd(d), since = ymd(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 29)), ym = today.slice(0, 7);
    const b = read('donsem:budget') || {}, es = Array.isArray(b.entries) ? b.entries.filter(e => e && typeof e.date === 'string') : [];
    const mine = es.filter(e => !String(e.id).startsWith('fx-')); // 고정지출에서 한 번에 넣은 기록은 '직접 적은 날'로 세지 않아요
    const recDays = new Set(mine.filter(e => e.date >= since && e.date <= today).map(e => e.date)).size;
    const st = typeof budgetStreak === 'function' ? budgetStreak(es) : { current: 0 };
    const nsDays = ((read('donsem:nospend') || {}).days || []).filter(x => x >= since && x <= today).length;
    const spent = es.filter(e => e.type === 'out' && e.date.startsWith(ym)).reduce((s, e) => s + (Number(e.amt) || 0), 0), bud = Number(b.budget) || 0;
    const dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), pace = bud ? spent / (bud * d.getDate() / dim) : 0;
    const cnt = (k, l) => { const v = read(k); return v && Array.isArray(v[l]) ? v[l].length : 0; };
    const fixed = cnt('donsem:fixed', 'items'), assets = cnt('donsem:assets', 'items'), goals = cnt('donsem:goals', 'goals');
    const q = read('donsem:quiz'), quizDays = q && q.days ? Object.keys(q.days).length : 0;
    const last = mine.map(e => e.date).filter(x => x <= today).sort().pop(), rest = last ? Math.round((Date.parse(today) - Date.parse(last)) / 864e5) : 0;
    const why = []; // [무엇, 얼마나, 온도 변화]
    if (recDays) why.push(['최근 30일 가계부 기록', `${recDays}일`, Math.min(3, recDays * 0.1)]);
    if (st.current >= 3) why.push(['연속 기록', `${st.current}일째`, Math.min(2, st.current * 0.05)]);
    if (nsDays) why.push(['최근 30일 무지출 도장', `${nsDays}개`, Math.min(3, nsDays * 0.3)]);
    if (bud && spent) why.push(pace <= 1 ? ['이번 달 예산', '속도 안에서 쓰는 중', 1.5] : ['이번 달 예산', `속도보다 ${Math.round((pace - 1) * 100)}% 빨라요`, -Math.min(2, (pace - 1) * 2)]);
    if (fixed) why.push(['고정지출 정리', `${fixed}개`, 0.5]);
    if (assets) why.push(['내 자산 정리', `${assets}개`, 0.5]);
    if (goals) why.push(['모으는 목표', `${goals}개`, Math.min(1, goals * 0.5)]);
    if (quizDays) why.push(['돈 퀴즈', `${quizDays}일`, Math.min(1.5, quizDays * 0.05)]);
    { const ad = Object.keys(atRead().days).filter(k => k >= since && k <= today).length, ast = atStreak(atRead().days); // 출석: 하루 0.05℃, 3일·5일 연속이면 ×2·×3
      if (ad) why.push(['최근 30일 출석', `${ad}일${ast >= 3 ? ` · ${ast}일 연속 ×${ast >= 5 ? 3 : 2}` : ''}`, Math.min(2, ad * 0.05 * (ast >= 5 ? 3 : ast >= 3 ? 2 : 1))]); }
    if (rest > 14) why.push(['기록을 쉰 지', `${rest}일`, -1]);
    const t = Math.max(30, Math.min(99, Math.round((36.5 + why.reduce((s, w) => s + w[2], 0)) * 10) / 10));
    const lv = t < 36 ? ['😟', 'cold'] : t < 37.5 ? ['🙂', 'mild'] : t < 40 ? ['😊', 'warm'] : t < 45 ? ['😄', 'hot'] : ['🥰', 'fire'];
    $('tp-num').textContent = `${t.toFixed(1)}℃`; $('tp-face').textContent = lv[0];
    if ($('pf-temp')) { $('pf-temp').textContent = `${t.toFixed(1)}℃`; $('pf-temp').dataset.lv = lv[1]; } // 프로필 옆에도 온도
    $('my-temp').dataset.lv = lv[1];
    $('tp-fill').style.width = `${Math.max(4, Math.min(100, (t - 30) / 20 * 100))}%`; // 50℃면 가득
    const e = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    $('tp-why').innerHTML = why.length ? why.map(([a, v, x]) => `<li><span>${e(a)} <small>${e(v)}</small></span><b class="${x < 0 ? 'dn' : 'up'}">${x < 0 ? '−' : '+'}${Math.abs(x).toFixed(1)}℃</b></li>`).join('')
      : '<li class="tp-empty">아직 기록이 없어서 처음 온도 그대로예요.</li>';
    // 다음에 하면 온도가 오르는 것 하나만
    const next = !recDays ? ['/budget/', '오늘 쓴 돈을 기록하면 온도가 올라가요 ›'] : !nsDays ? ['/no-spend/', '돈 안 쓴 날 무지출 도장을 찍어 보세요 ›'] : !bud ? ['/budget/', '이번 달 예산을 정하고 지키면 +1.5℃ ›']
      : !fixed ? ['/fixed/', '월세·구독 같은 고정지출을 정리해 보세요 ›'] : !goals ? ['/goals/', '모으고 싶은 목표를 하나 만들어 보세요 ›'] : null;
    $('tp-next').hidden = !next;
    if (next) { $('tp-next').href = next[0]; $('tp-next').textContent = next[1]; }
  }
  $('my-temp').querySelector('.tp-q').addEventListener('click', ev => { const h = $('tp-help'); h.hidden = !h.hidden; ev.currentTarget.setAttribute('aria-expanded', String(!h.hidden)); });
  drawTemp();

  // ── 이달의 돈 미션 (네이버 '적립챌린지 · 11월 미션'처럼): 달이 바뀌면 새로 시작해요 ──
  (() => {
    if (!$('my-mission')) return;
    const d = new Date(), ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`, dim = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate(), left = dim - d.getDate();
    const b = read('donsem:budget') || {}, es = Array.isArray(b.entries) ? b.entries.filter(e => e && typeof e.date === 'string' && e.date.startsWith(ym)) : [];
    const todayS = `${ym}-${String(d.getDate()).padStart(2, '0')}`, rec = new Set(es.filter(e => !String(e.id).startsWith('fx-') && e.date <= todayS).map(e => e.date)).size; // 미래 날짜 기록은 빼요
    const ns = ((read('donsem:nospend') || {}).days || []).filter(x => String(x).startsWith(ym)).length;
    const q = read('donsem:quiz'), qz = q && q.days ? Object.keys(q.days).filter(k => k.startsWith(ym)).length : 0;
    const bud = Number(b.budget) || 0, spent = es.filter(e => e.type === 'out').reduce((s2, e) => s2 + (Number(e.amt) || 0), 0), pace = bud ? spent / (bud * d.getDate() / dim) : 0;
    const ms = [
      ['📒', '가계부 15일 기록하기', rec, 15, '/budget/'],
      ['🚫', '무지출 날 5일 만들기', ns, 5, '/no-spend/'],
      ['💡', '돈 퀴즈 10일 풀기', qz, 10, '/quiz/'],
      ['🎯', bud ? '예산 속도 지키기' : '이번 달 예산 정하기', bud ? (pace <= 1 ? 1 : 0) : 0, 1, '/budget/'],
    ];
    const done = ms.filter(m => m[2] >= m[3]).length;
    $('ms-title').textContent = `${d.getMonth() + 1}월 돈 미션`;
    $('ms-dday').textContent = left ? `D-${left}` : '오늘 마감';
    $('ms-sum').textContent = done === ms.length ? `🎉 ${d.getMonth() + 1}월 미션을 모두 끝냈어요! 다음 달에 새 미션이 열려요.` : `${ms.length}개 중 ${done}개 끝냈어요. 달이 끝나기 전에 모두 채워 보세요.`;
    const e2 = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
    $('ms-list').innerHTML = ms.map(([ic, t, v, goal, href]) => { const ok = v >= goal, pct = Math.min(100, Math.round(v / goal * 100));
      return `<li class="${ok ? 'ok' : ''}"><a href="${href}"><span class="ms-ic" aria-hidden="true">${ok ? '✅' : ic}</span><span class="ms-t"><b>${e2(t)}</b><i class="ms-bar"><i style="width:${pct}%"></i></i></span><em>${goal > 1 ? `${Math.min(v, goal)}/${goal}` : ok ? '완료' : '하러 가기'}</em></a></li>`; }).join('');
  })();

  // 이미 홈 화면 앱으로 열었다면 설치 안내 대신 확인 문구
  if ((window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true) {
    $('my-install').innerHTML = '<span class="my-installed">✓</span> 지금 홈 화면에 설치한 돈셈 앱으로 쓰고 있어요.'; // 체크 표시가 줄 끝에 홀로 떨어지지 않게 앞에 둬요
  }
})();

// ── 마이: 즐겨찾기 · 최근 본 계산기 (무신사 '좋아요 · 최근 본'처럼 탭으로) ──
(() => {
  const box = document.getElementById('my-likes'); if (!box || typeof MENU === 'undefined') return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  const get = k => { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } };
  const nameOf = {}; MENU.forEach(([, items]) => items.forEach(([p, n]) => { nameOf[p] = nameOf[p] || n; }));
  const favs = get('donsem:favs').filter(p => nameOf[p]).map(p => ({ p, name: nameOf[p] }));
  const recent = get('donsem:recent').filter(r => r && r.p).map(r => ({ p: r.p, name: nameOf[r.p] || r.name, big: r.big }));
  const POP = ['/salary/', '/loan/', '/savings/', '/year-end-tax/', '/severance/', '/delivery/'];
  const tabs = [['fav', '즐겨찾기', favs, '아직 즐겨찾기가 없어요. 계산기 화면의 ☆를 누르면 여기에 모여요.'], ['recent', '최근 본', recent, '아직 써 본 계산기가 없어요.']];
  let on = favs.length || !recent.length ? 'fav' : 'recent';
  const card = x => { const ic = iconOf(x.p); return `<a class="lk-item" href="${esc(x.p)}">${ic ? ic.replace('class="ico"', 'class="lk-ico"') : `<span class="lk-ico lk-txt" aria-hidden="true">${esc(x.name.slice(0, 1))}</span>`}<b>${esc(x.name)}</b>${x.big ? `<small>${esc(x.big)}</small>` : ''}</a>`; };
  function draw() {
    const t = tabs.find(x => x[0] === on);
    box.innerHTML = `<div class="lk-tabs" role="tablist">${tabs.map(([k, n, l]) => `<button type="button" role="tab" data-k="${k}" class="${k === on ? 'on' : ''}" aria-selected="${k === on}">${n} <span>${l.length}</span></button>`).join('')}</div>
      ${t[2].length ? `<div class="lk-row">${t[2].map(card).join('')}</div>` : `<p class="hint">${t[3]}</p>`}
      ${on === 'fav' && !favs.length ? `<p class="lk-pop">많은 사람이 즐겨 찾는 계산기</p><div class="lk-row">${POP.filter(p => nameOf[p]).map(p => card({ p, name: nameOf[p] })).join('')}</div>` : ''}`; // 배민 '단골이 찜한 가게'처럼
  }
  box.addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { on = b.dataset.k; draw(); } });
  draw();
})();
