// 돈셈 부동산: 서울 지도에 내 관심 부동산을 핀으로 꽂고, 취득세·중개수수료·대출까지 바로 계산해요 (네이버페이 부동산 '관심 부동산'처럼)
// 지도·장소 찾기·주변 시설은 카카오맵을 써요. 카카오맵이 안 열리면 OpenFreeMap 지도 + Nominatim·Overpass(OpenStreetMap 자료)로 바꿔요
// 관심 부동산은 이 기기에만 저장해요(donsem:homes). 지도를 누르면 네이버지도처럼 전체화면으로 커져요
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
  let items = load(), map = null, marks = [], pending = null, kind = 'buy', full = false, temp = null, poiMarks = [];
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify({ items })); } catch (e) { toast('이 브라우저에서는 저장할 수 없어요.'); } };
  const man = n => (n >= 1e8 ? `${Math.floor(n / 1e8)}억${n % 1e8 >= 1e4 ? ` ${Math.round(n % 1e8 / 1e4).toLocaleString('ko-KR')}만` : ''}` : `${Math.round(n / 1e4).toLocaleString('ko-KR')}만`) + ' 원';
  const priceText = x => x.kind === 'rent' ? `보증금 ${man(x.price)} · 월 ${man(x.rent || 0)}` : `${KIND[x.kind]} ${man(x.price)}`;
  const naverAt = (lat, lng) => `https://new.land.naver.com/complexes?ms=${lat.toFixed(5)},${lng.toFixed(5)},17`;

  // ── 지도 엔진: 카카오맵을 먼저 쓰고, 안 열리면 OpenFreeMap(MapLibre) 지도로 바꿔요 ──
  // 두 엔진 모두 아래 map 모양(fly·fit·bounds·zoom·pin…)으로 다뤄요. 확대 정도는 MapLibre 숫자(클수록 가까이)로 맞춰요
  // 카카오 JavaScript 키는 원래 공개되는 키예요. 카카오 개발자 사이트에 등록한 돈셈 주소에서만 지도가 열려요
  const KAKAO_KEY = '659255150dcc2175d56e029a25d0d460';
  const script = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.append(s); });
  const lv = z => Math.max(1, Math.min(14, Math.round(20 - z))); // MapLibre 확대 → 카카오 레벨(작을수록 가까이)
  const clearPick = () => { if (temp) { temp.remove(); temp = null; } pending = null; $('re-fs-act').hidden = true; $('re-place').hidden = true; };
  const onMapClick = (lat, lng) => {
    if (!full) return enter(); // 작은 지도를 누르면 먼저 크게
    if (temp || !$('re-place').hidden) return clearPick(); // 마크가 있을 때 한 번 더 누르면 사라져요
    temp = map.dot(lat, lng, clearPick);
    pending = { name: '', lat, lng };
    $('re-fs-act').hidden = false;
  };
  function kakaoMap() {
    const wait = new Promise((_, no) => setTimeout(no, 8000));
    return Promise.race([script(`https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_KEY}&autoload=false&libraries=services`).then(() => new Promise(ok => kakao.maps.load(ok))), wait]).then(() => {
      const K = kakao.maps, LL = (a, b) => new K.LatLng(a, b);
      const m = new K.Map(mapEl, { center: LL(37.5565, 126.978), level: 9 });
      m.setCopyrightPosition(K.CopyrightPosition.BOTTOMRIGHT, true); // 카카오 로고가 PC 왼쪽 목록에 가리지 않게
      K.event.addListener(m, 'click', e => onMapClick(e.latLng.getLat(), e.latLng.getLng()));
      return {
        kakao: true,
        fly: (lat, lng, z) => { m.setLevel(lv(z)); m.panTo(LL(lat, lng)); },
        fit: pts => { const b = new K.LatLngBounds(); pts.forEach(p => b.extend(LL(p.lat, p.lng))); m.setBounds(b, 60, 60, 60, 60); if (m.getLevel() < 3) m.setLevel(3); },
        bounds: () => { const b = m.getBounds(), sw = b.getSouthWest(), ne = b.getNorthEast(); return [sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng()]; },
        zoom: () => 20 - m.getLevel(),
        zoomTo: z => m.setLevel(lv(z)),
        zoomBy: d => m.setLevel(m.getLevel() - d, { animate: true }),
        stop: () => {},
        resize: () => { const c = m.getCenter(); m.relayout(); m.setCenter(c); },
        pin: (lat, lng, el) => { const o = new K.CustomOverlay({ position: LL(lat, lng), content: el, clickable: true }); o.setMap(m); return { remove: () => o.setMap(null) }; },
        dot: (lat, lng, onTap) => { const k = new K.Marker({ position: LL(lat, lng) }); k.setMap(m); if (onTap) K.event.addListener(k, 'click', onTap); return { remove: () => k.setMap(null) }; },
      };
    });
  }
  // 카카오맵이 안 열릴 때: OpenFreeMap 벡터 지도 (MapLibre는 이때만 받아요)
  const isDark = () => { const t = document.documentElement.dataset.theme; return t === 'dark' || (t === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches); };
  const STYLE = () => `https://tiles.openfreemap.org/styles/${isDark() ? 'dark' : 'liberty'}`;
  function loadLib() {
    if (window.maplibregl) return Promise.resolve();
    const css = document.createElement('link'); css.rel = 'stylesheet'; css.href = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.css'; document.head.append(css);
    return script('https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl.js');
  }
  // 지명은 한글로 (지도 자료의 name:ko → 없으면 원래 이름)
  const koLabels = m => { try { m.getStyle().layers.forEach(l => { if (l.type === 'symbol' && m.getLayoutProperty(l.id, 'text-field')) m.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name:nonlatin'], ['get', 'name']]); }); } catch (e) { /* 스타일이 아직이면 다음에 */ } };
  const libreMap = () => loadLib().then(() => new Promise(ok => {
    const m = new maplibregl.Map({ container: mapEl, style: STYLE(), center: [126.978, 37.5565], zoom: 10.6, attributionControl: { compact: true }, localIdeographFontFamily: "'Apple SD Gothic Neo', 'Noto Sans KR', 'Malgun Gothic', sans-serif", dragRotate: false, pitchWithRotate: false });
    m.touchZoomRotate.disableRotation();
    const fold = () => mapEl.querySelectorAll('.maplibregl-compact-show').forEach(el => el.classList.remove('maplibregl-compact-show')); /* 출처는 접힌 ⓘ로 */
    m.on('resize', () => setTimeout(fold, 0));
    m.on('click', e => onMapClick(e.lngLat.lat, e.lngLat.lng));
    new MutationObserver(() => { m.setStyle(STYLE()); m.once('styledata', () => setTimeout(() => koLabels(m), 300)); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    m.on('load', () => { koLabels(m); fold(); ok({
      fly: (lat, lng, z) => m.flyTo({ center: [lng, lat], zoom: z, speed: 1.6 }),
      fit: pts => { const b = new maplibregl.LngLatBounds(); pts.forEach(p => b.extend([p.lng, p.lat])); m.fitBounds(b, { padding: 60, maxZoom: 15, duration: 0 }); },
      bounds: () => { const b = m.getBounds(); return [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()]; },
      zoom: () => m.getZoom(),
      zoomTo: z => m.jumpTo({ zoom: z }),
      zoomBy: d => m.easeTo({ zoom: m.getZoom() + d }),
      stop: () => m.stop(),
      resize: () => m.resize(),
      pin: (lat, lng, el) => new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(m),
      dot: (lat, lng, onTap) => { const k = new maplibregl.Marker({ color: '#ff3b30' }).setLngLat([lng, lat]).addTo(m); if (onTap) k.getElement().addEventListener('click', ev => { ev.stopPropagation(); onTap(); }); return k; },
    }); });
  }));
  kakaoMap().catch(() => { mapEl.innerHTML = ''; return libreMap(); })
    .then(g => { map = g; mapEl.classList.toggle('kakao', !!g.kakao); draw(); if (items.length) fit(); })
    .catch(() => { mapEl.innerHTML = '<p class="re-off">지도를 불러오지 못했어요. 인터넷 연결을 확인해 주세요.</p>'; });
  const flyTo = (lat, lng, zoom) => map && map.fly(lat, lng, zoom);
  const fit = () => { if (map && items.length) map.fit(items); };

  // ── 핀과 목록 ──
  const pinEl = x => { const el = document.createElement('div'); el.className = 're-pin'; el.innerHTML = `<span class="k-${x.kind}">${x.kind === 'rent' ? '월' : x.kind === 'jeonse' ? '전' : '매'}</span><b>${esc(man(x.price).replace(' 원', ''))}</b>`; el.addEventListener('click', ev => { ev.stopPropagation(); focus(x.id); }); return el; };
  function draw() {
    if (map) { marks.forEach(m => m.remove()); marks = items.map(x => map.pin(x.lat, x.lng, pinEl(x))); }
    $('re-list').innerHTML = items.length ? items.map(x => `<li class="re-item" id="re-${x.id}"><div class="re-top"><b>${esc(x.name || '내가 고른 곳')}</b><button type="button" class="re-del" data-del="${x.id}" aria-label="지우기">×</button></div>
      <p class="re-price">${priceText(x)}</p>${x.memo ? `<p class="re-memo">${esc(x.memo)}</p>` : ''}
      <div class="re-acts">${x.kind === 'buy' ? `<a href="/acquisition-tax/?at_price=${x.price}">취득세</a>` : ''}<a href="/brokerage-fee/?bf_kind=${x.kind}&bf_amt=${x.price}${x.kind === 'rent' ? `&bf_rent=${x.rent || 0}` : ''}">중개수수료</a>${x.kind === 'buy' ? '<a href="/loan/">대출 이자</a>' : '<a href="/rent/">전월세 전환</a>'}<a href="${naverAt(x.lat, x.lng)}" target="_blank" rel="noopener">이 근처 시세 ↗</a><button type="button" data-go="${x.id}">지도에서 보기</button></div></li>`).join('')
      : '<li class="re-empty">아직 관심 부동산이 없어요. 위에서 아파트 이름이나 주소를 찾거나, 지도를 크게 열고 눌러서 핀을 꽂아 보세요.</li>';
    $('re-count').textContent = items.length ? `${items.length}곳` : '';
  }
  function focus(id) {
    const x = items.find(i => i.id === id); if (!x) return;
    flyTo(x.lat, x.lng, 16);
    const el = $('re-' + id); if (el && !full) { el.classList.add('hl'); el.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); setTimeout(() => el.classList.remove('hl'), 1400); }
  }

  // ── 전체화면 (네이버지도처럼: 위에 검색·칩, 아래에 실거래 시트) ──
  const wrap = $('re-mapwrap'), spots = {};
  const park = id => { const el = $(id); if (!el) return; spots[id] = document.createComment(id); el.before(spots[id]); return el; };
  function enter() {
    if (full) return; full = true;
    [['re-searchbox', 're-fs-top'], ['re-results', 're-fs-top'], ['re-poi', 're-fs-chips'], ['re-gu', 're-fs-chips'], ['re-deals', 're-fs-sheet']].forEach(([id, to]) => { const el = park(id); if (el) $(to).append(el); });
    wrap.classList.add('full'); document.documentElement.classList.add('re-fs-open');
    try { history.pushState({ reFull: 1 }, ''); } catch (e) { /* 괜찮아요 */ }
    setTimeout(() => map && map.resize(), 60);
  }
  function exit(fromPop) {
    if (!full) return; full = false;
    Object.entries(spots).forEach(([id, c]) => { const el = $(id); if (el && c.parentNode) c.replaceWith(el); delete spots[id]; });
    wrap.classList.remove('full'); document.documentElement.classList.remove('re-fs-open');
    clearPick();
    if (!fromPop) try { if (history.state && history.state.reFull) history.back(); } catch (e) { /* 괜찮아요 */ }
    setTimeout(() => map && map.resize(), 60);
  }
  // 폰에서는 아래 실거래 시트만큼 지도를 줄여요 (카카오 로고가 시트에 가리지 않게)
  if (window.ResizeObserver) new ResizeObserver(() => { const h = full && innerWidth < 900 ? $('re-fs-sheet').offsetHeight : 0; if (wrap.style.getPropertyValue('--sh') !== h + 'px') { wrap.style.setProperty('--sh', h + 'px'); if (map) map.resize(); } }).observe($('re-fs-sheet'));
  $('re-expand').addEventListener('click', enter);
  $('re-fs-close').addEventListener('click', () => exit());
  window.addEventListener('popstate', () => exit(true));
  document.addEventListener('keydown', e => { if (e.key === 'Escape') exit(); });
  $('re-fs-add').addEventListener('click', () => { const p = pending; exit(); if (p) openForm(p); });
  $('re-place').addEventListener('click', e => {
    const b = e.target.closest('[data-pc], [data-pd]'); if (!b) return;
    if (b.dataset.pc === 'x') return clearPick();
    if (b.dataset.pc === 'copy') { const a = $('re-place').dataset.addr; return navigator.clipboard ? navigator.clipboard.writeText(a).then(() => toast('주소를 복사했어요.'), () => toast(a)) : toast(a); }
    const p = pending && { ...pending }; if (!p) return;
    if (b.dataset.pd) p.deal = placeDeals[+b.dataset.pd]; // 그 거래 가격으로 채워서 열어요
    exit(); openForm(p);
  });
  $('re-fs-me').addEventListener('click', () => {
    if (!navigator.geolocation) return toast('이 기기에서는 내 위치를 찾을 수 없어요.');
    navigator.geolocation.getCurrentPosition(p => flyTo(p.coords.latitude, p.coords.longitude, 15), () => toast('위치 권한을 허용하면 내 위치로 가요.'), { timeout: 8000 });
  });
  $('re-fs-zin').addEventListener('click', () => map && map.zoomBy(1));
  $('re-fs-zout').addEventListener('click', () => map && map.zoomBy(-1));
  $('re-fs-star').addEventListener('click', () => { if (items.length) fit(); else toast('아직 관심 부동산이 없어요.'); });

  // ── 주변 생활 시설 (네이버지도 음식점·카페 칩처럼, 집 볼 때 중요한 것만) ──
  // 카카오맵이면 카카오 장소 자료, 아니면 OpenStreetMap(Overpass) 자료를 써요
  const POI = { subway: ['🚇', '지하철역', 'node["railway"="station"]["subway"="yes"];node["station"="subway"];', 'SW8'], school: ['🏫', '학교', 'nwr["amenity"="school"];', 'SC4'],
    mart: ['🛒', '마트', 'nwr["shop"~"^(supermarket|department_store)$"];', 'MT1'], hospital: ['🏥', '병원', 'nwr["amenity"="hospital"];', 'HP8'], park: ['🌳', '공원', 'nwr["leisure"="park"]["name"];', ''], cafe: ['☕', '카페', 'node["amenity"="cafe"];', 'CE7'] };
  // 카카오 장소 찾기: 한 쪽에 15곳씩, max만큼 모아요
  // 카카오가 오류를 주면(등록 안 된 주소 등) 실패로 알려서 OpenStreetMap 자료로 다시 찾게 해요
  const kPlaces = (fn, arg, opt, max = 45) => new Promise((ok, no) => {
    const out = [], ps = new kakao.maps.services.Places(), S = kakao.maps.services.Status;
    ps[fn](arg, (d, st, pg) => { if (st === S.OK) out.push(...d); else if (st !== S.ZERO_RESULT && !out.length) return no(st); if (st === S.OK && pg && pg.hasNextPage && out.length < max) pg.nextPage(); else ok(out.slice(0, max)); }, opt);
  });
  async function overpass(q, [s, w, n, e]) {
    const body = `[out:json][timeout:15];(${q.replace(/;/g, `(${s},${w},${n},${e});`)});out center 80;`;
    for (const u of ['https://overpass-api.de/api/interpreter', 'https://overpass.private.coffee/api/interpreter', 'https://overpass.kumi.systems/api/interpreter']) { // 무료 서버가 붐비면 다른 곳에 다시 물어봐요
      try { const r = await fetch(u, { method: 'POST', body: 'data=' + encodeURIComponent(body), headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }); if (r.ok) return ((await r.json()).elements || []).filter(x => x.lat || x.center).slice(0, 80).map(x => ({ lat: x.lat || x.center.lat, lng: x.lon || x.center.lon, name: (x.tags && (x.tags['name:ko'] || x.tags.name)) || '' })); } catch (err) { /* 다음 서버 */ }
    }
    throw 0;
  }
  let poiOn = '';
  $('re-poi').innerHTML = Object.entries(POI).map(([k, [i, n]]) => `<button type="button" data-poi="${k}">${i} ${n}</button>`).join('');
  $('re-poi').addEventListener('click', async e => {
    const b = e.target.closest('[data-poi]'); if (!b || !map) return;
    poiMarks.forEach(m => m.remove()); poiMarks = [];
    $('re-poi').querySelectorAll('button').forEach(x => x.classList.remove('on'));
    if (poiOn === b.dataset.poi) { poiOn = ''; return; }
    map.stop(); if (map.zoom() < 13.5) map.zoomTo(14.5); // 너무 멀면 먼저 동네 크기로 다가가요
    poiOn = b.dataset.poi; b.classList.add('on');
    const [ico, name, q, cat] = POI[poiOn], bb = map.bounds();
    try {
      let found;
      if (map.kakao) { const bounds = new kakao.maps.LatLngBounds(new kakao.maps.LatLng(bb[0], bb[1]), new kakao.maps.LatLng(bb[2], bb[3])); found = await kPlaces(cat ? 'categorySearch' : 'keywordSearch', cat || '공원', { bounds }).then(l => l.map(p => ({ lat: +p.y, lng: +p.x, name: p.place_name })), () => null); }
      if (!found) found = await overpass(q, bb);
      if (!found.length) return toast(`이 화면에는 ${name} 정보가 없어요.`);
      poiMarks = found.map(x => { const el = document.createElement('div'); el.className = 're-poi-pin'; el.textContent = ico; el.dataset.n = x.name || name;
        el.addEventListener('click', ev => { ev.stopPropagation(); el.classList.toggle('show'); }); return map.pin(x.lat, x.lng, el); });
      toast(`${name} ${found.length}곳을 찾았어요. 아이콘을 누르면 이름이 보여요.`);
    } catch (err) { toast('지금은 주변 시설을 불러오지 못했어요.'); }
  });

  // ── 주소·아파트 찾기 ──
  // 장소 찾기: 카카오맵이면 카카오 장소 검색(아파트 이름도 잘 찾아요), 아니면 Nominatim
  async function geo(q, n = 6, aptOnly = false) { // aptOnly: 실거래 단지를 찾을 때는 아파트만 (같은 이름 식당 말고)
    if (map && map.kakao) { try { return (await kPlaces('keywordSearch', q, { size: aptOnly ? 15 : Math.min(15, n) }, aptOnly ? 15 : n)).filter(p => !aptOnly || /아파트|주거시설/.test(p.category_name)).slice(0, n).map(p => ({ name: p.place_name, addr: p.road_address_name || p.address_name, lat: +p.y, lng: +p.x, raw: p })); } catch (e) { /* 아래 Nominatim으로 */ } }
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=${n}&countrycodes=kr&accept-language=ko&q=${encodeURIComponent(q)}`, { headers: { Accept: 'application/json' } });
    return (await r.json()).map(p => ({ name: p.name || p.display_name.split(',')[0], addr: p.display_name, lat: +p.lat, lng: +p.lon }));
  }
  async function search(q) {
    const box = $('re-results');
    if (!q.trim()) return;
    box.innerHTML = '<li class="re-empty">찾는 중…</li>';
    try {
      const list = await geo(q);
      box.innerHTML = list.length ? list.map((p, i) => `<li><button type="button" data-pick="${i}"><b>${esc(p.name)}</b><small>${esc(p.addr)}</small></button></li>`).join('')
        : '<li class="re-empty">찾지 못했어요. "서울 송파구 잠실동"처럼 동네 이름으로 찾거나, 지도를 직접 눌러 보세요.</li>';
      box.onclick = e => { const b = e.target.closest('[data-pick]'); if (!b) return; const p = list[+b.dataset.pick]; box.innerHTML = ''; const was = full; if (!was) enter(); setTimeout(() => flyTo(p.lat, p.lng, 17), was ? 0 : 120); showPlace(p); };
    } catch (e) { box.innerHTML = '<li class="re-empty">지금은 찾기가 안 돼요. 지도를 직접 눌러 핀을 꽂아 보세요.</li>'; }
  }
  $('re-q').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); search(e.target.value); } });
  $('re-go').addEventListener('click', () => search($('re-q').value));

  // ── 서울 25개 구 바로가기 ──
  $('re-gu').innerHTML = GU.map(g => `<button type="button" data-gu="${g}">${g}</button>`).join('');
  $('re-gu').addEventListener('click', async e => {
    const b = e.target.closest('[data-gu]'); if (!b) return;
    if (b.classList.contains('on')) { b.classList.remove('on'); $('re-deals').hidden = true; $('re-near').hidden = true; dealGu = ''; return; } // 한 번 더 누르면 실거래 창을 닫고 지도만
    let c = null; try { c = JSON.parse(localStorage.getItem('donsem:gu:' + b.dataset.gu)); } catch (err) { c = null; }
    if (!c) { try { const p = (await geo(map && map.kakao ? `서울 ${b.dataset.gu}청` : `서울특별시 ${b.dataset.gu}`, 1))[0]; if (p) { c = [p.lat, p.lng]; try { localStorage.setItem('donsem:gu:' + b.dataset.gu, JSON.stringify(c)); } catch (err) { /* 괜찮아요 */ } } } catch (err) { c = null; } }
    if (c) flyTo(c[0], c[1], 13.5); else toast('지금은 그 구로 이동하지 못했어요.');
    $('re-gu').querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
    $('re-near').href = c ? naverAt(c[0], c[1]) : '#';
    $('re-near').hidden = !c; $('re-near').textContent = `${b.dataset.gu} 아파트 시세 보기 (네이버 부동산) ↗`;
    deals(b.dataset.gu);
  });

  // ── 구별 최근 실거래가 (국토교통부 공공데이터, 돈셈 카운터 워커가 받아 와요) ──
  let dealGu = '', dealType = 'trade', dealSize = 'all', dealData = { trade: null, rent: null };
  const yms = (k = 2) => { const n = new Date(), a = []; for (let i = 0; i < k; i++) { const d = new Date(n.getFullYear(), n.getMonth() - i, 1); a.push(`${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}`); } return a; };
  const eok = v => { const e = Math.floor(v / 10000), r = v % 10000; return e ? `${e}억${r ? ` ${r.toLocaleString('ko-KR')}` : ''}` : `${v.toLocaleString('ko-KR')}만`; }; // v는 만 원
  const SIZE = { all: ['전체', () => true], s: ['59㎡ 안팎', a => a >= 50 && a < 70], m: ['84㎡ 안팎', a => a >= 76 && a < 90], l: ['100~134㎡', a => a >= 100 && a < 135], xl: ['135~164㎡', a => a >= 135 && a < 165], xxl: ['165㎡ 이상', a => a >= 165] };
  const SORT = { new: '최신순', high: '비싼 순', low: '싼 순' };
  const byDate = (a, b) => (b.y * 1e4 + b.m * 100 + b.d) - (a.y * 1e4 + a.m * 100 + a.d);
  const months = {}; // 같은 구·달·종류는 한 번만 받아요 (목록과 단지 정보 창이 같이 써요)
  const month = (gu, ym, type) => months[gu + ym + type] || (months[gu + ym + type] = fetch(`${API}?lawd=${LAWD[gu]}&ym=${ym}${type === 'rent' ? '&type=rent' : ''}`).then(r => r.ok ? r.json() : null).then(d => d && d.items).catch(() => null).then(v => { if (!v) delete months[gu + ym + type]; return v; }));
  async function loadDeals(type) {
    const list = await Promise.all(yms().map(ym => month(dealGu, ym, type)));
    if (list.every(x => !x)) return null;
    return list.filter(Boolean).flat().sort(byDate);
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
    if (dealSort !== 'new') list.sort((a, b) => dealSort === 'high' ? b.amt - a.amt || b.rent - a.rent : a.amt - b.amt || a.rent - b.rent);
    const prices = list.map(x => x.amt).sort((a, b) => a - b), mid = prices.length ? prices[Math.floor(prices.length / 2)] : 0;
    const label = dealType === 'trade' ? '매매' : dealRentMode === 'wol' ? '월세' : '전세';
    box.innerHTML = `<div class="dl-h"><b>${dealGu} 최근 실거래</b><small>국토교통부 · 최근 2달 · 신고 기준</small></div>
      <div class="dl-tabs"><button type="button" class="${dealType === 'trade' ? 'on' : ''}" data-dt="trade">매매</button><button type="button" class="${dealType === 'rent' && dealRentMode !== 'wol' ? 'on' : ''}" data-dt="jeon">전세</button><button type="button" class="${dealType === 'rent' && dealRentMode === 'wol' ? 'on' : ''}" data-dt="wol">월세</button></div>
      <div class="dl-size">${Object.entries(SIZE).map(([k, [n]]) => `<button type="button" class="${dealSize === k ? 'on' : ''}" data-ds="${k}">${n}</button>`).join('')}</div>
      ${list.length ? `<div class="dl-bar"><p class="dl-sum">${label} <b>${list.length.toLocaleString('ko-KR')}건</b> · 가운데 값 <b>${eok(mid)}</b>${dealType === 'trade' ? ` · 가장 비싼 거래 <b>${eok(prices[prices.length - 1])}</b>` : ''}</p>
      <select class="dl-sort" aria-label="정렬">${Object.entries(SORT).map(([k, n]) => `<option value="${k}"${dealSort === k ? ' selected' : ''}>${n}</option>`).join('')}</select></div>
      <ul class="dl-list">${list.slice(0, 30).map((x, i) => `<li><button type="button" data-di="${all.indexOf(x)}"><span><b>${esc(x.apt)}</b><small>${esc(x.dong)} · 전용 ${Math.round(x.area)}㎡ · ${x.floor}층 · ${x.built}년</small></span><em>${eok(x.amt)}${x.rent ? ` / 월 ${x.rent.toLocaleString("ko-KR")}만` : ''}<small>${x.m}.${x.d}</small></em></button></li>`).join('')}</ul>
      ${list.length > 30 ? `<p class="re-tip">최근 30건만 보여 드려요. 전체는 <a href="https://rt.molit.go.kr/" target="_blank" rel="noopener">국토부 실거래가 공개시스템 ↗</a>에서 볼 수 있어요.</p>` : ''}`
        : '<p class="re-empty">이 조건의 거래가 아직 없어요. 실거래는 계약 후 30일 안에 신고돼서 이번 달은 적게 보여요.</p>'}`;
  }
  let dealRentMode = 'jeon', dealSort = 'new';
  $('re-deals').addEventListener('change', e => { if (e.target.matches('.dl-sort')) { dealSort = e.target.value; drawDeals(); } });
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
        let p = null, qi = 0; // 단지 이름으로 먼저, 못 찾으면 동네로
        for (const q of [`서울 ${dealGu} ${x.dong} ${x.apt}`, `${x.dong} ${x.apt}`, `서울 ${dealGu} ${x.dong}`]) { p = (await geo(q, 1, qi < 2))[0]; if (p) break; qi++; }
        if (p && qi < 2) { const was = full; if (!was) enter(); setTimeout(() => flyTo(p.lat, p.lng, 17), was ? 0 : 120); return showPlace(p, x.apt); } // 단지를 찾으면 정보 창으로
        if (p) { flyTo(p.lat, p.lng, 16); if (full) { pending = { name: `${x.apt} ${Math.round(x.area)}㎡`, lat: p.lat, lng: p.lng, deal: x }; $('re-fs-act').hidden = false; return; } mapEl.scrollIntoView({ behavior: 'smooth', block: 'center' }); }
        if (p) {
          openForm({ name: `${x.apt} ${Math.round(x.area)}㎡`, lat: p.lat, lng: p.lng });
          const k = dealType === 'trade' ? 'buy' : x.rent ? 'rent' : 'jeonse';
          $('re-kind').querySelector(`[data-v="${k}"]`).click();
          $('re-price').value = (x.amt * 10000).toLocaleString('ko-KR'); $('re-rent').value = x.rent ? (x.rent * 10000).toLocaleString('ko-KR') : '';
          $('re-memo').value = `${x.y}.${x.m}.${x.d} 실거래 ${x.floor}층`;
        } else toast('지도에서 위치를 찾지 못했어요.');
      } catch (err) { toast('지금은 위치를 찾지 못했어요.'); }
    }
  });

  // ── 단지 정보 창 (카카오맵 앱처럼 아래에서 올라와요) ──
  // 카카오가 웹사이트에 주는 건 이름·주소·전화·카카오맵 링크까지예요. 사진·세대수 같은 단지정보는 카카오맵 링크로 보여 주고,
  // 돈셈은 국토교통부 실거래 자료로 그 단지의 준공 연도·최근 거래가를 붙여요
  // 단지정보(세대수·동수·주차·난방·시공사…)는 국토교통부 공동주택 자료를 돈셈 카운터 워커가 찾아 줘요. 공공데이터 서버가 가끔 거절해서 한 번 더 물어봐요
  const kaptInfo = async (gu, name, dong) => { for (let i = 0; i < 2; i++) { try { const r = await fetch(`${API.replace('/apt', '/kapt')}?lawd=${LAWD[gu]}&name=${encodeURIComponent(name)}&dong=${encodeURIComponent(dong || '')}`); const d = await r.json(); if (d && d.found) return d; if (d && d.found === false) return null; } catch (e) { /* 다시 */ } await new Promise(ok => setTimeout(ok, 1200)); } return null; };
  const telFmt = v => String(v).replace(/^(02|0\d{2})(\d{3,4})(\d{4})$/, '$1-$2-$3');
  const norm = v => String(v).replace(/\(.*?\)|\s|아파트|APT/gi, '');
  let placeDeals = [];
  async function showPlace(r, aptName) {
    const box = $('re-place'), raw = r.raw || {}, jibun = raw.address_name || r.addr || '', cat = (raw.category_name || '').split(' > ').pop();
    const words = jibun.split(/[\s,]+/), gu = words.find(w => LAWD[w]) || '', dong = gu && raw.address_name ? words[words.indexOf(gu) + 1] : '';
    if (temp) temp.remove(); temp = map ? map.dot(r.lat, r.lng, clearPick) : null;
    pending = { name: r.name, lat: r.lat, lng: r.lng }; placeDeals = [];
    $('re-fs-act').hidden = true; box.hidden = false;
    const tok = String(Date.now()); box.dataset.tok = tok; box.dataset.addr = raw.road_address_name || r.addr || '';
    const head = `<div class="pc-h"><div><b>${esc(r.name)}</b>${cat ? ` <small>${esc(cat)}</small>` : ''}</div><button type="button" class="pc-x" data-pc="x" aria-label="닫기">×</button></div>
      <p class="pc-addr">${esc(raw.road_address_name || r.addr || '')}${raw.road_address_name && raw.address_name ? ` <small>(${esc(raw.address_name.split(' ').slice(2).join(' '))})</small>` : ''} <button type="button" class="pc-copy" data-pc="copy">복사</button></p>
      ${raw.phone ? `<p class="pc-addr"><a href="tel:${esc(raw.phone)}">${esc(raw.phone)}</a></p>` : ''}`;
    const acts = `<div class="pc-acts"><button type="button" class="btn fill" data-pc="add">📌 관심 부동산에 넣기</button>${raw.place_url ? `<a class="btn" href="${esc(raw.place_url)}" target="_blank" rel="noopener">사진·단지정보 (카카오맵) ↗</a>` : ''}<a class="btn" href="${naverAt(r.lat, r.lng)}" target="_blank" rel="noopener">시세 (네이버 부동산) ↗</a></div>`;
    const isApt = !raw.category_name || /아파트|주거/.test(raw.category_name);
    if (!gu || !/서울/.test(jibun) || !isApt) { box.innerHTML = head + `<p class="re-tip">실거래가는 서울 아파트만 보여 드려요.</p>` + acts; return; }
    box.innerHTML = head + '<p class="re-empty">이 단지 실거래가를 찾는 중…</p>' + acts;
    const key = norm(aptName || r.name);
    const [tr, rt, k] = await Promise.all([Promise.all(yms(6).map(ym => month(gu, ym, 'trade'))), Promise.all(yms(3).map(ym => month(gu, ym, 'rent'))), kaptInfo(gu, aptName || r.name, dong)]);
    if (box.dataset.tok !== tok) return; // 그사이 다른 곳을 골랐어요
    const mine = l => l.filter(Boolean).flat().filter(x => (!dong || x.dong === dong) && norm(x.apt).length > 1 && (norm(x.apt).includes(key) || key.includes(norm(x.apt)))).sort(byDate);
    const T = mine(tr).map(x => ({ ...x, t: 'trade' })), R = mine(rt), J = R.filter(x => !x.rent), W = R.filter(x => x.rent);
    const range = l => { const v = l.map(x => x.amt), lo = Math.min(...v), hi = Math.max(...v); return lo === hi ? eok(lo) : `${eok(lo)} ~ ${eok(hi)}`; };
    const built = (T[0] || R[0] || {}).built, areas = [...new Set([...T, ...R].map(x => Math.round(x.area)))].sort((a, b) => a - b);
    const row = (k, v) => `<tr><th>${k}</th><td>${v}</td></tr>`;
    placeDeals = T.slice(0, 5);
    const n = v => Number(v).toLocaleString('ko-KR'), use = k && /^\d{6}/.test(k.use) ? `${k.use.slice(0, 4)}년 ${+k.use.slice(4, 6)}월` : '';
    const sz = k ? [['60㎡ 이하', k.sizes.u60], ['60~85㎡', k.sizes.u85], ['85~135㎡', k.sizes.u135], ['135㎡ 초과', k.sizes.o135]].filter(x => x[1]).map(([a, c]) => `${a} ${n(c)}세대`).join(' · ') : '';
    const edu = k ? k.edu.replace(/[^\s()]+\(\s*\)/g, '').replace(/\s+/g, ' ').trim() : '';
    const info = k ? `<p class="pc-sub">단지정보 <small>국토교통부 공동주택 자료</small></p><table class="pc-tb">
      ${k.households ? row('규모', `<b>${n(k.households)}세대</b>${k.dongs ? ` (${k.dongs}개 동)` : ''}`) : ''}
      ${use ? row('준공', use) : ''}
      ${k.builder ? row('시공', esc(k.builder)) : ''}
      ${k.heat || k.hall ? row('난방·구조', esc([k.heat, k.hall].filter(Boolean).join(' · '))) : ''}
      ${k.parking ? row('주차', `${k.households ? `세대당 ${(k.parking / k.households).toFixed(1)}대 ` : ''}<small>총 ${n(k.parking)}대${k.ev ? ` · 전기차 충전기 ${n(k.ev)}대` : ''}</small>`) : ''}
      ${sz ? row('면적별 세대수', `<small class="pc-wrap">전용 ${sz}</small>`) : ''}
      ${k.subway ? row('지하철', `${esc(k.subway)}${k.subwayTime ? `<small>걸어서 ${esc(k.subwayTime)}</small>` : ''}`) : ''}
      ${edu ? row('학교', esc(edu)) : ''}
      ${k.kind || k.sale ? row('형태', esc([k.kind, k.sale].filter(Boolean).join(' · '))) : ''}
      ${k.tel ? row('관리사무소', `<a href="tel:${esc(k.tel)}">${esc(telFmt(k.tel))}</a>`) : ''}</table>` : '';
    box.innerHTML = head + info + (T.length || R.length ? `${k ? '<p class="pc-sub">실거래가 <small>국토교통부</small></p>' : ''}<table class="pc-tb">
      ${T.length ? row('매매 실거래', `<b>${range(T)}</b><small>최근 6달 ${T.length}건</small>`) : ''}
      ${J.length ? row('전세 실거래', `<b>${range(J)}</b><small>최근 3달 ${J.length}건</small>`) : ''}
      ${W.length ? row('월세 실거래', `<b>보증금 ${eok(W[0].amt)} / 월 ${W[0].rent.toLocaleString("ko-KR")}만</b><small>최근 3달 ${W.length}건 · 가장 최근 거래</small>`) : ''}
      ${built && !use ? row('준공', `${built}년`) : ''}
      ${areas.length ? row('거래된 면적', `전용 ${areas.join(' · ')}㎡`) : ''}</table>
      ${placeDeals.length ? `<p class="pc-sub">최근 매매 · 누르면 그 가격으로 관심 부동산에 넣어요</p><ul class="dl-list">${placeDeals.map((x, i) => `<li><button type="button" data-pd="${i}"><span><b>전용 ${Math.round(x.area)}㎡ · ${x.floor}층</b><small>${x.y}.${x.m}.${x.d}</small></span><em>${eok(x.amt)}</em></button></li>`).join('')}</ul>` : ''}`
      : '<p class="re-tip">최근 6달 동안 신고된 이 단지 거래를 찾지 못했어요. 거래가 없었거나 국토부 자료의 단지 이름이 달라서일 수 있어요.</p>') + acts
      + `<p class="re-tip">${k ? '사진·관리비는 「사진·단지정보 (카카오맵)」에서 볼 수 있어요.' : '사진·세대수·관리비 같은 자세한 단지정보는 「사진·단지정보 (카카오맵)」에서 볼 수 있어요.'} 출처: 국토교통부</p>`;
  }

  // ── 관심 부동산 추가 ──
  function openForm(p) {
    pending = p;
    const f = $('re-form'); f.hidden = false;
    $('re-name').value = p.name || ''; $('re-price').value = ''; $('re-rent').value = ''; $('re-memo').value = '';
    if (p.deal) { const x = p.deal, k = x.rent ? 'rent' : (x.t || dealType) === 'trade' ? 'buy' : 'jeonse'; setTimeout(() => { $('re-kind').querySelector(`[data-v="${k}"]`).click(); $('re-price').value = (x.amt * 10000).toLocaleString('ko-KR'); $('re-rent').value = x.rent ? (x.rent * 10000).toLocaleString('ko-KR') : ''; $('re-memo').value = `${x.y}.${x.m}.${x.d} 실거래 ${x.floor}층`; }, 0); }
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
