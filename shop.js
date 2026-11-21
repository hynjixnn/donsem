/* 돈셈 스토어: 토스페이먼츠 결제위젯으로 결제하고, 워커가 승인한 뒤 산 사람만 파일을 받아요 */
(() => {
  /* 클라이언트 키는 공개돼도 되는 키예요(시크릿 키는 워커 비밀에만 있어요). 심사가 끝나면 live_gck_… 로 바꿔요 */
  const CLIENT_KEY = 'live_gck_c19weG0gk7hCw83pftwraGuHV5slsB97Bp';
  const API = 'https://donsem-counter.hjjung330.workers.dev';
  const PRODUCTS = { budget: { name: '돈셈 가계부·재테크 엑셀 템플릿', price: 9900, img: '/shop/sheet-summary.png' }, yearend: { name: '돈셈 연말정산 준비 키트', price: 4900, img: '/shop/kit-yearend-card.png' }, starter: { name: '돈셈 사회초년생 돈 관리 키트', price: 6900, img: '/shop/kit-starter-fixed.png' }, pro1y: { name: '돈셈 Pro 1년 이용권', price: 19900, img: '/icon-192.png', pass: true }, semitk3: { name: '셈이 한도 초기화 티켓 3장', price: 1900, img: '/icons/semi-happy.svg', pass: true, key: 'donsem:semi-tk', open: '/my/', label: '마이에서 보기', on: '초기화 티켓 3장이 들어왔어요. 셈이 사용량을 다 쓰면 마이 › 일일 사용량 한도에서 티켓을 써 주세요.' }, semitk10: { name: '셈이 한도 초기화 티켓 10장', price: 4900, img: '/icons/semi-happy.svg', pass: true, key: 'donsem:semi-tk', open: '/my/', label: '마이에서 보기', on: '초기화 티켓 10장이 들어왔어요. 셈이 사용량을 다 쓰면 마이 › 일일 사용량 한도에서 티켓을 써 주세요.' }, redevplus1y: { name: '돈셈 조합원 플러스 1년 이용권', price: 29000, img: '/icons/real-estate.webp', pass: true, key: 'donsem:redevplus-pass', open: '/redev/#rdp', label: '플러스 열기', on: '조합원 플러스가 켜졌어요. 재건축 조합원 도우미에서 「알림 켜기」를 누르면 내 구역 소식을 휴대폰으로 받아요.' }, redev1y: { name: '재건축 조합원 맞춤 리포트 1년 이용권', price: 9900, img: '/icons/real-estate.webp', pass: true, key: 'donsem:redev-pass', open: '/redev/#rdr', label: '리포트 열기', on: '맞춤 리포트가 열렸어요. 오늘부터 1년 동안 내 구역 숫자가 바뀔 때마다 다시 볼 수 있어요.' } };
  const LIVE = CLIENT_KEY.startsWith('live_');
  const q = new URLSearchParams(location.search);
  /* 2026-11-18: 상품을 새로 만드는 동안 판매를 잠시 쉬어요. 이미 산 분의 「다시 받기」와 결제 중이던 승인(s=ok)은 그대로 돼요. 다시 열 때 true */
  const OPEN = { pro1y: true, redev1y: true, redevplus1y: true, semitk3: false, semitk10: false }; /* 셈이 초기화 티켓: 워커(/ai/reset)를 올린 뒤 true */ // 지금 파는 상품 (엑셀 키트는 새로 만드는 중이라 쉬어요)
  const isOpen = k => !!OPEN[k];
  const PASS_K = 'donsem:pro-pass';
  const passKey = D => (D && D.key) || PASS_K; // 이용권마다 저장하는 곳 (Pro: donsem:pro-pass, 재건축 리포트: donsem:redev-pass)
  const $ = id => document.getElementById(id);
  const SK = 'donsem:orders';
  const load = () => { try { return JSON.parse(localStorage.getItem(SK)) || []; } catch (e) { return []; } };
  const save = o => { try { const a = load().filter(x => x.orderId !== o.orderId); a.unshift(o); localStorage.setItem(SK, JSON.stringify(a.slice(0, 20))); } catch (e) { /* 저장이 막힌 기기 */ } };
  const dlUrl = t => `${API}/pay/dl?t=${encodeURIComponent(t)}`;
  const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    .then(r => r.json().catch(() => ({})).then(j => (r.ok ? j : Promise.reject(j))));
  const say = (msg) => (typeof toast === 'function' ? toast(msg) : alert(msg));

  /* ── 상품 페이지 (/shop/budget-template/) ── */
  const buy = $('shop-buy');
  if (buy) {
    const note = $('shop-note'), open = isOpen(buy.dataset.product || 'budget');
    if (open && note) note.textContent = LIVE ? '카드·계좌이체·간편결제로 결제하고 바로 내려받아요.' : '지금은 테스트 결제만 돼요. 진짜 돈이 나가지 않아요.';
    if (!open) { buy.disabled = true; buy.textContent = '새 버전 준비 중'; if (note) note.textContent = '더 쓸모 있게 새로 만들고 있어요. 지금은 판매를 잠시 쉬어요. 이미 산 분은 아래에서 다시 받을 수 있어요.'; }
    buy.addEventListener('click', () => {
      if (!open) return say('더 좋은 버전을 만들고 있어서 지금은 판매를 잠시 쉬어요.');
      location.href = '/shop/pay/?p=' + (buy.dataset.product || 'budget');
    });
  }
  drawMine();

  function drawMine() {
    const box = $('shop-mine'); if (!box) return;
    const list = load();
    const mine = $('shop-mine-list');
    mine.innerHTML = list.length ? list.map(o => { const G = PRODUCTS[o.product] || PRODUCTS.budget; return `<li><span><b>${o.live ? G.name : '테스트 결제'}</b><small>주문번호 ${o.orderId.replace(/[^\w-]/g, '')} · ${new Date(o.t).toLocaleDateString('ko-KR')}</small></span>${G.pass ? `<a class="btn line" href="${G.open || '/budget/?pro=an#pro'}">${G.label || 'Pro 열기'}</a>` : `<a class="btn line" href="${dlUrl(o.token)}" rel="nofollow">내려받기</a>`}</li>`; }).join('') : '';
    mine.hidden = !list.length;
    const form = $('shop-find');
    if (form && !form.dataset.on) {
      form.dataset.on = '1';
      form.addEventListener('submit', e => {
        e.preventDefault();
        const orderId = $('find-oid').value.trim(), email = $('find-email').value.trim();
        if (!orderId || !email) return say('주문번호와 이메일을 적어 주세요.');
        const btn = form.querySelector('button'); btn.disabled = true;
        post('/pay/find', { orderId, email }).then(j => {
          save({ orderId: j.orderId, token: j.token, live: j.live, product: j.product, t: j.created || Date.now() });
          if ((PRODUCTS[j.product] || {}).pass) { try { localStorage.setItem(passKey(PRODUCTS[j.product]), JSON.stringify({ token: j.token, orderId: j.orderId, live: j.live, t: j.created || Date.now() })); } catch (e) { /* 괜찮아요 */ } }
          drawMine(); say((PRODUCTS[j.product] || {}).pass ? '이용권을 이 기기에 불러왔어요.' : '주문을 찾았어요. 내려받기를 눌러 주세요.');
        }).catch(j => say((j && j.message) || '찾지 못했어요. 잠시 뒤 다시 해 주세요.')).finally(() => { btn.disabled = false; });
      });
    }
  }

  /* ── 결제 페이지 (/shop/pay/) ── */
  if (!$('pay')) return;
  const show = id => ['pay-checkout', 'pay-wait', 'pay-done', 'pay-fail', 'pay-closed'].forEach(x => { $(x).hidden = x !== id; });
  const s = q.get('s');
  const key = PRODUCTS[q.get('p')] ? q.get('p') : 'budget', G = PRODUCTS[key], money = n => n.toLocaleString('ko-KR') + '원';

  const done = o => {
    show('pay-done');
    $('pay-oid').textContent = o.orderId;
    const D = PRODUCTS[o.product] || PRODUCTS.budget; $('pay-pname').textContent = D.name; $('pay-pprice').textContent = money(D.price);
    $('pay-dl').href = dlUrl(o.token);
    if (D.pass) {
      try { localStorage.setItem(passKey(D), JSON.stringify({ token: o.token, orderId: o.orderId, live: o.live, t: o.t || Date.now() })); } catch (e) { /* 괜찮아요 */ }
      $('pay-done-sub').textContent = o.live ? (D.on || 'Pro가 켜졌어요. 오늘부터 1년 동안 모든 Pro 기능을 쓸 수 있어요.') : '테스트 결제라서 진짜 돈은 나가지 않았어요. 시험으로 켜졌어요.';
      $('pay-dl').href = D.open || '/budget/?pro=an#pro'; $('pay-dl').removeAttribute('rel'); $('pay-dl').textContent = D.label || 'Pro 열기';
      const tips = document.querySelector('.pay-tips'); if (tips) tips.innerHTML = (D.key === 'donsem:semi-tk' ? '<li>셈이 사용량을 다 쓰면 마이 › 일일 사용량 한도에서 「티켓 쓰기」를 눌러 바로 초기화해요.</li><li>티켓은 이 기기에 저장되고 1년 안에 쓰면 돼요.</li>' : D.key === 'donsem:redevplus-pass' ? '<li>재건축 조합원 도우미(/redev/)의 「조합원 플러스」에서 내 구역을 저장하고 「알림 켜기」를 눌러 주세요.</li><li>다른 기기에서는 「다른 기기에서 산 이용권 불러오기」에 주문번호와 이메일을 넣으세요.</li>' : D.key ? '<li>리포트는 재건축 조합원 도우미(/redev/) 「내 구역 맞춤 리포트」에서 바로 볼 수 있어요.</li><li>다른 기기에서는 리포트의 「다른 기기에서 산 이용권 불러오기」에 주문번호와 이메일을 넣으세요.</li>' : '<li>Pro는 캘린더 › Pro에서 바로 쓸 수 있어요.</li><li>다른 기기에서는 Pro 화면의 「이용권 불러오기」에 주문번호와 이메일을 넣으세요.</li>') + '<li>결제 후 7일 안에는 전액, 그 뒤에는 남은 기간만큼 환불돼요. <a href="mailto:hjjung330@gmail.com">hjjung330@gmail.com</a></li>';
      return;
    }
    if (!o.live && !D.pass) { $('pay-done-sub').textContent = '테스트 결제라서 진짜 상품 대신 확인용 파일을 받아요.'; $('pay-dl').textContent = '확인용 파일 내려받기'; }
  };

  if (s === 'ok') {
    show('pay-wait');
    const paymentKey = q.get('paymentKey'), orderId = q.get('orderId'), amount = Number(q.get('amount'));
    let email = ''; try { email = sessionStorage.getItem('donsem:pay-email') || ''; } catch (e) { /* 없음 */ }
    if (amount !== G.price) { show('pay-fail'); $('pay-fail-msg').textContent = '결제 금액이 상품 가격과 달라서 승인하지 않았어요. 돈은 나가지 않았어요.'; return; }
    const once = () => post('/pay/confirm', { paymentKey, orderId, amount, email, product: key });
    once().catch(j => (j && j.error ? Promise.reject(j) : new Promise(r => setTimeout(r, 1500)).then(once))) /* 인터넷이 끊겼을 때만 한 번 더 */
      .then(j => {
        const o = { orderId: j.orderId, token: j.token, live: j.live, product: j.product || key, t: Date.now() };
        save(o);
        history.replaceState(null, '', '/shop/pay/?s=done&o=' + encodeURIComponent(o.orderId));
        done(o);
      })
      .catch(j => {
        show('pay-fail');
        $('pay-fail-msg').textContent = ((j && j.message) || '결제를 확인하지 못했어요.') + ' 승인 전이라 돈은 나가지 않았어요. 주문번호: ' + (orderId || '-');
      });
    return;
  }
  if (s === 'done') {
    const o = load().find(x => x.orderId === q.get('o'));
    if (o) return done(o);
    location.replace('/shop/'); return;
  }
  if (s === 'fail') {
    show('pay-fail');
    const code = q.get('code') || '';
    $('pay-fail-msg').textContent = code === 'PAY_PROCESS_CANCELED' ? '결제를 취소했어요. 돈은 나가지 않았어요.' : (q.get('message') || '결제가 되지 않았어요.') + ' 돈은 나가지 않았어요.';
    return;
  }
  const retry = $('pay-retry'); if (retry) retry.href = '/shop/pay/?p=' + key;
  if (!isOpen(key)) return show('pay-closed');

  /* 결제창 그리기 */
  show('pay-checkout');
  $('pay-test').hidden = LIVE;
  if (G.pass) { const sm = document.querySelector('.pay-item small'); if (sm) sm.textContent = '결제한 날부터 1년 · 결제하면 바로 켜져요'; const ag = document.querySelector('.pay-agree span'); if (ag) ag.innerHTML = G.name.replace(' 1년 이용권', '') + ' 1년 이용권(한 번 결제, 자동 갱신 없음)이에요. <b>결제 후 7일 안에는 전액 환불</b>, 그 뒤에는 남은 기간만큼 환불돼요. <a href="/refund/" target="_blank" rel="noopener">환불정책</a> · <a href="/terms/" target="_blank" rel="noopener">이용약관</a>'; const lb = document.querySelector('label[for="pay-email"] small'); if (lb) lb.textContent = '다른 기기에서 이용권을 불러오거나 환불할 때 써요'; }
  $('pay-pimg').src = G.img; $('pay-iname').textContent = G.name; $('pay-iprice').textContent = money(G.price); $('pay-go').textContent = money(G.price) + ' 결제하기';
  const msg = $('pay-msg'), go = $('pay-go'), agree = $('pay-agree'), mail = $('pay-email');
  try { mail.value = localStorage.getItem('donsem:pay-email') || ''; } catch (e) { /* 없음 */ }
  let widgets = null;
  const ready = () => { go.disabled = !widgets; };
  const sdk = document.createElement('script');
  sdk.src = 'https://js.tosspayments.com/v2/standard';
  sdk.onerror = () => { msg.textContent = '결제 화면을 불러오지 못했어요. 인터넷을 확인하고 새로고침해 주세요.'; };
  sdk.onload = async () => {
    try {
      const w = TossPayments(CLIENT_KEY).widgets({ customerKey: TossPayments.ANONYMOUS });
      await w.setAmount({ currency: 'KRW', value: G.price });
      await Promise.all([
        w.renderPaymentMethods({ selector: '#payment-method', variantKey: 'DEFAULT' }),
        w.renderAgreement({ selector: '#agreement', variantKey: 'AGREEMENT' }),
      ]);
      widgets = w; msg.textContent = ''; ready();
    } catch (e) { msg.textContent = '결제 화면을 불러오지 못했어요. 새로고침해 주세요. (' + String((e && e.message) || e).slice(0, 80) + ')'; }
  };
  document.head.append(sdk);

  go.addEventListener('click', async () => {
    const email = mail.value.trim();
    if (!/^[^\s@<>]{1,64}@[^\s@<>]{1,100}\.[a-z]{2,}$/i.test(email)) { mail.focus(); return say('이메일 주소를 적어 주세요.'); }
    if (!agree.checked) { agree.focus(); return say('환불 안내를 확인하고 체크해 주세요.'); }
    try { localStorage.setItem('donsem:pay-email', email); sessionStorage.setItem('donsem:pay-email', email); } catch (e) { /* 없음 */ }
    const rnd = (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '') : Math.random().toString(36).slice(2) + Date.now().toString(36)).slice(0, 16);
    const orderId = 'DS' + Date.now().toString(36).toUpperCase() + rnd;
    go.disabled = true;
    try {
      await widgets.requestPayment({
        orderId, orderName: G.name, customerEmail: email,
        successUrl: location.origin + '/shop/pay/?s=ok&p=' + key,
        failUrl: location.origin + '/shop/pay/?s=fail&p=' + key,
      });
    } catch (e) {
      /* 결제창을 닫은 경우 등 */
      if (e && e.code && e.code !== 'USER_CANCEL') say(e.message || '결제를 시작하지 못했어요.');
    } finally { go.disabled = false; }
  });
})();
