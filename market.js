/* 돈셈 중고거래: 동네 직거래 장터 (당근처럼). 돈은 오가지 않고 글·사진·채팅만 이어 줘요.
   화면은 한 페이지에서 주소 뒤 #로 바뀌어요: (목록) #i=글 #new 글쓰기 #chats 채팅 #c=채팅방 #my 내 판매 #region 동네 */
(() => {
  const API = 'https://donsem-counter.hjjung330.workers.dev';
  const KAKAO_KEY = '659255150dcc2175d56e029a25d0d460'; // 지도용 카카오 키 (동네 찾기에 써요)
  const TK = 'donsem:mk-token', RG = 'donsem:mk-region';
  const root = document.getElementById('mk'); if (!root) return;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const say = m => (typeof toast === 'function' ? toast(m) : alert(m));
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const put = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) { /* 저장이 막힌 기기 */ } };
  const wonTxt = v => v ? v.toLocaleString('ko-KR') + '원' : '나눔 🧡';
  const ago = t => { const s = (Date.now() - t) / 1000; return s < 60 ? '방금 전' : s < 3600 ? `${Math.floor(s / 60)}분 전` : s < 86400 ? `${Math.floor(s / 3600)}시간 전` : s < 86400 * 30 ? `${Math.floor(s / 86400)}일 전` : new Date(t).toLocaleDateString('ko-KR'); };
  const ST = { sale: '', hold: '<span class="mk-badge hold">예약중</span>', done: '<span class="mk-badge done">거래완료</span>' };
  const img = id => id ? `${API}/m/img/${id}` : '';
  const wait = t => `<p class="re-empty semi-wait">${t}</p>`;

  // 로그인: 카카오에서 돌아오면 주소 끝에 #t=열쇠가 붙어 와요
  let token = get(TK), me = null, cats = [], loginOn = false;
  const h0 = location.hash;
  const tm = h0.match(/#t=([a-f0-9]{48})/); // '#my#t=…'처럼 앞에 다른 화면이 붙어 와도 열쇠를 찾아요
  if (tm) { token = tm[1]; put(TK, token); const rest = h0.slice(0, tm.index); history.replaceState(null, '', location.pathname + (rest && rest !== '#' ? rest : '')); setTimeout(() => say('카카오로 로그인했어요. 반가워요! 👋'), 400); }
  if (/#login=(fail|cancel|ban)/.test(h0)) { setTimeout(() => say(/ban/.test(h0) ? '이용이 제한된 계정이에요.' : /cancel/.test(h0) ? '로그인을 취소했어요.' : `로그인하지 못했어요. 다시 해 주세요.${(h0.match(/e=([^&]+)/) || [])[1] ? ` (코드 ${decodeURIComponent(h0.match(/e=([^&]+)/)[1])})` : ''}`), 300); history.replaceState(null, '', location.pathname); }
  const api = async (path, opt = {}) => {
    const r = await fetch(API + path, { ...opt, headers: { ...(opt.body && !(opt.body instanceof Blob) ? { 'Content-Type': 'application/json' } : {}), ...(token ? { Authorization: 'Bearer ' + token } : {}), ...(opt.headers || {}) } });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { token = null; put(TK, null); me = null; }
    if (!r.ok) throw j;
    return j;
  };
  const post = (path, data) => api(path, { method: 'POST', body: JSON.stringify(data) });
  const login = () => { if (!loginOn) return say('카카오 로그인을 준비하고 있어요. 조금만 기다려 주세요.'); location.href = `${API}/m/auth/start?back=${encodeURIComponent('/market/' + (location.hash || ''))}`; };
  const needLogin = why => `<div class="mk-login"><img src="/icons/semi-wink.svg" width="64" height="64" alt=""><b>${why}</b><p>카카오 계정으로 1초 만에 시작해요. 이름·전화번호는 받지 않아요.</p><button type="button" class="mk-kakao" data-act="login">카카오로 시작하기</button></div>`;

  // 내 동네: 로그인 전에도 이 기기에 기억해요 { sgg: '전북특별자치도 순창군', region: '순창군 순창읍' }
  let region = null; try { region = JSON.parse(get(RG)); } catch (e) { region = null; }
  let wide = false; // 전국 보기
  const setRegion = r => { region = r; put(RG, JSON.stringify(r)); if (me) post('/m/me', { region: r.region, sgg: r.sgg }).catch(() => {}); };
  let kakaoP = null;
  const kakaoGeo = () => kakaoP || (kakaoP = new Promise((ok, no) => { if (window.kakao && kakao.maps && kakao.maps.services) return ok(); const s = document.createElement('script'); s.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`; s.onload = () => kakao.maps.load(ok); s.onerror = no; document.head.append(s); }));
  const toRegion = d => ({ sgg: `${d.region_1depth_name} ${d.region_2depth_name}`.trim(), region: `${d.region_2depth_name} ${d.region_3depth_name}`.trim() });

  // ── 목록 ──
  let list = [], q = '', cat = '', more = true, loading = false;
  async function loadList(reset) {
    if (loading) return; loading = true;
    if (reset) { list = []; more = true; }
    const before = list.length ? list[list.length - 1].id : '';
    try {
      const d = await api(`/m/items?${new URLSearchParams({ sgg: wide || !region ? '' : region.sgg, q, cat, before })}`);
      list = list.concat(d.items); more = d.items.length === 30;
    } catch (e) { say('지금은 목록을 불러오지 못했어요.'); }
    loading = false; if (view() === 'list') drawList();
  }
  const row = x => `<li><a class="mk-row" href="#i=${x.id}"><span class="mk-th">${x.imgs[0] ? `<img src="${img(x.imgs[0])}" alt="" loading="lazy">` : '<i aria-hidden="true">📦</i>'}</span>
    <span class="mk-info"><b>${esc(x.title)}</b><small>${esc(x.region)} · ${ago(x.created)}</small><em>${ST[x.status] || ''}${wonTxt(x.price)}</em>${x.chats ? `<small class="mk-meta">💬 ${x.chats}</small>` : ''}</span></a></li>`;
  function drawList() {
    root.innerHTML = `<div class="mk-top"><button type="button" class="mk-where" data-go="#region">📍 ${region ? esc(wide ? '전국' : region.region.split(' ')[0]) : '내 동네 정하기'} <i aria-hidden="true">▾</i></button>
        <div class="mk-topbtns"><a href="#chats" class="mk-ico" aria-label="채팅">💬</a><a href="#my" class="mk-ico" aria-label="내 판매">👤</a></div></div>
      <form class="mk-search" data-act="search"><input type="search" placeholder="${region && !wide ? esc(region.region.split(' ')[0]) + ' 근처에서' : '전국에서'} 찾기 (예: 아이폰, 유모차)" value="${esc(q)}" enterkeyhint="search" aria-label="물건 찾기"></form>
      <div class="mk-chips"><button type="button" class="${!cat ? 'on' : ''}" data-cat="">전체</button>${cats.map(c => `<button type="button" class="${cat === c ? 'on' : ''}" data-cat="${esc(c)}">${esc(c)}</button>`).join('')}</div>
      ${region ? `<div class="mk-scope"><button type="button" class="${!wide ? 'on' : ''}" data-wide="0">${esc(region.region.split(' ')[0])}</button><button type="button" class="${wide ? 'on' : ''}" data-wide="1">전국</button></div>` : ''}
      ${list.length ? `<ul class="mk-list">${list.map(row).join('')}</ul>${more ? '<button type="button" class="rk-more" data-act="more">더보기</button>' : ''}`
        : loading ? wait('물건을 찾고 있어요') : `<div class="mk-empty"><img src="/icons/semi-think.svg" width="72" height="72" alt=""><b>${q || cat ? '맞는 물건이 아직 없어요' : '아직 올라온 물건이 없어요'}</b><p>${region && !wide ? '전국 보기를 누르거나, ' : ''}첫 번째로 물건을 올려 보세요.</p></div>`}
      <div class="mk-safe"><b>🛡️ 안전한 직거래 약속</b><ul><li>사람 많은 곳에서 만나서 물건을 보고 돈을 건네요.</li><li>만나기 전에 돈을 먼저 보내 달라고 하면 사기일 수 있어요.</li><li>돈셈은 돈을 받거나 보관하지 않아요. 「돈셈 안전결제」라는 링크는 가짜예요.</li></ul></div>
      <a class="mk-fab" href="#new">＋ 글쓰기</a>`;
  }

  // ── 글 보기 ──
  async function drawItem(id) {
    root.innerHTML = wait('글을 불러오고 있어요');
    let d; try { d = await api('/m/item?id=' + id); } catch (e) { root.innerHTML = `<div class="mk-empty"><b>${esc(e.message || '글을 찾지 못했어요.')}</b><p><a href="#">목록으로</a></p></div>`; return; }
    const x = d.item, mine = me && me.id === x.seller.id;
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back" aria-label="목록으로">‹</a><span></span>${mine ? '' : '<button type="button" class="mk-rep" data-act="report">신고</button>'}</div>
      <div class="mk-pics">${x.imgs.length ? x.imgs.map(i => `<img src="${img(i)}" alt="${esc(x.title)} 사진">`).join('') : '<div class="mk-nopic">📦</div>'}</div>
      ${x.imgs.length > 1 ? `<p class="mk-pn">사진 ${x.imgs.length}장 · 옆으로 밀어서 보기</p>` : ''}
      <div class="mk-seller"><span class="mk-av">${esc(x.seller.nick.slice(0, 1))}</span><div><b>${esc(x.seller.nick)}</b><small>${esc(x.region)}</small></div></div>
      <h1 class="mk-title">${ST[x.status] || ''}${esc(x.title)}</h1>
      <p class="mk-sub">${esc(x.cat)} · ${ago(x.created)} · 관심 있는 이웃 💬 ${x.chats} · 조회 ${x.views}</p>
      <div class="mk-body">${esc(x.body).replace(/\n/g, '<br>') || '<span class="mk-muted">설명이 없어요.</span>'}</div>
      <div class="mk-price-hint" id="mk-hint"></div>
      ${d.more.length ? `<h3 class="mk-h">${esc(x.seller.nick)}님의 다른 물건</h3><ul class="mk-list">${d.more.map(row).join('')}</ul>` : ''}
      <div class="mk-buy"><b>${wonTxt(x.price)}</b>${mine ? `<select data-act="status" aria-label="거래 상태"><option value="sale"${x.status === 'sale' ? ' selected' : ''}>판매중</option><option value="hold"${x.status === 'hold' ? ' selected' : ''}>예약중</option><option value="done"${x.status === 'done' ? ' selected' : ''}>거래완료</option></select><button type="button" class="btn line" data-act="del">지우기</button>`
        : `<button type="button" class="btn fill" data-act="chat">채팅하기</button>`}</div>`;
    root.dataset.item = x.id; root.dataset.title = x.title;
    hint(x.title, document.getElementById('mk-hint'), x.price);
  }
  // 셈이 시세: 비슷한 이름으로 올라온 물건 가격을 모아서 알려 줘요
  async function hint(title, el, price) {
    if (!el) return;
    let d; try { d = await api('/m/price?q=' + encodeURIComponent(title)); } catch (e) { return; }
    if (!d.n || d.n < 2) { el.innerHTML = ''; return; }
    const pos = price ? (price < d.low ? '비슷한 물건보다 싸게 나왔어요' : price > d.high ? '비슷한 물건보다 비싼 편이에요' : '비슷한 물건과 비슷한 가격이에요') : '';
    el.innerHTML = `<img src="/icons/semi-happy.svg" width="36" height="36" alt=""><div><b>셈이 시세</b><p>비슷한 물건 ${d.n}개는 보통 <b>${wonTxt(d.mid)}</b>에 올라왔어요 (${wonTxt(d.low)} ~ ${wonTxt(d.high)}). ${pos}</p></div>`;
  }

  // ── 글쓰기 ──
  let pics = [];
  function drawNew() {
    if (!me) { root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a></div>` + needLogin('물건을 팔려면 로그인해 주세요'); return; }
    if (!region) { location.hash = '#region'; return say('먼저 내 동네를 정해 주세요.'); }
    pics = [];
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back" aria-label="닫기">‹</a><b>내 물건 팔기</b><span></span></div>
      <form class="mk-form" data-act="submit">
        <div class="mk-pics-up"><label class="mk-add"><input type="file" accept="image/*" multiple hidden data-act="pics"><span>📷</span><small><b id="mk-pc">0</b>/8</small></label><div id="mk-pv"></div></div>
        <label>제목<input name="title" maxlength="40" placeholder="예: 아이폰 15 128GB 블루" required></label>
        <label>분류<select name="cat">${cats.map(c => `<option>${esc(c)}</option>`).join('')}</select></label>
        <label>가격<div class="mk-won"><input name="price" inputmode="numeric" placeholder="0" autocomplete="off"><span>원</span></div></label>
        <label class="mk-free"><input type="checkbox" name="free"> 나눔할게요 (0원)</label>
        <div class="mk-price-hint" id="mk-hint"></div>
        <label>자세한 설명<textarea name="body" rows="7" maxlength="2000" placeholder="산 때, 쓴 기간, 흠집 같은 상태를 솔직하게 적어 주세요.&#10;만날 곳이나 시간도 적으면 좋아요."></textarea></label>
        <p class="mk-where2">📍 거래할 동네: <b>${esc(region.region)}</b> <a href="#region">바꾸기</a></p>
        <details class="mk-ban"><summary>올릴 수 없는 물건 (법으로 개인 간 거래가 막혀 있어요)</summary><p>술·담배·전자담배, 의약품·건강기능식품 일부, 도검·총포·전기충격기, 콘택트렌즈, 신분증·통장·유심, 가품(짝퉁), 성인용품, 헌혈증, 모유 등. 올리면 지워지고 이용이 제한될 수 있어요.</p></details>
        <button type="submit" class="btn fill wide">올리기</button>
      </form>`;
    let t = 0; const form = root.querySelector('form');
    form.title.addEventListener('input', () => { clearTimeout(t); t = setTimeout(() => hint(form.title.value, document.getElementById('mk-hint'), +form.price.value.replace(/\D/g, '')), 500); });
    form.price.addEventListener('input', () => { const d = form.price.value.replace(/\D/g, ''); form.price.value = d ? (+d).toLocaleString('ko-KR') : ''; if (d) form.free.checked = false; });
    form.free.addEventListener('change', () => { if (form.free.checked) form.price.value = ''; });
  }
  // 사진을 1200px 아래 JPEG로 줄여서 올려요 (아이폰 HEIC도 여기서 JPEG로 바뀌어요)
  const shrink = f => new Promise((ok, no) => { const u = URL.createObjectURL(f), im = new Image(); im.onload = () => { const k = Math.min(1, 1200 / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); URL.revokeObjectURL(u); c.toBlob(b => b ? ok(b) : no(), 'image/jpeg', .82); }; im.onerror = no; im.src = u; });
  async function addPics(files) {
    for (const f of [...files].slice(0, 8 - pics.length)) {
      const pv = document.getElementById('mk-pv'); if (!pv) return;
      const el = document.createElement('span'); el.className = 'mk-pv loading'; pv.append(el);
      try { const b = await shrink(f), d = await api('/m/img', { method: 'POST', body: b, headers: { 'Content-Type': 'image/jpeg' } }); pics.push(d.id); el.className = 'mk-pv'; el.style.backgroundImage = `url(${img(d.id)})`; el.dataset.id = d.id; el.innerHTML = '<button type="button" data-act="unpic" aria-label="사진 빼기">×</button>'; }
      catch (e) { el.remove(); say(e.message || '사진을 올리지 못했어요.'); }
      const pc = document.getElementById('mk-pc'); if (pc) pc.textContent = pics.length;
    }
  }

  // ── 채팅 ──
  let poll = 0, lastMsg = 0, room = 0;
  async function drawChats() {
    if (!me) { root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>채팅</b><span></span></div>` + needLogin('채팅하려면 로그인해 주세요'); return; }
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>채팅</b><span></span></div>` + wait('채팅을 불러오고 있어요');
    let d; try { d = await api('/m/chats'); } catch (e) { return; }
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>채팅</b><span></span></div>${d.chats.length ? `<ul class="mk-chats">${d.chats.map(c => `<li><a href="#c=${c.id}"><span class="mk-av">${esc((c.other || '?').slice(0, 1))}</span><span class="mk-ci"><b>${esc(c.other)} <small>${ago(c.last)}</small></b><small>${esc(c.lastText || '대화를 시작해 보세요')}</small></span>${c.unread ? `<em class="mk-un">${c.unread}</em>` : ''}${c.img ? `<img src="${img(c.img)}" alt="">` : ''}</a></li>`).join('')}</ul>` : '<div class="mk-empty"><img src="/icons/semi-default.svg" width="72" height="72" alt=""><b>아직 채팅이 없어요</b><p>마음에 드는 물건에서 「채팅하기」를 눌러 보세요.</p></div>'}`;
  }
  async function drawRoom(id) {
    if (!me) return drawChats();
    room = id; lastMsg = 0;
    root.innerHTML = `<div class="mk-bar"><a href="#chats" class="mk-back">‹</a><b id="mk-other">채팅</b><span></span></div><a class="mk-ritem" id="mk-ritem" href="#"></a>
      <div class="mk-msgs" id="mk-msgs">${wait('대화를 불러오고 있어요')}</div>
      <p class="mk-warn">🛡️ 만나기 전에 돈을 먼저 보내 달라는 말은 사기일 수 있어요.</p>
      <form class="mk-send" data-act="send"><input name="t" maxlength="500" placeholder="메시지 보내기" autocomplete="off" enterkeyhint="send" aria-label="메시지"><button type="submit" aria-label="보내기">↑</button></form>`;
    await pull(true);
    clearInterval(poll); poll = setInterval(() => { if (document.visibilityState === 'visible' && view() === 'room') pull(); }, 3000);
  }
  async function pull(first, sent) {
    let d; try { d = sent || await api(`/m/msgs?chat=${room}&after=${lastMsg}`); } catch (e) { if (first) document.getElementById('mk-msgs').innerHTML = '<p class="re-empty">채팅방을 열 수 없어요.</p>'; return; }
    const box = document.getElementById('mk-msgs'); if (!box) return;
    if (first) { box.innerHTML = ''; document.getElementById('mk-other').textContent = d.other || '채팅'; const it = d.item, ri = document.getElementById('mk-ritem'); if (it) { ri.href = '#i=' + it.id; ri.innerHTML = `${it.img ? `<img src="${img(it.img)}" alt="">` : '<i>📦</i>'}<span><b>${ST[it.status] || ''}${esc(it.title)}</b><small>${wonTxt(it.price)}</small></span>`; } }
    if (d.msgs.some(m => m.id > lastMsg)) { const h = box.querySelector('.mk-hello'); if (h) h.remove(); } // 첫 메시지를 보내면 인사 안내는 치워요
    d.msgs.filter(m => m.id > lastMsg).forEach(m => { const el = document.createElement('div'); el.className = 'mk-msg' + (m.uid === d.me ? ' me' : ''); el.innerHTML = `<p>${esc(m.text)}</p><small>${new Date(m.created).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}</small>`; box.append(el); lastMsg = m.id; });
    if (first && !d.msgs.length) box.innerHTML = '<p class="mk-hello">상대에게 첫 인사를 보내 보세요. 예: "안녕하세요! 아직 판매 중인가요?"</p>';
    box.scrollTop = box.scrollHeight;
  }

  // ── 내 판매 · 내 정보 ──
  async function drawMy() {
    if (!me) { root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>나의 중고거래</b><span></span></div>` + needLogin('내 판매 글을 보려면 로그인해 주세요'); return; }
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>나의 중고거래</b><span></span></div>` + wait('내 글을 불러오고 있어요');
    let d; try { d = await api('/m/mine'); } catch (e) { return; }
    const by = s => d.items.filter(x => x.status === s).length;
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>나의 중고거래</b><span></span></div>
      <div class="mk-me"><span class="mk-av big">${esc(me.nick.slice(0, 1))}</span><div><b>${esc(me.nick)}</b><small>📍 ${esc(region ? region.region : '동네를 정해 주세요')}</small></div><button type="button" class="btn line" data-act="nick">닉네임 바꾸기</button></div>
      <div class="mk-stat"><span><b>${by('sale')}</b>판매중</span><span><b>${by('hold')}</b>예약중</span><span><b>${by('done')}</b>거래완료</span></div>
      ${d.items.length ? `<ul class="mk-list">${d.items.map(row).join('')}</ul>` : '<div class="mk-empty"><b>아직 올린 물건이 없어요</b><p><a href="#new">첫 물건 올리기 ›</a></p></div>'}
      <p class="mk-out"><button type="button" class="mk-link" data-act="logout">로그아웃</button></p>`;
  }

  // ── 동네 정하기 ──
  function drawRegion() {
    root.innerHTML = `<div class="mk-bar"><a href="#" class="mk-back">‹</a><b>내 동네 정하기</b><span></span></div>
      <div class="mk-region"><img src="/icons/semi-happy.svg" width="64" height="64" alt=""><p>가까운 이웃의 물건부터 보여 드려요.${region ? `<br>지금: <b>${esc(region.region)}</b>` : ''}</p>
        <button type="button" class="btn fill wide" data-act="gps">📍 지금 있는 곳으로 정하기</button>
        <form data-act="rq" class="mk-search"><input type="search" placeholder="동·읍·면 이름으로 찾기 (예: 순창읍, 잠실동)" enterkeyhint="search" aria-label="동네 이름"></form>
        <ul class="mk-rlist" id="mk-rlist"></ul></div>`;
  }
  async function findRegion(text) {
    const ul = document.getElementById('mk-rlist'); ul.innerHTML = '<li class="re-empty semi-wait">동네를 찾고 있어요</li>';
    try {
      await kakaoGeo();
      new kakao.maps.services.Geocoder().addressSearch(text, (r, s) => {
        if (s !== kakao.maps.services.Status.OK || !r.length) { ul.innerHTML = '<li class="re-empty">맞는 동네가 없어요. 다른 이름으로 찾아 보세요.</li>'; return; }
        const seen = new Set(); const opts = r.map(x => x.address || x.road_address).filter(Boolean).map(a => toRegion(a)).filter(o => !seen.has(o.region) && seen.add(o.region));
        ul.innerHTML = opts.slice(0, 10).map(o => `<li><button type="button" data-rg='${esc(JSON.stringify(o))}'>${esc(o.sgg.split(' ')[0])} ${esc(o.region)}</button></li>`).join('');
      });
    } catch (e) { ul.innerHTML = '<li class="re-empty">지금은 동네를 찾지 못했어요.</li>'; }
  }

  // ── 화면 고르기 ──
  const view = () => { const h = location.hash; return /^#i=\d+/.test(h) ? 'item' : h === '#new' ? 'new' : h === '#chats' ? 'chats' : /^#c=\d+/.test(h) ? 'room' : h === '#my' ? 'my' : h === '#region' ? 'region' : 'list'; };
  function route() {
    clearInterval(poll); delete root.dataset.item;
    const v = view(), n = +(location.hash.split('=')[1] || 0);
    document.body.classList.toggle('mk-in', v !== 'list');
    if (v === 'item') drawItem(n); else if (v === 'new') drawNew(); else if (v === 'chats') drawChats(); else if (v === 'room') drawRoom(n); else if (v === 'my') drawMy(); else if (v === 'region') drawRegion();
    else { drawList(); if (!list.length) loadList(true); }
    window.scrollTo(0, 0);
  }
  addEventListener('hashchange', route);

  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-act], [data-go], [data-cat], [data-wide], [data-rg]'); if (!t) return;
    const a = t.dataset.act;
    if (t.dataset.go) location.hash = t.dataset.go;
    else if (t.dataset.cat !== undefined) { cat = t.dataset.cat; loadList(true); drawList(); }
    else if (t.dataset.wide !== undefined) { wide = t.dataset.wide === '1'; loadList(true); drawList(); }
    else if (t.dataset.rg) { setRegion(JSON.parse(t.dataset.rg)); wide = false; say(`내 동네를 ${region.region}(으)로 정했어요.`); location.hash = ''; loadList(true); }
    else if (a === 'login') login();
    else if (a === 'more') loadList();
    else if (a === 'gps') {
      if (!navigator.geolocation) return say('이 기기에서는 위치를 알 수 없어요. 이름으로 찾아 주세요.');
      t.disabled = true; t.textContent = '위치를 찾고 있어요…';
      navigator.geolocation.getCurrentPosition(async p => {
        try { await kakaoGeo(); new kakao.maps.services.Geocoder().coord2RegionCode(p.coords.longitude, p.coords.latitude, (r, s) => { const h = s === kakao.maps.services.Status.OK && (r.find(x => x.region_type === 'H') || r[0]); if (!h) { t.disabled = false; return say('위치로 동네를 찾지 못했어요.'); } setRegion(toRegion(h)); wide = false; say(`내 동네를 ${region.region}(으)로 정했어요.`); location.hash = ''; loadList(true); }); }
        catch (err) { t.disabled = false; say('지금은 동네를 찾지 못했어요.'); }
      }, () => { t.disabled = false; t.textContent = '📍 지금 있는 곳으로 정하기'; say('위치 권한을 허용하거나, 동네 이름으로 찾아 주세요.'); }, { timeout: 10000 });
    }
    else if (a === 'chat') {
      if (!me) return login();
      try { const d = await post('/m/chat/open', { item: +root.dataset.item }); location.hash = '#c=' + d.chat; } catch (err) { say(err.message || '채팅을 열지 못했어요.'); }
    }
    else if (a === 'report') {
      if (!me) return login();
      const why = prompt('어떤 문제가 있나요? (예: 거래 금지 물품, 사기 의심, 욕설)'); if (!why) return;
      try { await post('/m/report', { item: +root.dataset.item, reason: why }); say('신고했어요. 돈셈이 살펴보고 조치할게요.'); } catch (err) { say('신고하지 못했어요.'); }
    }
    else if (a === 'del') {
      if (!confirm('이 글을 지울까요? 지우면 되돌릴 수 없어요.')) return;
      try { await post('/m/item/update', { id: +root.dataset.item, status: 'del' }); say('글을 지웠어요.'); list = []; location.hash = '#my'; } catch (err) { say(err.message || '지우지 못했어요.'); }
    }
    else if (a === 'unpic') { const pv = t.parentElement; pics = pics.filter(x => x !== pv.dataset.id); pv.remove(); document.getElementById('mk-pc').textContent = pics.length; }
    else if (a === 'nick') {
      const n = prompt('새 닉네임 (12자까지)', me.nick); if (!n) return;
      try { await post('/m/me', { nick: n }); me.nick = n.slice(0, 12); drawMy(); } catch (err) { say(err.message || '바꾸지 못했어요.'); }
    }
    else if (a === 'logout') { try { await post('/m/logout', {}); } catch (err) { /* 그래도 이 기기에서는 나가요 */ } token = null; me = null; put(TK, null); say('로그아웃했어요.'); location.hash = ''; }
  });
  root.addEventListener('change', async e => {
    if (e.target.dataset.act === 'pics') { await addPics(e.target.files); e.target.value = ''; }
    if (e.target.dataset.act === 'status') { try { await post('/m/item/update', { id: +root.dataset.item, status: e.target.value }); say('거래 상태를 바꿨어요.'); list = []; } catch (err) { say('바꾸지 못했어요.'); } }
  });
  root.addEventListener('submit', async e => {
    e.preventDefault(); const f = e.target, a = f.dataset.act;
    if (a === 'search') { q = f.querySelector('input').value.trim(); loadList(true); drawList(); }
    else if (a === 'rq') { const v = f.querySelector('input').value.trim(); if (v) findRegion(v); }
    else if (a === 'send') {
      const v = f.t.value.trim(); if (!v) return; f.t.value = '';
      try { const d = await post('/m/msgs?after=' + lastMsg, { chat: room, text: v }); pull(false, d); } catch (err) { f.t.value = v; say(err.message || '보내지 못했어요.'); }
    }
    else if (a === 'submit') {
      const b = f.querySelector('button[type=submit]'); b.disabled = true; b.textContent = '올리고 있어요…';
      try {
        const d = await post('/m/items', { title: f.title.value, cat: f.cat.value, price: f.free.checked ? 0 : +f.price.value.replace(/\D/g, ''), body: f.body.value, region: region.region, sgg: region.sgg, imgs: pics });
        say('물건을 올렸어요!'); list = []; location.hash = '#i=' + d.id;
      } catch (err) { b.disabled = false; b.textContent = '올리기'; say(err.message || '올리지 못했어요.'); }
    }
  });

  // 시작: 내 정보 → 화면
  api('/m/me').then(d => { me = d.me; cats = d.cats || []; loginOn = d.login; if (me && me.sgg && !region) { region = { sgg: me.sgg, region: me.region }; put(RG, JSON.stringify(region)); } else if (me && region && me.sgg !== region.sgg) post('/m/me', { region: region.region, sgg: region.sgg }).catch(() => {}); })
    .catch(() => {}).finally(route);
})();
