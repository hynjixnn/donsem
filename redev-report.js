// 돈셈 재건축 조합원 맞춤 리포트 (/redev/ #rdr) — 유료(1년 이용권 9,900원, 돈셈 Pro 이용권도 열려요)
// 위 계산기(redev-tools.js)의 숫자 + 몇 가지를 더 넣으면: ① 분담금 경우의 수 ② 공사비가 오르면 ③ 돈 나가는 시간표 ④ 입주 후 따져 보기 ⑤ 지금 단계 할 일
// 모두 이 기기 안에서 계산해요. 이용권 확인만 워커(/pay/pro)에 물어봐요
(() => {
  const root = document.getElementById('rdr');
  if (!root) return;
  const API = 'https://donsem-counter.hjjung330.workers.dev';
  const PASS = 'donsem:redev-pass', PRO = 'donsem:pro-pass', PLUS = 'donsem:redevplus-pass', IN = 'donsem:redev-report';
  const $ = id => document.getElementById(id);
  const rd = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const wr = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 저장이 막힌 기기 */ } };
  const say = m => { if (typeof toast === 'function') toast(m); };
  const num = s => Number(String(s == null ? '' : s).replace(/[^0-9.-]/g, '')) || 0;
  const eok = n => { const a = Math.abs(n), s = n < 0 ? '-' : ''; const w = Math.round(a / 1e4); if (w >= 1e4) { const e = Math.floor(w / 1e4), m = w % 1e4; return `${s}${e}억${m ? ' ' + m.toLocaleString('ko-KR') + '만' : ''} 원`; } return `${s}${Math.round(a / 1e4).toLocaleString('ko-KR')}만 원`; };
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // ── 이용권 ──
  const passes = () => [rd(PASS), rd(PRO), rd(PLUS)].filter(x => x && x.token);
  const okPass = () => passes().some(x => !x.exp || x.exp > Date.now());
  const dev = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) && new URLSearchParams(location.search).has('unlock');
  const unlocked = () => dev || okPass();
  const check = () => Promise.all(passes().filter(x => !x.chk || Date.now() - x.chk > 864e5).map(x => fetch(API + '/pay/pro?t=' + encodeURIComponent(x.token)).then(r => r.json()).then(j => {
    const k = [PASS, PRO, PLUS].find(k => rd(k) && rd(k).token === x.token) || PASS;
    x.exp = j && j.exp ? j.exp : (j && j.ok === false ? 1 : x.exp); x.chk = Date.now(); wr(k, x);
  }).catch(() => {})));

  // ── 단계와 걸리는 기간 (서울 구역 기록의 가운데 값: tools/build_redev.py 가 window.RZ_STATS 로 넣어요) ──
  const P = ['구역 지정', '추진위', '조합 설립', '건축심의', '사업시행인가', '관리처분인가', '착공', '입주'];
  const IDX = { '구역 지정': 0, 추진위: 1, '조합 설립': 2, '시공사 선정': 2, 건축심의: 3, 사업시행인가: 4, 관리처분인가: 5, '이주·철거': 5, 착공: 6, 입주: 7 };
  const DEF = { 재건축: [9, 29, 30, 19, 16, 12], 재개발: [8, 43, 43, 20, 9, 12] };
  const gap = (kind, i) => { const s = (window.RZ_STATS || {})[kind] || DEF[kind] || DEF.재건축; return s[i] || DEF.재건축[i] || 12; };

  const F = [ // 리포트에서 더 넣는 칸 [id, 기본값]
    ['rdr-build', 36], ['rdr-pay', 'split'], ['rdr-mrate', 4.5], ['rdr-market', ''], ['rdr-tot-old', ''], ['rdr-tot-cost', ''], ['rdr-tot-con', ''], ['rdr-tot-sale', '']];
  const saved = rd(IN) || {};
  const val = id => { const e = $(id); return e ? e.value : ''; };

  function form() {
    return `<div class="rdr-form">
      <label for="rdr-market">입주 뒤 예상 시세 <small class="label-note">같은 동네 새 아파트 시세로. 비우면 조합원 분양가의 1.3배</small></label>
      <div class="field"><input id="rdr-market" inputmode="numeric" placeholder="예: 2,000,000,000"><span>원</span></div>
      <div class="rdr-two">
        <div><label for="rdr-build">공사 기간</label><div class="field"><input id="rdr-build" inputmode="numeric"><span>개월</span></div></div>
        <div><label for="rdr-mrate">중도금 대출 금리</label><div class="field"><input id="rdr-mrate" inputmode="decimal"><span>%</span></div></div>
      </div>
      <label for="rdr-pay">분담금 내는 방식</label>
      <div class="field"><select id="rdr-pay"><option value="split">나눠 내기 (계약금 10% · 중도금 60% · 잔금 30%)</option><option value="end">입주할 때 한 번에</option></select></div>
      <details class="rdc-more" id="rdr-totbox"><summary>조합 자료로 비례율 직접 따져 보기 (선택)</summary>
        <p class="rdc-note">사업시행계획·관리처분계획 총회 자료에 나와요. 단위는 억 원이에요.</p>
        <div class="rdr-two">
          <div><label for="rdr-tot-sale">총 분양 수입</label><div class="field"><input id="rdr-tot-sale" inputmode="decimal"><span>억</span></div></div>
          <div><label for="rdr-tot-cost">총 사업비</label><div class="field"><input id="rdr-tot-cost" inputmode="decimal"><span>억</span></div></div>
          <div><label for="rdr-tot-con">그중 공사비</label><div class="field"><input id="rdr-tot-con" inputmode="decimal"><span>억</span></div></div>
          <div><label for="rdr-tot-old">조합원 종전자산 합계</label><div class="field"><input id="rdr-tot-old" inputmode="decimal"><span>억</span></div></div>
        </div>
      </details>
    </div>`;
  }

  function report(c) {
    const { zone, old, ratio, price, ltv, rate } = c;
    const kind = (zone && zone.kind) || '재건축', at = zone ? (IDX[zone.step] ?? 2) : 2;
    const share = price - old * ratio;
    // ① 경우의 수: 비례율 × 조합원 분양가(공사비가 오르면 분양가도 올라요)
    const rs = [-0.2, -0.1, 0, 0.1].map(d => ratio + d).filter(r => r > 0), ps = [0, 0.05, 0.1];
    const t1 = `<table class="rdc-tbl rdr-grid"><thead><tr><th>비례율 \\ 분양가</th>${ps.map(p => `<th>${p ? '+' + p * 100 + '%' : '지금'}</th>`).join('')}</tr></thead><tbody>${rs.map(r => `<tr><th>${Math.round(r * 100)}%</th>${ps.map(p => { const v = price * (1 + p) - old * r; return `<td class="${v < 0 ? 'rdc-plus' : ''}${Math.abs(r - ratio) < 1e-9 && !p ? ' on' : ''}">${eok(v)}</td>`; }).join('')}</tr>`).join('')}</tbody></table>`;
    const worst = price * 1.1 - old * (ratio - 0.2), best = price - old * (ratio + 0.1);
    // ② 공사비가 오르면 (조합 자료가 있을 때)
    const sale = num(val('rdr-tot-sale')) * 1e8, cost = num(val('rdr-tot-cost')) * 1e8, con = num(val('rdr-tot-con')) * 1e8, tot = num(val('rdr-tot-old')) * 1e8;
    let t2 = '<p class="rdc-note">아래 「조합 자료로 비례율 직접 따져 보기」에 총회 자료 숫자를 넣으면, 공사비가 10%·20% 오를 때 비례율과 내 분담금이 얼마나 바뀌는지 계산해요.</p>';
    if (sale && cost && tot) {
      const r0 = (sale - cost) / tot, c0 = con || cost * 0.7;
      const row = (k, up) => { const r = (sale - cost - c0 * up) / tot, v = price - old * r; return `<tr${!up ? ' class="on"' : ''}><td>${k}</td><td>${(r * 100).toFixed(1)}%</td><td class="${v < 0 ? 'rdc-plus' : ''}">${eok(v)}</td><td>${up ? '+' + eok(old * (r0 - r)) : '-'}</td></tr>`; };
      t2 = `<p class="rdr-lead">조합 자료로 계산한 비례율은 <b>${(r0 * 100).toFixed(1)}%</b>예요${Math.abs(r0 - ratio) > 0.005 ? ` (위에 넣은 ${Math.round(ratio * 100)}%와 달라요)` : ''}.${con ? '' : ' 공사비를 비워서 사업비의 70%로 어림했어요.'}</p>
        <table class="rdc-tbl"><thead><tr><th>공사비</th><th>비례율</th><th>내 분담금</th><th>더 내는 돈</th></tr></thead><tbody>${row('지금', 0)}${row('10% 오르면', 0.1)}${row('20% 오르면', 0.2)}${row('30% 오르면', 0.3)}</tbody></table>
        <p class="rdc-note">공사비가 1억 오를 때마다 내 분담금은 약 ${eok(old / tot * 1e8)}씩 늘어요 (내 종전자산 비중 ${(old / tot * 100).toFixed(2)}%).</p>`;
    }
    // ③ 돈 나가는 시간표
    const build = num(val('rdr-build')) || 36, mrate = num(val('rdr-mrate')) / 100, split = val('rdr-pay') !== 'end';
    let m = 0; const mark = []; // 지금부터 몇 달 뒤인지
    for (let i = at; i < 7; i++) { m += i === 6 ? build : gap(kind, i); mark.push([P[i + 1], m]); }
    const mo = k => (mark.find(x => x[0] === k) || [0, 0])[1];
    const mgmt = at >= 5 ? 0 : mo('관리처분인가'), start = at >= 6 ? 0 : mo('착공'), move = mo('입주'), moveOut = Math.min(mgmt + 3, start);
    const now = new Date(), ym = k => { const d = new Date(now.getFullYear(), now.getMonth() + Math.round(k), 1); return `${d.getFullYear()}년 ${d.getMonth() + 1}월`; };
    const loan = old * ltv, moveInt = loan * rate * Math.max(move - moveOut, 0) / 12;
    const pay = [];
    let midInt = 0;
    if (share > 0 && split) {
      const mids = [1, 2, 3, 4, 5, 6].map(k => start + (move - start) * k / 7);
      pay.push([start, '계약금 (분담금 10%)', share * 0.1]);
      mids.forEach((t, k) => { pay.push([t, `중도금 ${k + 1}회 (10%)`, share * 0.1]); midInt += share * 0.1 * mrate * (move - t) / 12; });
      pay.push([move, '잔금 (30%)', share * 0.3]);
    } else if (share > 0) pay.push([move, '분담금 한 번에', share]);
    else pay.push([move, '환급금 받기', share]);
    if (loan) pay.push([move, '이주비 대출 갚기', loan]);
    const acq = share > 0 ? share * 0.0316 : 0; // 원조합원 추가 건축분 원시취득 2.8% + 지방교육세·농특세 어림
    if (acq) pay.push([move + 1, '취득세 어림 (분담금의 약 3.16%)', acq]);
    const years = {}; pay.forEach(([t, , v]) => { const y = new Date(now.getFullYear(), now.getMonth() + Math.round(t), 1).getFullYear(); years[y] = (years[y] || 0) + v; });
    const t3 = `<ol class="rdr-time">${mark.map(([k, t]) => `<li${k === '입주' ? ' class="end"' : ''}><b>${k}</b><span>${ym(t)} 무렵</span></li>`).join('')}</ol>
      <table class="rdc-tbl"><thead><tr><th>언제</th><th>무엇</th><th>금액</th></tr></thead><tbody>${pay.sort((a, b) => a[0] - b[0]).map(([t, k, v]) => `<tr><td>${ym(t)}</td><td>${k}</td><td class="${v < 0 ? 'rdc-plus' : ''}">${eok(v)}</td></tr>`).join('')}</tbody></table>
      <div class="rows">${Object.entries(years).map(([y, v]) => `<div><span>${y}년에 나가는 돈</span><b>${eok(v)}</b></div>`).join('')}
        <div><span>이주비 이자 (이주 ${ym(moveOut)}부터 ${Math.max(Math.round(move - moveOut), 0)}개월)</span><b>${eok(moveInt)}</b></div>
        ${midInt ? `<div><span>중도금 대출 이자 (입주 때 한 번에 내는 경우)</span><b>${eok(midInt)}</b></div>` : ''}</div>
      <p class="rdc-note">날짜는 지금 단계(${esc(P[Math.min(at, 7)])})에서 서울 ${kind} 구역들이 보통 걸린 기간으로 어림했어요. 공사 기간은 위에서 바꿀 수 있어요.</p>`;
    // ④ 입주 후 따져 보기
    const market = num(val('rdr-market')) || price * 1.3, yrs = Math.max(move / 12, 0.5);
    const inv = old + Math.max(share, 0) + moveInt + midInt + acq + Math.min(share, 0), gain = market - inv, cagr = inv > 0 ? Math.pow(market / inv, 1 / yrs) - 1 : 0;
    const t4 = `<div class="rows">
        <div><span>원래 집 (종전자산)</span><b>${eok(old)}</b></div>
        <div><span>${share >= 0 ? '+ 분담금' : '− 환급금'}</span><b>${eok(Math.abs(share))}</b></div>
        <div><span>+ 이자 (이주비·중도금)</span><b>${eok(moveInt + midInt)}</b></div>
        ${acq ? `<div><span>+ 취득세 어림</span><b>${eok(acq)}</b></div>` : ''}
        <div class="sum"><span>모두 들어간 돈</span><b>${eok(inv)}</b></div>
        <div><span>입주 뒤 예상 시세${num(val('rdr-market')) ? '' : ' (분양가 × 1.3 어림)'}</span><b>${eok(market)}</b></div>
        <div class="sum"><span>예상 차익</span><b class="${gain >= 0 ? 'rdc-plus' : 'rdr-minus'}">${eok(gain)}</b></div>
        <div><span>1년에 몇 %씩 불어난 셈 (약 ${yrs.toFixed(1)}년)</span><b>${(cagr * 100).toFixed(1)}%</b></div></div>
      <p class="rdc-note">같은 돈을 예금(연 3%)에 넣었다면 ${eok(old * Math.pow(1.03, yrs) - old)} 이자가 생겨요. 보유세·양도세는 빼고 계산했어요.</p>`;
    // ⑤ 지금 단계 할 일
    const TODO = [
      ['구역 지정', ['추진위원회 동의서는 내용(사업 방식·비용 분담)을 꼭 읽고 내요', '내 집 공시가격을 확인해 종전자산을 미리 어림해 두세요']],
      ['추진위', ['조합 설립 동의율(재건축 75%, 재개발 75%)이 모이는지 지켜봐요', '이 시기 매수는 조합원 자격(투기과열지구 양도 제한)을 꼭 확인하세요']],
      ['조합 설립', ['시공사 선정 총회에서 공사비(평당)와 사업 조건을 비교해요', '조합 설립 뒤 투기과열지구 재건축은 집을 팔면 산 사람이 조합원이 못 될 수 있어요']],
      ['건축심의', ['세대수·평형 구성이 바뀌는지 확인해요 (원하는 평형을 받을 수 있는지)', '공사비 인상 협상 소식이 나오면 ②번 표로 영향을 따져 보세요']],
      ['사업시행인가', ['분양신청 기간을 놓치면 현금청산 대상이 돼요. 꼭 기간 안에 신청하세요', '감정평가 결과(종전자산)가 나오면 위 계산기에 넣고 다시 보세요']],
      ['관리처분인가', ['조합원 분양가와 비례율이 확정돼요. 위 숫자를 확정값으로 바꾸세요', '이주비 대출 조건(금리·한도)을 확인하고 이사 갈 집을 알아봐요']],
      ['착공', ['분양계약과 계약금·중도금 일정을 확인해요', '중도금 대출 이자가 후불인지 확인해요']],
      ['입주', ['잔금·이주비 상환·취득세를 준비해요', '입주 뒤 조합 청산금이 나올 수 있어요']]];
    const t5 = `<ul class="rdr-todo">${TODO.slice(Math.min(at, 7), Math.min(at, 7) + 2).map(([k, a], i) => `<li><b>${i ? '다음' : '지금'} · ${k}</b>${a.map(x => `<span>${x}</span>`).join('')}</li>`).join('')}</ul>`;
    return { head: `<div class="rdr-sum"><div><small>예상 ${share >= 0 ? '분담금' : '환급금'}</small><b>${eok(Math.abs(share))}</b></div><div><small>좋을 때 ~ 나쁠 때</small><b>${eok(best)} ~ ${eok(worst)}</b></div><div><small>입주 예상</small><b>${ym(move)}</b></div></div>`,
      body: `<h3>① 분담금 경우의 수</h3><p class="rdc-note">비례율이 낮아지거나, 공사비가 올라 조합원 분양가가 오르면 분담금이 늘어요.</p>${t1}
        <h3>② 공사비가 오르면</h3>${t2}<h3>③ 돈 나가는 시간표</h3>${t3}<h3>④ 입주 후 따져 보기</h3>${t4}<h3>⑤ 지금 단계에서 할 일</h3>${t5}` };
  }

  function draw() {
    const c = window.donsemRdc;
    const box = $('rdr-out');
    if (!c || !c.old || !c.price || !c.ratio) { box.innerHTML = '<p class="rdc-wait">위 계산기에 종전자산·비례율·조합원 분양가를 넣으면 리포트가 만들어져요.</p>'; return; }
    const r = report(c), z = c.zone;
    const title = `<p class="rdr-for">${z ? `<b>${esc(z.short)}</b> ${esc(z.gu)} · ${esc(z.kind)}` : '<b>내 집</b> 구역을 고르면 일정이 더 정확해져요'} · ${new Date().toLocaleDateString('ko-KR')} 기준</p>`;
    if (unlocked()) {
      box.innerHTML = title + r.head + r.body + `<div class="rdc-acts"><button type="button" class="btn fill" id="rdr-print">PDF로 저장</button></div><p class="rdc-note">입력한 숫자로 계산한 추정치예요. 실제 금액은 관리처분계획과 조합 공고로 정해져요.</p>`;
    } else {
      box.innerHTML = title + r.head + `<div class="rdr-lock"><div class="rdr-blur" aria-hidden="true">${r.body.replace(/>([^<]*)</g, (m, t) => '>' + t.replace(/[0-9]/g, '●') + '<')}</div>
        <div class="rdr-cta"><b>🔒 맞춤 리포트 열기</b><span>경우의 수 표, 공사비가 오를 때 더 내는 돈, 연도별로 나가는 돈, 입주 후 차익, 지금 단계 할 일까지 내 숫자로 보여 드려요.</span>
          <a class="btn fill wide" href="/shop/pay/?p=redev1y">1년 이용권 9,900원</a>
          <small>한 번 결제 · 자동 갱신 없음 · 7일 안 전액 환불 · 위 「조합원 플러스」나 돈셈 Pro 이용권이 있으면 바로 열려요</small>
          <button type="button" class="btn line" id="rdr-load">다른 기기에서 산 이용권 불러오기</button></div></div>`;
    }
  }

  root.innerHTML = `<h2>내 구역 맞춤 리포트 <span class="rdr-badge">유료</span></h2>
    <p class="sub small">위 계산기 숫자로 분담금이 얼마나 달라질 수 있는지, 언제 얼마가 나가는지, 입주하면 남는지 한 번에 정리해요.</p>
    ${form()}<div id="rdr-out"></div>`;
  F.forEach(([id, d]) => { const e = $(id); if (!e) return; e.value = saved[id] != null && saved[id] !== '' ? saved[id] : d; e.addEventListener('input', () => { saved[id] = e.value; wr(IN, saved); draw(); }); e.addEventListener('change', () => { saved[id] = e.value; wr(IN, saved); draw(); }); });
  if (saved['rdr-tot-sale']) $('rdr-totbox').open = true;
  root.addEventListener('click', e => {
    if (e.target.closest('#rdr-print')) { document.body.classList.add('rdr-printing'); setTimeout(() => { window.print(); document.body.classList.remove('rdr-printing'); }, 50); }
    if (e.target.closest('#rdr-load')) {
      const orderId = (prompt('주문번호를 넣어 주세요') || '').trim(); if (!orderId) return;
      const email = (prompt('결제할 때 쓴 이메일을 넣어 주세요') || '').trim(); if (!email) return;
      fetch(API + '/pay/find', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, email }) }).then(r => r.json()).then(j => {
        if (!j.ok) return say(j.message || '주문을 찾지 못했어요.');
        if (!['redev1y', 'pro1y', 'redevplus1y'].includes(j.product)) return say('재건축 리포트 이용권 주문이 아니에요.');
        wr({ pro1y: PRO, redevplus1y: PLUS }[j.product] || PASS, { token: j.token, orderId: j.orderId, live: j.live, t: j.created });
        return check().then(() => { say(okPass() ? '이용권을 불러왔어요 ✨' : '환불했거나 기간이 끝난 이용권이에요.'); draw(); });
      }).catch(() => say('잠시 뒤 다시 해 주세요.'));
    }
  });
  document.addEventListener('rdc:calc', draw);
  draw(); check().then(draw);
})();
