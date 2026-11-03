// 돈셈 부동산: 서울 지도에 내 관심 부동산을 핀으로 꽂고, 취득세·중개수수료·대출까지 바로 계산해요 (네이버페이 부동산 '관심 부동산'처럼)
// 지도는 OpenStreetMap(Leaflet), 주소 찾기는 OpenStreetMap Nominatim을 써요. 관심 부동산은 이 기기에만 저장해요(donsem:homes)
(() => {
  const mapEl = document.getElementById('re-map');
  if (!mapEl) return;
  const KEY = 'donsem:homes', $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const GU = ['강남구', '강동구', '강북구', '강서구', '관악구', '광진구', '구로구', '금천구', '노원구', '도봉구', '동대문구', '동작구', '마포구', '서대문구', '서초구', '성동구', '성북구', '송파구', '양천구', '영등포구', '용산구', '은평구', '종로구', '중구', '중랑구'];
  const KIND = { buy: '매매', jeonse: '전세', rent: '월세' };
  // 법정동 시군구 코드 (국토교통부 실거래가 자료를 찾을 때 써요)
  const LAWD = { 종로구: 11110, 중구: 11140, 용산구: 11170, 성동구: 11200, 광진구: 11215, 동대문구: 11230, 중랑구: 11260, 성북구: 11290, 강북구: 11305, 도봉구: 11320, 노원구: 11350, 은평구: 11380, 서대문구: 11410, 마포구: 11440, 양천구: 11470, 강서구: 11500, 구로구: 11530, 금천구: 11545, 영등포구: 11560, 동작구: 11590, 관악구: 11620, 서초구: 11650, 강남구: 11680, 송파구: 11710, 강동구: 11740 };
  const API = 'https://donsem-counter.hjjung330.workers.dev/apt';
  const load = () => { try { const d = JSON.parse(localStorage.getItem(KEY)); return d && Array.isArray(d.items) ? d.items : []; } catch (e) { return []; } };
  let items = load(), map = null, layer = null, pending = null, kind = 'buy';
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ items })); } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); } };
  const man = n => (n >= 1e8 ? `${Math.floor(n / 1e8)}억${n % 1e8 >= 1e4 ? ` ${Math.round(n % 1e8 / 1e4).toLocaleString('ko-KR')}만` : ''}` : `${Math.round(n / 1e4).toLocaleString('ko-KR')}만`) + ' 원';
  const priceText = x => x.kind === 'rent' ? `보증금 ${man(x.price)} · 월 ${man(x.rent || 0)}` : `${KIND[x.kind]} ${man(x.price)}`;
  const naverAt = (lat, lng) => `https://new.land.naver.com/complexes?ms=${lat.toFixed(5)},${lng.toFixed(5)},17`;

  // ── 지도 불러오기 (Leaflet은 필요할 때만 받아요) ──
  function loadLeaflet() {
    if (window.L) return Promise.resolve();
    return new Promise((ok, no) => {
      const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css'; document.head.append(css);
      const js = document.createElement('script'); js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js'; js.onload = ok; js.onerror = no; document.head.append(js);
    });
  }
  loadLeaflet().then(() => {
    map = L.map(mapEl, { zoomControl: true, attributionControl: true }).setView([37.5665, 126.978], 11);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap' }).addTo(map);
    layer = L.layerGroup().addTo(map);
    map.on('click', e => openForm({ name: '', lat: e.latlng.lat, lng: e.latlng.lng }));
    draw();
    if (items.length) map.fitBounds(L.latLngBounds(items.map(x => [x.lat, x.lng])).pad(0.3), { maxZoom: 15 });
  }).catch(() => { mapEl.innerHTML = '<p class="re-off">지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'; });

  // ── 핀과 목록 ──
  const pinIcon = x => L.divIcon({ className: 're-pin', html: `<span class="k-${x.kind}">${esc(x.kind === 'rent' ? '월' : x.kind === 'jeonse' ? '전' : '매')}</span><b>${esc(man(x.price).replace(' 원', ''))}</b>`, iconSize: null });
  function draw() {
    if (layer) { layer.clearLayers(); items.forEach(x => L.marker([x.lat, x.lng], { icon: pinIcon(x) }).addTo(layer).on('click', () => focus(x.id))); }
    $('re-list').innerHTML = items.length ? items.map(x => `<li class="re-item" id="re-${x.id}"><div class="re-top"><b>${esc(x.name || '내가 고른 곳')}</b><button type="button" class="re-del" data-del="${x.id}" aria-label="지우기">×</button></div>
      <p class="re-price">${priceText(x)}</p>${x.memo ? `<p class="re-memo">${esc(x.memo)}</p>` : ''}
      <div class="re-acts">${x.kind === 'buy' ? `<a href="/acquisition-tax/?at_price=${x.price}">취득세</a>` : ''}<a href="/brokerage-fee/?bf_kind=${x.kind}&bf_amt=${x.price}${x.kind === 'rent' ? `&bf_rent=${x.rent || 0}` : ''}">중개수수료</a>${x.kind === 'buy' ? '<a href="/loan/">대출 이자</a>' : '<a href="/rent/">전월세 전환</a>'}<a href="${naverAt(x.lat, x.lng)}" target="_blank" rel="noopener">이 근처 시세 ↗</a><button type="button" data-go="${x.id}">지도에서 보기</button></div></li>`).join('')
      : '<li class="re-empty">아직 관심 부동산이 없어요. 위에서 아파트 이름이나 주소를 찾거나, 지도를 눌러 핀을 꽂아 보세요.</li>';
    $('re-count').textContent = items.length ? `${items.length}곳` : '';
  }
  function focus(id) {
    const x = items.find(i => i.id === id); if (!x) return;
    if (map) map.setView([x.lat, x.lng], 16);
    const el = $('re-' + id); if (el) { el.classList.add('hl'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); setTimeout(() => el.classList.remove('hl'), 1400); }
  }

  // ── 주소·아파트 찾기 ──
  async function search(q) {
    const box = $('re-results');
    if (!q.trim()) return;
    box.innerHTML = '<li class="re-empty">찾는 중…</li>';
    try {
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=6&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
      const list = await r.json();
      box.innerHTML = list.length ? list.map((p, i) => `<li><button type="button" data-pick="${i}"><b>${esc(p.name || p.display_name.split(',')[0])}</b><small>${esc(p.display_name)}</small></button></li>`).join('')
        : '<li class="re-empty">찾지 못했어요. "서울 송파구 잠실동"처럼 동네 이름으로 찾거나, 지도를 직접 눌러 보세요.</li>';
      box.onclick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; const p = list[+b.dataset.pick]; box.innerHTML = ''; if (map) map.setView([+p.lat, +p.lon], 16); openForm({ name: p.name || p.display_name.split(',')[0], lat: +p.lat, lng: +p.lon }); };
    } catch (e) { box.innerHTML = '<li class="re-empty">지금은 찾기가 안 돼요. 지도를 직접 눌러 핀을 꽂아 보세요.</li>'; }
  }
  $('re-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(e.target.value); } });
  $('re-go').addEventListener('click', () => search($('re-q').value));

  // ── 서울 25개 구 바로가기 ──
  $('re-gu').innerHTML = GU.map(g => `<button type="button" data-gu="${g}">${g}</button>`).join('');
  $('re-gu').addEventListener('click', async e => {
    const b = e.target.closest('[data-gu]'); if (!b || !map) return;
    let c = null; try { c = JSON.parse(localStorage.getItem('donsem:gu:' + b.dataset.gu)); } catch (err) { c = null; }
    if (!c) { try { const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&accept-language=ko&q=${encodeURIComponent('서울특별시 ' + b.dataset.gu)}`); const p = (await r.json())[0]; if (p) { c = [+p.lat, +p.lon]; try { localStorage.setItem('donsem:gu:' + b.dataset.gu, JSON.stringify(c)); } catch (err) { /* 괜찮아요 */ } } } catch (err) { c = null; } }
    if (c) map.setView(c, 14); else toast('지금은 그 구로 이동하지 못했어요.');
    $('re-gu').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('re-near').href = c ? naverAt(c[0], c[1]) : '#';
    $('re-near').hidden = !c; $('re-near').textContent = `${b.dataset.gu} 아파트 시세 보기 (네이버 부동산) ↗`;
    deals(b.dataset.gu);
  });

  // ── 구별 최근 실거래가 (국토교통부 공공데이터, 돈셈 카운터 워커가 받아 와요) ──
  let dealGu = '', dealType = 'trade', dealSize = 'all', dealData = { trade: null, rent: null };
  const yms = () => { const n = new Date(), a = []; for (let i = 0; i < 2; i++) { const d = new Date(n.getFullYear(), n.getMonth() - i, 1); a.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`); } return a; };
  const eok = v => { const e = Math.floor(v / 10000), r = v % 10000; return e ? `${e}억${r ? ` ${r.toLocaleString('ko-KR')}` : ''}` : `${v.toLocaleString('ko-KR')}만`; }; // v는 만 원
  const SIZE = { all: ['전체', () => true], s: ['59㎡ 안팎', a => a >= 50 && a < 70], m: ['84㎡ 안팎', a => a >= 76 && a < 90], l: ['100㎡ 이상', a => a >= 100] };
  async function loadDeals(type) {
    const list = await Promise.all(yms().map(ym => fetch(`${API}?lawd=${LAWD[dealGu]}&ym=${ym}${type === 'rent' ? '&type=rent' : ''}`).then(r => r.ok ? r.json() : null).catch(() => null)));
    if (list.every(x => !x)) return null;
    return list.filter(Boolean).flatMap(x => x.items).sort((a, b) => (b.y * 1e4 + b.m * 100 + b.d) - (a.y * 1e4 + a.m * 100 + a.d));
  }
  async function deals(gu) {
    if (!LAWD[gu]) return;
    dealGu = gu; dealData = { trade: null, rent: null };
    const box = $('re-deals'); box.hidden = false;
    box.innerHTML = `<p class="re-empty">${gu} 실거래가를 불러오는 중…</p>`;
    dealData.trade = await loadDeals('trade');
    drawDeals();
  }
  function drawDeals() {
    const box = $('re-deals'), all = dealData[dealType];
    if (!all) { box.innerHTML = `<p class="re-empty">지금은 실거래가를 불러오지 못했어요. 잠시 뒤 다시 눌러 주세요.</p>`; return; }
    const list = all.filter(x => SIZE[dealSize][1](x.area) && (dealType === 'trade' || (x.rent ? 1 : 0) === (dealType === 'rent' ? (dealRentMode === 'wol' ? 1 : 0) : 0)));
    const prices = list.map(x => x.amt).sort((a, b) => a - b), mid = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
    const label = dealType === 'trade' ? '매매' : dealRentMode === 'wol' ? '월세' : '전세';
    box.innerHTML = `<div class="dl-h"><b>${dealGu} 최근 실거래</b><small>국토교통부 · 최근 2달 · 신고 기준</small></div>
      <div class="dl-tabs"><button type="button" class="${dealType === 'trade' ? 'on' : ''}" data-dt="trade">매매</button><button type="button" class="${dealType === 'rent' && dealRentMode !== 'wol' ? 'on' : ''}" data-dt="jeon">전세</button><button type="button" class="${dealType === 'rent' && dealRentMode === 'wol' ? 'on' : ''}" data-dt="wol">월세</button></div>
      <div class="dl-size">${Object.entries(SIZE).map(([k, [n]]) => `<button type="button" class="${dealSize === k ? 'on' : ''}" data-ds="${k}">${n}</button>`).join('')}</div>
      ${list.length ? `<p class="dl-sum">${label} <b>${list.length.toLocaleString('ko-KR')}건</b> · 가운데 값 <b>${eok(mid)}${dealType === 'trade' ? '' : ''}</b>${dealType === 'trade' ? ` · 가장 비싼 거래 <b>${eok(prices[prices.length - 1])}</b>` : ''}</p>
      <ul class="dl-list">${list.slice(0, 30).map((x, i) => `<li><button type="button" data-di="${all.indexOf(x)}"><span><b>${esc(x.apt)}</b><small>${esc(x.dong)} · 전용 ${Math.round(x.area)}㎡ · ${x.floor}층 · ${x.built}년</small></span><em>${eok(x.amt)}${x.rent ? ` / 월 ${x.rent}만` : ''}<small>${x.m}.${x.d}</small></em></button></li>`).join('')}</ul>
      ${list.length > 30 ? `<p class="re-tip">최근 30건만 보여 드려요. 전체는 <a href="https://rt.molit.go.kr/" target="_blank" rel="noopener">국토부 실거래가 공개시스템 ↗</a>에서 볼 수 있어요.</p>` : ''}`
        : '<p class="re-empty">이 조건의 거래가 아직 없어요. 실거래는 계약 후 30일 안에 신고돼서 이번 달은 적게 보여요.</p>'}`;
  }
  let dealRentMode = 'jeon';
  $('re-deals').addEventListener('click', async e => {
    const t = e.target.closest('[data-dt]'), sz = e.target.closest('[data-ds]'), it = e.target.closest('[data-di]');
    if (t) {
      dealType = t.dataset.dt === 'trade' ? 'trade' : 'rent'; dealRentMode = t.dataset.dt === 'wol' ? 'wol' : 'jeon';
      if (dealType === 'rent' && !dealData.rent) { $('re-deals').querySelector('.dl-sum, .dl-list, .re-empty')?.replaceWith(Object.assign(document.createElement('p'), { className: 're-empty', textContent: '전월세 실거래를 불러오는 중…' })); dealData.rent = await loadDeals('rent'); }
      drawDeals();
    }
    if (sz) { dealSize = sz.dataset.ds; drawDeals(); }
    if (it) { // 누르면 지도에서 그 단지를 찾아 보여 주고, 관심 부동산에 넣을 수 있게 해요
      const x = dealData[dealType][+it.dataset.di];
      try {
        const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(`서울특별시 ${dealGu} ${x.dong} ${x.apt}`)}`);
        let p = (await r.json())[0];
        if (!p) { const r2 = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(`서울특별시 ${dealGu} ${x.dong}`)}`); p = (await r2.json())[0]; }
        if (p && map) { map.setView([+p.lat, +p.lon], 16); mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (p) {
          openForm({ name: `${x.apt} ${Math.round(x.area)}㎡`, lat: +p.lat, lng: +p.lon });
          const k = dealType === 'trade' ? 'buy' : x.rent ? 'rent' : 'jeonse';
          $('re-kind').querySelector(`[data-v="${k}"]`).click();
          $('re-price').value = (x.amt * 10000).toLocaleString('ko-KR'); $('re-rent').value = x.rent ? (x.rent * 10000).toLocaleString('ko-KR') : '';
          $('re-memo').value = `${x.y}.${x.m}.${x.d} 실거래 ${x.floor}층`;
        } else toast('지도에서 위치를 찾지 못했어요.');
      } catch (err) { toast('지금은 위치를 찾지 못했어요.'); }
    }
  });

  // ── 관심 부동산 추가 ──
  function openForm(p) {
    pending = p;
    const f = $('re-form'); f.hidden = false;
    $('re-name').value = p.name || ''; $('re-price').value = ''; $('re-rent').value = ''; $('re-memo').value = '';
    f.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => $('re-name').focus(), 300);
  }
  $('re-kind').addEventListener('click', e => {
    const b = e.target.closest('[data-v]'); if (!b) return;
    kind = b.dataset.v; $('re-kind').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('re-rent-wrap').hidden = kind !== 'rent'; $('re-price-lab').textContent = kind === 'buy' ? '매매가' : '보증금';
  });
  ['re-price', 're-rent'].forEach(id => $(id).addEventListener('input', e => { const d = e.target.value.replace(/[^0-9]/g, '').slice(0, 13); e.target.value = d ? Number(d).toLocaleString('ko-KR') : ''; }));
  $('re-cancel').addEventListener('click', () => { $('re-form').hidden = true; pending = null; });
  $('re-save').addEventListener('click', () => {
    if (!pending) return;
    const price = num($('re-price').value);
    if (!price) { toast(kind === 'buy' ? '매매가를 넣어 주세요.' : '보증금을 넣어 주세요.'); return $('re-price').focus(); }
    items.push({ id: Date.now().toString(36), name: $('re-name').value.trim().slice(0, 40) || '내가 고른 곳', lat: pending.lat, lng: pending.lng, kind, price, rent: kind === 'rent' ? num($('re-rent').value) : 0, memo: $('re-memo').value.trim().slice(0, 60) });
    save(); draw(); $('re-form').hidden = true; pending = null;
    toast('관심 부동산에 넣었어요.');
  });
  $('re-list').addEventListener('click', e => {
    const d = e.target.closest('[data-del]'), g = e.target.closest('[data-go]');
    if (g) { focus(g.dataset.go); mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
    if (d && confirm('이 관심 부동산을 지울까요?')) { items = items.filter(x => x.id !== d.dataset.del); save(); draw(); }
  });
  draw();
})();
