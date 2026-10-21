// 내 컬렉션: 돈나무, 받은 배지, 돈BTI 캐릭터, 기록 숫자를 한곳에 모아 보여 줘요 (모두 이 기기의 기록에서 계산)
(() => {
  const box = document.getElementById('col');
  if (!box || typeof QUIZ === 'undefined') return;
  const read = k => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const ANIMALS = { spam: ['chipmunk', '철벽 금고 다람쥐'], spaw: ['ant', '알뜰 살림꾼 개미'], sprm: ['owl', '전략가 부엉이'], sprw: ['honeybee', '부지런한 꿀벌'], sfam: ['turtle', '느긋한 저축 거북이'], sfaw: ['bear', '든든한 곰'],
    sfrm: ['fox', '촉 좋은 여우'], sfrw: ['dolphin', '영리한 돌고래'], upam: ['cat', '취향 확실 고양이'], upaw: ['dog', '다정한 강아지'], uprm: ['lion', '야망가 사자'], uprw: ['penguin', '팀플 리더 펭귄'],
    ufam: ['hamster', '장바구니 직진 햄스터'], ufaw: ['panda', '인싸 판다'], ufrm: ['rabbit', '욜로 토끼'], ufrw: ['koala', '흥 부자 코알라'] };

  function stats() {
    const q = quizLoad(), b = read('donsem:budget'), ns = read('donsem:nospend');
    const entries = b && Array.isArray(b.entries) ? b.entries : [];
    const spent = new Set(entries.filter(e => e.type === 'out' && !String(e.id).startsWith('fx-')).map(e => e.date));
    const nsDays = ns && Array.isArray(ns.days) ? ns.days.filter(d => !spent.has(d)) : [];
    let mt = null;
    try { mt = localStorage.getItem('donsem:money-type'); } catch (e) { mt = null; }
    const asDates = list => list.map(date => ({ date })); // budgetStreak는 날짜 목록이면 무엇이든 연속 기록을 세 줘요
    return {
      tree: treeOf(q), quizDays: Object.keys(q.days).length, quizBest: budgetStreak(asDates(Object.keys(q.days))).best, quizNow: quizStreak(q), solved: q.solved.length,
      budgetBest: budgetStreak(entries).best, records: entries.filter(e => !String(e.id).startsWith('fx-')).length,
      nsTotal: nsDays.length, nsBest: budgetStreak(asDates(nsDays)).best, full: Object.keys(q.full || {}).length, mt: ANIMALS[mt] ? mt : null,
    };
  }
  // [그룹 이름, [[필요한 수, 아이콘, 이름, 숫자 고르는 함수, 설명]]]
  const BADGES = [
    ['오늘의 돈 퀴즈', [[3, '🌱', '퀴즈 3일', s => s.quizBest, '3일 연속 풀기'], [7, '🔥', '퀴즈 일주일', s => s.quizBest, '7일 연속 풀기'], [30, '🏆', '퀴즈 한 달', s => s.quizBest, '30일 연속 풀기'],
      [10, '🧠', '정답 10개', s => s.solved, '서로 다른 문제 10개 맞히기'], [QUIZ.length, '👑', '퀴즈 정복', s => s.solved, `${QUIZ.length}문제 모두 맞히기`]]],
    ['무지출 챌린지', [[1, '🐷', '첫 무지출', s => s.nsTotal, '무지출 도장 1개'], [10, '💪', '무지출 10일', s => s.nsTotal, '무지출 도장 10개'], [3, '🔗', '무지출 3연속', s => s.nsBest, '3일 연속 무지출'], [30, '🐖', '무지출 30일', s => s.nsTotal, '무지출 도장 30개']]],
    ['가계부', [...STREAK_BADGES.map(([n, icon, name]) => [n, icon, `기록 ${name}`, s => s.budgetBest, `${n}일 연속 기록`]), [100, '📒', '기록 100건', s => s.records, '가계부 기록 100건']]],
    ['오늘의 돈셈', [[1, '✅', '첫 완료', s => s.full, '하루에 3개 다 하기'], [7, '📅', '완료 7일', s => s.full, '3개 다 한 날 7일'], [30, '💎', '완료 30일', s => s.full, '3개 다 한 날 30일']]],
    ['테스트', [[1, '🐾', '돈BTI 완료', s => (s.mt ? 1 : 0), '돈BTI 테스트 하기']]],
  ];

  function draw() {
    const s = stats(), t = s.tree;
    const all = BADGES.flatMap(([, list]) => list), got = all.filter(([n, , , f]) => f(s) >= n).length;
    const next = all.filter(([n, , , f]) => f(s) < n).sort((a, b) => (a[3](s) / a[0] < b[3](s) / b[0] ? 1 : -1))[0]; // 가장 가까운 다음 배지
    box.innerHTML = `
      <section class="col-tree">
        <img class="tree-img lv${t.lv}" src="${t.img}" alt="${t.name}" width="128" height="128">
        <div><span class="tree-cap">내 돈나무 · Lv.${t.lv + 1}</span><h2>${t.name}${t.fruit ? ` <small>💰 열매 ${t.fruit}개</small>` : ''}</h2>
          <div class="bar"><i style="width:${t.pct}%"></i></div><p>${t.next ? `'${t.nextName}'까지 💧 ${t.next}번` : `다음 열매까지 💧 ${TREE_FRUIT - (t.pts - TREE[TREE.length - 1][0]) % TREE_FRUIT}번`}</p></div>
        <div class="col-stages">${TREE.map(([, name], i) => `<span class="${i <= t.lv ? 'on' : ''}" title="${name}"><img src="/icons/tree/${i}.webp" alt="${name}" width="40" height="40"></span>`).join('')}</div>
      </section>
      <div class="col-nums">
        <div><b>${s.quizNow}일</b><span>퀴즈 연속</span></div>
        <div><b>${s.solved}<small>/${QUIZ.length}</small></b><span>맞힌 문제</span></div>
        <div><b>${s.nsTotal}일</b><span>무지출</span></div>
        <div><b>${s.full}일</b><span>돈셈 완료</span></div>
      </div>
      <a class="col-mt" href="/money-type/${s.mt ? `?t=${s.mt}` : ''}">${s.mt ? `<img src="/icons/dbti/${ANIMALS[s.mt][0]}.webp" alt="" width="56" height="56"><div><span>나의 돈BTI</span><b>${ANIMALS[s.mt][1]}</b></div>`
        : `<img src="/icons/money-type.webp" alt="" width="56" height="56"><div><span>나의 돈BTI</span><b>아직 몰라요 · 1분 테스트 하기</b></div>`}<i>›</i></a>
      <div class="col-badge-head"><h2>배지</h2><span>${got} / ${all.length}개 모음</span></div>
      ${next ? `<p class="col-next">다음 배지: <b>${next[1]} ${next[2]}</b> · ${next[4]} (${Math.min(next[3](s), next[0])}/${next[0]})</p>` : '<p class="col-next">모든 배지를 모았어요. 대단해요! 🎉</p>'}
      ${BADGES.map(([group, list]) => `<h3 class="col-group">${group}</h3><div class="col-badges">${list.map(([n, icon, name, f, how]) => {
        const v = f(s), on = v >= n;
        return `<div class="col-badge${on ? ' on' : ''}" title="${how}"><i>${icon}</i><b>${name}</b><span>${on ? '획득!' : `${Math.min(v, n)} / ${n}`}</span></div>`;
      }).join('')}</div>`).join('')}`;
    cache = null;
    clearTimeout(draw.t); draw.t = setTimeout(() => { cache = make(); }, 700);
  }

  // ── 스토리 이미지: 내 돈나무 + 배지 수 ──
  let cache = null;
  function make() {
    const s = stats(), t = s.tree, all = BADGES.flatMap(([, list]) => list), got = all.filter(([n, , , f]) => f(s) >= n);
    return storyCard({ kicker: '돈셈 · 내 컬렉션', title: `내 돈나무 Lv.${t.lv + 1}`, img: t.img, color: '#5bb974', big: t.name + (t.fruit ? ` · 열매 ${t.fruit}개` : ''),
      sub: `배지 ${got.length}개 모음${s.mt ? ` · ${ANIMALS[s.mt][1]}` : ''}`,
      draw: (c, top, { text, round, W }) => { // 받은 배지 아이콘을 한 줄씩
        const icons = got.map(b => b[1]).slice(0, 14);
        if (!icons.length) return 0;
        const rowsN = Math.ceil(icons.length / 7);
        round(90, top, W - 180, rowsN * 110 + 50, 36, 'rgba(255,255,255,.85)');
        icons.forEach((ic, i) => text(ic, 150 + (i % 7) * 130, top + 95 + Math.floor(i / 7) * 110, 64, 400, '#1d1d1f'));
        return rowsN * 110 + 50;
      },
      boxes: [['퀴즈 연속', `${s.quizNow}일`], ['무지출', `${s.nsTotal}일`], ['맞힌 문제', `${s.solved}개`]],
      foot: '너의 돈나무는 몇 레벨? 🌱', link: `${location.origin}/quiz/` });
  }
  const btn = storyButton('내 컬렉션 인스타 스토리에 올리기', () => cache || (cache = make()), '돈셈_내컬렉션.png', `${location.origin}/quiz/`);
  btn.classList.add('col-story');
  box.after(btn);
  draw();
  window.addEventListener('pageshow', e => { if (e.persisted) draw(); });
})();
