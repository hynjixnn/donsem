/* 돈셈 스토어: 토스페이먼츠 결제위젯으로 결제하고, 워커가 승인한 뒤 산 사람만 파일을 받아요 */
(() => {
  /* 클라이언트 키는 공개돼도 되는 키예요(시크릿 키는 워커 비밀에만 있어요). 심사가 끝나면 live_gck_… 로 바꿔요 */
  const CLIENT_KEY = 'live_gck_c19weG0gk7hCw83pftwraGuHV5slsB97Bp';
  const API = 'https://donsem-counter.hjjung330.workers.dev';
  const PRODUCTS = { budget: { name: '돈셈 가계부·재테크 엑셀 템플릿', price: 9900, img: '/shop/sheet-summary.png' }, yearend: { name: '돈셈 연말정산 준비 키트', price: 4900, img: '/shop/kit-yearend-card.png' }, starter: { name: '돈셈 사회초년생 돈 관리 키트', price: 6900, img: '/shop/kit-starter-fixed.png' } };
  const LIVE = CLIENT_KEY.startsWith('live_');
  const q = new URLSearchParams(location.search);
  const open = true; /* 토스 심사 때 결제 화면까지 가는 길을 보여야 해서 열어 둬요 (진짜 키 전에는 테스트 결제라 돈이 오가지 않아요) */
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
    const note = $('shop-note');
    if (open && note) note.textContent = LIVE ? '카드·계좌이체·간편결제로 결제하고 바로 내려받아요.' : '지금은 테스트 결제만 돼요. 진짜 돈이 나가지 않아요.';
    buy.addEventListener('click', () => {
      if (!open) return say('결제를 준비하고 있어요. 곧 바로 구매할 수 있게 열어 드릴게요.');
      location.href = '/shop/pay/?p=' + (buy.dataset.product || 'budget');
    });
  }
  drawMine();

  function drawMine() {
    const box = $('shop-mine'); if (!box) return;
    const list = load();
    const mine = $('shop-mine-list');
    mine.innerHTML = list.length ? list.map(o => `<li><span><b>${o.live ? (PRODUCTS[o.product] || PRODUCTS.budget).name : '테스트 결제'}</b><small>주문번호 ${o.orderId.replace(/[^\w-]/g, '')} · ${new Date(o.t).toLocaleDateString('ko-KR')}</small></span><a class="btn line" href="${dlUrl(o.token)}" rel="nofollow">내려받기</a></li>`).join('') : '';
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
          drawMine(); say('주문을 찾았어요. 내려받기를 눌러 주세요.');
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
    if (!o.live) { $('pay-done-sub').textContent = '테스트 결제라서 진짜 상품 대신 확인용 파일을 받아요.'; $('pay-dl').textContent = '확인용 파일 내려받기'; }
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
  if (!open) return show('pay-closed');

  /* 결제창 그리기 */
  show('pay-checkout');
  $('pay-test').hidden = LIVE;
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
