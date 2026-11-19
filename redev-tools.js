// 돈셈 재건축·재개발 조합원 도우미 (/redev/): 내 구역 고르기 → 분담금 계산 → 내 구역 저장·일정 알림
// 분담금 = 조합원 분양가 − 권리가액, 권리가액 = 종전자산 평가액 × 비례율 (추정치예요. 실제 금액은 관리처분계획에서 정해져요)
(() => {
  const root = document.getElementById('rdc');
  if (!root) return;
  const KEY = 'donsem:redev-my', KAKAO_KEY = '659255150dcc2175d56e029a25d0d460';
  // 구역별로 확인된 숫자 (조합·서울시 고시·보도로 확인한 것만 넣어요. 모르면 비워 두면 사용자가 직접 넣어요)
  // ratio: 비례율(%), price84: 전용 84㎡ 조합원 분양가(원), src: 출처
  const PRESET = {};
  // 구역별 다가오는 일정 (확인된 것만). [날짜, 내용]
  const EVENTS = {
    ss2: [['2026-11-21', '시공사 선정 총회 (DL이앤씨 우선협상)']],
  };
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const num = s => Number(String(s || '').replace(/[^0-9.-]/g, '')) || 0;
  const won = n => (n < 0 ? '-' : '') + Math.round(Math.abs(n)).toLocaleString('ko-KR') + '원';
  const eok = n => { const a = Math.abs(n), s = n < 0 ? '-' : ''; if (a >= 1e8) { const e = Math.floor(a / 1e8), m = Math.round((a % 1e8) / 1e4); return `${s}${e}억${m ? ' ' + m.toLocaleString('ko-KR') + '만' : ''} 원`; } return `${s}${Math.round(a / 1e4).toLocaleString('ko-KR')}만 원`; };
  const norm = s => String(s || '').replace(/[\s·()\-]/g, '').toLowerCase();
  const read = () => { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } };
  const write = v => { try { v ? localStorage.setItem(KEY, JSON.stringify(v)) : localStorage.removeItem(KEY); } catch (e) { /* 저장이 막힌 기기 */ } };
  const say = m => { if (typeof toast === 'function') toast(m); };
  const dday = d => { const k = new Date(Date.now() + 9 * 3600e3), t = Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()); return Math.round((Date.parse(d + 'T00:00:00Z') - t) / 864e5); };

  // 구역 정보표의 작은 지도는 카카오 지도를 써요 (부동산 화면이 아니라서 여기서 불러요)
  if (!window.kakao) { const sc = document.createElement('script'); sc.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`; sc.onload = () => window.kakao && kakao.maps.load(() => {}); document.head.append(sc); }

  let zones = [], zone = null;
  const D = () => window.donsemRedevData;
  // 구역 목록: 직접 확인한 주요 구역 + 서울시 전체 구역
  const loadZones = () => {
    const d = D(); if (!d) return Promise.resolve([]);
    return d.loadAll().then(rows => {
      const byCode = new Map(rows.map(r => [r[0], r]));
      const cur = d.RD.filter(x => x.g !== '' || x.kind !== '복합개발').filter(x => x.kind !== '복합개발').map(x => {
        const r = byCode.get(d.CODE[x.id]);
        return { id: x.id, name: x.brand ? `${x.brand} (${x.name})` : x.name, short: x.brand || x.name, kind: x.kind, gu: (x.addrText.match(/서울특별시 (\S+구)/) || [])[1] || '', stage: x.stage, step: d.STEPS[x.at], curated: true, before: r ? r[7] : 0, units: r ? r[8] : 0, q: norm([x.name, x.brand, x.short, x.addrText, (x.keys || []).join('')].join('')) };
      });
      const have = new Set(Object.values(d.CODE));
      const pub = rows.filter(r => !have.has(r[0])).map(r => ({ id: 'c' + r[0], name: r[2], short: r[2], kind: /재개발/.test(r[5]) ? '재개발' : '재건축', gu: r[1], stage: d.stepOf(r), step: d.stepOf(r), curated: false, before: r[7], units: r[8], q: norm([r[1], r[2], r[3], r[4]].join('')) }));
      zones = [...cur, ...pub];
      return zones;
    }).catch(() => []);
  };

  // ── 구역 고르기 ──
  const q = $('rdc-q'), sug = $('rdc-sug');
  const drawSug = () => {
    const t = norm(q.value);
    if (!t) { sug.hidden = true; return; }
    const hit = zones.filter(z => z.q.includes(t)).sort((a, b) => (b.curated - a.curated) || (b.units - a.units)).slice(0, 8);
    sug.innerHTML = hit.length ? hit.map(z => `<li><button type="button" data-z="${esc(z.id)}"><b>${esc(z.short)}</b><small>${esc(z.gu)} · ${z.kind} · ${esc(z.step || '')}${z.units ? ` · ${Number(z.units).toLocaleString('ko-KR')}세대` : ''}</small></button></li>`).join('') : '<li class="rdc-none">찾는 구역이 없어요. 동네 이름으로 찾아보세요 (예: 성수, 압구정, 상계)</li>';
    sug.hidden = false;
  };
  q.addEventListener('input', drawSug);
  q.addEventListener('focus', () => { if (!zones.length) loadZones().then(drawSug); else drawSug(); });
  sug.addEventListener('click', e => { const b = e.target.closest('[data-z]'); if (!b) return; pick(b.dataset.z); });
  document.addEventListener('click', e => { if (!root.contains(e.target)) sug.hidden = true; });

  function pick(id, keepInputs) {
    zone = zones.find(z => z.id === id) || null;
    sug.hidden = true;
    if (!zone) return;
    q.value = zone.short;
    $('rdc-zone').hidden = false;
    $('rdc-zone-name').textContent = zone.short;
    $('rdc-zone-sub').textContent = `${zone.gu} · ${zone.kind} · 지금 단계: ${zone.stage || zone.step || '확인 중'}`;
    const p = PRESET[zone.id];
    if (!keepInputs) {
      if (p && p.ratio) $('rdc-ratio').value = p.ratio;
      if (p && p.price84) $('rdc-new').value = Number(p.price84).toLocaleString('ko-KR');
    }
    $('rdc-preset').textContent = p ? `이 구역은 확인된 숫자(${[p.ratio && '비례율', p.price84 && '84㎡ 조합원 분양가'].filter(Boolean).join('·')})를 미리 넣었어요. 출처: ${p.src || '조합 자료'}` : '이 구역의 비례율과 조합원 분양가는 아직 공개되지 않았어요. 조합 공지에 나온 숫자가 있으면 넣고, 없으면 예시 값으로 먼저 감을 잡아 보세요.';
    calc();
  }

  // ── 분담금 계산 ──
  const ids = ['rdc-old', 'rdc-ratio', 'rdc-new', 'rdc-ltv', 'rdc-rate', 'rdc-months'];
  ids.forEach(i => $(i).addEventListener('input', calc));
  $('rdc-est').addEventListener('click', () => {
    const v = num($('rdc-pub').value);
    if (!v) return say('공시가격을 먼저 넣어 주세요.');
    $('rdc-old').value = Math.round(v * 1.3 / 1e6) * 1e6 > 0 ? (Math.round(v * 1.3 / 1e6) * 1e6).toLocaleString('ko-KR') : '';
    calc();
  });
  function calc() {
    const old = num($('rdc-old').value), ratio = num($('rdc-ratio').value) / 100, price = num($('rdc-new').value);
    const ltv = num($('rdc-ltv').value) / 100, rate = num($('rdc-rate').value) / 100, months = num($('rdc-months').value);
    const out = $('rdc-out');
    if (!old || !price || !ratio) { out.innerHTML = '<p class="rdc-wait">종전자산 평가액, 비례율, 조합원 분양가를 넣으면 계산돼요.</p>'; return; }
    const right = old * ratio, share = price - right;
    const loan = old * ltv, interest = loan * rate * months / 12;
    const at = r => price - old * r;
    const rows = [[ratio - 0.1, '비례율 10%p 낮으면'], [ratio, '지금 넣은 비례율'], [ratio + 0.1, '비례율 10%p 높으면']];
    out.innerHTML = `<div>${share >= 0 ? '추가로 낼 돈 (분담금)' : '돌려받을 돈 (환급금)'}</div><div class="big">${eok(Math.abs(share))}</div>
      <div class="rows">
        <div><span>권리가액 (종전자산 × 비례율)</span><b>${won(right)}</b></div>
        <div><span>조합원 분양가</span><b>${won(price)}</b></div>
        <div><span>${share >= 0 ? '분담금' : '환급금'}</span><b>${won(Math.abs(share))}</b></div>
      </div>
      <h4 class="rdc-h4">비례율이 바뀌면</h4>
      <table class="rdc-tbl"><thead><tr><th>경우</th><th>비례율</th><th>분담금</th></tr></thead><tbody>${rows.map(([r, t], i) => `<tr${i === 1 ? ' class="on"' : ''}><td>${t}</td><td>${Math.round(r * 100)}%</td><td class="${at(r) < 0 ? 'rdc-plus' : ''}">${at(r) >= 0 ? eok(at(r)) : '환급 ' + eok(-at(r))}</td></tr>`).join('')}</tbody></table>
      <h4 class="rdc-h4">이주부터 입주까지</h4>
      <div class="rows">
        <div><span>이주비 대출 (종전자산의 ${Math.round(ltv * 100)}%)</span><b>${won(loan)}</b></div>
        <div><span>이자 (연 ${(rate * 100).toFixed(1)}% · ${months}개월)</span><b>${won(interest)}</b></div>
        <div><span>입주 때까지 준비할 돈 (분담금 + 이자)</span><b>${won(Math.max(share, 0) + interest)}</b></div>
      </div>
      <p class="rdc-note">이주비는 입주할 때 갚아야 해요. 새 아파트 취득세는 <a href="/acquisition-tax/">취득세 계산기</a>로 따로 볼 수 있어요.</p>
      <div class="rdc-acts"><button type="button" class="btn fill" id="rdc-save">${read() && zone && read().id === zone.id ? '내 구역 숫자 고쳐 저장' : '내 구역으로 저장'}</button>${zone ? `<button type="button" class="btn" data-rd="${esc(zone.id)}">구역 정보표 보기</button>` : ''}</div>`;
  }
  root.addEventListener('click', e => {
    if (e.target.closest('#rdc-save')) save();
    if (e.target.closest('#rdc-del')) { write(null); drawMy(); calc(); say('내 구역을 지웠어요.'); }
    if (e.target.closest('#rdc-edit')) { $('rdc-calc').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });

  // ── 내 구역 저장 + 일정 ──
  function save() {
    if (!zone) return say('위에서 내 구역을 먼저 골라 주세요.');
    const v = { id: zone.id, name: zone.short, kind: zone.kind, gu: zone.gu, at: Date.now(), inputs: Object.fromEntries(ids.map(i => [i, $(i).value])), events: (EVENTS[zone.id] || []).map(([d, t]) => ({ d, t })) };
    write(v); drawMy(); calc(); say('내 구역으로 저장했어요. 일정이 다가오면 알림함에서 알려 드려요.');
  }
  function drawMy() {
    const box = $('rdc-my'), m = read();
    if (!m) { box.hidden = true; return; }
    box.hidden = false;
    if (EVENTS[m.id]) { const ev = EVENTS[m.id].map(([d, t]) => ({ d, t })); if (JSON.stringify(ev) !== JSON.stringify(m.events)) { m.events = ev; write(m); } } // 새 일정이 생기면 저장해 둔 것도 바꿔요 (알림함이 이걸 읽어요)
    const evs = (m.events || []).filter(e => dday(e.d) >= 0).sort((a, b) => a.d.localeCompare(b.d));
    const i = m.inputs || {}, old = num(i['rdc-old']), price = num(i['rdc-new']), ratio = num(i['rdc-ratio']) / 100, share = old && price && ratio ? price - old * ratio : null;
    box.innerHTML = `<div class="rdc-myh"><span class="rdc-tag">내 구역</span><b>${esc(m.name)}</b><small>${esc(m.gu)} · ${esc(m.kind)}</small></div>
      ${share != null ? `<p class="rdc-mysum">${share >= 0 ? '예상 분담금' : '예상 환급금'} <b>${eok(Math.abs(share))}</b> <small>(비례율 ${Math.round(ratio * 100)}% 기준)</small></p>` : ''}
      <ul class="rdc-ev">${evs.length ? evs.map(e => { const n = dday(e.d); return `<li><em class="${n <= 7 ? 'hot' : ''}">${n ? 'D-' + n : 'D-DAY'}</em><span>${esc(e.d.slice(5).replace('-', '/'))} ${esc(e.t)}</span></li>`; }).join('') : '<li class="rdc-none">아직 확인된 다음 일정이 없어요. 총회·인가 일정이 나오면 여기에 띄워 드려요.</li>'}</ul>
      <div class="rdc-acts"><button type="button" class="btn" data-rd="${esc(m.id)}">정보표 보기</button><button type="button" class="btn" id="rdc-edit">숫자 고치기</button><button type="button" class="btn ghost" id="rdc-del">지우기</button></div>`;
  }

  // 처음 열 때: 저장된 내 구역이 있으면 그 숫자로, ?z=구역 으로 왔으면 그 구역으로
  const m = read(), qz = new URLSearchParams(location.search).get('z');
  if (m && m.inputs) Object.entries(m.inputs).forEach(([k, v]) => { if ($(k) && v) $(k).value = v; });
  drawMy(); calc();
  const start = () => loadZones().then(() => { const id = qz || (m && m.id); if (id) pick(id, !!(m && m.id === id && !qz)); });
  D() ? start() : addEventListener('load', start);
})();
