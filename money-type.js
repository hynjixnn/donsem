// 돈BTI: 12문제로 알아보는 소비 성향 테스트 (16가지 동물 캐릭터)
// 네 가지 축 — 저축(s 모으는 / u 쓰는) · 계획(p 계획적 / f 즉흥적) · 투자(a 안전제일 / r 도전) · 대상(m 나를 위해 / w 함께)
// 유형 코드는 이 순서의 네 글자(예: spam). 결과 링크(?t=코드)에 쓰여서 코드는 바꾸지 말아 주세요.
const MT_AXES = [['s', 'u'], ['p', 'f'], ['a', 'r'], ['m', 'w']];
const MT_TAGS = { s: '모으는', u: '쓰는', p: '계획적', f: '즉흥적', a: '안전제일', r: '도전', m: '나를 위해', w: '함께' };
const MT_QUESTIONS = [ // [축 번호, 질문, 앞 글자 답, 뒤 글자 답]
  [0, '월급날! 제일 먼저 하는 일은?', '저축 통장으로 먼저 보낸다', '장바구니에 담아 둔 걸 결제한다'],
  [1, '이번 달 예산은?', '항목별로 정해 두고 지킨다', '이 정도 쓰겠지, 감으로 산다'],
  [2, '갑자기 1,000만 원이 생겼다면?', '예금에 넣고 확실한 이자를 받는다', '주식이나 ETF로 불려 본다'],
  [3, '돈 쓰고 가장 행복했던 순간은?', '나를 위해 산 물건이나 경험', '누군가에게 쏘거나 선물했을 때'],
  [0, '예상 못 한 보너스 50만 원이 들어왔다!', '일단 통장에 넣어 둔다', '고생한 나에게 선물한다'],
  [1, '여행 갈 때 나는?', '경비를 미리 표로 정리한다', '가서 쓰는 만큼 쓴다'],
  [2, '"이거 곧 오른대"라는 말을 들으면?', '흘려듣는다', '일단 찾아보고 고민한다'],
  [3, '친구 생일이 다가오면?', '부담 없는 선에서 마음을 전한다', '예산을 넘어도 제대로 챙긴다'],
  [0, '통장 잔고를 볼 때 드는 생각은?', '조금이라도 늘어 있으면 뿌듯하다', '숫자보다 그 돈으로 한 경험이 중요하다'],
  [1, '가계부는?', '쓰고 있거나 써 본 적 있다', '앱만 깔고 지웠다'],
  [2, '둘 중 더 끌리는 건?', '확실한 연 3% 수익', '반반 확률로 +20% 또는 -10%'],
  [3, '모임에서 계산할 때 나는?', '각자 먹은 만큼 칼같이 나눈다', '내가 먼저 내고 분위기를 챙긴다'],
];
const MT_TYPES = { // 코드: [동물 그림, 이름, 색, 설명, 강점, 조심할 점, [추천 주소, 이름]×2]
  spam: ['chipmunk', '철벽 금고 다람쥐', '#e8a33d', '월급이 들어오면 저축부터, 예산은 칼같이. 원금이 줄어드는 건 상상도 못 해요. 차곡차곡 쌓이는 통장 잔고가 최고의 행복!', '꾸준함만큼은 1등. 시간이 지날수록 자산이 확실하게 불어나요.', '너무 안전한 곳에만 두면 물가 상승을 못 따라갈 수 있어요.', [['/deposit/', '예금 이자 계산기'], ['/inflation/', '물가상승률 계산기']]],
  spaw: ['ant', '알뜰 살림꾼 개미', '#8e8e93', '계획적으로 모은 돈으로 가족과 친구를 챙기는 살림꾼. 경조사 예산까지 미리 짜 두는 든든한 사람이에요.', '주변 사람들이 돈 고민이 생기면 제일 먼저 찾아와요.', '남을 챙기느라 내 목표가 밀리지 않게, 나만의 목표 통장도 하나 만들어 보세요.', [['/goal/', '목표 저축 계산기'], ['/savings/', '적금 이자 계산기']]],
  sprm: ['owl', '전략가 부엉이', '#a2845e', '모을 땐 계획적으로, 굴릴 땐 공부해서 과감하게. 수익률 표를 보는 게 취미인 전략가예요.', '복리의 힘을 아는 사람. 장기 투자에 강해요.', '수익률에 너무 몰입하면 지쳐요. 비상금은 꼭 따로 떼어 두세요.', [['/compound/', '복리 계산기'], ['/dividend/', '배당금 계산기']]],
  sprw: ['honeybee', '부지런한 꿀벌', '#f2b705', '부지런히 모으고, 알게 된 투자 정보는 친구들과 나누는 스터디 리더. 모임통장 총무도 자주 맡아요.', '정보력과 실행력을 다 갖췄어요.', '남의 투자 결정까지 책임지려 하지 마세요. 정보는 나누되 선택은 각자!', [['/compound/', '복리 계산기'], ['/avg-price/', '물타기 계산기']]],
  sfam: ['turtle', '느긋한 저축 거북이', '#5bb974', '계획표는 없지만 원래 잘 안 써서 돈이 모이는 타입. 느리지만 결국 목표에 도착해요.', '지출 습관 자체가 건강해요.', '모인 돈이 입출금 통장에서 잠자고 있을 수 있어요. 예금으로 옮기기만 해도 이자가 달라져요.', [['/deposit/', '예금 이자 계산기'], ['/savings/', '적금 이자 계산기']]],
  sfaw: ['bear', '든든한 곰', '#9c6b4e', '평소엔 아끼다가 중요한 순간엔 크게 쏘는 든든한 사람. "역시 너밖에 없다"는 말을 자주 들어요.', '돈을 쓸 때와 아낄 때를 본능적으로 알아요.', '크게 쏘는 날이 한 달에 몰리지 않게, 가계부로 가끔 확인해 보세요.', [['/dutch-pay/', '더치페이 계산기'], ['/budget/', '가계부']]],
  sfrm: ['fox', '촉 좋은 여우', '#ff7a2f', '평소엔 알뜰하지만 기회다 싶으면 과감하게 들어가는 승부사. 할인, 이벤트, 투자 타이밍에 촉이 좋아요.', '기회를 놓치지 않는 감각이 있어요.', '촉이 늘 맞진 않아요. 들어가기 전에 평균 단가와 손실 한도를 숫자로 정해 두세요.', [['/avg-price/', '물타기 계산기'], ['/percent/', '퍼센트 계산기']]],
  sfrw: ['dolphin', '영리한 돌고래', '#3aa0f5', '알뜰하게 모으고, 친구들과 새로운 걸 함께 시도하는 걸 좋아해요. 같이 공부하고 같이 도전할 때 제일 신나요.', '혼자보다 함께일 때 더 큰 힘을 내요.', '분위기에 휩쓸려 결정하지 않게, 내 기준 하나는 꼭 지켜요.', [['/compound/', '복리 계산기'], ['/dutch-pay/', '더치페이 계산기']]],
  upam: ['cat', '취향 확실 고양이', '#f0a04b', '쓸 땐 쓰지만 아무 데나 쓰진 않아요. 좋아하는 것엔 아낌없이, 관심 없는 건 칼같이 패스!', '만족도 높은 소비를 할 줄 알아요.', '취향 소비가 쌓이면 고정지출이 돼요. 구독료부터 한 번 점검해 보세요.', [['/unit-price/', '단가 비교 계산기'], ['/fixed/', '고정지출 관리']]],
  upaw: ['dog', '다정한 강아지', '#e0a96d', '친구 생일, 부모님 용돈, 경조사까지 다 챙기는 다정한 사람. 그 마음을 위해 예산까지 미리 짜 둬요.', '돈으로 관계를 따뜻하게 만드는 법을 알아요.', '"나를 위한 돈"도 예산에 한 줄 꼭 넣어 주세요.', [['/dutch-pay/', '더치페이 계산기'], ['/goal/', '목표 저축 계산기']]],
  uprm: ['lion', '야망가 사자', '#f5a623', '자기계발, 커리어, 투자까지 나를 키우는 데 과감하게 쓰는 야망가. 돈은 굴려야 커진다고 믿어요.', '성장에 투자하는 용기가 있어요.', '수입이 늘 때 고정지출도 같이 늘면 남는 게 없어요. 실수령액 기준으로 계획을 세워 보세요.', [['/salary/', '연봉 실수령액 계산기'], ['/compound/', '복리 계산기']]],
  uprw: ['penguin', '팀플 리더 펭귄', '#5e5ce6', '모임 기획, 여행 총무, 공동구매까지 함께하는 일에 앞장서는 리더. 계획은 꼼꼼하게, 실행은 과감하게!', '사람을 모으고 일을 굴리는 힘이 있어요.', '총무를 하다 보면 내 돈과 모임 돈이 섞여요. 통장을 나눠 두면 깔끔해요.', [['/dutch-pay/', '더치페이 계산기'], ['/fuel/', '유류비 계산기']]],
  ufam: ['hamster', '장바구니 직진 햄스터', '#ff8fa3', '"이건 사야 해!" 하는 순간 이미 결제 완료. 귀엽고 새로운 것에 약하지만 큰 모험은 안 하는 소확행 러버.', '일상의 작은 행복을 잘 찾아요.', '작은 결제가 쌓이면 커요. 결제 전에 장바구니에서 하루만 묵혀 보세요.', [['/discount/', '할인율 계산기'], ['/unit-price/', '단가 비교 계산기']]],
  ufaw: ['panda', '인싸 판다', '#7d7aff', '약속이 끊이지 않는 인싸. 맛집, 카페, 모임비로 지갑이 바쁘지만 그만큼 사람이 남아요.', '어디서든 분위기를 살리는 사람이에요.', '모임비는 생각보다 커요. 한 달 모임 예산을 정해 두면 마음 편히 놀 수 있어요.', [['/dutch-pay/', '더치페이 계산기'], ['/budget/', '가계부']]],
  ufrm: ['rabbit', '욜로 토끼', '#bf8cf2', '인생은 한 번뿐! 하고 싶은 건 지금 해야 하는 행동파. 여행, 경험, 새로운 도전에 돈을 아끼지 않아요.', '남들이 못 해 본 경험이 많아요.', '미래의 나도 나예요. 월급의 10%만 자동이체로 먼저 떼어 두는 것부터 시작해 보세요.', [['/goal/', '목표 저축 계산기'], ['/retirement/', '노후자금 계산기']]],
  ufrw: ['koala', '흥 부자 코알라', '#8fa3b3', '"재밌겠다, 같이 하자!" 즉흥 여행, 새로운 투자, 공동 도전까지 일단 해 보는 분위기 메이커.', '함께하는 사람들까지 신나게 만드는 에너지가 있어요.', '흥에 취해 결정하기 전에 계산기 한 번! 잃어도 괜찮은 금액을 먼저 정해 두세요.', [['/dutch-pay/', '더치페이 계산기'], ['/percent/', '퍼센트 계산기']]],
};
const MT_KEY = 'donsem:money-type';
const mtFlip = (code, axes) => code.split('').map((ch, i) => axes.includes(i) ? MT_AXES[i][MT_AXES[i][0] === ch ? 1 : 0] : ch).join('');
const mtMate = code => mtFlip(code, [0, 1]); // 잘 맞는 돈 메이트: 저축·계획 성향이 반대라 서로 채워 줘요
const mtClash = code => mtFlip(code, [0, 1, 2, 3]); // 환장의 조합: 모든 게 반대

(() => {
  const box = document.getElementById('mt');
  if (!box) return;
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const img = (code, size) => `<img src="/icons/dbti/${MT_TYPES[code][0]}.webp" alt="" width="${size}" height="${size}">`;
  const mine = () => { try { const c = localStorage.getItem(MT_KEY); return MT_TYPES[c] ? c : null; } catch (e) { return null; } };
  let answers = [], storyBlob = null;

  function intro() {
    const my = mine();
    box.innerHTML = `<div class="mt-intro">
      <div class="mt-crowd">${['chipmunk', 'hamster', 'owl', 'rabbit', 'panda'].map(a => `<img src="/icons/dbti/${a}.webp" alt="" width="64" height="64">`).join('')}</div>
      <p class="mt-lead">12문제로 알아보는 나의 돈 성격.<br>나는 모으는 다람쥐일까, 장바구니 직진 햄스터일까?</p>
      <button type="button" class="btn fill mt-start">테스트 시작하기</button>
      ${my ? `<a class="mt-again" href="/money-type/?t=${my}">지난 결과 보기 · ${MT_TYPES[my][1]} ›</a>` : ''}
      <p class="mt-note">약 1분 · 가입 없음 · 답은 이 기기에만 남아요</p>
    </div>`;
    box.querySelector('.mt-start').addEventListener('click', () => { answers = []; ask(0); });
  }
  function ask(i) {
    const [, q, a, b] = MT_QUESTIONS[i];
    box.innerHTML = `<div class="mt-q">
      <div class="mt-prog"><button type="button" class="mt-back" aria-label="이전 문제">‹</button><div class="bar"><i style="width:${i / MT_QUESTIONS.length * 100}%"></i></div><span>${i + 1} / ${MT_QUESTIONS.length}</span></div>
      <p class="mt-qt">${esc(q)}</p>
      <div class="mt-opts"><button type="button" class="mt-opt" data-v="0">${esc(a)}</button><button type="button" class="mt-opt" data-v="1">${esc(b)}</button></div>
    </div>`;
    box.querySelector('.mt-back').addEventListener('click', () => { if (i === 0) intro(); else { answers.pop(); ask(i - 1); } });
    box.querySelectorAll('.mt-opt').forEach(btn => btn.addEventListener('click', () => {
      btn.classList.add('on');
      answers[i] = +btn.dataset.v;
      setTimeout(() => { if (i + 1 < MT_QUESTIONS.length) ask(i + 1); else finish(); }, 180);
    }));
  }
  function finish() {
    const votes = [0, 0, 0, 0];
    MT_QUESTIONS.forEach(([axis], i) => { votes[axis] += answers[i]; });
    const code = votes.map((v, i) => MT_AXES[i][v >= 2 ? 1 : 0]).join(''); // 축마다 3문제 중 2개 이상이면 뒤 글자
    try { localStorage.setItem(MT_KEY, code); } catch (e) { /* 저장이 막힌 환경 */ }
    history.replaceState(null, '', `/money-type/?t=${code}`);
    result(code, false);
  }
  function result(code, shared) {
    const [, name, color, desc, good, care, calcs] = MT_TYPES[code], mate = mtMate(code), clash = mtClash(code);
    storyBlob = null;
    box.style.setProperty('--mt', color);
    box.innerHTML = `<div class="mt-res">
      ${shared === 'friend' ? `<p class="mt-shared">친구의 돈BTI 결과예요. 나는 어떤 유형일까?</p>` : ''}
      <div class="mt-hero">${img(code, 168)}<span class="mt-cap">${shared === 'friend' ? '친구의 돈 성격은' : shared ? '돈BTI 유형 소개' : '나의 돈 성격은'}</span><h2>${name}</h2>
        <div class="mt-tags">${code.split('').map(ch => `<span>#${MT_TAGS[ch]}</span>`).join('')}</div></div>
      <p class="mt-desc">${desc}</p>
      <div class="mt-two"><div><b>👍 강점</b><p>${good}</p></div><div><b>⚠️ 조심할 점</b><p>${care}</p></div></div>
      <div class="mt-match">
        <a href="/money-type/?t=${mate}&amp;v=1">${img(mate, 56)}<span>잘 맞는 돈 메이트</span><b>${MT_TYPES[mate][1]}</b></a>
        <a href="/money-type/?t=${clash}&amp;v=1">${img(clash, 56)}<span>환장의 조합</span><b>${MT_TYPES[clash][1]}</b></a>
      </div>
      <h3 class="mt-h">이런 계산기가 잘 맞아요</h3>
      <div class="mt-calcs">${calcs.map(([href, label]) => `<a href="${href}">${iconOf(href)}<span>${label}</span><i>›</i></a>`).join('')}</div>
      ${shared ? `<button type="button" class="btn fill mt-start">${mine() ? '테스트 다시 하기' : '나도 테스트하기'}</button>${mine() ? `<a class="mt-again" href="/money-type/?t=${mine()}">내 결과로 돌아가기 ›</a>` : ''}`
        : `<button type="button" class="ft-story mt-story"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".6" fill="currentColor"/></svg>인스타 스토리에 올리기</button>
        <div class="mt-actions"><button type="button" class="btn line" data-act="friend">친구에게 보내기</button><button type="button" class="btn line mt-start">다시 하기</button></div>`}
      <a class="mt-quiz" href="/quiz/">${iconOf('/quiz/')}오늘의 돈 퀴즈도 풀어 보기 ›</a>
    </div>`;
    box.querySelectorAll('.mt-start').forEach(b => b.addEventListener('click', () => { answers = []; history.replaceState(null, '', '/money-type/'); ask(0); }));
    const st = box.querySelector('.mt-story');
    if (st) {
      st.addEventListener('click', () => story(code, st));
      setTimeout(() => { if (!storyBlob) storyBlob = makeStory(code); }, 600); // 누르자마자 공유 창이 뜨게 미리 그려 둬요
    }
    const fr = box.querySelector('[data-act="friend"]');
    if (fr) fr.addEventListener('click', async () => {
      const url = `${location.origin}/money-type/?t=${code}`;
      if (navigator.share) { try { await navigator.share({ title: '돈BTI 테스트', text: `나는 "${name}"래! 너의 돈 성격은? 👀`, url }); } catch (e) { /* 닫은 경우 */ } }
      else copyLink(url);
    });
    box.scrollIntoView({ block: 'start' });
  }

  // ── 인스타 스토리 크기(1080×1920) 결과 이미지 ──
  async function makeStory(code) {
    const [animal, name, color, desc] = MT_TYPES[code], W = 1080, H = 1920;
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const c = cv.getContext('2d'), FONT = '"Pretendard Variable", Pretendard, -apple-system, sans-serif';
    try { await Promise.all([document.fonts.load(`800 96px ${FONT}`), document.fonts.load(`500 40px ${FONT}`)]); } catch (e) { /* 기본 글씨체로 그려요 */ }
    const load = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
    const pic = await load(`/icons/dbti/${animal}.webp`);
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, color); g.addColorStop(0.6, '#ffffff'); g.addColorStop(1, '#f5f5f7');
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    c.fillStyle = 'rgba(255,255,255,.4)'; c.fillRect(0, 0, W, H);
    const text = (s, x, y, size, weight, col) => { c.font = `${weight} ${size}px ${FONT}`; c.fillStyle = col; c.textAlign = 'center'; c.fillText(s, x, y); };
    const wrap = (s, maxW) => { const out = []; let line = ''; for (const w of s.split(' ')) { const t = line ? line + ' ' + w : w; if (c.measureText(t).width <= maxW || !line) line = t; else { out.push(line); line = w; } } if (line) out.push(line); return out; };
    text('돈셈 · 돈BTI 테스트', W / 2, 200, 40, 600, '#1d1d1f');
    text('나의 돈 성격은', W / 2, 300, 44, 500, '#3a3a3c');
    c.beginPath(); c.arc(W / 2, 600, 250, 0, Math.PI * 2); c.fillStyle = 'rgba(255,255,255,.75)'; c.fill();
    if (pic) c.drawImage(pic, W / 2 - 200, 400, 400, 400);
    let size = 96; c.font = `800 ${size}px ${FONT}`;
    while (c.measureText(name).width > 940 && size > 60) { size -= 4; c.font = `800 ${size}px ${FONT}`; } // 긴 이름은 글자를 줄여요
    text(name, W / 2, 1000, size, 800, '#1d1d1f');
    c.font = `600 40px ${FONT}`;
    text(code.split('').map(ch => `#${MT_TAGS[ch]}`).join('  '), W / 2, 1080, 40, 600, '#3a3a3c');
    c.font = `500 44px ${FONT}`;
    wrap(desc, 860).slice(0, 5).forEach((l, i) => text(l, W / 2, 1200 + i * 64, 44, 500, '#1d1d1f'));
    text('너의 돈 성격은? 👀', W / 2, 1640, 52, 700, '#1d1d1f');
    text('doncalculator.com/money-type', W / 2, 1740, 40, 700, '#0071e3');
    text('12문제 · 1분 · 무료', W / 2, 1800, 32, 500, '#6e6e73');
    return new Promise(r => cv.toBlob(r, 'image/png'));
  }
  async function story(code, btn) {
    const link = `${location.origin}/money-type/`;
    if (navigator.clipboard) navigator.clipboard.writeText(link).catch(() => {}); // 스토리 링크 스티커에 붙여 넣을 주소
    btn.disabled = true;
    try {
      const blob = await (storyBlob || (storyBlob = makeStory(code)));
      const file = new File([blob], `돈BTI_${MT_TYPES[code][1]}.png`, { type: 'image/png' });
      if (matchMedia('(pointer: coarse)').matches && navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file] }); toast('테스트 주소를 복사해 뒀어요. 스토리에서 링크 스티커에 붙여 넣으세요!'); }
        catch (e) { if (e.name !== 'AbortError') toast('공유 창을 열지 못했어요. 한 번 더 눌러 주세요.'); }
      } else {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob); a.download = file.name;
        document.body.append(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
        toast('이미지를 저장했어요. 휴대폰에서 누르면 인스타 스토리에 바로 올릴 수 있어요.');
      }
    } finally { btn.disabled = false; }
  }

  const qs = new URLSearchParams(location.search), t = qs.get('t');
  if (t && MT_TYPES[t]) result(t, t === mine() ? false : qs.get('v') ? 'view' : 'friend');
  else intro();
})();
