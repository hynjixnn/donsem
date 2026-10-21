// 오늘의 돈 퀴즈: 하루 한 문제 O/X, 해설 + 관련 계산기, 연속 기록, 친구에게 문제 내기
(() => {
  const box = document.getElementById('qz');
  if (!box || typeof QUIZ === 'undefined') return;
  const BADGES = [[3, '🌱', '3일 연속'], [7, '🔥', '7일 연속'], [14, '⭐', '14일 연속'], [30, '🏆', '30일 연속']];
  const q = new URLSearchParams(location.search);
  const todayId = quizToday(), today = quizDate();
  let id = todayId, mode = 'today';
  const asked = parseInt(q.get('q'), 10);
  if (asked >= 0 && asked < QUIZ.length && asked !== todayId) { id = asked; mode = 'shared'; }

  function stats(s) {
    const streak = quizStreak(s), best = BADGES.filter(([n]) => streak >= n).pop();
    return `<div class="qz-stats">
      <div><b>${streak}일</b><span>연속 참여</span></div>
      <div><b>${s.solved.length}<small> / ${QUIZ.length}</small></b><span>맞힌 문제</span></div>
      <div><b>${best ? best[1] : '—'}</b><span>${best ? best[2] + ' 배지' : '3일이면 첫 배지'}</span></div>
    </div>`;
  }
  function draw() {
    const s = quizLoad(), text = QUIZ[id][0];
    const done = mode === 'today' ? s.days[today] : null;
    const tag = mode === 'today' ? `${today.replace(/-/g, '.')} 오늘의 문제` : mode === 'shared' ? '친구가 보낸 문제' : '한 문제 더 · 연속 기록과 따로 세요';
    box.innerHTML = `<div class="qz-top"><span class="qz-tag">${tag}</span>${quizStreak(s) ? `<span class="qz-fire">🔥 ${quizStreak(s)}일 연속</span>` : ''}</div>
      <p class="qz-q">${text}</p>
      <div class="qz-btns">
        <button type="button" class="qz-btn" data-a="1"><span class="qz-o" aria-hidden="true"></span>맞아요</button>
        <button type="button" class="qz-btn" data-a="0"><span class="qz-x" aria-hidden="true"></span>아니에요</button>
      </div>
      <div class="qz-res"></div>`;
    box.querySelectorAll('.qz-btn').forEach(b => b.addEventListener('click', () => pick(b.dataset.a === '1')));
    if (done) show(done.pick, false);
    if (mode !== 'today' && !s.days[today]) box.insertAdjacentHTML('beforeend', '<p class="qz-back"><a href="/quiz/">오늘의 문제도 풀어 보세요 ›</a></p>'); // 오늘 문제로 돌아가는 길
  }
  function pick(choice) {
    const s = quizLoad(), ok = choice === QUIZ[id][1];
    if (mode === 'today' && s.days[today]) return;
    const before = quizStreak(s);
    if (mode === 'today') s.days[today] = { id, ok, pick: choice };
    if (ok && !s.solved.includes(id)) s.solved.push(id);
    quizSave(s);
    show(choice, true);
    const after = quizStreak(s), badge = BADGES.find(([n]) => before < n && after >= n);
    if (badge) toast(`${badge[1]} ${badge[2]} 배지를 받았어요!`);
  }
  function show(choice, fresh) {
    const s = quizLoad(), [, answer, exp, href, label] = QUIZ[id], ok = choice === answer;
    box.querySelectorAll('.qz-btn').forEach(b => {
      const v = b.dataset.a === '1';
      b.disabled = true;
      b.classList.toggle('right', v === answer);
      b.classList.toggle('wrong', v === choice && !ok);
      b.classList.toggle('picked', v === choice);
    });
    const res = box.querySelector('.qz-res');
    res.innerHTML = `<div class="qz-verdict ${ok ? 'ok' : 'no'}">${ok ? '정답이에요! 🎉' : `아쉬워요. 정답은 ${answer ? 'O' : 'X'}예요`}</div>
      <p class="qz-exp">${exp}</p>
      <a class="btn fill qz-go" href="${href}">${label} ›</a>
      <div class="qz-actions">
        <button type="button" class="btn line" data-act="share">친구에게 문제 내기</button>
        <button type="button" class="btn line" data-act="more">한 문제 더 풀기</button>
      </div>
      ${stats(s)}
      ${mode === 'today' ? '<p class="qz-next">내일 0시에 새 문제가 열려요.</p>' : ''}`;
    if (fresh) res.classList.add('pop');
    res.querySelector('[data-act="share"]').addEventListener('click', share);
    res.querySelector('[data-act="more"]').addEventListener('click', more);
  }
  async function share() {
    const url = `${location.origin}/quiz/?q=${id}`;
    if (navigator.share) {
      try { await navigator.share({ title: '돈셈 오늘의 돈 퀴즈', text: `[돈셈 돈 퀴즈] ${QUIZ[id][0]} O일까, X일까?`, url }); } catch (e) { /* 공유 창을 닫은 경우 */ }
    } else copyLink(url);
  }
  function more() {
    const s = quizLoad();
    let pool = QUIZ.map((_, i) => i).filter(i => i !== id && i !== todayId && !s.solved.includes(i));
    if (!pool.length) pool = QUIZ.map((_, i) => i).filter(i => i !== id);
    id = pool[Math.floor(Math.random() * pool.length)];
    mode = 'practice';
    history.replaceState(null, '', `/quiz/?q=${id}`);
    draw();
    document.getElementById('quiz').scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }

  draw();
  // 첫 화면 카드에서 O/X를 누르고 들어온 경우: 바로 답을 고른 것으로 처리해요
  const a = q.get('a');
  if (mode === 'today' && (a === 'o' || a === 'x') && !quizLoad().days[today]) pick(a === 'o');
  if (a) history.replaceState(null, '', '/quiz/');
})();
