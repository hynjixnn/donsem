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
    const before = quizStreak(s), grown = treeOf(s);
    if (mode === 'today') s.days[today] = { id, ok, pick: choice };
    else if (ok) s.prac[today] = (s.prac[today] || 0) + 1;
    if (ok && !s.solved.includes(id)) s.solved.push(id);
    quizSave(s);
    show(choice, true);
    drawTree();
    const after = quizStreak(s), badge = BADGES.find(([n]) => before < n && after >= n), tree = treeOf(s);
    const news = [];
    if (tree.lv > grown.lv) news.push(`돈나무가 '${tree.name}'${ro(tree.name)} 자랐어요!`);
    else if (tree.fruit > grown.fruit) news.push('돈나무에 돈 열매가 하나 더 열렸어요!');
    if (badge) news.push(`${badge[1]} ${badge[2]} 배지를 받았어요!`);
    if (news.length) toast(news.join(' '));
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
      ${mode === 'today' ? fortuneHtml(fortuneToday(s)) : ''}
      <div class="qz-actions">
        <button type="button" class="btn line" data-act="share">친구에게 문제 내기</button>
        <button type="button" class="btn line" data-act="more">한 문제 더 풀기</button>
      </div>
      ${stats(s)}
      ${mode === 'today' ? '<p class="qz-next">내일 0시에 새 문제가 열려요.</p>' : ''}`;
    if (fresh) res.classList.add('pop');
    res.querySelector('[data-act="share"]').addEventListener('click', share);
    res.querySelector('[data-act="more"]').addEventListener('click', more);
    const st = res.querySelector('[data-act="story"]');
    if (st) st.addEventListener('click', () => story(st));
  }

  // 받침에 따라 '으로/로' (받침 없거나 ㄹ이면 '로')
  function ro(word) { const c = word.charCodeAt(word.length - 1) - 0xac00, jong = c >= 0 && c <= 11171 ? c % 28 : 0; return jong && jong !== 8 ? '으로' : '로'; }

  // ── 오늘의 금전운 카드 ──
  function fortuneHtml(f) {
    return `<div class="fortune">
      <div class="ft-head"><img src="/icons/fortune.webp" alt="" width="36" height="36"><div><b>오늘의 금전운</b><span>${'💰'.repeat(f.coins)} ${f.level}</span></div></div>
      <p class="ft-msg">${f.msg}</p>
      <div class="ft-luck">
        <div><span>행운의 아이템</span><b>${f.item}</b></div>
        <div><span>행운의 색</span><b><i style="background:${f.color[1]}"></i>${f.color[0]}</b></div>
        <div><span>행운의 숫자</span><b>${f.num}</b></div>
      </div>
      <a class="ft-todo" href="${f.todo[1]}">오늘의 돈 할 일 · ${f.todo[0]} ›</a>
      <button type="button" class="btn fill ft-story" data-act="story">금전운 이미지로 공유하기</button>
      <p class="ft-note">재미로 보는 금전운이에요. 실제 돈 결정은 계산기로 꼼꼼히!</p>
    </div>`;
  }

  // ── 내 돈나무 ──
  function drawTree() {
    const el = document.getElementById('tree');
    if (!el) return;
    const t = treeOf(quizLoad());
    el.innerHTML = `<div class="tree-in">
      <img class="tree-img lv${t.lv}" src="${t.img}" alt="${t.name}" width="128" height="128">
      <div class="tree-info">
        <span class="tree-cap">내 돈나무 · Lv.${t.lv + 1}</span>
        <h2>${t.name}${t.fruit ? ` <small>💰 열매 ${t.fruit}개</small>` : ''}</h2>
        <div class="bar"><i style="width:${t.pct}%"></i></div>
        <p>${t.next ? `'${t.nextName}'까지 ${t.next}번 더 물 주면 돼요.` : `${TREE_FRUIT - (t.pts - TREE[TREE.length - 1][0]) % TREE_FRUIT}번 더 물 주면 열매가 하나 더 열려요.`}</p>
      </div>
    </div>
    <p class="tree-how">오늘의 문제를 풀면 💧1, 맞히면 💧1 더, '한 문제 더'를 맞힌 날은 💧1 더 줘요.</p>`;
  }

  // ── 인스타 스토리 크기(1080×1920) 금전운 이미지 ──
  async function story(btn) {
    btn.disabled = true;
    try {
      const s = quizLoad(), f = fortuneToday(s), t = treeOf(s), W = 1080, H = 1920;
      const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const c = cv.getContext('2d'), FONT = '"Pretendard Variable", Pretendard, -apple-system, sans-serif';
      try { await Promise.all([document.fonts.load(`700 80px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]); } catch (e) { /* 기본 글씨체로 그려요 */ }
      const img = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
      const [coin, tree, ball] = await Promise.all([img('/icons/cat/coin.webp'), img(t.img), img('/icons/fortune.webp')]);
      const g = c.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, f.color[1]); g.addColorStop(0.55, '#ffffff'); g.addColorStop(1, '#f5f5f7');
      c.fillStyle = g; c.fillRect(0, 0, W, H);
      c.fillStyle = 'rgba(255,255,255,.55)'; c.fillRect(0, 0, W, H);
      const text = (str, x, y, size, weight, color, align = 'center') => { c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = color; c.textAlign = align; c.fillText(str, x, y); };
      const wrap = (str, maxW) => { // 한글은 띄어쓰기 단위로, 그래도 길면 글자 단위로 줄을 바꿔요
        const out = []; let line = '';
        for (const w of str.split(' ')) {
          const tryLine = line ? line + ' ' + w : w;
          if (c.measureText(tryLine).width <= maxW) { line = tryLine; continue; }
          if (line) out.push(line);
          line = w;
          while (c.measureText(line).width > maxW) { let k = line.length; while (k > 1 && c.measureText(line.slice(0, k)).width > maxW) k--; out.push(line.slice(0, k)); line = line.slice(k); }
        }
        if (line) out.push(line); return out;
      };
      const round = (x, y, w, h, r, fill) => { c.beginPath(); if (c.roundRect) c.roundRect(x, y, w, h, r); else c.rect(x, y, w, h); c.fillStyle = fill; c.fill(); };
      text('돈셈 · 오늘의 금전운', W / 2, 200, 40, 600, '#1d1d1f');
      text(today.replace(/-/g, '. '), W / 2, 260, 34, 500, '#6e6e73');
      if (ball) c.drawImage(ball, W / 2 - 90, 320, 180, 180);
      if (coin) for (let i = 0; i < f.coins; i++) c.drawImage(coin, W / 2 - f.coins * 50 + i * 100, 540, 100, 100);
      text(`금전운 ${f.level}`, W / 2, 760, 96, 800, '#1d1d1f');
      c.font = `500 46px ${FONT}`;
      wrap(f.msg, 860).slice(0, 4).forEach((l, i) => text(l, W / 2, 870 + i * 66, 46, 500, '#1d1d1f'));
      const boxes = [['행운의 아이템', f.item], ['행운의 색', f.color[0]], ['행운의 숫자', String(f.num)]];
      boxes.forEach(([k, v], i) => {
        const x = 90 + i * 310;
        round(x, 1180, 280, 200, 32, '#ffffff');
        text(k, x + 140, 1250, 32, 500, '#6e6e73');
        if (i === 1) { c.beginPath(); c.arc(x + 140 - c.measureText(v).width / 2 - 34, 1316, 18, 0, Math.PI * 2); c.fillStyle = f.color[1]; c.fill(); }
        text(v, x + 140 + (i === 1 ? 14 : 0), 1330, 46, 700, '#1d1d1f');
      });
      round(90, 1440, 900, 220, 40, 'rgba(255,255,255,.85)');
      if (tree) c.drawImage(tree, 130, 1470, 160, 160);
      text(`내 돈나무 · Lv.${t.lv + 1}`, 330, 1530, 34, 500, '#6e6e73', 'left');
      text(`${t.name}${t.fruit ? ` · 열매 ${t.fruit}개` : ''}${quizStreak(s) ? ` · 🔥${quizStreak(s)}일` : ''}`, 330, 1600, 52, 700, '#1d1d1f', 'left');
      text('doncalculator.com/quiz', W / 2, 1770, 40, 700, '#0071e3');
      text('매일 한 문제 돈 퀴즈 풀고 금전운 보기 · 재미로 봐 주세요', W / 2, 1830, 30, 500, '#6e6e73');
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      const file = new File([blob], `돈셈_금전운_${today}.png`, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: '오늘의 금전운' }); } catch (e) { /* 공유 창을 닫은 경우 */ }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = file.name;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('금전운 이미지를 저장했어요. 인스타 스토리에 올려 보세요!');
      }
    } finally { btn.disabled = false; }
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
  drawTree();
  // 첫 화면 카드에서 O/X를 누르고 들어온 경우: 바로 답을 고른 것으로 처리해요
  const a = q.get('a');
  if (mode === 'today' && (a === 'o' || a === 'x') && !quizLoad().days[today]) pick(a === 'o');
  if (a) history.replaceState(null, '', '/quiz/');
})();
