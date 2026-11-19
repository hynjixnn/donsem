// 돈셈 조합원 플러스 (/redev/ #rdp) — 1년 29,000원: 맞춤 리포트 + 내 구역 소식 + 숫자가 바뀌면 분담금 다시 계산 + 휴대폰 알림
// 소식·일정은 /redev-news.json (redev-tools.js 가 불러서 window.donsemRedevNews 에 둬요). 알림은 워커 /push/* + sw.js
(() => {
  const root = document.getElementById('rdp');
  if (!root) return;
  const API = 'https://donsem-counter.hjjung330.workers.dev';
  const PASS = 'donsem:redevplus-pass', MY = 'donsem:redev-my';
  const $ = id => document.getElementById(id);
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장이 막힌 기기 */ } };
  const say = m => { if (typeof toast === 'function') toast(m); };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = s => Number(String(s == null ? '' : s).replace(/[^0-9.-]/g, '')) || 0;
  const eok = n => { const a = Math.abs(n), s = n < 0 ? '-' : ''; const w = Math.round(a / 1e4); if (w >= 1e4) { const e = Math.floor(w / 1e4), m = w % 1e4; return `${s}${e}억${m ? ' ' + m.toLocaleString('ko-KR') + '만' : ''} 원`; } return `${s}${w.toLocaleString('ko-KR')}만 원`; };
  const dday = d => { const k = new Date(Date.now() + 9 * 3600e3), t = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()); return Math.round((Date.parse(d + 'T00:00:00Z') - t) / 864e5); };
  const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('unlock');
  const pass = () => rd(PASS);
  const ok = () => dev || !!(pass() && pass().token && (!pass().exp || pass().exp > Date.now()));
  const check = () => { const x = pass(); if (!x || !x.token || (x.chk && Date.now() - x.chk < 864e5)) return Promise.resolve(); return fetch(API + '/pay/pro?t=' + encodeURIComponent(x.token)).then(r => r.json()).then(j => { x.exp = j && j.exp ? j.exp : (j && j.ok === false ? 1 : x.exp); x.chk = Date.now(); wr(PASS, x); }).catch(() => {}); };

  // ── 휴대폰 알림 ──
  const canPush = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent), standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const sub = () => canPush ? Promise.race([navigator.serviceWorker.getRegistration().then(r => (r ? r.pushManager.getSubscription() : null)), new Promise(ok => setTimeout(() => ok(null), 1500))]) : Promise.resolve(null); // 서비스워커가 없으면 기다리지 않아요
  const b64 = s => { const p = '='.repeat((4 - s.length % 4) % 4), r = atob((s + p).replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(r, c => c.charCodeAt(0)); };
  const post = (p, body) => fetch(API + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
  async function pushOn() {
    const m = rd(MY); if (!m) return say('위 계산기에서 내 구역을 먼저 저장해 주세요.');
    if (!canPush) return say(ios && !standalone ? '아이폰은 홈 화면에 돈셈을 추가한 뒤 그 앱에서 켤 수 있어요.' : '이 브라우저는 알림을 지원하지 않아요.');
    if (await Notification.requestPermission() !== 'granted') return say('알림 허용을 눌러야 켤 수 있어요. 브라우저 설정에서 바꿀 수 있어요.');
    const { key } = await fetch(API + '/push/key').then(r => r.json());
    const reg = await navigator.serviceWorker.ready;
    const s = (await reg.pushManager.getSubscription()) || await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64(key) });
    const j = await post('/push/sub', { endpoint: s.endpoint, zone: m.id, t: (pass() || {}).token || '' });
    if (!j.ok) return say(j.message || '알림을 켜지 못했어요.');
    wr('donsem:redev-push', { zone: m.id, at: Date.now() }); say('알림을 켰어요. 테스트 알림을 보내 볼게요.');
    await post('/push/test', { endpoint: s.endpoint }); draw();
  }
  async function pushOff() { const s = await sub(); if (s) { await post('/push/unsub', { endpoint: s.endpoint }).catch(() => {}); await s.unsubscribe(); } localStorage.removeItem('donsem:redev-push'); say('알림을 껐어요.'); draw(); }
  // 저장한 구역을 바꾸면 알림 구역도 같이 바꿔요
  const resync = () => { const p = rd('donsem:redev-push'), m = rd(MY); if (!ok() || !p || !m || p.zone === m.id) return; sub().then(s => s && post('/push/sub', { endpoint: s.endpoint, zone: m.id, t: (pass() || {}).token || '' }).then(j => { if (j.ok) wr('donsem:redev-push', { zone: m.id, at: Date.now() }); })).catch(() => {}); };

  // ── 소식 ──
  function newsHtml(m) {
    const N = window.donsemRedevNews; if (!N) return '<p class="rdc-wait">소식을 불러오고 있어요</p>';
    const ev = ((N.events || {})[m.id] || []).filter(([d]) => dday(d) >= 0).map(([d, t]) => ({ d, t, kind: 'event' }));
    const list = [...ev, ...(N.news || []).filter(n => n.z === m.id)].sort((a, b) => (b.kind === 'event') - (a.kind === 'event') || b.d.localeCompare(a.d));
    if (!list.length) return `<p class="rdc-note">아직 이 구역 소식이 없어요. 매주 목요일에 새 소식을 확인해서 여기에 모아 드려요. (자세히 챙기는 주요 구역: 압구정·성수·한남·은마·잠실5·반포·여의도·목동 등, 다른 구역은 서울시 자료가 바뀔 때 단계 변화를 알려 드려요)</p>`;
    const i = m.inputs || {}, old = num(i['rdc-old']), ratio = num(i['rdc-ratio']) / 100, price = num(i['rdc-new']), share = price - old * ratio;
    return `<ul class="rdp-news">${list.slice(0, 12).map(n => {
      let extra = '';
      if (n.kind === 'num' && old && (n.ratio || n.price84)) { // 숫자가 바뀐 소식: 내 숫자로 다시 계산
        const r2 = n.ratio ? n.ratio / 100 : ratio, p2 = n.price84 || price, s2 = p2 - old * r2, d = s2 - share;
        extra = `<div class="rdp-re"><span>이 숫자로 다시 계산하면 내 분담금 <b>${eok(s2)}</b> <em class="${d > 0 ? 'rdr-minus' : 'rdc-plus'}">${d > 0 ? '+' : ''}${eok(d)}</em></span><button type="button" class="btn line" data-apply="${esc(JSON.stringify({ r: n.ratio || '', p: n.price84 || '' }))}">이 숫자로 바꾸기</button></div>`;
      }
      const tag = n.kind === 'event' ? `<em class="${dday(n.d) <= 7 ? 'hot' : ''}">${dday(n.d) ? 'D-' + dday(n.d) : 'D-DAY'}</em>` : `<em>${{ stage: '단계', news: '소식', num: '숫자' }[n.kind] || '소식'}</em>`;
      return `<li>${tag}<div><b>${esc(n.t)}</b><small>${esc(n.d.replace(/-/g, '.'))}${n.src ? ` · <a href="${esc(n.src[1])}" target="_blank" rel="noopener">${esc(n.src[0])}</a>` : ''}</small>${n.body ? `<p>${esc(n.body)}</p>` : ''}${extra}</div></li>`;
    }).join('')}</ul>`;
  }

  async function draw() {
    if (!ok()) {
      root.innerHTML = `<div class="rdp-up"><span class="rdr-badge">조합원 플러스</span><h2>내 구역, 이제 챙겨 드릴게요</h2>
        <ul class="rdp-list"><li><b>📰 매주 내 구역 소식</b><span>총회·시공사·인가·이주 소식을 모아 드려요</span></li><li><b>🔔 휴대폰 알림</b><span>총회 7일 전·하루 전, 새 소식이 생기면 바로</span></li><li><b>🧮 숫자가 바뀌면 다시 계산</b><span>비례율·분양가가 바뀌면 내 분담금이 얼마 달라지는지</span></li><li><b>📑 맞춤 리포트 포함</b><span>아래 리포트(9,900원)도 같이 열려요</span></li></ul>
        <a class="btn fill wide" href="/shop/pay/?p=redevplus1y">1년 29,000원 · 한 달 약 2,400원</a>
        <small class="rdp-fine">한 번 결제 · 자동 갱신 없음 · 7일 안 전액 환불</small>
        <button type="button" class="btn line" id="rdp-load">다른 기기에서 산 이용권 불러오기</button></div>`;
      return;
    }
    const m = rd(MY), x = pass(), s = await sub().catch(() => null), on = !!(s && rd('donsem:redev-push'));
    const until = x && x.exp > 9 ? new Date(x.exp).toLocaleDateString('ko-KR') : '';
    root.innerHTML = `<h2>조합원 플러스 <span class="rdr-badge">사용 중</span></h2><p class="sub small">${until ? until + '까지 · ' : ''}내 구역 소식과 일정을 챙겨 드려요.</p>
      ${m ? `<h3 class="rd-h3">${esc(m.name)} 소식</h3>${newsHtml(m)}` : '<p class="rdc-wait">위 계산기에서 구역을 고르고 「내 구역으로 저장」을 누르면 소식이 여기에 모여요.</p>'}
      <div class="rdp-push"><div><b>🔔 휴대폰 알림 ${on ? '켜짐' : '꺼짐'}</b><span>${on ? '새 소식과 총회 7일 전·하루 전에 알려 드려요 (아침 9시쯤)' : ios && !standalone ? '아이폰은 Safari 공유 버튼 → 「홈 화면에 추가」 → 홈 화면의 돈셈에서 켜 주세요' : '총회 일정과 새 소식을 휴대폰으로 받아요'}</span></div>
        ${on ? '<button type="button" class="btn line" id="rdp-test">테스트</button><button type="button" class="btn ghost" id="rdp-off">끄기</button>' : '<button type="button" class="btn fill" id="rdp-on">알림 켜기</button>'}</div>`;
  }

  root.addEventListener('click', e => {
    if (e.target.closest('#rdp-on')) pushOn().catch(() => say('알림을 켜지 못했어요. 잠시 뒤 다시 해 주세요.'));
    if (e.target.closest('#rdp-off')) pushOff();
    if (e.target.closest('#rdp-test')) sub().then(s => s && post('/push/test', { endpoint: s.endpoint })).then(j => say(j && j.ok ? '테스트 알림을 보냈어요.' : (j && j.message) || '보내지 못했어요.')).catch(() => say('보내지 못했어요.'));
    const ap = e.target.closest('[data-apply]');
    if (ap) { const v = JSON.parse(ap.dataset.apply); if (v.r && $('rdc-ratio')) $('rdc-ratio').value = v.r; if (v.p && $('rdc-new')) $('rdc-new').value = Number(v.p).toLocaleString('ko-KR'); ['rdc-ratio', 'rdc-new'].forEach(i => $(i) && $(i).dispatchEvent(new Event('input', { bubbles: true }))); say('새 숫자로 바꿨어요. 「내 구역 숫자 고쳐 저장」을 누르면 저장돼요.'); $('rdc-calc') && $('rdc-calc').scrollIntoView({ behavior: 'smooth' }); }
    if (e.target.closest('#rdp-load')) {
      const orderId = (prompt('주문번호를 넣어 주세요') || '').trim(); if (!orderId) return;
      const email = (prompt('결제할 때 쓴 이메일을 넣어 주세요') || '').trim(); if (!email) return;
      post('/pay/find', { orderId, email }).then(j => {
        if (!j.ok) return say(j.message || '주문을 찾지 못했어요.');
        if (j.product !== 'redevplus1y') return say('조합원 플러스 주문이 아니에요.');
        wr(PASS, { token: j.token, orderId: j.orderId, live: j.live, t: j.created });
        return check().then(() => { say(ok() ? '조합원 플러스를 불러왔어요 ✨' : '환불했거나 기간이 끝난 이용권이에요.'); draw(); document.dispatchEvent(new CustomEvent('rdc:calc')); });
      }).catch(() => say('잠시 뒤 다시 해 주세요.'));
    }
  });
  document.addEventListener('rdn:load', draw);
  addEventListener('storage', e => { if (e.key === MY) { resync(); draw(); } });
  document.addEventListener('rdc:calc', () => { resync(); });
  // 내 구역을 저장하면(redev-tools 가 다시 그려요) 소식도 다시
  new MutationObserver(() => { clearTimeout(root._t); root._t = setTimeout(() => { if (ok()) { resync(); draw(); } }, 200); }).observe($('rdc-my') || document.body, { childList: true });
  draw(); check().then(draw);
})();
