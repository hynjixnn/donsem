// 무지출 챌린지: 돈을 안 쓴 날 도장을 찍어요. 가계부(donsem:budget)에 지출이 있는 날은 도장이 지워져요.
// 고정지출(월세·구독처럼 자동으로 나가는 돈, 가계부 id가 fx-로 시작)은 지출로 치지 않아요.
(() => {
  const box = document.getElementById('ns');
  if (!box) return;
  const KEY = 'donsem:nospend', iso = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const today = iso(new Date());
  let month = today.slice(0, 7), cache = null;
  const load = () => { try { const s = JSON.parse(localStorage.getItem(KEY)); if (s && Array.isArray(s.days)) return { days: s.days, goal: Number(s.goal) || 10 }; } catch (e) { /* 처음이거나 망가진 경우 */ } return { days: [], goal: 10 }; };
  const save = s => { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); } };
  const entries = () => { try { const b = JSON.parse(localStorage.getItem('donsem:budget')); return b && Array.isArray(b.entries) ? b.entries : []; } catch (e) { return []; } };
  const spentOn = (list, d) => list.filter(e => e.type === 'out' && e.date === d && !String(e.id).startsWith('fx-')).reduce((a, e) => a + e.amt, 0);
  const valid = (s, list) => s.days.filter(d => !spentOn(list, d)); // 지출 기록이 생긴 날은 빼요
  function streak(days) {
    const set = new Set(days), d = new Date();
    if (!set.has(iso(d))) d.setDate(d.getDate() - 1);
    let n = 0;
    while (set.has(iso(d))) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }
  function saved(list, m, stamps) { // 이번 달 '쓴 날' 하루 평균 × 무지출 일수 = 아낀 돈(어림)
    const days = {};
    list.filter(e => e.type === 'out' && e.date.startsWith(m) && !String(e.id).startsWith('fx-')).forEach(e => { days[e.date] = (days[e.date] || 0) + e.amt; });
    const n = Object.keys(days).length;
    return n ? Math.round(Object.values(days).reduce((a, b) => a + b, 0) / n * stamps / 100) * 100 : 0;
  }

  function draw() {
    const s = load(), list = entries(), ok = valid(s, list), set = new Set(ok);
    const mine = ok.filter(d => d.startsWith(month)), thisMonth = ok.filter(d => d.startsWith(today.slice(0, 7)));
    const st = streak(ok), spentToday = spentOn(list, today), money = saved(list, today.slice(0, 7), thisMonth.length);
    const [y, m] = month.split('-').map(Number), first = new Date(y, m - 1, 1).getDay(), last = new Date(y, m, 0).getDate();
    let cells = '';
    for (let i = 0; i < first; i++) cells += '<span></span>';
    for (let d = 1; d <= last; d++) {
      const day = `${month}-${String(d).padStart(2, '0')}`, spent = spentOn(list, day), future = day > today;
      cells += `<button type="button" class="ns-day${set.has(day) ? ' on' : ''}${spent ? ' spent' : ''}${day === today ? ' today' : ''}" data-d="${day}"${future ? ' disabled' : ''} aria-label="${m}월 ${d}일${set.has(day) ? ' 무지출' : spent ? ` 지출 ${won(spent)}` : ''}">
        <i>${d}</i>${set.has(day) ? '<img src="/icons/no-spend.webp" alt="" width="28" height="28">' : spent ? '<b></b>' : ''}</button>`;
    }
    box.innerHTML = `<div class="ns-today">
        <img class="ns-pig${set.has(today) ? ' happy' : ''}" src="/icons/piggy-big.webp" alt="" width="120" height="120">
        ${set.has(today) ? `<p class="ns-msg"><b>오늘 무지출 성공! 🎉</b>${st > 1 ? `${st}일 연속이에요. 내일도 이어 가요!` : '이대로 하루를 마무리해요.'}</p><button type="button" class="link ns-undo">도장 취소</button>`
          : spentToday ? `<p class="ns-msg"><b>오늘은 ${won(spentToday)}을 썼어요</b>괜찮아요. 내일 다시 도전해요!</p>`
          : `<p class="ns-msg"><b>오늘 하루, 돈을 안 썼나요?</b>잠들기 전에 도장을 찍어 주세요.</p><button type="button" class="ns-stamp">오늘 무지출 도장 찍기 🐷</button>`}
      </div>
      <div class="ns-stats">
        <div><b>${thisMonth.length}일</b><span>이번 달 무지출</span></div>
        <div><b>${st}일</b><span>연속 무지출</span></div>
        <div><b>${money ? (money >= 10000 ? `${Math.round(money / 10000).toLocaleString('ko-KR')}만 원` : won(money)) : '—'}</b><span>${money ? '아낀 돈 (어림)' : '가계부를 쓰면 보여요'}</span></div>
      </div>
      <div class="ns-goal"><div class="ns-goal-top"><span>이번 달 목표</span><div class="seg ns-goal-seg">${[5, 10, 15, 20].map(g => `<button type="button" data-g="${g}" class="${s.goal === g ? 'on' : ''}">${g}일</button>`).join('')}</div></div>
        <div class="bar"><i style="width:${Math.min(100, thisMonth.length / s.goal * 100)}%"></i></div>
        <p>${thisMonth.length >= s.goal ? '목표 달성! 대단해요 🎉' : `목표까지 ${s.goal - thisMonth.length}일 남았어요`}</p></div>
      <div class="month-nav"><button type="button" data-m="-1" aria-label="이전 달">‹</button><b>${y}년 ${m}월</b><button type="button" data-m="1" aria-label="다음 달"${month >= today.slice(0, 7) ? ' disabled' : ''}>›</button></div>
      <div class="ns-week">${[...'일월화수목금토'].map(w => `<span>${w}</span>`).join('')}</div>
      <div class="ns-cal">${cells}</div>
      <p class="ns-tip">날짜를 누르면 지난날에도 도장을 찍거나 지울 수 있어요. 🐷 무지출 · <b></b> 지출 기록 있음${mine.length ? ` · ${m}월 무지출 ${mine.length}일` : ''}</p>`;
    box.querySelector('.ns-stamp')?.addEventListener('click', () => toggle(today));
    box.querySelector('.ns-undo')?.addEventListener('click', () => toggle(today));
    box.querySelectorAll('.ns-day').forEach(b => b.addEventListener('click', () => toggle(b.dataset.d)));
    box.querySelectorAll('[data-g]').forEach(b => b.addEventListener('click', () => { const s2 = load(); s2.goal = +b.dataset.g; save(s2); draw(); }));
    box.querySelectorAll('[data-m]').forEach(b => b.addEventListener('click', () => {
      const [yy, mm] = month.split('-').map(Number), d = new Date(yy, mm - 1 + Number(b.dataset.m), 1);
      month = iso(d).slice(0, 7); draw();
    }));
    cache = null;
    clearTimeout(draw.t); draw.t = setTimeout(() => { cache = make(); }, 700); // 스토리 그림을 미리 그려 둬요
  }
  function toggle(day) {
    if (day > today) return;
    const s = load(), list = entries(), spent = spentOn(list, day);
    if (spent) { toast(`이날은 ${won(spent)} 지출 기록이 있어서 도장을 찍을 수 없어요.`); return; }
    const had = s.days.includes(day);
    s.days = had ? s.days.filter(d => d !== day) : [...s.days, day].sort();
    save(s);
    draw();
    if (!had && typeof markDailyFull === 'function') markDailyFull();
    if (!had) {
      const ok = valid(s, list), n = ok.filter(d => d.startsWith(today.slice(0, 7))).length, st = streak(ok);
      toast(n === s.goal && day.startsWith(today.slice(0, 7)) ? `🎉 이번 달 목표 ${s.goal}일 달성!` : st > 1 && day === today ? `🐷 ${st}일 연속 무지출!` : '🐷 무지출 도장 쾅!');
    }
  }

  // ── 스토리 이미지: 이번 달 무지출 달력 ──
  function make() {
    const s = load(), list = entries(), ok = new Set(valid(s, list)), [y, m] = month.split('-').map(Number);
    const n = [...ok].filter(d => d.startsWith(month)).length, money = saved(list, month, n);
    const pig = new Image(); pig.src = '/icons/no-spend.webp';
    return storyCard({ kicker: '돈셈 · 무지출 챌린지', title: `${y}년 ${m}월`, img: '/icons/piggy-big.webp', color: '#ff8fb1',
      big: `무지출 ${n}일 달성`, sub: money ? `안 쓴 날 덕분에 약 ${money >= 10000 ? `${Math.round(money / 10000).toLocaleString('ko-KR')}만 원` : won(money)} 아꼈어요` : `연속 ${streak([...ok])}일 · 목표 ${s.goal}일`,
      draw: (c, top, { text, round, W }) => { // 작은 달력
        const first = new Date(y, m - 1, 1).getDay(), last = new Date(y, m, 0).getDate(), cw = 120, x0 = (W - cw * 7) / 2;
        const rowsN = Math.ceil((first + last) / 7);
        round(x0 - 20, top, cw * 7 + 40, rowsN * 100 + 40, 36, 'rgba(255,255,255,.85)');
        for (let d = 1; d <= last; d++) {
          const i = first + d - 1, x = x0 + (i % 7) * cw + cw / 2, yy = top + 20 + Math.floor(i / 7) * 100 + 50;
          const day = `${month}-${String(d).padStart(2, '0')}`;
          if (ok.has(day)) { c.beginPath(); c.arc(x, yy, 40, 0, Math.PI * 2); c.fillStyle = '#ffd6e2'; c.fill(); if (pig.complete && pig.naturalWidth) c.drawImage(pig, x - 30, yy - 30, 60, 60); }
          else text(String(d), x, yy + 12, 34, 500, '#8e8e93');
        }
        return rowsN * 100 + 40;
      },
      foot: '너도 무지출 챌린지 할래? 🐷', link: `${location.origin}/no-spend/` });
  }
  const btn = storyButton('무지출 달력 인스타 스토리에 올리기', () => cache || (cache = make()), '돈셈_무지출챌린지.png', `${location.origin}/no-spend/`);
  btn.classList.add('ns-story');
  box.after(btn);
  draw();
  window.addEventListener('pageshow', e => { if (e.persisted) draw(); }); // 가계부에 기록하고 돌아오면 다시 그려요
})();
